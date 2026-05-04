"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReactFlow, Background, Controls, useNodesState, useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { RoadmapDef, RoadmapNodeDef } from "@/data/roadmaps/types";
import { buildLayoutedGraph } from "@/lib/roadmap-layout";
import RoadmapNodeComponent from "./roadmap/RoadmapNode";
import s from "./RoadmapViewer.module.css";

type NodeStatus = "pending" | "in_progress" | "done";
type ChatMsg = { role: "user" | "assistant"; content: string };

const NODE_TYPES = { roadmapNode: RoadmapNodeComponent };

const STATUS_LABEL: Record<NodeStatus, string> = {
  pending:     "Pendiente",
  in_progress: "En progreso",
  done:        "Dominado ✓",
};

function progressKey(slug: string) { return `roadmap_progress_${slug}`; }

function loadProgress(slug: string): Record<string, NodeStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(progressKey(slug));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(slug: string, p: Record<string, NodeStatus>) {
  try { localStorage.setItem(progressKey(slug), JSON.stringify(p)); } catch {}
}

interface Props { roadmap: RoadmapDef; }

export function RoadmapViewer({ roadmap }: Props) {
  const [progress, setProgress]     = useState<Record<string, NodeStatus>>({});
  const [panel, setPanel]           = useState<RoadmapNodeDef | null>(null);
  const [chatInput, setChatInput]   = useState("");
  const [chatMsgs, setChatMsgs]     = useState<ChatMsg[]>([]);
  const [streaming, setStreaming]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setProgress(loadProgress(roadmap.slug)); }, [roadmap.slug]);

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => buildLayoutedGraph(roadmap.nodes, roadmap.edges, roadmap.color),
    [roadmap],
  );

  const nodesWithStatus = useMemo(() =>
    baseNodes.map(n => ({
      ...n,
      data: { ...n.data, status: progress[n.id] ?? "pending" },
    })),
    [baseNodes, progress],
  );

  const [nodes, , onNodesChange] = useNodesState(nodesWithStatus);
  const [edges, , onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => {
    onNodesChange(nodesWithStatus.map(n => ({ type: "reset" as const, item: n })));
  }, [progress, nodesWithStatus, onNodesChange]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    const def = roadmap.nodes.find(n => n.id === node.id);
    if (!def || def.nodeType === "section") return;
    setPanel(def);
  }, [roadmap.nodes]);

  function setStatus(id: string, st: NodeStatus) {
    setProgress(prev => {
      const next = { ...prev, [id]: st };
      saveProgress(roadmap.slug, next);
      return next;
    });
  }

  const relatedNodes = useMemo(() => {
    if (!panel) return [];
    const linked = new Set<string>();
    roadmap.edges.forEach(e => {
      if (e.source === panel.id) linked.add(e.target);
      if (e.target === panel.id) linked.add(e.source);
    });
    return roadmap.nodes
      .filter(n => linked.has(n.id) && n.nodeType !== "section")
      .slice(0, 6);
  }, [panel, roadmap.edges, roadmap.nodes]);

  const total     = roadmap.nodes.filter(n => n.nodeType !== "section").length;
  const doneCount = roadmap.nodes.filter(n => n.nodeType !== "section" && progress[n.id] === "done").length;
  const pct       = total ? Math.round((doneCount / total) * 100) : 0;

  // ── Chat ──────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  async function sendMessage() {
    const q = chatInput.trim();
    if (!q || streaming) return;
    const history = chatMsgs;
    const updated: ChatMsg[] = [...history, { role: "user", content: q }];
    setChatMsgs([...updated, { role: "assistant", content: "" }]);
    setChatInput("");
    setDrawerOpen(true);
    setStreaming(true);

    try {
      const res = await fetch("/api/roadmap-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history,
          subject: roadmap.slug,
          topicLabel: panel?.label,
        }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.startsWith("data: ") ? part.slice(6) : part;
          if (line === "[DONE]") continue;
          try {
            const json = JSON.parse(line);
            if (json.text) {
              setChatMsgs(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + json.text,
                };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {
      setChatMsgs(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: "Error al conectar con el tutor." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function askAboutTopic() {
    if (!panel) return;
    setChatInput(panel.tutorPrompt ?? `Explicame el tema: ${panel.label}`);
    setPanel(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const panelStatus = panel ? (progress[panel.id] ?? "pending") : "pending";

  return (
    <div className={s.root}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/roadmaps" className={s.backBtn}>← Trayectos</Link>
          <span className={s.headerEmoji}>{roadmap.emoji}</span>
          <div className={s.headerText}>
            <h1 className={s.title}>{roadmap.title}</h1>
            <p className={s.desc}>{roadmap.description}</p>
          </div>
        </div>
        <div className={s.progressWrap}>
          <div className={s.progressLabel}>{doneCount}/{total} dominados · {pct}%</div>
          <div className={s.progressBar}>
            <div className={s.progressFill} style={{ width: `${pct}%`, background: roadmap.color }} />
          </div>
        </div>
      </div>

      {/* ── Main (canvas + right panel) ── */}
      <div className={s.main}>

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
            minZoom={0.25}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e7e5e4" gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {panel && (
          <div className={s.rightPanel}>

            <div className={s.panelHeader} style={{ background: roadmap.color }}>
              <span className={s.panelEmoji}>{panel.emoji ?? "📚"}</span>
              <div className={s.panelHeaderText}>
                <h2 className={s.panelTitle}>{panel.label}</h2>
                {panel.nodeType === "optional" && (
                  <span className={s.optionalBadge}>opcional</span>
                )}
              </div>
              <button className={s.panelClose} onClick={() => setPanel(null)}>✕</button>
            </div>

            <div className={s.panelBody}>

              {/* Status */}
              <div className={s.statusRow}>
                {(["pending", "in_progress", "done"] as NodeStatus[]).map(st => (
                  <button
                    key={st}
                    className={`${s.statusBtn} ${panelStatus === st ? s.statusBtnActive : ""}`}
                    data-status={st}
                    onClick={() => setStatus(panel.id, st)}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>

              {/* Description */}
              <p className={s.panelDesc}>{panel.description}</p>

              {/* Related topics */}
              {relatedNodes.length > 0 && (
                <div className={s.related}>
                  <p className={s.relatedTitle}>Temas relacionados</p>
                  <div className={s.relatedChips}>
                    {relatedNodes.map(n => (
                      <button
                        key={n.id}
                        className={s.chip}
                        onClick={() => setPanel(n)}
                      >
                        {n.emoji && <span>{n.emoji}</span>}
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask tutor */}
              <button className={s.askBtn} onClick={askAboutTopic}>
                🎓 Preguntarle al tutor sobre este tema →
              </button>

            </div>
          </div>
        )}

      </div>

      {/* ── Chat zone ── */}
      <div className={s.chatZone}>

        {drawerOpen && chatMsgs.length > 0 && (
          <div className={s.drawer}>
            <button className={s.drawerClose} onClick={() => setDrawerOpen(false)}>✕</button>
            {chatMsgs.map((m, i) => (
              <div key={i} className={`${s.msg} ${m.role === "user" ? s.msgUser : s.msgBot}`}>
                {m.role === "assistant" && <span className={s.botIcon}>🎓</span>}
                <div className={s.bubble}>{m.content || <span className={s.typing}>···</span>}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className={s.bar}>
          {chatMsgs.length > 0 && !drawerOpen && (
            <button className={s.showChat} onClick={() => setDrawerOpen(true)}>
              ↑ Ver conversación ({chatMsgs.length} mensajes)
            </button>
          )}
          <div className={s.inputRow}>
            <textarea
              ref={inputRef}
              className={s.input}
              placeholder={`Preguntá sobre ${roadmap.title.toLowerCase()}…`}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button
              className={s.sendBtn}
              onClick={sendMessage}
              disabled={!chatInput.trim() || streaming}
              style={{ background: roadmap.color }}
            >
              {streaming ? "…" : "↑"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
