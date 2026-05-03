import { NextRequest } from "next/server";
import { getOrCreateProfile } from "@/lib/gamification";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const { guestId, nickname } = await req.json();
  if (!guestId || !nickname?.trim()) return Response.json({ error: "Parámetros inválidos" }, { status: 400 });

  await getOrCreateProfile(guestId);
  const profile = await (db as any).gamificationProfile.update({
    where: { guestId },
    data:  { nickname: nickname.trim().slice(0, 30) },
  });
  return Response.json(profile);
}
