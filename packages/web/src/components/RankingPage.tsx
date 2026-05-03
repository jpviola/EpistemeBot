"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLevelInfo } from "@/lib/levels";
import s from "./RankingPage.module.css";

interface RankEntry {
  guestId: string; nickname: string | null; xp: number; level: number;
  streak: number; totalSessions: number;
  badges: Array<{ badge: { icon: string } }>;
}

function displayName(entry: RankEntry, myGuestId: string | null) {
  const base = entry.nickname ?? `Anónimo·${entry.guestId.slice(0, 6)}`;
  return entry.guestId === myGuestId ? `${base} (vos)` : base;
}

function getGuestId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("epistemebot_guest_id");
}

export function RankingPage() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [myId, setMyId]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMyId(getGuestId());
    fetch("/api/gamification/ranking")
      .then(r => r.json())
      .then(setRanking)
      .finally(() => setLoading(false));
  }, []);

  const podium = ranking.slice(0, 3);
  const rest   = ranking.slice(3);

  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <Link href="/tutor" className={s.back}>← Tutor</Link>
        <Link href="/recompensas" className={s.back}>🎖️ Mis recompensas</Link>
      </nav>

      <h1 className={s.title}>Ranking</h1>
      <p className={s.sub}>Los filósofos más dedicados de EpistemeBot</p>

      {loading && <div className={s.loading}>Cargando...</div>}

      {!loading && ranking.length === 0 && (
        <div className={s.empty}>Todavía no hay filósofos en el ranking.<br />¡Sé el primero!</div>
      )}

      {/* Podio */}
      {podium.length > 0 && (
        <div className={s.podium}>
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((entry, i) => {
            const pos = entry === podium[0] ? 1 : entry === podium[1] ? 2 : 3;
            const li  = getLevelInfo(entry.xp);
            return (
              <div key={entry.guestId} className={`${s.podiumItem} ${s[`pos${pos}`]}`}>
                <div className={s.podiumEmoji}>{li.emoji}</div>
                <div className={s.podiumPos}>{pos === 1 ? "🥇" : pos === 2 ? "🥈" : "🥉"}</div>
                <div className={s.podiumName}>{displayName(entry, myId)}</div>
                <div className={s.podiumXp}>{entry.xp} XP</div>
                <div className={s.podiumLevel}>Nv.{entry.level} · {li.title}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resto del ranking */}
      {rest.length > 0 && (
        <div className={s.table}>
          {rest.map((entry, i) => {
            const li   = getLevelInfo(entry.xp);
            const isMe = entry.guestId === myId;
            return (
              <div key={entry.guestId} className={`${s.row} ${isMe ? s.rowMe : ""}`}>
                <span className={s.rowPos}>#{i + 4}</span>
                <span className={s.rowEmoji}>{li.emoji}</span>
                <span className={s.rowName}>{displayName(entry, myId)}</span>
                <span className={s.rowBadges}>
                  {entry.badges.slice(0, 3).map((ub, j) => (
                    <span key={j}>{ub.badge.icon}</span>
                  ))}
                </span>
                <span className={s.rowStreak}>{entry.streak > 0 ? `🔥${entry.streak}` : ""}</span>
                <span className={s.rowXp}>{entry.xp} XP</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
