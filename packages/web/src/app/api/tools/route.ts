import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/node";
import { StatsD } from "hot-shots";

const anthropic = new Anthropic();

// Init Sentry if provided
if (process.env.SENTRY_DSN) {
  try {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0 });
    console.info("[sentry] initialized");
  } catch (e) {
    console.warn("[sentry] init failed", String(e));
  }
}

// Init DogStatsD client if configured (Datadog)
let statsd: StatsD | null = null;
try {
  const host = process.env.DOGSTATSD_HOST;
  const port = process.env.DOGSTATSD_PORT ? Number(process.env.DOGSTATSD_PORT) : undefined;
  if (host || port) {
    statsd = new StatsD({ host, port, prefix: "semhum.", errorHandler: (err) => console.warn("[dogstatsd] error", err) });
    console.info("[dogstatsd] client initialized", { host, port });
  }
} catch (e) {
  console.warn("[dogstatsd] init failed", String(e));
}

type ToolRequest = {
  type: string;
  prompt: string;
  params?: Record<string, unknown>;
};

function extractCodeFence(text: string, lang?: string) {
  const re = new RegExp("```(?:" + (lang ?? "\\w*") + ")?\\s*([\\s\\S]*?)\\s*```", "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function tryParseJSONFromText(text: string): string | null {
  // Try plain parse
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {}

  // Try code fence with json
  const fenced = extractCodeFence(text, "json");
  if (fenced) {
    try { return JSON.stringify(JSON.parse(fenced)); } catch {}
  }

  // Try any code fence
  const anyFenced = text.match(/```[\s\S]*?```/);
  if (anyFenced) {
    const inside = anyFenced[0].replace(/```/g, "").trim();
    try { return JSON.stringify(JSON.parse(inside)); } catch {}
  }

  // Attempt to extract first JSON object/array by scanning for balanced braces
  const startIdx = Math.min(
    ...[text.indexOf("{"), text.indexOf("[")].filter(i => i >= 0)
  );
  if (startIdx >= 0) {
    const startChar = text[startIdx];
    const endChar = startChar === "{" ? "}" : "]";
    let depth = 0;
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (ch === startChar) depth++;
      else if (ch === endChar) depth--;
      if (depth === 0) {
        const candidate = text.slice(startIdx, i + 1);
        try { return JSON.stringify(JSON.parse(candidate)); } catch {}
        break;
      }
    }
  }

  return null;
}

function extractMermaid(text: string): string | null {
  const fenced = extractCodeFence(text, "mermaid");
  if (fenced) return fenced;
  // Try generic fence
  const anyFenced = extractCodeFence(text);
  if (anyFenced && /graph|mindmap/i.test(anyFenced)) return anyFenced;
  // If raw contains 'graph TD' assume it's mermaid
  const idx = text.indexOf("graph");
  if (idx >= 0) return text.slice(idx).trim();
  return null;
}

function extractSVG(text: string): string | null {
  const re = /<svg[\s\S]*?<\/svg>/i;
  const m = text.match(re);
  return m ? m[0] : null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ToolRequest;

  if (!body || !body.type || !body.prompt) {
    return Response.json({ error: "Missing 'type' or 'prompt' in body" }, { status: 400 });
  }

  const requestStart = Date.now();
  try { statsd?.increment("tools.requests"); } catch {}
  console.info(JSON.stringify({ event: "tools.request_received", type: body.type }));

  // More precise system prompts per tool type, with explicit examples
  let systemPrompt = "Sos un asistente que responde exactamente en el formato solicitado, sin explicaciones ni texto adicional.";
  let expectedFormat: "json" | "mermaid" | "svg" | "text" = "text";

  switch (body.type) {
    case "concept-map":
      systemPrompt = `Genera exclusivamente un mapa conceptual en sintaxis Mermaid. RESPONDE SOLO con el bloque Mermaid (por ejemplo, empezando con 'graph TD' o usando 'mindmap'). No agregues markdown, comentarios, ni texto antes o después.`;
      expectedFormat = "mermaid";
      break;
    case "timeline":
      systemPrompt = `Genera exclusivamente JSON válido: una lista (array) de objetos con { year: number|string, event: string, description?: string }. EJEMPLO: [{"year":1789,"event":"Revolución Francesa","description":"..."}]. Responde solo el JSON, sin backticks ni texto adicional.`;
      expectedFormat = "json";
      break;
    case "infographic":
      systemPrompt = `Genera exclusivamente JSON válido con la estructura { title: string, sections: [{ title: string, body: string }], stats?: [{ label: string, value: string|number }] }. Devuelve únicamente el JSON limpio (sin markdown ni explicaciones). Incluí ejemplos cortos si es necesario dentro del JSON.`;
      expectedFormat = "json";
      break;
    case "study-plan":
      systemPrompt = `Genera exclusivamente un plan de estudio en JSON: { weeks: [{ week: number, topics: string[], goals?: string[] }] }. Responde solo el JSON, sin texto adicional ni markdown.`;
      expectedFormat = "json";
      break;
    case "svg-map":
      systemPrompt = `Genera únicamente un fragmento SVG válido (<svg>...</svg>) que represente el gráfico solicitado. Responde solo con el markup SVG exacto.`;
      expectedFormat = "svg";
      break;
    default:
      systemPrompt = `Responde en texto plano según lo solicitado.`;
      expectedFormat = "text";
  }

  const maxAttempts = 3;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[tools] attempt ${attempt}/${maxAttempts} for type=${body.type}`);
      try { statsd?.increment("tools.attempt", 1, [`type:${body.type}`]); } catch {}
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: attempt === 1 ? systemPrompt : (expectedFormat === "json" ? `${systemPrompt} IMPORTANTE: Responde AHORA únicamente con JSON válido sin ningún texto extra.` : (expectedFormat === "mermaid" ? `${systemPrompt} IMPORTANTE: Responde AHORA únicamente con el código Mermaid, sin backticks ni texto.` : (expectedFormat === "svg" ? `${systemPrompt} IMPORTANTE: Responde AHORA únicamente con el markup SVG.` : systemPrompt))),
        messages: [{ role: "user", content: body.prompt }],
      });

      const raw = Array.isArray(response.content) && response.content[0].type === "text" ? response.content[0].text : "";
      console.info(JSON.stringify({ event: "tools.raw_response", type: body.type, length: raw.length, attempt }));

      // Validate/extract based on expected format
      if (expectedFormat === "json") {
        const extracted = tryParseJSONFromText(raw);
        if (extracted) {
          try { statsd?.increment("tools.success", 1, [`type:${body.type}`]); } catch {}
          console.info(JSON.stringify({ event: "tools.success", type: body.type, format: "json", attempts: attempt }));
          // response time metric
          try { statsd?.timing("tools.latency", Date.now() - requestStart, [`type:${body.type}`]); } catch {}
          return Response.json({ ok: true, content: extracted, format: "json" });
        } else {
          lastError = "No JSON válido en la respuesta";
          console.warn(`[tools] attempt ${attempt} - invalid JSON`);
          try { statsd?.increment("tools.invalid_json", 1, [`type:${body.type}`]); } catch {}
          // backoff before retry
          if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
          continue;
        }
      } else if (expectedFormat === "mermaid") {
        const extracted = extractMermaid(raw);
        if (extracted) {
          try { statsd?.increment("tools.success", 1, [`type:${body.type}`]); } catch {}
          try { statsd?.timing("tools.latency", Date.now() - requestStart, [`type:${body.type}`]); } catch {}
          console.info(JSON.stringify({ event: "tools.success", type: body.type, format: "mermaid", attempts: attempt }));
          return Response.json({ ok: true, content: extracted, format: "mermaid" });
        }
        lastError = "No Mermaid detectado en la respuesta";
        console.warn(`[tools] attempt ${attempt} - no mermaid detected`);
        try { statsd?.increment("tools.invalid_mermaid", 1, [`type:${body.type}`]); } catch {}
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
        continue;
      } else if (expectedFormat === "svg") {
        const extracted = extractSVG(raw);
        if (extracted) {
          try { statsd?.increment("tools.success", 1, [`type:${body.type}`]); } catch {}
          try { statsd?.timing("tools.latency", Date.now() - requestStart, [`type:${body.type}`]); } catch {}
          console.info(JSON.stringify({ event: "tools.success", type: body.type, format: "svg", attempts: attempt }));
          return Response.json({ ok: true, content: extracted, format: "svg" });
        }
        lastError = "No SVG detectado en la respuesta";
        console.warn(`[tools] attempt ${attempt} - no svg detected`);
        try { statsd?.increment("tools.invalid_svg", 1, [`type:${body.type}`]); } catch {}
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
        continue;
      } else {
        // text
        try { statsd?.increment("tools.success", 1, [`type:${body.type}`]); } catch {}
        try { statsd?.timing("tools.latency", Date.now() - requestStart, [`type:${body.type}`]); } catch {}
        return Response.json({ ok: true, content: raw, format: "text" });
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[tools] attempt ${attempt} error: ${lastError}`);
      try { statsd?.increment("tools.error", 1, [`type:${body.type}`]); } catch {}
      if (Sentry.getCurrentHub) {
        try { Sentry.captureException(err); } catch (e) { console.warn("[sentry] capture failed", String(e)); }
      }
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt - 1)));
    }
  }

  // Final failure: capture and return
  console.error(JSON.stringify({ event: "tools.failed", type: body.type, error: lastError }));
  try { statsd?.increment("tools.failed", 1, [`type:${body.type}`]); } catch {}
  if (Sentry.getCurrentHub) {
    try { Sentry.captureMessage(`tools.failed type=${body.type} error=${lastError}`); } catch {}
  }
  return Response.json({ ok: false, error: lastError ?? "Formato no válido" }, { status: 500 });
}
