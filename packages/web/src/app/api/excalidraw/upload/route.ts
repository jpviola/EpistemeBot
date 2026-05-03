import { NextRequest } from "next/server";

// PoC: recibe multipart or raw SVG/JSON and escribe en tmp, devuelve URL simulada
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.content || !body.filename) {
      return Response.json({ ok: false, error: "missing content or filename" }, { status: 400 });
    }

    const fs = await import("fs");
    const path = await import("path");
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, body.filename);
    fs.writeFileSync(filePath, body.content);

    // Append metadata to attachments index
    const indexPath = path.join(tmpDir, "attachments.json");
    let index = [];
    if (fs.existsSync(indexPath)) {
      try { index = JSON.parse(fs.readFileSync(indexPath, "utf8")); } catch {}
    }
    const record = { id: body.filename, url: `/tmp/${body.filename}`, createdAt: new Date().toISOString() };
    index.push(record);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    // In real system, upload to S3/GCS and return public URL
    return Response.json({ ok: true, url: `/tmp/${body.filename}`, record });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
