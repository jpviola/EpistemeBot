// Tipos base que espejean la ontología OWL
// Toda entidad tiene un IRI único del namespace semhum.edu

export type IRI = string;

export type LearningLevel = "secondary" | "cbc" | "university" | "specialist";

export interface Philosopher {
  iri: IRI;
  label: string;
  born?: number;
  died?: number;
  nationality?: string;
  description: string;
  periods: IRI[];
  schools: IRI[];
  develops: IRI[];       // → Concept
  critiques: IRI[];      // → Philosopher
  influenced: IRI[];     // → Philosopher
  works?: IRI[];         // → Work
}

export interface Concept {
  iri: IRI;
  label: string;
  altLabel?: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4;
  presupposes: IRI[];    // → Concept (prerequisito pedagógico)
  contrastsWith: IRI[];  // → Concept
  respondsTo: IRI[];     // → Problem
  developedBy: IRI[];    // → Philosopher (inversa de develops)
}

export interface PhilosophicalSchool {
  iri: IRI;
  label: string;
  description?: string;
  influenced: IRI[];     // → PhilosophicalSchool
}

export interface HistoricalPeriod {
  iri: IRI;
  label: string;
  description?: string;
}

export interface Problem {
  iri: IRI;
  label: string;
  description: string;
}

export interface LearningPath {
  iri: IRI;
  label: string;
  description?: string;
  steps: IRI[];          // Conceptos/Filósofos en orden
  targetConcept?: IRI;
  targetPhilosopher?: IRI;
  requiredLevel: LearningLevel;
}

// ─────────────────────────────────────────────
// Resultado de inferencia pedagógica
// ─────────────────────────────────────────────

export interface PedagogicalInference {
  /** Concepto o filósofo que el alumno no entiende */
  subject: IRI;
  /** Qué debe aprender primero (prerrequisitos) */
  prerequisites: Array<{ iri: IRI; label: string; reason: string }>;
  /** Lecturas relacionadas recomendadas */
  relatedReading: Array<{ iri: IRI; label: string; relation: string }>;
  /** Ruta de aprendizaje sugerida */
  suggestedPath?: LearningPath;
}

export interface OntologyQueryResult<T> {
  data: T[];
  queryTime: number;
  sparqlQuery?: string;
}
