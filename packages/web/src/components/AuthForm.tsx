"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import s from "./AuthForm.module.css";

interface Props { mode: "login" | "register"; }

type Step = "credentials" | "role" | "interests";
type Role = "student" | "teacher";

const INTEREST_OPTIONS = [
  { id: "filosofia",     label: "Filosofía",              emoji: "🧠" },
  { id: "psicologia",    label: "Psicología",             emoji: "🔬" },
  { id: "hist_arg",      label: "Historia Argentina",     emoji: "🇦🇷" },
  { id: "hist_lat",      label: "Historia Latinoamericana", emoji: "🌎" },
  { id: "hist_univ",     label: "Historia Universal",     emoji: "🌍" },
  { id: "literatura",    label: "Literatura",             emoji: "📚" },
  { id: "arte",          label: "Arte",                   emoji: "🎨" },
  { id: "cs_sociales",   label: "Ciencias Sociales",      emoji: "👥" },
];

export function AuthForm({ mode }: Props) {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get("redirect") ?? "/tutor";

  // Step state (only relevant for register)
  const [step, setStep]           = useState<Step>("credentials");

  // Credentials
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");

  // Role
  const [role,        setRole]        = useState<Role>("student");
  const [teacherCode, setTeacherCode] = useState("");

  // Interests (students)
  const [interests, setInterests] = useState<string[]>([]);

  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function getGuestId() {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem("epistemebot_guest_id") ?? undefined;
  }

  function toggleInterest(id: string) {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      await doLogin();
    } else {
      setStep("role");
    }
  }

  async function handleRoleNext() {
    if (role === "student") {
      setStep("interests");
    } else {
      await doRegister();
    }
  }

  async function doRegister() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email, password, name,
          role, teacherCode: role === "teacher" ? teacherCode : undefined,
          interests: role === "student" ? interests : undefined,
          guestId: getGuestId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      await doLogin();
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
      setLoading(false);
    }
  }

  async function doLogin() {
    setError(""); setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { setError("Email o contraseña incorrectos"); return; }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step indicator ─────────────────────────────────────────────

  const steps: Step[] = ["credentials", "role", "interests"];
  const stepIndex = steps.indexOf(step);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={s.page}>
      <div className={s.card}>
        <Link href="/" className={s.logo}>
          Episteme<span className={s.logoAccent}>Bot</span>
        </Link>

        {/* Step indicator (register only) */}
        {mode === "register" && (
          <div className={s.steps}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`${s.stepDot} ${i <= stepIndex ? s.stepDotActive : ""} ${i < stepIndex ? s.stepDotDone : ""}`}
              />
            ))}
          </div>
        )}

        {/* ── STEP 1: Credentials ─────────────────────────────── */}
        {(step === "credentials") && (
          <>
            <h1 className={s.title}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
            <form onSubmit={handleCredentialsSubmit} className={s.form}>
              {mode === "register" && (
                <label className={s.field}>
                  <span>Nombre (opcional)</span>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className={s.input} placeholder="Tu nombre" autoComplete="name" />
                </label>
              )}
              <label className={s.field}>
                <span>Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={s.input} placeholder="tu@email.com" required autoComplete="email" />
              </label>
              <label className={s.field}>
                <span>Contraseña</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className={s.input}
                  placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
                  required minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </label>
              {error && <p className={s.error}>{error}</p>}
              <button type="submit" disabled={loading} className={s.btn}>
                {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Continuar →"}
              </button>
            </form>
            <p className={s.switch}>
              {mode === "login" ? (
                <>¿No tenés cuenta? <Link href="/register">Registrate</Link></>
              ) : (
                <>¿Ya tenés cuenta? <Link href="/login">Iniciá sesión</Link></>
              )}
            </p>
            {mode === "register" && (
              <p className={s.note}>Tu historial de conversaciones se vinculará automáticamente.</p>
            )}
          </>
        )}

        {/* ── STEP 2: Rol ─────────────────────────────────────── */}
        {step === "role" && (
          <>
            <h1 className={s.title}>¿Cómo vas a usar EpistemeBot?</h1>
            <p className={s.subtitle}>Esto personaliza tu experiencia</p>

            <div className={s.roleCards}>
              <button
                type="button"
                className={`${s.roleCard} ${role === "student" ? s.roleCardActive : ""}`}
                onClick={() => setRole("student")}
              >
                <span className={s.roleEmoji}>🎓</span>
                <span className={s.roleLabel}>Soy estudiante</span>
                <span className={s.roleDesc}>Quiero aprender con el tutor</span>
              </button>
              <button
                type="button"
                className={`${s.roleCard} ${role === "teacher" ? s.roleCardActive : ""}`}
                onClick={() => setRole("teacher")}
              >
                <span className={s.roleEmoji}>📋</span>
                <span className={s.roleLabel}>Soy docente</span>
                <span className={s.roleDesc}>Quiero ver el panel de actividad</span>
              </button>
            </div>

            {role === "teacher" && (
              <label className={`${s.field} ${s.teacherCodeField}`}>
                <span>Código de acceso docente</span>
                <input
                  type="text"
                  value={teacherCode}
                  onChange={e => setTeacherCode(e.target.value)}
                  className={s.input}
                  placeholder="Código proporcionado por la institución"
                />
              </label>
            )}

            {error && <p className={s.error}>{error}</p>}

            <div className={s.navRow}>
              <button type="button" className={s.btnBack} onClick={() => setStep("credentials")}>
                ← Volver
              </button>
              <button
                type="button"
                className={s.btn}
                onClick={handleRoleNext}
                disabled={loading || (role === "teacher" && !teacherCode.trim())}
              >
                {loading ? "Cargando..." : role === "teacher" ? "Registrarme" : "Continuar →"}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Intereses (solo alumnos) ────────────────── */}
        {step === "interests" && (
          <>
            <h1 className={s.title}>¿Qué te interesa?</h1>
            <p className={s.subtitle}>Elegí uno o más temas para personalizar tu experiencia</p>

            <div className={s.interestGrid}>
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${s.interestChip} ${interests.includes(opt.id) ? s.interestChipActive : ""}`}
                  onClick={() => toggleInterest(opt.id)}
                >
                  <span className={s.interestEmoji}>{opt.emoji}</span>
                  <span className={s.interestLabel}>{opt.label}</span>
                </button>
              ))}
            </div>

            {error && <p className={s.error}>{error}</p>}

            <div className={s.navRow}>
              <button type="button" className={s.btnBack} onClick={() => setStep("role")}>
                ← Volver
              </button>
              <button
                type="button"
                className={s.btn}
                onClick={doRegister}
                disabled={loading}
              >
                {loading ? "Registrando..." : interests.length === 0 ? "Saltar →" : "Registrarme"}
              </button>
            </div>

            {interests.length === 0 && (
              <p className={s.note}>Podés elegir temas o saltearte este paso.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
