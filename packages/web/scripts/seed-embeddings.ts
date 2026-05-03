/**
 * Phase G — Seed concept embeddings
 *
 * Generates Voyage AI embeddings for every ontology entity and stores them
 * in the ConceptEmbedding table (SQLite, as JSON text).
 *
 * Usage (from packages/web):
 *   VOYAGE_API_KEY=xxx npx tsx scripts/seed-embeddings.ts
 *
 * Safe to re-run: uses upsert (idempotent).
 */

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient }  from "../generated/prisma/client";
import path   from "node:path";
import { pathToFileURL } from "node:url";

// ── Inline entity catalogue (mirrors ontology-rag.ts detectEntities) ────────

const NAMESPACE = {
  con:  "https://semhum.edu/data/concepts/",
  phil: "https://semhum.edu/data/philosophers/",
  fig:  "https://semhum.edu/data/figures/",
  evt:  "https://semhum.edu/data/events/",
};

const ENTITIES: Array<{ iri: string; label: string; type: string; description: string }> = [
  // Filósofos
  { iri: `${NAMESPACE.phil}Nietzsche`,   label: "Nietzsche",           type: "philosopher", description: "Filósofo alemán, voluntad de poder, nihilismo, eterno retorno" },
  { iri: `${NAMESPACE.phil}Plato`,       label: "Platón",              type: "philosopher", description: "Filósofo griego, teoría de las ideas, filosofía política" },
  { iri: `${NAMESPACE.phil}Kant`,        label: "Kant",                type: "philosopher", description: "Filósofo alemán, imperativo categórico, crítica de la razón pura" },
  { iri: `${NAMESPACE.phil}Heidegger`,   label: "Heidegger",           type: "philosopher", description: "Filósofo alemán, Dasein, ser-en-el-mundo, fenomenología" },
  { iri: `${NAMESPACE.phil}Levinas`,     label: "Levinas",             type: "philosopher", description: "Filósofo judío-lituano, ética de la alteridad, el rostro del Otro" },
  { iri: `${NAMESPACE.phil}Aristotle`,   label: "Aristóteles",         type: "philosopher", description: "Filósofo griego, lógica, ética, política, metafísica" },
  { iri: `${NAMESPACE.phil}Descartes`,   label: "Descartes",           type: "philosopher", description: "Filósofo francés, cogito ergo sum, dualismo mente-cuerpo" },
  { iri: `${NAMESPACE.phil}Hegel`,       label: "Hegel",               type: "philosopher", description: "Filósofo alemán, dialéctica, fenomenología del espíritu, idealismo absoluto" },
  { iri: `${NAMESPACE.phil}Marx`,        label: "Marx",                type: "philosopher", description: "Filósofo y economista alemán, materialismo histórico, plusvalía, capitalismo" },
  { iri: `${NAMESPACE.phil}Sartre`,      label: "Sartre",              type: "philosopher", description: "Filósofo francés, existencialismo, la existencia precede a la esencia" },
  { iri: `${NAMESPACE.phil}Beauvoir`,    label: "Simone de Beauvoir",  type: "philosopher", description: "Filósofa francesa, feminismo existencialista, El segundo sexo" },
  { iri: `${NAMESPACE.phil}Foucault`,    label: "Foucault",            type: "philosopher", description: "Filósofo francés, biopolítica, poder-saber, genealogía" },
  { iri: `${NAMESPACE.phil}Derrida`,     label: "Derrida",             type: "philosopher", description: "Filósofo francés, deconstrucción, posmodernismo, différance" },
  { iri: `${NAMESPACE.phil}Wittgenstein`,label: "Wittgenstein",        type: "philosopher", description: "Filósofo austríaco, filosofía del lenguaje, juegos de lenguaje" },
  { iri: `${NAMESPACE.phil}Locke`,       label: "Locke",               type: "philosopher", description: "Filósofo inglés, empirismo, liberalismo político, tabula rasa" },
  { iri: `${NAMESPACE.phil}Rousseau`,    label: "Rousseau",            type: "philosopher", description: "Filósofo ginebrino, contrato social, voluntad general, bien natural" },
  { iri: `${NAMESPACE.phil}Spinoza`,     label: "Spinoza",             type: "philosopher", description: "Filósofo holandés, panteísmo, Deus sive Natura, monismo" },
  { iri: `${NAMESPACE.phil}Gramsci`,     label: "Gramsci",             type: "philosopher", description: "Filósofo italiano, hegemonía cultural, intelectual orgánico, cuadernos de la cárcel" },
  // Figuras
  { iri: `${NAMESPACE.fig}Freud`,        label: "Freud",               type: "figure", description: "Padre del psicoanálisis, inconsciente, complejo de Edipo, interpretación de los sueños" },
  { iri: `${NAMESPACE.fig}Lacan`,        label: "Lacan",               type: "figure", description: "Psicoanalista francés, estadio del espejo, orden simbólico, demanda y deseo" },
  { iri: `${NAMESPACE.fig}Jung`,         label: "Jung",                type: "figure", description: "Psicólogo suizo, inconsciente colectivo, arquetipos, individuación" },
  { iri: `${NAMESPACE.fig}Piaget`,       label: "Piaget",              type: "figure", description: "Psicólogo suizo, epistemología genética, etapas del desarrollo cognitivo" },
  { iri: `${NAMESPACE.fig}Vygotsky`,     label: "Vygotsky",            type: "figure", description: "Psicólogo soviético, zona de desarrollo próximo, aprendizaje sociocultural" },
  { iri: `${NAMESPACE.fig}Fromm`,        label: "Erich Fromm",         type: "figure", description: "Psicoanalista humanista, el miedo a la libertad, el arte de amar" },
  { iri: `${NAMESPACE.fig}Winnicott`,    label: "Winnicott",           type: "figure", description: "Pediatra y psicoanalista, espacio transicional, madre suficientemente buena" },
  { iri: `${NAMESPACE.fig}Klein`,        label: "Melanie Klein",       type: "figure", description: "Psicoanalista austríaca, relaciones de objeto, posición depresiva" },
  { iri: `${NAMESPACE.fig}Durkheim`,     label: "Durkheim",            type: "figure", description: "Sociólogo francés, hecho social, anomia, suicidio, solidaridad" },
  { iri: `${NAMESPACE.fig}Weber`,        label: "Max Weber",           type: "figure", description: "Sociólogo alemán, ética protestante, burocracia, tipos de dominación" },
  { iri: `${NAMESPACE.fig}Bourdieu`,     label: "Bourdieu",            type: "figure", description: "Sociólogo francés, habitus, capital cultural, campo social" },
  { iri: `${NAMESPACE.fig}Simmel`,       label: "Georg Simmel",        type: "figure", description: "Sociólogo alemán, sociología formal, dinero y modernidad" },
  { iri: `${NAMESPACE.fig}Habermas`,     label: "Habermas",            type: "figure", description: "Filósofo alemán, acción comunicativa, esfera pública, modernidad" },
  { iri: `${NAMESPACE.fig}Peron`,        label: "Perón",               type: "figure", description: "Presidente argentino, peronismo, justicialismo, movimiento obrero" },
  { iri: `${NAMESPACE.fig}SanMartin`,    label: "San Martín",          type: "figure", description: "Libertador argentino, cruce de los Andes, independencia sudamericana" },
  { iri: `${NAMESPACE.fig}Rosas`,        label: "Juan Manuel de Rosas", type: "figure", description: "Caudillo federal argentino, Confederación Argentina, siglo XIX" },
  { iri: `${NAMESPACE.fig}Sarmiento`,    label: "Sarmiento",           type: "figure", description: "Político argentino, civilización vs barbarie, educación pública" },
  { iri: `${NAMESPACE.fig}Bolivar`,      label: "Simón Bolívar",       type: "figure", description: "Libertador latinoamericano, Gran Colombia, independencia de América del Sur" },
  { iri: `${NAMESPACE.fig}Guevara`,      label: "Che Guevara",         type: "figure", description: "Guerrillero marxista, revolución cubana, internacionalismo" },
  { iri: `${NAMESPACE.fig}Napoleon`,     label: "Napoleón",            type: "figure", description: "Emperador francés, código napoleónico, guerras napoleónicas" },
  { iri: `${NAMESPACE.fig}Robespierre`,  label: "Robespierre",         type: "figure", description: "Líder jacobino, Revolución Francesa, el Terror" },
  { iri: `${NAMESPACE.fig}Borges`,       label: "Borges",              type: "figure", description: "Escritor argentino, laberinto, ficciones, cuentos fantásticos" },
  { iri: `${NAMESPACE.fig}Cortazar`,     label: "Cortázar",            type: "figure", description: "Escritor argentino, realismo fantástico, Rayuela, cuentos" },
  { iri: `${NAMESPACE.fig}GarciaMarquez`,label: "García Márquez",      type: "figure", description: "Escritor colombiano, realismo mágico, Cien años de soledad" },
  { iri: `${NAMESPACE.fig}Kafka`,        label: "Kafka",               type: "figure", description: "Escritor checo, alienación, absurdo, La metamorfosis, El proceso" },
  { iri: `${NAMESPACE.fig}Camus`,        label: "Camus",               type: "figure", description: "Escritor francés, absurdismo, El extranjero, La peste" },
  { iri: `${NAMESPACE.fig}Dostoevsky`,   label: "Dostoievski",         type: "figure", description: "Escritor ruso, psicología profunda, Crimen y castigo, El idiota" },
  { iri: `${NAMESPACE.fig}Shakespeare`,  label: "Shakespeare",         type: "figure", description: "Escritor inglés, tragedias, comedias, Hamlet, Macbeth" },
  { iri: `${NAMESPACE.fig}Cervantes`,    label: "Cervantes",           type: "figure", description: "Escritor español, Don Quijote, novela moderna" },
  // Conceptos filosóficos
  { iri: `${NAMESPACE.con}Alterity`,            label: "Alteridad",              type: "concept", description: "Reconocimiento del Otro como irreductiblemente diferente, ética de la relación" },
  { iri: `${NAMESPACE.con}Nihilism`,            label: "Nihilismo",              type: "concept", description: "Negación de valores morales y verdades absolutas, Nietzsche" },
  { iri: `${NAMESPACE.con}Dasein`,              label: "Dasein",                 type: "concept", description: "Ser-ahí, modo de existencia humana, Heidegger, existencialismo ontológico" },
  { iri: `${NAMESPACE.con}WillToPower`,         label: "Voluntad de poder",      type: "concept", description: "Fuerza creadora y autoafirmadora, Nietzsche, vitalismo" },
  { iri: `${NAMESPACE.con}CategoricalImperative`,label: "Imperativo categórico", type: "concept", description: "Principio moral universal de Kant, actúa solo según máximas universalizables" },
  { iri: `${NAMESPACE.con}Dialectics`,          label: "Dialéctica",             type: "concept", description: "Tesis, antítesis, síntesis; Hegel, Marx, movimiento del pensamiento" },
  { iri: `${NAMESPACE.con}Existentialism`,      label: "Existencialismo",        type: "concept", description: "La existencia precede a la esencia, libertad radical, Sartre, Camus" },
  { iri: `${NAMESPACE.con}Phenomenology`,       label: "Fenomenología",          type: "concept", description: "Estudio de la experiencia consciente, Husserl, Heidegger, Merleau-Ponty" },
  { iri: `${NAMESPACE.con}Epistemology`,        label: "Epistemología",          type: "concept", description: "Teoría del conocimiento, qué podemos saber y cómo, límites del conocimiento" },
  { iri: `${NAMESPACE.con}Ontology`,            label: "Ontología",              type: "concept", description: "Estudio del ser en cuanto ser, metafísica fundamental" },
  { iri: `${NAMESPACE.con}Ethics`,              label: "Ética",                  type: "concept", description: "Filosofía moral, principios del bien y el mal, virtud, deber, consecuencias" },
  { iri: `${NAMESPACE.con}Freedom`,             label: "Libertad",               type: "concept", description: "Capacidad de elegir, libre albedrío, determinismo, autonomía moral" },
  // Conceptos psicológicos
  { iri: `${NAMESPACE.con}Unconscious`,         label: "Inconsciente",           type: "concept", description: "Procesos mentales no conscientes, Freud, Lacan, deseo reprimido" },
  { iri: `${NAMESPACE.con}Psychoanalysis`,      label: "Psicoanálisis",          type: "concept", description: "Teoría y terapia psicoanalítica, inconsciente, transferencia, interpretación" },
  { iri: `${NAMESPACE.con}OedipusComplex`,      label: "Complejo de Edipo",      type: "concept", description: "Conflicto edípico, Freud, relaciones parentales, desarrollo psicosexual" },
  { iri: `${NAMESPACE.con}ZPD`,                 label: "Zona de desarrollo próximo", type: "concept", description: "Diferencia entre lo que un niño puede hacer solo y con ayuda, Vygotsky" },
  { iri: `${NAMESPACE.con}Superego`,            label: "Superyó",                type: "concept", description: "Instancia moral interiorizada, Freud, conciencia moral, censura psíquica" },
  { iri: `${NAMESPACE.con}Transference`,        label: "Transferencia",          type: "concept", description: "Desplazamiento de emociones del pasado al analista, psicoanálisis" },
  { iri: `${NAMESPACE.con}Archetype`,           label: "Arquetipo",              type: "concept", description: "Imágenes universales del inconsciente colectivo, Jung" },
  // Conceptos sociológicos
  { iri: `${NAMESPACE.con}Habitus`,             label: "Habitus",                type: "concept", description: "Disposiciones incorporadas por la socialización, Bourdieu" },
  { iri: `${NAMESPACE.con}CulturalCapital`,     label: "Capital cultural",       type: "concept", description: "Recursos culturales y educativos, Bourdieu, reproducción social" },
  { iri: `${NAMESPACE.con}Hegemony`,            label: "Hegemonía",              type: "concept", description: "Dominación cultural y política, Gramsci, consentimiento de los dominados" },
  { iri: `${NAMESPACE.con}SocialFact`,          label: "Hecho social",           type: "concept", description: "Fenómenos sociales externos e independientes, Durkheim" },
  { iri: `${NAMESPACE.con}Anomie`,              label: "Anomia",                 type: "concept", description: "Ausencia de normas reguladoras, Durkheim, desorientación social" },
  { iri: `${NAMESPACE.con}Ideology`,            label: "Ideología",              type: "concept", description: "Sistema de ideas y creencias que legitiman el poder, Marx, Althusser" },
  { iri: `${NAMESPACE.con}Bureaucracy`,         label: "Burocracia",             type: "concept", description: "Organización racional-legal, Weber, jerarquía, normas escritas" },
  // Eventos
  { iri: `${NAMESPACE.evt}FrenchRevolution`,    label: "Revolución Francesa",    type: "event", description: "1789, caída del Antiguo Régimen, derechos del hombre, liberalismo" },
  { iri: `${NAMESPACE.evt}WWII`,                label: "Segunda Guerra Mundial", type: "event", description: "1939-1945, fascismo, Holocausto, descolonización, posguerra" },
  { iri: `${NAMESPACE.evt}WWI`,                 label: "Primera Guerra Mundial", type: "event", description: "1914-1918, imperialismo, nacionalismo, guerra de trincheras" },
  { iri: `${NAMESPACE.evt}ArgentineDictatorship`, label: "Dictadura cívico-militar argentina", type: "event", description: "1976-1983, terrorismo de estado, desaparecidos, Proceso de Reorganización Nacional" },
  { iri: `${NAMESPACE.evt}MayRevolution`,       label: "Revolución de Mayo",     type: "event", description: "1810, inicio del proceso emancipador argentino, Primera Junta" },
  { iri: `${NAMESPACE.evt}Peronism`,            label: "Peronismo",              type: "event", description: "Movimiento político argentino, Perón, justicia social, sindicalismo" },
  { iri: `${NAMESPACE.evt}ArgentineIndependence`, label: "Independencia Argentina", type: "event", description: "9 de julio de 1816, Congreso de Tucumán, emancipación del Virreinato del Río de la Plata" },
  { iri: `${NAMESPACE.evt}Holocaust`,           label: "Holocausto",             type: "event", description: "Genocidio de judíos y otras minorías por el nazismo, Shoah, memoria" },
  { iri: `${NAMESPACE.evt}ColdWar`,             label: "Guerra Fría",            type: "event", description: "1947-1991, tensión entre EEUU y URSS, carrera armamentista, capitalismo vs comunismo" },
  { iri: `${NAMESPACE.evt}Colonialism`,         label: "Colonialismo",           type: "event", description: "Dominación europea de América, Africa y Asia, conquista, extracción, decolonialidad" },
];

