export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import PDFParser from 'pdf2json'
import * as mammoth from 'mammoth'
import { OpenAI } from 'openai'

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
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  metadata?: {
    processingMethod?: string;
    confidence?: number;
    language?: string;
    apiCost?: number;
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
    const processingPromises: Promise<void>[] = []
    
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
      
      newSources.push(source)
      
      // Create async processing promise
      const processingPromise = processFileContent(file, source)
        .then(() => {
          console.log(`✅ Successfully processed: ${source.name}`)
        })
        .catch((error) => {
          console.error(`❌ Error processing ${file.name}:`, error)
          source.status = 'error'
          source.processingError = error instanceof Error ? error.message : 'Processing failed'
          
          // Also log the error details for debugging
          console.error(`Full error details for ${file.name}:`, {
            name: file.name,
            type: source.type,
            size: source.size,
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : error
          })
        })
      
      processingPromises.push(processingPromise)
    }
    
    // Add sources to session immediately (with processing status)
    sessionData.sources.push(...newSources)
    
    // Start processing files asynchronously
    Promise.all(processingPromises).then(() => {
      console.log(`💾 Completed processing batch of ${newSources.length} files`)
    })
    
    console.log(`📊 Session now has ${sessionData.sources.length} total sources`)
    
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
    
    source.status = 'ready'
    console.log(`✅ File processing completed successfully: ${file.name}`)
    
  } catch (error) {
    console.error(`❌ Processing failed for ${file.name}:`, error)
    source.status = 'error'
    source.processingError = error instanceof Error ? error.message : 'Processing failed'
    
    // Re-throw the error so the Promise.catch in the main function can handle it
    throw error
  }
}

// Process PDF files using pdf2json
async function processPDF(file: File, source: Source): Promise<void> {
  console.log(`📄 Processing PDF: ${file.name}`)
  
  return new Promise(async (resolve, reject) => {
    try {
      const pdfParser = new PDFParser()
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`Failed to parse PDF: ${errData.parserError}`))
      })
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let fullText = ''
          let pageCount = 0
          
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pageCount = pdfData.Pages.length
            
            pdfData.Pages.forEach((page: any) => {
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
            })
          }
          
          const extractedText = cleanExtractedText(fullText)
          
          if (!extractedText || extractedText.length < 50) {
            reject(new Error('PDF appears to be empty or contains mostly images without text'))
            return
          }
          
          source.extractedText = extractedText
          source.pages = pageCount
          source.wordCount = countWords(extractedText)
          source.metadata = {
            ...source.metadata,
            processingMethod: 'PDF2JSON parser'
          }
          
          console.log(`✅ PDF processed: ${pageCount} pages, ${source.wordCount} words`)
          resolve()
          
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      })
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      pdfParser.parseBuffer(buffer)
      
    } catch (error) {
      reject(new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

// Process text files
async function processTextFile(file: File, source: Source): Promise<void> {
  console.log(`📝 Processing text file: ${file.name}`)
  
  try {
    const text = await file.text()
    const cleanedText = cleanExtractedText(text)
    
    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('Text file appears to be empty')
    }
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.metadata = {
      ...source.metadata,
      processingMethod: 'Direct text reading'
    }
    
    console.log(`✅ Text file processed: ${source.wordCount} words`)
    
  } catch (error) {
    throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process DOCX files using mammoth
async function processDOCX(file: File, source: Source): Promise<void> {
  console.log(`📄 Processing DOCX: ${file.name}`)
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const result = await mammoth.extractRawText({ buffer })
    const extractedText = cleanExtractedText(result.value)
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('DOCX appears to be empty or contains no readable text')
    }
    
    source.extractedText = extractedText
    source.wordCount = countWords(extractedText)
    source.metadata = {
      ...source.metadata,
      processingMethod: 'Mammoth DOCX parser'
    }
    
    console.log(`✅ DOCX processed: ${source.wordCount} words`)
    
  } catch (error) {
    throw new Error(`Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process images using OpenAI Vision API
async function processImageWithVision(file: File, source: Source): Promise<void> {
  console.log(`🖼️ Processing Image with Vision API: ${file.name}`)
  
  try {
    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'
    
    console.log(`📤 Sending image to Vision API (${formatFileSize(file.size)})`)
    
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all visible text from this image. If the image contains:
              - Documents: Extract the text content accurately
              - Screenshots: Extract all readable text
              - Handwritten notes: Do your best to read the handwriting
              - Diagrams/Charts: Describe the content and extract any labels/text
              - Presentations: Extract slide content including titles and bullet points
              
              Return only the extracted text content. If there's no readable text, respond with "No readable text found in this image."`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    })
    
    const extractedText = response.choices[0]?.message?.content?.trim()
    
    if (!extractedText || extractedText === "No readable text found in this image.") {
      throw new Error('No readable text could be extracted from this image')
    }
    
    const cleanedText = cleanExtractedText(extractedText)
    
    if (cleanedText.length < 10) {
      throw new Error('Only minimal text content was found in this image')
    }
    
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.subtype = file.type?.split('/')[1] || 'unknown'
    source.metadata = {
      ...source.metadata,
      processingMethod: 'OpenAI Vision API',
      apiCost: 0.01 // Approximate cost
    }
    
    console.log(`✅ Image processed with Vision API: ${source.wordCount} words extracted`)
    
  } catch (error) {
    console.error(`❌ Vision API processing failed:`, error)
    
    let errorMessage = 'Failed to process image'
    
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('deprecated')) {
        errorMessage = 'Vision API model is outdated. Please update the application.'
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Invalid OpenAI API key for Vision API'
      } else if (error.message.includes('429')) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.'
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid image format or file corrupted'
      } else {
        errorMessage = `Vision API error: ${error.message}`
      }
    }
    
    throw new Error(errorMessage)
  }
}

