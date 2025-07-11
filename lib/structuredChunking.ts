import { OpenAI } from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Types
interface DetailedConcept {
  concept: string;
  explanation: string;
  examples?: string[];
  category?: string;
}

interface StructuredChunk {
  id: string;
  summary: string;
  keyIdeas: string[];
  detailedConcepts: DetailedConcept[];
  title?: string;
  relatedChunks: string[];
  dependencies: string[];
  rawText: string;
  order: number;
  tokenCount: number;
  metadata: {
    pageRange?: string;
    timeRange?: string;
    chapter?: string;
    chunkType?: string;
    importance?: 'low' | 'medium' | 'high';
  }
}

interface ChunkingOptions {
  maxTokensPerChunk?: number;
  overlapTokens?: number;
  sourceType: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  totalPages?: number;
  duration?: string;
  fileName?: string;
}

// OPTIMIZED: Main function with aggressive batching and cost reduction
export async function createStructuredChunks(
  extractedText: string,
  options: ChunkingOptions
): Promise<StructuredChunk[]> {
  console.log(`🚀 ULTRA-FAST Map Phase for ${options.sourceType}: ${options.fileName}`)
  
  try {
    // Step 1: Create raw chunks with larger sizes for fewer API calls
    const rawChunks = createRawChunks(extractedText, options)
    console.log(`📄 Created ${rawChunks.length} raw chunks`)
    
    // OPTIMIZATION: Skip processing if too few chunks (not worth the API cost)
    if (rawChunks.length === 1 && estimateTokens(rawChunks[0].content) < 500) {
      console.log(`⚡ Single small chunk - using fast processing`)
      return createFastSingleChunk(rawChunks[0], options)
    }
    
    // Step 2: MEGA-BATCH processing - process up to 5 chunks per call
    const batchSize = getOptimalBatchSize(rawChunks)
    console.log(`⚡ Using optimized batch size: ${batchSize}`)
    
    const structuredChunks: StructuredChunk[] = []
    const batchPromises: Promise<StructuredChunk[]>[] = []
    const maxConcurrency = 4 // Higher concurrency for speed
    
    for (let i = 0; i < rawChunks.length; i += batchSize) {
      const batch = rawChunks.slice(i, Math.min(i + batchSize, rawChunks.length))
      
      const batchPromise = structureChunkMegaBatch(
        batch,
        i, 
        rawChunks.length,
        options
      ).catch(error => {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error)
        // Return fallback chunks instead of failing completely
        return createFallbackChunks(batch, i)
      })
      
      batchPromises.push(batchPromise)
      
      // Process in waves for maximum speed
      if (batchPromises.length >= maxConcurrency || i + batchSize >= rawChunks.length) {
        const results = await Promise.allSettled(batchPromises.splice(0, batchPromises.length))
        const successful = results
          .filter((r): r is PromiseFulfilledResult<StructuredChunk[]> => r.status === 'fulfilled')
          .flatMap(r => r.value)
        
        structuredChunks.push(...successful)
        console.log(`⚡ Completed ${results.length} batches in parallel - total chunks: ${structuredChunks.length}`)
      }
    }
    
    // Step 3: SIMPLIFIED relationship analysis (only for high-importance chunks)
    console.log(`🔗 Quick relationship analysis`)
    const finalChunks = await identifyKeyRelationships(structuredChunks)
    
    console.log(`✅ ULTRA-FAST Map Phase complete: ${finalChunks.length} chunks in record time`)
    return finalChunks
    
  } catch (error) {
    console.error('❌ Fast processing failed, using emergency fallback:', error)
    return createEmergencyFallback(extractedText, options)
  }
}

