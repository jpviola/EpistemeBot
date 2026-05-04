"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import s from "./StudyCoach.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Qué es la repetición espaciada y cómo la aplico?",
  "Enseñame el método Feynman paso a paso",
  "¿Cómo tomo notas con el método Cornell?",
  "Ayudame a organizar mi estudio con un Kanban",
  "¿Qué es el aula invertida y cómo la uso?",
  "¿Cómo aplico el método Pomodoro a textos filosóficos?",
  "Enseñame a hacer un mapa conceptual",
  "¿Cómo preparo un examen de filosofía en una semana?",
];

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

export function StudyCoach() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function sendMessage(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput("");

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [
      ...prev,
      { role: "user",      content: question },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/study-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question, history }),
      });

      const reader  = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              setMessages(prev => {
                const next = [...prev];
                const i = next.length - 1;
                next[i] = { ...next[i], content: next[i].content + parsed.text };
                return next;
              });
            }
          } catch { /* partial chunk */ }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.sidebarTop}>
          <Link href="/" className={s.logo}>
            Episteme<span className={s.logoAccent}>Bot</span>
          </Link>
        </div>

        <div className={s.sidebarMeta}>
          <div className={s.coachBadge}>🧠 Coach de estudio</div>
          <p className={s.coachDesc}>
            Aprendé técnicas probadas para estudiar mejor: repetición espaciada, Feynman, Cornell, Kanban y más.
          </p>
        </div>

        <div className={s.techniquesList}>
          <span className={s.techniquesTitle}>Técnicas disponibles</span>
          {[
            ["🔁", "Repetición espaciada"],
            ["🧪", "Método Feynman"],
            ["📓", "Método Cornell"],
            ["📌", "Kanban de estudio"],
            ["🔄", "Aula invertida"],
            ["⏱️", "Pomodoro"],
            ["🗺️", "Mapas conceptuales"],
            ["📖", "Lectura activa (SQ3R)"],
          ].map(([emoji, name]) => (
            <button
              key={name}
              className={s.techniqueItem}
              onClick={() => sendMessage(`Enseñame ${name}`)}
            >
              <span>{emoji}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>

        <div className={s.sidebarBottom}>
          <Link href="/tutor" className={s.backBtn}>← Volver al tutor</Link>
        </div>
      </aside>

      {/* Main */}
      <div className={s.main}>
        <header className={s.header}>
          <div className={s.headerTitle}>🧠 Coach de técnicas de estudio</div>
          <div className={s.headerSub}>
            Pomodoro · Feynman · Cornell · Repetición espaciada · Kanban · Mapas conceptuales
          </div>
        </header>

        <div className={s.messages}>
          {messages.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>🧠</div>
              <p className={s.emptyTitle}>¿Cómo querés estudiar mejor?</p>
              <p className={s.emptySub}>Elegí una técnica o hacé tu pregunta</p>
              <div className={s.suggestions}>
                {SUGGESTIONS.map(q => (
                  <button key={q} className={s.suggestion} onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={s.messagesInner}>
              {messages.map((msg, i) => (
                <div key={i} className={`${s.messageRow} ${msg.role === "user" ? s.messageRowUser : ""}`}>
                  {msg.role === "assistant" && <div className={s.avatar}>🧠</div>}
                  <div className={s.bubbleWrapper}>
                    <div className={`${s.bubble} ${msg.role === "user" ? s.bubbleUser : s.bubbleAssistant}`}>
                      {msg.role === "user" ? (
                        <span>{msg.content}</span>
                      ) : msg.content === "" && loading ? (
                        <div className={s.dots}>
                          <div className={s.dot}/><div className={s.dot}/><div className={s.dot}/>
                        </div>
                      ) : (
                        <div className={s.md}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={s.inputArea}>
          <div className={s.inputRow}>
            <textarea
              ref={textareaRef}
              className={s.textarea}
              value={input}
              rows={1}
              placeholder="Preguntá sobre técnicas de estudio..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
            />
            <button
              className={s.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >
              <SendIcon />
            </button>
          </div>
          <p className={s.hint}>Shift + Enter para nueva línea</p>
        </div>
      </div>
    </div>
  );
}
