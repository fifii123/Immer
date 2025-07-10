import { NextRequest } from 'next/server'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
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

// Add text or URL content to session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`📝 Add content request for session: ${sessionId}`)
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { type, content, title } = body
    
    if (!type || !content) {
      return Response.json(
        { message: 'Missing type or content' },
        { status: 400 }
      )
    }
    
    console.log(`📄 Processing ${type} content: ${content.substring(0, 100)}...`)
    
    let source: Source
    
    if (type === 'text') {
      // Process text content
      source = await processTextContent(content, title)
    } else if (type === 'url') {
      // Process URL content
      source = await processUrlContent(content, title)
    } else {
      return Response.json(
        { message: 'Invalid content type' },
        { status: 400 }
      )
    }
    
    // Add source to session
    sessionData.sources.push(source)
    
    console.log(`✅ Added ${type} source: ${source.id} (${source.name})`)
    console.log(`📊 Session now has ${sessionData.sources.length} total sources`)
    
    return Response.json(source)
    
  } catch (error) {
    console.error('❌ Error adding content:', error)
    
    return Response.json(
      { message: 'Failed to add content' },
      { status: 500 }
    )
  }
}

// Process text content
async function processTextContent(text: string, title?: string): Promise<Source> {
  console.log(`🔍 Processing text content (${text.length} characters)`)
  
  // Basic validation
  if (text.length < 10) {
    throw new Error('Text content too short (minimum 10 characters)')
  }
  
  if (text.length > 50000) {
    throw new Error('Text content too long (maximum 50,000 characters)')
  }
  
  // Generate title if not provided
  const generatedTitle = title || generateTitleFromText(text)
  
  // Create source object
  const source: Source = {
    id: `text-${Date.now()}`,
    name: generatedTitle,
    type: 'text',
    status: 'ready',
    size: `${(text.length / 1024).toFixed(1)} KB`,
    subtype: 'pasted'
  }
  
  // TODO: Store the actual text content for later AI processing
  // In real implementation, you might want to store this in a separate content store
  
  console.log(`✅ Created text source: ${source.name}`)
  return source
}

// Process URL content
async function processUrlContent(url: string, title?: string): Promise<Source> {
  console.log(`🔍 Processing URL: ${url}`)
  
  // Basic URL validation
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }
  
  // Detect special URL types
  const urlType = detectUrlType(url)
  let generatedTitle = title
  
  if (!generatedTitle) {
    if (urlType === 'youtube') {
      generatedTitle = extractYouTubeTitle(url) || 'YouTube Video'
    } else {
      generatedTitle = extractDomainName(url)
    }
  }
  
  // Create source object
  const source: Source = {
    id: `url-${Date.now()}`,
    name: generatedTitle,
    type: urlType === 'youtube' ? 'youtube' : 'url',
    status: 'ready', // TODO: Change to 'processing' when implementing real URL fetching
    subtype: urlType
  }
  
  // Add type-specific metadata
  if (urlType === 'youtube') {
    source.duration = '~ min' // TODO: Get real duration from YouTube API
  }
  
  // TODO: Implement actual URL content fetching
  // - For YouTube: get transcript, title, description
  // - For websites: scrape content, clean HTML
  // - Store content for AI processing
  
  console.log(`✅ Created URL source: ${source.name} (${urlType})`)
  return source
}

// Helper function to detect URL type
function detectUrlType(url: string): string {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube'
  }
  
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'twitter'
  }
  
  if (urlLower.includes('linkedin.com')) {
    return 'linkedin'
  }
  
  if (urlLower.includes('github.com')) {
    return 'github'
  }
  
  return 'website'
}

// Helper function to extract YouTube title (basic)
function extractYouTubeTitle(url: string): string | null {
  // This is a very basic implementation
  // In real app, you'd use YouTube API to get proper title
  try {
    const urlObj = new URL(url)
    if (urlObj.searchParams.has('v')) {
      return `YouTube: ${urlObj.searchParams.get('v')}`
    }
  } catch {
    // Ignore errors
  }
  return null
}

// Helper function to extract domain name
function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')
    return `Article from ${domain}`
  } catch {
    return 'Web Article'
  }
}

// Helper function to generate title from text
function generateTitleFromText(text: string): string {
  // Take first line or first 50 characters as title
  const firstLine = text.split('\n')[0].trim()
  
  if (firstLine.length > 3 && firstLine.length <= 100) {
    return firstLine
  }
  
  // If first line is too short or too long, use first 50 chars
  const truncated = text.trim().substring(0, 50)
  return truncated.length < text.trim().length ? `${truncated}...` : truncated
}