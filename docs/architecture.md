# SemHum — Arquitectura del sistema

## Principio rector

> No construir "una IA que sabe filosofía".
> Construir una **infraestructura semántica para enseñar humanidades**.

La IA es solo la interfaz. El núcleo real es la ontología.

---

## Stack

```
┌─────────────────────────────────┐
│  Next.js 15 (App Router)        │  ← packages/web
│  TypeScript + Tailwind          │
└──────────────┬──────────────────┘
               │ fetch SSE
┌──────────────▼──────────────────┐
│  API Layer (Next.js Route)      │  ← /api/tutor
│  @semhum/api                    │
└──────────────┬──────────────────┘
               │
    ┌──────────▼──────────┐
    │  OntologyRAG        │  ← packages/api/src/rag
    │  (orquestador)      │
    └──────┬──────┬───────┘
           │      │
   ┌───────▼──┐  ┌▼────────────────┐
   │ SPARQL   │  │  Vector Search   │
   │ Client   │  │  (pgvector)      │
   └───────┬──┘  └─────────────────┘
           │
   ┌───────▼──────────────┐
   │  Triple Store        │  ← GraphDB / Jena
   │  OWL + Turtle        │
   └──────────────────────┘
           │
   ┌───────▼──────────────┐
   │  LLM Layer           │  ← Claude (Anthropic SDK)
   │  (tutor / interfaz)  │
   └──────────────────────┘
```

---

## Flujo de una pregunta

1. Alumno pregunta: *"¿Qué critica Nietzsche de Platón?"*
2. `OntologyRAG.detectEntities()` → identifica `phil:Nietzsche`, `phil:Plato`
3. SPARQL queries contra GraphDB:
   - `getPhilosopherContext(Nietzsche)` → sus influencias, críticas, conceptos
   - `inferLearningNeeds(Nihilism)` → prerrequisitos pedagógicos
4. Resultado: contexto estructurado + inferencias pedagógicas
5. `buildTutorUserPrompt()` → prompt enriquecido para el LLM
6. Claude responde guiado por contexto ontológico verificado
7. Frontend muestra respuesta + mapa de prerrequisitos

---

## Ontología (OWL + Turtle)

### Clases principales
- `sem:Philosopher` — autores filosóficos
- `sem:Concept` — conceptos filosóficos
- `sem:PhilosophicalSchool` — corrientes
- `sem:Work` — obras
- `sem:HistoricalPeriod` — períodos
- `sem:Problem` — problemas filosóficos abiertos

### Clases pedagógicas
- `ped:LearningLevel` — secondary / cbc / university / specialist
- `ped:LearningPath` — trayectorias de aprendizaje ordenadas
- `ped:Competency` — competencias educativas

### Relaciones clave
| Relación | Tipo | Uso pedagógico |
|---|---|---|
| `sem:presupposes` | Concept → Concept | Inferir prerrequisitos |
| `sem:critiques` | Philosopher → Philosopher | Contextualizar debates |
| `sem:influenced` | Philosopher → Philosopher | Genealogías conceptuales |
| `sem:develops` | Philosopher → Concept | Atribución de ideas |
| `sem:contrastsWith` | Concept → Concept | Aprendizaje por contraste |

---

## Fases del proyecto

### Fase 1 (actual) — Ontología filosófica
- [x] Clases y relaciones OWL (core)
- [x] 10 filósofos nucleares con relaciones
- [x] 25+ conceptos con prerrequisitos
- [x] Trayectorias de aprendizaje
- [ ] Cargar en GraphDB
- [ ] Validar con Protégé

### Fase 2 — Knowledge Graph completo
- [ ] Ampliar a 50+ filósofos
- [ ] Historia, ética, literatura
- [ ] Teología sistemática

### Fase 3 — RAG híbrido
- [ ] pgvector para textos primarios
- [ ] NER semántico para detección de entidades
- [ ] Combinar SPARQL + embeddings

### Fase 4 — Tutor IA
- [x] Streaming conversacional
- [x] Inferencia pedagógica básica
- [ ] Memoria de sesión / progreso del alumno

### Fase 5 — Sistema pedagógico completo
- [ ] Mapas conceptuales interactivos
- [ ] Evaluaciones adaptativas
- [ ] Analytics para docentes

---

## Variables de entorno

```env
ANTHROPIC_API_KEY=sk-ant-...
GRAPHDB_URL=http://localhost:7200
PGVECTOR_URL=postgresql://localhost:5432/semhum
```
