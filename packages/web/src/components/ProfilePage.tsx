"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getLevelInfo } from "@/lib/levels";
import s from "./ProfilePage.module.css";

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  school: string | null;
  bio: string | null;
  interests: string[];
  socialLinks: SocialLinks;
}

interface GamiProfile {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalSessions: number;
  totalMessages: number;
  interestingQuestions: number;
  nickname: string | null;
  badges: Array<{ badge: { icon: string; name: string; description: string; xpReward: number } }>;
  levelInfo: { emoji: string; title: string; nextXp: number | null; progress: number };
}

const INTEREST_OPTIONS = [
  "Filosofía", "Historia", "Literatura", "Psicología", "Sociología",
  "Política", "Arte", "Economía", "Antropología", "Ética",
];

export function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [gami,    setGami]      = useState<GamiProfile | null>(null);
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", school: "", bio: "",
    interests: [] as string[],
    socialLinks: { twitter: "", instagram: "", linkedin: "", github: "" } as SocialLinks,
  });

  const guestId = typeof window !== "undefined"
    ? (localStorage.getItem("epistemebot_guest_id") ?? localStorage.getItem("guestId") ?? "")
    : "";

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const data: UserProfile = await res.json();
    setProfile(data);
    setForm({
      name: data.name ?? "",
      school: data.school ?? "",
      bio: data.bio ?? "",
      interests: data.interests ?? [],
      socialLinks: {
        twitter: data.socialLinks?.twitter ?? "",
        instagram: data.socialLinks?.instagram ?? "",
        linkedin: data.socialLinks?.linkedin ?? "",
        github: data.socialLinks?.github ?? "",
      },
    });
  }, [session]);

  const loadGami = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(`/api/gamification/profile?guestId=${guestId}`);
    if (res.ok) setGami(await res.json());
  }, [guestId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadGami(); }, [loadGami]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          school: form.school,
          bio: form.bio,
          interests: form.interests,
          socialLinks: form.socialLinks,
        }),
      });
      if (res.ok) {
        const updated: UserProfile = await res.json();
        setProfile(updated);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        const res = await fetch("/api/profile/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        if (res.ok) {
          const { avatarUrl } = await res.json() as { avatarUrl: string };
          setProfile(p => p ? { ...p, avatarUrl } : p);
        }
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function toggleInterest(interest: string) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest],
    }));
  }

  const levelInfo = gami ? getLevelInfo(gami.xp) : null;
  const displayName = profile?.name ?? session?.user?.email?.split("@")[0] ?? "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (status === "loading") return <div className={s.loading}>Cargando...</div>;

  return (
    <div className={s.page}>
      <div className={s.container}>

        {/* Back */}
        <Link href="/tutor" className={s.backLink}>← Volver al tutor</Link>

        {/* Hero card */}
        <div className={s.heroCard}>
          <div className={s.heroLeft}>
            <div className={s.avatarWrap}>
              <div className={s.avatarCircle}>
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="avatar" className={s.avatarImg} />
                  : <span className={s.avatarInitials}>{initials}</span>}
              </div>
              {session?.user && (
                <>
                  <button
                    className={s.avatarUploadBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarUploading}
                    title="Cambiar foto"
                  >
                    {avatarUploading ? "⏳" : "📷"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className={s.fileInput}
                    onChange={handleAvatarFile}
                  />
                </>
              )}
            </div>

            <div className={s.heroInfo}>
              <h1 className={s.heroName}>{displayName}</h1>
              {profile?.school && <p className={s.heroSchool}>🏫 {profile.school}</p>}
              {profile?.bio && <p className={s.heroBio}>{profile.bio}</p>}
              {profile?.email && <p className={s.heroEmail}>{profile.email}</p>}

              {/* Social links */}
              {profile?.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                <div className={s.socialRow}>
                  {profile.socialLinks.twitter && (
                    <a href={`https://twitter.com/${profile.socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" className={s.socialLink}>
                      𝕏 {profile.socialLinks.twitter}
                    </a>
                  )}
                  {profile.socialLinks.instagram && (
                    <a href={`https://instagram.com/${profile.socialLinks.instagram.replace("@","")}`} target="_blank" rel="noreferrer" className={s.socialLink}>
                      📸 {profile.socialLinks.instagram}
                    </a>
                  )}
                  {profile.socialLinks.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className={s.socialLink}>
                      💼 LinkedIn
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a href={`https://github.com/${profile.socialLinks.github.replace("@","")}`} target="_blank" rel="noreferrer" className={s.socialLink}>
                      🐙 {profile.socialLinks.github}
                    </a>
                  )}
                </div>
              )}

              {/* Interests */}
              {profile?.interests?.length > 0 && (
                <div className={s.interestRow}>
                  {profile.interests.map(i => (
                    <span key={i} className={s.interestChip}>{i}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {session?.user && (
            <button className={s.editBtn} onClick={() => setEditing(e => !e)}>
              {editing ? "✕ Cancelar" : "✏️ Editar"}
            </button>
          )}
        </div>

        {/* Edit form */}
        {editing && session?.user && (
          <div className={s.editCard}>
            <h2 className={s.editTitle}>Editar perfil</h2>

            <div className={s.formGrid}>
              <div className={s.formGroup}>
                <label className={s.label}>Nombre</label>
                <input className={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tu nombre completo" />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>Escuela / Universidad</label>
                <input className={s.input} value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} placeholder="UBA, CONICET, Secundario N° 12..." />
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Bio</label>
              <textarea className={s.textarea} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Contá algo sobre vos..." rows={3} />
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Intereses</label>
              <div className={s.interestPicker}>
                {INTEREST_OPTIONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    className={`${s.interestOption} ${form.interests.includes(i) ? s.interestSelected : ""}`}
                    onClick={() => toggleInterest(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Redes sociales</label>
              <div className={s.socialGrid}>
                <div className={s.socialInputWrap}>
                  <span className={s.socialPrefix}>𝕏</span>
                  <input className={s.socialInput} value={form.socialLinks.twitter ?? ""} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} placeholder="@usuario" />
                </div>
                <div className={s.socialInputWrap}>
                  <span className={s.socialPrefix}>📸</span>
                  <input className={s.socialInput} value={form.socialLinks.instagram ?? ""} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} placeholder="@usuario" />
                </div>
                <div className={s.socialInputWrap}>
                  <span className={s.socialPrefix}>💼</span>
                  <input className={s.socialInput} value={form.socialLinks.linkedin ?? ""} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, linkedin: e.target.value } }))} placeholder="URL de LinkedIn" />
                </div>
                <div className={s.socialInputWrap}>
                  <span className={s.socialPrefix}>🐙</span>
                  <input className={s.socialInput} value={form.socialLinks.github ?? ""} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, github: e.target.value } }))} placeholder="@usuario" />
                </div>
              </div>
            </div>

            <div className={s.formActions}>
              <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}

        {/* Gamification stats */}
        {gami && levelInfo && (
          <div className={s.gamiCard}>
            <div className={s.gamiHeader}>
              <span className={s.gamiEmoji}>{levelInfo.emoji}</span>
              <div>
                <h2 className={s.gamiTitle}>{levelInfo.title}</h2>
                <p className={s.gamiSub}>Nivel {gami.level} · {gami.xp} XP totales</p>
              </div>
            </div>

            <div className={s.progressWrap}>
              <div className={s.progressBar}>
                <div className={s.progressFill} style={{ width: `${levelInfo.progress}%` }} />
              </div>
              <span className={s.progressLabel}>
                {levelInfo.nextXp
                  ? `${gami.xp} / ${levelInfo.nextXp} XP`
                  : "Nivel máximo alcanzado 🎉"}
              </span>
            </div>

            <div className={s.statsGrid}>
              {[
                { label: "Racha actual",      val: `🔥 ${gami.streak} días` },
                { label: "Mejor racha",       val: `⚡ ${gami.longestStreak} días` },
                { label: "Sesiones",          val: `💬 ${gami.totalSessions}` },
                { label: "Preguntas",         val: `❓ ${gami.totalMessages}` },
                { label: "Preguntas notables",val: `✨ ${gami.interestingQuestions}` },
                { label: "Badges ganados",    val: `🏅 ${gami.badges?.length ?? 0}` },
              ].map(({ label, val }) => (
                <div key={label} className={s.statCard}>
                  <span className={s.statVal}>{val}</span>
                  <span className={s.statLabel}>{label}</span>
                </div>
              ))}
            </div>

            {gami.badges?.length > 0 && (
              <div className={s.badgesSection}>
                <h3 className={s.badgesSectionTitle}>Badges obtenidos</h3>
                <div className={s.badgesGrid}>
                  {gami.badges.map((ub, i) => (
                    <div key={i} className={s.badgeCard} title={ub.badge.description}>
                      <span className={s.badgeIcon}>{ub.badge.icon}</span>
                      <span className={s.badgeName}>{ub.badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!session?.user && (
          <div className={s.guestBanner}>
            <p>Estás en modo invitado. <Link href="/login" className={s.guestLink}>Iniciá sesión</Link> para guardar tu perfil y sincronizar tu progreso entre dispositivos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
