import { NextRequest } from "next/server";
import { createSession, getSessionsForGuest } from "@/lib/sessions";

export async function GET(req: NextRequest) {
  const guestId = req.nextUrl.searchParams.get("guestId");
  if (!guestId) return Response.json([], { status: 200 });

  const sessions = await getSessionsForGuest(guestId);
  return Response.json(sessions);
}

export async function POST(req: NextRequest) {
  const { guestId, level } = await req.json();
  if (!guestId || !level) {
    return Response.json({ error: "guestId y level son requeridos" }, { status: 400 });
  }
  const session = await createSession(guestId, level);
  return Response.json(session);
}
