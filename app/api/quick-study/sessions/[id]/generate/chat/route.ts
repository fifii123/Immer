export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`💬 Chat request for session: ${sessionId}`)
    
    // Parse request body
    const body = await request.json()
    const { sourceId, message, conversationHistory } = body
    
    if (!sourceId || !message) {
      return Response.json(
        { message: 'Missing sourceId or message' },
        { status: 400 }
      )
    }
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
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
    
    console.log(`🤖 Processing chat message for source: ${source.name}`)
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamChatResponse(
            source,
            message,
            conversationHistory || [],
            controller
          )
        } catch (error) {
          console.error('❌ Error in chat stream:', error)
          controller.error(error)
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error) {
    console.error('❌ Error in chat endpoint:', error)
    
    return Response.json(
      { message: 'Chat request failed' },
      { status: 500 }
    )
  }
}

// Stream chat response using OpenAI
async function streamChatResponse(
  source: Source, 
  userMessage: string, 
  conversationHistory: any[],
  controller: ReadableStreamDefaultController
) {
  console.log(`🤖 Generating streaming chat response for: ${source.name}`)
  
  try {
    // Prepare conversation context
    const systemPrompt = createSystemPrompt(source)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ]
    
    // Create streaming completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    })
    
    let fullResponse = ''
    
    // Stream the response
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      
      if (content) {
        fullResponse += content
        
        // Send chunk to client
        const data = JSON.stringify({ 
          type: 'chunk', 
          content: content 
        })
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
      }
    }
    
    // Send completion signal
    const completeData = JSON.stringify({ 
      type: 'complete', 
      fullContent: fullResponse 
    })
    controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`))
    
    console.log(`✅ Chat response streamed successfully`)
    controller.close()
    
  } catch (error) {
    console.error('Error streaming chat response:', error)
    
    // Send error to client
    const errorData = JSON.stringify({ 
      type: 'error', 
      message: 'Failed to generate response' 
    })
    controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
    controller.close()
    
    throw error
  }
}

// Create system prompt based on source
function createSystemPrompt(source: Source): string {
  const basePrompt = `Jesteś inteligentnym asystentem AI specjalizującym się w pomocy przy nauce. Odpowiadasz na pytania użytkownika na podstawie dostarczonego materiału źródłowego.

WAŻNE ZASADY:
1. Odpowiadaj TYLKO na podstawie dostarczonego materiału źródłowego
2. Jeśli pytanie wykracza poza materiał, uprzejmie poinformuj o tym
3. Używaj jasnego, zrozumiałego języka
4. Dawaj konkretne przykłady z materiału gdy to możliwe
5. Jeśli nie jesteś pewien, powiedz to wprost
6. Formatuj odpowiedzi w sposób czytelny (używaj akapitów, list gdy potrzeba)

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})`
  
  // Add source content if available
  if (source.extractedText && source.type !== 'image' && source.type !== 'audio') {
    const contentPreview = source.extractedText.slice(0, 8000) // Limit to prevent token overflow
    return `${basePrompt}

TREŚĆ MATERIAŁU:
${contentPreview}

${source.extractedText.length > 8000 ? '\n[Materiał został skrócony - bazuj na dostępnej części]' : ''}`
  }
  
  // For unsupported source types
  const unsupportedMessage = getUnsupportedSourceMessage(source.type)
  return `${basePrompt}

${unsupportedMessage}

Odpowiadaj na pytania ogólne dotyczące tego typu materiału i pomagaj użytkownikowi zrozumieć, jak będzie można go przetworzyć gdy funkcja zostanie zaimplementowana.`
}

// Get message for unsupported source types
function getUnsupportedSourceMessage(sourceType: string): string {
  switch (sourceType) {
    case 'docx':
      return 'UWAGA: Przetwarzanie plików DOCX nie jest jeszcze zaimplementowane. Mogę udzielić ogólnych informacji o pracy z dokumentami Word.'
    case 'image':
      return 'UWAGA: Analiza obrazów (OCR) nie jest jeszcze zaimplementowana. Mogę udzielić ogólnych informacji o pracy z materiałami wizualnymi.'
    case 'audio':
      return 'UWAGA: Transkrypcja audio nie jest jeszcze zaimplementowana. Mogę udzielić ogólnych informacji o pracy z materiałami audio.'
    case 'youtube':
      return 'UWAGA: Analiza transkrypcji YouTube nie jest jeszcze zaimplementowana. Mogę udzielić ogólnych informacji o uczeniu się z filmów.'
    case 'url':
      return 'UWAGA: Ekstrakcja treści z stron internetowych nie jest jeszcze zaimplementowana. Mogę udzielić ogólnych informacji o pracy z treściami web.'
    default:
      return 'Materiał nie zawiera jeszcze przetworzonej treści.'
  }
}