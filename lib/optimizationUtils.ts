// Ultra-optimized utility functions for maximum cost and time savings

// SWEET SPOT: Balanced optimization for quality-speed trade-off
export const OPTIMIZATION_CONFIG = {
  // Token limits (balanced)
  MAX_TOKENS_PER_CHUNK: 2000,        // Larger chunks but not excessive
  MAX_TOKENS_PER_PROMPT: 3000,       // Adequate prompt size
  MAX_TOKENS_RESPONSE: 1500,          // Good response size
  
  // Batch sizes (balanced)
  CHUNK_BATCH_SIZE: 4,                // Balanced batch size
  ENTITY_BATCH_SIZE: 3,               // Smaller batches for precision
  MAX_CONCURRENT_CALLS: 4,            // Moderate concurrency
  
  // Quality thresholds (less aggressive)
  MIN_CONFIDENCE_THRESHOLD: 0.45,     // Lower threshold for more entities
  MIN_CHUNK_SIZE: 80,                 // Process smaller chunks
  MAX_ENTITIES_PER_GRAPH: 250,        // Higher cap for quality
  
  // Model selection (smart hybrid)
  BULK_MODEL: "gpt-3.5-turbo-1106",   // GPT-3.5 for bulk
  QUALITY_MODEL: "gpt-4-1106-preview", // GPT-4 for quality when needed
  
  // Processing limits (reasonable)
  MAX_CHUNKS_TO_PROCESS: 40,          // Process more chunks
  MAX_PROCESSING_TIME_MS: 180000,     // 3 minute timeout
  SKIP_RELATIONS: true,               // Still skip relations for speed
  SKIP_FUZZY_MATCHING: false,         // Enable fuzzy matching for quality
}

