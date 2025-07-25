// app/api/quick-study/sessions/[id]/generate/quiz/route.ts
export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { QuickStudyTextService } from '@/app/services/QuickStudyTextService'
import { Source, SessionData } from '@/app/types/QuickStudyTypes'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizContent {
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
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
    
    console.log(`📝 Enhanced Quiz generation request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced quiz generation for source: ${source.name}`)
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'quiz')
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

    // 🚀 NEW: Generate enhanced quiz using QuickStudyTextService
    const generatedContent = await generateEnhancedQuizFromText(source, settings)
    
    // Parse the quiz content to get question count
    let questionCount = 0
    try {
      const quizData = JSON.parse(generatedContent)
      questionCount = quizData.questions?.length || 0
      
      // Debug: Check first question structure
      if (quizData.questions?.[0]) {
        console.log(`📋 First question structure:`)
        console.log(`   - correctAnswer: "${quizData.questions[0].correctAnswer}"`)
        console.log(`   - options: [${quizData.questions[0].options.join(', ')}]`)
        console.log(`   - match: ${quizData.questions[0].options.includes(quizData.questions[0].correctAnswer)}`)
      }
    } catch (e) {
      console.error("Cannot parse quiz content:", e)
      console.error("Generated content sample:", generatedContent.substring(0, 500) + "...")
    }
    
    // Create preview
    const preview = `${questionCount} interactive questions with explanations`
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'quiz',
      title: `Quiz - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: questionCount,
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated enhanced quiz: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating enhanced quiz:', error)
    
    return Response.json(
      { message: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}

// Enhanced quiz generation using QuickStudyTextService
async function generateEnhancedQuizFromText(source: Source, settings: any): Promise<string> {
  console.log(`🤖 Generating enhanced AI quiz for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createQuizSystemPrompt(source, settings)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'quiz', 
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'quiz')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for quiz generation:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }

    const questionCount = settings?.questionCount || 12
    const difficulty = settings?.difficulty || 'mixed' // easy, medium, hard, mixed
    const includeExplanations = settings?.includeExplanations !== false // default true

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Przeanalizuj poniższy materiał i stwórz interaktywny quiz składający się z ${questionCount} pytań.

${textResult.text}

WYMAGANIA:
- Różnorodność typów pytań (wielokrotny wybór, prawda/fałsz, uzupełnianie)
- Poziom trudności: ${difficulty}
- ${includeExplanations ? 'Szczegółowe wyjaśnienia do każdej odpowiedzi' : 'Krótkie wyjaśnienia'}
- Skupienie na kluczowych koncepcjach i faktach
- Pytania testujące zrozumienie, nie tylko zapamiętywanie`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })

    let content = response.choices[0]?.message?.content || '{}'
    
    // 🔧 Clean markdown code blocks if present
    content = content.replace(/```json\s*|\s*```/g, '').trim()
    
    // 🔧 Validate and fix quiz structure for frontend compatibility
    let parsed = JSON.parse(content)
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid quiz format generated by AI')
    }
    
    // Ensure questions have proper structure that frontend expects
    parsed.questions = parsed.questions.map((question: any, index: number) => {
      // Clean options - remove any prefixes like "A)", "B)" etc.
      const cleanOptions = (question.options || []).map((opt: string) => 
        opt.replace(/^[A-D]\)\s*/, '').trim()
      )
      
      // Clean correctAnswer to match one of the options
      let cleanCorrectAnswer = (question.correctAnswer || '').replace(/^[A-D]\)\s*/, '').trim()
      
      // Find matching option (case insensitive search as fallback)
      let matchingOption = cleanOptions.find((opt: string) => opt === cleanCorrectAnswer)
      if (!matchingOption) {
        matchingOption = cleanOptions.find((opt: string) => 
          opt.toLowerCase() === cleanCorrectAnswer.toLowerCase()
        )
      }
      // If still no match, use first option as fallback
      if (!matchingOption && cleanOptions.length > 0) {
        matchingOption = cleanOptions[0]
        console.warn(`Quiz question ${index + 1}: correctAnswer didn't match any option, using first option`)
      }
      
      return {
        id: question.id || `q${index + 1}`,
        question: question.question || `Question ${index + 1}`,
        options: cleanOptions.length >= 4 ? cleanOptions.slice(0, 4) : cleanOptions,
        correctAnswer: matchingOption || cleanOptions[0] || '',
        explanation: question.explanation || 'No explanation provided.',
        difficulty: ['easy', 'medium', 'hard'].includes(question.difficulty) ? question.difficulty : 'medium'
      }
    })
    
    // Filter out questions with less than 2 options
    parsed.questions = parsed.questions.filter((q: any) => q.options.length >= 2)
    
    // Update counts
    parsed.totalQuestions = parsed.questions.length
    
    console.log(`✅ Enhanced quiz generated successfully`)
    console.log(`   - Questions created from ${textResult.source} text`)
    console.log(`   - Processing length: ${textResult.text.length} characters`)
    
    return content
    
  } catch (error) {
    console.error('❌ Error generating enhanced quiz:', error)
    throw error
  }
}

// Create quiz-specific system prompt
function createQuizSystemPrompt(source: Source, settings: any): string {
  const questionCount = settings?.questionCount || 12
  const difficulty = settings?.difficulty || 'mixed'

  return `Jesteś ekspertem w tworzeniu interaktywnych quizów edukacyjnych. Twoim zadaniem jest stworzenie quizu, który:

1. Testuje kluczowe koncepcje i fakty z materiału
2. Zawiera tylko pytania wielokrotnego wyboru (4 opcje każde)
3. Ma przystępny poziom trudności
4. Włącza szczegółowe wyjaśnienia
5. Promuje aktywne uczenie się

KRYTYCZNE: correctAnswer MUSI być IDENTYCZNY z jedną z opcji!

Format odpowiedzi - MUSI być poprawny JSON:
{
  "title": "Tytuł quizu",
  "description": "Krótki opis quizu i zakresu tematycznego",
  "questions": [
    {
      "id": "q1",
      "question": "Treść pytania (bez numeracji)",
      "options": [
        "Pierwsza opcja odpowiedzi",
        "Druga opcja odpowiedzi", 
        "Trzecia opcja odpowiedzi",
        "Czwarta opcja odpowiedzi"
      ],
      "correctAnswer": "Druga opcja odpowiedzi",
      "explanation": "Szczegółowe wyjaśnienie dlaczego ta odpowiedź jest poprawna",
      "difficulty": "easy"
    }
  ],
  "timeLimit": ${Math.max(questionCount * 2, 15)},
  "passingScore": 70,
  "totalQuestions": ${questionCount}
}

ZASADY TWORZENIA PYTAŃ:
- Każde pytanie testuje konkretną koncepcję z materiału
- Opcje BEZ prefiksów (bez "A)", "B)" itp.) - tylko czysty tekst
- correctAnswer MUSI być skopiowany dokładnie z options (identyczny string)
- Unikaj pytań typu "trick question"
- Wszystkie opcje powinny być prawdopodobne
- Wyjaśnienia zawierają dodatkowy kontekst z materiału
- Poziom trudności: ${difficulty}

PRZYKŁAD POPRAWNEGO FORMATU:
"options": ["Mitochondrium", "Jądro komórkowe", "Chloroplast", "Ribosomy"],
"correctAnswer": "Mitochondrium"

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

WAŻNE: 
- Bazuj TYLKO na informacjach z dostarczonego materiału źródłowego
- correctAnswer = dokładnie jeden z options (copy-paste)
- Pytania bez numeracji (frontend dodaje numery)`
}