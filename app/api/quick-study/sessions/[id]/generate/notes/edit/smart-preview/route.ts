// app/api/quick-study/sessions/[id]/generate/notes/smart-preview/route.ts
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { MinimalContextService } from '@/app/services/MinimalContextService'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const { 
      operation, 
      sectionId,
      sectionContent,
      focusElement,
      parsedSections,
      fullDocument
    }: {
      operation: 'concepts' | 'questions' | 'eli5'
      sectionId: string
      sectionContent: string
      focusElement?: string
      parsedSections?: any[]
      fullDocument?: string
    } = body

    // Walidacja
    if (!operation || !sectionId || !sectionContent) {
      return Response.json(
        { error: 'Missing required parameters: operation, sectionId, sectionContent' },
        { status: 400 }
      )
    }

    console.log(`🧠 Smart Preview API: ${operation} for session ${params.id}, section ${sectionId}`)
    console.log(`📊 Content length: ${sectionContent.length} chars`)

    // Przygotowanie kontekstu jeśli są dostępne dane strukturalne
    let contextInfo = ''
    if (parsedSections && fullDocument) {
      try {
        // Znajdź sekcję w parsedSections
        const section = findSectionById(parsedSections, sectionId)
        if (section) {
          const editContext = MinimalContextService.getEditContextFromDOMInfo(
            {
              domElementId: sectionId,
              structuralId: sectionId,
              elementType: 'section',
              content: sectionContent
            },
            parsedSections,
            fullDocument
          )
          
          contextInfo = `
KONTEKST DOKUMENTU:
- Sekcja: "${editContext.fragmentPosition.sectionTitle}" (poziom ${editContext.fragmentPosition.sectionLevel})
- Pozycja: ${editContext.fragmentPosition.indexInDocument + 1}/${editContext.fragmentPosition.totalSections}
- Typ fragmentu: ${editContext.editingContext.fragmentType}
- Styl: ${editContext.editingContext.styleContext.toneLevel}
${editContext.precedingSection ? `- Poprzednia sekcja: ${editContext.precedingSection.substring(0, 200)}...` : ''}
${editContext.followingSection ? `- Następna sekcja: ${editContext.followingSection.substring(0, 200)}...` : ''}
`
        }
      } catch (error) {
        console.log('⚠️ Could not extract context, proceeding without it:', error)
      }
    }

    // Wywołanie odpowiedniej funkcji AI
    let response
    switch (operation) {
      case 'concepts':
        response = await generateConcepts(sectionContent, focusElement, contextInfo)
        break
      case 'questions':
        response = await generateQuestions(sectionContent, focusElement, contextInfo)
        break
      case 'eli5':
        response = await generateELI5(sectionContent, focusElement, contextInfo)
        break
      default:
        return Response.json(
          { error: `Unknown operation: ${operation}` },
          { status: 400 }
        )
    }

    return Response.json(response)

  } catch (error) {
    console.error('❌ Smart Preview API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Pomocnicza funkcja do znajdowania sekcji
function findSectionById(sections: any[], sectionId: string): any {
  for (const section of sections) {
    if (section.id === sectionId) return section
    if (section.children) {
      const found = findSectionById(section.children, sectionId)
      if (found) return found
    }
  }
  return null
}

// Funkcja generująca główne pojęcia
async function generateConcepts(
  sectionContent: string, 
  focusElement?: string, 
  contextInfo?: string
): Promise<any> {
  const prompt = `Przeanalizuj ten fragment tekstu i wyodrębnij kluczowe pojęcia:

${contextInfo}

TEKST DO ANALIZY:
${sectionContent}

${focusElement ? `ELEMENT W FOKUSIE: ${focusElement}` : ''}

Wygeneruj odpowiedź w formacie JSON:
{
  "operation": "concepts",
  "content": {
    "concepts": ["pojęcie 1", "pojęcie 2", "pojęcie 3"],
    "definitions": [
      {"term": "pojęcie 1", "definition": "krótka definicja"},
      {"term": "pojęcie 2", "definition": "krótka definicja"}
    ]
  },
  "relatedElements": ["element1", "element2"],
  "metadata": {
    "confidence": 0.92,
    "sourceLength": ${sectionContent.length},
    "generatedAt": "${new Date().toISOString()}"
  }
}

WYMAGANIA:
- Maksymalnie 5 głównych pojęć
- Definicje w 1-2 zdaniach
- Skupienie na kluczowych terminach, nie oczywistych słowach
- Jeśli focusElement podany, priorytet dla powiązanych pojęć`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Jesteś ekspertem w analizie tekstów akademickich. Wyodrębniasz kluczowe pojęcia i definiujesz je precyzyjnie i zrozumiale. Zawsze odpowiadasz poprawnym JSON.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: { type: "json_object" }
  })

  let content = response.choices[0]?.message?.content || '{}'
  content = content.replace(/```json\s*|\s*```/g, '').trim()
  
  return JSON.parse(content)
}

