"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession, signOut } from "next-auth/react";
import s from "./TutorChat.module.css";
import ToolsPanel from "./ToolsPanel";
import { getLevelInfo } from "@/lib/levels";
import { useTutorStream } from "@/hooks/useTutorStream";

type Level = "secondary" | "cbc" | "university" | "specialist";
type Mode  = "tutor" | "debate";

interface Recommendation {
  label:    string;
  question: string;
  iri:      string;
  type:     string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  prerequisites?:   Array<{ label: string; reason: string }>;
  relatedConcepts?: Array<{ label: string; relation: string; iri?: string }>;
  recommendations?: Recommendation[];
}

interface SessionMeta {
  id: string;
  title: string | null;
  level: string;
  updatedAt: string;
  _count: { messages: number };
}

const LEVELS: { id: Level; label: string; short: string }[] = [
  { id: "secondary",  label: "Secundario",   short: "SEC" },
  { id: "cbc",        label: "CBC",           short: "CBC" },
  { id: "university", label: "Universitario", short: "UNI" },
  { id: "specialist", label: "Especialista",  short: "ESP" },
];

const SUGGESTIONS_BY_INTEREST: Record<string, string[]> = {
  filosofia:  ["¿Qué critica Nietzsche de Platón?", "¿Qué es el imperativo categórico?", "Explicame el Dasein de Heidegger", "¿Qué es el existencialismo?"],
  psicologia: ["¿Qué es el inconsciente para Freud y para Lacan?", "¿Cuáles son las etapas del desarrollo según Piaget?", "¿Qué es el estadio del espejo en Lacan?", "¿Cómo explica Freud los sueños?"],
  hist_arg:   ["¿Qué causas tuvo la Revolución de Mayo?", "¿Qué fue la dictadura militar argentina de 1976?", "¿Qué fue el peronismo?", "¿Cómo fue la campaña de San Martín?"],
  hist_lat:   ["¿Quién fue Simón Bolívar?", "¿Qué fue la Revolución Cubana?", "¿Qué es la colonialidad del poder?", "¿Qué rol tuvo el Che Guevara?"],
  hist_univ:  ["¿Qué causas tuvo la Revolución Francesa?", "¿Qué fue la Guerra Fría?", "¿Cómo fue el Holocausto?", "¿Qué causó la Primera Guerra Mundial?"],
  literatura: ["¿Qué es el realismo mágico?", "¿Qué temas trabaja Borges?", "¿Qué es el boom latinoamericano?", "¿Qué es el absurdismo en Camus?"],
  arte:       ["¿Qué es el surrealismo?", "¿Cuáles son los principales movimientos del arte moderno?", "¿Qué es el arte conceptual?", "¿Cómo influye el contexto histórico en el arte?"],
  cs_sociales:["¿Qué es el habitus según Bourdieu?", "¿Qué es la hegemonía en Gramsci?", "¿Qué es la anomia en Durkheim?", "¿Qué es la biopolítica en Foucault?"],
};

const DEFAULT_SUGGESTIONS = [
  "¿Qué es el inconsciente para Freud y para Lacan?",
  "¿Qué causas tuvo la Revolución de Mayo?",
  "¿Qué critica Nietzsche de Platón?",
  "¿Qué es el habitus según Bourdieu?",
  "¿Qué es el realismo mágico en literatura?",
  "Explicame el Dasein de Heidegger",
  "¿Cuáles son las etapas del desarrollo según Piaget?",
  "¿Qué fue la dictadura militar argentina de 1976?",
];

const DEBATE_SUGGESTIONS = [
  "La democracia es el mejor sistema de gobierno",
  "Freud ya está superado por la neurociencia",
  "La violencia nunca es justificada políticamente",
  "Los derechos humanos son universales",
  "La historia la escriben los vencedores",
  "El arte no necesita tener un mensaje",
  "El capitalismo es inevitable",
  "La identidad nacional argentina es un mito",
];

