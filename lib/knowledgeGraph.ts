import { OpenAI } from 'openai'
import type { StructuredChunk } from './structuredChunking'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Core Knowledge Graph Types
interface KnowledgeEntity {
  id: string;
  type: 'concept' | 'entity' | 'process' | 'definition' | 'example' | 'tool' | 'method' | 'principle';
  name: string;
  aliases: string[];
  properties: Record<string, any>;
  descriptions: string[];
  sourceChunks: string[];
  confidence: number;
  category?: string;
  domain?: string;
  lastUpdated: Date;
}

interface KnowledgeRelation {
  id: string;
  from: string;
  to: string;
  type: string;
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

// SWEET SPOT: Adaptive processing for quality-speed balance
export async function buildKnowledgeGraph(
  chunks: StructuredChunk[],
  sourceName: string,
  totalPages?: number
): Promise<KnowledgeGraph> {
  console.log(`🎯 ADAPTIVE Knowledge Graph for ${chunks.length} chunks`)
  
  // Import adaptive functions
  const { buildAdaptiveKnowledgeGraph } = await import('./sweet-spot-optimization')
  
  // Use adaptive processing
  return await buildAdaptiveKnowledgeGraph(chunks, sourceName, totalPages)
}

// REMOVED: This function was too aggressive - replaced with adaptive processing

// ULTRA-OPTIMIZED: Lightning-fast entity extraction
async function ultraFastEntityExtraction(
  chunks: StructuredChunk[],
  sourceName: string
): Promise<any[]> {
  const extractions = []
  const batchSize = 6 // AGGRESSIVE: Up to 6 chunks per API call
  const maxConcurrency = 6 // HIGH: 6 concurrent API calls
  
  const batchPromises: Promise<any>[] = []
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length))
    
    const extractionPromise = megaFastBatchExtraction(batch, sourceName, Math.floor(i/batchSize))
      .then(result => ({
        batchIndex: Math.floor(i/batchSize),
        chunks: batch.map(c => c.id),
        entities: result
      }))
      .catch(error => {
        console.error(`❌ Batch ${Math.floor(i/batchSize)} failed:`, error)
        return null // Return null instead of failing
      })
    
    batchPromises.push(extractionPromise)
    
    // Process in high-concurrency waves
    if (batchPromises.length >= maxConcurrency || i + batchSize >= chunks.length) {
      const results = await Promise.allSettled(batchPromises.splice(0, batchPromises.length))
      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
      
      extractions.push(...successful)
      console.log(`⚡ Mega-batch wave completed: ${successful.length} successful extractions`)
    }
  }
  
  return extractions
}

