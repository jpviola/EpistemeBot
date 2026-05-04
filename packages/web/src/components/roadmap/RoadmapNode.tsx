"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RoadmapNodeDef } from "@/data/roadmaps/types";
import s from "./RoadmapNode.module.css";

type NodeStatus = "pending" | "in_progress" | "done";
type RoadmapNodeData = RoadmapNodeDef & { accentColor: string; status?: NodeStatus };

function RoadmapNodeComponent({ data }: NodeProps) {
  const d = data as RoadmapNodeData;
  const status = d.status ?? "pending";

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

  const isOptional   = d.nodeType === "optional";
  const isInProgress = status === "in_progress";
  const isDone       = status === "done";

  return (
    <>
      <Handle type="target" position={Position.Top} className={s.handle} />
      <div
        className={[
          s.topic,
          isOptional   ? s.topicOptional    : "",
          isInProgress ? s.topicInProgress  : "",
          isDone       ? s.topicDone        : "",
        ].join(" ")}
        style={
          isDone       ? { borderColor: d.accentColor } :
          isOptional   ? {} :
                         { borderColor: d.accentColor }
        }
      >
        {isDone       && <span className={s.doneCheck}>✓</span>}
        {isInProgress && <span className={s.progressDot} />}
        {d.emoji && <span className={s.topicEmoji}>{d.emoji}</span>}
        <span className={s.topicLabel}>{d.label}</span>
        {isOptional && <span className={s.optTag}>opcional</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className={s.handle} />
    </>
  );
}

export default memo(RoadmapNodeComponent);
