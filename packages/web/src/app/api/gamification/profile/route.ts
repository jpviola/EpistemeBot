import { NextRequest } from "next/server";
import { getFullProfile, getOrCreateProfile } from "@/lib/gamification";

export async function GET(req: NextRequest) {
  const guestId = req.nextUrl.searchParams.get("guestId");
  if (!guestId) return Response.json({ error: "guestId requerido" }, { status: 400 });

  const profile = await getFullProfile(guestId);
  if (!profile) {
    const fresh = await getOrCreateProfile(guestId);
    return Response.json({ ...fresh, badges: [], unearnedBadges: [], xpEvents: [], levelInfo: { level: 1, title: "Aprendiz Curioso", emoji: "🌱", xp: 0, nextXp: 100, progress: 0 } });
  }
  return Response.json(profile);
}
