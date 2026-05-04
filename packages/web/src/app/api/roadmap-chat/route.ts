import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const SUBJECT_PROMPTS: Record<string, string> = {
  filosofia: "filosofía (lógica, metafísica, ética, historia del pensamiento filosófico)",
  historia:  "historia universal (prehistoria, antigüedad, medievalismo, modernidad, siglo XX)",
  psicologia: "psicología (psicoanálisis, conductismo, cognitivismo, psicología social y clínica)",
  literatura: "literatura universal e hispanoamericana (géneros, movimientos, obras y autores clave)",
};

export async function POST(req: NextRequest) {
  const { question, history = [], subject, topicLabel } = await req.json() as {
    question: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    subject: string;
    topicLabel?: string;
  };

  if (!question) return Response.json({ error: "Falta question" }, { status: 400 });

  const subjectDesc = SUBJECT_PROMPTS[subject] ?? subject;
  const topicContext = topicLabel ? ` El usuario está estudiando el tema: "${topicLabel}".` : "";

  const system = `Sos un tutor experto en ${subjectDesc}.${topicContext}
Respondé preguntas de forma concisa, clara y pedagógica. Usá ejemplos concretos.
Si el usuario no entiende algo del roadmap o teme un tema difícil, motivalo.
Respondés en español rioplatense. Máximo 3 párrafos cortos por respuesta.`;

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
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system,
          messages,
        });
        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ text: event.delta.text });
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
