// Recommendation engine for Phase G.
// Two-stage approach:
//   1. Vector similarity (Voyage AI) — when VOYAGE_API_KEY + seeded embeddings exist
//   2. SPARQL-based fallback — always available via ConceptProgress history

import { db } from "./db";
import { embed, cosineSimilarity } from "./embeddings";
import { SparqlClient } from "@semhum/api/sparql/client";
import * as Q from "@semhum/api/sparql/queries";

export interface Recommendation {
  label:    string;
  question: string;  // natural-language question to send
  iri:      string;
  type:     string;
  score:    number;
}

// Generates a natural-language question for a concept/philosopher label.
function toQuestion(label: string, type: string): string {
  if (type === "philosopher") return `¿Qué pensaba ${label}?`;
  if (type === "contrast")    return `¿En qué se diferencia de ${label}?`;
  if (type === "author")      return `¿Cuál es el aporte de ${label}?`;
  // Default: concept
  if (/^[A-ZÁÉÍÓÚ]/.test(label)) return `¿Qué es ${label}?`;
  return `Explicame ${label}`;
}

// ── Vector similarity path ──────────────────────────────────────────────────

async function vectorRecommendations(
  question: string,
  seenIris: Set<string>,
  limit: number,
): Promise<Recommendation[]> {
  const qEmbedding = await embed(question);
  if (!qEmbedding) return [];

  const stored = await db.conceptEmbedding.findMany();
  if (stored.length === 0) return [];

  const scored = stored
    .filter(c => !seenIris.has(c.conceptIri))
    .map(c => {
      try {
        const vec = JSON.parse(c.embedding) as number[];
        return { ...c, score: cosineSimilarity(qEmbedding, vec) };
      } catch {
        return { ...c, score: 0 };
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(c => ({
    label:    c.label,
    question: toQuestion(c.label, c.type),
    iri:      c.conceptIri,
    type:     c.type,
    score:    c.score,
  }));
}

// ── SPARQL fallback path ────────────────────────────────────────────────────

async function sparqlRecommendations(
  relatedEntities: Array<{ iri: string; label: string; type: string }>,
  seenIris: Set<string>,
  limit: number,
): Promise<Recommendation[]> {
  if (relatedEntities.length === 0) return [];

  const sparql  = SparqlClient.createInMemory();
  const results: Recommendation[] = [];
  const seen    = new Set(seenIris);

  for (const entity of relatedEntities.slice(0, 3)) {
    try {
      const result = await sparql.query<{ item: string; label: string; type: string }>(
        Q.inferLearningNeeds(entity.iri)
      );
      for (const row of result.data) {
        if (seen.has(row.item)) continue;
        seen.add(row.item);
        results.push({
          label:    row.label,
          question: toQuestion(row.label, row.type ?? "concept"),
          iri:      row.item,
          type:     row.type ?? "concept",
          score:    0.5,
        });
      }
    } catch { /* GraphDB may be unavailable */ }
  }

  return results.slice(0, limit);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getRecommendations(opts: {
  question:        string;
  guestId:         string;
  relatedEntities: Array<{ iri: string; label: string; type: string }>;
  limit?:          number;
}): Promise<Recommendation[]> {
  const { question, guestId, relatedEntities, limit = 4 } = opts;

  // Build set of concept IRIs this user has already seen
  const progress = await db.conceptProgress.findMany({
    where: { guestId },
    select: { conceptIri: true },
  });
  const seenIris = new Set(progress.map(p => p.conceptIri));

  // Try vector path first
  const vectorRecs = await vectorRecommendations(question, seenIris, limit);
  if (vectorRecs.length >= 2) return vectorRecs.slice(0, limit);

  // Fall back to SPARQL
  const sparqlRecs = await sparqlRecommendations(relatedEntities, seenIris, limit);
  if (sparqlRecs.length > 0) return sparqlRecs.slice(0, limit);

  // Last resort: return the relatedEntities themselves as suggestions
  return relatedEntities
    .filter(e => !seenIris.has(e.iri))
    .slice(0, limit)
    .map(e => ({
      label:    e.label,
      question: toQuestion(e.label, e.type),
      iri:      e.iri,
      type:     e.type,
      score:    0.3,
    }));
}
