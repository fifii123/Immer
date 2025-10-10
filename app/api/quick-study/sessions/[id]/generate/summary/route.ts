// app/api/quick-study/sessions/[id]/generate/summary/route.ts
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
    
    console.log(`📝 Enhanced Summary generation request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced summary generation for source: ${source.name}`)
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'summary')
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

    // 🚀 NEW: Generate enhanced summary using QuickStudyTextService
    const generatedContent = await generateEnhancedSummaryFromText(source, settings)
    
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
    
    console.log(`✅ Generated enhanced summary: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating enhanced summary:', error)
    
    return Response.json(
      { message: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

// Enhanced summary generation using QuickStudyTextService
async function generateEnhancedSummaryFromText(source: Source, settings: any): Promise<string> {
  console.log(`🤖 Generating enhanced AI summary for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createSummarySystemPrompt(source, settings)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'summary', 
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'summary')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for summary generation:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }

    const length = settings?.length || 'medium' // short, medium, detailed
    const focus = settings?.focus || 'comprehensive' // key_points, comprehensive, conclusions
    const includeQuotes = settings?.includeQuotes !== false // default true

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Przeanalizuj poniższy materiał i stwórz jego podsumowanie.

${textResult.text}

WYMAGANIA:
- Długość: ${length}
- Fokus: ${focus}
- ${includeQuotes ? 'Zawieraj kluczowe cytaty i odniesienia' : 'Skup się na głównych ideach'}
- Struktura logiczna z jasnym przepływem
- Główne wnioski i takeaways
- Kontekst i znaczenie omawianych zagadnień`
        }
      ],
      temperature: 0.7,
      max_tokens: 3500
    })

    const content = response.choices[0]?.message?.content || ''
    
    console.log(`✅ Enhanced summary generated successfully`)
    console.log(`   - Summary created from ${textResult.source} text`)
    console.log(`   - Processing length: ${textResult.text.length} characters`)
    
    return content
    
  } catch (error) {
    console.error('❌ Error generating enhanced summary:', error)
    throw error
  }
}

// Create summary-specific system prompt
function createSummarySystemPrompt(source: Source, settings: any): string {
  const length = settings?.length || 'medium'
  const focus = settings?.focus || 'comprehensive'
  const includeQuotes = settings?.includeQuotes !== false

  const lengthGuidance = {
    short: '2-3 akapity, najważniejsze punkty',
    medium: '4-6 akapitów, zbalansowane pokrycie',
    detailed: '6-10 akapitów, szczegółowa analiza'
  }

  const focusGuidance = {
    key_points: 'kluczowe punkty i główne argumenty',
    comprehensive: 'kompleksowy przegląd wszystkich głównych tematów',
    conclusions: 'wnioski, implikacje i takeaways'
  }

  return `Jesteś ekspertem w tworzeniu podsumowań edukacyjnych. Twoim zadaniem jest stworzenie ${lengthGuidance[length as keyof typeof lengthGuidance]}, które:

1. Wychwytuje najważniejsze informacje i koncepcje
2. Organizuje je w logiczną, spójną narrację
3. Zachowuje kontekst i znaczenie
4. Pomaga w zrozumieniu głównych idei
5. ${focusGuidance[focus as keyof typeof focusGuidance]}

STRUKTURA PODSUMOWANIA:
- **Wprowadzenie**: Główny temat i zakres materiału
- **Kluczowe punkty**: Najważniejsze koncepcje i argumenty
- **Szczegóły**: Ważne fakty, dane, przykłady
- ${includeQuotes ? '- **Kluczowe cytaty**: Istotne wypowiedzi z materiału' : ''}
- **Wnioski**: Główne takeaways i implikacje

ZASADY TWORZENIA:
- Używaj jasnego, przystępnego języka
- Zachowaj proporcje - więcej miejsca na ważniejsze tematy
- ${includeQuotes ? 'Cytuj kluczowe fragmenty gdy dodają wartość' : 'Parafrazuj główne idee'}
- Łącz powiązane koncepcje
- Podkreślaj znaczenie i implikacje
- Długość: ${length}
- Fokus: ${focus}

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

WAŻNE: Bazuj TYLKO na informacjach z dostarczonego materiału źródłowego.`
}