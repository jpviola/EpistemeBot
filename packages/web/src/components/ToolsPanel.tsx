"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import MermaidRenderer from "./tool-renderers/MermaidRenderer";
import TimelineRenderer from "./tool-renderers/TimelineRenderer";
import InfographicRenderer from "./tool-renderers/InfographicRenderer";
import StudyPlanRenderer from "./tool-renderers/StudyPlanRenderer";
import ExcalidrawTool from "./ExcalidrawTool";

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
    <div style={{ position: "fixed", right: 16, top: 64, width: 420, maxHeight: "75vh", background: "white", boxShadow: "0 6px 18px rgba(0,0,0,0.12)", borderRadius: 8, padding: 12, zIndex: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>Herramientas</strong>
        <div>
          <button onClick={() => onClose?.()} style={{ marginRight: 8 }}>Cerrar</button>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: "100%" }}>
          <option value="concept-map">Mapa conceptual (Mermaid)</option>
          <option value="timeline">Línea de tiempo (JSON)</option>
          <option value="infographic">Infografía (JSON)</option>
          <option value="study-plan">Plan de estudio (JSON)</option>
          <option value="svg-map">SVG (directo)</option>
          <option value="excalidraw">Canvas: Excalidraw</option>
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Prompt</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} style={{ width: "100%" }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={generate} disabled={loading}>{loading ? "Generando…" : "Generar"}</button>
        <button onClick={() => { setPrompt(""); setResult(null); }}>Limpiar</button>
      </div>

      <div style={{ maxHeight: 320, overflow: "auto", borderTop: "1px solid #eee", paddingTop: 8 }}>
        {result === null ? (
          <div style={{ color: "#666" }}>La salida aparecerá aquí.</div>
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
                    <h4>Attachments</h4>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {attachments.map((att) => (
                        <li key={att.id} style={{ marginBottom: 4 }}>
                          <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0070f3" }}>
                            {att.filename}
                          </a> ({new Date(att.createdAt).toLocaleString()})
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
