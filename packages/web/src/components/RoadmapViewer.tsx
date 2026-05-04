"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow, Background, Controls, useNodesState, useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { RoadmapDef } from "@/data/roadmaps/types";
import { buildLayoutedGraph } from "@/lib/roadmap-layout";
import RoadmapNodeComponent from "./roadmap/RoadmapNode";
import s from "./RoadmapViewer.module.css";

const NODE_TYPES = { roadmapNode: RoadmapNodeComponent };

function progressKey(slug: string) { return `roadmap_progress_${slug}`; }

function loadProgress(slug: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(progressKey(slug));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveProgress(slug: string, done: Set<string>) {
  try { localStorage.setItem(progressKey(slug), JSON.stringify([...done])); } catch { /* noop */ }
}

interface Props { roadmap: RoadmapDef; }

export function RoadmapViewer({ roadmap }: Props) {
  const router = useRouter();
  const [done,  setDone]  = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState<{ id: string; label: string; description: string; tutorPrompt?: string; emoji?: string } | null>(null);

  useEffect(() => { setDone(loadProgress(roadmap.slug)); }, [roadmap.slug]);

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => buildLayoutedGraph(roadmap.nodes, roadmap.edges, roadmap.color),
    [roadmap],
  );

  const nodesWithDone = useMemo(() =>
    baseNodes.map(n => ({
      ...n,
      data: { ...n.data, done: done.has(n.id) },
    })),
    [baseNodes, done],
  );

  const [nodes, , onNodesChange] = useNodesState(nodesWithDone);
  const [edges, , onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => {
    onNodesChange(nodesWithDone.map(n => ({ type: "reset" as const, item: n })));
  }, [done, nodesWithDone, onNodesChange]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const def = roadmap.nodes.find(n => n.id === node.id);
    if (!def || def.nodeType === "section") return;
    setPanel(def);
  }, [roadmap.nodes]);

  function toggleDone(id: string) {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveProgress(roadmap.slug, next);
      return next;
    });
  }

  const total     = roadmap.nodes.filter(n => n.nodeType !== "section").length;
  const doneCount = roadmap.nodes.filter(n => n.nodeType !== "section" && done.has(n.id)).length;
  const pct       = Math.round((doneCount / total) * 100);

  return (
    <div className={s.root}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/roadmaps" className={s.backBtn}>← Trayectos</Link>
          <span className={s.headerEmoji}>{roadmap.emoji}</span>
          <div>
            <h1 className={s.title}>{roadmap.title}</h1>
            <p className={s.desc}>{roadmap.description}</p>
          </div>
        </div>
        <div className={s.progressWrap}>
          <div className={s.progressLabel}>{doneCount}/{total} temas · {pct}%</div>
          <div className={s.progressBar}>
            <div className={s.progressFill} style={{ width: `${pct}%`, background: roadmap.color }} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={s.legend}>
        <span className={s.legendItem}><span className={s.legendDot} style={{ background: roadmap.color }} />Sección</span>
        <span className={s.legendItem}><span className={s.legendBox} />Tema</span>
        <span className={s.legendItem}><span className={s.legendDash} />Opcional</span>
        <span className={s.legendItem}><span className={s.legendCheck}>✓</span>Completado</span>
        <span className={s.legendHint}>Hacé click en un tema para ver opciones</span>
      </div>

      {/* Flow canvas */}
      <div className={s.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e7e5e4" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Side panel */}
      {panel && (
        <div className={s.panelOverlay} onClick={() => setPanel(null)}>
          <div className={s.panel} onClick={e => e.stopPropagation()}>
            <button className={s.panelClose} onClick={() => setPanel(null)}>✕</button>
            <div className={s.panelEmoji}>{panel.emoji}</div>
            <h2 className={s.panelTitle}>{panel.label}</h2>
            <p className={s.panelDesc}>{panel.description}</p>
            <div className={s.panelActions}>
              <button
                className={`${s.doneBtn} ${done.has(panel.id) ? s.doneBtnActive : ""}`}
                onClick={() => toggleDone(panel.id)}
                style={done.has(panel.id) ? { background: roadmap.color, borderColor: roadmap.color } : {}}
              >
                {done.has(panel.id) ? "✓ Completado" : "Marcar como completado"}
              </button>
              {panel.tutorPrompt && (
                <button
                  className={s.tutorBtn}
                  onClick={() => {
                    router.push(`/tutor?q=${encodeURIComponent(panel.tutorPrompt ?? panel.label)}`);
                    setPanel(null);
                  }}
                >
                  🎓 Estudiar este tema con el tutor →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
