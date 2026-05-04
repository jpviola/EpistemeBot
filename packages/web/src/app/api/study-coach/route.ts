import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Sos un coach de técnicas de estudio y aprendizaje efectivo, especializado en ciencias humanas (filosofía, historia, psicología, literatura, ciencias sociales).

Tu rol es enseñar metodologías de estudio probadas, de forma práctica e interactiva. No sos un tutor de contenido — sos un guía de cómo aprender.

Técnicas que dominás (con ejemplos concretos para humanidades):
• **Repetición espaciada** — cómo usar intervalos crecientes para retener conceptos filosóficos o fechas históricas; apps como Anki
• **Método Feynman** — explicar con palabras simples para detectar vacíos; ejercicio: explicá "el imperativo categórico" como si tuvieras 12 años
• **Método Cornell** — sistema de notas con columna de palabras clave, notas principales y resumen; ideal para clases de filosofía
• **Mapas conceptuales y cuadros sinópticos** — cómo representar visualmente relaciones entre conceptos
• **Aula invertida** — estudiar teoría antes y usar el tiempo de clase/tutor para profundizar
• **Pomodoro** — bloques de 25 min + 5 de descanso; cómo adaptarlo al estudio de textos densos
• **Lectura activa (SQ3R)** — Survey, Question, Read, Recite, Review; aplicado a textos filosóficos
• **Kanban de estudio** — organizar temas en "pendiente / en progreso / dominado"
• **Interleaving** — alternar temas para mejorar retención a largo plazo

Siempre:
- Preguntás por el contexto del estudiante antes de recomendar (¿qué estás estudiando? ¿cuánto tiempo tenés? ¿para cuándo es?)
- Dás plantillas o pasos concretos que el estudiante puede usar hoy
- Sos conciso, cálido y motivador — no abrumás con información
- Si el estudiante menciona un tema (ej: "estoy estudiando el existencialismo"), adaptás la técnica a ese tema con un ejemplo real
- Respondés en español rioplatense`;

export async function POST(req: NextRequest) {
  const { question, history = [] } = await req.json() as {
    question: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!question) return Response.json({ error: "Falta el parámetro question" }, { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const messages: Anthropic.MessageParam[] = [
          ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: question },
        ];

        const claudeStream = anthropic.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: 1000,
          system:     SYSTEM_PROMPT,
          messages,
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ text: event.delta.text });
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Error interno" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
    },
  });
}
