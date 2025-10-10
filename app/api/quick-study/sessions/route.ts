// Creating a new session

import { NextRequest } from 'next/server'

// In-memory storage - replace with database later
interface SessionData {
  sources: any[]
  outputs: any[]
  createdAt: Date
}

// Global in-memory store - shared across endpoints
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

// Use global variable to persist across hot reloads in development
const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// Create new session
export async function POST() {
  try {
    // Generate unique session ID
    const sessionId = crypto.randomUUID()
    
    // Create empty session
    const sessionData: SessionData = {
      sources: [],
      outputs: [],
      createdAt: new Date()
    }
    
    // Store in memory
    sessions.set(sessionId, sessionData)
    
    console.log(`✅ Created session: ${sessionId}`)
    
    return Response.json({ 
      sessionId,
      message: 'Session created successfully' 
    })
    
  } catch (error) {
    console.error('❌ Error creating session:', error)
    
    return Response.json(
      { message: 'Failed to create session' },
      { status: 500 }
    )
  }
}