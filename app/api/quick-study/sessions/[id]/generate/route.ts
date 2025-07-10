// TODO: delete this file and call directly .../[id]/generate/{output_type}

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
  extractedText?: string; // Available for AI processing
  wordCount?: number;
  processingError?: string;
  subtype?: string;
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
}

interface SessionData {
  sources: Source[]
  outputs: Output[]
  createdAt: Date
}

// Global in-memory store
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// Generate content from source
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`🤖 Generate request for session: ${sessionId}`)
    
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
    const { sourceId, type, settings } = body
    
    if (!sourceId || !type) {
      return Response.json(
        { message: 'Missing sourceId or type' },
        { status: 400 }
      )
    }
    
    console.log(`🎯 Generating ${type} for source: ${sourceId}`)
    
    // Find source
    const source = sessionData.sources.find(s => s.id === sourceId)
    if (!source) {
      console.log(`❌ Source not found: ${sourceId}`)
      return Response.json(
        { message: 'Source not found' },
        { status: 404 }
      )
    }
    
    if (source.status !== 'ready') {
      return Response.json(
        { message: 'Source is not ready for processing' },
        { status: 400 }
      )
    }
    
    // Generate content (mock for now)
    console.log(`⚡ Processing ${source.name} to create ${type}`)
    
    // TODO: Use source.extractedText for AI processing
    // Example: const content = source.extractedText || 'No content available'
    // Example: const aiResponse = await callAI(content, type, settings)
    
    console.log(`📄 Source has ${source.wordCount || 0} words available for processing`)
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: type as Output['type'],
      title: generateTitle(type, source.name),
      preview: generatePreview(type),
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: generateCount(type)
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated ${type}: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating content:', error)
    
    return Response.json(
      { message: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

// Helper function to generate title
function generateTitle(type: string, sourceName: string): string {
  const cleanName = sourceName.replace(/\.[^/.]+$/, '') // Remove extension
  
  const titleFormats = {
    flashcards: `${cleanName} - Flashcards`,
    quiz: `${cleanName} - Interactive Quiz`,
    notes: `${cleanName} - Study Notes`,
    summary: `${cleanName} - Summary`,
    concepts: `${cleanName} - Key Concepts`,
    mindmap: `${cleanName} - Mind Map`
  }
  
  return titleFormats[type as keyof typeof titleFormats] || `${cleanName} - ${type}`
}

// Helper function to generate preview text
function generatePreview(type: string): string {
  const counts = generateCount(type)
  
  const previewFormats = {
    flashcards: `${counts} interactive cards with spaced repetition`,
    quiz: `${counts} questions with detailed explanations`,
    notes: `${counts} sections with key insights and takeaways`,
    summary: `Essential points and main conclusions`,
    concepts: `${counts} key terms and definitions explained`,
    mindmap: `Visual representation of connected ideas`
  }
  
  return previewFormats[type as keyof typeof previewFormats] || `Generated ${type} content`
}

// Helper function to generate realistic counts
function generateCount(type: string): number {
  const countRanges = {
    flashcards: [15, 35],
    quiz: [8, 20],
    notes: [3, 8],
    summary: [1, 1],
    concepts: [10, 25],
    mindmap: [1, 1]
  }
  
  const range = countRanges[type as keyof typeof countRanges] || [1, 10]
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
}