// ULTRA-FAST: Text preprocessing that eliminates junk early
export function ultraFastPreprocess(text: string): string {
  if (!text || text.length < 50) return text
  
  // One-pass cleaning for maximum speed
  return text
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .replace(/[^\w\s\-.,;:!?()[\]{}'"]/g, ' ') // Remove special chars
    .replace(/(.)\1{3,}/g, '$1$1')           // Remove excessive repetition
    .trim()
}

// SMART: Dynamic batch sizing based on content complexity
export function getOptimalBatchSize(contentLength: number, tokenCount?: number): number {
  const avgTokens = tokenCount || Math.ceil(contentLength / 4)
  
  // Aggressive batching for cost savings
  if (avgTokens < 200) return OPTIMIZATION_CONFIG.CHUNK_BATCH_SIZE
  if (avgTokens < 400) return Math.max(4, OPTIMIZATION_CONFIG.CHUNK_BATCH_SIZE - 2)
  if (avgTokens < 800) return Math.max(3, OPTIMIZATION_CONFIG.CHUNK_BATCH_SIZE - 4)
  return 2 // Conservative for very large content
}

// FAST: Token estimation without complex calculation
export function fastTokenEstimate(text: string): number {
  return Math.ceil(text.length / 4) // Simple 4-char-per-token rule
}

// AGGRESSIVE: Content filtering to process only valuable parts
export function filterValuableContent(text: string): string {
  const lines = text.split('\n')
  const valuableLines = lines.filter(line => {
    const trimmed = line.trim()
    
    // Skip empty lines, headers, footers, page numbers
    if (trimmed.length < 20) return false
    if (/^(page \d+|chapter \d+|\d+\s*$)/i.test(trimmed)) return false
    if (/^(table of contents|index|bibliography)/i.test(trimmed)) return false
    
    // Keep lines with substantial content
    const wordCount = trimmed.split(/\s+/).length
    return wordCount >= 5
  })
  
  return valuableLines.join('\n')
}

// OPTIMIZATION: Early exit conditions
export function shouldSkipProcessing(content: string, type: string): boolean {
  const tokenCount = fastTokenEstimate(content)
  
  // Skip tiny content
  if (tokenCount < OPTIMIZATION_CONFIG.MIN_CHUNK_SIZE) {
    console.log(`⚡ Skipping tiny ${type} (${tokenCount} tokens)`)
    return true
  }
  
  // Skip if mostly numbers/symbols
  const alphaRatio = (content.match(/[a-zA-Z]/g) || []).length / content.length
  if (alphaRatio < 0.5) {
    console.log(`⚡ Skipping low-text content (${Math.round(alphaRatio * 100)}% text)`)
    return true
  }
  
  return false
}

// ULTRA-COMPRESSED: Prompt templates with minimal tokens
export const ULTRA_MINIMAL_PROMPTS = {
  chunkAnalysis: (chunkCount: number) => `Analyze ${chunkCount} sections. For each return:
{
  "chunks": [
    {
      "summary": "1-2 sentences",
      "keyIdeas": ["idea1", "idea2", "idea3"],
      "concepts": [{"name": "concept", "desc": "explanation"}],
      "title": "section title",
      "type": "intro|analysis|conclusion",
      "importance": "high|medium|low"
    }
  ]
}
Be concise. Focus on unique insights.`,

  entityExtraction: (chunkCount: number) => `Extract key elements from ${chunkCount} sections:
{
  "elements": [
    {
      "name": "element name",
      "type": "concept|tool|method",
      "desc": "brief description",
      "conf": 0.8
    }
  ]
}
Max 8 elements total. Only important ones.`,

  qualityCheck: () => `Rate content quality 0-1. Return only number.`
}

// SMART: Confidence-based processing decisions
export function shouldProcessWithAI(content: any, type: string): boolean {
  // Early exit for simple content
  if (type === 'single_chunk' && fastTokenEstimate(content.rawText || '') < 300) {
    return false // Use rule-based processing
  }
  
  // Skip AI for low-value content
  if (type === 'entity_extraction') {
    const hasDetailedConcepts = content.detailedConcepts?.length > 0
    const hasKeyIdeas = content.keyIdeas?.length >= 2
    
    if (!hasDetailedConcepts && !hasKeyIdeas) {
      console.log(`⚡ Skipping AI extraction for low-value content`)
      return false
    }
  }
  
  return true
}

// ULTRA-FAST: Rule-based processing for simple cases
export function createRuleBasedChunk(content: string, order: number, fileName?: string): any {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const words = content.split(/\s+/)
  
  return {
    id: `rule-${order}`,
    summary: sentences[0]?.substring(0, 100) + '...' || 'Content summary',
    keyIdeas: [
      sentences[0]?.substring(0, 80) || 'Key point 1',
      sentences[1]?.substring(0, 80) || 'Key point 2',
      sentences[2]?.substring(0, 80) || 'Key point 3'
    ].filter(Boolean),
    detailedConcepts: [],
    title: fileName?.replace(/\.[^/.]+$/, "") || `Section ${order + 1}`,
    relatedChunks: [],
    dependencies: [],
    rawText: content,
    order,
    tokenCount: fastTokenEstimate(content),
    metadata: {
      chunkType: 'analysis',
      importance: 'medium' as const,
      processedBy: 'rule-based'
    }
  }
}

// FAST: Simple entity creation from structured data
export function createRuleBasedEntities(chunk: any): any[] {
  const entities = []
  
  // Create entities from detailed concepts (highest quality)
  chunk.detailedConcepts?.forEach((concept: any, index: number) => {
    entities.push({
      name: concept.concept,
      type: 'concept',
      desc: concept.explanation?.substring(0, 100),
      conf: 0.85, // High confidence for detailed concepts
      chunks: [chunk.id],
      cat: concept.category || 'General'
    })
  })
  
  // Create entities from key ideas if no concepts
  if (entities.length === 0) {
    chunk.keyIdeas?.slice(0, 3).forEach((idea: string, index: number) => {
      if (idea.length > 10) {
        entities.push({
          name: idea.substring(0, 50),
          type: 'concept',
          desc: idea,
          conf: 0.7,
          chunks: [chunk.id],
          cat: 'General'
        })
      }
    })
  }
  
  return entities
}

// PERFORMANCE: Progress tracking and timeout handling
export class ProcessingTimer {
  private startTime: number
  private operation: string
  
  constructor(operation: string) {
    this.startTime = Date.now()
    this.operation = operation
    console.log(`⏱️ Starting ${operation}`)
  }
  
  checkpoint(step: string) {
    const elapsed = Date.now() - this.startTime
    console.log(`⚡ ${this.operation} - ${step}: ${elapsed}ms`)
    
    // Timeout check
    if (elapsed > OPTIMIZATION_CONFIG.MAX_PROCESSING_TIME_MS) {
      console.log(`⚠️ ${this.operation} timeout after ${elapsed}ms`)
      throw new Error(`Processing timeout: ${this.operation}`)
    }
  }
  
  finish() {
    const elapsed = Date.now() - this.startTime
    console.log(`✅ ${this.operation} completed in ${elapsed}ms`)
    return elapsed
  }
}

// CACHING: Simple in-memory cache for repeated operations
class SimpleCache {
  private cache = new Map<string, any>()
  private maxSize = 100
  
  get(key: string): any {
    return this.cache.get(key)
  }
  
  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }
  
  has(key: string): boolean {
    return this.cache.has(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
}

export const processingCache = new SimpleCache()

// BATCHING: Intelligent request batching
export class RequestBatcher {
  private queue: any[] = []
  private processing = false
  
  async add(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject })
      this.processQueue()
    })
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    try {
      const batchSize = Math.min(OPTIMIZATION_CONFIG.ENTITY_BATCH_SIZE, this.queue.length)
      const batch = this.queue.splice(0, batchSize)
      
      // Process batch together (implementation depends on specific use case)
      const results = await this.processBatch(batch.map(item => item.request))
      
      // Resolve all promises
      batch.forEach((item, index) => {
        item.resolve(results[index])
      })
      
    } catch (error) {
      // Reject all promises in batch
      this.queue.forEach(item => item.reject(error))
      this.queue = []
    } finally {
      this.processing = false
      
      // Process next batch if queue not empty
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 10)
      }
    }
  }
  
  private async processBatch(requests: any[]): Promise<any[]> {
    // Placeholder - implement actual batch processing
    return requests.map(() => ({ success: true }))
  }
}

