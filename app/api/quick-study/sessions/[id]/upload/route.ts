// ULTRA-OPTIMIZED upload route with maximum speed and cost reduction

export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { createStructuredChunks, type StructuredChunk } from '../../../../../../lib/structuredChunking'
import { buildKnowledgeGraph, type KnowledgeGraph } from '../../../../../../lib/knowledgeGraph'
import { 
  OPTIMIZATION_CONFIG,
  ultraFastPreprocess,
  shouldSkipProcessing,
  ProcessingTimer,
  globalCostTracker,
  assessContentQuality,
  filterValuableContent,
  createRuleBasedChunk,
  createRuleBasedEntities,
  fastTokenEstimate
} from '../../../../../../lib/optimizationUtils'

// PDF processing library
import PDFParser from 'pdf2json'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error' | 'structuring' | 'building_graph';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  structuredChunks?: StructuredChunk[];
  knowledgeGraph?: KnowledgeGraph;
  processingStage?: 'extracting' | 'structuring' | 'building_graph' | 'complete';
  processingStats?: {
    extractionTime: number;
    chunkingTime: number;
    graphTime: number;
    totalTime: number;
    tokensSaved: number;
    costEstimate: number;
  };
}

interface SessionData {
  sources: Source[]
  outputs: any[]
  createdAt: Date
}

// Global in-memory store
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// ULTRA-OPTIMIZED upload processing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const overallTimer = new ProcessingTimer('ULTRA-UPLOAD')
  
  try {
    const sessionId = params.id
    
    console.log(`🚀 ULTRA-FAST Upload for session: ${sessionId}`)
    
    // Check session
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      return Response.json({ message: 'Session not found' }, { status: 404 })
    }
    
    // Parse files
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (files.length === 0) {
      return Response.json({ message: 'No files provided' }, { status: 400 })
    }
    
    overallTimer.checkpoint('Files parsed')
    
    // OPTIMIZATION: Process files in parallel with limited concurrency
    const newSources: Source[] = []
    const maxConcurrency = 3
    
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, Math.min(i + maxConcurrency, files.length))
      
      const batchPromises = batch.map((file, batchIndex) => 
        ultraFastFileProcessing(file, i + batchIndex)
      )
      
      const results = await Promise.allSettled(batchPromises)
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newSources.push(result.value)
        } else {
          console.error(`❌ File ${batch[index].name} failed:`, result.reason)
          newSources.push(createErrorSource(batch[index], result.reason))
        }
      })
      
      console.log(`⚡ Processed batch ${Math.floor(i/maxConcurrency) + 1}, total: ${newSources.length}`)
    }
    
    overallTimer.checkpoint('All files processed')
    
    // Add to session
    sessionData.sources.push(...newSources)
    
    const totalTime = overallTimer.finish()
    console.log(`🚀 ULTRA-UPLOAD complete: ${newSources.length} files in ${totalTime}ms`)
    
    // Log cost savings
    const costSummary = globalCostTracker.getSummary()
    console.log(`💰 Cost Summary:`, costSummary)
    
    return Response.json(newSources)
    
  } catch (error) {
    console.error('❌ ULTRA-UPLOAD failed:', error)
    return Response.json({ message: 'Upload failed' }, { status: 500 })
  }
}

