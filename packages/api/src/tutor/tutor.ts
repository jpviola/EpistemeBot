// Tutor Filosófico: orquesta ontología + RAG + LLM
// Este es el módulo principal del sistema.

import Anthropic from "@anthropic-ai/sdk";
import type { LearningLevel } from "../ontology/types";
import { OntologyRAG } from "../rag/ontology-rag";
import { SparqlClient } from "../sparql/client";
import { buildTutorSystemPrompt, buildTutorUserPrompt } from "./prompt-builder";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorResponse {
  answer: string;
  prerequisites: Array<{ label: string; reason: string }>;
  relatedConcepts: Array<{ label: string; relation: string }>;
  suggestedPath?: string[];
}

export class PhilosophyTutor {
  private readonly client: Anthropic;
  private readonly rag: OntologyRAG;
  private readonly model = "claude-sonnet-4-6";

  constructor() {
    this.client = new Anthropic();
    const sparql = SparqlClient.createInMemory();
    this.rag = new OntologyRAG(sparql);
  }

  async ask(
    question: string,
    level: LearningLevel,
    history: TutorMessage[] = []
  ): Promise<TutorResponse> {
    // 1. Enriquecer con contexto ontológico
    const { ontologicalContext, pedagogicalInferences, relatedEntities } =
      await this.rag.buildContextForQuestion(question, level);

    // 2. Construir prompt enriquecido
    const userPrompt = buildTutorUserPrompt({
      question,
      level,
      ontologicalContext,
      pedagogicalInferences,
      relatedEntities,
    });

    // 3. Llamar al LLM con contexto semántico
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userPrompt },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      system: buildTutorSystemPrompt(),
      messages,
    });

    const answer =
      response.content[0].type === "text" ? response.content[0].text : "";

    // 4. Consolidar inferencias pedagógicas para el frontend
    const allPrerequisites = pedagogicalInferences.flatMap(
      (inf) => inf.prerequisites
    );
    const allRelated = pedagogicalInferences.flatMap(
      (inf) => inf.relatedReading
    );

    return {
      answer,
      prerequisites: allPrerequisites,
      relatedConcepts: allRelated,
    };
  }

  async *stream(
    question: string,
    level: LearningLevel,
    history: TutorMessage[] = []
  ): AsyncGenerator<string> {
    const { ontologicalContext, pedagogicalInferences } =
      await this.rag.buildContextForQuestion(question, level);

    const userPrompt = buildTutorUserPrompt({
      question,
      level,
      ontologicalContext,
      pedagogicalInferences,
      relatedEntities: [],
    });

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userPrompt },
    ];

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 1500,
      system: buildTutorSystemPrompt(),
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
