// SWEET SPOT: Adaptive processing based on document size and complexity
// Target: 60-80% entities in 20-30% time (4-6 minutes for large docs)

import { OpenAI } from 'openai'
import type { StructuredChunk } from './structuredChunking'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ADAPTIVE CONFIG: Scale with document size
export function getAdaptiveConfig(chunks: StructuredChunk[], totalPages?: number) {
  const chunkCount = chunks.length
  const pageCount = totalPages || chunkCount * 3 // Estimate if unknown
  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)
  
  console.log(`📊 Document profile: ${pageCount} pages, ${chunkCount} chunks, ${totalTokens} tokens`)
  
  if (pageCount <= 10) {
    // SMALL DOCS: Full processing for maximum quality
    return {
      processingMode: 'FULL_QUALITY',
      maxChunksToProcess: chunkCount, // Process all
      batchSize: 2, // Small batches for precision
      entityExtractionMode: 'DETAILED',
      includeRawText: true,
      maxEntitiesPerBatch: 12,
      confidenceThreshold: 0.45,
      targetTimeMinutes: 1,
      expectedEntities: Math.min(chunkCount * 8, 60)
    }
  } else if (pageCount <= 50) {
    // MEDIUM DOCS: Balanced processing
    return {
      processingMode: 'BALANCED',
      maxChunksToProcess: Math.max(15, Math.min(chunkCount, 25)), // 15-25 chunks
      batchSize: 3, // Medium batches
      entityExtractionMode: 'STANDARD',
      includeRawText: true,
      maxEntitiesPerBatch: 10,
      confidenceThreshold: 0.5,
      targetTimeMinutes: 3,
      expectedEntities: Math.min(pageCount * 2, 120)
    }
  } else {
    // LARGE DOCS: Smart sampling for efficiency + quality
    return {
      processingMode: 'SMART_SAMPLING',
      maxChunksToProcess: Math.max(20, Math.min(chunkCount, 40)), // 20-40 chunks
      batchSize: 4, // Larger batches for speed
      entityExtractionMode: 'COMPREHENSIVE',
      includeRawText: 'PARTIAL', // Include partial raw text
      maxEntitiesPerBatch: 15,
      confidenceThreshold: 0.52,
      targetTimeMinutes: 6,
      expectedEntities: Math.min(pageCount * 1.5, 200)
    }
  }
}

// SMART: Intelligent chunk selection for large documents
function smartChunkSampling(chunks: StructuredChunk[], maxChunks: number): StructuredChunk[] {
  if (chunks.length <= maxChunks) return chunks
  
  console.log(`🎯 Smart sampling: ${chunks.length} → ${maxChunks} chunks`)
  
  const selected: StructuredChunk[] = []
  
  // ALWAYS include intro and conclusion
  selected.push(chunks[0]) // First chunk
  if (chunks.length > 1) {
    selected.push(chunks[chunks.length - 1]) // Last chunk
  }
  
  // HIGH-VALUE chunks
  const highValue = chunks.filter((chunk, index) => 
    index !== 0 && index !== chunks.length - 1 && // Not intro/conclusion
    (chunk.metadata.importance === 'high' ||
     chunk.metadata.chunkType === 'definition' ||
     chunk.detailedConcepts.length >= 2 ||
     chunk.keyIdeas.length >= 4)
  ).sort((a, b) => {
    // Sort by value score
    const scoreA = calculateChunkValue(a)
    const scoreB = calculateChunkValue(b)
    return scoreB - scoreA
  })
  
  // Add high-value chunks
  const remainingSlots = maxChunks - selected.length
  const highValueToAdd = Math.min(remainingSlots, highValue.length, Math.floor(maxChunks * 0.6))
  selected.push(...highValue.slice(0, highValueToAdd))
  
  // REPRESENTATIVE sampling from remaining chunks
  const remaining = chunks.filter(chunk => !selected.includes(chunk))
  const samplingInterval = Math.floor(remaining.length / (maxChunks - selected.length))
  
  if (samplingInterval > 0) {
    for (let i = 0; i < remaining.length && selected.length < maxChunks; i += samplingInterval) {
      selected.push(remaining[i])
    }
  }
  
  // Sort by original order
  selected.sort((a, b) => a.order - b.order)
  
  console.log(`✅ Selected chunks: positions ${selected.map(c => c.order).join(', ')}`)
  return selected
}

