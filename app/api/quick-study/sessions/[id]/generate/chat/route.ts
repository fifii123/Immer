// app/api/quick-study/sessions/[id]/generate/chat/route.ts
export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { QuickStudyTextService } from '@/app/services/QuickStudyTextService'
import { Source, SessionData } from '@/app/types/QuickStudyTypes'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
    
    console.log(`💬 Enhanced Chat request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced chat message for source: ${source.name}`)
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'chat')
    console.log(`📊 Processing Stats:`, {
      textSource: processingStats.textSource,
      originalLength: processingStats.originalLength,
      processedLength: processingStats.processedLength,
      optimizationQuality: processingStats.optimizationQuality,
      recommended: processingStats.recommendedForTask
    })
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamEnhancedChatResponse(
            source,
            message,
            conversationHistory || [],
            controller
          )
        } catch (error) {
          console.error('❌ Error in enhanced chat stream:', error)
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
    console.error('❌ Error in enhanced chat endpoint:', error)
    
    return Response.json(
      { message: 'Enhanced chat request failed' },
      { status: 500 }
    )
  }
}

// Enhanced streaming chat response using QuickStudyTextService
async function streamEnhancedChatResponse(
  source: Source, 
  userMessage: string, 
  conversationHistory: any[],
  controller: ReadableStreamDefaultController
) {
  console.log(`🤖 Generating enhanced streaming chat response for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createBaseSystemPrompt(source)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'chat', 
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'chat')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for chat:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }
    
    // Prepare conversation context with enhanced material info
const messages = [
  { role: 'system', content: enhancedSystemPrompt },
  { 
    role: 'system', 
    content: `MATERIAŁ ŹRÓDŁOWY:
---
${textResult.text}
---` 
  },
  ...conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  })),
  { role: 'user', content: userMessage }
]
    
    console.log(`🔄 Creating enhanced chat completion...`)
    
    // Create streaming completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    })
    
    let fullResponse = ''
    let chunkCount = 0
    
    // Stream the response with enhanced monitoring
    console.log(`📤 Starting enhanced response stream...`)
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      
      if (content) {
        fullResponse += content
        chunkCount++
        
        // Send chunk to client
        const data = JSON.stringify({ 
          type: 'chunk', 
          content: content,
          // Optional: include processing metadata for debugging
          meta: chunkCount === 1 ? {
            textSource: textResult.source,
            textLength: textResult.text.length,
            optimization: textResult.stats
          } : undefined
        })
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
      }
    }
    
    // Send completion signal with enhanced metadata
    const completeData = JSON.stringify({ 
      type: 'complete', 
      fullContent: fullResponse,
      processingInfo: {
        sourceType: textResult.source,
        processedLength: textResult.text.length,
        responseLength: fullResponse.length,
        chunkCount: chunkCount
      }
    })
    controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`))
    
    console.log(`✅ Enhanced chat response completed successfully`)
    console.log(`   - Response length: ${fullResponse.length} characters`)
    console.log(`   - Chunks streamed: ${chunkCount}`)
    console.log(`   - Source: ${textResult.source}`)
    
    controller.close()
    
  } catch (error) {
    console.error('❌ Error streaming enhanced chat response:', error)
    
    // Send error to client
    const errorData = JSON.stringify({ 
      type: 'error', 
      message: 'Failed to generate enhanced response',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
    controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
    controller.close()
    
    throw error
  }
}

// Create base system prompt (without text processing context)
function createBaseSystemPrompt(source: Source): string {
  return `Jesteś inteligentnym asystentem AI specjalizującym się w pomocy przy nauce. Odpowiadasz na pytania użytkownika na podstawie dostarczonego materiału źródłowego.

WAŻNE ZASADY:
1. Odpowiadaj TYLKO na podstawie dostarczonego materiału źródłowego
2. Jeśli pytanie wykracza poza materiał, uprzejmie poinformuj o tym
3. Używaj jasnego, zrozumiałego języka
4. Dawaj konkretne przykłady z materiału gdy to możliwe
5. Jeśli nie jesteś pewien, powiedz to wprost
6. Formatuj odpowiedzi w sposób czytelny (używaj akapitów, list gdy potrzeba)
7. Przy cytowaniu lub odwoływaniu się do konkretnych fragmentów, używaj precyzyjnych odniesień

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

INSTRUKCJE SPECJALNE:
- Jeśli materiał został zoptymalizowany, pamiętaj że zawiera najważniejsze informacje w skoncentrowanej formie
- Przy odpowiedziach wykorzystuj wiedzę o kluczowych tematach jeśli są dostępne
- Jeśli używasz fragmentu dokumentu, informuj o tym kontekście
- Zawsze bazuj na factach z materiału, nie dodawaj informacji z zewnątrz`
}

// 🚀 Enhanced logging helper for debugging
function logProcessingContext(source: Source, textResult: any) {
  console.log(`
=== 🔍 ENHANCED CHAT PROCESSING CONTEXT ===
📄 Source: ${source.name} (${source.type})
📊 Original length: ${source.extractedText?.length || 0} chars
🎯 Processing text: ${textResult.text.length} chars (${textResult.source})
${textResult.stats?.compressionRatio ? `📈 Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%` : ''}
${textResult.stats?.strategy ? `🎲 Strategy: ${textResult.stats.strategy}` : ''}
${textResult.stats?.keyTopics ? `🏷️ Topics: ${textResult.stats.keyTopics.slice(0, 3).join(', ')}` : ''}
${'='.repeat(50)}
`)
}