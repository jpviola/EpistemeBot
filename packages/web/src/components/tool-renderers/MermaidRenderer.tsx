"use client";

import { useEffect, useRef } from "react";

type Props = { code: string };

export default function MermaidRenderer({ code }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!ref.current) return;
      try {
        const mermaid = await import("mermaid");
        const m: any = mermaid.default ?? mermaid;
        try { m.initialize?.({ startOnLoad: false }); } catch {}

        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        // mermaidAPI.render may exist on m.mermaidAPI
        if (m.mermaidAPI && typeof m.mermaidAPI.render === "function") {
          m.mermaidAPI.render(id, code, (svgCode: string) => {
            if (cancelled) return;
            if (ref.current) ref.current.innerHTML = svgCode;
          });
        } else if (typeof m.render === "function") {
          // older/newer fallback
          m.render(id, code).then((svgCode: any) => {
            if (cancelled) return;
            if (ref.current) ref.current.innerHTML = svgCode;
          }).catch((e: any) => {
            if (ref.current) ref.current.textContent = String(e);
          });
        } else {
          ref.current.textContent = "Mermaid render API no disponible";
        }
      } catch (e: any) {
        if (ref.current) ref.current.textContent = "Error cargando mermaid: " + String(e?.message ?? e);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [code]);

  return <div style={{ overflow: "auto" }} ref={ref} />;
}
