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

// Main function - Map Phase
export async function createStructuredChunks(
  extractedText: string,
  options: ChunkingOptions
): Promise<StructuredChunk[]> {
  console.log(`🔧 Starting Map Phase for ${options.sourceType}: ${options.fileName}`)
  
  try {
    // Step 1: Create raw chunks with overlap
    const rawChunks = createRawChunks(extractedText, options)
    console.log(`📄 Created ${rawChunks.length} raw chunks`)
    
    // Step 2: Structure each chunk with AI
    const structuredChunks: StructuredChunk[] = []
    
    for (let i = 0; i < rawChunks.length; i++) {
      console.log(`🤖 Processing chunk ${i + 1}/${rawChunks.length} (${estimateTokens(rawChunks[i].content)} tokens)`)
      
      const structured = await structureChunk(
        rawChunks[i], 
        i, 
        rawChunks.length,
        options
      )
      
      structuredChunks.push(structured)
      
      // Rate limiting: longer delay for larger batches
      if (i < rawChunks.length - 1) {
        const delay = rawChunks.length > 10 ? 200 : 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // Step 3: Identify relationships between chunks
    console.log(`🔗 Analyzing chunk relationships`)
    const chunksWithRelationships = await identifyRelationships(structuredChunks)
    
    // Step 4: Refine metadata now that we know total chunk count
    const finalChunks = refineChunkMetadata(chunksWithRelationships, options)
    
    console.log(`✅ Map Phase complete: ${finalChunks.length} structured chunks`)
    return finalChunks
    
  } catch (error) {
    console.error('❌ Map Phase failed:', error)
    throw new Error(`Structured chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Step 1: Create raw chunks with intelligent splitting
function createRawChunks(
  text: string, 
  options: ChunkingOptions
): Array<{ content: string; order: number; metadata: any }> {
  const maxTokens = options.maxTokensPerChunk || 1200
  const overlapTokens = options.overlapTokens || 150
  
  console.log(`📏 Input text: ${text.length} chars, ~${estimateTokens(text)} tokens`)
  console.log(`🎯 Target: ${maxTokens} tokens per chunk with ${overlapTokens} overlap`)
  
  const chunks: Array<{ content: string; order: number; metadata: any }> = []
  
  // Try multiple splitting strategies in order of preference
  let sections = tryParagraphSplit(text)
  if (sections.length === 1) {
    console.log(`⚠️ Paragraph split failed, trying sentence split`)
    sections = trySentenceSplit(text)
  }
  if (sections.length === 1) {
    console.log(`⚠️ Sentence split failed, using character split`)
    sections = forceCharacterSplit(text, maxTokens)
  }
  
  console.log(`📋 Split into ${sections.length} sections`)
  
  let currentChunk = ""
  let currentTokens = 0
  let chunkOrder = 0
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim()
    if (!section) continue
    
    const sectionTokens = estimateTokens(section)
    
    // If this single section is too big, split it further
    if (sectionTokens > maxTokens) {
      console.log(`⚠️ Section ${i} too large (${sectionTokens} tokens), force splitting`)
      
      // Save current chunk if exists
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          order: chunkOrder,
          metadata: generateChunkMetadata(chunkOrder, options)
        })
        chunkOrder++
        currentChunk = ""
        currentTokens = 0
      }
      
      // Split the large section
      const subChunks = forceCharacterSplit(section, maxTokens)
      for (const subChunk of subChunks) {
        if (subChunk.trim()) {
          chunks.push({
            content: subChunk.trim(),
            order: chunkOrder,
            metadata: generateChunkMetadata(chunkOrder, options)
          })
          chunkOrder++
        }
      }
      continue
    }
    
    // If adding this section would exceed limit, finalize current chunk
    if (currentTokens + sectionTokens > maxTokens && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        order: chunkOrder,
        metadata: generateChunkMetadata(chunkOrder, options)
      })
      
      chunkOrder++
      
      // Start new chunk with overlap
      const overlap = getLastSentences(currentChunk, overlapTokens)
      currentChunk = overlap ? overlap + "\n\n" + section : section
      currentTokens = estimateTokens(currentChunk)
    } else {
      // Add section to current chunk
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
  
  console.log(`✅ Created ${chunks.length} chunks, sizes: ${chunks.map(c => estimateTokens(c.content)).join(', ')} tokens`)
  
  return chunks
}

// Helper functions for different splitting strategies
function tryParagraphSplit(text: string): string[] {
  const sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 20)
  console.log(`🔍 Paragraph split: ${sections.length} sections`)
  return sections
}

function trySentenceSplit(text: string): string[] {
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10)
  console.log(`🔍 Sentence split: ${sentences.length} sentences`)
  
  // Group sentences into reasonable sections (aim for ~5-10 sentences per section)
  const sections: string[] = []
  let currentSection = ""
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim()
    if (!sentence) continue
    
    currentSection += sentence + ". "
    
    // Every 7 sentences or when we hit a reasonable size, create a section
    if ((i + 1) % 7 === 0 || estimateTokens(currentSection) > 800) {
      sections.push(currentSection.trim())
      currentSection = ""
    }
  }
  
  // Don't forget the last section
  if (currentSection.trim()) {
    sections.push(currentSection.trim())
  }
  
  return sections
}

function forceCharacterSplit(text: string, maxTokens: number): string[] {
  const maxChars = maxTokens * 3.5 // Conservative estimate: ~3.5 chars per token
  const sections: string[] = []
  
  console.log(`🔪 Force splitting ${text.length} chars into ~${maxChars} char chunks`)
  
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)
    
    // Try to find a good breaking point (sentence end, paragraph end, space)
    if (end < text.length) {
      // Look backward for a sentence end
      let goodBreak = text.lastIndexOf('.', end)
      if (goodBreak === -1) goodBreak = text.lastIndexOf('!', end)
      if (goodBreak === -1) goodBreak = text.lastIndexOf('?', end)
      if (goodBreak === -1) goodBreak = text.lastIndexOf('\n', end)
      if (goodBreak === -1) goodBreak = text.lastIndexOf(' ', end)
      
      if (goodBreak > start + maxChars * 0.5) { // Don't break too early
        end = goodBreak + 1
      }
    }
    
    const chunk = text.slice(start, end).trim()
    if (chunk) {
      sections.push(chunk)
    }
    
    start = end
  }
  
  console.log(`🔪 Force split result: ${sections.length} sections`)
  return sections
}

// Step 2: Structure individual chunk with AI
async function structureChunk(
  rawChunk: { content: string; order: number; metadata: any },
  index: number,
  totalChunks: number,
  options: ChunkingOptions
): Promise<StructuredChunk> {
  
  const isFirstChunk = index === 0
  const isLastChunk = index === totalChunks - 1
  const positionContext = isFirstChunk ? " (introduction/opening)" : 
                         isLastChunk ? " (conclusion/ending)" : 
                         " (middle section)"
  
  const prompt = `Przeanalizuj fragment dokumentu i wyciągnij strukturalne informacje.

KONTEKST:
- Typ dokumentu: ${options.sourceType}
- Pozycja: fragment ${index + 1}/${totalChunks}${positionContext}
- Nazwa pliku: ${options.fileName || 'nieznana'}

TREŚĆ DO ANALIZY:
${rawChunk.content}

Zwróć odpowiedź w formacie JSON:
{
  "summary": "Zwięzłe streszczenie w 1-3 zdaniach",
  "keyIdeas": ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"],
  "detailedConcepts": [
    {
      "concept": "Nazwa konceptu",
      "explanation": "Szczegółowe wyjaśnienie",
      "examples": ["Przykład 1", "Przykład 2"],
      "category": "Kategoria tematyczna"
    }
  ],
  "title": "Opisowy tytuł sekcji",
  "chunkType": "definition|example|procedure|conclusion|introduction|analysis",
  "importance": "high|medium|low",
  "dependencies": ["Koncepty które muszą być znane wcześniej"]
}

INSTRUKCJE:
- keyIdeas: 3-5 najważniejszych faktów/konceptów z tego fragmentu
- detailedConcepts: 1-3 najbardziej złożone koncepty wymagające wyjaśnienia
- summary: Nie wspominaj o "fragmencie" - opisz co zawiera
- title: Kreatywny, opisowy tytuł sekcji
- chunkType: Określ główny charakter tego fragmentu
- importance: Na podstawie kluczowości dla zrozumienia całości
- dependencies: Koncepty z wcześniejszych fragmentów, potrzebne do zrozumienia`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "Jesteś ekspertem w analizie tekstów akademickich. Wyciągasz strukturalne informacje z dokumentów w sposób precyzyjny i użyteczny dla studentów."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800, // Reduced to ensure we don't exceed limits
      response_format: { type: "json_object" }
    })
    
    const aiResponse = JSON.parse(response.choices[0].message.content || '{}')
    
    // Validate and normalize response
    const structuredChunk: StructuredChunk = {
      id: `chunk-${index}`,
      summary: aiResponse.summary || "Brak podsumowania",
      keyIdeas: Array.isArray(aiResponse.keyIdeas) ? aiResponse.keyIdeas.slice(0, 5) : [],
      detailedConcepts: Array.isArray(aiResponse.detailedConcepts) ? aiResponse.detailedConcepts.slice(0, 3) : [],
      title: aiResponse.title || `Sekcja ${index + 1}`,
      relatedChunks: [], // Will be filled in Step 3
      dependencies: Array.isArray(aiResponse.dependencies) ? aiResponse.dependencies : [],
      rawText: rawChunk.content,
      order: index,
      tokenCount: estimateTokens(rawChunk.content),
      metadata: {
        ...rawChunk.metadata,
        chunkType: aiResponse.chunkType || 'analysis',
        importance: aiResponse.importance || 'medium'
      }
    }
    
    return structuredChunk
    
  } catch (error) {
    console.error(`Error structuring chunk ${index}:`, error)
    
    // Fallback structure if AI fails
    return {
      id: `chunk-${index}`,
      summary: "Nie udało się przeanalizować tego fragmentu",
      keyIdeas: [],
      detailedConcepts: [],
      title: `Sekcja ${index + 1}`,
      relatedChunks: [],
      dependencies: [],
      rawText: rawChunk.content,
      order: index,
      tokenCount: estimateTokens(rawChunk.content),
      metadata: {
        ...rawChunk.metadata,
        chunkType: 'analysis',
        importance: 'medium' as const
      }
    }
  }
}

// Step 3: Identify relationships between chunks
async function identifyRelationships(chunks: StructuredChunk[]): Promise<StructuredChunk[]> {
  if (chunks.length <= 1) return chunks
  
  // For large documents, only analyze relationships for high-importance chunks
  const importantChunks = chunks.filter(chunk => 
    chunk.metadata.importance === 'high' || 
    chunk.metadata.chunkType === 'definition' ||
    chunk.order === 0 || // First chunk
    chunk.order === chunks.length - 1 // Last chunk
  )
  
  // Create summary of all chunks for relationship analysis
  const chunkSummaries = chunks.map(chunk => ({
    id: chunk.id,
    order: chunk.order,
    title: chunk.title,
    keyIdeas: chunk.keyIdeas.slice(0, 3), // Limit to first 3 ideas
    chunkType: chunk.metadata.chunkType
  }))
  
  const prompt = `Przeanalizuj powiązania między fragmentami dokumentu.

FRAGMENTY DO ANALIZY:
${JSON.stringify(chunkSummaries, null, 2)}

Zidentyfikuj logiczne powiązania i zwróć JSON:
{
  "relationships": [
    {
      "chunkId": "chunk-2",
      "relatedChunks": ["chunk-1", "chunk-4"],
      "relationshipTypes": ["builds_on", "explains", "contradicts", "examples_of"]
    }
  ]
}

TYPY RELACJI:
- builds_on: Fragment rozwijający wcześniejsze koncepty
- explains: Fragment wyjaśniający szczegóły z innego fragmentu  
- examples_of: Fragment zawierający przykłady konceptów z innego
- contradicts: Fragment przedstawiający alternatywne podejście
- concludes: Fragment podsumowujący wcześniejsze fragmenty

OGRANICZENIA:
- Maksymalnie 3 relacje per fragment
- Priorytet dla logicznych następstw i wyjaśnień`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: "Analizujesz strukturalne powiązania w dokumentach akademickich. Identyfikujesz logiczne zależności między sekcjami."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    })
    
    const relationships = JSON.parse(response.choices[0].message.content || '{}')
    
    // Apply relationships to chunks
    const updatedChunks = chunks.map(chunk => {
      const chunkRelationships = relationships.relationships?.find(
        (rel: any) => rel.chunkId === chunk.id
      )
      
      return {
        ...chunk,
        relatedChunks: chunkRelationships?.relatedChunks || []
      }
    })
    
    return updatedChunks
    
  } catch (error) {
    console.error('Error analyzing relationships:', error)
    return chunks // Return chunks without relationships if analysis fails
  }
}

// Helper functions
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English/Polish text
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

function generateChunkMetadata(
  chunkOrder: number,
  options: ChunkingOptions
) {
  const metadata: any = {}
  
  // For now, we'll estimate page/time ranges based on chunk order
  // We can refine this later when we know total chunks
  if (options.sourceType === 'pdf' && options.totalPages) {
    // Rough estimate - will be refined later
    metadata.pageRange = `~${Math.floor(chunkOrder * 10) + 1}+`
  } else if ((options.sourceType === 'youtube' || options.sourceType === 'audio') && options.duration) {
    // Rough estimate for time - will be refined later  
    const durationSeconds = parseDuration(options.duration)
    if (durationSeconds > 0) {
      const estimatedStartTime = Math.floor((chunkOrder * durationSeconds) / 20) // Rough estimate
      metadata.timeRange = `~${formatTime(estimatedStartTime)}+`
    }
  }
  
  return metadata
}

function parseDuration(duration: string): number {
  // Parse duration strings like "5:30", "1:30:45", etc.
  const parts = duration.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Step 4: Refine metadata with accurate page/time ranges
function refineChunkMetadata(chunks: StructuredChunk[], options: ChunkingOptions): StructuredChunk[] {
  const totalChunks = chunks.length
  
  return chunks.map((chunk, index) => {
    const updatedMetadata = { ...chunk.metadata }
    
    if (options.sourceType === 'pdf' && options.totalPages) {
      // Calculate accurate page ranges
      const pagesPerChunk = options.totalPages / totalChunks
      const startPage = Math.floor(index * pagesPerChunk) + 1
      const endPage = Math.min(
        Math.floor((index + 1) * pagesPerChunk),
        options.totalPages
      )
      updatedMetadata.pageRange = `${startPage}-${endPage}`
    } else if ((options.sourceType === 'youtube' || options.sourceType === 'audio') && options.duration) {
      // Calculate accurate time ranges
      const durationSeconds = parseDuration(options.duration)
      if (durationSeconds > 0) {
        const secondsPerChunk = durationSeconds / totalChunks
        const startTime = Math.floor(index * secondsPerChunk)
        const endTime = Math.floor((index + 1) * secondsPerChunk)
        updatedMetadata.timeRange = `${formatTime(startTime)}-${formatTime(endTime)}`
      }
    }
    
    return {
      ...chunk,
      metadata: updatedMetadata
    }
  })
}

export type { StructuredChunk, DetailedConcept, ChunkingOptions }