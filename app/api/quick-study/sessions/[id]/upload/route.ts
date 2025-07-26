export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import PDFParser from 'pdf2json'
import * as mammoth from 'mammoth'
import { OpenAI } from 'openai'
import { TextOptimizationService } from '@/app/services/TextOptimizationService'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  optimizedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  metadata?: {
    processingMethod?: string;
    confidence?: number;
    language?: string;
    apiCost?: number;
  };
  optimizationStats?: {
    originalLength: number;
    optimizedLength: number;
    compressionRatio: number;
    processingCost: number;
    chunkCount: number;
    keyTopics: string[];
    optimizedAt: Date;
    processingTimeMs: number;
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

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  pdf: 50 * 1024 * 1024,      // 50MB
  text: 10 * 1024 * 1024,     // 10MB
  docx: 25 * 1024 * 1024,     // 25MB
  image: 20 * 1024 * 1024,    // 20MB (Vision API limit)
  audio: 25 * 1024 * 1024,    // 25MB (Whisper API limit)
  video: 100 * 1024 * 1024,   // 100MB (will extract audio)
}

// Upload files to session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`📤 Upload request for session: ${sessionId}`)
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (files.length === 0) {
      return Response.json(
        { message: 'No files provided' },
        { status: 400 }
      )
    }
    
    console.log(`📁 Processing ${files.length} files`)
    
    // Process each file
    const newSources: Source[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      console.log(`🔍 Processing file: ${file.name} (${file.size} bytes, ${file.type})`)
      
      // Basic file validation
      if (file.size === 0) {
        console.log(`⚠️ Skipping empty file: ${file.name}`)
        continue
      }
      
      // Determine file type and check size limit
      const fileType = getFileType(file)
      const sizeLimit = FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS] || FILE_SIZE_LIMITS.text
      
      if (file.size > sizeLimit) {
        console.log(`⚠️ File too large: ${file.name}`)
        newSources.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          type: fileType,
          status: 'error',
          size: formatFileSize(file.size),
          processingError: `File too large (max ${formatFileSize(sizeLimit)})`
        })
        continue
      }
      
      // Create source object with initial processing status
      const source: Source = {
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: fileType,
        status: 'processing',
        size: formatFileSize(file.size),
        metadata: {
          processingMethod: `${fileType.toUpperCase()} processor`
        }
      }
      
      // FIXED: Process file synchronously and wait for completion
      try {
        console.log(`🔄 Processing content for ${file.name} synchronously...`)
        await processFileContent(file, source)
        console.log(`✅ Successfully processed: ${source.name} (Status: ${source.status})`)
      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error)
        source.status = 'error'
        source.processingError = error instanceof Error ? error.message : 'Processing failed'
      }
      
      newSources.push(source)
    }
    
    // Add sources to session only after all processing is complete
    sessionData.sources.push(...newSources)
    console.log(`📊 Added ${newSources.length} sources to session. Total sources: ${sessionData.sources.length}`)
    
    // Log final status
    const readyCount = newSources.filter(s => s.status === 'ready').length
    const errorCount = newSources.filter(s => s.status === 'error').length
    console.log(`📊 Upload complete - Ready: ${readyCount}, Error: ${errorCount}`)
    
    return Response.json(newSources)
    
  } catch (error) {
    console.error('❌ Error uploading files:', error)
    return Response.json({ message: 'Failed to upload files' }, { status: 500 })
  }
}

