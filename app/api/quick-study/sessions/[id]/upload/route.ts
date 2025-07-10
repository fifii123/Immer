import { NextRequest } from 'next/server'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
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
      
      // Create source object
      const source: Source = {
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: getFileType(file),
        status: 'ready', // For now, mark as ready immediately
        size: formatFileSize(file.size)
      }
      
      // Add type-specific metadata
      if (source.type === 'pdf') {
        // TODO: Extract PDF page count
        source.pages = Math.floor(Math.random() * 50) + 10 // Mock for now
      }
      
      if (source.type === 'youtube' || source.type === 'audio') {
        // TODO: Get actual duration
        source.duration = `${Math.floor(Math.random() * 30) + 5} min` // Mock for now
      }
      
      newSources.push(source)
      console.log(`✅ Created source: ${source.id} (${source.name})`)
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