// ADAPTIVE: Intelligent batch sizing based on document complexity
function getOptimalBatchSize(rawChunks: Array<{ content: string; order: number; metadata: any }>): number {
  const avgTokens = rawChunks.reduce((sum, chunk) => sum + estimateTokens(chunk.content), 0) / rawChunks.length
  const totalChunks = rawChunks.length
  
  console.log(`📊 Document profile: ${totalChunks} chunks, avg ${Math.round(avgTokens)} tokens/chunk`)
  
  // ADAPTIVE: Balance quality vs speed based on document size
  if (totalChunks <= 5) {
    // Small docs: prioritize quality with small batches
    return 1
  } else if (totalChunks <= 15) {
    // Medium docs: balanced approach
    return avgTokens < 400 ? 3 : 2
  } else if (totalChunks <= 30) {
    // Large docs: efficiency with quality preservation
    return avgTokens < 300 ? 5 : avgTokens < 600 ? 4 : 3
  } else {
    // Very large docs: optimize for speed but maintain quality
    return avgTokens < 400 ? 6 : avgTokens < 800 ? 4 : 3
  }
}

// OPTIMIZED: Mega-batch processing - up to 8 chunks in one API call
async function structureChunkMegaBatch(
  rawChunks: Array<{ content: string; order: number; metadata: any }>,
  startIndex: number,
  totalChunks: number,
  options: ChunkingOptions
): Promise<StructuredChunk[]> {

  // ULTRA-COMPRESSED context to minimize tokens
  const chunksContext = rawChunks.map((chunk, batchIndex) => {
    const globalIndex = startIndex + batchIndex
    const pos = globalIndex === 0 ? 'INTRO' : 
                globalIndex === totalChunks - 1 ? 'CONCLUSION' : 
                `PART${globalIndex + 1}`
    
    return `${pos}: ${chunk.content.substring(0, 1800)}`  // Shorter context = fewer tokens
  }).join('\n\n---\n\n')

  // BALANCED prompt for quality-speed balance
  const prompt = `Analyze ${rawChunks.length} document sections. Extract key information for each section.

DOC: ${options.fileName} (${options.sourceType})
SECTIONS ${startIndex + 1}-${startIndex + rawChunks.length}/${totalChunks}:

${chunksContext}

Return JSON with exactly ${rawChunks.length} objects:
{
  "chunks": [
    {
      "idx": ${startIndex},
      "summary": "2-3 sentence comprehensive summary",
      "keyIdeas": ["key idea 1", "key idea 2", "key idea 3", "key idea 4"],
      "concepts": [
        {
          "name": "concept name", 
          "desc": "detailed explanation", 
          "cat": "category",
          "examples": ["example1", "example2"]
        }
      ],
      "title": "descriptive section title",
      "type": "intro|analysis|conclusion|definition|example|procedure",
      "importance": "high|medium|low",
      "dependencies": ["prerequisite concept 1", "prerequisite concept 2"]
    }
  ]
}

Extract ALL key ideas (IMPORTANT!) and 2-4 detailed concepts per section. Be thorough but efficient.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // COST OPTIMIZATION: GPT-3.5 for bulk processing
      messages: [
        {
          role: "system",
          content: "Expert document analyzer. Extract key information efficiently."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3, // Balanced for consistency and creativity
      max_tokens: Math.min(4000, rawChunks.length * 600), // Increased token limit for better quality
      response_format: { type: "json_object" }
    })
    
    const aiResponse = JSON.parse(response.choices[0].message.content || '{}')
    
    if (!aiResponse.chunks || !Array.isArray(aiResponse.chunks)) {
      throw new Error('Invalid batch response format')
    }
    
    // Enhanced conversion to StructuredChunk format
    const structuredChunks: StructuredChunk[] = aiResponse.chunks.map((chunkData: any, batchIndex: number) => {
      const globalIndex = startIndex + batchIndex
      const rawChunk = rawChunks[batchIndex]
      
      return {
        id: `chunk-${globalIndex}`,
        summary: chunkData.summary || "No summary available",
        keyIdeas: (chunkData.keyIdeas || []).slice(0, 5), // Allow up to 5 key ideas
        detailedConcepts: (chunkData.concepts || []).slice(0, 4).map((c: any) => ({
          concept: c.name || 'Unknown concept',
          explanation: c.desc || 'No explanation available',
          examples: c.examples || [],
          category: c.cat || 'General'
        })),
        title: chunkData.title || `Section ${globalIndex + 1}`,
        relatedChunks: [],
        dependencies: (chunkData.dependencies || []).slice(0, 3), // Include dependencies
        rawText: rawChunk.content,
        order: globalIndex,
        tokenCount: estimateTokens(rawChunk.content),
        metadata: {
          ...rawChunk.metadata,
          chunkType: chunkData.type || 'analysis',
          importance: chunkData.importance || 'medium'
        }
      }
    })
    
    return structuredChunks
    
  } catch (error) {
    console.error(`Error in mega-batch starting at ${startIndex}:`, error)
    throw error // Re-throw to trigger fallback
  }
}

// OPTIMIZATION: Fast single chunk processing
function createFastSingleChunk(
  rawChunk: { content: string; order: number; metadata: any },
  options: ChunkingOptions
): StructuredChunk[] {
  
  const firstSentence = rawChunk.content.split('.')[0] + '.'
  const words = rawChunk.content.split(' ')
  
  return [{
    id: 'chunk-0',
    summary: firstSentence.length > 100 ? firstSentence : `Summary of ${options.fileName}`,
    keyIdeas: [
      words.slice(0, 10).join(' ') + '...',
      words.slice(10, 20).join(' ') + '...',
      words.slice(20, 30).join(' ') + '...'
    ].filter(idea => idea.length > 5),
    detailedConcepts: [],
    title: options.fileName?.replace(/\.[^/.]+$/, "") || 'Document',
    relatedChunks: [],
    dependencies: [],
    rawText: rawChunk.content,
    order: 0,
    tokenCount: estimateTokens(rawChunk.content),
    metadata: {
      ...rawChunk.metadata,
      chunkType: 'analysis',
      importance: 'medium'
    }
  }]
}

// OPTIMIZATION: Emergency fallback for any failures
function createEmergencyFallback(text: string, options: ChunkingOptions): StructuredChunk[] {
  console.log(`🚨 Emergency fallback activated`)
  
  const chunks = text.split('\n\n').filter(chunk => chunk.trim().length > 50)
  
  return chunks.slice(0, 5).map((chunk, index) => ({
    id: `fallback-${index}`,
    summary: chunk.substring(0, 100) + '...',
    keyIdeas: [`Key point ${index + 1} from ${options.fileName}`],
    detailedConcepts: [],
    title: `Section ${index + 1}`,
    relatedChunks: [],
    dependencies: [],
    rawText: chunk,
    order: index,
    tokenCount: estimateTokens(chunk),
    metadata: {
      chunkType: 'analysis',
      importance: 'medium' as const
    }
  }))
}

// OPTIMIZATION: Fallback for failed batches
function createFallbackChunks(
  rawChunks: Array<{ content: string; order: number; metadata: any }>,
  startIndex: number
): StructuredChunk[] {
  return rawChunks.map((rawChunk, batchIndex) => {
    const globalIndex = startIndex + batchIndex
    return {
      id: `fallback-${globalIndex}`,
      summary: rawChunk.content.substring(0, 100) + '...',
      keyIdeas: [`Content from section ${globalIndex + 1}`],
      detailedConcepts: [],
      title: `Section ${globalIndex + 1}`,
      relatedChunks: [],
      dependencies: [],
      rawText: rawChunk.content,
      order: globalIndex,
      tokenCount: estimateTokens(rawChunk.content),
      metadata: {
        ...rawChunk.metadata,
        chunkType: 'analysis',
        importance: 'medium' as const
      }
    }
  })
}

// SIMPLIFIED: Quick relationship identification (only for important chunks)
async function identifyKeyRelationships(chunks: StructuredChunk[]): Promise<StructuredChunk[]> {
  if (chunks.length <= 2) return chunks
  
  // OPTIMIZATION: Only analyze high-importance chunks for relationships
  const importantChunks = chunks.filter(chunk => 
    chunk.metadata.importance === 'high' || 
    chunk.order === 0 || 
    chunk.order === chunks.length - 1
  )
  
  if (importantChunks.length === 0) return chunks
  
  console.log(`🔗 Quick relationship analysis for ${importantChunks.length} important chunks`)
  
  // Simple rule-based relationships (no AI call needed)
  chunks.forEach(chunk => {
    // Connect to previous chunk if they share concepts
    if (chunk.order > 0) {
      const prevChunk = chunks[chunk.order - 1]
      const sharedConcepts = chunk.detailedConcepts.some(concept =>
        prevChunk.detailedConcepts.some(prevConcept => 
          prevConcept.concept.toLowerCase().includes(concept.concept.toLowerCase()) ||
          concept.concept.toLowerCase().includes(prevConcept.concept.toLowerCase())
        )
      )
      if (sharedConcepts) {
        chunk.relatedChunks.push(prevChunk.id)
      }
    }
  })
  
  return chunks
}

// OPTIMIZATION: Larger chunk sizes to reduce total number of API calls
function createRawChunks(
  text: string, 
  options: ChunkingOptions
): Array<{ content: string; order: number; metadata: any }> {
  const maxTokens = options.maxTokensPerChunk || 1800 // LARGER chunks for fewer calls
  const overlapTokens = options.overlapTokens || 100  // SMALLER overlap to reduce redundancy
  
  console.log(`📏 Input: ${text.length} chars, target: ${maxTokens} tokens per chunk`)
  
  const chunks: Array<{ content: string; order: number; metadata: any }> = []
  
  // Simple but effective splitting
  let sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 30)
  
  if (sections.length === 1) {
    // Force split very long single sections
    const maxChars = maxTokens * 4 // Rough char estimate
    sections = []
    let start = 0
    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length)
      // Find good break point
      if (end < text.length) {
        const breakPoint = text.lastIndexOf('.', end)
        if (breakPoint > start + maxChars * 0.7) {
          end = breakPoint + 1
        }
      }
      sections.push(text.slice(start, end).trim())
      start = end
    }
  }
  
  let currentChunk = ""
  let currentTokens = 0
  let chunkOrder = 0
  
  for (const section of sections) {
    const sectionTokens = estimateTokens(section)
    
    if (currentTokens + sectionTokens > maxTokens && currentChunk) {
      // Finalize current chunk
      chunks.push({
        content: currentChunk.trim(),
        order: chunkOrder,
        metadata: generateChunkMetadata(chunkOrder, options)
      })
      
      chunkOrder++
      
      // Start new chunk with minimal overlap
      const overlap = getLastSentences(currentChunk, overlapTokens)
      currentChunk = overlap ? overlap + "\n\n" + section : section
      currentTokens = estimateTokens(currentChunk)
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + section
      currentTokens += sectionTokens
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      order: chunkOrder,
      metadata: generateChunkMetadata(chunkOrder, options)
    })
  }
  
  console.log(`✅ Created ${chunks.length} optimized chunks`)
  return chunks
}

// Helper functions (unchanged but optimized)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function getLastSentences(text: string, maxTokens: number): string {
  const sentences = text.split(/[.!?]+/)
  let result = ""
  let tokens = 0
  
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i].trim()
    if (!sentence) continue
    
    const sentenceTokens = estimateTokens(sentence)
    if (tokens + sentenceTokens > maxTokens) break
    
    result = sentence + ". " + result
    tokens += sentenceTokens
  }
  
  return result.trim()
}

function generateChunkMetadata(chunkOrder: number, options: ChunkingOptions) {
  return {} // Simplified metadata generation
}

export type { StructuredChunk, DetailedConcept, ChunkingOptions }