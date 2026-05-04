"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { RoadmapDef, RoadmapNodeDef } from "@/data/roadmaps/types";
import s from "./RoadmapViewer.module.css";

type NodeStatus = "pending" | "in_progress" | "done";
type ChatMsg    = { role: "user" | "assistant"; content: string };

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

// Group nodes: sections + their child topics, in order
interface Section { header: RoadmapNodeDef; topics: RoadmapNodeDef[] }

function groupNodes(nodes: RoadmapNodeDef[]): { intro: RoadmapNodeDef[]; sections: Section[] } {
  const intro: RoadmapNodeDef[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const n of nodes) {
    if (n.nodeType === "section") {
      current = { header: n, topics: [] };
      sections.push(current);
    } else if (current) {
      current.topics.push(n);
    } else {
      intro.push(n);
    }
  }
  return { intro, sections };
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

  const { intro, sections } = useMemo(() => groupNodes(roadmap.nodes), [roadmap.nodes]);

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
  }, [panel, roadmap]);

  const total     = roadmap.nodes.filter(n => n.nodeType !== "section").length;
  const doneCount = roadmap.nodes.filter(n => n.nodeType !== "section" && progress[n.id] === "done").length;
  const pct       = total ? Math.round((doneCount / total) * 100) : 0;

  function setStatus(id: string, st: NodeStatus) {
    setProgress(prev => {
      const next = { ...prev, [id]: st };
      saveProgress(roadmap.slug, next);
      return next;
    });
  }

  const panelStatus: NodeStatus = panel ? (progress[panel.id] ?? "pending") : "pending";

  // ── Chat ──────────────────────────────────────────
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
        body: JSON.stringify({ question: q, history, subject: roadmap.slug, topicLabel: panel?.label }),
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
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + json.text };
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

  function askAboutTopic(node: RoadmapNodeDef) {
    setChatInput(node.tutorPrompt ?? `Explicame el tema: ${node.label}`);
    setPanel(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const openPanel = useCallback((node: RoadmapNodeDef) => {
    setPanel(prev => prev?.id === node.id ? null : node);
  }, []);

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

      {/* ── Scrollable content ── */}
      <div className={s.scroll}>
        <div className={`${s.content} ${panel ? s.contentShifted : ""}`}>

          {/* Intro nodes (before first section) */}
          {intro.length > 0 && (
            <div className={s.introRow}>
              {intro.map(n => (
                <TopicCard key={n.id} node={n} status={progress[n.id] ?? "pending"} accent={roadmap.color} onClick={openPanel} active={panel?.id === n.id} />
              ))}
            </div>
          )}

          {/* Sections */}
          {sections.map(sec => (
            <div key={sec.header.id} className={s.section}>
              <div className={s.sectionHeader} style={{ background: roadmap.color }}>
                {sec.header.emoji && <span className={s.sectionEmoji}>{sec.header.emoji}</span>}
                <span className={s.sectionLabel}>{sec.header.label}</span>
              </div>
              <div className={s.topicsGrid}>
                {sec.topics.map(n => (
                  <TopicCard key={n.id} node={n} status={progress[n.id] ?? "pending"} accent={roadmap.color} onClick={openPanel} active={panel?.id === n.id} />
                ))}
              </div>
            </div>
          ))}

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

            <p className={s.panelDesc}>{panel.description}</p>

            {relatedNodes.length > 0 && (
              <div className={s.related}>
                <p className={s.relatedTitle}>Temas relacionados</p>
                <div className={s.chips}>
                  {relatedNodes.map(n => (
                    <button key={n.id} className={s.chip} onClick={() => setPanel(n)}>
                      {n.emoji && <span>{n.emoji}</span>}
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className={s.askBtn} onClick={() => askAboutTopic(panel)}>
              🎓 Preguntarle al tutor →
            </button>

          </div>
        </div>
      )}

      {/* ── Chat zone ── */}
      <div className={s.chatZone}>
        {drawerOpen && chatMsgs.length > 0 && (
          <div className={s.drawer}>
            <button className={s.drawerClose} onClick={() => setDrawerOpen(false)}>✕</button>
            {chatMsgs.map((m, i) => (
              <div key={i} className={`${s.msg} ${m.role === "user" ? s.msgUser : s.msgBot}`}>
                {m.role === "assistant" && <span className={s.botIcon}>🎓</span>}
                <div className={s.bubble}>
                  {m.content || <span className={s.typing}>···</span>}
                </div>
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

// ── Topic card ────────────────────────────────────────
interface CardProps {
  node: RoadmapNodeDef;
  status: NodeStatus;
  accent: string;
  active: boolean;
  onClick: (n: RoadmapNodeDef) => void;
}

function TopicCard({ node, status, accent, active, onClick }: CardProps) {
  const isOptional = node.nodeType === "optional";
  return (
    <button
      className={[
        s.card,
        isOptional              ? s.cardOptional    : "",
        status === "in_progress"? s.cardInProgress  : "",
        status === "done"       ? s.cardDone        : "",
        active                  ? s.cardActive      : "",
      ].join(" ")}
      style={
        active
          ? { borderColor: accent, boxShadow: `4px 4px 0 ${accent}` }
          : status === "done"
          ? { borderColor: accent }
          : {}
      }
      onClick={() => onClick(node)}
    >
      {status === "done"        && <span className={s.cardCheck} style={{ background: accent }}>✓</span>}
      {status === "in_progress" && <span className={s.cardDot} />}
      {node.emoji && <span className={s.cardEmoji}>{node.emoji}</span>}
      <span className={s.cardLabel}>{node.label}</span>
      {isOptional && <span className={s.cardOpt}>opcional</span>}
    </button>
  );
}