// Funkcja generująca pytania sprawdzające
async function generateQuestions(
  sectionContent: string, 
  focusElement?: string, 
  contextInfo?: string
): Promise<any> {
  const prompt = `Przygotuj pytania sprawdzające zrozumienie tego tekstu:

${contextInfo}

TEKST DO ANALIZY:
${sectionContent}

${focusElement ? `ELEMENT W FOKUSIE: ${focusElement}` : ''}

Wygeneruj odpowiedź w formacie JSON:
{
  "operation": "questions",
  "content": {
    "questions": [
      {
        "question": "Treść pytania?",
        "type": "comparison|application|analysis|synthesis",
        "difficulty": "basic|medium|advanced",
        "expectedAnswer": "Krótki opis oczekiwanej odpowiedzi"
      }
    ],
    "recommendedTime": "3-5 minut"
  },
  "relatedElements": ["element1"],
  "metadata": {
    "confidence": 0.88,
    "sourceLength": ${sectionContent.length},
    "generatedAt": "${new Date().toISOString()}"
  }
}

WYMAGANIA:
- 3-4 pytania różnej trudności
- Mix typów: porównania, zastosowania, analizy
- Pytania testujące głębokie zrozumienie, nie pamięciowe
- Czas dostosowany do długości tekstu`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system', 
        content: 'Jesteś doświadczonym edukatorem. Tworzysz przemyślane pytania sprawdzające głębokie zrozumienie materiału, nie powierzchowne zapamiętanie. Zawsze odpowiadasz poprawnym JSON.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: "json_object" }
  })

  let content = response.choices[0]?.message?.content || '{}'
  content = content.replace(/```json\s*|\s*```/g, '').trim()
  
  return JSON.parse(content)
}

// Funkcja generująca uproszczoną wersję (ELI5)
async function generateELI5(
  sectionContent: string, 
  focusElement?: string, 
  contextInfo?: string
): Promise<any> {
  const prompt = `Uproszczenie tego tekstu do poziomu zrozumiałego dla każdego:

${contextInfo}

TEKST DO UPROSZCZENIA:
${sectionContent}

${focusElement ? `ELEMENT W FOKUSIE: ${focusElement}` : ''}

Wygeneruj odpowiedź w formacie JSON:
{
  "operation": "eli5",
  "content": {
    "simplifiedText": "Tekst napisany prostym językiem, używający analogii z codziennego życia...",
    "readingLevel": "podstawowy|średni",
    "keyAnalogies": [
      "Analogia 1 - porównanie do czegoś znanego",
      "Analogia 2 - kolejne porównanie"
    ],
    "estimatedReadingTime": "2-3 minuty"
  },
  "relatedElements": ["element1"],
  "metadata": {
    "confidence": 0.90,
    "sourceLength": ${sectionContent.length},
    "generatedAt": "${new Date().toISOString()}"
  }
}

WYMAGANIA:
- Język na poziomie szkoły podstawowej
- Konkretne analogie z życia codziennego  
- Zachowanie wszystkich kluczowych informacji
- Struktura logiczna i przejrzysta
- Maksymalnie 2-3 analogie najważniejsze`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Jesteś ekspertem w komunikacji naukowej. Potrafisz tłumaczyć skomplikowane pojęcia używając prostego języka i analogii z codziennego życia, zachowując przy tym dokładność merytoryczną. Zawsze odpowiadasz poprawnym JSON.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  })

  let content = response.choices[0]?.message?.content || '{}'
  content = content.replace(/```json\s*|\s*```/g, '').trim()
  
  return JSON.parse(content)
}