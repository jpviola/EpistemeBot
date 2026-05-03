export const LEVELS = [
  { level: 1,  xp: 0,    title: "Aprendiz Curioso",        emoji: "🌱" },
  { level: 2,  xp: 100,  title: "Explorador de Ideas",     emoji: "🔍" },
  { level: 3,  xp: 250,  title: "Pensador Activo",         emoji: "💡" },
  { level: 4,  xp: 500,  title: "Argumentador",            emoji: "⚔️" },
  { level: 5,  xp: 900,  title: "Analista Crítico",        emoji: "🧠" },
  { level: 6,  xp: 1400, title: "Investigador",            emoji: "🔬" },
  { level: 7,  xp: 2000, title: "Filósofo Digital",        emoji: "📚" },
  { level: 8,  xp: 2800, title: "Maestro del Debate",      emoji: "🏆" },
  { level: 9,  xp: 3800, title: "Pensador Socrático",      emoji: "🦉" },
  { level: 10, xp: 5000, title: "Sabio del Conocimiento",  emoji: "⭐" },
] as const;

type LevelEntry = typeof LEVELS[number];

export function getLevelInfo(xp: number) {
  let current: LevelEntry = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.level === current.level + 1);
  const progress  = nextLevel
    ? Math.round(((xp - current.xp) / (nextLevel.xp - current.xp)) * 100)
    : 100;
  return { ...current, nextXp: nextLevel?.xp ?? null, progress };
}
