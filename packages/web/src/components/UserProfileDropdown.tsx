"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { getLevelInfo } from "@/lib/levels";
import s from "./UserProfileDropdown.module.css";

interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  totalSessions: number;
  badges: Array<{ badge: { icon: string; name: string } }>;
  levelInfo: { emoji: string; title: string; nextXp: number | null; progress: number };
}

interface UserProfileDropdownProps {
  guestId: string;
}

export function UserProfileDropdown({ guestId }: UserProfileDropdownProps) {
  const { data: session } = useSession();
  const [open,  setOpen]  = useState(false);
  const [gami,  setGami]  = useState<GamificationData | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/gamification/profile?guestId=${guestId}`)
      .then(r => r.json())
      .then((d: GamificationData) => setGami(d))
      .catch(() => null);
  }, [guestId]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile")
      .then(r => r.json())
      .then((d: { avatarUrl?: string }) => { if (d.avatarUrl) setAvatar(d.avatarUrl); })
      .catch(() => null);
  }, [session]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const levelInfo = gami ? getLevelInfo(gami.xp) : null;
  const displayName = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Invitado";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className={s.root} ref={ref}>
      <button className={s.trigger} onClick={() => setOpen(o => !o)} aria-label="Perfil de usuario">
        <div className={s.avatar}>
          {avatar
            ? <img src={avatar} alt="avatar" className={s.avatarImg} />
            : <span className={s.avatarInitials}>{initials}</span>}
        </div>
        {session?.user && (
          <span className={s.triggerName}>{displayName}</span>
        )}
        <span className={`${s.chevron} ${open ? s.chevronOpen : ""}`}>▾</span>
      </button>

      {open && (
        <div className={s.panel}>
          {/* Header */}
          <div className={s.panelHeader}>
            <div className={s.panelAvatar}>
              {avatar
                ? <img src={avatar} alt="avatar" className={s.avatarImg} />
                : <span className={s.panelAvatarInitials}>{initials}</span>}
            </div>
            <div className={s.panelUserInfo}>
              <span className={s.panelName}>{displayName}</span>
              {session?.user?.email && (
                <span className={s.panelEmail}>{session.user.email}</span>
              )}
            </div>
          </div>

          {/* Gamification */}
          {gami && levelInfo && (
            <div className={s.gamiSection}>
              <div className={s.gamiLevel}>
                <span className={s.gamiEmoji}>{levelInfo.emoji}</span>
                <div>
                  <div className={s.gamiTitle}>{levelInfo.title}</div>
                  <div className={s.gamiSub}>Nivel {gami.level} · {gami.xp} XP</div>
                </div>
              </div>

              <div className={s.progressBar}>
                <div className={s.progressFill} style={{ width: `${levelInfo.progress}%` }} />
              </div>
              {levelInfo.nextXp && (
                <div className={s.progressLabel}>
                  {gami.xp} / {levelInfo.nextXp} XP para el siguiente nivel
                </div>
              )}

              <div className={s.gamiStats}>
                <div className={s.gamiStat}>
                  <span className={s.gamiStatVal}>🔥 {gami.streak}</span>
                  <span className={s.gamiStatKey}>racha</span>
                </div>
                <div className={s.gamiStat}>
                  <span className={s.gamiStatVal}>💬 {gami.totalSessions}</span>
                  <span className={s.gamiStatKey}>sesiones</span>
                </div>
                <div className={s.gamiStat}>
                  <span className={s.gamiStatVal}>🏅 {gami.badges?.length ?? 0}</span>
                  <span className={s.gamiStatKey}>badges</span>
                </div>
              </div>

              {gami.badges?.length > 0 && (
                <div className={s.badgeRow}>
                  {gami.badges.slice(0, 5).map((ub, i) => (
                    <span key={i} title={ub.badge.name} className={s.badgeChip}>
                      {ub.badge.icon}
                    </span>
                  ))}
                  {gami.badges.length > 5 && (
                    <span className={s.badgeMore}>+{gami.badges.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={s.actions}>
            {session?.user ? (
              <>
                <Link href="/perfil" className={s.actionBtn} onClick={() => setOpen(false)}>
                  👤 Ver perfil completo
                </Link>
                <Link href="/recompensas" className={s.actionBtn} onClick={() => setOpen(false)}>
                  🏆 Mis recompensas
                </Link>
                <button className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={() => signOut()}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/perfil" className={s.actionBtn} onClick={() => setOpen(false)}>
                  👤 Mi progreso
                </Link>
                <Link href="/login" className={s.actionBtnPrimary} onClick={() => setOpen(false)}>
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
