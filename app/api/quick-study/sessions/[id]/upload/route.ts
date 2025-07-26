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

// Determine if file needs external API processing
function needsExternalAPI(fileType: string, fileSize: number): boolean {
  switch (fileType) {
    case 'image':
    case 'audio': 
    case 'youtube': // Video files
      return true // Always need external API (Vision/Whisper)
      
    case 'text':
    case 'pdf':
    case 'docx':
      // Check if text optimization will be needed
      // Large files might need optimization API
      return fileSize > 1024 * 1024 // Files > 1MB might need optimization
      
    default:
      return false
  }
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
      
      // 🔧 SMART STATUS: Set initial status based on whether external API is needed
      const initialStatus = needsExternalAPI(fileType, file.size) ? 'processing' : 'ready'
      
      // Create source object
      const source: Source = {
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: fileType,
        status: 'processing', // 🔧 ALWAYS start with processing for UI
        size: formatFileSize(file.size),
        metadata: {
          processingMethod: `${fileType.toUpperCase()} processor`
        }
      }
      
      console.log(`📊 Initial status for ${file.name}: processing (External API needed: ${needsExternalAPI(fileType, file.size)})`)
      
      newSources.push(source)
      
      // 🔧 IMPROVED: Create processing promise with better error handling
      const processingPromise = processFileContentWithStatusUpdate(file, source)
        .then(() => {
          console.log(`✅ Successfully processed: ${source.name} (Final status: ${source.status})`)
        })
        .catch((error) => {
          console.error(`❌ Error processing ${file.name}:`, error)
          // 🔧 CRITICAL: Always update status on error
          source.status = 'error'
          source.processingError = error instanceof Error ? error.message : 'Processing failed'
          
          console.error(`Full error details for ${file.name}:`, {
            name: file.name,
            type: source.type,
            size: source.size,
            finalStatus: source.status,
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : error
          })
        })
      
      processingPromises.push(processingPromise)
    }
    
    // 🔧 INSTANT RESPONSE: Add sources to session immediately with processing status
    sessionData.sources.push(...newSources)
    
    // 🔧 BACKGROUND PROCESSING: Process files asynchronously but with guaranteed status updates
    Promise.all(processingPromises).then(() => {
      const readyCount = newSources.filter(s => s.status === 'ready').length
      const errorCount = newSources.filter(s => s.status === 'error').length
      const stillProcessingCount = newSources.filter(s => s.status === 'processing').length
      
      console.log(`💾 Completed processing batch of ${newSources.length} files`)
      console.log(`📊 Final status - Ready: ${readyCount}, Error: ${errorCount}, Still Processing: ${stillProcessingCount}`)
      
      if (stillProcessingCount > 0) {
        console.warn(`⚠️ WARNING: ${stillProcessingCount} files still in processing state after completion!`)
        // Force update any remaining processing files to error
        newSources.forEach(source => {
          if (source.status === 'processing') {
            source.status = 'error'
            source.processingError = 'Processing timed out or failed to complete'
            console.warn(`🔄 Force-updated ${source.name} from processing to error`)
          }
        })
      }
    }).catch((error) => {
      console.error(`❌ Critical error in batch processing:`, error)
      // Force update all processing files to error as fallback
      newSources.forEach(source => {
        if (source.status === 'processing') {
          source.status = 'error'
          source.processingError = 'Batch processing failed'
        }
      })
    })
    
    console.log(`📊 Session now has ${sessionData.sources.length} total sources`)
    
    // 🔧 RETURN IMMEDIATELY: User sees "processing" status in UI
    return Response.json(newSources)
    
  } catch (error) {
    console.error('❌ Error uploading files:', error)
    return Response.json({ message: 'Failed to upload files' }, { status: 500 })
  }
}

