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

export async function generateNotesFromText(
  extractedText: string,
  sourceName: string
): Promise<string> {
  console.log(`🤖 Generating AI notes for: ${sourceName}`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      temperature: 0.3, // Mniej kreatywności, więcej struktury
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `
Jesteś ekspertem od generowania PERFEKCYJNIE sformatowanych notatek w Markdown. 
Twój output MUSI być technicznie poprawny i renderować się idealnie w aplikacjach React.

# ZASADY FORMATOWANIA:
1. NAGŁÓWKI:
   - Tytuł: # Tytuł (tylko jeden!)
   - Sekcje: ## Sekcja
   - Podsekcje: ### Podsekcja

2. LISTY:
   - Punktowane: - Element (1 spacja po myślniku!)
   - Numerowane: 1. Element
   - Zagnieżdżone: 2 spacje wcięcia
   - Zadania: - [x] Gotowe / - [ ] Niegotowe

3. FORMAT TEKSTU:
   - **Pogrubienie** dla kluczowych pojęć
   - *Kursywa* dla przykładów
   - \`Kod inline\` dla terminów technicznych
   - ~~Przekreślenie~~ tylko gdy konieczne

4. BLOKI KODU:
   \`\`\`javascript
   // Zawsze podawaj język!
   function example() { return true }
   \`\`\`

5. TABELE:
   | Nagłówek | Opis     |
   |----------|----------|
   | Komórka  | Dane     | (linie muszą się zgadzać!)

6. INNE:
   - Cytaty: > Tekst
   - Linie poziome: --- (3 minusy)
   - Obrazy: ![alt](url) (unikać jeśli możliwe)

# STRUKTURA NOTATEK:
1. Tytuł źródła jako H1
2. Sekcja wprowadzenia (2-3 zdania)
3. Główne zagadnienia (lista punktowana)
4. Szczegóły z podsekcjami
5. Przykłady w blokach kodu
6. Mini-quiz z checkboxami
7. Podsumowanie

NIGDY NIE UŻYWAJ:
- HTML
- Niestandardowych znaczników
- Wielokrotnych entera
- Emoji w treści merytorycznej
          `.trim()
        },
        {
          role: 'user',
          content: `
Wygeneruj notatki w ŚCISŁYM FORMACIE MARKDOWN na podstawie poniższego tekstu.
Pamiętaj o:
1. Idealnej składni technicznej
2. Logicznej strukturze
3. Czytelności na wszystkich urządzeniach
4. Zgodności z zasadami podanymi w instrukcji systemowej

Tytuł źródła: "${sourceName}"

Tekst do analizy:
${extractedText.substring(0, 12000)} [tekst został skrócony dla optymalizacji]`
        }
      ],
      response_format: { type: "text" }
    });

    let content = response.choices[0].message.content?.trim() || '';

    // Automatyczne poprawki formatowania
    content = content
      .replace(/^(#+)\s+/gm, '$1 ') // Spacje po #
      .replace(/^(-|\d+\.)\s+/gm, '$1 ') // Spacje po listach
      .replace(/\*\*(.*?)\*\*/g, '**$1**') // Pogrubienia
      .replace(/\n{3,}/g, '\n\n') // Max 2 entery
      .replace(/\|(.*?)\|/g, (match) => match.replace(/\s+/g, ' ').trim()); // Spacje w tabelach

    // Walidacja nagłówka
    if (!content.startsWith('# ')) {
      content = `# ${sourceName}\n\n${content}`;
    }

    console.log('Generated Markdown:', content); // Debug
    return content;
  } catch (error) {
    console.error('Error generating notes:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}