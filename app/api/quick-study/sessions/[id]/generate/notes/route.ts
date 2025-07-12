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
        generatedContent = await generateNotesFromText(source.extractedText, source.name, settings)
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



// Zastąp funkcję generateNotesFromText:

async function generateNotesFromText(extractedText: string, sourceName: string, settings: any): Promise<string> {
  console.log(`🤖 Generating AI notes for: ${sourceName}, with style: ${settings.noteType}`)
  
  const noteType = settings?.noteType || 'general' // general, key-points, structured, summary-table
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: getNoteSystemPrompt(noteType)
        },
        {
          role: "user",
          content: `Stwórz ${getNoteTypeDescription(noteType)} na podstawie poniższego tekstu z "${sourceName}":

${extractedText.slice(0, 15000)}`
        }
      ],
      temperature: 0.4,
      max_tokens: 3000
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    console.log(`✅ AI notes (${noteType}) generated successfully`)
    return content.trim()
    
  } catch (error) {
    console.error('Error generating notes with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function getNoteSystemPrompt(noteType: string): string {
  const basePrompt = `Jesteś ekspertem w tworzeniu notatek studenckich. Używaj formatowania Markdown do strukturyzacji treści.`
  
  switch (noteType) {
    case 'key-points':
      return `${basePrompt}

Twoim zadaniem jest stworzenie listy kluczowych punktów, która:
1. Identyfikuje najważniejsze pojęcia, terminy i definicje
2. Prezentuje je w przejrzystej, hierarchicznej strukturze
3. Zawiera krótkie, zwięzłe wyjaśnienia
4. Używa formatowania Markdown (nagłówki, listy, bold)

Format odpowiedzi:
- Użyj ## dla głównych kategorii
- Użyj **bold** dla kluczowych terminów
- Użyj list z - lub • dla punktów
- Dodaj krótkie definicje w nawiasach
- Maksymalnie 3-4 słowa na punkt, potem wyjaśnienie`

    case 'structured':
      return `${basePrompt}

Twoim zadaniem jest stworzenie strukturalnych notatek, które:
1. Są podzielone na logiczne sekcje z numerowaniem
2. Zawierają tabele dla porównań i zestawień
3. Używają list zagnieżdżonych dla hierarchii
4. Mają wydzielone bloki z ważnymi informacjami
5. Zawierają podsumowania na końcu sekcji

Format odpowiedzi:
- Użyj ### dla sekcji numerowanych
- Twórz tabele dla porównań: | Kolumna 1 | Kolumna 2 |
- Użyj list zagnieżdżonych (1., a., i.)
- Użyj > dla ważnych cytatów/definicji
- Dodaj **Podsumowanie:** na końcu sekcji`

    case 'summary-table':
      return `${basePrompt}

Twoim zadaniem jest stworzenie notatek w formie tabel i zestawień, które:
1. Organizują informacje w przejrzyste tabele
2. Tworzą porównania i zestawienia
3. Wydzielają najważniejsze fakty i liczby
4. Prezentują procesy jako tabele krok po kroku
5. Zawierają tabele z przykładami

Format odpowiedzi:
- Głównie tabele Markdown: | Nagłówek 1 | Nagłówek 2 | Nagłówek 3 |
- Tabele dla: pojęć i definicji, procesów, porównań, przykładów
- Krótkie wprowadzenia przed tabelami
- Użyj **bold** w tabelach dla kluczowych elementów`

    default: // 'general'
      return `${basePrompt}

Twoim zadaniem jest stworzenie kompletnych notatek studenckich, które:
1. Są podzielone na logiczne sekcje z nagłówkami
2. Zawierają kluczowe definicje, pojęcia i fakty
3. Używają formatowania Markdown (nagłówki, punkty, bold)
4. Są napisane w sposób jasny i zorganizowany
5. Zawierają wszystkie ważne informacje do nauki

Format odpowiedzi:
- Użyj ## dla głównych sekcji
- Użyj ### dla podsekcji
- Użyj **bold** dla ważnych terminów
- Użyj list • dla kluczowych informacji
- Dodaj definicje w > blokach cytowania
- Organizuj treść hierarchicznie`
  }
}

function getNoteTypeDescription(noteType: string): string {
  switch (noteType) {
    case 'key-points':
      return 'listę kluczowych punktów i terminów'
    case 'structured':
      return 'strukturalne notatki z tabelami i hierarchią'
    case 'summary-table':
      return 'notatki w formie tabel i zestawień'
    default:
      return 'szczegółowe notatki studenckie'
  }
}