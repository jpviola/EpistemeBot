// RAG híbrido: combina SPARQL (conocimiento estructurado)
// con vector search (textos, fuentes primarias).
// Este es el diferencial real del sistema.

import type { PedagogicalInference, LearningLevel } from "../ontology/types";
import { SparqlClient } from "../sparql/client";
import * as Q from "../sparql/queries";

const NAMESPACE = {
  con:  "https://semhum.edu/data/concepts/",
  phil: "https://semhum.edu/data/philosophers/",
  fig:  "https://semhum.edu/data/figures/",
  evt:  "https://semhum.edu/data/events/",
};

export class OntologyRAG {
  constructor(private readonly sparql: SparqlClient) {}

  // ── Enriquece una pregunta del usuario con contexto ontológico ──
  async buildContextForQuestion(
    question: string,
    level: LearningLevel
  ): Promise<{
    ontologicalContext: string;
    pedagogicalInferences: PedagogicalInference[];
    relatedEntities: string[];
  }> {
    const entities = await this.detectEntities(question);

    const contexts: string[] = [];
    const inferences: PedagogicalInference[] = [];

    for (const entity of entities) {
      const ctx = await this.getEntityContext(entity.iri, entity.type);
      contexts.push(ctx);

      if (entity.type === "concept") {
        const inf = await this.inferPedagogicalNeeds(entity.iri, level);
        inferences.push(inf);
      }
    }

    return {
      ontologicalContext: contexts.join("\n\n"),
      pedagogicalInferences: inferences,
      relatedEntities: entities.map((e) => e.label),
    };
  }

  // ── Inferencia pedagógica central ──────────────────────────────

  async inferPedagogicalNeeds(
    conceptIri: string,
    level: LearningLevel
  ): Promise<PedagogicalInference> {
    const result = await this.sparql.query<{
      item: string;
      label: string;
      type: string;
      difficulty: string;
    }>(Q.inferLearningNeeds(conceptIri));

    const levelDifficulty: Record<LearningLevel, number> = {
      secondary: 1,
      cbc: 2,
      university: 3,
      specialist: 4,
    };

    const maxDifficulty = levelDifficulty[level];

    const prerequisites = result.data
      .filter((r) => r.type === "prerequisite")
      .filter((r) => !r.difficulty || Number(r.difficulty) <= maxDifficulty)
      .map((r) => ({
        iri: r.item,
        label: r.label,
        reason: "Concepto previo necesario para comprender este tema.",
      }));

    const relatedReading = result.data
      .filter((r) => r.type === "contrast" || r.type === "author")
      .map((r) => ({
        iri: r.item,
        label: r.label,
        relation: r.type === "contrast" ? "contrasta con" : "desarrollado por",
      }));

    return {
      subject: conceptIri,
      prerequisites,
      relatedReading,
    };
  }

  // ── Contexto semántico para el prompt ──────────────────────────

  private async getEntityContext(
    iri: string,
    type: "philosopher" | "concept" | "figure" | "event" | string
  ): Promise<string> {
    if (type === "philosopher" || type === "figure") {
      const result = await this.sparql.query<{
        relatedLabel: string;
        relationType: string;
      }>(Q.getPhilosopherContext(iri));

      const lines = result.data.map(
        (r) => `- ${r.relationType}: ${r.relatedLabel}`
      );
      const shortId = iri.split("/").pop() ?? iri;
      return `[Contexto ontológico: ${shortId}]\n${lines.join("\n")}`;
    }

    if (type === "concept") {
      const result = await this.sparql.query<{
        prereq: string;
        prereqLabel: string;
      }>(Q.getConceptPrerequisites(iri));

      const prereqs = result.data.map((r) => r.prereqLabel).join(", ");
      const shortId = iri.split("/").pop() ?? iri;
      return prereqs
        ? `[Prerrequisitos de ${shortId}]: ${prereqs}`
        : `[Concepto: ${shortId}]`;
    }

    if (type === "event") {
      const shortId = iri.split("/").pop() ?? iri;
      return `[Evento histórico: ${shortId}]`;
    }

    return "";
  }

  // ── Detección de entidades ─────────────────────────────────────

