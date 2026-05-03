"use client";

type Section = { title: string; body: string };
type Stat = { label: string; value: string | number };

export default function InfographicRenderer({ json }: { json: string }) {
  try {
    const parsed = JSON.parse(json) as { title?: string; sections?: Section[]; stats?: Stat[] };

    return (
      <div style={{ padding: 12 }}>
        {parsed.title && <h3 style={{ margin: 0, marginBottom: 8 }}>{parsed.title}</h3>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {parsed.sections?.map((s, i) => (
            <div key={i} style={{ borderRadius: 8, padding: 12, background: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ color: "#333" }}>{s.body}</div>
            </div>
          ))}
        </div>
        {parsed.stats && parsed.stats.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {parsed.stats.map((st, i) => (
              <div key={i} style={{ minWidth: 120, padding: 10, borderRadius: 8, background: "linear-gradient(180deg,#fff,#fafafa)", boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 14, color: "#666" }}>{st.label}</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{st.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } catch (e) {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{json}</pre>;
  }
}