// ULTRA-COMPRESSED: Maximum entity extraction with minimal tokens
async function megaFastBatchExtraction(
  chunks: StructuredChunk[],
  sourceName: string,
  batchIndex: number
): Promise<any> {
  
  // ULTRA-MINIMAL context - only essential processed data
  const context = chunks.map(chunk => `
CHUNK${chunk.order + 1}:
KEY: ${chunk.keyIdeas.slice(0, 3).join(' | ')}
CONCEPTS: ${chunk.detailedConcepts.slice(0, 2).map(c => `${c.concept}=${c.explanation.substring(0, 50)}`).join(' | ')}
TYPE: ${chunk.metadata.chunkType} | IMP: ${chunk.metadata.importance}
`).join('\n')

  // ULTRA-COMPRESSED prompt for minimum token usage
  const prompt = `Fast extract key elements from ${chunks.length} sections of "${sourceName}":

${context}

Return JSON:
{
  "elements": [
    {
      "name": "element name",
      "type": "concept|definition|tool|method|process",
      "aliases": ["alt name"],
      "desc": "brief description",
      "cat": "category",
      "conf": 0.8,
      "chunks": ["chunk-1"]
    }
  ]
}

Extract ALL most important elements total. Focus on unique, valuable concepts.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // COST OPTIMIZATION: Always GPT-3.5
      messages: [
        {
          role: "system",
          content: "Fast knowledge extractor. Focus on high-value unique elements."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // VERY low for consistency and speed
      max_tokens: 800,   // MINIMAL tokens for cost savings
      response_format: { type: "json_object" }
    })
    
    const result = JSON.parse(response.choices[0].message.content || '{}')
    return { extracted_elements: result.elements || [] }
    
  } catch (error) {
    console.error(`Mega-fast extraction failed for batch ${batchIndex}:`, error)
    return { extracted_elements: [] }
  }
}

// LIGHTNING-FAST: Deduplication using exact matching + minimal fuzzy
async function lightningDeduplication(
  rawExtractions: any[],
  graph: KnowledgeGraph
): Promise<void> {
  console.log(`⚡ Lightning deduplication starting`)
  
  // Flatten all elements
  const allElements: any[] = []
  for (const extraction of rawExtractions) {
    if (extraction?.entities?.extracted_elements) {
      allElements.push(...extraction.entities.extracted_elements.map((element: any) => ({
        ...element,
        sourceChunks: extraction.chunks || []
      })))
    }
  }
  
  console.log(`📊 Deduplicating ${allElements.length} raw elements`)
  
  // PHASE 1: Exact name grouping (O(n) speed)
  const nameGroups = new Map<string, any[]>()
  
  for (const element of allElements) {
    const key = element.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    if (!nameGroups.has(key)) {
      nameGroups.set(key, [])
    }
    nameGroups.get(key)!.push(element)
  }
  
  // PHASE 2: Merge exact matches and apply confidence filtering
  const mergedElements: any[] = []
  for (const [key, group] of nameGroups) {
    if (group.length === 1) {
      const element = group[0]
      // AGGRESSIVE: Only keep high-confidence elements
      if ((element.conf || element.confidence || 0.7) >= 0.6) {
        mergedElements.push(element)
      }
    } else {
      // Multiple elements with same name - merge them
      const merged = superFastMerge(group)
      if ((merged.conf || merged.confidence || 0.7) >= 0.65) {
        mergedElements.push(merged)
      }
    }
  }
  
  console.log(`🔥 Exact deduplication: ${allElements.length} → ${mergedElements.length}`)
  
  // PHASE 3: SKIP fuzzy matching for maximum speed
  console.log(`⚡ Skipping fuzzy matching for speed optimization`)
  
  // PHASE 4: Add to graph with ultra-fast processing
  for (const element of mergedElements.slice(0, 100)) { // Cap at 100 entities for speed
    const id = generateFastId(element.name)
    const entityType = mapToEntityType(element.type)
    
    graph.entities.set(id, {
      id,
      type: entityType,
      name: element.name,
      aliases: element.aliases || [],
      properties: {
        description: element.desc || '',
        category: element.cat || 'General',
        confidence: element.conf || 0.7
      },
      descriptions: [element.desc || ''],
      sourceChunks: element.sourceChunks || [],
      confidence: element.conf || 0.7,
      category: element.cat,
      lastUpdated: new Date()
    })
  }
  
  console.log(`⚡ Lightning-fast deduplication complete: ${graph.entities.size} entities`)
}

// ULTRA-FAST: Simple merge without complex logic
function superFastMerge(elements: any[]): any {
  const main = elements[0]
  const allAliases = new Set([main.name])
  const allChunks = new Set(main.sourceChunks || [])
  let maxConf = main.conf || main.confidence || 0.7
  
  for (let i = 1; i < elements.length; i++) {
    const el = elements[i]
    if (el.aliases) el.aliases.forEach((alias: string) => allAliases.add(alias))
    if (el.sourceChunks) el.sourceChunks.forEach((chunk: string) => allChunks.add(chunk))
    maxConf = Math.max(maxConf, el.conf || el.confidence || 0.7)
  }
  
  return {
    ...main,
    aliases: Array.from(allAliases).filter(alias => alias !== main.name),
    sourceChunks: Array.from(allChunks),
    conf: Math.min(0.95, maxConf + elements.length * 0.05) // Boost confidence for merged
  }
}

// FAST: Simple entity type mapping
function mapToEntityType(type: string): KnowledgeEntity['type'] {
  const t = type?.toLowerCase() || ''
  if (t.includes('definition') || t.includes('concept')) return 'concept'
  if (t.includes('tool') || t.includes('software')) return 'tool'
  if (t.includes('method') || t.includes('algorithm')) return 'method'
  if (t.includes('process') || t.includes('procedure')) return 'process'
  if (t.includes('principle') || t.includes('rule')) return 'principle'
  return 'concept'
}

// FAST: Simple ID generation
function generateFastId(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30)
}

// OPTIMIZATION: Remove low-confidence entities
function filterLowConfidenceEntities(graph: KnowledgeGraph): void {
  const threshold = 0.55
  const toRemove: string[] = []
  
  for (const [id, entity] of graph.entities) {
    if (entity.confidence < threshold) {
      toRemove.push(id)
    }
  }
  
  toRemove.forEach(id => graph.entities.delete(id))
  console.log(`🎯 Removed ${toRemove.length} low-confidence entities`)
}

// OPTIMIZATION: Fast processing for small documents
function createFastGraphForSmallDoc(chunk: StructuredChunk, graph: KnowledgeGraph): KnowledgeGraph {
  console.log(`⚡ Express processing for small document`)
  
  // Create entities from detailed concepts
  chunk.detailedConcepts.forEach((concept, index) => {
    const id = `fast_${index}`
    graph.entities.set(id, {
      id,
      type: 'concept',
      name: concept.concept,
      aliases: [],
      properties: {
        description: concept.explanation,
        category: concept.category || 'General'
      },
      descriptions: [concept.explanation],
      sourceChunks: [chunk.id],
      confidence: 0.8,
      category: concept.category,
      lastUpdated: new Date()
    })
  })
  
  // Create entities from key ideas if no detailed concepts
  if (graph.entities.size === 0) {
    chunk.keyIdeas.slice(0, 3).forEach((idea, index) => {
      const id = `idea_${index}`
      graph.entities.set(id, {
        id,
        type: 'concept',
        name: idea.substring(0, 50),
        aliases: [],
        properties: { description: idea },
        descriptions: [idea],
        sourceChunks: [chunk.id],
        confidence: 0.7,
        lastUpdated: new Date()
      })
    })
  }
  
  return graph
}

// OPTIMIZED: Ultra-fast knowledge map generation
export async function generateKnowledgeMapFromGraph(
  graph: KnowledgeGraph,
  options: any = {}
): Promise<string> {
  console.log(`🗺️ Ultra-fast knowledge map from ${graph.entities.size} entities`)
  
  const maxNodes = Math.min(options?.maxNodes || 30, 50) // Cap for performance
  
  // Get top entities by confidence (no complex filtering)
  const entities = Array.from(graph.entities.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxNodes)
  
  // Simple hierarchical structure
  const nodes: any[] = []
  const edges: any[] = []
  
  // Root node
  nodes.push({
    id: 'root',
    title: graph.metadata.sourceName,
    level: 0,
    importance: 'high',
    connections: ['main_concepts'],
    x: 0,
    y: 0
  })
  
  // Main category
  nodes.push({
    id: 'main_concepts',
    title: `Key Concepts (${entities.length})`,
    level: 1,
    importance: 'high',
    connections: entities.map(e => e.id),
    x: 200,
    y: 0
  })
  
  edges.push({
    from: 'root',
    to: 'main_concepts',
    type: 'hierarchy'
  })
  
  // Add entities in simple circular layout
  entities.forEach((entity, index) => {
    const angle = (index / entities.length) * 2 * Math.PI
    const radius = 300
    
    nodes.push({
      id: entity.id,
      title: entity.name,
      level: 2,
      category: entity.category || 'General',
      importance: entity.confidence > 0.8 ? 'high' : entity.confidence > 0.6 ? 'medium' : 'low',
      connections: [],
      x: 200 + Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    })
    
    edges.push({
      from: 'main_concepts',
      to: entity.id,
      type: 'hierarchy'
    })
  })
  
  const result = {
    title: `Knowledge Map: ${graph.metadata.sourceName}`,
    description: `Fast-generated map with ${entities.length} key concepts`,
    nodes,
    edges,
    totalConcepts: graph.entities.size,
    categories: [...new Set(entities.map(e => e.category).filter(Boolean))]
  }
  
  console.log(`⚡ Ultra-fast knowledge map: ${result.nodes.length} nodes, ${result.edges.length} edges`)
  return JSON.stringify(result)
}

// Export types
export type { 
  KnowledgeGraph, 
  KnowledgeEntity, 
  KnowledgeRelation
}