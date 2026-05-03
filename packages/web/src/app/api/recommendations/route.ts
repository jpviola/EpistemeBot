import { NextRequest } from "next/server";
import { getRecommendations } from "@/lib/recommendations";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const question = searchParams.get("question") ?? "";
  const guestId  = searchParams.get("guestId")  ?? "";

  if (!question || !guestId) {
    return Response.json({ error: "Missing question or guestId" }, { status: 400 });
  }

  // relatedEntities can be passed as a JSON-encoded query param from the client
  let relatedEntities: Array<{ iri: string; label: string; type: string }> = [];
  const raw = searchParams.get("entities");
  if (raw) {
    try { relatedEntities = JSON.parse(decodeURIComponent(raw)); } catch { /* ignore */ }
  }

  const recs = await getRecommendations({ question, guestId, relatedEntities });
  return Response.json(recs);
}
