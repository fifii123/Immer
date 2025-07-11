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
  const batchSize = 2 // Smaller for maximum detail
  
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
      
      // Rate limiting - slower but more thorough
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
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
        CHUNK ${chunk.order + 1}: ${chunk.title || `Sekcja ${chunk.order + 1}`}
        ${chunk.metadata?.pageRange ? `(Pages: ${chunk.metadata.pageRange})` : ''}
        ${chunk.metadata?.chunkType ? `Typ: ${chunk.metadata.chunkType}` : ''}
        ${chunk.metadata?.importance ? `Ważność: ${chunk.metadata.importance}` : ''}
        
        STRESZCZENIE: ${chunk.summary || 'Brak streszczenia'}
        
        KLUCZOWE IDEE: ${chunk.keyIdeas?.join(' • ') || 'Brak kluczowych idei'}
        
        SZCZEGÓŁOWE KONCEPTY:
        ${chunk.detailedConcepts?.map(concept => 
          `• ${concept.concept}: ${concept.explanation}${concept.examples ? ` (Przykłady: ${concept.examples.join(', ')})` : ''}${concept.category ? ` [Kategoria: ${concept.category}]` : ''}`
        ).join('\n') || 'Brak szczegółowych konceptów'}
        
        ZALEŻNOŚCI: ${chunk.dependencies?.join(', ') || 'Brak zależności'}
        
        PEŁNA TREŚĆ: ${chunk.rawText.substring(0, 1500)}
        `).join('\n---\n')

        const prompt = `UNIVERSAL ENTITY EXTRACTION z "${sourceName}"

        Masz dostęp do PRE-PROCESSED strukturalnych danych z documentu. Wykorzystaj WSZYSTKIE dostępne informacje:
        - Streszczenia chunks
        - Kluczowe idee już wyciągnięte przez AI
        - Szczegółowe koncepty z wyjaśnieniami  
        - Zależności między konceptami
        - Pełną treść dla kontekstu
        
        ${context}
        
        ZADANIE: Wyciągnij KAŻDY możliwy element wykorzystując structured data + raw content. Bądź ULTRA-SZCZEGÓŁOWY.
        
        Zwróć JSON z AGGRESSIVE extraction:
        {
          "extracted_elements": [
            {
              "name": "Dokładna nazwa elementu",
              "type": "auto-detected type (algorithm, concept, tool, method, person, term, etc.)",
              "aliases": ["WSZYSTKIE alternatywne nazwy z WSZYSTKICH chunks"],
              "properties": {
                "definition": "Definicja z detailed concepts LUB inferred z kontekstu",
                "description": "Opis z summary/concepts/context", 
                "category": "Auto-detected kategoria",
                "domain": "Auto-detected dziedzina z treści",
                "importance": "high|medium|low na podstawie structured data + context",
                "source_type": "detailed_concept|key_idea|dependency|raw_content",
                "explanation": "Wyjaśnienie z detailedConcepts jeśli dostępne",
                "examples": "Przykłady z detailedConcepts jeśli dostępne",
                "prerequisites": "Z dependencies jeśli powiązane",
                "context_clues": "Wskazówki kontekstowe z summary/ideas"
              },
              "contexts": ["KAŻDY kontekst - summary, key ideas, detailed concepts, raw text"],
              "chunk_ids": ["chunks gdzie występuje"],
              "confidence_factors": ["co wskazuje że to ważny element"]
            }
          ]
        }
        
        ZASADY STRUCTURED EXTRACTION:
        - PRIORYTET dla detailed concepts - to już processed knowledge!
        - Każdy detailed concept = minimum 1 entity
        - Każda key idea = sprawdź czy to entity  
        - Dependencies = sprawdź cross-chunk relationships
        - Summary = sprawdź czy zawiera nowe terms
        - Raw content = backup dla anything missed
        - TARGET: 10-20 elements per chunk MINIMUM
        - Wykorzystuj structured knowledge - nie zacznij od zera!
        - Jeśli detailed concept ma examples - wyciągnij jako separate entities
        - Jeśli key idea się powtarza w chunks - to high confidence entity
        - Cross-reference między chunks dla deduplikacji`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w uniwersalnej ekstrakcji kluczowych elementów z dokumentów każdego typu. Adaptujesz się do dziedziny i wyciągasz ALL wichtige informacje z maksymalną precyzją."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })
    
    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    console.error('Entity extraction failed:', error)
    // Return empty universal structure
    return { 
      concepts: [], 
      entities: [], 
      processes: [], 
      definitions: [], 
      examples: [], 
      tools: [], 
      methods: [], 
      principles: [] 
    }
  }
}

// Phase 2: Smart deduplication and merging - UNIVERSAL VERSION
async function deduplicateAndMergeEntities(
    rawExtractions: any[],
    graph: KnowledgeGraph
  ): Promise<void> {
    console.log(`🔍 Starting structured deduplication`)
    
    // UNIVERSAL - no pre-defined types
    const allElements: any[] = []
    
    // Flatten all extractions - TRULY UNIVERSAL
    for (const extraction of rawExtractions) {
      if (!extraction.entities?.extracted_elements) continue
      
      allElements.push(
        ...extraction.entities.extracted_elements.map((element: any) => ({
          ...element,
          sourceChunks: extraction.chunks
        }))
      )
    }
    
    console.log(`📊 Found ${allElements.length} raw elements to process`)
    
    // Smart deduplication by name similarity
    const mergedElements = await smartMergeElements(allElements)
    
    // Add to graph with universal type detection
    for (const element of mergedElements) {
      const id = generateEntityId('element', element.name)
      const entityType = detectUniversalType(element.type, element.properties)
      
      graph.entities.set(id, {
        id,
        type: entityType,
        name: element.name,
        aliases: element.aliases || [],
        properties: element.properties || {},
        descriptions: element.contexts || [],
        sourceChunks: element.sourceChunks || [],
        confidence: calculateElementConfidence(element),
        category: element.properties?.category,
        domain: element.properties?.domain,
        lastUpdated: new Date()
      })
    }
    
    console.log(`✅ Created ${graph.entities.size} deduplicated entities`)
  }
  // UNIVERSAL type detection
function detectUniversalType(aiDetectedType: string, properties: any): KnowledgeEntity['type'] {
    const type = aiDetectedType?.toLowerCase() || ''
    
    // Smart mapping based on AI detection + properties
    if (type.includes('algorithm') || type.includes('method') || type.includes('procedure')) {
      return 'method'
    }
    if (type.includes('tool') || type.includes('software') || type.includes('library')) {
      return 'tool'
    }
    if (type.includes('definition') || type.includes('term')) {
      return 'definition'
    }
    if (type.includes('example') || type.includes('case')) {
      return 'example'
    }
    if (type.includes('principle') || type.includes('law') || type.includes('rule')) {
      return 'principle'
    }
    if (type.includes('process') || type.includes('workflow')) {
      return 'process'
    }
    if (type.includes('person') || type.includes('company') || type.includes('system')) {
      return 'entity'
    }
    
    // Default to concept for everything else
    return 'concept'
  }
  
  function calculateElementConfidence(element: any): number {
    let confidence = 0.6 // Base confidence
    
    // Higher confidence for elements from detailed concepts (already AI-processed)
    if (element.properties?.source_type === 'detailed_concept') {
      confidence += 0.25
    }
    
    // Higher confidence for elements from key ideas  
    if (element.properties?.source_type === 'key_idea') {
      confidence += 0.15
    }
    
    // Higher confidence for cross-chunk elements (dependencies)
    if (element.properties?.source_type === 'dependency') {
      confidence += 0.2
    }
    
    // Higher confidence for elements with more contexts
    confidence += Math.min(0.15, (element.contexts?.length || 0) * 0.03)
    
    // Higher confidence for elements with aliases (mentioned multiple ways)
    confidence += Math.min(0.1, (element.aliases?.length || 0) * 0.025)
    
    // Higher confidence if marked as high importance by structured analysis
    if (element.properties?.importance === 'high') confidence += 0.1
    
    // Higher confidence for elements with examples (from detailed concepts)
    if (element.properties?.examples) confidence += 0.05
    
    // Higher confidence for elements with prerequisites (shows complexity)
    if (element.properties?.prerequisites) confidence += 0.05
    
    return Math.min(0.95, confidence)
  }
  
  // UNIVERSAL element merging
  async function smartMergeElements(elements: any[]): Promise<any[]> {
    if (elements.length <= 1) return elements
    
    const mergedElements = []
    const processed = new Set()
    
    for (let i = 0; i < elements.length; i++) {
      if (processed.has(i)) continue
      
      const mainElement = elements[i]
      const duplicates = []
      
      // Find potential duplicates
      for (let j = i + 1; j < elements.length; j++) {
        if (processed.has(j)) continue
        
        if (areElementsSimilar(mainElement, elements[j])) {
          duplicates.push(elements[j])
          processed.add(j)
        }
      }
      
      // Merge duplicates
      if (duplicates.length > 0) {
        console.log(`🔗 Merging ${duplicates.length + 1} instances of "${mainElement.name}"`)
        const merged = mergeElementInstances(mainElement, duplicates)
        mergedElements.push(merged)
      } else {
        mergedElements.push(mainElement)
      }
      
      processed.add(i)
    }
    
    console.log(`✅ Elements: ${elements.length} → ${mergedElements.length} (${elements.length - mergedElements.length} duplicates merged)`)
    return mergedElements
  }
  
  function areElementsSimilar(element1: any, element2: any): boolean {
    // Check exact name match
    if (element1.name.toLowerCase() === element2.name.toLowerCase()) {
      return true
    }
    
    // Check if either name appears in the other's aliases
    const allNames1 = [element1.name, ...(element1.aliases || [])].map(n => n.toLowerCase())
    const allNames2 = [element2.name, ...(element2.aliases || [])].map(n => n.toLowerCase())
    
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
  
  function mergeElementInstances(main: any, duplicates: any[]): any {
    const merged = { ...main }
    
    // Merge aliases
    const allAliases = new Set([
      ...(main.aliases || []),
      main.name
    ])
    
    for (const dup of duplicates) {
      allAliases.add(dup.name)
      if (dup.aliases) {
        dup.aliases.forEach((alias: string) => allAliases.add(alias))
      }
    }
    
    merged.aliases = Array.from(allAliases).filter(alias => 
      alias.toLowerCase() !== merged.name.toLowerCase()
    )
    
    // Merge properties (keep most complete)
    merged.properties = { ...main.properties }
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
    
    return merged
  }
// UNIVERSAL type mapping
function mapToUniversalType(extractedType: string): KnowledgeEntity['type'] {
  const typeMapping: Record<string, KnowledgeEntity['type']> = {
    'concepts': 'concept',
    'entities': 'entity', 
    'processes': 'process',
    'definitions': 'definition',
    'examples': 'example',
    'tools': 'tool',
    'methods': 'method',
    'principles': 'principle'
  }
  
  return typeMapping[extractedType] || 'concept'
}

// Smart entity merging using similarity - UNCHANGED (already universal)
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

// UNIVERSAL utility functions
function generateEntityId(type: string, name: string): string {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  
  return `${type}_${cleanName}`
}

function calculateStringSimilarity(str1: string, str2: string): number {
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

// Phase 3: Extract relations (placeholder)
async function extractAndMergeRelations(
  chunks: StructuredChunk[],
  graph: KnowledgeGraph
): Promise<void> {
  console.log(`🔗 Extracting relations between ${graph.entities.size} entities`)
  // TODO: Implement universal relation extraction
}

// Phase 4: Validation and scoring (placeholder)
async function validateAndScoreGraph(graph: KnowledgeGraph): Promise<void> {
  console.log(`✅ Validating and scoring knowledge graph`)
  // TODO: Implement validation logic
}

function calculateAverageConfidence(graph: KnowledgeGraph): number {
  const confidences = Array.from(graph.entities.values()).map(e => e.confidence)
  return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
}

// UNIVERSAL knowledge map generator
export async function generateKnowledgeMapFromGraph(
    graph: KnowledgeGraph,
    options: any = {}
  ): Promise<string> {
    console.log(`🗺️ Generating knowledge map from graph with ${graph.entities.size} entities`)
    
    const maxNodes = options?.maxNodes || 50
    const showAllEntities = options?.showAllEntities || false
    
    // Get entities by type - MUCH MORE AGGRESSIVE LIMITS
    const entities = Array.from(graph.entities.values())
      .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
    
    let concepts, definitions, processes, tools, examples, methods, principles, entitiesOnly
    
    if (showAllEntities && maxNodes > 100) {
      // AGGRESSIVE MODE - show as many as possible
      concepts = entities.filter(e => e.type === 'concept').slice(0, 60)
      definitions = entities.filter(e => e.type === 'definition').slice(0, 40)
      processes = entities.filter(e => e.type === 'process').slice(0, 30)
      methods = entities.filter(e => e.type === 'method').slice(0, 25)
      principles = entities.filter(e => e.type === 'principle').slice(0, 20)
      tools = entities.filter(e => e.type === 'tool').slice(0, 15)
      examples = entities.filter(e => e.type === 'example').slice(0, 15)
      entitiesOnly = entities.filter(e => e.type === 'entity').slice(0, 30)
    } else {
      // CONSERVATIVE MODE (original)
      concepts = entities.filter(e => e.type === 'concept').slice(0, 15)
      definitions = entities.filter(e => e.type === 'definition').slice(0, 10)
      processes = entities.filter(e => e.type === 'process').slice(0, 10)
      methods = entities.filter(e => e.type === 'method').slice(0, 8)
      principles = entities.filter(e => e.type === 'principle').slice(0, 8)
      tools = entities.filter(e => e.type === 'tool').slice(0, 8)
      examples = entities.filter(e => e.type === 'example').slice(0, 7)
      entitiesOnly = entities.filter(e => e.type === 'entity').slice(0, 15)
    }
    
    // Create hierarchical structure
    const nodes: any[] = []
    const edges: any[] = []
    
    // Root node
    nodes.push({
      id: 'root',
      title: graph.metadata.sourceName,
      level: 0,
      importance: 'high',
      connections: ['concepts', 'definitions', 'processes', 'methods', 'principles', 'tools', 'examples', 'entities'],
      x: 0,
      y: 0
    })
    
    // Category nodes - EXPANDED CATEGORIES
    const categories = [
      { id: 'concepts', title: 'Koncepty', entities: concepts, x: -400, y: -300 },
      { id: 'definitions', title: 'Definicje', entities: definitions, x: 400, y: -300 },
      { id: 'processes', title: 'Procesy', entities: processes, x: -400, y: 0 },
      { id: 'methods', title: 'Metody', entities: methods, x: 400, y: 0 },
      { id: 'principles', title: 'Zasady', entities: principles, x: -400, y: 300 },
      { id: 'tools', title: 'Narzędzia', entities: tools, x: 400, y: 300 },
      { id: 'examples', title: 'Przykłady', entities: examples, x: 0, y: 400 },
      { id: 'entities', title: 'Jednostki', entities: entitiesOnly, x: 0, y: -400 }
    ]
    
    categories.forEach(category => {
      if (category.entities.length > 0) {
        nodes.push({
          id: category.id,
          title: `${category.title} (${category.entities.length})`,
          level: 1,
          importance: 'high',
          connections: category.entities.map(e => e.id),
          x: category.x,
          y: category.y
        })
        
        edges.push({
          from: 'root',
          to: category.id,
          type: 'hierarchy'
        })
        
        // Add individual entities - SPIRALING LAYOUT for more entities
        category.entities.forEach((entity, index) => {
          const angle = (index / category.entities.length) * 4 * Math.PI // More spirals
          const radius = 150 + (index * 10) // Expanding spiral
          
          nodes.push({
            id: entity.id,
            title: entity.name,
            level: 2,
            category: category.title,
            importance: entity.confidence > 0.8 ? 'high' : entity.confidence > 0.6 ? 'medium' : 'low',
            connections: [],
            x: category.x + Math.cos(angle) * radius,
            y: category.y + Math.sin(angle) * radius
          })
          
          edges.push({
            from: category.id,
            to: entity.id,
            type: 'hierarchy'
          })
        })
      }
    })
    
    // Apply maxNodes limit AFTER building full structure
    const finalNodes = nodes.slice(0, maxNodes)
    const finalNodeIds = new Set(finalNodes.map(n => n.id))
    const finalEdges = edges.filter(e => finalNodeIds.has(e.from) && finalNodeIds.has(e.to))
    
    const result = {
      title: `Knowledge Map: ${graph.metadata.sourceName}`,
      description: `Comprehensive map with ${Math.min(graph.entities.size, maxNodes)} concepts from ${graph.metadata.totalChunks} document sections`,
      nodes: finalNodes,
      edges: finalEdges,
      totalConcepts: graph.entities.size,
      categories: categories.filter(c => c.entities.length > 0).map(c => c.title)
    }
    
    console.log(`✅ Generated COMPREHENSIVE knowledge map: ${result.nodes.length} nodes, ${result.edges.length} edges from ${graph.entities.size} total entities`)
    return JSON.stringify(result)
  }

// Export all types and functions
export type { 
  KnowledgeGraph, 
  KnowledgeEntity, 
  KnowledgeRelation,
  StructuredChunk
}