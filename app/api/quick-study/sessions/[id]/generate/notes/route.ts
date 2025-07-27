// app/api/quick-study/sessions/[id]/generate/notes/route.ts
export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { QuickStudyTextService } from '@/app/services/QuickStudyTextService'
import { Source, SessionData } from '@/app/types/QuickStudyTypes'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
  noteType?: string;
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
    
    console.log(`📚 Enhanced Notes generation request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced notes generation for source: ${source.name}`)
    
    // Log settings for debugging
    const noteType = settings?.noteType || 'general'
    console.log(`📋 Notes settings:`, {
      noteType: noteType,
      availableTypes: ['general', 'key-points', 'structured', 'summary-table']
    })
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'notes')
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

    // 🚀 NEW: Generate enhanced notes using QuickStudyTextService
    const generatedContent = await generateEnhancedNotesFromText(source, settings)
    
    // Create preview (first line without markdown, max 100 chars)
    const preview = generatedContent.split('\n')[0].replace(/[#*]/g, '').substring(0, 100) + '...'
    
    // Count sections for display
    const sectionCount = (generatedContent.match(/^#{1,3}\s/gm) || []).length
    
// Create dynamic title based on note type
const getNoteTitleByType = (noteType: string, sourceName: string): string => {
  const cleanName = sourceName.replace(/\.[^/.]+$/, "")
  switch (noteType) {
    case 'key-points':
      return `Kluczowe punkty - ${cleanName}`
    case 'structured':
      return `Notatki strukturalne - ${cleanName}`
    case 'summary-table':
      return `Tabele i zestawienia - ${cleanName}`
    case 'general':
    default:
      return `Notatki - ${cleanName}`
  }
}

// Create output
const output: Output = {
  id: `output-${Date.now()}`,
  type: 'notes',
  title: getNoteTitleByType(noteType, source.name),
  preview: preview,
  status: 'ready',
  sourceId: sourceId,
  createdAt: new Date(),
  count: sectionCount,
  content: generatedContent,
  noteType: noteType // Add noteType to track what was generated
}
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated enhanced notes: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating enhanced notes:', error)
    
    return Response.json(
      { message: 'Failed to generate notes' },
      { status: 500 }
    )
  }
}

// Enhanced notes generation using QuickStudyTextService
async function generateEnhancedNotesFromText(source: Source, settings: any): Promise<string> {
  console.log(`🤖 Generating enhanced AI notes for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createNotesSystemPrompt(source, settings)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'notes', 
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'notes')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for notes generation:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }

    const noteType = settings?.noteType || 'general' // general, key-points, structured, summary-table
    console.log(`   - Note type: ${noteType}`)

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Stwórz ${getNoteTypeDescription(noteType)} na podstawie poniższego materiału.

${textResult.text}

Typ notatek: ${noteType}
${noteType === 'key-points' ? 'Skup się na najważniejszych pojęciach, terminach i definicjach.' : ''}
${noteType === 'structured' ? 'Użyj tabel, list zagnieżdżonych i numerowania dla jasnej struktury.' : ''}
${noteType === 'summary-table' ? 'Prezentuj informacje głównie w formie tabel i zestawień.' : ''}
${noteType === 'general' ? 'Stwórz kompletne notatki studenckie z wszystkimi ważnymi informacjami.' : ''}`
        }
      ],
      temperature: 0.4,
      max_tokens: 4000
    })

    const content = response.choices[0]?.message?.content || ''
    
    console.log(`✅ Enhanced notes generated successfully`)
    console.log(`   - Notes created from ${textResult.source} text`)
    console.log(`   - Processing length: ${textResult.text.length} characters`)
    console.log(`   - Note type: ${noteType}`)
    
    return content
    
  } catch (error) {
    console.error('❌ Error generating enhanced notes:', error)
    throw error
  }
}

// Create notes-specific system prompt
function createNotesSystemPrompt(source: Source, settings: any): string {
  const noteType = settings?.noteType || 'general'

  return getNoteSystemPrompt(noteType, source)
}

function getNoteSystemPrompt(noteType: string, source: Source): string {
  const basePrompt = `Jesteś ekspertem w tworzeniu notatek studenckich. Używasz formatowania Markdown do strukturyzacji treści.

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

WAŻNE: 
- Bazuj TYLKO na informacjach z dostarczonego materiału źródłowego
- Wzory matematyczne formatuj w LaTeX: użyj $wzór$ dla inline i $wzór$ dla block
- NIE używaj nawiasów ( ) dla wzorów, zawsze $ $ lub $ $`
  
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
- Wzory matematyczne: $inline$ lub $block$
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
- Wzory matematyczne: $inline$ lub $block$
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
- Użyj **bold** w tabelach dla kluczowych elementów
- Wzory matematyczne w tabelach: $inline$ lub $block$`

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
- Wzory matematyczne: $inline$ lub $block$
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