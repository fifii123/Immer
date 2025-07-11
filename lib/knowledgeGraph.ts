import { OpenAI } from 'openai'
import type { StructuredChunk } from './structuredChunking'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Core Knowledge Graph Types
interface KnowledgeEntity {
  id: string;                    // "person_leonidas_sparta"
  type: 'person' | 'place' | 'organization' | 'concept' | 'event';
  name: string;                  // "Leonidas I"
  aliases: string[];             // ["Leonidas", "King Leonidas", "Leonidas of Sparta"]
  properties: Record<string, any>; // {role: "King of Sparta", birth: "540 BCE", death: "480 BCE"}
  descriptions: string[];        // Multiple context descriptions
  sourceChunks: string[];        // Which chunks mention this entity
  confidence: number;            // 0-1 how confident we are this is correct
  lastUpdated: Date;
}

interface KnowledgeRelation {
  id: string;
  from: string;                  // Entity ID
  to: string;                    // Entity ID  
  type: string;                  // "rules", "fights_in", "located_in"
  properties: Record<string, any>;
  sourceChunks: string[];
  confidence: number;
}

interface KnowledgeGraph {
  entities: Map<string, KnowledgeEntity>;
  relations: Map<string, KnowledgeRelation>;
  metadata: {
    sourceName: string;
    totalChunks: number;
    lastUpdated: Date;
    version: string;
  }
}

// Main function: Build comprehensive knowledge graph
export async function buildKnowledgeGraph(
  chunks: StructuredChunk[],
  sourceName: string
): Promise<KnowledgeGraph> {
  console.log(`🧠 Building knowledge graph from ${chunks.length} chunks`)
  
  const graph: KnowledgeGraph = {
    entities: new Map(),
    relations: new Map(),
    metadata: {
      sourceName,
      totalChunks: chunks.length,
      lastUpdated: new Date(),
      version: "1.0"
    }
  }
  
  // Phase 1: Extract raw entities from all chunks
  const rawExtractions = await extractEntitiesFromAllChunks(chunks, sourceName)
  console.log(`📊 Raw extractions: ${rawExtractions.length} batches`)
  
  // Phase 2: Deduplicate and merge entities
  await deduplicateAndMergeEntities(rawExtractions, graph)
  console.log(`🔗 Deduplicated entities: ${graph.entities.size}`)
  
  // Phase 3: Extract and deduplicate relations
  await extractAndMergeRelations(chunks, graph)
  console.log(`🔗 Final relations: ${graph.relations.size}`)
  
  // Phase 4: Confidence scoring and validation
  await validateAndScoreGraph(graph)
  
  console.log(`✅ Knowledge graph complete:`)
  console.log(`  👥 Entities: ${graph.entities.size}`)
  console.log(`  🔗 Relations: ${graph.relations.size}`)
  console.log(`  📊 Confidence avg: ${calculateAverageConfidence(graph)}`)
  
  return graph
}

// Phase 1: Extract entities in batches
async function extractEntitiesFromAllChunks(
  chunks: StructuredChunk[],
  sourceName: string
): Promise<any[]> {
  const extractions = []
  const batchSize = 3 // Smaller batches for better quality
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length))
    console.log(`⛏️ Extracting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`)
    
    try {
      const batchExtraction = await extractEntitiesFromBatch(batch, sourceName)
      extractions.push({
        batchIndex: Math.floor(i/batchSize),
        chunks: batch.map(c => c.id),
        entities: batchExtraction
      })
      
      // Rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
    } catch (error) {
      console.error(`❌ Extraction failed for batch ${Math.floor(i/batchSize) + 1}:`, error)
    }
  }
  
  return extractions
}

