"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import MermaidRenderer from "./tool-renderers/MermaidRenderer";
import TimelineRenderer from "./tool-renderers/TimelineRenderer";
import InfographicRenderer from "./tool-renderers/InfographicRenderer";
import StudyPlanRenderer from "./tool-renderers/StudyPlanRenderer";
import ExcalidrawTool from "./ExcalidrawTool";

const STUDY_TECHNIQUES = {
  "flip-classroom": {
    title: "Aula invertida (Flip Classroom)",
    description: "El aula invertida es una metodología pedagógica en la que el aprendizaje se invierte: los estudiantes estudian el material teórico en casa (videos, lecturas) y en clase se dedican a actividades prácticas, discusiones y resolución de problemas. Esto permite un uso más eficiente del tiempo en clase y fomenta el aprendizaje activo."
  },
  "flashcards": {
    title: "Tarjetas de memoria (Flashcards)",
    description: "Aplicaciones como Anki o Quizlet te ayudan a repasar conceptos clave en intervalos estratégicos. El spacing effect funciona mejor cuando combinas el estudio espaciado con flashcards: crea tarjetas con preguntas en un lado y respuestas en el otro, y repasa en sesiones cortas pero frecuentes."
  },
  "active-study": {
    title: "Técnicas activas de estudio",
    description: "No se trata solo de releer los apuntes como un zombi. Para que el spacing effect funcione de verdad, combina el estudio espaciado con métodos efectivos como:\n\n🎯 Técnica de recuperación: En lugar de leer pasivamente, trata de recordar la información sin mirar los apuntes. Puedes hacerte preguntas o intentar explicar el tema en voz alta.\n\n🎯 Tarjetas de memoria (flashcards): Aplicaciones como Anki o Quizlet te ayudan a repasar conceptos clave en intervalos estratégicos.\n\n🎯 Enseñar a otra persona: Explicar lo que has aprendido a un compañero de clase (o incluso a tu gato) refuerza tu comprensión y memoria."
  }
};

type Props = {
  open?: boolean;
  onClose?: () => void;
  sessionId?: string;
  guestId?: string;
};

