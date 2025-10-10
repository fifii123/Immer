// app/api/quick-study/sessions/[id]/generate/flashcards/route.ts
export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { QuickStudyTextService } from '@/app/services/QuickStudyTextService'
import { Source, SessionData } from '@/app/types/QuickStudyTypes'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
    
    console.log(`🎴 Enhanced Flashcards generation request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced flashcards generation for source: ${source.name}`)
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'flashcards')
    console.log(`📊 Processing Stats:`, {
      textSource: processingStats.textSource,
      originalLength: processingStats.originalLength,
      processedLength: processingStats.processedLength,
      optimizationQuality: processingStats.optimizationQuality,
      recommended: processingStats.recommendedForTask
    })
    
    if (!source.extractedText) {
      return Response.json(
        { message: 'No text content available for processing' },
        { status: 400 }
      )
    }

    // 🚀 NEW: Generate enhanced flashcards using QuickStudyTextService
    const generatedContent = await generateEnhancedFlashcardsFromText(source, settings)
    
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
    
    console.log(`✅ Generated enhanced flashcards: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating enhanced flashcards:', error)
    
    return Response.json(
      { message: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}

// Enhanced flashcards generation using QuickStudyTextService
async function generateEnhancedFlashcardsFromText(source: Source, settings: any): Promise<string> {
  console.log(`🤖 Generating enhanced AI flashcards for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createFlashcardsSystemPrompt(source, settings)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'flashcards', 
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'flashcards')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for flashcards generation:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }

    const cardCount = settings?.cardCount || 20
    const difficulty = settings?.difficulty || 'mixed' // easy, medium, hard, mixed
    const includeCategories = settings?.includeCategories !== false // default true

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Przeanalizuj poniższy materiał i stwórz zestaw ${cardCount} flashcards do nauki.

${textResult.text}

WYMAGANIA:
- Skupienie na kluczowych pojęciach, definicjach i faktach
- Poziom trudności: ${difficulty}
- ${includeCategories ? 'Pogrupowanie kart tematycznie' : 'Bez kategoryzacji'}
- Przód karty: krótkie, konkretne pytanie lub pojęcie
- Tył karty: kompletna ale zwięzła odpowiedź
- Optymalizacja dla aktywnego przywoływania wiedzy`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })

    let content = response.choices[0]?.message?.content || '{}'
    
    // 🔧 Clean markdown code blocks if present
    content = content.replace(/```json\s*|\s*```/g, '').trim()
    
    console.log(`✅ Enhanced flashcards generated successfully`)
    console.log(`   - Cards created from ${textResult.source} text`)
    console.log(`   - Processing length: ${textResult.text.length} characters`)
    
    return content
    
  } catch (error) {
    console.error('❌ Error generating enhanced flashcards:', error)
    throw error
  }
}

// Create flashcards-specific system prompt
function createFlashcardsSystemPrompt(source: Source, settings: any): string {
  const cardCount = settings?.cardCount || 20
  const difficulty = settings?.difficulty || 'mixed'
  const includeCategories = settings?.includeCategories !== false

  return `Jesteś ekspertem w tworzeniu flashcards do nauki. Twoim zadaniem jest stworzenie zestawu flashcards, które:

1. Zawierają kluczowe pojęcia, definicje, fakty i koncepcje
2. Mają przód (pytanie/pojęcie) i tył (odpowiedź/wyjaśnienie)
3. Są różnego poziomu trudności
4. ${includeCategories ? 'Są pogrupowane tematycznie' : 'Fokusują się na najważniejszych pojęciach'}
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
      ${includeCategories ? '"category": "Kategoria tematyczna",' : ''}
      "tags": ["tag1", "tag2"]
    }
  ],
  "totalCards": ${cardCount}${includeCategories ? ',\n  "categories": ["Kategoria 1", "Kategoria 2"]' : ''}
}

ZASADY TWORZENIA FLASHCARDS:
- Przód: krótki, konkretny, jednoznaczny (max 2-3 wyrazy lub krótkie pytanie)
- Tył: kompletny ale zwięzły, zawiera kluczowe informacje
- Unikaj zbyt długich tekstów na przedzie karty
- Skupiaj się na jednym pojęciu na kartę
- Używaj jasnego, zrozumiałego języka
- Dodawaj przykłady gdy to pomocne
- Priorytet dla definicji, faktów i kluczowych koncepcji

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

WAŻNE: Bazuj TYLKO na informacjach z dostarczonego materiału źródłowego.`
}