async function extractEntitiesFromBatch(
  chunks: StructuredChunk[],
  sourceName: string
): Promise<any> {
  const context = chunks.map(chunk => `
CHUNK ${chunk.order + 1}: ${chunk.title}
${chunk.metadata?.pageRange ? `(Pages: ${chunk.metadata.pageRange})` : ''}
CONTENT: ${chunk.rawText.substring(0, 800)}
KEY IDEAS: ${chunk.keyIdeas?.join(' • ') || 'None'}
`).join('\n---\n')

  const prompt = `PRECISE ENTITY EXTRACTION z "${sourceName}"

Wyciągnij ALL specific entities z poniższych fragmentów. Bądź PRECYZYJNY z nazwami i aliasami.

${context}

Zwróć JSON z dokładną ekstrakcją:
{
  "people": [
    {
      "mainName": "Pełne główne imię",
      "aliases": ["Wszystkie wariacje imienia", "Wszystkie tytuły"],
      "properties": {
        "role": "Główna rola/stanowisko",
        "birth": "Data lub okres urodzenia",
        "death": "Data śmierci jeśli znana",
        "nationality": "Pochodzenie",
        "significance": "Dlaczego ważna postać"
      },
      "contexts": ["Kontekst 1 z tego dokumentu", "Kontekst 2"]
    }
  ],
  "places": [
    {
      "mainName": "Oficjalna nazwa",
      "aliases": ["Alternatywne nazwy", "Historyczne nazwy"],
      "properties": {
        "type": "miasto/region/budynek/góra",
        "location": "Gdzie się znajduje",
        "period": "Kiedy było aktywne",
        "significance": "Dlaczego ważne"
      },
      "contexts": ["Kontekst użycia"]
    }
  ],
  "organizations": [
    {
      "mainName": "Oficjalna nazwa organizacji",
      "aliases": ["Skróty", "Nieformalne nazwy"],
      "properties": {
        "type": "armia/instytucja/grupa",
        "period": "Okres działania",
        "purpose": "Cel działania",
        "leadership": "Kto przewodził"
      },
      "contexts": ["Kontekst"]
    }
  ],
  "events": [
    {
      "mainName": "Nazwa wydarzenia", 
      "aliases": ["Alternatywne nazwy"],
      "properties": {
        "date": "Precyzyjna data lub okres",
        "location": "Gdzie się wydarzyło",
        "participants": ["Kto brał udział"],
        "outcome": "Rezultat",
        "significance": "Znaczenie historyczne"
      },
      "contexts": ["Kontekst"]
    }
  ],
  "concepts": [
    {
      "mainName": "Główna nazwa konceptu",
      "aliases": ["Synonimy", "Powiązane terminy"],
      "properties": {
        "definition": "Precyzyjna definicja",
        "category": "Kategoria tematyczna", 
        "period": "Kiedy aktualny",
        "examples": ["Konkretne przykłady z tekstu"]
      },
      "contexts": ["Gdzie w dokumencie"]
    }
  ]
}

ZASADY:
- mainName: Najbardziej kompletna/oficjalna nazwa
- aliases: WSZYSTKIE wariacje (nie pomijaj ŻADNEJ)
- properties: Tylko faktyczne info z tekstu  
- contexts: Krótkie opisy gdzie/jak wspomniane`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w precyzyjnej ekstrakcji named entities z dokumentów historycznych. Wyciągasz ALL mentions z perfect accuracy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.05, // Very low for precision
      max_tokens: 2500,
      response_format: { type: "json_object" }
    })
    
    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    console.error('Entity extraction failed:', error)
    return { people: [], places: [], organizations: [], events: [], concepts: [] }
  }
}

// Phase 2: Smart deduplication and merging
async function deduplicateAndMergeEntities(
  rawExtractions: any[],
  graph: KnowledgeGraph
): Promise<void> {
  console.log(`🔍 Starting intelligent deduplication`)
  
  // Collect all entities by type
  const allEntitiesByType = {
    people: [] as any[],
    places: [] as any[],
    organizations: [] as any[],
    events: [] as any[],
    concepts: [] as any[]
  }
  
  // Flatten all extractions
  for (const extraction of rawExtractions) {
    if (!extraction.entities) continue
    
    for (const [type, entities] of Object.entries(extraction.entities)) {
      if (allEntitiesByType[type as keyof typeof allEntitiesByType]) {
        allEntitiesByType[type as keyof typeof allEntitiesByType].push(
          ...(entities as any[]).map(entity => ({
            ...entity,
            sourceChunks: extraction.chunks
          }))
        )
      }
    }
  }
  
  // Deduplicate each type
  for (const [type, entities] of Object.entries(allEntitiesByType)) {
    console.log(`🧹 Deduplicating ${entities.length} ${type}`)
    const mergedEntities = await smartMergeEntities(entities, type)
    
    // Add to graph
    for (const entity of mergedEntities) {
      const id = generateEntityId(type, entity.mainName)
      graph.entities.set(id, {
        id,
        type: type.slice(0, -1) as any, // Remove 's' from type
        name: entity.mainName,
        aliases: entity.aliases || [],
        properties: entity.properties || {},
        descriptions: entity.contexts || [],
        sourceChunks: entity.sourceChunks || [],
        confidence: entity.confidence || 0.8,
        lastUpdated: new Date()
      })
    }
  }
}