// ULTRA-OPTIMIZED: Single file processing with maximum speed
async function ultraFastFileProcessing(file: File, index: number): Promise<Source> {
  const fileTimer = new ProcessingTimer(`File-${file.name}`)
  
  // Create source with tracking
  const source: Source = {
    id: `ultrafast-${Date.now()}-${index}`,
    name: file.name,
    type: getFileType(file),
    status: 'processing',
    size: formatFileSize(file.size),
    processingStats: {
      extractionTime: 0,
      chunkingTime: 0,
      graphTime: 0,
      totalTime: 0,
      tokensSaved: 0,
      costEstimate: 0
    }
  }
  
  try {
    // OPTIMIZATION: Early quality check
    if (file.size === 0) {
      throw new Error('Empty file')
    }
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large (max 50MB)')
    }
    
    fileTimer.checkpoint('Validation complete')
    
    // STEP 1: ULTRA-FAST content extraction
    const extractionStart = Date.now()
    await ultraFastContentExtraction(file, source)
    source.processingStats!.extractionTime = Date.now() - extractionStart
    
    fileTimer.checkpoint('Content extracted')
    
    // OPTIMIZATION: Skip processing if content is too simple
    if (shouldSkipProcessing(source.extractedText || '', source.type)) {
      source.status = 'ready'
      source.processingStage = 'complete'
      source.processingStats!.totalTime = fileTimer.finish()
      return source
    }
    
    // OPTIMIZATION: Quality-based processing decisions
    const contentQuality = assessContentQuality(source.extractedText || '')
    console.log(`📊 Content quality: ${(contentQuality * 100).toFixed(1)}%`)
    
    if (contentQuality < 0.3) {
      console.log(`⚡ Low quality content - using fast processing`)
      await ultraFastSimpleProcessing(source)
    } else {
      // STEP 2: ULTRA-FAST structured chunking
      await ultraFastChunking(source, file.name)
      fileTimer.checkpoint('Chunking complete')
      
    // STEP 3: ADAPTIVE knowledge graph based on document size
    if (contentQuality > 0.6 && source.structuredChunks && source.structuredChunks.length > 0) {
      await adaptiveGraphBuilding(source, file.name)
      fileTimer.checkpoint('Adaptive graph complete')
    } else {
      console.log(`⚡ Skipping graph for low-complexity content`)
      source.processingStage = 'complete'
    }
    }
    
    source.status = 'ready'
    source.processingStats!.totalTime = fileTimer.finish()
    
    console.log(`✅ ${file.name}: ${source.processingStats!.totalTime}ms total`)
    return source
    
  } catch (error) {
    console.error(`❌ Error processing ${file.name}:`, error)
    source.status = 'error'
    source.processingError = error instanceof Error ? error.message : 'Processing failed'
    source.processingStats!.totalTime = Date.now() - fileTimer['startTime']
    return source
  }
}

// ULTRA-FAST: Content extraction with minimal processing
async function ultraFastContentExtraction(file: File, source: Source): Promise<void> {
  switch (source.type) {
    case 'pdf':
      await ultraFastPDFProcessing(file, source)
      break
      
    case 'text':
      await ultraFastTextProcessing(file, source)
      break
      
    default:
      // Placeholder for other types
      source.extractedText = `Placeholder content for ${source.type} file: ${file.name}`
      source.wordCount = 10
      break
  }
  
  // OPTIMIZATION: Filter and preprocess extracted text
  if (source.extractedText) {
    const originalLength = source.extractedText.length
    source.extractedText = filterValuableContent(ultraFastPreprocess(source.extractedText))
    const newLength = source.extractedText.length
    
    source.processingStats!.tokensSaved = Math.ceil((originalLength - newLength) / 4)
    source.wordCount = countWords(source.extractedText)
    
    console.log(`⚡ Text optimized: ${originalLength} → ${newLength} chars (${source.processingStats!.tokensSaved} tokens saved)`)
  }
}

// ULTRA-FAST: PDF processing with minimal overhead
async function ultraFastPDFProcessing(file: File, source: Source): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const pdfParser = new PDFParser()
      
      // Timeout for stuck PDFs
      const timeout = setTimeout(() => {
        reject(new Error('PDF processing timeout'))
      }, OPTIMIZATION_CONFIG.MAX_PROCESSING_TIME_MS)
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        clearTimeout(timeout)
        reject(new Error(`PDF parsing failed: ${errData.parserError}`))
      })
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        clearTimeout(timeout)
        
        try {
          let fullText = ''
          let pageCount = 0
          
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pageCount = pdfData.Pages.length
            
            // OPTIMIZATION: Process pages in chunks, skip if too many
            const maxPages = 50 // Process max 50 pages for speed
            const pagesToProcess = Math.min(pageCount, maxPages)
            
            for (let pageIndex = 0; pageIndex < pagesToProcess; pageIndex++) {
              const page = pdfData.Pages[pageIndex]
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((text: any) => {
                  if (text.R && Array.isArray(text.R)) {
                    text.R.forEach((textRun: any) => {
                      if (textRun.T) {
                        const decodedText = decodeURIComponent(textRun.T)
                        fullText += decodedText + ' '
                      }
                    })
                  }
                })
                fullText += '\n\n'
              }
            }
            
            if (pageCount > maxPages) {
              console.log(`⚡ Processed ${maxPages}/${pageCount} pages for speed optimization`)
            }
          }
          
          if (!fullText || fullText.length < 50) {
            reject(new Error('PDF appears to be empty or image-only'))
            return
          }
          
          source.extractedText = fullText
          source.pages = pageCount
          
          console.log(`✅ PDF processed: ${source.pages} pages`)
          resolve()
          
        } catch (error) {
          reject(new Error(`Text extraction failed: ${error}`))
        }
      })
      
      // Parse PDF
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      pdfParser.parseBuffer(buffer)
      
    } catch (error) {
      reject(new Error(`PDF processing failed: ${error}`))
    }
  })
}

