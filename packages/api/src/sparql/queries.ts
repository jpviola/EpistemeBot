// Queries SPARQL centrales del sistema.
// Cada función devuelve el string SPARQL para ejecutar
// contra GraphDB (o cualquier triple store compatible).

const PREFIXES = `
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sem:  <https://semhum.edu/ontology/core#>
PREFIX ped:  <https://semhum.edu/ontology/pedagogy#>
PREFIX con:  <https://semhum.edu/data/concepts/>
PREFIX phil: <https://semhum.edu/data/philosophers/>
PREFIX path: <https://semhum.edu/data/paths/>
`;

// ── Recuperar filósofo completo ───────────────

export function getPhilosopher(iri: string) {
  return `${PREFIXES}
SELECT ?label ?born ?died ?nationality ?description
       (GROUP_CONCAT(DISTINCT ?school; separator="|") AS ?schools)
       (GROUP_CONCAT(DISTINCT ?develops; separator="|") AS ?develops)
       (GROUP_CONCAT(DISTINCT ?critiques; separator="|") AS ?critiques)
       (GROUP_CONCAT(DISTINCT ?influenced; separator="|") AS ?influenced)
WHERE {
  BIND(<${iri}> AS ?phil)
  ?phil rdfs:label ?label ; sem:description ?description .
  OPTIONAL { ?phil sem:born ?born }
  OPTIONAL { ?phil sem:died ?died }
  OPTIONAL { ?phil sem:nationality ?nationality }
  OPTIONAL { ?phil sem:belongsTo ?school }
  OPTIONAL { ?phil sem:develops ?develops }
  OPTIONAL { ?phil sem:critiques ?critiques }
  OPTIONAL { ?phil sem:influenced ?influenced }
}
GROUP BY ?label ?born ?died ?nationality ?description`;
}

// ── Prerrequisitos pedagógicos de un concepto ─

export function getConceptPrerequisites(conceptIri: string) {
  return `${PREFIXES}
SELECT ?prereq ?prereqLabel ?prereqDesc
WHERE {
  <${conceptIri}> sem:presupposes+ ?prereq .
  ?prereq rdfs:label ?prereqLabel .
  OPTIONAL { ?prereq sem:description ?prereqDesc }
}`;
}

// ── Inferencia: ¿qué necesita saber el alumno? ─

export function inferLearningNeeds(conceptIri: string) {
  return `${PREFIXES}
SELECT DISTINCT ?item ?label ?type ?difficulty
WHERE {
  {
    # Prerrequisitos directos e indirectos
    <${conceptIri}> sem:presupposes+ ?item .
    ?item rdfs:label ?label .
    BIND("prerequisite" AS ?type)
    OPTIONAL { ?item ped:difficulty ?difficulty }
  }
  UNION
  {
    # Conceptos que contrastan
    <${conceptIri}> sem:contrastsWith ?item .
    ?item rdfs:label ?label .
    BIND("contrast" AS ?type)
    OPTIONAL { ?item ped:difficulty ?difficulty }
  }
  UNION
  {
    # Filósofo que desarrolló el concepto
    ?item sem:develops <${conceptIri}> .
    ?item rdfs:label ?label .
    BIND("author" AS ?type)
    BIND(0 AS ?difficulty)
  }
}
ORDER BY ?difficulty`;
}

// ── Contexto para un filósofo (para el tutor) ─

export function getPhilosopherContext(philIri: string) {
  return `${PREFIXES}
SELECT DISTINCT ?related ?relatedLabel ?relationType
WHERE {
  {
    # Filósofos que influyeron en él
    ?influencer sem:influenced <${philIri}> .
    ?influencer rdfs:label ?relatedLabel .
    BIND(?influencer AS ?related)
    BIND("influenced_by" AS ?relationType)
  }
  UNION
  {
    # Filósofos a quienes influyó
    <${philIri}> sem:influenced ?follower .
    ?follower rdfs:label ?relatedLabel .
    BIND(?follower AS ?related)
    BIND("influenced" AS ?relationType)
  }
  UNION
  {
    # Filósofos que critica
    <${philIri}> sem:critiques ?target .
    ?target rdfs:label ?relatedLabel .
    BIND(?target AS ?related)
    BIND("critiques" AS ?relationType)
  }
  UNION
  {
    # Conceptos que desarrolló
    <${philIri}> sem:develops ?concept .
    ?concept rdfs:label ?relatedLabel .
    BIND(?concept AS ?related)
    BIND("develops" AS ?relationType)
  }
}`;
}

// ── Trayectoria para llegar a un concepto/autor ─

export function getLearningPath(targetIri: string) {
  return `${PREFIXES}
SELECT ?path ?pathLabel ?step1 ?step2 ?step3 ?step4 ?step5 ?step6 ?level
WHERE {
  ?path a ped:LearningPath .
  {
    { ?path ped:targetConcept <${targetIri}> }
    UNION
    { ?path ped:targetPhilosopher <${targetIri}> }
  }
  ?path rdfs:label ?pathLabel .
  OPTIONAL { ?path ped:step1 ?step1 }
  OPTIONAL { ?path ped:step2 ?step2 }
  OPTIONAL { ?path ped:step3 ?step3 }
  OPTIONAL { ?path ped:step4 ?step4 }
  OPTIONAL { ?path ped:step5 ?step5 }
  OPTIONAL { ?path ped:step6 ?step6 }
  OPTIONAL { ?path ped:requiredLevel ?level }
}`;
}

// ── Búsqueda semántica por texto ─────────────

export function searchByLabel(query: string) {
  return `${PREFIXES}
SELECT ?entity ?label ?type ?description
WHERE {
  ?entity rdfs:label ?label .
  FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${query}")))
  OPTIONAL { ?entity sem:description ?description }
  BIND(
    IF(EXISTS { ?entity a sem:Philosopher }, "philosopher",
    IF(EXISTS { ?entity a sem:Concept },    "concept",
    IF(EXISTS { ?entity a sem:PhilosophicalSchool }, "school",
    "other"))) AS ?type
  )
}
LIMIT 20`;
}
