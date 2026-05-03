"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVELS } from "@/lib/levels";
import s from "./Recompensas.module.css";

interface Badge   { id: string; key: string; name: string; icon: string; description: string; xpReward: number; }
interface UserBadge { earnedAt: string; badge: Badge; }
interface XpEvent { id: string; amount: number; reason: string; category: string; createdAt: string; }
interface LevelInfo { level: number; title: string; emoji: string; xp: number; nextXp: number | null; progress: number; }
interface Profile {
  guestId: string; nickname: string | null; xp: number; level: number;
  streak: number; longestStreak: number; totalSessions: number; totalMessages: number;
  interestingQuestions: number; levelInfo: LevelInfo;
  badges: UserBadge[]; unearnedBadges: Badge[]; xpEvents: XpEvent[];
}

function getGuestId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("epistemebot_guest_id");
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    session: "Sesión", streak: "Racha", badge: "Badge", level_up: "Nivel", question: "Pregunta",
  };
  return map[cat] ?? cat;
}

export function Recompensas() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [tab, setTab] = useState<"overview" | "badges" | "history">("overview");

  useEffect(() => {
    const guestId = getGuestId();
    if (!guestId) { setLoading(false); return; }
    fetch(`/api/gamification/profile?guestId=${guestId}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setNickname(data.nickname ?? ""); })
      .finally(() => setLoading(false));
  }, []);

  async function saveNickname() {
    const guestId = getGuestId();
    if (!guestId || !nickname.trim()) return;
    await fetch("/api/gamification/nickname", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, nickname }),
    });
    setProfile(p => p ? { ...p, nickname } : p);
    setEditingNick(false);
  }

  if (loading) return <div className={s.loading}>Cargando perfil...</div>;
  if (!profile) return <div className={s.loading}>No hay perfil todavía. ¡Empezá a chatear!</div>;

  const li = profile.levelInfo;
  const earnedBadges = profile.badges.map(ub => ub.badge);

  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <Link href="/tutor" className={s.backLink}>← Volver al tutor</Link>
        <Link href="/ranking" className={s.rankLink}>🏆 Ranking</Link>
      </nav>

      {/* Card de nivel */}
      <div className={s.levelCard}>
        <div className={s.levelEmoji}>{li.emoji}</div>
        <div className={s.levelInfo}>
          <div className={s.levelTitle}>{li.title}</div>
          <div className={s.levelNum}>Nivel {li.level}</div>
          {li.nextXp && (
            <div className={s.xpBarWrap}>
              <div className={s.xpBar} style={{ width: `${li.progress}%` }} />
            </div>
          )}
          <div className={s.xpText}>
            {profile.xp} XP {li.nextXp ? `· ${li.nextXp - profile.xp} XP para nivel ${li.level + 1}` : "· ¡Nivel máximo!"}
          </div>
        </div>
        <div className={s.nicknameBlock}>
          {editingNick ? (
            <div className={s.nickEdit}>
              <input
                value={nickname}
                maxLength={30}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveNickname(); if (e.key === "Escape") setEditingNick(false); }}
                className={s.nickInput}
                placeholder="Tu nombre en el ranking"
                autoFocus
              />
              <button onClick={saveNickname} className={s.nickSave}>Guardar</button>
            </div>
          ) : (
            <button onClick={() => setEditingNick(true)} className={s.nickBtn}>
              {profile.nickname ? `✏️ ${profile.nickname}` : "✏️ Agregar nombre"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={s.stats}>
        <div className={s.stat}><span className={s.statVal}>{profile.streak}</span><span className={s.statLbl}>Racha actual 🔥</span></div>
        <div className={s.stat}><span className={s.statVal}>{profile.longestStreak}</span><span className={s.statLbl}>Mejor racha ⚡</span></div>
        <div className={s.stat}><span className={s.statVal}>{profile.totalSessions}</span><span className={s.statLbl}>Sesiones 📖</span></div>
        <div className={s.stat}><span className={s.statVal}>{earnedBadges.length}</span><span className={s.statLbl}>Badges 🎖️</span></div>
        <div className={s.stat}><span className={s.statVal}>{profile.interestingQuestions}</span><span className={s.statLbl}>Preguntas 🤔</span></div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        {(["overview", "badges", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`${s.tab} ${tab === t ? s.tabActive : ""}`}>
            {t === "overview" ? "Resumen" : t === "badges" ? "Badges" : "Historial XP"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className={s.overview}>
          <div className={s.roadmapTitle}>Camino al conocimiento</div>
          <div className={s.roadmap}>
            {LEVELS.map(l => (
              <div key={l.level} className={`${s.roadmapStep} ${profile.level >= l.level ? s.roadmapDone : ""} ${profile.level === l.level ? s.roadmapCurrent : ""}`}>
                <span className={s.roadmapEmoji}>{l.emoji}</span>
                <span className={s.roadmapLvl}>Nv.{l.level}</span>
                <span className={s.roadmapName}>{l.title}</span>
                <span className={s.roadmapXp}>{l.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "badges" && (
        <div className={s.badgeGrid}>
          {earnedBadges.map(b => (
            <div key={b.id} className={s.badgeCard}>
              <div className={s.badgeIcon}>{b.icon}</div>
              <div className={s.badgeName}>{b.name}</div>
              <div className={s.badgeDesc}>{b.description}</div>
              <div className={s.badgeXp}>+{b.xpReward} XP</div>
            </div>
          ))}
          {profile.unearnedBadges.map(b => (
            <div key={b.id} className={`${s.badgeCard} ${s.badgeLocked}`}>
              <div className={s.badgeIcon}>🔒</div>
              <div className={s.badgeName}>{b.name}</div>
              <div className={s.badgeDesc}>{b.description}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className={s.history}>
          {profile.xpEvents.length === 0 && <p className={s.empty}>Todavía no ganaste XP.</p>}
          {profile.xpEvents.map(ev => (
            <div key={ev.id} className={s.xpRow}>
              <span className={s.xpCat}>{categoryLabel(ev.category)}</span>
              <span className={s.xpReason}>{ev.reason}</span>
              <span className={s.xpAmt}>+{ev.amount} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
