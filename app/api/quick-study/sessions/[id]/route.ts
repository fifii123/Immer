import { NextRequest } from 'next/server'

// In-memory storage - same reference as in route.ts
interface SessionData {
  sources: any[]
  outputs: any[]
  createdAt: Date
}

// Import the same sessions Map (in real app, this would be database)
// For now, we'll declare it here too (in production, move to shared module)
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

// Use global variable to persist across hot reloads in development
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
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Found session: ${sessionId} with ${sessionData.sources.length} sources`)
    
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