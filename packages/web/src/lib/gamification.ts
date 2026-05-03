import { db } from "./db";
import { BADGE_CATALOG, type ConditionType } from "./badge-catalog";
import { getLevelInfo } from "./levels";
export { LEVELS, getLevelInfo } from "./levels";

// ── Seeds ──────────────────────────────────────────────────
let seeded = false;
export async function ensureBadgesCatalog() {
  if (seeded) return;
  seeded = true;
  for (const b of BADGE_CATALOG) {
    await (db as any).badge.upsert({
      where:  { key: b.key },
      create: b,
      update: { name: b.name, icon: b.icon, description: b.description, xpReward: b.xpReward },
    });
  }
}

// ── Perfil ─────────────────────────────────────────────────
export async function getOrCreateProfile(guestId: string) {
  await ensureBadgesCatalog();
  return (db as any).gamificationProfile.upsert({
    where:  { guestId },
    create: { guestId },
    update: {},
  });
}

// ── Otorgar XP ─────────────────────────────────────────────
export async function awardXp(
  guestId: string,
  amount: number,
  reason: string,
  category: string,
  sessionId?: string,
) {
  const profile = await getOrCreateProfile(guestId);

  const newXp    = profile.xp + amount;
  const oldLevel = profile.level;
  const newLevel = getLevelInfo(newXp).level;

  await (db as any).gamificationProfile.update({
    where: { guestId },
    data:  { xp: newXp, level: newLevel },
  });

  await (db as any).xpEvent.create({
    data: { guestId, amount, reason, category, sessionId },
  });

  // Bonus XP por subir de nivel
  if (newLevel > oldLevel) {
    await (db as any).xpEvent.create({
      data: { guestId, amount: 50, reason: `¡Subiste al nivel ${newLevel}!`, category: "level_up", sessionId },
    });
    await (db as any).gamificationProfile.update({
      where: { guestId },
      data:  { xp: newXp + 50 },
    });
    return { xpGained: amount + 50, levelUp: true, newLevel };
  }

  return { xpGained: amount, levelUp: false, newLevel };
}

// ── Racha diaria ───────────────────────────────────────────
export async function updateStreak(guestId: string) {
  const profile = await getOrCreateProfile(guestId);
  const today   = new Date().toISOString().slice(0, 10);
  const last    = profile.lastActivityDate;

  if (last === today) return { streakBonus: 0, streak: profile.streak };

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = last === yesterday ? profile.streak + 1 : 1;
  const longest   = Math.max(newStreak, profile.longestStreak);

  await (db as any).gamificationProfile.update({
    where: { guestId },
    data:  { streak: newStreak, longestStreak: longest, lastActivityDate: today },
  });

  const bonus = newStreak > 1 ? Math.min(newStreak, 7) * 20 : 10;
  await awardXp(guestId, bonus, `Racha de ${newStreak} día(s)`, "streak");

  return { streakBonus: bonus, streak: newStreak };
}

// ── Badges ─────────────────────────────────────────────────
export async function checkAndAwardBadges(guestId: string, sessionId?: string) {
  const profile  = await (db as any).gamificationProfile.findUnique({ where: { guestId } });
  if (!profile) return [];

  const allBadges     = await (db as any).badge.findMany();
  const earnedIds     = (await (db as any).userBadge.findMany({ where: { guestId }, select: { badgeId: true } }))
    .map((b: { badgeId: string }) => b.badgeId);

  const newBadges: string[] = [];

  for (const badge of allBadges) {
    if (earnedIds.includes(badge.id)) continue;

    const met = checkCondition(badge.conditionType as ConditionType, badge.conditionValue, profile);
    if (!met) continue;

    await (db as any).userBadge.create({ data: { guestId, badgeId: badge.id, sessionId } });
    await awardXp(guestId, badge.xpReward, `Badge: ${badge.name}`, "badge", sessionId);
    newBadges.push(badge.name);
  }

  return newBadges;
}

function checkCondition(type: ConditionType, value: number, profile: Record<string, number>): boolean {
  switch (type) {
    case "sessions_completed":    return profile.totalSessions        >= value;
    case "streak":                return profile.streak               >= value;
    case "interesting_questions": return profile.interestingQuestions >= value;
    case "total_messages":        return profile.totalMessages        >= value;
    case "level":                 return profile.level                >= value;
    default:                      return false;
  }
}

// ── Recompensar intercambio ────────────────────────────────
export async function rewardExchange(
  guestId: string,
  sessionId: string,
  question: string,
  isFirstMessageOfSession: boolean,
) {
  // XP base por participar
  const baseXp  = 10;
  // Bonus por pregunta elaborada (heurística: > 60 chars)
  const bonus   = question.trim().length > 60 ? 5 : 0;
  // Detectar vocabulario filosófico
  const philoRe = /categor|imperativo|dialéctica|ontolog|fenomenolog|alteridad|dasein|nietzsche|kant|hegel|plat[oó]n|existencia|ser\s|nada|libertad|ética|metafísic/i;
  const philoBonus = philoRe.test(question) ? 5 : 0;

  const total = baseXp + bonus + philoBonus;
  const result = await awardXp(guestId, total, "Pregunta filosófica", "session", sessionId);

  // Contar mensaje
  await (db as any).gamificationProfile.update({
    where: { guestId },
    data:  { totalMessages: { increment: 1 } },
  });

  // Si es pregunta filosófica, contar como "interesting"
  if (philoBonus > 0) {
    await (db as any).gamificationProfile.update({
      where: { guestId },
      data:  { interestingQuestions: { increment: 1 } },
    });
  }

  // Primera sesión nueva del día: streak + contar sesión
  if (isFirstMessageOfSession) {
    await (db as any).gamificationProfile.update({
      where: { guestId },
      data:  { totalSessions: { increment: 1 } },
    });
    await updateStreak(guestId);
  }

  await checkAndAwardBadges(guestId, sessionId);

  return { ...result, total };
}

// ── Consultas ──────────────────────────────────────────────
export async function getFullProfile(guestId: string) {
  await ensureBadgesCatalog();
  const profile = await (db as any).gamificationProfile.findUnique({
    where:   { guestId },
    include: {
      badges:   { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      xpEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!profile) return null;

  const allBadges = await (db as any).badge.findMany();
  const earnedKeys = new Set(profile.badges.map((ub: any) => ub.badge.key));
  const unearnedBadges = allBadges.filter((b: any) => !earnedKeys.has(b.key));

  return { ...profile, unearnedBadges, levelInfo: getLevelInfo(profile.xp) };
}

export async function getRanking(limit = 10) {
  return (db as any).gamificationProfile.findMany({
    orderBy: { xp: "desc" },
    take:    limit,
    select:  {
      guestId: true, nickname: true, xp: true, level: true,
      streak: true, totalSessions: true,
      badges: { select: { badge: { select: { icon: true } } }, take: 3, orderBy: { earnedAt: "desc" } },
    },
  });
}