// Smart entity merging using similarity
async function smartMergeEntities(entities: any[], type: string): Promise<any[]> {
  if (entities.length <= 1) return entities
  
  const mergedEntities = []
  const processed = new Set()
  
  for (let i = 0; i < entities.length; i++) {
    if (processed.has(i)) continue
    
    const mainEntity = entities[i]
    const duplicates = []
    
    // Find potential duplicates
    for (let j = i + 1; j < entities.length; j++) {
      if (processed.has(j)) continue
      
      if (areEntitiesSimilar(mainEntity, entities[j])) {
        duplicates.push(entities[j])
        processed.add(j)
      }
    }
    
    // Merge duplicates
    if (duplicates.length > 0) {
      console.log(`🔗 Merging ${duplicates.length + 1} instances of "${mainEntity.mainName}"`)
      const merged = mergeEntityInstances(mainEntity, duplicates)
      mergedEntities.push(merged)
    } else {
      mergedEntities.push(mainEntity)
    }
    
    processed.add(i)
  }
  
  console.log(`✅ ${type}: ${entities.length} → ${mergedEntities.length} (${entities.length - mergedEntities.length} duplicates merged)`)
  return mergedEntities
}

function areEntitiesSimilar(entity1: any, entity2: any): boolean {
  // Check exact name match
  if (entity1.mainName.toLowerCase() === entity2.mainName.toLowerCase()) {
    return true
  }
  
  // Check if either name appears in the other's aliases
  const allNames1 = [entity1.mainName, ...(entity1.aliases || [])].map(n => n.toLowerCase())
  const allNames2 = [entity2.mainName, ...(entity2.aliases || [])].map(n => n.toLowerCase())
  
  for (const name1 of allNames1) {
    for (const name2 of allNames2) {
      if (name1 === name2) return true
      
      // Fuzzy matching for similar names
      if (calculateStringSimilarity(name1, name2) > 0.85) {
        return true
      }
    }
  }
  
  return false
}

function mergeEntityInstances(main: any, duplicates: any[]): any {
  const merged = { ...main }
  
  // Merge aliases
  const allAliases = new Set([
    ...(main.aliases || []),
    main.mainName
  ])
  
  for (const dup of duplicates) {
    allAliases.add(dup.mainName)
    if (dup.aliases) {
      dup.aliases.forEach((alias: string) => allAliases.add(alias))
    }
  }
  
  merged.aliases = Array.from(allAliases).filter(alias => 
    alias.toLowerCase() !== merged.mainName.toLowerCase()
  )
  
  // Merge properties (keep most complete)
  for (const dup of duplicates) {
    if (dup.properties) {
      for (const [key, value] of Object.entries(dup.properties)) {
        if (!merged.properties[key] && value) {
          merged.properties[key] = value
        }
      }
    }
  }
  
  // Merge contexts
  merged.contexts = [
    ...(main.contexts || []),
    ...duplicates.flatMap(dup => dup.contexts || [])
  ]
  
  // Merge source chunks
  merged.sourceChunks = [
    ...(main.sourceChunks || []),
    ...duplicates.flatMap(dup => dup.sourceChunks || [])
  ]
  
  // Higher confidence for merged entities
  merged.confidence = Math.min(0.95, (main.confidence || 0.8) + duplicates.length * 0.05)
  
  return merged
}

// Utility functions
function generateEntityId(type: string, name: string): string {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  
  return `${type.slice(0, -1)}_${cleanName}`
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Phase 3: Extract relations (simplified version)
async function extractAndMergeRelations(
  chunks: StructuredChunk[],
  graph: KnowledgeGraph
): Promise<void> {
  // Implementation for relations extraction
  // This would follow similar pattern but focus on relationships between entities
  console.log(`🔗 Extracting relations between ${graph.entities.size} entities`)
  // TODO: Implement relation extraction
}

// Phase 4: Validation and scoring
async function validateAndScoreGraph(graph: KnowledgeGraph): Promise<void> {
  console.log(`✅ Validating and scoring knowledge graph`)
  // TODO: Implement validation logic
}

function calculateAverageConfidence(graph: KnowledgeGraph): number {
  const confidences = Array.from(graph.entities.values()).map(e => e.confidence)
  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
}

// Export functions for generating different outputs from the graph
export async function generateKnowledgeMapFromGraph(
  graph: KnowledgeGraph,
  options: any = {}
): Promise<string> {
  // Use the knowledge graph to create a knowledge map
  // Much more reliable than generating from chunks
  console.log(`🗺️ Generating knowledge map from graph with ${graph.entities.size} entities`)
  
  // TODO: Implement graph → knowledge map conversion
  return JSON.stringify({
    title: `Knowledge Map: ${graph.metadata.sourceName}`,
    nodes: Array.from(graph.entities.values()).slice(0, 50),
    totalConcepts: graph.entities.size
  })
}

export type { KnowledgeGraph, KnowledgeEntity, KnowledgeRelation }
export { buildKnowledgeGraph }