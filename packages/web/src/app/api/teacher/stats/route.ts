import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const INTEREST_LABELS: Record<string, string> = {
  filosofia:   "Filosofía",
  psicologia:  "Psicología",
  hist_arg:    "Historia Argentina",
  hist_lat:    "Historia Latinoamericana",
  hist_univ:   "Historia Universal",
  literatura:  "Literatura",
  arte:        "Arte",
  cs_sociales: "Ciencias Sociales",
};

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "teacher") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const [
    totalSessions,
    totalMessages,
    topConcepts,
    leaderboard,
    recentSessions,
    registeredStudents,
  ] = await Promise.all([
    (db as any).session.count(),
    (db as any).message.count(),
    (db as any).conceptProgress.groupBy({
      by:      ["conceptLabel"],
      _sum:    { seenCount: true },
      orderBy: { _sum: { seenCount: "desc" } },
      take:    10,
    }),
    (db as any).gamificationProfile.findMany({
      orderBy: { xp: "desc" },
      take:    10,
      select:  { guestId: true, nickname: true, xp: true, level: true, streak: true, totalSessions: true, totalMessages: true },
    }),
    (db as any).session.findMany({
      orderBy: { updatedAt: "desc" },
      take:    15,
      select:  { id: true, guestId: true, title: true, level: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    (db as any).user.findMany({
      where:  { role: "student" },
      select: { id: true, name: true, email: true, guestId: true, interests: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const uniqueStudents = await (db as any).session.groupBy({ by: ["guestId"] });

  // Compute interest distribution from registered students
  const interestCount: Record<string, number> = {};
  for (const u of registeredStudents) {
    if (!u.interests) continue;
    try {
      const ids: string[] = JSON.parse(u.interests);
      for (const id of ids) {
        interestCount[id] = (interestCount[id] ?? 0) + 1;
      }
    } catch { /* skip malformed */ }
  }
  const interestDistribution = Object.entries(interestCount)
    .map(([id, count]) => ({ id, label: INTEREST_LABELS[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);

  return Response.json({
    totalStudents:     uniqueStudents.length,
    totalRegistered:   registeredStudents.length,
    totalSessions,
    totalMessages,
    topConcepts:       topConcepts.map((c: any) => ({ label: c.conceptLabel, count: c._sum.seenCount })),
    leaderboard,
    recentSessions,
    interestDistribution,
    studentList:       registeredStudents.map((u: any) => ({
      id:         u.id,
      name:       u.name,
      email:      u.email,
      guestId:    u.guestId,
      interests:  u.interests ? (() => { try { return JSON.parse(u.interests); } catch { return []; } })() : [],
      createdAt:  u.createdAt,
    })),
  });
}
