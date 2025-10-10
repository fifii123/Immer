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

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  sequence: number;
  category?: string;
  importance: 'low' | 'medium' | 'high';
}

interface TimelineContent {
  title: string;
  description: string;
  events: TimelineEvent[];
  totalEvents: number;
  categories: string[];
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap' | 'timeline';
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
    
    console.log(`⏰ Timeline generation request for session: ${sessionId}`)
    
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
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for timeline`)
    
    // Generate content based on source type
    let generatedContent: string
    

        if (!source.extractedText) {
          return Response.json(
            { message: 'No text content available for processing' },
            { status: 400 }
          )
        }
        generatedContent = await generateTimelineFromText(source.extractedText, source.name, settings)

        
  
    
    // Parse the timeline content to get event count
    let eventCount = 0
    try {
      const timelineData = JSON.parse(generatedContent)
      eventCount = timelineData.events?.length || 0
    } catch (e) {
      console.error("Cannot parse timeline content:", e)
    }
    
    // Create preview
    const preview = `${eventCount} interactive events to arrange`
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'timeline',
      title: `Timeline - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: eventCount,
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated timeline: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating timeline:', error)
    
    return Response.json(
      { message: 'Failed to generate timeline' },
      { status: 500 }
    )
  }
}

// Generate timeline from text using AI
async function generateTimelineFromText(extractedText: string, sourceName: string, settings: any): Promise<string> {
  console.log(`🤖 Generating AI timeline for: ${sourceName}`)
  
  try {
    const maxEvents = settings?.maxEvents || 8
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu interaktywnych osi czasu. Twoim zadaniem jest stworzenie timeline, który:

1. Identyfikuje sekwencyjne elementy w tekście (procesy, wydarzenia, etapy, kroki)
2. Układa je w logicznym porządku chronologicznym lub procesowym
3. Nadaje każdemu elementowi odpowiednią wagę (importance)
4. Grupuje powiązane elementy w kategorie

WAŻNE: Szukaj TYLKO treści które mają naturalną sekwencję:
- Kroki procesu (1→2→3)
- Wydarzenia chronologiczne 
- Fazy rozwoju
- Etapy cyklu życia
- Procedury krok po kroku

Format odpowiedzi - MUSI być poprawny JSON:
{
  "title": "Tytuł timeline (opisowy)",
  "description": "Krótki opis tego co pokazuje timeline",
  "events": [
    {
      "id": "event1",
      "title": "Krótki tytuł wydarzenia/etapu",
      "description": "Szczegółowy opis tego co się dzieje w tym etapie",
      "sequence": 1,
      "category": "Kategoria tematyczna",
      "importance": "low|medium|high"
    }
  ],
  "totalEvents": ${maxEvents},
  "categories": ["Kategoria 1", "Kategoria 2"]
}

Zasady:
- Maksymalnie ${maxEvents} wydarzeń
- Każde wydarzenie musi mieć LOGICZNE miejsce w sekwencji
- NIE twórz timeline jeśli materiał nie ma sekwencyjnego charakteru
- Importance: high = kluczowe etapy, medium = ważne detale, low = dodatkowe info`
        },
        {
          role: "user",
          content: `Przeanalizuj poniższy tekst i stwórz interaktywny timeline TYLKO jeśli znajdziesz w nim elementy sekwencyjne.

Materiał z "${sourceName}":
${extractedText.slice(0, 15000)}

Jeśli nie ma sekwencyjnych elementów, stwórz timeline z głównych tematów w logicznej kolejności nauki.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    // Validate JSON structure
    const parsed = JSON.parse(content)
    if (!parsed.events || !Array.isArray(parsed.events)) {
      throw new Error('Invalid timeline format generated by AI')
    }
    
    // Ensure events have proper sequence numbers
    parsed.events = parsed.events.map((event: any, index: number) => ({
      ...event,
      id: event.id || `event${index + 1}`,
      sequence: event.sequence || index + 1
    }))
    
    // Update counts and categories
    parsed.totalEvents = parsed.events.length
    parsed.categories = [...new Set(parsed.events.map((event: any) => event.category))]
    
    console.log(`✅ AI timeline generated successfully with ${parsed.events.length} events`)
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('Error generating timeline with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}