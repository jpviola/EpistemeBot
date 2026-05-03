import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../../../lib/db";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET = process.env.S3_BUCKET || "episteme-attachments";

// Guarda el JSON del canvas como attachment en la sesión
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.sessionId || !body.data) {
    return Response.json({ ok: false, error: "Missing sessionId or data" }, { status: 400 });
  }

  try {
    const name = `excalidraw-${body.sessionId}-${Date.now()}.json`;
    const content = typeof body.data === "string" ? body.data : JSON.stringify(body.data);

    // Upload to S3
    const key = `attachments/${name}`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: content,
      ContentType: "application/json",
    }));

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

    // Save to DB
    const attachment = await db.attachment.create({
      data: {
        sessionId: body.sessionId,
        url,
        filename: name,
      },
    });

    return Response.json({ ok: true, url, attachment });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
