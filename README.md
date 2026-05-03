# EpistemeBot

Tutor de humanidades impulsado por IA con búsqueda semántica ontológica. Combina un grafo de conocimiento (GraphDB/SPARQL), embeddings vectoriales (Voyage AI) y Claude de Anthropic para ofrecer una experiencia de aprendizaje personalizada en filosofía, historia, psicología, literatura, arte y ciencias sociales.

## Características

- **Tutor socrático** — respuestas enriquecidas con contexto ontológico y prerequisitos pedagógicos
- **Modo Debate** — el tutor desafía tesis con el método socrático
- **Recomendaciones semánticas** — chips "¿Seguir explorando?" basados en vector similarity (Voyage AI) con fallback a SPARQL
- **Gamificación** — XP, niveles, racha, badges y ranking global
- **Panel docente** — estadísticas de actividad, intereses declarados y listado de alumnos
- **Registro con roles** — estudiante (con intereses) o docente (con código de acceso)
- **Memphis Design System** — UI con tokens de color, sombras offset y tipografía bold

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16, React 19, CSS Modules (Memphis DS) |
| Auth | NextAuth v5 (Credentials provider, JWT) |
| Base de datos | SQLite via libSQL + Prisma 7 |
| LLM | Anthropic Claude (`claude-sonnet-4-6`) |
| Grafo de conocimiento | GraphDB + SPARQL (OWL/RDF ontología propia) |
| Embeddings | Voyage AI `voyage-multilingual-2` (1024 dims) |
| Monorepo | npm workspaces + Turborepo |

## Estructura

```
.
├── packages/
│   ├── api/                  # Lógica de dominio (SPARQL, RAG, prompts)
│   │   └── src/
│   │       ├── rag/          # OntologyRAG — enriquece preguntas con contexto
│   │       ├── sparql/       # Cliente SPARQL + queries
│   │       └── tutor/        # Prompt builder (modo tutor / debate)
│   └── web/                  # Aplicación Next.js
│       ├── prisma/           # Schema (Session, Message, User, Gamification…)
│       ├── scripts/          # seed-embeddings.ts
│       └── src/
│           ├── app/          # Pages + API routes
│           ├── components/   # TutorChat, Landing, TeacherDashboard…
│           └── lib/          # db, auth, embeddings, recommendations, gamification
├── ontology/                 # Ficheros TTL (filósofos, conceptos, historia…)
└── scripts/                  # load-ontology.sh
```

## Setup

### Requisitos

- Node.js ≥ 20
- GraphDB Community Edition (opcional — el sistema funciona sin él con fallback)

### Instalación

```bash
git clone https://github.com/jpviola/EpistemeBot.git
cd EpistemeBot
npm install
```

### Variables de entorno

Copia el ejemplo y completá con tus keys:

```bash
cp packages/web/.env.example packages/web/.env.local   # si existe
# o creá packages/web/.env.local manualmente
```

Contenido mínimo de `packages/web/.env.local`:

```env
# LLM (requerido)
ANTHROPIC_API_KEY=sk-ant-...

# Auth (requerido — cualquier string random de 32+ chars)
AUTH_SECRET=cambia_esto_por_un_string_random_seguro

# Código de acceso para registrar docentes
TEACHER_CODE=docente

# Base de datos (SQLite local, no cambiar en dev)
DATABASE_URL=file:./dev.db

# GraphDB (opcional — si no está corriendo, el tutor responde sin contexto ontológico)
GRAPHDB_URL=http://localhost:7200
GRAPHDB_REPO=senhum

# Voyage AI — vector search (opcional, habilita recomendaciones semánticas)
# Obtené tu key en https://www.voyageai.com/
# VOYAGE_API_KEY=pa-...
```

### Inicializar la base de datos

```bash
cd packages/web
npx prisma migrate dev
```

Esto crea `dev.db` con todas las tablas incluyendo badges y gamificación.

### Correr en desarrollo

```bash
# Desde la raíz del monorepo
npm run dev

# O directamente
cd packages/web && npm run dev
```

La app corre en [http://localhost:3000](http://localhost:3000).

## Activar recomendaciones vectoriales (Fase G)

Con `VOYAGE_API_KEY` configurada, corrés el seed para generar embeddings de los ~80 conceptos/filósofos de la ontología:

```bash
cd packages/web
VOYAGE_API_KEY=pa-... npx tsx scripts/seed-embeddings.ts
```

Después de eso, cada respuesta del tutor consulta `/api/recommendations` para mostrar chips de "¿Seguir explorando?" basados en similitud coseno. Sin la key, el sistema usa SPARQL + historial de ConceptProgress como fallback.

## Cargar la ontología en GraphDB

Si tenés GraphDB corriendo localmente:

```bash
# Crea el repositorio y carga los ficheros TTL
bash scripts/load-ontology.sh
```

Sin GraphDB el tutor igual funciona — simplemente responde sin el contexto semántico adicional.

## Build de producción

```bash
cd packages/web
npm run build
npm run start
```

## Fases implementadas

| Fase | Descripción | Estado |
|---|---|---|
| A | Ontología OWL + carga en GraphDB | ✅ |
| B | Tutor con RAG ontológico + SPARQL | ✅ |
| C | Gamificación (XP, niveles, badges, racha) | ✅ |
| D | Auth con roles (estudiante / docente) | ✅ |
| E | Expansión de la ontología | 🔄 continuo |
| F | Panel docente con estadísticas | ✅ |
| G | Vector search + recomendaciones (Voyage AI) | ✅ |
