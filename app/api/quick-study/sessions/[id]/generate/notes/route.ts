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
    
    console.log(`📚 Notes generation request for session: ${sessionId}`)
    
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
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for notes`)
    
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
        generatedContent = await generateNotesFromText(source.extractedText, source.name)
        break
        
      case 'docx':
        generatedContent = `**${source.name} - DOCX Notes**\n\nDOCX processing is not implemented yet. This is a placeholder for DOCX notes generation.\n\nWhen implemented, this will:\n• Extract text from DOCX files\n• Create structured study notes\n• Organize content with headings and bullet points\n• Highlight key definitions and concepts`
        break
        
      case 'image':
        generatedContent = `**${source.name} - Image Notes**\n\nImage OCR processing is not implemented yet. This is a placeholder for image notes generation.\n\nWhen implemented, this will:\n• Extract text from images using OCR\n• Create organized study notes\n• Identify and structure key information\n• Format content for easy studying`
        break
        
      case 'audio':
        generatedContent = `**${source.name} - Audio Notes**\n\nAudio transcription is not implemented yet. This is a placeholder for audio notes generation.\n\nWhen implemented, this will:\n• Transcribe audio to text\n• Create structured notes from lectures/podcasts\n• Organize content by topics\n• Include timestamps for reference`
        break
        
      case 'youtube':
        generatedContent = `**${source.name} - YouTube Notes**\n\nYouTube transcript processing is not implemented yet. This is a placeholder for video notes generation.\n\nWhen implemented, this will:\n• Extract transcripts from YouTube videos\n• Create comprehensive study notes\n• Include timestamps and key moments\n• Organize by topics and sections`
        break
        
      case 'url':
        generatedContent = `**${source.name} - Web Content Notes**\n\nURL content extraction is not implemented yet. This is a placeholder for web content notes generation.\n\nWhen implemented, this will:\n• Extract content from web pages\n• Create structured study notes\n• Organize information hierarchically\n• Include important links and references`
        break
        
      default:
        return Response.json(
          { message: `Unsupported source type: ${source.type}` },
          { status: 400 }
        )
    }
    
    // Create preview (first line without markdown, max 100 chars)
    const preview = generatedContent.split('\n')[0].replace(/[#*]/g, '').substring(0, 100) + '...'
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'notes',
      title: `Notes - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated notes: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating notes:', error)
    
    return Response.json(
      { message: 'Failed to generate notes' },
      { status: 500 }
    )
  }
}

// Generate notes from text using AI
async function generateNotesFromText(extractedText: string, sourceName: string): Promise<string> {
  console.log(`🤖 Generating AI notes for: ${sourceName}`)
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu notatek studenckich. Twoim zadaniem jest stworzenie notatek, które:

1. Są podzielone na logiczne sekcje z nagłówkami
2. Zawierają kluczowe definicje, pojęcia i fakty
3. Używają formatowania (nagłówki, punkty, podpunkty)
4. Są napisane w sposób jasny i zorganizowany
5. Zawierają wszystkie ważne informacje do nauki
6. Są praktyczne i użyteczne dla studenta

Format odpowiedzi:
- Użyj nagłówków ## dla głównych sekcji
- Użyj punktów • dla listy kluczowych informacji
- Podkreśl **ważne terminy** 
- Organizuj treść hierarchicznie
- Dodaj numerowane listy tam gdzie to ma sens
- Włącz definicje kluczowych pojęć`
        },
        {
          role: "user",
          content: `Stwórz szczegółowe notatki studenckie z poniższego tekstu. Notatki powinny być dobrze zorganizowane i zawierać wszystkie ważne informacje do nauki:

${extractedText}`
        }
      ],
      temperature: 0.4, // Slightly higher for more creative organization
      max_tokens: 2500 // More tokens for detailed notes
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    console.log(`✅ AI notes generated successfully`)
    return content.trim()
    
  } catch (error) {
    console.error('Error generating notes with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}