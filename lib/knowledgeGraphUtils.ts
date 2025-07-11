import type { KnowledgeGraph, KnowledgeEntity } from './knowledgeGraph'

// Universal helpers for all endpoints to use Knowledge Graph

export interface EntityFilter {
  types?: string[]
  categories?: string[]
  domains?: string[]
  minConfidence?: number
  maxResults?: number
}

export function getEntitiesFromGraph(
  graph: KnowledgeGraph, 
  filter: EntityFilter = {}
): KnowledgeEntity[] {
  let entities = Array.from(graph.entities.values())
  
  // Apply filters
  if (filter.types) {
    entities = entities.filter(e => filter.types!.includes(e.type))
  }
  
  if (filter.categories) {
    entities = entities.filter(e => e.category && filter.categories!.includes(e.category))
  }
  
  if (filter.domains) {
    entities = entities.filter(e => e.domain && filter.domains!.includes(e.domain))
  }
  
  if (filter.minConfidence) {
    entities = entities.filter(e => e.confidence >= filter.minConfidence!)
  }
  
  // Sort by confidence
  entities.sort((a, b) => b.confidence - a.confidence)
  
  if (filter.maxResults) {
    entities = entities.slice(0, filter.maxResults)
  }
  
  return entities
}

export function getDefinitionsFromGraph(graph: KnowledgeGraph): KnowledgeEntity[] {
  return getEntitiesFromGraph(graph, { 
    types: ['definition', 'concept'],
    minConfidence: 0.7,
    maxResults: 50
  })
}

export function getExamplesFromGraph(graph: KnowledgeGraph): KnowledgeEntity[] {
  return getEntitiesFromGraph(graph, { 
    types: ['example'],
    minConfidence: 0.6,
    maxResults: 30
  })
}

export function getProcessesFromGraph(graph: KnowledgeGraph): KnowledgeEntity[] {
  return getEntitiesFromGraph(graph, { 
    types: ['process', 'method'],
    minConfidence: 0.7,
    maxResults: 20
  })
}

export function enrichContentWithGraph(
  baseContent: string,
  graph: KnowledgeGraph,
  contentType: 'flashcards' | 'quiz' | 'notes' | 'summary'
): string {
  // Get relevant entities for this content type
  let relevantEntities: KnowledgeEntity[] = []
  
  switch (contentType) {
    case 'flashcards':
      relevantEntities = [
        ...getDefinitionsFromGraph(graph),
        ...getEntitiesFromGraph(graph, { types: ['concept'], maxResults: 20 })
      ]
      break
      
    case 'quiz':
      relevantEntities = [
        ...getDefinitionsFromGraph(graph),
        ...getExamplesFromGraph(graph),
        ...getProcessesFromGraph(graph)
      ]
      break
      
    case 'notes':
      relevantEntities = getEntitiesFromGraph(graph, { maxResults: 40 })
      break
      
    case 'summary':
      relevantEntities = getEntitiesFromGraph(graph, { 
        minConfidence: 0.8,
        maxResults: 25
      })
      break
  }
  
  // Create enriched context
  const entityContext = relevantEntities.map(entity => 
    `${entity.name}: ${entity.descriptions[0] || 'No description'}`
  ).join('\n')
  
  return `${baseContent}\n\nDODATKOWY KONTEKST Z KNOWLEDGE GRAPH:\n${entityContext}`
}

export function getGraphStats(graph: KnowledgeGraph) {
  const entities = Array.from(graph.entities.values())
  const byType = entities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const byDomain = entities.reduce((acc, entity) => {
    const domain = entity.domain || 'unknown'
    acc[domain] = (acc[domain] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalEntities: graph.entities.size,
    totalRelations: graph.relations.size,
    byType,
    byDomain,
    avgConfidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
  }
}