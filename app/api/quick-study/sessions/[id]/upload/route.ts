export const runtime = 'nodejs'
import { NextRequest } from 'next/server'

// Comment out PDF import for now - uncomment after installing pdf-parse
import pdf from 'pdf-parse'

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
      
      console.log(`🔍 Processing file: ${file.name} (${file.size} bytes)`)
      
      // Basic file validation
      if (file.size === 0) {
        console.log(`⚠️ Skipping empty file: ${file.name}`)
        continue
      }
      
      // File size limit (50MB)
      if (file.size > 50 * 1024 * 1024) {
        console.log(`⚠️ File too large: ${file.name}`)
        newSources.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          type: getFileType(file),
          status: 'error',
          size: formatFileSize(file.size),
          processingError: 'File too large (max 50MB)'
        })
        continue
      }
      
      // Create source object with initial status
      const source: Source = {
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: getFileType(file),
        status: 'processing',
        size: formatFileSize(file.size)
      }
      
      try {
        // Process content based on file type
        await processFileContent(file, source)
        
        console.log(`✅ Successfully processed: ${source.name}`)
        
      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error)
        source.status = 'error'
        source.processingError = error instanceof Error ? error.message : 'Processing failed'
      }
      
      newSources.push(source)
    }
    
    // Add sources to session
    sessionData.sources.push(...newSources)
    
    console.log(`💾 Added ${newSources.length} sources to session ${sessionId}`)
    console.log(`📊 Session now has ${sessionData.sources.length} total sources`)
    
    // Return new sources
    return Response.json(newSources)
    
  } catch (error) {
    console.error('❌ Error uploading files:', error)
    
    return Response.json(
      { message: 'Failed to upload files' },
      { status: 500 }
    )
  }
}

// Process file content based on type
async function processFileContent(file: File, source: Source): Promise<void> {
  console.log(`🔄 Processing content for ${file.name} (type: ${source.type})`)
  
  switch (source.type) {
    case 'pdf':
      await processPDF(file, source)
      break
      
    case 'text':
      await processTextFile(file, source)
      break
      
    case 'docx':
      // TODO: Implement DOCX processing
      source.status = 'ready'
      console.log(`⚠️ DOCX processing not implemented yet`)
      break
      
    case 'image':
      // TODO: Implement OCR processing
      source.status = 'ready'
      console.log(`⚠️ Image OCR not implemented yet`)
      break
      
    case 'audio':
      // TODO: Implement audio transcription
      source.status = 'ready'
      console.log(`⚠️ Audio transcription not implemented yet`)
      break
      
    default:
      source.status = 'ready'
      console.log(`⚠️ No specific processing for type: ${source.type}`)
  }
}

// Process PDF files
async function processPDF(file: File, source: Source): Promise<void> {
  console.log(`📄 Processing PDF: ${file.name}`)
  
  try {
 
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdf(buffer)
    
    const extractedText = cleanExtractedText(data.text)
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('PDF appears to be empty or contains mostly images')
    }
    
    source.extractedText = extractedText
    source.pages = data.numpages
    source.wordCount = countWords(extractedText)
    source.status = 'ready'
    
    console.log(`✅ PDF processed: ${source.pages} pages, ${source.wordCount} words`)
  
    // TEMPORARY: Mock PDF processing until pdf-parse is installed
    source.pages = Math.floor(Math.random() * 20) + 5
    source.wordCount = Math.floor(Math.random() * 2000) + 500
    source.extractedText = `Mock extracted text from ${file.name}. This is placeholder content until PDF processing is implemented.`
    source.status = 'ready'
    
    console.log(`✅ PDF processed (mock): ${source.pages} pages, ${source.wordCount} words`)
    
  } catch (error) {
    console.error(`❌ PDF processing failed:`, error)
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process text files
async function processTextFile(file: File, source: Source): Promise<void> {
  console.log(`📝 Processing text file: ${file.name}`)
  
  try {
    // Read text content
    const text = await file.text()
    const cleanedText = cleanExtractedText(text)
    
    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('Text file appears to be empty')
    }
    
    // Update source with text data
    source.extractedText = cleanedText
    source.wordCount = countWords(cleanedText)
    source.status = 'ready'
    
    console.log(`✅ Text file processed: ${source.wordCount} words`)
    
  } catch (error) {
    console.error(`❌ Text processing failed:`, error)
    throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return ''
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove weird characters that sometimes come from PDFs
    .replace(/[^\w\s\-.,;:!?()[\]{}'"]/g, ' ')
    // Clean up multiple spaces again
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
}

// Count words in text
function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}

// Helper function to determine file type
function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  console.log(`🔍 Detecting type for: ${fileName} (mime: ${mimeType})`)
  
  // Check by MIME type first
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('audio')) return 'audio'
  if (mimeType.includes('video')) return 'youtube'
  
  // Check by file extension as fallback
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text'
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'docx'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
      fileName.endsWith('.png') || fileName.endsWith('.gif')) return 'image'
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || 
      fileName.endsWith('.m4a')) return 'audio'
  if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || 
      fileName.endsWith('.mov')) return 'youtube'
  
  console.log(`⚠️ Unknown file type, defaulting to 'text'`)
  return 'text'
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}