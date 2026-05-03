import { NextRequest } from "next/server";

// PoC: guarda el JSON del canvas como "attachment" en la sesión (simulado)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.sessionId || !body.data) {
    return Response.json({ ok: false, error: "Missing sessionId or data" }, { status: 400 });
  }

  // Aquí deberías persistir en la base (DB / attachments). Para el PoC guardamos en /tmp (no persistente)
  try {
    // create a filename
    const name = `excalidraw-${body.sessionId}-${Date.now()}.json`;
    // write to temporary folder (Node FS available on server)
    const fs = await import("fs");
    const path = await import("path");
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, name);
    const content = typeof body.data === "string" ? body.data : JSON.stringify(body.data);
    fs.writeFileSync(filePath, content);

    // Save metadata to attachments index (PoC). In production persist in DB.
    const indexPath = path.join(tmpDir, "attachments.json");
    let index = [];
    if (fs.existsSync(indexPath)) {
      try { index = JSON.parse(fs.readFileSync(indexPath, "utf8")); } catch {}
    }
    const record = { id: name, sessionId: body.sessionId, path: `/tmp/${name}`, createdAt: new Date().toISOString() };
    index.push(record);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    return Response.json({ ok: true, file: `/tmp/${name}`, record });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
