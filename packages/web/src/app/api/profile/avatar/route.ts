import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { dataUrl } = await req.json() as { dataUrl: string };
  if (!dataUrl?.startsWith("data:image/")) {
    return Response.json({ error: "Formato inválido" }, { status: 400 });
  }

  const base64 = dataUrl.split(",")[1] ?? "";
  if (base64.length * 0.75 > MAX_SIZE) {
    return Response.json({ error: "Imagen demasiado grande (máx. 2 MB)" }, { status: 413 });
  }

  await (db as any).user.update({
    where: { id: session.user.id },
    data: { avatarUrl: dataUrl },
  });

  return Response.json({ avatarUrl: dataUrl });
}
