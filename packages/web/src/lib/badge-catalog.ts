export type ConditionType =
  | "sessions_completed"
  | "streak"
  | "interesting_questions"
  | "total_messages"
  | "level";

export interface BadgeDef {
  key: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  conditionType: ConditionType;
  conditionValue: number;
}

export const BADGE_CATALOG: BadgeDef[] = [
  // Sesiones
  { key: "first_session",   name: "Primera Chispa",      icon: "🎯", description: "Completaste tu primera sesión",     xpReward: 50,   conditionType: "sessions_completed", conditionValue: 1  },
  { key: "sessions_5",      name: "Estudiante Constante", icon: "📖", description: "5 sesiones completadas",            xpReward: 100,  conditionType: "sessions_completed", conditionValue: 5  },
  { key: "sessions_20",     name: "Dedicación Total",     icon: "🏅", description: "20 sesiones completadas",           xpReward: 200,  conditionType: "sessions_completed", conditionValue: 20 },
  { key: "sessions_50",     name: "Filósofo Persistente", icon: "🗿", description: "50 sesiones completadas",           xpReward: 500,  conditionType: "sessions_completed", conditionValue: 50 },
  // Rachas
  { key: "streak_3",        name: "Racha de Fuego",       icon: "🔥", description: "3 días consecutivos",              xpReward: 75,   conditionType: "streak",            conditionValue: 3  },
  { key: "streak_7",        name: "Semana Imparable",     icon: "⚡", description: "7 días consecutivos",              xpReward: 150,  conditionType: "streak",            conditionValue: 7  },
  { key: "streak_30",       name: "Mes de Sabiduría",     icon: "🌟", description: "30 días consecutivos",             xpReward: 500,  conditionType: "streak",            conditionValue: 30 },
  // Calidad
  { key: "curious_mind",    name: "Mente Curiosa",        icon: "🤔", description: "5 preguntas filosóficas profundas", xpReward: 100,  conditionType: "interesting_questions", conditionValue: 5  },
  { key: "deep_thinker",    name: "Pensador Profundo",    icon: "🧩", description: "20 preguntas filosóficas profundas",xpReward: 250,  conditionType: "interesting_questions", conditionValue: 20 },
  { key: "philosopher",     name: "Filósofo",             icon: "🦉", description: "50 preguntas filosóficas profundas",xpReward: 500,  conditionType: "interesting_questions", conditionValue: 50 },
  // Mensajes
  { key: "messages_50",     name: "Conversador",          icon: "💬", description: "50 mensajes enviados",              xpReward: 75,   conditionType: "total_messages", conditionValue: 50  },
  { key: "messages_200",    name: "Gran Dialoguista",     icon: "🗣️", description: "200 mensajes enviados",             xpReward: 200,  conditionType: "total_messages", conditionValue: 200 },
  // Nivel
  { key: "level_5",         name: "Analista Crítico",     icon: "🧠", description: "Alcanzaste el nivel 5",             xpReward: 100,  conditionType: "level", conditionValue: 5  },
  { key: "level_10",        name: "Sabio del Conocimiento",icon: "⭐", description: "Alcanzaste el nivel máximo",       xpReward: 1000, conditionType: "level", conditionValue: 10 },
];