function getPersonalizedSuggestions(interests: string[]): string[] {
  if (!interests.length) return DEFAULT_SUGGESTIONS;
  const pool: string[] = [];
  for (const id of interests) {
    const opts = SUGGESTIONS_BY_INTEREST[id];
    if (opts) pool.push(...opts.slice(0, 2));
  }
  const result = Array.from(new Set(pool)).slice(0, 8);
  return result.length >= 4 ? result : [...result, ...DEFAULT_SUGGESTIONS].slice(0, 8);
}

function getOrCreateGuestId(): string {
  const key = "epistemebot_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const VolumeIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? "#FF6B6B" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    {active ? <line x1="23" y1="9" x2="17" y2="15" /> : (
      <>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </>
    )}
  </svg>
);

const ClipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008a2.25 2.25 0 01-3.182-3.182l10.94-10.94a.75.75 0 011.06 1.06l-10.94 10.94a.75.75 0 101.06 1.06l10.94-10.94a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
  </svg>
);

export function TutorChat() {
  const [guestId,   setGuestId]   = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);
  const [mode,      setMode]      = useState<Mode>("tutor");
  const [level,     setLevel]     = useState<Level>("cbc");
  const [sessions,  setSessions]  = useState<SessionMeta[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const { startStream, loading }  = useTutorStream();
  const [xpToast,   setXpToast]   = useState<string | null>(null);
  const [profileXp, setProfileXp] = useState<number>(0);
  const [toolsOpen, setToolsOpen] = useState(false);

  const { data: session } = useSession();
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = getOrCreateGuestId();
    setGuestId(id);
    fetch(`/api/gamification/profile?guestId=${id}`)
      .then(r => r.json())
      .then(p => setProfileXp(p.xp ?? 0))
      .catch(() => {});
  }, []);

  const loadSessions = useCallback(async (gid: string) => {
    if (!gid) return;
    const res = await fetch(`/api/sessions?guestId=${gid}`);
    if (res.ok) setSessions(await res.json());
  }, []);

  useEffect(() => { if (guestId) loadSessions(guestId); }, [guestId, loadSessions]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function startNewChat() {
    setSessionId("");
    setMessages([]);
    setInput("");
  }

  function switchMode(m: Mode) {
    setMode(m);
    startNewChat();
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleRedo = (index: number) => {
    if (index > 0 && messages[index - 1].role === "user") {
      sendMessage(messages[index - 1].content);
    }
  };

  const handleListen = (index: number, content: string) => {
    if (typeof window === "undefined") return;
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const stopThinking = () => {
    abortControllerRef.current?.abort();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      alert("El archivo es demasiado grande. El límite máximo es de 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    // Aquí podrías disparar una notificación de que el archivo se cargó
  };

  async function loadSession(id: string) {
    if (!guestId) return;
    const res = await fetch(`/api/sessions/${id}?guestId=${guestId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.id);
    setLevel(data.level as Level);
    const msgs: Message[] = data.messages.map((m: {
      role: "user" | "assistant";
      content: string;
      prerequisites?: string | null;
      relatedConcepts?: string | null;
    }) => ({
      role: m.role,
      content: m.content,
      prerequisites:   m.prerequisites   ? JSON.parse(m.prerequisites)   : undefined,
      relatedConcepts: m.relatedConcepts ? JSON.parse(m.relatedConcepts) : undefined,
    }));
    setMessages(msgs);
  }

  async function sendMessage(text?: string) {
    const question = (text ?? input).trim();
    if ((!question && !selectedFile) || loading || !guestId) return;

    // Procesar archivo si existe
    let attachment = null;
    if (selectedFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(selectedFile);
      });
      attachment = {
        name: selectedFile.name,
        type: selectedFile.type,
        data: base64,
      };
    }

    setInput("");
    setSelectedFile(null);

    // Abortar petición previa si existe antes de empezar una nueva
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    let sid = sessionId;
    if (!sid) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, level }),
      });
      const created = await res.json();
      sid = created.id;
      setSessionId(sid);
    }

    const isFirst = messages.length === 0;
    // assistantMsgIndex will be messages.length + 1 after we push user + assistant placeholder
    const assistantMsgIndex = messages.length + 1;
    setMessages(prev => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" }
    ]);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    abortControllerRef.current = new AbortController();

    await startStream({
      url: "/api/tutor",
      body: {
        question, level, mode,
        sessionId: sid, guestId, isFirst, history,
        interests: session?.user?.interests ?? [],
        attachment,
      },
      signal: abortControllerRef.current.signal,
      onText: (text) => appendContentToLastMessage(text),
      onMetadata: (data) => updateLastAssistantMessage(data),
      onError: (err) => {
        // No mostrar error si fue cancelado manualmente
        if (err.includes("AbortError")) return;
        updateLastAssistantMessage({ content: `⚠️ ${err}` });
      },
      onDone: (metadata) => {
        if (mode === "tutor" && metadata.recommendations) {
          setMessages(prev => {
            const next = [...prev];
            if (next[assistantMsgIndex]) next[assistantMsgIndex] = { ...next[assistantMsgIndex], recommendations: metadata.recommendations };
            return next;
          });
        }
        if (metadata.xpGained) {
          setXpToast(`+${metadata.xpGained} XP`);
          setTimeout(() => setXpToast(null), 2500);
          setProfileXp(prev => prev + metadata.xpGained);
        }
        loadSessions(guestId);
      }
    });
  }

  // Funciones auxiliares para limpiar el estado de mensajes
  function updateLastAssistantMessage(patch: Partial<Message>) {
    setMessages(prev => {
      const next = [...prev];
      const i = next.length - 1;
      if (i >= 0) next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function appendContentToLastMessage(text: string) {
    setMessages(prev => {
      const next = [...prev];
      const i = next.length - 1;
      if (i >= 0) next[i] = { ...next[i], content: next[i].content + text };
      return next;
    });
  }

  const li = getLevelInfo(profileXp);
  const isDebate = mode === "debate";

  return (
    <div className={s.container}>

      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ""}`}>

        {/* Logo + collapse toggle */}
        <div className={s.sidebarTop}>
          {!collapsed && (
            <Link href="/" className={s.logo}>
              Episteme<span className={s.logoAccent}>Bot</span>
            </Link>
          )}
          <button
            className={s.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Nueva conversación */}
        <div className={s.sidebarSection}>
          {!collapsed && <span className={s.sidebarLabel}>Conversación</span>}
          <button className={s.newChatBtn} onClick={startNewChat} title="Nueva conversación">
            {collapsed ? "+" : "+ Nueva conversación"}
          </button>
        </div>

        {/* Modo */}
        <div className={s.sidebarSection}>
          {!collapsed && <span className={s.sidebarLabel}>Modo</span>}
          <div className={`${s.modeGroup} ${collapsed ? s.modeGroupCollapsed : ""}`}>
            <button
              className={`${s.modeBtn} ${mode === "tutor" ? s.modeBtnTutor : ""}`}
              onClick={() => switchMode("tutor")}
              title="Modo Tutor"
            >
              {collapsed ? "🎓" : "🎓 Tutor"}
            </button>
            <button
              className={`${s.modeBtn} ${mode === "debate" ? s.modeBtnDebate : ""}`}
              onClick={() => switchMode("debate")}
              title="Modo Debate"
            >
              {collapsed ? "⚡" : "⚡ Debate"}
            </button>
          </div>
        </div>

        {/* Nivel */}
        <div className={s.sidebarSection}>
          {!collapsed && <span className={s.sidebarLabel}>Nivel</span>}
          <div className={`${s.levelGroup} ${collapsed ? s.levelGroupCollapsed : ""}`}>
            {LEVELS.map(l => (
              <button
                key={l.id}
                className={`${s.levelBtn} ${level === l.id ? s.levelBtnActive : ""}`}
                onClick={() => setLevel(l.id)}
                title={l.label}
              >
                {collapsed ? l.short : l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Historial */}
        <div className={s.sessionList}>
          {sessions.length === 0 ? (
            <div className={s.sessionEmpty}>
              <div className={s.sessionEmptyIcon}>💬</div>
              {!collapsed && (
                <>
                  <p className={s.sessionEmptyTitle}>Sin historial</p>
                  <span className={s.sessionEmptySub}>Tus chats guardados aparecerán aquí para que puedas retomarlos luego.</span>
                </>
              )}
            </div>
          ) : (
            sessions.map(sess => (
              <div
                key={sess.id}
                className={`${s.sessionItem} ${sess.id === sessionId ? s.sessionItemActive : ""}`}
                onClick={() => loadSession(sess.id)}
                title={sess.title ?? "Conversación"}
              >
                {collapsed ? (
                  <div className={s.sessionItemTitle}>💬</div>
                ) : (
                  <>
                    <div className={s.sessionItemTitle}>{sess.title ?? "Conversación sin título"}</div>
                    <div className={s.sessionItemMeta}>
                      <span>{sess.level}</span>
                      <span>·</span>
                      <span>{formatDate(sess.updatedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom: XP + ranking + auth */}
        <div className={s.sidebarBottom}>
          <div className={s.sidebarSection}>
            {!collapsed && <span className={s.sidebarLabel}>Herramientas</span>}
            <button className={s.newChatBtn} onClick={() => setToolsOpen(true)} title="Abrir herramientas">
              {collapsed ? "🧰" : "Herramientas"}
            </button>
          </div>
          {guestId && (
            <Link href="/recompensas" className={s.xpBtn} title={`${profileXp} XP · Nivel ${li.level}`}>
              <span className={s.xpEmoji}>{li.emoji}</span>
              {!collapsed && (
                <>
                  <span className={s.xpVal}>{profileXp} XP</span>
                  <span className={s.xpLvl}>Nv.{li.level} {li.title}</span>
                </>
              )}
            </Link>
          )}
          <div className={s.bottomRow}>
            <Link href="/ranking" className={s.rankBtn} title="Ranking">🏆</Link>
            {session?.user ? (
              session.user.role === "teacher" ? (
                <Link href="/teacher" className={s.authBtn} title="Panel docente">
                  {collapsed ? "📋" : "Panel docente"}
                </Link>
              ) : (
                <button
                  onClick={() => signOut()}
                  className={s.authBtn}
                  title={session.user.name ?? session.user.email ?? ""}
                >
                  {collapsed ? "👤" : (session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0])}
                </button>
              )
            ) : (
              <Link href="/login" className={s.authBtn} title="Iniciar sesión">
                {collapsed ? "🔑" : "Iniciar sesión"}
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <div className={s.main}>

        <header className={s.header}>
          <div>
            <div className={`${s.headerTitle} ${isDebate ? s.headerDebateTitle : ""}`}>
              {isDebate ? "⚡ Debate socrático" : "Tutor de humanidades"}
            </div>
            <div className={s.headerSub}>
              {isDebate
                ? "Planteá una tesis · El tutor te desafiará"
                : "Filosofía · Historia · Psicología · Literatura · Arte · Ciencias Sociales"}
            </div>
          </div>
        </header>

        {xpToast && <div className={s.xpToast}>{xpToast}</div>}

        {/* Messages */}
        <div className={s.messages}>
          {messages.length === 0 ? (
            <div className={s.empty}>
              <div>
                <p className={s.emptyTitle}>{isDebate ? "Planteá una tesis" : "¿Qué querés explorar?"}</p>
                <p className={s.emptySub}>
                  {isDebate
                    ? "El tutor la desafiará con el método socrático"
                    : "Filosofía · Historia · Psicología · Literatura · Arte · Ciencias Sociales"}
                </p>
              </div>
              <div className={s.suggestions}>
                {(isDebate
                  ? DEBATE_SUGGESTIONS
                  : getPersonalizedSuggestions(session?.user?.interests ?? [])
                ).map(q => (
                  <button
                    key={q}
                    className={`${s.suggestion} ${isDebate ? s.suggestionDebate : ""}`}
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={s.messagesInner}>
              {messages.map((msg, i) => (
                <div key={i} className={`${s.messageRow} ${msg.role === "user" ? s.messageRowUser : ""}`}>
                  {msg.role === "assistant" && (
                    <div className={`${s.avatar} ${isDebate ? s.avatarDebate : ""}`}>
                      {isDebate ? "⚡" : "S"}
                    </div>
                  )}
                  <div className={s.bubbleWrapper}>
                    <div className={`${s.bubble} ${
                      msg.role === "user"
                        ? s.bubbleUser
                        : isDebate
                        ? s.bubbleDebate
                        : s.bubbleAssistant
                    }`}>
                      {msg.role === "user" ? (
                        <span>{msg.content}</span>
                      ) : msg.content === "" && loading ? (
                        <div className={s.dots}>
                          <div className={s.dot} />
                          <div className={s.dot} />
                          <div className={s.dot} />
                        </div>
                      ) : (
                        <div className={s.md}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {msg.role === "assistant" && msg.content !== "" && (
                      <div className={s.bubbleActions}>
                        <button className={s.actionBtn} onClick={() => handleCopy(msg.content)} title="Copiar"><CopyIcon /></button>
                        <button className={s.actionBtn} onClick={() => handleRedo(i)} title="Reintentar"><RedoIcon /></button>
                        <button className={s.actionBtn} onClick={() => handleListen(i, msg.content)} title="Escuchar">
                          <VolumeIcon active={speakingIndex === i} />
                        </button>
                      </div>
                    )}
                    {msg.role === "assistant" &&
                      (msg.prerequisites?.length ?? 0) + (msg.relatedConcepts?.length ?? 0) > 0 && (
                      <div className={s.chips}>
                        {msg.prerequisites?.map((p, j) => (
                          <button
                            key={`p${j}`}
                            className={s.chipPrereq}
                            onClick={() => sendMessage(`¿Qué es ${p.label}?`)}
                            title={p.reason}
                          >
                            → {p.label}
                          </button>
                        ))}
                        {msg.relatedConcepts?.map((r, j) => (
                          <button
                            key={`r${j}`}
                            className={s.chipRelated}
                            onClick={() => sendMessage(`Explicame ${r.label}`)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.recommendations && msg.recommendations.length > 0 && (
                      <div className={s.recommendations}>
                        <span className={s.recoLabel}>¿Seguir explorando?</span>
                        <div className={s.recoChips}>
                          {msg.recommendations.map((r, j) => (
                            <button
                              key={`rec${j}`}
                              className={s.recoChip}
                              onClick={() => sendMessage(r.question)}
                              title={r.label}
                            >
                              {r.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className={s.inputArea}>
          {selectedFile && (
            <div className={s.filePreview}>
              <span>📄 {selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)}>✕</button>
            </div>
          )}
          {loading && (
            <div className={s.progressBarWrapper}>
              <div className={s.progressBar} />
            </div>
          )}
          <div className={s.inputRow}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
            <button
              className={s.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar PDF o imagen"
              disabled={loading}
            >
              <ClipIcon />
            </button>
            <textarea
              ref={textareaRef}
              className={`${s.textarea} ${isDebate ? s.textareaDebate : ""}`}
              value={input}
              rows={1}
              placeholder={isDebate ? "Planteá una tesis para debatir..." : "Hacé tu pregunta sobre humanidades..."}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
            />
            {loading ? (
              <button
                className={s.stopBtn}
                onClick={stopThinking}
                title="Detener respuesta"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                className={`${s.sendBtn} ${isDebate ? s.sendBtnDebate : ""}`}
                onClick={() => sendMessage()}
                disabled={!input.trim() && !selectedFile}
                aria-label="Enviar"
              >
                <SendIcon />
              </button>
            )}
          </div>
          <p className={s.hint}>Shift + Enter para nueva línea</p>
        </div>

      </div>
      <ToolsPanel open={toolsOpen} onClose={() => setToolsOpen(false)} sessionId={sessionId} guestId={guestId} />
    </div>
  );
}
