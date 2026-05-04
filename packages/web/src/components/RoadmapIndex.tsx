"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROADMAPS } from "@/data/roadmaps";
import s from "./RoadmapIndex.module.css";

function loadPct(slug: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`roadmap_progress_${slug}`);
    const done = new Set(raw ? JSON.parse(raw) : []);
    return done.size;
  } catch { return 0; }
}

export function RoadmapIndex() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const c: Record<string, number> = {};
    ROADMAPS.forEach(r => { c[r.slug] = loadPct(r.slug); });
    setCounts(c);
  }, []);

  return (
    <div className={s.page}>
      <div className={s.container}>
        <Link href="/tutor" className={s.backBtn}>← Volver al tutor</Link>

        <div className={s.hero}>
          <h1 className={s.heroTitle}>🗺️ Trayectos de estudio</h1>
          <p className={s.heroSub}>
            Seguí rutas de aprendizaje estructuradas para cada materia. Marcá lo que ya sabés y usá el tutor para profundizar en lo que te falta.
          </p>
        </div>

        <div className={s.grid}>
          {ROADMAPS.map(r => {
            const total = r.nodes.filter(n => n.nodeType !== "section").length;
            const done  = counts[r.slug] ?? 0;
            const pct   = Math.round((done / total) * 100);

            return (
              <Link key={r.slug} href={`/roadmaps/${r.slug}`} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.cardEmoji}>{r.emoji}</span>
                  <div className={s.cardBadge} style={{ background: r.color }}>
                    {done > 0 ? `${pct}% completado` : "Sin empezar"}
                  </div>
                </div>
                <h2 className={s.cardTitle}>{r.title}</h2>
                <p className={s.cardDesc}>{r.description}</p>
                <div className={s.cardFooter}>
                  <div className={s.cardProgressBar}>
                    <div className={s.cardProgressFill} style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                  <span className={s.cardCount}>{total} temas</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