// 🔧 NEW: Wrapper function that guarantees status updates
async function processFileContentWithStatusUpdate(file: File, source: Source): Promise<void> {
  try {
    await processFileContent(file, source)
    
    // 🔧 GUARANTEE: Always ensure status is set to ready if no error occurred
    if (source.status === 'processing') {
      source.status = 'ready'
      console.log(`🔄 Auto-corrected status for ${source.name}: processing -> ready`)
    }
    
  } catch (error) {
    // 🔧 GUARANTEE: Always ensure status is set to error on failure
    source.status = 'error'
    source.processingError = error instanceof Error ? error.message : 'Processing failed'
    console.log(`🔄 Set error status for ${source.name}: ${source.processingError}`)
    throw error // Re-throw for Promise.catch handling
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

    console.log(`✅ File content extraction completed: ${file.name}`)


// =================== AUTO-OPTIMIZATION ===================
console.log(`\n🚀 STARTING OPTIMIZATION FOR ALL FILES`)
console.log(`📊 Extracted text length: ${source.extractedText.length} characters`)
console.log(`📊 Word count: ${source.wordCount || 'unknown'}`)

console.log(`\n🚀 SENDING TO TextOptimizationService`)
console.log(`${'='.repeat(60)}`)
console.log(`📄 File: ${source.name}`)
console.log(`📄 Type: ${source.type}`)
console.log(`📄 Original length: ${source.extractedText.length} characters`)
console.log(`${'='.repeat(60)}`)

const optimizationStartTime = Date.now();

try {
  const optimizationResult = await TextOptimizationService.optimizeText(
    source.extractedText,
    source.name
  );
  
  const processingTimeMs = Date.now() - optimizationStartTime;
  
  // Store optimization results - WSZYSTKIE POLA
  source.optimizedText = optimizationResult.optimizedText;
  source.optimizationStats = {
    originalLength: optimizationResult.originalLength,
    optimizedLength: optimizationResult.optimizedLength,
    compressionRatio: optimizationResult.compressionRatio,
    processingCost: optimizationResult.processingCost,
    chunkCount: optimizationResult.chunkCount,
    processedChunks: optimizationResult.processedChunks, // 🚀 DODANE
    keyTopics: optimizationResult.keyTopics,
    strategy: optimizationResult.strategy, // 🚀 DODANE
    processingStats: optimizationResult.processingStats, // 🚀 DODANE
    optimizedAt: new Date(),
    processingTimeMs: processingTimeMs
  };
        
        // =================== DETAILED RESULTS LOG ===================
        console.log(`\n✅ OPTIMIZATION COMPLETED SUCCESSFULLY!`)
        console.log(`${'='.repeat(60)}`)
        console.log(`📄 File: ${source.name}`)
        console.log(`⏱️  Processing time: ${(processingTimeMs / 1000).toFixed(2)}s`)
        console.log(``)
        console.log(`📊 COMPRESSION RESULTS:`)
        console.log(`   Original length: ${optimizationResult.originalLength.toLocaleString()} chars`)
        console.log(`   Optimized length: ${optimizationResult.optimizedLength.toLocaleString()} chars`)
        console.log(`   Compression ratio: ${(optimizationResult.compressionRatio * 100).toFixed(1)}%`)
        console.log(`   Space saved: ${((1 - optimizationResult.compressionRatio) * 100).toFixed(1)}%`)
        console.log(`   Characters saved: ${(optimizationResult.originalLength - optimizationResult.optimizedLength).toLocaleString()}`)
        console.log(``)
        console.log(`💰 COST ANALYSIS:`)
        console.log(`   Processing cost: $${optimizationResult.processingCost.toFixed(6)}`)
        console.log(`   Chunks processed: ${optimizationResult.chunkCount}`)
        console.log(`   Cost per chunk: $${(optimizationResult.processingCost / optimizationResult.chunkCount).toFixed(6)}`)
        console.log(``)
        console.log(`🎯 KEY TOPICS IDENTIFIED:`)
        optimizationResult.keyTopics.slice(0, 8).forEach((topic, index) => {
          console.log(`   ${index + 1}. ${topic}`)
        });
        console.log(``)
        console.log(`💡 POTENTIAL SAVINGS PER GENERATION:`)
        const originalTokens = Math.ceil(optimizationResult.originalLength / 4);
        const optimizedTokens = Math.ceil(optimizationResult.optimizedLength / 4);
        const tokenSavings = originalTokens - optimizedTokens;
        const costSavingsPerGeneration = (tokenSavings / 1000) * 0.001; // GPT-3.5 input cost
        console.log(`   Tokens saved per generation: ${tokenSavings.toLocaleString()}`)
        console.log(`   Cost saved per generation: $${costSavingsPerGeneration.toFixed(6)}`)
        console.log(`   Estimated 10 generations savings: $${(costSavingsPerGeneration * 10).toFixed(4)}`)
        console.log(``)
        console.log(`📋 QUALITY PREVIEW:`)
        console.log(`   Original (first 200 chars): "${source.extractedText.substring(0, 200)}..."`)
        console.log(`   Optimized (first 200 chars): "${optimizationResult.optimizedText.substring(0, 200)}..."`)
        console.log(`${'='.repeat(60)}\n`)
        
      } catch (error) {
        const processingTimeMs = Date.now() - optimizationStartTime;
        console.log(`\n❌ OPTIMIZATION FAILED`)
        console.log(`${'='.repeat(60)}`)
        console.log(`📄 File: ${source.name}`)
        console.log(`⏱️  Failed after: ${(processingTimeMs / 1000).toFixed(2)}s`)
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log(`🔄 Will continue with original text for generation`)
        console.log(`${'='.repeat(60)}\n`)
      }
    

    logCompleteSourceStructure(source);
    // =================== END AUTO-OPTIMIZATION ===================
    
    // 🔧 IMPORTANT: Don't set status here - let the wrapper function handle it
    console.log(`🏁 processFileContent completed for ${file.name}`)
    
  } catch (error) {
    console.error(`❌ Processing failed for ${file.name}:`, error)
    // 🔧 IMPORTANT: Don't set status here - let the wrapper function handle it
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

// Helper function to log complete structure
function logCompleteSourceStructure(source: any) {
  console.log(`\n🔍 COMPLETE SOURCE STRUCTURE DUMP:`);
  console.log(`${'='.repeat(100)}`);
  
  const sourceStructure = {
    id: source.id,
    name: source.name,
    type: source.type,
    status: source.status,
    size: source.size,
    duration: source.duration,
    pages: source.pages,
    wordCount: source.wordCount,
    processingError: source.processingError,
    subtype: source.subtype,
    metadata: source.metadata,
    
    // TEXT CONTENT LENGTHS
    extractedTextLength: source.extractedText?.length || 0,
    optimizedTextLength: source.optimizedText?.length || 0,
    
    // OPTIMIZATION STATS
    optimizationStats: source.optimizationStats,
    
    // FOR GENERATION ENDPOINTS
    textThatWillBeUsed: {
      source: source.optimizedText ? 'optimizedText' : 'extractedText',
      length: (source.optimizedText || source.extractedText || '').length,
      preview: (source.optimizedText || source.extractedText || '')
    }
  };
  
  console.log(JSON.stringify(sourceStructure, null, 2));
  console.log(`${'='.repeat(100)}\n`);
}