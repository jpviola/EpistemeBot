import { NextRequest } from "next/server";
import { getSessionWithMessages } from "@/lib/sessions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guestId = req.nextUrl.searchParams.get("guestId") ?? "";
  const session = await getSessionWithMessages(id, guestId);
  if (!session) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(session);
}
