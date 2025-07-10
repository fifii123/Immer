import { NextRequest } from 'next/server'

// Types - same as in route.ts
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

// Global in-memory store - same reference as in sessions/route.ts
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// Get session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`🔍 Looking for session: ${sessionId}`)
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      console.log(`📊 Available sessions: ${Array.from(sessions.keys()).join(', ')}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Found session: ${sessionId}`)
    console.log(`📄 Sources: ${sessionData.sources.length}`)
    console.log(`📋 Outputs: ${sessionData.outputs.length}`)
    
    // Return session data
    return Response.json({
      id: sessionId,
      sources: sessionData.sources,
      outputs: sessionData.outputs,
      createdAt: sessionData.createdAt.toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error getting session:', error)
    
    return Response.json(
      { message: 'Failed to get session' },
      { status: 500 }
    )
  }
}