// MONITORING: Cost and performance tracking
export class CostTracker {
  private totalTokens = 0
  private totalCalls = 0
  private startTime = Date.now()
  
  recordCall(inputTokens: number, outputTokens: number, model: string) {
    this.totalTokens += inputTokens + outputTokens
    this.totalCalls++
    
    const cost = this.estimateCost(inputTokens, outputTokens, model)
    console.log(`💰 API Call: ${inputTokens + outputTokens} tokens, ~$${cost.toFixed(4)}`)
  }
  
  private estimateCost(input: number, output: number, model: string): number {
    // Rough cost estimates (as of 2024)
    if (model.includes('gpt-4')) {
      return (input * 0.01 + output * 0.03) / 1000
    } else {
      return (input * 0.001 + output * 0.002) / 1000
    }
  }
  
  getSummary() {
    const elapsed = (Date.now() - this.startTime) / 1000
    const estimatedCost = this.totalTokens * 0.002 / 1000 // Rough estimate
    
    return {
      totalCalls: this.totalCalls,
      totalTokens: this.totalTokens,
      estimatedCost,
      timeElapsed: elapsed,
      tokensPerSecond: this.totalTokens / elapsed
    }
  }
}

export const globalCostTracker = new CostTracker()

// QUALITY: Fast content quality assessment
export function assessContentQuality(content: string): number {
  let score = 0.5 // Base score
  
  // Length factor
  const length = content.length
  if (length > 1000) score += 0.2
  else if (length > 500) score += 0.1
  
  // Structural indicators
  if (content.includes('.') && content.includes(',')) score += 0.1
  if (content.match(/\d+/)) score += 0.05 // Contains numbers
  if (content.match(/[A-Z][a-z]+/)) score += 0.1 // Contains proper words
  
  // Complexity indicators
  const sentences = content.split(/[.!?]+/).length
  const avgSentenceLength = length / sentences
  if (avgSentenceLength > 10 && avgSentenceLength < 50) score += 0.15
  
  return Math.min(1.0, score)
}