// ── Embeddings ───────────────────────────────────────────────────────────────

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_MODEL   = "voyage-multilingual-2";
const BATCH_SIZE     = 64;

async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY is not set");
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VOYAGE_API_KEY}` },
    body:    JSON.stringify({ model: VOYAGE_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`Voyage AI error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data.map(d => d.embedding);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!VOYAGE_API_KEY) {
    console.error("❌  VOYAGE_API_KEY is required. Get one at https://www.voyageai.com/");
    process.exit(1);
  }

  const dbFile  = path.resolve(process.cwd(), "dev.db");
  const url     = pathToFileURL(dbFile).href;
  const adapter = new PrismaLibSql({ url });
  const db      = new PrismaClient({ adapter });

  console.log(`\n🔍 Seeding ${ENTITIES.length} concept embeddings...\n`);
  let done = 0;

  for (let i = 0; i < ENTITIES.length; i += BATCH_SIZE) {
    const batch  = ENTITIES.slice(i, i + BATCH_SIZE);
    const texts  = batch.map(e => `${e.label}: ${e.description}`);
    const vecs   = await embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      const entity = batch[j];
      await db.conceptEmbedding.upsert({
        where:  { conceptIri: entity.iri },
        create: { conceptIri: entity.iri, label: entity.label, type: entity.type, embedding: JSON.stringify(vecs[j]) },
        update: { label: entity.label, type: entity.type, embedding: JSON.stringify(vecs[j]) },
      });
      done++;
      process.stdout.write(`\r  ${done}/${ENTITIES.length} — ${entity.label}          `);
    }
  }

  console.log(`\n\n✅ Done! ${done} embeddings saved to dev.db`);
  await db.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