// Process file content based on type
async function processFileContent(file: File, source: Source): Promise<void> {
  console.log(`🔄 Processing content for ${file.name} (type: ${source.type})`)
  
  try {
    switch (source.type) {
      case 'pdf':
        await processPDF(file, source)
        break
        
      case 'text':
        await processTextFile(file, source)
        break
        
      case 'docx':
        await processDOCX(file, source)
        break
        
      case 'image':
        await processImageWithVision(file, source)
        break
        
      case 'audio':
        await processAudioWithWhisper(file, source)
        break
        
      case 'youtube': // Video files
        await processVideoWithWhisper(file, source)
        break
        
      default:
        throw new Error(`Unsupported file type: ${source.type}`)
    }
    
    // Final validation
    if (!source.extractedText || source.extractedText.length < 10) {
      throw new Error('No meaningful text content could be extracted from this file')
    }

    // FIXED: Explicitly set status to ready
    source.status = 'ready'
    console.log(`✅ File processing completed successfully: ${file.name} - Status set to: ${source.status}`)

    // =================== AUTO-OPTIMIZATION ===================
    console.log(`\n🔍 CHECKING IF OPTIMIZATION IS NEEDED`)
    console.log(`📊 Extracted text length: ${source.extractedText.length} characters`)
    console.log(`📊 Word count: ${source.wordCount || 'unknown'}`)
    
    // Check if text optimization is needed (>10k chars)
    if (source.extractedText.length > 10000) {
      console.log(`📈 Text is large enough for optimization (${source.extractedText.length} chars)`)
      console.log(`🤖 Starting text optimization...`)
      
      try {
        const optimizationService = new TextOptimizationService()
        const optimizationResult = await optimizationService.optimizeText(
          source.extractedText,
          source.name,
          source.type
        )
        
        // Add optimization data to source
        source.optimizedText = optimizationResult.optimizedText
        source.optimizationStats = optimizationResult.stats
        
        console.log(`✅ Text optimization completed`)
        console.log(`📊 Original: ${optimizationResult.stats.originalLength} chars → Optimized: ${optimizationResult.stats.optimizedLength} chars`)
        console.log(`📉 Compression ratio: ${(optimizationResult.stats.compressionRatio * 100).toFixed(1)}%`)
        console.log(`💰 Processing cost: $${optimizationResult.stats.processingCost.toFixed(4)}`)
        
      } catch (optimizationError) {
        console.warn(`⚠️ Text optimization failed for ${source.name}:`, optimizationError)
        // Continue without optimization - not a critical failure
      }
    } else {
      console.log(`📝 Text is short enough, skipping optimization (${source.extractedText.length} chars)`)
    }
    
    console.log(`${'='.repeat(80)}\n`)
    
  } catch (error) {
    console.error(`❌ Error in processFileContent for ${file.name}:`, error)
    source.status = 'error'
    source.processingError = error instanceof Error ? error.message : 'Processing failed'
    throw error
  }
}

// PDF processing
async function processPDF(file: File, source: Source): Promise<void> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('PDF parsing error:', errData.parserError)
      reject(new Error(`PDF parsing failed: ${errData.parserError}`))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from PDF data
        const pages = pdfData.Pages || []
        let extractedText = ''
        
        pages.forEach((page: any, pageIndex: number) => {
          const texts = page.Texts || []
          
          texts.forEach((text: any) => {
            if (text.R && text.R[0] && text.R[0].T) {
              const decodedText = decodeURIComponent(text.R[0].T)
              extractedText += decodedText + ' '
            }
          })
          
          // Add page break
          if (pageIndex < pages.length - 1) {
            extractedText += '\n\n'
          }
        })
        
        // Clean and process text
        const cleanedText = cleanExtractedText(extractedText)
        
        if (cleanedText.length < 10) {
          reject(new Error('PDF appears to be empty or text could not be extracted'))
          return
        }
        
        // Update source with extracted data
        source.extractedText = cleanedText
        source.pages = pages.length
        source.wordCount = countWords(cleanedText)
        source.metadata = {
          ...source.metadata,
          confidence: calculateTextConfidence(cleanedText),
          language: detectLanguage(cleanedText)
        }
        
        console.log(`📄 PDF processed: ${pages.length} pages, ${source.wordCount} words`)
        resolve()
        
      } catch (error) {
        console.error('Error processing PDF data:', error)
        reject(new Error('Failed to extract text from PDF'))
      }
    })
    
    // Convert File to Buffer and parse
    file.arrayBuffer().then(buffer => {
      pdfParser.parseBuffer(Buffer.from(buffer))
    }).catch(error => {
      reject(new Error(`Failed to read PDF file: ${error.message}`))
    })
  })
}

