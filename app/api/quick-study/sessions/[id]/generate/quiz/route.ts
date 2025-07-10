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
    
    console.log(`📝 Quiz generation request for session: ${sessionId}`)
    
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
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for quiz`)
    
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
        generatedContent = await generateQuizFromText(source.extractedText, source.name, settings)
        break
        
      case 'docx':
        generatedContent = JSON.stringify({
          title: `Interactive Quiz - ${source.name}`,
          description: "DOCX processing is not implemented yet. This is a placeholder for DOCX quiz generation.",
          questions: [
            {
              id: "placeholder-1",
              question: "What file type is not yet supported for quiz generation?",
              options: ["PDF", "DOCX", "Text", "All are supported"],
              correctAnswer: "DOCX",
              explanation: "DOCX processing will be implemented in a future update.",
              difficulty: "easy"
            }
          ],
          timeLimit: 10,
          passingScore: 70
        })
        break
        
      case 'image':
        generatedContent = JSON.stringify({
          title: `Interactive Quiz - ${source.name}`,
          description: "Image OCR processing is not implemented yet. This is a placeholder for image quiz generation.",
          questions: [
            {
              id: "placeholder-1",
              question: "What technology is needed to extract text from images?",
              options: ["OCR", "PDF Parser", "Text Editor", "Image Viewer"],
              correctAnswer: "OCR",
              explanation: "OCR (Optical Character Recognition) is used to extract text from images.",
              difficulty: "medium"
            }
          ],
          timeLimit: 5,
          passingScore: 70
        })
        break
        
      case 'audio':
        generatedContent = JSON.stringify({
          title: `Interactive Quiz - ${source.name}`,
          description: "Audio transcription is not implemented yet. This is a placeholder for audio quiz generation.",
          questions: [
            {
              id: "placeholder-1",
              question: "What is the first step in creating a quiz from audio content?",
              options: ["Create questions", "Transcribe audio", "Set timer", "Choose difficulty"],
              correctAnswer: "Transcribe audio",
              explanation: "Audio must first be transcribed to text before quiz questions can be generated.",
              difficulty: "easy"
            }
          ],
          timeLimit: 10,
          passingScore: 70
        })
        break
        
      case 'youtube':
        generatedContent = JSON.stringify({
          title: `Interactive Quiz - ${source.name}`,
          description: "YouTube transcript processing is not implemented yet. This is a placeholder for video quiz generation.",
          questions: [
            {
              id: "placeholder-1",
              question: "What feature allows creating quizzes from YouTube videos?",
              options: ["Video download", "Transcript extraction", "Thumbnail analysis", "Comment parsing"],
              correctAnswer: "Transcript extraction",
              explanation: "YouTube transcripts provide the text content needed for quiz generation.",
              difficulty: "medium"
            }
          ],
          timeLimit: 15,
          passingScore: 70
        })
        break
        
      case 'url':
        generatedContent = JSON.stringify({
          title: `Interactive Quiz - ${source.name}`,
          description: "URL content extraction is not implemented yet. This is a placeholder for web content quiz generation.",
          questions: [
            {
              id: "placeholder-1",
              question: "What is required to create quizzes from web articles?",
              options: ["URL only", "Content extraction", "Browser cookies", "User login"],
              correctAnswer: "Content extraction",
              explanation: "The text content must be extracted from web pages to generate meaningful quiz questions.",
              difficulty: "easy"
            }
          ],
          timeLimit: 10,
          passingScore: 70
        })
        break
        
      default:
        return Response.json(
          { message: `Unsupported source type: ${source.type}` },
          { status: 400 }
        )
    }
    
    // Parse the quiz content to get question count
    let questionCount = 0
    try {
      const quizData = JSON.parse(generatedContent)
      questionCount = quizData.questions?.length || 0
    } catch (e) {
      console.error("Cannot parse quiz content:", e)
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
    
    console.log(`✅ Generated quiz: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating quiz:', error)
    
    return Response.json(
      { message: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}

// Generate quiz from text using AI
async function generateQuizFromText(extractedText: string, sourceName: string, settings: any): Promise<string> {
  console.log(`🤖 Generating AI quiz for: ${sourceName}`)
  
  try {
    const questionCount = settings?.questionCount || 10
    const difficulty = settings?.difficulty || 'mixed' // easy, medium, hard, mixed
    const timeLimit = settings?.timeLimit || Math.max(questionCount * 2, 10) // 2 minutes per question, min 10
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu interaktywnych quizów edukacyjnych. Twoim zadaniem jest stworzenie quizu, który:

1. Testuje zrozumienie kluczowych koncepcji, nie tylko pamięć
2. Zawiera pytania o różnym poziomie trudności
3. Ma 4 odpowiedzi do wyboru dla każdego pytania
4. Zawiera szczegółowe wyjaśnienia dla każdej poprawnej odpowiedzi
5. Jest angażujący i motywujący do nauki

Format odpowiedzi - MUSI być poprawny JSON:
{
  "title": "Tytuł quizu",
  "description": "Krótki opis tego czego dotyczy quiz",
  "questions": [
    {
      "id": "q1",
      "question": "Treść pytania",
      "options": ["Opcja A", "Opcja B", "Opcja C", "Opcja D"],
      "correctAnswer": "Opcja B",
      "explanation": "Szczegółowe wyjaśnienie dlaczego ta odpowiedź jest poprawna",
      "difficulty": "easy|medium|hard"
    }
  ],
  "timeLimit": ${timeLimit},
  "passingScore": 70
}

Zasady tworzenia pytań:
- Wszystkie opcje odpowiedzi muszą być wiarygodne
- Unikaj odpowiedzi typu "wszystkie powyższe" lub "żadne z powyższych"
- Pytania powinny testować zrozumienie, nie tylko zapamiętywanie faktów
- Wyjaśnienia powinny być edukacyjne i pomocne w nauce`
        },
        {
          role: "user",
          content: `Stwórz interaktywny quiz z ${questionCount} pytaniami na podstawie poniższego tekstu.

Poziom trudności: ${difficulty}
Limit czasu: ${timeLimit} minut

Materiał źródłowy z "${sourceName}":
${extractedText.slice(0, 15000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    // Validate JSON structure
    const parsed = JSON.parse(content)
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid quiz format generated by AI')
    }
    
    // Add unique IDs to questions if missing
    parsed.questions = parsed.questions.map((q: any, index: number) => ({
      ...q,
      id: q.id || `q${index + 1}`
    }))
    
    console.log(`✅ AI quiz generated successfully with ${parsed.questions.length} questions`)
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('Error generating quiz with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}