"use client";

type Week = { week: number; topics: string[]; goals?: string[] };

export default function StudyPlanRenderer({ json }: { json: string }) {
  let weeks: Week[] = [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed.weeks)) weeks = parsed.weeks;
    else if (Array.isArray(parsed)) weeks = parsed;
  } catch {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{json}</pre>;
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ minWidth: 220, borderRadius: 8, padding: 12, background: "#fff", boxShadow: "0 6px 14px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Semana {w.week}</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Temas</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {w.topics.map((t, j) => (
                  <li key={j}><label><input type="checkbox" style={{ marginRight: 8 }} />{t}</label></li>
                ))}
              </ul>
            </div>
            {w.goals && w.goals.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Objetivos</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {w.goals.map((g, k) => (
                    <li key={k}><label><input type="checkbox" style={{ marginRight: 8 }} />{g}</label></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
