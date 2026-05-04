export interface RoadmapNodeDef {
  id: string;
  label: string;
  description: string;
  emoji?: string;
  nodeType: "section" | "topic" | "optional";
  tutorPrompt?: string;
}

export interface RoadmapEdgeDef {
  source: string;
  target: string;
}

export interface RoadmapDef {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  color: string;      // CSS color for accent
  darkColor: string;  // darker shade for section headers
  nodes: RoadmapNodeDef[];
  edges: RoadmapEdgeDef[];
}
