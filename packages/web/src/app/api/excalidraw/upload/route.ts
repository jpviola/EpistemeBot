import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../../../lib/db";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET = process.env.S3_BUCKET || "episteme-attachments";

// Recibe SVG/JSON y sube a S3, guarda en DB
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.content || !body.filename || !body.sessionId) {
      return Response.json({ ok: false, error: "missing content, filename, or sessionId" }, { status: 400 });
    }

    // Upload to S3
    const key = `attachments/${body.filename}`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body.content,
      ContentType: body.filename.endsWith('.svg') ? 'image/svg+xml' : 'application/json',
    }));

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

    // Save to DB
    const attachment = await db.attachment.create({
      data: {
        sessionId: body.sessionId,
        url,
        filename: body.filename,
      },
    });

    return Response.json({ ok: true, url, attachment });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
