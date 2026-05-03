// Cliente SPARQL para GraphDB.
// En desarrollo puede usar oxigraph (en memoria) para no necesitar
// levantar GraphDB localmente.

import type { OntologyQueryResult } from "../ontology/types";

interface SparqlBinding {
  [key: string]: { type: string; value: string; lang?: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

export class SparqlClient {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query<T = Record<string, string>>(
    sparql: string
  ): Promise<OntologyQueryResult<T>> {
    const start = Date.now();

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/sparql-results+json",
      },
      body: sparql,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SPARQL query failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as SparqlResponse;
    const data = json.results.bindings.map(flattenBinding) as T[];

    return { data, queryTime: Date.now() - start, sparqlQuery: sparql };
  }

  // Para testear en desarrollo sin GraphDB
  static createInMemory(): SparqlClient {
    const base = (process.env.GRAPHDB_URL ?? "http://localhost:7200").replace(/\/$/, "");
    const repo = process.env.GRAPHDB_REPO ?? "senhum";
    const url = `${base}/repositories/${repo}`;
    return new SparqlClient(url);
  }
}

function flattenBinding(binding: SparqlBinding): Record<string, string> {
  return Object.fromEntries(
    Object.entries(binding).map(([k, v]) => [k, v.value])
  );
}
