import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { OntologyRAG } from "@semhum/api/rag/ontology-rag";
import { SparqlClient } from "@semhum/api/sparql/client";
import {
  buildTutorSystemPrompt,
  buildTutorUserPrompt,
  buildDebateSystemPrompt,
  buildDebateUserPrompt,
  type TutorMode,
} from "@semhum/api/tutor/prompt-builder";
import type { LearningLevel } from "@semhum/api/ontology/types";
import {
  saveMessage,
  updateSessionTitle,
  trackConceptProgress,
} from "@/lib/sessions";
import { rewardExchange } from "@/lib/gamification";
import { getRecommendations } from "@/lib/recommendations";

const anthropic = new Anthropic();
const sparql    = SparqlClient.createInMemory();
const rag       = new OntologyRAG(sparql);

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    question:   string;
    level:      LearningLevel;
    mode?:      TutorMode;
    sessionId:  string;
    guestId:    string;
    isFirst?:   boolean;
    interests?: string[];
    history?:   Array<{ role: "user" | "assistant"; content: string }>;
  };

  const { question, level, mode = "tutor", sessionId, guestId, isFirst = false, interests = [], history = [] } = body;

  if (!question || !level || !sessionId || !guestId) {
    return Response.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
  }

  // Guardar mensaje del usuario inmediatamente
  await saveMessage(sessionId, "user", question);

  // Si es el primer mensaje, usarlo como título de la sesión
  if (isFirst) {
    const title = question.length > 60 ? question.slice(0, 57) + "…" : question;
    await updateSessionTitle(sessionId, title);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // 1. Contexto ontológico desde GraphDB
        const { ontologicalContext, pedagogicalInferences, relatedEntities } =
          await rag.buildContextForQuestion(question, level);

        const prerequisites   = pedagogicalInferences.flatMap(i => i.prerequisites);
        const relatedConcepts = pedagogicalInferences.flatMap(i => i.relatedReading);

        send({ prerequisites, relatedConcepts });

        // 2. Rastrear conceptos vistos
        for (const concept of relatedConcepts) {
          trackConceptProgress(guestId, concept.iri, concept.label).catch(() => {});
        }

        // 3. Prompt enriquecido según el modo
        const ctx = { question, level, ontologicalContext, pedagogicalInferences, relatedEntities };
        const userPrompt   = mode === "debate" ? buildDebateUserPrompt(ctx)       : buildTutorUserPrompt(ctx);
        const systemPrompt = mode === "debate" ? buildDebateSystemPrompt()        : buildTutorSystemPrompt(interests);

        const messages: Anthropic.MessageParam[] = [
          ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: userPrompt },
        ];

        // 4. Streaming desde Claude
        let fullResponse = "";
        const claudeStream = anthropic.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: mode === "debate" ? 600 : 1500,
          system:     systemPrompt,
          messages,
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            send({ text: event.delta.text });
          }
        }

        // 5. Persistir respuesta del asistente
        await saveMessage(sessionId, "assistant", fullResponse, { prerequisites, relatedConcepts });

        // 6. Gamificación y recomendaciones
        const xpResult = await rewardExchange(guestId, sessionId, question, isFirst);
        const xpGained = xpResult.total;

        let recommendations: any[] = [];
        if (mode === "tutor") {
          const entities = relatedConcepts
            .filter(r => r.iri)
            .map(r => ({ iri: r.iri!, label: r.label, type: "concept" }));
          recommendations = await getRecommendations({ question, guestId, relatedEntities: entities });
        }

        send({ recommendations, xpGained });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno";
        send({ error: msg });
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
