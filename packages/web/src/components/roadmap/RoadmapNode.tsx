"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RoadmapNodeDef } from "@/data/roadmaps/types";
import s from "./RoadmapNode.module.css";

type RoadmapNodeData = RoadmapNodeDef & { accentColor: string; done?: boolean };

function RoadmapNodeComponent({ data }: NodeProps) {
  const d = data as RoadmapNodeData;

  if (d.nodeType === "section") {
    return (
      <>
        <Handle type="target" position={Position.Top} className={s.handle} />
        <div className={s.section} style={{ background: d.accentColor }}>
          {d.emoji && <span className={s.sectionEmoji}>{d.emoji}</span>}
          <span className={s.sectionLabel}>{d.label}</span>
        </div>
        <Handle type="source" position={Position.Bottom} className={s.handle} />
      </>
    );
  }

  const isOptional = d.nodeType === "optional";

  return (
    <>
      <Handle type="target" position={Position.Top} className={s.handle} />
      <div
        className={`${s.topic} ${isOptional ? s.topicOptional : ""} ${d.done ? s.topicDone : ""}`}
        style={d.done ? { borderColor: d.accentColor } : isOptional ? {} : { borderColor: d.accentColor }}
      >
        {d.done && <span className={s.doneCheck}>✓</span>}
        {d.emoji && <span className={s.topicEmoji}>{d.emoji}</span>}
        <span className={s.topicLabel}>{d.label}</span>
        {isOptional && <span className={s.optTag}>opcional</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className={s.handle} />
    </>
  );
}

export default memo(RoadmapNodeComponent);
