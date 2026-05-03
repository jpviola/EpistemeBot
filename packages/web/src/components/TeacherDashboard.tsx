"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { getLevelInfo } from "@/lib/levels";
import s from "./TeacherDashboard.module.css";

interface InterestItem { id: string; label: string; count: number; }
interface StudentItem  { id: string; name: string | null; email: string; guestId: string | null; interests: string[]; createdAt: string; }

interface Stats {
  totalStudents:       number;
  totalRegistered:     number;
  totalSessions:       number;
  totalMessages:       number;
  topConcepts:         Array<{ label: string; count: number }>;
  leaderboard:         Array<{ guestId: string; nickname: string | null; xp: number; level: number; streak: number; totalSessions: number; totalMessages: number }>;
  recentSessions:      Array<{ id: string; guestId: string; title: string | null; level: string; updatedAt: string; _count: { messages: number } }>;
  interestDistribution: InterestItem[];
  studentList:         StudentItem[];
}

const LEVEL_LABELS: Record<string, string> = {
  secondary: "Secundario", cbc: "CBC", university: "Universitario", specialist: "Especialista",
};

const INTEREST_EMOJI: Record<string, string> = {
  filosofia: "🧠", psicologia: "🔬", hist_arg: "🇦🇷", hist_lat: "🌎",
  hist_univ: "🌍", literatura: "📚", arte: "🎨", cs_sociales: "👥",
};

type Tab = "overview" | "students";

export function TeacherDashboard({ teacherName }: { teacherName?: string | null }) {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>("overview");

  useEffect(() => {
    fetch("/api/teacher/stats")
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <Link href="/" className={s.logo}>Episteme<span className={s.logoAccent}>Bot</span></Link>
          <h1 className={s.title}>Dashboard docente</h1>
          {teacherName && <p className={s.sub}>Bienvenido, {teacherName}</p>}
        </div>
        <div className={s.headerRight}>
          <div className={s.tabs}>
            <button className={`${s.tabBtn} ${tab === "overview" ? s.tabActive : ""}`} onClick={() => setTab("overview")}>
              Resumen
            </button>
            <button className={`${s.tabBtn} ${tab === "students" ? s.tabActive : ""}`} onClick={() => setTab("students")}>
              Alumnos{stats ? ` (${stats.totalRegistered})` : ""}
            </button>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className={s.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {loading && <div className={s.loading}>Cargando estadísticas...</div>}

      {stats && tab === "overview" && (
        <>
          {/* KPIs */}
          <div className={s.kpis}>
            <div className={s.kpi}><span className={s.kpiVal}>{stats.totalStudents}</span><span className={s.kpiLbl}>Estudiantes activos</span></div>
            <div className={s.kpi}><span className={s.kpiVal}>{stats.totalRegistered}</span><span className={s.kpiLbl}>Cuentas registradas</span></div>
            <div className={s.kpi}><span className={s.kpiVal}>{stats.totalSessions}</span><span className={s.kpiLbl}>Sesiones</span></div>
            <div className={s.kpi}><span className={s.kpiVal}>{stats.totalMessages}</span><span className={s.kpiLbl}>Mensajes</span></div>
          </div>

          <div className={s.grid}>
            {/* Intereses declarados */}
            <div className={s.panel}>
              <div className={s.panelTitle}>Intereses declarados</div>
              {stats.interestDistribution.length === 0 && (
                <p className={s.empty}>Sin alumnos registrados todavía.</p>
              )}
              {stats.interestDistribution.map((item, i) => {
                const max = stats.interestDistribution[0]?.count ?? 1;
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.id} className={s.interestRow}>
                    <span className={s.interestEmoji}>{INTEREST_EMOJI[item.id] ?? "📌"}</span>
                    <div className={s.interestBarWrap}>
                      <div className={s.interestLabel}>{item.label}</div>
                      <div className={s.interestBarBg}>
                        <div className={s.interestBarFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className={s.interestCount}>{item.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Conceptos más vistos */}
            <div className={s.panel}>
              <div className={s.panelTitle}>Conceptos más explorados</div>
              {stats.topConcepts.length === 0 && <p className={s.empty}>Sin datos todavía.</p>}
              {stats.topConcepts.map((c, i) => (
                <div key={c.label} className={s.conceptRow}>
                  <span className={s.conceptPos}>#{i + 1}</span>
                  <span className={s.conceptLabel}>{c.label}</span>
                  <span className={s.conceptCount}>{c.count}×</span>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div className={s.panel}>
              <div className={s.panelTitle}>Ranking de estudiantes</div>
              {stats.leaderboard.length === 0 && <p className={s.empty}>Sin datos todavía.</p>}
              {stats.leaderboard.map((u, i) => {
                const li = getLevelInfo(u.xp);
                return (
                  <div key={u.guestId} className={s.studentRow}>
                    <span className={s.studentPos}>#{i + 1}</span>
                    <span className={s.studentEmoji}>{li.emoji}</span>
                    <span className={s.studentName}>{u.nickname ?? `Anónimo·${u.guestId.slice(0, 6)}`}</span>
                    <span className={s.studentXp}>{u.xp} XP</span>
                    <span className={s.studentStreak}>{u.streak > 0 ? `🔥${u.streak}` : ""}</span>
                  </div>
                );
              })}
            </div>

            {/* Sesiones recientes */}
            <div className={`${s.panel} ${s.panelFull}`}>
              <div className={s.panelTitle}>Sesiones recientes</div>
              {stats.recentSessions.length === 0 && <p className={s.empty}>Sin sesiones todavía.</p>}
              <div className={s.sessionTable}>
                {stats.recentSessions.map(sess => (
                  <div key={sess.id} className={s.sessionRow}>
                    <span className={s.sessTitle}>{sess.title ?? "Sin título"}</span>
                    <span className={s.sessLevel}>{LEVEL_LABELS[sess.level] ?? sess.level}</span>
                    <span className={s.sessMsg}>{sess._count.messages} msgs</span>
                    <span className={s.sessDate}>{new Date(sess.updatedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {stats && tab === "students" && (
        <div className={s.panel}>
          <div className={s.panelTitle}>Alumnos registrados</div>
          {stats.studentList.length === 0 && <p className={s.empty}>Sin alumnos registrados todavía.</p>}
          <div className={s.studentTable}>
            {stats.studentList.map(u => (
              <div key={u.id} className={s.studentCard}>
                <div className={s.studentCardTop}>
                  <span className={s.studentCardName}>{u.name ?? "Sin nombre"}</span>
                  <span className={s.studentCardEmail}>{u.email}</span>
                  <span className={s.studentCardDate}>
                    {new Date(u.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                {u.interests.length > 0 ? (
                  <div className={s.studentCardInterests}>
                    {u.interests.map(id => (
                      <span key={id} className={s.interestChip}>
                        {INTEREST_EMOJI[id] ?? "📌"} {id.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={s.studentCardNoInterests}>Sin intereses declarados</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