function calculateChunkValue(chunk: StructuredChunk): number {
  let score = 0
  
  // Content richness
  score += chunk.detailedConcepts.length * 3
  score += chunk.keyIdeas.length * 1
  score += chunk.dependencies.length * 2
  
  // Importance multiplier
  if (chunk.metadata.importance === 'high') score *= 1.5
  
  // Type bonus
  if (chunk.metadata.chunkType === 'definition') score += 5
  if (chunk.metadata.chunkType === 'introduction') score += 3
  if (chunk.metadata.chunkType === 'conclusion') score += 3
  
  return score
}

// ENHANCED: Entity extraction with adaptive detail level
async function adaptiveEntityExtraction(
  chunks: StructuredChunk[],
  sourceName: string,
  config: any
): Promise<any[]> {
  const extractions = []
  const batchSize = config.batchSize
  
  console.log(`🧠 Adaptive extraction: ${config.processingMode} mode for ${chunks.length} chunks`)
  
  // CONCURRENT processing with controlled batches
  const batchPromises: Promise<any>[] = []
  const maxConcurrency = config.processingMode === 'FULL_QUALITY' ? 2 : 4
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length))
    
    const extractionPromise = enhancedBatchExtraction(batch, sourceName, config, Math.floor(i/batchSize))
      .then(result => ({
        batchIndex: Math.floor(i/batchSize),
        chunks: batch.map(c => c.id),
        entities: result
      }))
      .catch(error => {
        console.error(`❌ Batch ${Math.floor(i/batchSize)} failed:`, error)
        return null
      })
    
    batchPromises.push(extractionPromise)
    
    // Process in controlled waves
    if (batchPromises.length >= maxConcurrency || i + batchSize >= chunks.length) {
      const results = await Promise.allSettled(batchPromises.splice(0, batchPromises.length))
      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
      
      extractions.push(...successful)
      console.log(`⚡ Batch wave completed: ${successful.length} successful extractions`)
      
      // Small delay between waves for rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }
  
  return extractions
}

