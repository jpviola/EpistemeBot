import { NextRequest } from "next/server";
import { db } from "../../../../lib/db";
import { auth } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  // Auth check
  const sessionAuth = await auth();
  let guestId: string | null = null;
  if (sessionAuth?.user) {
    const user = await db.user.findUnique({ where: { id: sessionAuth.user.id } });
    guestId = user?.guestId || null;
  } else {
    guestId = req.nextUrl.searchParams.get("guestId");
  }
  if (!guestId) {
    return Response.json({ error: "Unauthorized: no guestId" }, { status: 401 });
  }

  // Verify session ownership
  const sess = await db.session.findUnique({ where: { id: sessionId } });
  if (!sess || sess.guestId !== guestId) {
    return Response.json({ error: "Unauthorized: session not owned" }, { status: 403 });
  }

  // Get attachments
  const attachments = await db.attachment.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json(attachments);
}