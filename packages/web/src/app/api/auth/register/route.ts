import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

const TEACHER_CODE = process.env.TEACHER_CODE ?? "SEMHUM_DOCENTE_2024";

export async function POST(req: NextRequest) {
  const { email, password, name, role, teacherCode, interests, guestId } = await req.json();

  if (!email || !password || password.length < 6) {
    return Response.json({ error: "Email y contraseña (mínimo 6 caracteres) requeridos" }, { status: 400 });
  }

  const resolvedRole = role === "teacher" ? "teacher" : "student";

  if (resolvedRole === "teacher") {
    if (!teacherCode || teacherCode.trim() !== TEACHER_CODE) {
      return Response.json({ error: "Código docente incorrecto" }, { status: 403 });
    }
  }

  const existing = await (db as any).user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  // Check if guestId is already linked to another account
  let resolvedGuestId: string | null = guestId || null;
  if (resolvedGuestId) {
    const guestTaken = await (db as any).user.findUnique({ where: { guestId: resolvedGuestId } });
    if (guestTaken) resolvedGuestId = null;
  }

  const hashed = await hash(password, 12);
  const user   = await (db as any).user.create({
    data: {
      email,
      password: hashed,
      name:      name?.trim() || null,
      role:      resolvedRole,
      guestId:   resolvedGuestId,
      interests: Array.isArray(interests) && interests.length > 0
        ? JSON.stringify(interests)
        : null,
    },
  });

  return Response.json({ id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 });
}
