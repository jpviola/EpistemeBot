"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { RoadmapDef, RoadmapNodeDef } from "@/data/roadmaps/types";
import s from "./RoadmapViewer.module.css";

type NodeStatus = "pending" | "in_progress" | "done";
type ChatMsg    = { role: "user" | "assistant"; content: string };

const STATUS_LABEL: Record<NodeStatus, string> = {
  pending: "Pendiente", in_progress: "En progreso", done: "Dominado ✓",
};

// ── Layout constants ──────────────────────────────────
const SW   = 260, SH  = 46;   // section node
const TW   = 186, TH  = 46;   // topic node
const HGAP = 12;               // horizontal gap between topics
const RGAP = 10;               // vertical gap between topic rows
const VC   = 52;               // vertical connector height
const COLS = 3;                // max topics per row
const PX   = 64, PY = 48;     // canvas padding

interface LNode { id: string; x: number; y: number; w: number; h: number; def: RoadmapNodeDef }
interface LPath { d: string; dashed: boolean }
interface Section { header: RoadmapNodeDef; topics: RoadmapNodeDef[] }

function groupNodes(nodes: RoadmapNodeDef[]): { intro: RoadmapNodeDef[]; sections: Section[] } {
  const intro: RoadmapNodeDef[] = [];
  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const n of nodes) {
    if (n.nodeType === "section") { cur = { header: n, topics: [] }; sections.push(cur); }
    else if (cur) cur.topics.push(n);
    else intro.push(n);
  }
  return { intro, sections };
}

function bez(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
}

function computeLayout(intro: RoadmapNodeDef[], sections: Section[]) {
  const maxRowW = COLS * TW + (COLS - 1) * HGAP;
  const cw = Math.max(SW, maxRowW) + PX * 2;
  const cx = cw / 2;
  const nodes: LNode[] = [];
  const paths: LPath[] = [];
  let y = PY;

  function rowNodes(defs: RoadmapNodeDef[], rowY: number): LNode[] {
    const count = Math.min(defs.length, COLS);
    const rw = count * TW + (count - 1) * HGAP;
    let x = cx - rw / 2;
    return defs.slice(0, count).map(d => {
      const n: LNode = { id: d.id, x, y: rowY, w: TW, h: TH, def: d };
      x += TW + HGAP;
      return n;
    });
  }

  // ── Connection: one origin point → fan out to multiple targets ──
  function fanTo(fromX: number, fromY: number, targets: LNode[]) {
    for (const t of targets) {
      paths.push({ d: bez(fromX, fromY, t.x + t.w / 2, t.y), dashed: t.def.nodeType === "optional" });
    }
  }

  // ── Connection: multiple sources → one destination point ──
  function gatherTo(sources: LNode[], toX: number, toY: number) {
    const bY = sources[0].y + TH;
    for (const src of sources) {
      paths.push({ d: bez(src.x + src.w / 2, bY, toX, toY), dashed: false });
    }
  }

  let prevSources: LNode[] = [];

  // Intro nodes (before first section)
  if (intro.length > 0) {
    const row = rowNodes(intro, y);
    nodes.push(...row);
    prevSources = row;
    y += TH + VC;
  }

  for (const sec of sections) {
    // Gather previous topics → section top
    if (prevSources.length > 0) gatherTo(prevSources, cx, y);
    else if (y > PY) paths.push({ d: bez(cx, y - VC, cx, y), dashed: false });

    // Section node
    const sn: LNode = { id: sec.header.id, x: cx - SW / 2, y, w: SW, h: SH, def: sec.header };
    nodes.push(sn);

    if (sec.topics.length === 0) {
      prevSources = [sn]; // treat section bottom as source
      y += SH + VC;
      continue;
    }

    // Place topic rows
    const chunks: RoadmapNodeDef[][] = [];
    for (let i = 0; i < sec.topics.length; i += COLS) chunks.push(sec.topics.slice(i, i + COLS));

    let rowY = y + SH + VC;
    const allTopicNodes: LNode[] = [];

    for (const chunk of chunks) {
      const row = rowNodes(chunk, rowY);
      nodes.push(...row);
      allTopicNodes.push(...row);
      rowY += TH + RGAP;
    }

    // Section bottom → fan to all topic tops
    fanTo(cx, y + SH, allTopicNodes);

    prevSources = allTopicNodes;
    y = rowY - RGAP + VC;
  }

  return { nodes, paths, width: cw, height: y + PY };
}