export default function ToolsPanel({ open = true, onClose, sessionId, guestId }: Props) {
  const [type, setType] = useState<string>("concept-map");
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [studyTechnique, setStudyTechnique] = useState<string>("flip-classroom");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Link copiado al portapapeles");
    } catch (e) {
      alert("Error copiando: " + text);
    }
  };

  const fetchAttachments = async () => {
    if (!sessionId) return;
    try {
      const params = new URLSearchParams({ sessionId });
      if (guestId) params.set('guestId', guestId);
      const res = await fetch(`/api/excalidraw/attachments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (e) {
      console.error('Failed to fetch attachments', e);
    }
  };

  useEffect(() => {
    if (type === 'canvas' && sessionId) {
      fetchAttachments();
    }
  }, [type, sessionId]);

  useEffect(() => {
    if (open) {
      // panel opened metric
      fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "tools.panel.open", value: 1, tags: [`type:${type}`] }),
      }).catch(() => {});
      try { if ((window as any).Sentry) (window as any).Sentry.addBreadcrumb({ category: 'ui', message: 'tools.panel.open', level: 'info' }); } catch {}
    }
  }, [open]);

  if (!open) return null;

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    const start = Date.now();
    // emit metric: start
    fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "tools.generate.start", value: 1, tags: [`type:${type}`] }),
    }).catch(() => {});
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt }),
      });
      const json = await res.json();
      if (!json.ok) {
        // metric: failure
        fetch("/api/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tools.generate.failure", value: 1, tags: [`type:${type}`] }) }).catch(() => {});
        Sentry.captureMessage(`tools.generate.failure type=${type} error=${json.error}`);
        setResult(`Error: ${json.error ?? "unknown"}`);
      } else {
        // success metric with timing
        fetch("/api/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tools.generate.success", value: 1, tags: [`type:${type}`], timing: Date.now() - start }) }).catch(() => {});
        setFormat(json.format ?? "text");
        setResult(json.content ?? "");
      }
    } catch (err) {
      // capture exception
      try { Sentry.captureException(err); } catch {}
      fetch("/api/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "tools.generate.exception", value: 1, tags: [`type:${type}`] }) }).catch(() => {});
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      style={{ position: "fixed", right: 16, top: 64, width: 420, maxHeight: "75vh", background: "white", boxShadow: "0 6px 18px rgba(0,0,0,0.12)", borderRadius: 8, padding: 12, zIndex: 200 }}
      role="dialog"
      aria-labelledby="tools-panel-title"
      aria-modal="true"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong id="tools-panel-title">Herramientas</strong>
        <div>
          <button onClick={() => onClose?.()} style={{ marginRight: 8 }} aria-label="Cerrar panel de herramientas">
            Cerrar
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label htmlFor="tool-type-select" style={{ display: "block", marginBottom: 6 }}>Tipo</label>
        <select 
          id="tool-type-select"
          value={type} 
          onChange={(e) => setType(e.target.value)} 
          style={{ width: "100%" }}
          aria-describedby="tool-type-description"
        >
          <option value="concept-map">Mapa conceptual (Mermaid)</option>
          <option value="timeline">Línea de tiempo (JSON)</option>
          <option value="infographic">Infografía (JSON)</option>
          <option value="study-plan">Plan de estudio (JSON)</option>
          <option value="svg-map">SVG (directo)</option>
          <option value="excalidraw">Canvas: Excalidraw</option>
          <option value="study-techniques">Técnicas de estudio</option>
        </select>
        <div id="tool-type-description" style={{ fontSize: "0.9em", color: "#666", marginTop: 4 }}>
          Selecciona el tipo de herramienta para generar contenido visual.
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label htmlFor="tool-prompt-textarea" style={{ display: "block", marginBottom: 6 }}>Prompt</label>
        <textarea 
          id="tool-prompt-textarea"
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          rows={5} 
          style={{ width: "100%" }}
          aria-describedby="prompt-description"
        />
        <div id="prompt-description" style={{ fontSize: "0.9em", color: "#666", marginTop: 4 }}>
          Describe lo que quieres generar.
        </div>
      </div>

      {type === "study-techniques" && (
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="study-technique-select" style={{ display: "block", marginBottom: 6 }}>Técnica</label>
          <select 
            id="study-technique-select"
            value={studyTechnique} 
            onChange={(e) => setStudyTechnique(e.target.value)} 
            style={{ width: "100%" }}
          >
            <option value="flip-classroom">Aula invertida (Flip Classroom)</option>
            <option value="flashcards">Tarjetas de memoria (Flashcards)</option>
            <option value="active-study">Técnicas activas de estudio</option>
          </select>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={generate} disabled={loading} aria-label={loading ? "Generando contenido" : "Generar contenido"}>
          {loading ? "Generando…" : "Generar"}
        </button>
        <button onClick={() => { setPrompt(""); setResult(null); setStudyTechnique("retrieval"); }} aria-label="Limpiar prompt y resultado">
          Limpiar
        </button>
      </div>

      <div style={{ maxHeight: 320, overflow: "auto", borderTop: "1px solid #eee", paddingTop: 8 }}>
        {result === null ? (
          type === "study-techniques" ? (
            <div>
              <h4>{STUDY_TECHNIQUES[studyTechnique as keyof typeof STUDY_TECHNIQUES]?.title}</h4>
              <p style={{ whiteSpace: "pre-line" }}>{STUDY_TECHNIQUES[studyTechnique as keyof typeof STUDY_TECHNIQUES]?.description}</p>
            </div>
          ) : (
            <div style={{ color: "#666" }}>La salida aparecerá aquí.</div>
          )
        ) : (
          <div>
            <div style={{ marginBottom: 6, color: "#333" }}>Formato: {format}</div>
            {type === "excalidraw" ? (
              <div>
                <div style={{ height: 480 }}>
                  <ExcalidrawTool onSave={fetchAttachments} />
                </div>
                {attachments.length > 0 && (
                  <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 8 }}>
                    <h4 id="attachments-heading">Attachments</h4>
                    <ul role="list" aria-labelledby="attachments-heading" style={{ listStyle: "none", padding: 0 }}>
                      {attachments.map((att) => (
                        <li key={att.id} role="listitem" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0070f3" }} aria-label={`Descargar ${att.filename} creado el ${new Date(att.createdAt).toLocaleString()}`}>
                            {att.filename}
                          </a>
                          <button onClick={() => copyToClipboard(att.url)} aria-label={`Copiar link de ${att.filename}`} style={{ fontSize: "0.8em" }}>
                            📋 Compartir
                          </button>
                          <span style={{ fontSize: "0.8em", color: "#666" }}>({new Date(att.createdAt).toLocaleString()})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : format === "mermaid" ? (
              <div style={{ border: "1px solid #f0f0f0", padding: 8 }}>
                <MermaidRenderer code={result} />
              </div>
            ) : format === "json" && type === "timeline" ? (
              <TimelineRenderer json={result} />
            ) : format === "json" && type === "infographic" ? (
              <InfographicRenderer json={result} />
            ) : format === "json" && type === "study-plan" ? (
              <StudyPlanRenderer json={result} />
            ) : format === "svg" ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : format === "json" ? (
              <pre style={{ whiteSpace: "pre-wrap" }}>{(() => {
                try { return JSON.stringify(JSON.parse(result), null, 2); } catch { return result; }
              })()}</pre>
            ) : (
              <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
