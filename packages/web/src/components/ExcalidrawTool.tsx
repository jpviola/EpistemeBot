"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

// Dynamic import to avoid SSR problems
const Excalidraw = dynamic(() => import("@excalidraw/excalidraw"), { ssr: false });

type Props = {
  onSave?: () => void;
};

export default function ExcalidrawTool({ onSave }: Props) {
  const excalidrawRef = useRef<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const guestId = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;

  async function exportToJson() {
    try {
      const scene = await excalidrawRef.current?.getSceneElements();
      const appState = await excalidrawRef.current?.getAppState?.();
      const data = { elements: scene, appState };
      // autosave to server
      const res = await fetch("/api/excalidraw/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: (window as any)._sessionId ?? null, data, guestId }),
      });
      const j = await res.json();
      if (j.ok) {
        setMessage("Guardado en servidor: " + j.url);
        onSave?.();
      } else {
        setMessage("Error guardando: " + (j.error ?? "unknown"));
      }
    } catch (e) {
      setMessage("Error exportando JSON: " + String(e));
    }
  }

  async function exportToSvg() {
    try {
      const svg = await excalidrawRef.current?.getSvg?.({});
      const svgEl = svg?.querySelector("svg");
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      // upload SVG to storage endpoint
      const filename = `excalidraw-${Date.now()}.svg`;
      const upl = await fetch("/api/excalidraw/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content: svgStr, sessionId: (window as any)._sessionId ?? null, guestId }),
      });
      const uj = await upl.json();
      if (uj.ok) {
        setMessage("Subido: " + uj.url);
        onSave?.();
      } else {
        setMessage("Error subiendo SVG: " + (uj.error ?? "unknown"));
      }
    } catch (e) {
      setMessage("Error exportando SVG: " + String(e));
    }
  }

  async function importFromFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Excalidraw accepts scene elements + appState when calling updateScene
      if (excalidrawRef.current?.updateScene) {
        excalidrawRef.current.updateScene({ elements: parsed.elements ?? [], appState: parsed.appState ?? {} });
        setMessage("Importado al canvas");
      } else {
        setMessage("Editor no listo");
      }
    } catch (e) {
      setMessage("Error importando JSON: " + String(e));
    }
  }

  return (
    <div style={{ height: 420, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 8, padding: 8 }}>
        <button onClick={exportToJson}>Autosave JSON</button>
        <button onClick={exportToSvg}>Subir SVG</button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={e => importFromFile(e.target.files ? e.target.files[0] : null)} />
          <button onClick={() => fileInputRef.current?.click()}>Importar JSON</button>
        </label>
        <span style={{ color: "#666" }}>{message}</span>
      </div>
      <div style={{ flex: 1 }}>
        <Excalidraw ref={excalidrawRef} />
      </div>
    </div>
  );
}