// ── Progress helpers ──────────────────────────────────
function progressKey(slug: string) { return `roadmap_progress_${slug}`; }
function loadProgress(slug: string): Record<string, NodeStatus> {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(progressKey(slug)); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveProgress(slug: string, p: Record<string, NodeStatus>) {
  try { localStorage.setItem(progressKey(slug), JSON.stringify(p)); } catch {}
}

// ── Component ─────────────────────────────────────────
interface Props { roadmap: RoadmapDef }

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

  const { intro, sections } = useMemo(() => groupNodes(roadmap.nodes), [roadmap.nodes]);
  const layout = useMemo(() => computeLayout(intro, sections), [intro, sections]);

  const relatedNodes = useMemo(() => {
    if (!panel) return [];
    const linked = new Set<string>();
    roadmap.edges.forEach(e => {
      if (e.source === panel.id) linked.add(e.target);
      if (e.target === panel.id) linked.add(e.source);
    });
    return roadmap.nodes.filter(n => linked.has(n.id) && n.nodeType !== "section").slice(0, 6);
  }, [panel, roadmap]);

  const total     = roadmap.nodes.filter(n => n.nodeType !== "section").length;
  const doneCount = roadmap.nodes.filter(n => n.nodeType !== "section" && progress[n.id] === "done").length;
  const pct       = total ? Math.round((doneCount / total) * 100) : 0;

  function setStatus(id: string, st: NodeStatus) {
    setProgress(prev => { const next = { ...prev, [id]: st }; saveProgress(roadmap.slug, next); return next; });
  }

  const openPanel = useCallback((node: RoadmapNodeDef) => {
    setPanel(prev => prev?.id === node.id ? null : node);
  }, []);

  const panelStatus: NodeStatus = panel ? (progress[panel.id] ?? "pending") : "pending";

  // ── Chat ──────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  async function sendMessage() {
    const q = chatInput.trim();
    if (!q || streaming) return;
    const history = chatMsgs;
    setChatMsgs([...history, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setChatInput(""); setDrawerOpen(true); setStreaming(true);
    try {
      const res = await fetch("/api/roadmap-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history, subject: roadmap.slug, topicLabel: panel?.label }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.startsWith("data: ") ? part.slice(6) : part;
          if (line === "[DONE]") continue;
          try {
            const json = JSON.parse(line);
            if (json.text) setChatMsgs(prev => {
              const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + json.text }; return c;
            });
          } catch {}
        }
      }
    } catch {
      setChatMsgs(prev => { const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], content: "Error al conectar." }; return c; });
    } finally { setStreaming(false); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function askAboutTopic(node: RoadmapNodeDef) {
    setChatInput(node.tutorPrompt ?? `Explicame el tema: ${node.label}`);
    setPanel(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

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

      {/* ── Canvas ── */}
      <div className={s.scroll}>
        <div className={s.canvasOuter}>
          <div
            className={s.canvas}
            style={{ width: layout.width, height: layout.height }}
          >
            {/* SVG connections */}
            <svg
              className={s.svg}
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.paths.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill="none"
                  stroke="#c8c5c0"
                  strokeWidth={2}
                  strokeDasharray={p.dashed ? "6 4" : undefined}
                />
              ))}
            </svg>

            {/* Nodes */}
            {layout.nodes.map(n => {
              const status: NodeStatus = progress[n.id] ?? "pending";
              const isSection  = n.def.nodeType === "section";
              const isOptional = n.def.nodeType === "optional";
              const isActive   = panel?.id === n.id;

              if (isSection) {
                return (
                  <div
                    key={n.id}
                    className={s.sectionNode}
                    style={{ left: n.x, top: n.y, width: n.w, background: roadmap.color }}
                  >
                    {n.def.emoji && <span className={s.nodeEmoji}>{n.def.emoji}</span>}
                    <span>{n.def.label}</span>
                  </div>
                );
              }

              return (
                <button
                  key={n.id}
                  className={[
                    s.topicNode,
                    isOptional              ? s.nodeOptional   : "",
                    status === "in_progress"? s.nodeInProgress : "",
                    status === "done"       ? s.nodeDone       : "",
                    isActive                ? s.nodeActive     : "",
                  ].join(" ")}
                  style={{
                    left: n.x, top: n.y, width: n.w,
                    borderColor: isOptional ? undefined : roadmap.color,
                    ...(isActive ? { boxShadow: `4px 4px 0 ${roadmap.color}` } : {}),
                  }}
                  onClick={() => openPanel(n.def)}
                >
                  {status === "done"        && <span className={s.checkBadge} style={{ background: roadmap.color }}>✓</span>}
                  {status === "in_progress" && <span className={s.dotBadge} />}
                  {n.def.emoji && <span className={s.nodeEmoji}>{n.def.emoji}</span>}
                  <span className={s.nodeLabel}>{n.def.label}</span>
                  {isOptional && <span className={s.optTag}>opt</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right panel (fixed) ── */}
      {panel && (
        <div className={s.rightPanel}>
          <div className={s.panelHeader} style={{ background: roadmap.color }}>
            <span className={s.panelEmoji}>{panel.emoji ?? "📚"}</span>
            <div className={s.panelHeaderText}>
              <h2 className={s.panelTitle}>{panel.label}</h2>
              {panel.nodeType === "optional" && <span className={s.optBadge}>opcional</span>}
            </div>
            <button className={s.panelClose} onClick={() => setPanel(null)}>✕</button>
          </div>

          <div className={s.panelBody}>

            {/* Status */}
            <div className={s.statusRow}>
              {(["pending", "in_progress", "done"] as NodeStatus[]).map(st => (
                <button
                  key={st}
                  className={`${s.statusBtn} ${panelStatus === st ? s.statusActive : ""}`}
                  data-status={st}
                  onClick={() => setStatus(panel.id, st)}
                >
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>

            {/* Intro */}
            <div className={s.intro}>
              <p className={s.introLabel}>Introducción</p>
              <p className={s.introText}>{panel.description}</p>
            </div>

            {/* Tutor invite */}
            <div className={s.tutorCard}>
              <div className={s.tutorCardTop}>
                <span className={s.tutorCardIcon}>🎓</span>
                <p className={s.tutorCardTitle}>Preguntale al tutor</p>
              </div>
              <p className={s.tutorCardHint}>
                Podés pedir una explicación, ejemplos, o compararlo con otros temas.
              </p>
              <button
                className={s.tutorCardBtn}
                style={{ background: roadmap.color }}
                onClick={() => askAboutTopic(panel)}
              >
                Empezar conversación →
              </button>
            </div>

            {/* Related topics */}
            {relatedNodes.length > 0 && (
              <div className={s.related}>
                <p className={s.relatedTitle}>Temas relacionados</p>
                <div className={s.chips}>
                  {relatedNodes.map(n => (
                    <button key={n.id} className={s.chip} onClick={() => setPanel(n)}>
                      {n.emoji && <span>{n.emoji}</span>}{n.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Chat zone ── */}
      <div className={s.chatZone}>

        {/* Drawer (messages) */}
        {drawerOpen && chatMsgs.length > 0 && (
          <div className={s.drawer}>
            <button className={s.drawerClose} onClick={() => setDrawerOpen(false)}>✕</button>
            {chatMsgs.map((m, i) => (
              <div key={i} className={`${s.msg} ${m.role === "user" ? s.msgUser : s.msgBot}`}>
                {m.role === "assistant" && <span className={s.botIcon}>🎓</span>}
                <div className={s.bubble}>
                  {m.content
                    ? m.role === "assistant"
                      ? <ReactMarkdown>{m.content}</ReactMarkdown>
                      : m.content
                    : <span className={s.typing}>···</span>}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Bar */}
        <div className={s.bar}>
          {chatMsgs.length > 0 && !drawerOpen && (
            <button className={s.showChat} onClick={() => setDrawerOpen(true)}>
              ↑ {chatMsgs.length} mensajes — Ver conversación
            </button>
          )}
          <div className={s.inputRow}>
            <span className={s.tutorTag}>🎓 Tutor</span>
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
            >
              {streaming ? "…" : "↑"}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