// ULTRA-FAST: Text file processing
async function ultraFastTextProcessing(file: File, source: Source): Promise<void> {
  try {
    const text = await file.text()
    
    if (!text || text.length < 10) {
      throw new Error('Text file is empty')
    }
    
    source.extractedText = text
    console.log(`✅ Text processed: ${text.length} chars`)
    
  } catch (error) {
    throw new Error(`Text processing failed: ${error}`)
  }
}

// ULTRA-FAST: Simple processing for low-quality content
async function ultraFastSimpleProcessing(source: Source): Promise<void> {
  console.log(`⚡ Ultra-fast simple processing`)
  
  // Create single chunk without AI
  const chunk = createRuleBasedChunk(source.extractedText || '', 0, source.name)
  source.structuredChunks = [chunk]
  
  // Create simple entities
  const entities = createRuleBasedEntities(chunk)
  
  // Create minimal knowledge graph
  source.knowledgeGraph = {
    entities: new Map(),
    relations: new Map(),
    metadata: {
      sourceName: source.name,
      totalChunks: 1,
      lastUpdated: new Date(),
      version: "rule-based"
    }
  }
  
  // Add entities to graph
  entities.forEach((entity, index) => {
    source.knowledgeGraph!.entities.set(`rule_${index}`, {
      id: `rule_${index}`,
      type: 'concept',
      name: entity.name,
      aliases: [],
      properties: { description: entity.desc },
      descriptions: [entity.desc],
      sourceChunks: entity.chunks,
      confidence: entity.conf,
      category: entity.cat,
      lastUpdated: new Date()
    })
  })
  
  source.processingStage = 'complete'
  console.log(`⚡ Simple processing complete: ${entities.length} entities`)
}

// ULTRA-FAST: Structured chunking with optimizations
async function ultraFastChunking(source: Source, fileName: string): Promise<void> {
  if (!source.extractedText) return
  
  console.log(`⚡ Ultra-fast chunking`)
  source.status = 'structuring'
  source.processingStage = 'structuring'
  
  const chunkingStart = Date.now()
  
  try {
    const options = {
      sourceType: source.type,
      totalPages: source.pages,
      fileName: fileName,
      maxTokensPerChunk: OPTIMIZATION_CONFIG.MAX_TOKENS_PER_CHUNK
    }
    
    source.structuredChunks = await createStructuredChunks(source.extractedText, options)
    source.processingStats!.chunkingTime = Date.now() - chunkingStart
    
    console.log(`✅ Chunking: ${source.structuredChunks.length} chunks in ${source.processingStats!.chunkingTime}ms`)
    
  } catch (error) {
    console.error(`❌ Chunking failed:`, error)
    // Fallback to simple processing
    await ultraFastSimpleProcessing(source)
  }
}

// ADAPTIVE: Knowledge graph building based on document size
async function adaptiveGraphBuilding(source: Source, fileName: string): Promise<void> {
  if (!source.structuredChunks) return
  
  console.log(`🎯 Adaptive graph building for ${source.pages || 'unknown'} pages`)
  source.status = 'building_graph'
  source.processingStage = 'building_graph'
  
  const graphStart = Date.now()
  
  try {
    // Import adaptive function
    const { buildAdaptiveKnowledgeGraph } = await import('../../../../../../lib/sweet-spot-optimization')
    
    source.knowledgeGraph = await buildAdaptiveKnowledgeGraph(
      source.structuredChunks, 
      fileName,
      source.pages
    )
    source.processingStats!.graphTime = Date.now() - graphStart
    
    console.log(`✅ Adaptive Graph: ${source.knowledgeGraph.entities.size} entities in ${source.processingStats!.graphTime}ms`)
    
  } catch (error) {
    console.error(`❌ Adaptive graph building failed:`, error)
    // Continue without graph
    source.processingStage = 'complete'
  }
}

// Helper functions
function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf'
  if (mimeType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text'
  if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'docx'
  if (mimeType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif)$/)) return 'image'
  if (mimeType.includes('audio') || fileName.match(/\.(mp3|wav|m4a)$/)) return 'audio'
  
  return 'text'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}

function createErrorSource(file: File, error: any): Source {
  return {
    id: `error-${Date.now()}`,
    name: file.name,
    type: getFileType(file),
    status: 'error',
    size: formatFileSize(file.size),
    processingError: error instanceof Error ? error.message : 'Processing failed',
    processingStats: {
      extractionTime: 0,
      chunkingTime: 0,
      graphTime: 0,
      totalTime: 0,
      tokensSaved: 0,
      costEstimate: 0
    }
  }
}