  private async detectEntities(
    question: string
  ): Promise<Array<{ iri: string; label: string; type: string }>> {
    const knownEntities: Array<{ keywords: string[]; iri: string; label: string; type: string }> = [

      // ── FILÓSOFOS ───────────────────────────────────────────────
      { keywords: ["nietzsche"], iri: `${NAMESPACE.phil}Nietzsche`, label: "Nietzsche", type: "philosopher" },
      { keywords: ["platón", "platon", "plato"], iri: `${NAMESPACE.phil}Plato`, label: "Platón", type: "philosopher" },
      { keywords: ["kant"], iri: `${NAMESPACE.phil}Kant`, label: "Kant", type: "philosopher" },
      { keywords: ["heidegger"], iri: `${NAMESPACE.phil}Heidegger`, label: "Heidegger", type: "philosopher" },
      { keywords: ["levinas"], iri: `${NAMESPACE.phil}Levinas`, label: "Levinas", type: "philosopher" },
      { keywords: ["aristóteles", "aristoteles", "aristotle"], iri: `${NAMESPACE.phil}Aristotle`, label: "Aristóteles", type: "philosopher" },
      { keywords: ["descartes"], iri: `${NAMESPACE.phil}Descartes`, label: "Descartes", type: "philosopher" },
      { keywords: ["hegel"], iri: `${NAMESPACE.phil}Hegel`, label: "Hegel", type: "philosopher" },
      { keywords: ["marx", "marxismo", "marxist"], iri: `${NAMESPACE.phil}Marx`, label: "Marx", type: "philosopher" },
      { keywords: ["sartre"], iri: `${NAMESPACE.phil}Sartre`, label: "Sartre", type: "philosopher" },
      { keywords: ["beauvoir", "de beauvoir"], iri: `${NAMESPACE.phil}Beauvoir`, label: "Simone de Beauvoir", type: "philosopher" },
      { keywords: ["foucault"], iri: `${NAMESPACE.phil}Foucault`, label: "Foucault", type: "philosopher" },
      { keywords: ["derrida"], iri: `${NAMESPACE.phil}Derrida`, label: "Derrida", type: "philosopher" },
      { keywords: ["wittgenstein"], iri: `${NAMESPACE.phil}Wittgenstein`, label: "Wittgenstein", type: "philosopher" },
      { keywords: ["locke"], iri: `${NAMESPACE.phil}Locke`, label: "Locke", type: "philosopher" },
      { keywords: ["rousseau"], iri: `${NAMESPACE.phil}Rousseau`, label: "Rousseau", type: "philosopher" },
      { keywords: ["spinoza"], iri: `${NAMESPACE.phil}Spinoza`, label: "Spinoza", type: "philosopher" },
      { keywords: ["gramsci"], iri: `${NAMESPACE.phil}Gramsci`, label: "Gramsci", type: "philosopher" },

      // ── PSICÓLOGOS / PSICOANALISTAS ─────────────────────────────
      { keywords: ["freud", "freudiano"], iri: `${NAMESPACE.fig}Freud`, label: "Freud", type: "figure" },
      { keywords: ["lacan", "lacaniano"], iri: `${NAMESPACE.fig}Lacan`, label: "Lacan", type: "figure" },
      { keywords: ["jung", "junguiano"], iri: `${NAMESPACE.fig}Jung`, label: "Jung", type: "figure" },
      { keywords: ["piaget"], iri: `${NAMESPACE.fig}Piaget`, label: "Piaget", type: "figure" },
      { keywords: ["vygotsky", "vigotsky", "vygotski"], iri: `${NAMESPACE.fig}Vygotsky`, label: "Vygotsky", type: "figure" },
      { keywords: ["fromm"], iri: `${NAMESPACE.fig}Fromm`, label: "Erich Fromm", type: "figure" },
      { keywords: ["winnicott"], iri: `${NAMESPACE.fig}Winnicott`, label: "Winnicott", type: "figure" },
      { keywords: ["klein", "melanie klein"], iri: `${NAMESPACE.fig}Klein`, label: "Melanie Klein", type: "figure" },

      // ── SOCIÓLOGOS / CIENTISTAS SOCIALES ────────────────────────
      { keywords: ["durkheim"], iri: `${NAMESPACE.fig}Durkheim`, label: "Durkheim", type: "figure" },
      { keywords: ["weber", "max weber"], iri: `${NAMESPACE.fig}Weber`, label: "Max Weber", type: "figure" },
      { keywords: ["bourdieu"], iri: `${NAMESPACE.fig}Bourdieu`, label: "Bourdieu", type: "figure" },
      { keywords: ["simmel"], iri: `${NAMESPACE.fig}Simmel`, label: "Georg Simmel", type: "figure" },
      { keywords: ["habermas"], iri: `${NAMESPACE.fig}Habermas`, label: "Habermas", type: "figure" },

      // ── FIGURAS HISTÓRICAS ──────────────────────────────────────
      { keywords: ["perón", "peron", "peronismo", "peronista"], iri: `${NAMESPACE.fig}Peron`, label: "Perón", type: "figure" },
      { keywords: ["san martín", "san martin", "josé de san martín"], iri: `${NAMESPACE.fig}SanMartin`, label: "San Martín", type: "figure" },
      { keywords: ["rosas", "juan manuel de rosas"], iri: `${NAMESPACE.fig}Rosas`, label: "Juan Manuel de Rosas", type: "figure" },
      { keywords: ["sarmiento"], iri: `${NAMESPACE.fig}Sarmiento`, label: "Sarmiento", type: "figure" },
      { keywords: ["bolívar", "bolivar", "simón bolívar"], iri: `${NAMESPACE.fig}Bolivar`, label: "Simón Bolívar", type: "figure" },
      { keywords: ["che guevara", "guevara", "ernesto guevara"], iri: `${NAMESPACE.fig}Guevara`, label: "Che Guevara", type: "figure" },
      { keywords: ["napoleon", "napoleón"], iri: `${NAMESPACE.fig}Napoleon`, label: "Napoleón", type: "figure" },
      { keywords: ["robespierre"], iri: `${NAMESPACE.fig}Robespierre`, label: "Robespierre", type: "figure" },

      // ── ESCRITORES / LITERATOS ──────────────────────────────────
      { keywords: ["borges", "jorge luis borges"], iri: `${NAMESPACE.fig}Borges`, label: "Borges", type: "figure" },
      { keywords: ["cortázar", "cortazar", "julio cortázar"], iri: `${NAMESPACE.fig}Cortazar`, label: "Cortázar", type: "figure" },
      { keywords: ["garcía márquez", "garcia marquez", "gabo", "cien años de soledad"], iri: `${NAMESPACE.fig}GarciaMarquez`, label: "García Márquez", type: "figure" },
      { keywords: ["kafka", "kafkiano"], iri: `${NAMESPACE.fig}Kafka`, label: "Kafka", type: "figure" },
      { keywords: ["camus"], iri: `${NAMESPACE.fig}Camus`, label: "Camus", type: "figure" },
      { keywords: ["dostoievski", "dostoevsky", "dostoiewski"], iri: `${NAMESPACE.fig}Dostoevsky`, label: "Dostoievski", type: "figure" },
      { keywords: ["shakespeare"], iri: `${NAMESPACE.fig}Shakespeare`, label: "Shakespeare", type: "figure" },
      { keywords: ["cervantes", "don quijote", "quijote"], iri: `${NAMESPACE.fig}Cervantes`, label: "Cervantes", type: "figure" },

      // ── CONCEPTOS FILOSÓFICOS ───────────────────────────────────
      { keywords: ["alteridad", "alterity", "otredad"], iri: `${NAMESPACE.con}Alterity`, label: "Alteridad", type: "concept" },
      { keywords: ["nihilismo", "nihilism"], iri: `${NAMESPACE.con}Nihilism`, label: "Nihilismo", type: "concept" },
      { keywords: ["dasein"], iri: `${NAMESPACE.con}Dasein`, label: "Dasein", type: "concept" },
      { keywords: ["voluntad de poder", "will to power"], iri: `${NAMESPACE.con}WillToPower`, label: "Voluntad de poder", type: "concept" },
      { keywords: ["imperativo categórico", "imperativo categorico", "categorical imperative"], iri: `${NAMESPACE.con}CategoricalImperative`, label: "Imperativo categórico", type: "concept" },
      { keywords: ["dialéctica", "dialectica", "dialecto hegeliano"], iri: `${NAMESPACE.con}Dialectics`, label: "Dialéctica", type: "concept" },
      { keywords: ["existencialismo", "existencialism"], iri: `${NAMESPACE.con}Existentialism`, label: "Existencialismo", type: "concept" },
      { keywords: ["fenomenología", "fenomenologia", "phenomenology"], iri: `${NAMESPACE.con}Phenomenology`, label: "Fenomenología", type: "concept" },
      { keywords: ["epistemología", "epistemologia", "epistemology"], iri: `${NAMESPACE.con}Epistemology`, label: "Epistemología", type: "concept" },
      { keywords: ["ontología", "ontologia", "ser", "ontology"], iri: `${NAMESPACE.con}Ontology`, label: "Ontología", type: "concept" },
      { keywords: ["ética", "etica", "ethics", "moral"], iri: `${NAMESPACE.con}Ethics`, label: "Ética", type: "concept" },
      { keywords: ["libertad", "freedom", "libre albedrío"], iri: `${NAMESPACE.con}Freedom`, label: "Libertad", type: "concept" },

      // ── CONCEPTOS PSICOLÓGICOS ──────────────────────────────────
      { keywords: ["inconsciente", "inconciente", "unconscious"], iri: `${NAMESPACE.con}Unconscious`, label: "Inconsciente", type: "concept" },
      { keywords: ["psicoanálisis", "psicoanalisis", "psychoanalysis"], iri: `${NAMESPACE.con}Psychoanalysis`, label: "Psicoanálisis", type: "concept" },
      { keywords: ["complejo de edipo", "edipo", "oedipus"], iri: `${NAMESPACE.con}OedipusComplex`, label: "Complejo de Edipo", type: "concept" },
      { keywords: ["zona de desarrollo próximo", "zdp", "zone of proximal development"], iri: `${NAMESPACE.con}ZPD`, label: "Zona de desarrollo próximo", type: "concept" },
      { keywords: ["superyó", "superyo", "superego"], iri: `${NAMESPACE.con}Superego`, label: "Superyó", type: "concept" },
      { keywords: ["transferencia", "transference"], iri: `${NAMESPACE.con}Transference`, label: "Transferencia", type: "concept" },
      { keywords: ["arquetipo", "archetype"], iri: `${NAMESPACE.con}Archetype`, label: "Arquetipo", type: "concept" },

      // ── CONCEPTOS SOCIOLÓGICOS ──────────────────────────────────
      { keywords: ["habitus"], iri: `${NAMESPACE.con}Habitus`, label: "Habitus", type: "concept" },
      { keywords: ["capital cultural", "capital social"], iri: `${NAMESPACE.con}CulturalCapital`, label: "Capital cultural", type: "concept" },
      { keywords: ["hegemonía", "hegemonia", "hegemony"], iri: `${NAMESPACE.con}Hegemony`, label: "Hegemonía", type: "concept" },
      { keywords: ["hecho social", "social fact"], iri: `${NAMESPACE.con}SocialFact`, label: "Hecho social", type: "concept" },
      { keywords: ["anomia", "anomie"], iri: `${NAMESPACE.con}Anomie`, label: "Anomia", type: "concept" },
      { keywords: ["ideología", "ideologia", "ideology"], iri: `${NAMESPACE.con}Ideology`, label: "Ideología", type: "concept" },
      { keywords: ["burocracia", "bureaucracy"], iri: `${NAMESPACE.con}Bureaucracy`, label: "Burocracia", type: "concept" },

      // ── EVENTOS HISTÓRICOS ──────────────────────────────────────
      { keywords: ["revolución francesa", "revolucion francesa", "french revolution"], iri: `${NAMESPACE.evt}FrenchRevolution`, label: "Revolución Francesa", type: "event" },
      { keywords: ["segunda guerra", "segunda guerra mundial", "world war ii"], iri: `${NAMESPACE.evt}WWII`, label: "Segunda Guerra Mundial", type: "event" },
      { keywords: ["primera guerra", "primera guerra mundial", "world war i"], iri: `${NAMESPACE.evt}WWI`, label: "Primera Guerra Mundial", type: "event" },
      { keywords: ["dictadura", "proceso", "proceso de reorganización nacional", "último golpe"], iri: `${NAMESPACE.evt}ArgentineDictatorship`, label: "Dictadura cívico-militar argentina (1976-1983)", type: "event" },
      { keywords: ["revolución de mayo", "mayo de 1810", "25 de mayo"], iri: `${NAMESPACE.evt}MayRevolution`, label: "Revolución de Mayo", type: "event" },
      { keywords: ["peronismo", "primer peronismo", "justicialismo"], iri: `${NAMESPACE.evt}Peronism`, label: "Peronismo", type: "event" },
      { keywords: ["independencia argentina", "9 de julio"], iri: `${NAMESPACE.evt}ArgentineIndependence`, label: "Independencia Argentina", type: "event" },
      { keywords: ["holocausto", "shoah", "holocaust"], iri: `${NAMESPACE.evt}Holocaust`, label: "Holocausto", type: "event" },
      { keywords: ["guerra fría", "guerra fria", "cold war"], iri: `${NAMESPACE.evt}ColdWar`, label: "Guerra Fría", type: "event" },
      { keywords: ["colonialismo", "colonialismo", "colonization", "conquista de america"], iri: `${NAMESPACE.evt}Colonialism`, label: "Colonialismo", type: "event" },
    ];

    const lower = question.toLowerCase();
    return knownEntities.filter((e) =>
      e.keywords.some((kw) => lower.includes(kw))
    );
  }
}
