import { getRanking } from "@/lib/gamification";

export async function GET() {
  const ranking = await getRanking(20);
  return Response.json(ranking);
}
