"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import s from "./PromptingCoach.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TOPICS = [
  ["🏗️", "Anatomía de un prompt",      "Explicame la anatomía de un prompt: System, User y Assistant"],
  ["⚙️", "Rol System",                  "¿Qué es el rol System y cómo se usa? Mostrame un ejemplo"],
  ["💬", "Rol User",                    "¿Cómo estructuro bien un mensaje de usuario? Intent, Context, Constraint"],
  ["🤖", "Rol Assistant",               "¿Cómo puedo usar el rol Assistant para entrenar al modelo?"],
  ["🔁", "Few-Shot Prompting",          "Enseñame few-shot prompting con un ejemplo práctico"],
  ["🔄", "Feedback Loop",               "¿Qué es el feedback loop y por qué importa?"],
  ["🎯", "Chain of Thought",            "Explicame Chain of Thought y cuándo usarlo"],
  ["🛠️", "Ejercicio práctico",          "Quiero practicar: dame un ejercicio para escribir un prompt"],
];

const SUGGESTIONS = [
  "¿Cuál es la diferencia entre un prompt bueno y uno malo?",
  "Analizá este prompt y decime qué mejorar: 'Escribí algo sobre marketing'",
  "¿Cómo le pido a un modelo que responda siempre en JSON?",
  "Enseñame a asignarle un rol específico a un modelo",
  "¿Qué significa que el modelo 'alucine' y cómo lo evito?",
  "¿Cómo adapto un prompt para Claude vs GPT?",
];

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

export function PromptingCoach() {
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
      const res = await fetch("/api/prompting-coach", {
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
          <div className={s.coachBadge}>🤖 Prompt Engineering</div>
          <p className={s.coachDesc}>
            Aprendé a escribir prompts efectivos: roles, contexto, constraints, few-shot y más.
          </p>
        </div>

        <div className={s.topicsList}>
          <span className={s.topicsTitle}>Temas</span>
          {TOPICS.map(([emoji, name, prompt]) => (
            <button
              key={name}
              className={s.topicItem}
              onClick={() => sendMessage(prompt)}
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
          <div className={s.headerTitle}>🤖 Coach de Prompt Engineering</div>
          <div className={s.headerSub}>
            System · User · Assistant · Few-Shot · Chain of Thought · Constraints
          </div>
        </header>

        <div className={s.messages}>
          {messages.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>🤖</div>
              <p className={s.emptyTitle}>¿Qué querés aprender sobre prompting?</p>
              <p className={s.emptySub}>Elegí un tema o hacé tu pregunta</p>
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
                  {msg.role === "assistant" && <div className={s.avatar}>🤖</div>}
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
              placeholder="Preguntá sobre prompt engineering o pegá un prompt para analizarlo..."
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
          <p className={s.hint}>Shift + Enter para nueva línea · Pegá un prompt para que lo analice</p>
        </div>
      </div>
    </div>
  );
}
