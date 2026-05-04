import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { RoadmapNodeDef, RoadmapEdgeDef } from "@/data/roadmaps/types";

const NODE_WIDTH  = 210;
const NODE_HEIGHT = 56;
const SECTION_W   = 230;
const SECTION_H   = 44;

export function buildLayoutedGraph(
  nodeDefs: RoadmapNodeDef[],
  edgeDefs:  RoadmapEdgeDef[],
  accentColor: string,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 70, marginx: 40, marginy: 40 });

  nodeDefs.forEach(n => {
    const w = n.nodeType === "section" ? SECTION_W : NODE_WIDTH;
    const h = n.nodeType === "section" ? SECTION_H : NODE_HEIGHT;
    g.setNode(n.id, { width: w, height: h });
  });
  edgeDefs.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes: Node[] = nodeDefs.map(n => {
    const pos = g.node(n.id);
    const w = n.nodeType === "section" ? SECTION_W : NODE_WIDTH;
    const h = n.nodeType === "section" ? SECTION_H : NODE_HEIGHT;
    return {
      id: n.id,
      type: "roadmapNode",
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      data: { ...n, accentColor },
    };
  });

  const edges: Edge[] = edgeDefs.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    style: { stroke: "#c8c5c0", strokeWidth: 2 },
    animated: false,
  }));

  return { nodes, edges };
}