// Text file processing
async function processTextFile(file: File, source: Source): Promise<void> {
  try {
    const text = await file.text()
    const cleanedText = cleanExtractedText(text)
    
    if (cleanedText.length < 10) {
      throw new Error('Text file appears to be empty')
    }
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.metadata = {
      ...source.metadata,
      confidence: 1.0,
      language: detectLanguage(cleanedText)
    }
    
    console.log(`📝 Text file processed: ${source.wordCount} words`)
    
  } catch (error) {
    throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// DOCX processing
async function processDOCX(file: File, source: Source): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    const cleanedText = cleanExtractedText(result.value)
    
    if (cleanedText.length < 10) {
      throw new Error('DOCX appears to be empty or text could not be extracted')
    }
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.metadata = {
      ...source.metadata,
      confidence: 0.95,
      language: detectLanguage(cleanedText)
    }
    
    if (result.messages.length > 0) {
      console.log('DOCX conversion messages:', result.messages)
    }
    
    console.log(`📄 DOCX processed: ${source.wordCount} words`)
    
  } catch (error) {
    throw new Error(`Failed to process DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Image processing with Vision API
async function processImageWithVision(file: File, source: Source): Promise<void> {
  try {
    console.log(`👁️ Processing image with Vision API: ${file.name}`)
    
    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    
    // Call Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract all visible text, diagrams, charts, and important visual information. Provide a detailed description that would be useful for studying."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    })
    
    const extractedText = response.choices[0]?.message?.content || ''
    
    if (extractedText.length < 10) {
      throw new Error('No meaningful content could be extracted from the image')
    }
    
    const cleanedText = cleanExtractedText(extractedText)
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.subtype = 'vision-analyzed'
    source.metadata = {
      ...source.metadata,
      confidence: 0.85,
      language: detectLanguage(cleanedText),
      apiCost: (response.usage?.total_tokens || 0) * 0.00001 // Rough estimate
    }
    
    console.log(`👁️ Image processed: ${source.wordCount} words extracted`)
    
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Audio processing with Whisper API
async function processAudioWithWhisper(file: File, source: Source): Promise<void> {
  try {
    console.log(`🎤 Processing audio with Whisper API: ${file.name}`)
    
    // Estimate duration for metadata
    const estimatedDuration = estimateAudioDuration(file.size)
    source.duration = formatDuration(estimatedDuration)
    
    // Call Whisper API
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`)
    }
    
    const extractedText = await response.text()
    
    if (extractedText.length < 10) {
      throw new Error('No meaningful speech could be transcribed from the audio')
    }
    
    const cleanedText = cleanExtractedText(extractedText)
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.subtype = 'transcribed'
    source.metadata = {
      ...source.metadata,
      confidence: 0.90,
      language: detectLanguage(cleanedText),
      apiCost: estimatedDuration * 0.006 / 60 // $0.006 per minute
    }
    
    console.log(`🎤 Audio processed: ${source.wordCount} words transcribed from ${source.duration}`)
    
  } catch (error) {
    throw new Error(`Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Video processing (extract audio and transcribe)
async function processVideoWithWhisper(file: File, source: Source): Promise<void> {
  try {
    console.log(`🎬 Processing video (audio extraction) with Whisper API: ${file.name}`)
    
    // Estimate duration for metadata
    const estimatedDuration = estimateVideoDuration(file.size)
    source.duration = formatDuration(estimatedDuration)
    
    // For now, try to send video directly to Whisper (it can handle some video formats)
    // In production, you might want to extract audio first using ffmpeg
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status} ${response.statusText}`)
    }
    
    const extractedText = await response.text()
    
    if (extractedText.length < 10) {
      throw new Error('No meaningful speech could be transcribed from the video')
    }
    
    const cleanedText = cleanExtractedText(extractedText)
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.subtype = 'video-transcribed'
    source.metadata = {
      ...source.metadata,
      confidence: 0.85,
      language: detectLanguage(cleanedText),
      apiCost: estimatedDuration * 0.006 / 60 // $0.006 per minute
    }
    
    console.log(`🎬 Video processed: ${source.wordCount} words transcribed from ${source.duration}`)
    
  } catch (error) {
    throw new Error(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper functions
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

function calculateTextConfidence(text: string): number {
  // Simple heuristic: longer text with normal word distribution = higher confidence
  const words = text.split(/\s+/)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  
  // Normal average word length is around 4-6 characters
  if (avgWordLength >= 3 && avgWordLength <= 8) {
    return Math.min(0.95, 0.7 + (text.length / 10000))
  } else {
    return 0.6
  }
}

function detectLanguage(text: string): string {
  // Simple language detection - could be enhanced with a proper library
  const sample = text.substring(0, 1000).toLowerCase()
  
  if (/[ąćęłńóśźż]/.test(sample)) return 'pl'
  if (/[äöüß]/.test(sample)) return 'de'
  if (/[àáâäçéèêëíîïñóôöúùûü]/.test(sample)) return 'fr'
  if (/[áéíñóúü]/.test(sample)) return 'es'
  
  return 'en' // Default to English
}

function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('audio')) return 'audio'
  if (mimeType.includes('video')) return 'youtube'
  
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text'
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'docx'
  if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/)) return 'image'
  if (fileName.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)) return 'audio'
  if (fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/)) return 'youtube'
  
  return 'text'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60)
    return `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

function estimateAudioDuration(sizeBytes: number): number {
  // Rough estimate: 128kbps MP3 = ~1MB per minute
  return (sizeBytes / 1024 / 1024) * 60
}

function estimateVideoDuration(sizeBytes: number): number {
  // Rough estimate: 2Mbps video = ~15MB per minute
  return (sizeBytes / 1024 / 1024 / 15) * 60
}