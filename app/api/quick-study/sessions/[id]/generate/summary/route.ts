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

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
  content?: string;
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`📝 Summary generation request for session: ${sessionId}`)
    
    // Parse request body
    const body = await request.json()
    const { sourceId, settings } = body
    
    if (!sourceId) {
      return Response.json(
        { message: 'Missing sourceId' },
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
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for summary`)
    
    // Generate content based on source type
    let generatedContent: string
    
    switch (source.type) {
      case 'pdf':
      case 'text':
        if (!source.extractedText) {
          return Response.json(
            { message: 'No text content available for processing' },
            { status: 400 }
          )
        }
        generatedContent = await generateSummaryFromText(source.extractedText, source.name)
        break
        
      case 'docx':
        generatedContent = `**${source.name} - DOCX Summary**\n\nDOCX processing is not implemented yet. This is a placeholder for DOCX summary generation.\n\nWhen implemented, this will:\n• Extract text from DOCX files\n• Create comprehensive summaries\n• Highlight key points and conclusions`
        break
        
      case 'image':
        generatedContent = `**${source.name} - Image Summary**\n\nImage OCR processing is not implemented yet. This is a placeholder for image summary generation.\n\nWhen implemented, this will:\n• Extract text from images using OCR\n• Summarize the extracted content\n• Identify key visual elements`
        break
        
      case 'audio':
        generatedContent = `**${source.name} - Audio Summary**\n\nAudio transcription is not implemented yet. This is a placeholder for audio summary generation.\n\nWhen implemented, this will:\n• Transcribe audio to text\n• Create summaries of spoken content\n• Identify main topics and key points`
        break
        
      case 'youtube':
        generatedContent = `**${source.name} - YouTube Summary**\n\nYouTube transcript processing is not implemented yet. This is a placeholder for video summary generation.\n\nWhen implemented, this will:\n• Extract transcripts from YouTube videos\n• Summarize video content\n• Highlight key topics and timestamps`
        break
        
      case 'url':
        generatedContent = `**${source.name} - Web Content Summary**\n\nURL content extraction is not implemented yet. This is a placeholder for web content summary generation.\n\nWhen implemented, this will:\n• Extract content from web pages\n• Create summaries of articles\n• Identify main arguments and conclusions`
        break
        
      default:
        return Response.json(
          { message: `Unsupported source type: ${source.type}` },
          { status: 400 }
        )
    }
    
    // Create preview (first line, max 100 chars)
    const preview = generatedContent.split('\n')[0].substring(0, 100) + '...'
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'summary',
      title: `Summary - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated summary: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating summary:', error)
    
    return Response.json(
      { message: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

// Generate summary from text using AI
async function generateSummaryFromText(extractedText: string, sourceName: string): Promise<string> {
  console.log(`🤖 Generating AI summary for: ${sourceName}`)
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu zwięzłych, ale kompletnych streszczeń. Twoim zadaniem jest stworzenie podsumowania, które:

1. Wychwytuje wszystkie kluczowe punkty i główne idee
2. Jest strukturalne i logiczne
3. Używa jasnego, zrozumiałego języka
4. Jest na tyle szczegółowe, żeby dać pełny obraz tematu
5. Ma 3-5 akapitów w zależności od długości materiału

Format odpowiedzi:
- Użyj akapitów do organizacji treści
- Rozpocznij od najważniejszych informacji
- Zakończ kluczowymi wnioskami lub takeaways
- Nie używaj nagłówków ani formatowania markdown`
        },
        {
          role: "user",
          content: `Stwórz szczegółowe podsumowanie poniższego tekstu. Podsumowanie powinno być kompletne i wychwycić wszystkie główne punkty:

${extractedText}`
        }
      ],
      temperature: 0.3, // Lower temperature for more focused summaries
      max_tokens: 1500
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    console.log(`✅ AI summary generated successfully`)
    return content.trim()
    
  } catch (error) {
    console.error('Error generating summary with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}