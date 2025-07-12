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

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
}

interface FlashcardDeck {
  title: string;
  description: string;
  cards: Flashcard[];
  totalCards: number;
  categories: string[];
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
    
    console.log(`🎴 Flashcards generation request for session: ${sessionId}`)
    
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
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for flashcards`)
    
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
        generatedContent = await generateFlashcardsFromText(source.extractedText, source.name, settings)
        break
        
      case 'docx':
        generatedContent = JSON.stringify({
          title: `Flashcards - ${source.name}`,
          description: "DOCX processing is not implemented yet. This is a placeholder for DOCX flashcard generation.",
          cards: [
            {
              id: "placeholder-1",
              front: "What file format is not yet supported?",
              back: "DOCX files are not yet supported but will be implemented in a future update.",
              difficulty: "easy",
              category: "File Types",
              tags: ["docx", "file-format", "future"]
            }
          ],
          totalCards: 1,
          categories: ["File Types"]
        })
        break
        
      case 'image':
        generatedContent = JSON.stringify({
          title: `Flashcards - ${source.name}`,
          description: "Image OCR processing is not implemented yet. This is a placeholder for image flashcard generation.",
          cards: [
            {
              id: "placeholder-1",
              front: "What is OCR?",
              back: "Optical Character Recognition - technology used to extract text from images and make it machine-readable.",
              difficulty: "medium",
              category: "Technology",
              tags: ["ocr", "image-processing", "text-extraction"]
            }
          ],
          totalCards: 1,
          categories: ["Technology"]
        })
        break
        
      case 'audio':
        generatedContent = JSON.stringify({
          title: `Flashcards - ${source.name}`,
          description: "Audio transcription is not implemented yet. This is a placeholder for audio flashcard generation.",
          cards: [
            {
              id: "placeholder-1",
              front: "How do you create flashcards from audio?",
              back: "First transcribe the audio to text, then extract key concepts and definitions to create question-answer pairs.",
              difficulty: "medium",
              category: "Process",
              tags: ["audio", "transcription", "learning"]
            }
          ],
          totalCards: 1,
          categories: ["Process"]
        })
        break
        
      case 'youtube':
        generatedContent = JSON.stringify({
          title: `Flashcards - ${source.name}`,
          description: "YouTube transcript processing is not implemented yet. This is a placeholder for video flashcard generation.",
          cards: [
            {
              id: "placeholder-1",
              front: "What makes YouTube good for learning?",
              back: "Visual and auditory learning combined with searchable transcripts make YouTube an excellent educational platform.",
              difficulty: "easy",
              category: "Education",
              tags: ["youtube", "video-learning", "transcripts"]
            }
          ],
          totalCards: 1,
          categories: ["Education"]
        })
        break
        
      case 'url':
        generatedContent = JSON.stringify({
          title: `Flashcards - ${source.name}`,
          description: "URL content extraction is not implemented yet. This is a placeholder for web content flashcard generation.",
          cards: [
            {
              id: "placeholder-1",
              front: "What is web scraping?",
              back: "The process of automatically extracting data from websites to use in other applications or formats.",
              difficulty: "medium",
              category: "Web Technology",
              tags: ["web-scraping", "data-extraction", "automation"]
            }
          ],
          totalCards: 1,
          categories: ["Web Technology"]
        })
        break
        
      default:
        return Response.json(
          { message: `Unsupported source type: ${source.type}` },
          { status: 400 }
        )
    }
    
    // Parse the flashcard content to get card count
    let cardCount = 0
    try {
      const flashcardData = JSON.parse(generatedContent)
      cardCount = flashcardData.cards?.length || 0
    } catch (e) {
      console.error("Cannot parse flashcard content:", e)
    }
    
    // Create preview
    const preview = `${cardCount} interactive cards with spaced repetition`
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'flashcards',
      title: `Flashcards - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: cardCount,
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated flashcards: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating flashcards:', error)
    
    return Response.json(
      { message: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}

// Generate flashcards from text using AI
async function generateFlashcardsFromText(extractedText: string, sourceName: string, settings: any): Promise<string> {
  console.log(`🤖 Generating AI flashcards for: ${sourceName}`)
  
  try {
    const cardCount = settings?.cardCount || 20
    const difficulty = settings?.difficulty || 'mixed' // easy, medium, hard, mixed
    const includeCategories = settings?.includeCategories !== false // default true
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu flashcards do nauki. Twoim zadaniem jest stworzenie zestawu flashcards, które:

1. Zawierają kluczowe pojęcia, definicje, fakty i koncepcje
2. Mają przód (pytanie/pojęcie) i tył (odpowiedź/wyjaśnienie)
3. Są różnego poziomu trudności
4. Są pogrupowane tematycznie
5. Wykorzystują aktywne przywoływanie wiedzy

Format odpowiedzi - MUSI być poprawny JSON:
{
  "title": "Tytuł zestawu flashcards",
  "description": "Krótki opis zestawu",
  "cards": [
    {
      "id": "card1",
      "front": "Pytanie, pojęcie lub termin",
      "back": "Definicja, wyjaśnienie lub odpowiedź",
      "difficulty": "easy|medium|hard",
      "category": "Kategoria tematyczna",
      "tags": ["tag1", "tag2"]
    }
  ],
  "totalCards": ${cardCount},
  "categories": ["Kategoria 1", "Kategoria 2"]
}

Zasady tworzenia flashcards:
- Przód: krótki, konkretny, jednoznaczny
- Tył: kompletny ale zwięzły, zawiera kluczowe informacje
- Unikaj zbyt długich tekstów na przedzie karty
- Skupiaj się na jednym pojęciu na kartę
- Używaj jasnego, zrozumiałego języka
- Dodawaj przykłady gdy to pomocne`
        },
        {
          role: "user",
          content: `Stwórz zestaw ${cardCount} flashcards na podstawie poniższego tekstu.

${includeCategories ? 'Pogrupuj karty tematycznie.' : ''}
Poziom trudności: ${difficulty}

Materiał źródłowy z "${sourceName}":
${extractedText.slice(0, 15000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3500,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    // Validate JSON structure
    const parsed = JSON.parse(content)
    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Invalid flashcards format generated by AI')
    }
    
    // Add unique IDs to cards if missing and ensure all required fields
    parsed.cards = parsed.cards.map((card: any, index: number) => ({
      id: card.id || `card${index + 1}`,
      front: card.front || 'Missing front',
      back: card.back || 'Missing back',
      difficulty: card.difficulty || 'medium',
      category: card.category || 'General',
      tags: Array.isArray(card.tags) ? card.tags : []
    }))
    
    // Update counts and categories
    parsed.totalCards = parsed.cards.length
    parsed.categories = [...new Set(parsed.cards.map((card: any) => card.category))]
    
    console.log(`✅ AI flashcards generated successfully with ${parsed.cards.length} cards`)
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('Error generating flashcards with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}