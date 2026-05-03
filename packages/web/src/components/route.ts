import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import pdf from "pdf-parse"; // Necesitarás instalar esta librería: npm install pdf-parse

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { 
      question, 
      history, 
      attachment, 
      mode, 
      level 
    } = await req.json();

    let contextFromAttachment = "";
    let imageBlock: any = null;

    // 1. Procesar el adjunto según su tipo
    if (attachment) {
      if (attachment.type.startsWith("image/")) {
        // Preparar bloque de imagen para Claude Vision
        imageBlock = {
          type: "image",
          source: {
            type: "base64",
            media_type: attachment.type,
            data: attachment.data,
          },
        };
      } else if (attachment.type === "application/pdf") {
        // Extraer texto del PDF
        const buffer = Buffer.from(attachment.data, "base64");
        const pdfData = await pdf(buffer);
        contextFromAttachment = `\n\nCONTENIDO DEL ARCHIVO PDF ADJUNTO (${attachment.name}):\n<documento>\n${pdfData.text}\n</documento>\n`;
      }
    }

    // 2. Construir el mensaje del usuario
    // Si hay imagen, el contenido es un array de bloques. Si no, es texto simple.
    const userContent: any[] = [];
    
    if (imageBlock) {
      userContent.push(imageBlock);
    }

    userContent.push({
      type: "text",
      text: `${contextFromAttachment}${question || "Analiza el archivo adjunto."}`
    });

    // 3. Configurar el sistema y el historial
    const systemPrompt = `Eres EpistemeBot, un experto tutor de humanidades para nivel ${level}. 
    Tu modo actual es: ${mode === "debate" ? "Debate Socrático" : "Tutor Educativo"}.
    Si el usuario adjunta un documento o imagen, analízalo con rigor académico y relaciónalo con conceptos filosóficos o históricos relevantes.`;

    const messages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent }
    ];

    // 4. Iniciar el stream con Claude
    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        
        // Al finalizar, podrías enviar metadatos adicionales como XP o recomendaciones
        // simulando la lógica que ya tienes en el frontend
        const finalMetadata = JSON.stringify({ 
          xpGained: 15, 
          done: true 
        });
        controller.enqueue(encoder.encode(`data: ${finalMetadata}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new NextResponse(customStream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (error: any) {
    console.error("Error en Tutor API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}