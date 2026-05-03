// Voyage AI embeddings client.
// Uses voyage-multilingual-2 (1024 dims) — ideal for Spanish/multilingual text.
// If VOYAGE_API_KEY is not set, all functions return null gracefully.

const API_KEY  = process.env.VOYAGE_API_KEY;
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const MODEL    = "voyage-multilingual-2";

export const EMBEDDING_DIMS = 1024;

async function voyageEmbed(inputs: string[]): Promise<number[][] | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body:    JSON.stringify({ model: MODEL, input: inputs }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map(d => d.embedding);
  } catch {
    return null;
  }
}

export async function embed(text: string): Promise<number[] | null> {
  const result = await voyageEmbed([text]);
  return result?.[0] ?? null;
}

export async function embedBatch(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  // Voyage allows up to 128 inputs per request
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += 128) chunks.push(texts.slice(i, i + 128));
  const results: number[][] = [];
  for (const chunk of chunks) {
    const res = await voyageEmbed(chunk);
    if (!res) return null;
    results.push(...res);
  }
  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
