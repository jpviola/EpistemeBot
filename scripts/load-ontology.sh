#!/bin/bash
# Carga la ontología en GraphDB.
# Prerequisito: GraphDB corriendo en localhost:7200
# con repositorio "semhum" creado.

GRAPHDB_URL="${GRAPHDB_URL:-http://localhost:7200}"
REPO="${GRAPHDB_REPO:-senhum}"

echo "Cargando ontología en GraphDB ($GRAPHDB_URL/repositories/$REPO)..."

load_ttl() {
  local file="$1"
  local graph="$2"
  echo "  → $file"
  curl -s -X POST \
    -H "Content-Type: text/turtle" \
    "${GRAPHDB_URL}/repositories/${REPO}/statements?context=%3C${graph}%3E" \
    --data-binary "@${file}"
}

# Core ontology
load_ttl "ontology/core/philosophy.ttl" "https://semhum.edu/graphs/core"

# Domain data
load_ttl "ontology/domains/philosophers.ttl" "https://semhum.edu/graphs/philosophers"
load_ttl "ontology/domains/concepts.ttl"     "https://semhum.edu/graphs/concepts"
load_ttl "ontology/domains/learning-paths.ttl" "https://semhum.edu/graphs/pedagogy"

echo "Ontología cargada correctamente."