// Process audio files using OpenAI Whisper API
async function processAudioWithWhisper(file: File, source: Source): Promise<void> {
  console.log(`🎵 Processing Audio with Whisper API: ${file.name}`)
  
  try {
    console.log(`📤 Sending audio to Whisper API (${formatFileSize(file.size)})`)
    
    // Create form data for Whisper API
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('language', 'en') // Auto-detect or specify language
    
    // Call Whisper API
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      language: 'en' // Can be removed for auto-detection
    })
    
    if (!response.text || response.text.trim().length < 10) {
      throw new Error('No speech could be detected in this audio file')
    }
    
    const extractedText = cleanExtractedText(response.text)
    const duration = response.duration || estimateAudioDuration(file.size)
    
    source.extractedText = extractedText
    source.wordCount = countWords(extractedText)
    source.duration = formatDuration(duration)
    source.subtype = file.type?.split('/')[1] || 'unknown'
    source.metadata = {
      ...source.metadata,
      processingMethod: 'OpenAI Whisper API',
      language: response.language || 'unknown',
      apiCost: Math.round((duration / 60) * 0.006 * 100) / 100 // $0.006 per minute
    }
    
    console.log(`✅ Audio processed with Whisper: ${source.duration}, ${source.wordCount} words`)
    
  } catch (error) {
    console.error(`❌ Whisper API processing failed:`, error)
    
    let errorMessage = 'Failed to process audio'
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Invalid OpenAI API key for Whisper API'
      } else if (error.message.includes('429')) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.'
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = 'Audio file too large for Whisper API (max 25MB)'
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid audio format. Supported: mp3, wav, m4a, flac, etc.'
      } else {
        errorMessage = `Whisper API error: ${error.message}`
      }
    }
    
    throw new Error(errorMessage)
  }
}

// Process video files by extracting audio and using Whisper
async function processVideoWithWhisper(file: File, source: Source): Promise<void> {
  console.log(`🎬 Processing Video with Whisper API: ${file.name}`)
  
  try {
    // For now, we'll try to send the video directly to Whisper
    // Whisper API can handle video files and extract audio automatically
    console.log(`📤 Sending video to Whisper API (${formatFileSize(file.size)})`)
    
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json'
    })
    
    if (!response.text || response.text.trim().length < 10) {
      throw new Error('No speech could be detected in this video file')
    }
    
    const extractedText = cleanExtractedText(response.text)
    const duration = response.duration || estimateVideoDuration(file.size)
    
    source.extractedText = extractedText
    source.wordCount = countWords(extractedText)
    source.duration = formatDuration(duration)
    source.subtype = file.type?.split('/')[1] || 'unknown'
    source.metadata = {
      ...source.metadata,
      processingMethod: 'OpenAI Whisper API (video)',
      language: response.language || 'unknown',
      apiCost: Math.round((duration / 60) * 0.006 * 100) / 100 // $0.006 per minute
    }
    
    console.log(`✅ Video processed with Whisper: ${source.duration}, ${source.wordCount} words`)
    
  } catch (error) {
    console.error(`❌ Video Whisper processing failed:`, error)
    
    let errorMessage = 'Failed to process video'
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Invalid OpenAI API key for Whisper API'
      } else if (error.message.includes('429')) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.'
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = 'Video file too large for Whisper API (max 100MB)'
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid video format or no audio track found'
      } else {
        errorMessage = `Whisper API error: ${error.message}`
      }
    }
    
    throw new Error(errorMessage)
  }
}

// Helper functions
function cleanExtractedText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,;:!?()[\]{}'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}

function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  // Check by MIME type first
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('audio')) return 'audio'
  if (mimeType.includes('video')) return 'youtube'
  
  // Check by file extension
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.txt')) return 'text'
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