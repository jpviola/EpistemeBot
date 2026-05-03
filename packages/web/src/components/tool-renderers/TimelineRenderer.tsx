"use client";

type Item = { year: number | string; event: string; description?: string };

export default function TimelineRenderer({ json }: { json: string }) {
  let items: Item[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) items = parsed;
    else if (parsed.items) items = parsed.items;
  } catch {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{json}</pre>;
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ minWidth: 72, textAlign: "right", color: "#666" }}>{it.year}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.event}</div>
              {it.description && <div style={{ color: "#444" }}>{it.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
