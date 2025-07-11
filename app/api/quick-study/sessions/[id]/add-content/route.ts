// Upload pasted text or URL

import { NextRequest } from 'next/server'
import { createStructuredChunks, type StructuredChunk } from '../../../../../../lib/structuredChunking'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error' | 'structuring'; // Add new status
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
    structuredChunks?: StructuredChunk[]; // Add this field
    processingStage?: 'extracting' | 'structuring' | 'complete'; // Add progress tracking
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
  
  // Clean text
  const cleanedText = cleanExtractedText(text)
  
  // Generate title if not provided
  const generatedTitle = title || generateTitleFromText(cleanedText)
  
  // Create source object
  const source: Source = {
    id: `text-${Date.now()}`,
    name: generatedTitle,
    type: 'text',
    status: 'structuring',
    processingStage: 'structuring',
    size: `${(text.length / 1024).toFixed(1)} KB`,
    extractedText: cleanedText,
    wordCount: countWords(cleanedText),
    subtype: 'pasted'
  }
  
  // Create structured chunks
  try {
    const options = {
      sourceType: 'text' as const,
      fileName: generatedTitle
    }
    
    const structuredChunks = await createStructuredChunks(cleanedText, options)
    source.structuredChunks = structuredChunks
    source.status = 'ready'
    source.processingStage = 'complete'
    
    console.log(`✅ Created ${structuredChunks.length} structured chunks for pasted text`)
    
  } catch (error) {
    console.error('❌ Text chunking failed:', error)
    source.status = 'error'
    source.processingError = `Chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
  
  console.log(`✅ Created text source: ${source.name} (${source.wordCount} words)`)
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
  
  // TODO: Implement actual URL content fetching here
  // For now, create placeholder content
  const placeholderText = `Content from: ${url}\n\nThis content will be extracted automatically when URL processing is implemented.`
  
  // Create source object
  const source: Source = {
    id: `url-${Date.now()}`,
    name: generatedTitle,
    type: urlType === 'youtube' ? 'youtube' : 'url',
    status: 'structuring',
    processingStage: 'structuring',
    extractedText: placeholderText,
    wordCount: countWords(placeholderText),
    subtype: urlType
  }
  
  // Create structured chunks for URL content
  try {
    const options = {
      sourceType: (urlType === 'youtube' ? 'youtube' : 'url'),
      fileName: generatedTitle
    }
    
    const structuredChunks = await createStructuredChunks(placeholderText, options)
    source.structuredChunks = structuredChunks
    source.status = 'ready'
    source.processingStage = 'complete'
    
    console.log(`✅ Created ${structuredChunks.length} structured chunks for URL content`)
    
  } catch (error) {
    console.error('❌ URL chunking failed:', error)
    source.status = 'error'
    source.processingError = `Chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
  
  // Add type-specific metadata
  if (urlType === 'youtube') {
    source.duration = '~ min' // TODO: Get real duration from YouTube API
  }
  
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

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return ''
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove weird characters
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