// ENHANCED: Batch extraction with adaptive context
async function enhancedBatchExtraction(
  chunks: StructuredChunk[],
  sourceName: string,
  config: any,
  batchIndex: number
): Promise<any> {
  
  // ADAPTIVE context based on processing mode
  const context = chunks.map((chunk, index) => {
    let contextStr = `
CHUNK ${chunk.order + 1}/${chunks.length}: ${chunk.title || `Section ${chunk.order + 1}`}
Type: ${chunk.metadata.chunkType} | Importance: ${chunk.metadata.importance}

KEY IDEAS: ${chunk.keyIdeas.slice(0, 4).join(' • ')}

DETAILED CONCEPTS:
${chunk.detailedConcepts.map(concept => 
  `• ${concept.concept}: ${concept.explanation.substring(0, 80)}${concept.category ? ` [${concept.category}]` : ''}`
).join('\n')}`

    // ADAPTIVE: Include raw text based on processing mode
    if (config.includeRawText === true) {
      contextStr += `\n\nRAW CONTENT: ${chunk.rawText.substring(0, 800)}`
    } else if (config.includeRawText === 'PARTIAL') {
      contextStr += `\n\nKEY CONTENT: ${chunk.rawText.substring(0, 400)}`
    }
    
    if (chunk.dependencies.length > 0) {
      contextStr += `\nDEPENDENCIES: ${chunk.dependencies.join(', ')}`
    }
    
    return contextStr
  }).join('\n\n---\n\n')

  // ADAPTIVE prompt based on processing mode
  let prompt = ''
  let maxTokens = 1000
  let targetEntities = config.maxEntitiesPerBatch
  
  if (config.processingMode === 'FULL_QUALITY') {
    prompt = `COMPREHENSIVE entity extraction from ${chunks.length} sections of "${sourceName}":

${context}

Extract ALL valuable elements with high precision. Return JSON:
{
  "elements": [
    {
      "name": "precise element name",
      "type": "concept|definition|tool|method|process|principle|entity",
      "aliases": ["alternative names", "synonyms"],
      "desc": "detailed description",
      "cat": "specific category",
      "conf": 0.85,
      "chunks": ["chunk-1"],
      "examples": ["example1", "example2"],
      "properties": {"key": "value"}
    }
  ]
}

TARGET: Extract ${targetEntities}-${targetEntities + 5} high-quality elements. Include definitions, concepts, tools, methods, and key entities. Be comprehensive but precise.`
    maxTokens = 2000
    
  } else if (config.processingMode === 'BALANCED') {
    prompt = `BALANCED entity extraction from ${chunks.length} sections of "${sourceName}":

${context}

Extract important elements efficiently. Return JSON:
{
  "elements": [
    {
      "name": "element name",
      "type": "concept|definition|tool|method|process",
      "aliases": ["alt names"],
      "desc": "clear description",
      "cat": "category",
      "conf": 0.8,
      "chunks": ["chunk-1"]
    }
  ]
}

TARGET: Extract ${targetEntities} most important elements. Focus on key concepts, definitions, and methods.`
    maxTokens = 1500
    
  } else { // SMART_SAMPLING
    prompt = `COMPREHENSIVE sampling extraction from ${chunks.length} sections of "${sourceName}":

${context}

Extract diverse range of elements representing the full document. Return JSON:
{
  "elements": [
    {
      "name": "element name", 
      "type": "concept|definition|tool|method|process|principle",
      "aliases": ["variations"],
      "desc": "description",
      "cat": "category",
      "conf": 0.75,
      "chunks": ["chunk-1"]
    }
  ]
}

TARGET: Extract ${targetEntities} elements representing diverse aspects. Include variety of types and categories.`
    maxTokens = 1800
  }

  try {
    const model = config.processingMode === 'FULL_QUALITY' ? "gpt-4-1106-preview" : "gpt-3.5-turbo-1106"
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system", 
          content: `Expert knowledge extractor. Adapt extraction depth to document complexity. Focus on ${config.entityExtractionMode.toLowerCase()} extraction.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: config.processingMode === 'FULL_QUALITY' ? 0.3 : 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    })
    
    const result = JSON.parse(response.choices[0].message.content || '{}')
    console.log(`✅ Batch ${batchIndex} (${config.processingMode}): extracted ${result.elements?.length || 0} elements`)
    
    return { extracted_elements: result.elements || [] }
    
  } catch (error) {
    console.error(`Enhanced extraction failed for batch ${batchIndex}:`, error)
    return { extracted_elements: [] }
  }
}

// ENHANCED: Smart deduplication with quality preservation
async function qualityDeduplication(
  rawExtractions: any[],
  graph: any,
  config: any
): Promise<void> {
  console.log(`🔍 Quality-focused deduplication`)
  
  const allElements: any[] = []
  for (const extraction of rawExtractions) {
    if (extraction?.entities?.extracted_elements) {
      allElements.push(...extraction.entities.extracted_elements.map((element: any) => ({
        ...element,
        sourceChunks: extraction.chunks || []
      })))
    }
  }
  
  console.log(`📊 Deduplicating ${allElements.length} elements`)
  
  // PHASE 1: Exact and alias matching
  const nameGroups = new Map<string, any[]>()
  const aliasMap = new Map<string, any[]>()
  
  for (const element of allElements) {
    // Normalize name for grouping
    const normalizedName = element.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, [])
    }
    nameGroups.get(normalizedName)!.push(element)
    
    // Index aliases
    if (element.aliases) {
      for (const alias of element.aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (!aliasMap.has(normalizedAlias)) {
          aliasMap.set(normalizedAlias, [])
        }
        aliasMap.get(normalizedAlias)!.push(element)
      }
    }
  }
  
  // PHASE 2: Merge and quality filter
  const mergedElements: any[] = []
  const processed = new Set<any>()
  
  // Process exact matches
  for (const [name, group] of nameGroups) {
    if (group.some(el => processed.has(el))) continue
    
    if (group.length === 1) {
      const element = group[0]
      if ((element.conf || 0.7) >= config.confidenceThreshold) {
        mergedElements.push(element)
      }
      processed.add(element)
    } else {
      // Merge multiple instances
      const merged = intelligentMerge(group)
      if ((merged.conf || 0.7) >= config.confidenceThreshold) {
        mergedElements.push(merged)
      }
      group.forEach(el => processed.add(el))
    }
  }
  
  // PHASE 3: Add unprocessed high-quality elements
  for (const element of allElements) {
    if (!processed.has(element) && (element.conf || 0.7) >= config.confidenceThreshold) {
      mergedElements.push(element)
    }
  }
  
  console.log(`🎯 Quality deduplication: ${allElements.length} → ${mergedElements.length} (${Math.round((mergedElements.length / allElements.length) * 100)}% retained)`)
  
  // Add to graph
  mergedElements.forEach((element, index) => {
    const id = generateEntityId(element.name, index)
    graph.entities.set(id, {
      id,
      type: mapEntityType(element.type),
      name: element.name,
      aliases: element.aliases || [],
      properties: {
        description: element.desc || '',
        category: element.cat || 'General',
        examples: element.examples || []
      },
      descriptions: [element.desc || ''],
      sourceChunks: element.sourceChunks || [],
      confidence: element.conf || 0.7,
      category: element.cat,
      lastUpdated: new Date()
    })
  })
}

function intelligentMerge(elements: any[]): any {
  // Sort by confidence
  elements.sort((a, b) => (b.conf || 0.7) - (a.conf || 0.7))
  const main = elements[0]
  
  // Merge all unique information
  const allAliases = new Set([main.name])
  const allChunks = new Set(main.sourceChunks || [])
  const allExamples = new Set(main.examples || [])
  let bestDescription = main.desc || ''
  let maxConf = main.conf || 0.7
  
  for (let i = 1; i < elements.length; i++) {
    const el = elements[i]
    
    // Merge aliases
    if (el.aliases) el.aliases.forEach((alias: string) => allAliases.add(alias))
    
    // Merge chunks
    if (el.sourceChunks) el.sourceChunks.forEach((chunk: string) => allChunks.add(chunk))
    
    // Merge examples
    if (el.examples) el.examples.forEach((ex: string) => allExamples.add(ex))
    
    // Use best description (longest)
    if ((el.desc || '').length > bestDescription.length) {
      bestDescription = el.desc || bestDescription
    }
    
    // Boost confidence
    maxConf = Math.max(maxConf, el.conf || 0.7)
  }
  
  return {
    ...main,
    aliases: Array.from(allAliases).filter(alias => alias !== main.name),
    sourceChunks: Array.from(allChunks),
    examples: Array.from(allExamples),
    desc: bestDescription,
    conf: Math.min(0.95, maxConf + (elements.length - 1) * 0.03) // Boost for merged entities
  }
}

// Helper functions
function generateEntityId(name: string, index: number): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)
  return `${cleanName}_${index}`
}

function mapEntityType(type: string): any {
  const t = type?.toLowerCase() || ''
  if (t.includes('definition')) return 'definition'
  if (t.includes('concept')) return 'concept'
  if (t.includes('tool')) return 'tool'
  if (t.includes('method')) return 'method'
  if (t.includes('process')) return 'process'
  if (t.includes('principle')) return 'principle'
  return 'concept'
}

// MAIN: Adaptive knowledge graph building
export async function buildAdaptiveKnowledgeGraph(
  chunks: StructuredChunk[],
  sourceName: string,
  totalPages?: number
): Promise<any> {
  console.log(`🚀 ADAPTIVE Knowledge Graph for ${chunks.length} chunks`)
  
  const config = getAdaptiveConfig(chunks, totalPages)
  console.log(`⚙️ Using ${config.processingMode} mode (target: ${config.expectedEntities} entities in ${config.targetTimeMinutes}min)`)
  
  const startTime = Date.now()
  
  const graph = {
    entities: new Map(),
    relations: new Map(),
    metadata: {
      sourceName,
      totalChunks: chunks.length,
      lastUpdated: new Date(),
      version: "adaptive-2.0",
      processingMode: config.processingMode,
      targetEntities: config.expectedEntities
    }
  }
  
  // SMART chunk selection
  const selectedChunks = config.maxChunksToProcess >= chunks.length ? 
    chunks : 
    smartChunkSampling(chunks, config.maxChunksToProcess)
  
  console.log(`🎯 Processing ${selectedChunks.length}/${chunks.length} chunks`)
  
  // ADAPTIVE entity extraction
  const rawExtractions = await adaptiveEntityExtraction(selectedChunks, sourceName, config)
  
  // QUALITY deduplication
  await qualityDeduplication(rawExtractions, graph, config)
  
  const endTime = Date.now()
  const processingTime = (endTime - startTime) / 1000 / 60 // minutes
  
  console.log(`✅ ADAPTIVE Graph complete:`)
  console.log(`  👥 Entities: ${graph.entities.size} (target: ${config.expectedEntities})`)
  console.log(`  ⏱️ Time: ${processingTime.toFixed(1)}min (target: ${config.targetTimeMinutes}min)`)
  console.log(`  📊 Efficiency: ${(graph.entities.size / processingTime).toFixed(1)} entities/min`)
  
  return graph
}