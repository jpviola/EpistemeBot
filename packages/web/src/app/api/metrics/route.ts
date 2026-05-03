import { NextRequest } from "next/server";
import * as Sentry from "@sentry/node";
import { StatsD } from "hot-shots";

let statsd: StatsD | null = null;
try {
  const host = process.env.DOGSTATSD_HOST;
  const port = process.env.DOGSTATSD_PORT ? Number(process.env.DOGSTATSD_PORT) : undefined;
  if (host || port) statsd = new StatsD({ host, port, prefix: "semhum.", errorHandler: () => {} });
} catch (e) { console.warn("[metrics] statsd init failed", e); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.event) return Response.json({ error: "missing event" }, { status: 400 });

  const { event, value = 1, tags = [] } = body;
  try {
    // increment metric
    statsd?.increment(event, value, tags);
    // optional timing
    if (body.timing) statsd?.timing(event + ".timing", body.timing, tags as string[]);
  } catch (e) {
    console.warn("[metrics] emit failed", e);
  }

  // send to Sentry as breadcrumb or message
  try {
    if (Sentry.getCurrentHub) Sentry.captureMessage(`metrics.${event} ${JSON.stringify({ value, tags })}`);
  } catch {}

  return Response.json({ ok: true });
}
