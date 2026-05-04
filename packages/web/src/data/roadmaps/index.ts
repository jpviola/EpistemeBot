import filosofia from "./filosofia";
import historia  from "./historia";
import psicologia from "./psicologia";
import literatura from "./literatura";
import type { RoadmapDef } from "./types";

export const ROADMAPS: RoadmapDef[] = [filosofia, historia, psicologia, literatura];

export function getRoadmap(slug: string): RoadmapDef | undefined {
  return ROADMAPS.find(r => r.slug === slug);
}

export type { RoadmapDef, RoadmapNodeDef, RoadmapEdgeDef } from "./types";
