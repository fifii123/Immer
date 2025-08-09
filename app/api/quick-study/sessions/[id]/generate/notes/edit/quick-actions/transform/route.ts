// app/api/quick-study/sessions/[id]/generate/notes/transform/route.ts
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
      targetFormat,
      domInfo,
      parsedSections,
      fullDocument
    }: {
      operation: 'convert' | 'make-memorable' | 'add-example' | 'simplify-eli5'
      targetFormat?: 'table' | 'list' | 'paragraph' | 'text'
      domInfo: {
        domElementId: string,
        structuralId: string,
        elementType: string,
        content: string
      }
      parsedSections: any[]
      fullDocument?: string
    } = body

    // Walidacja - wszystkie parametry wymagane dla DOM-first
    if (!operation || !domInfo || !parsedSections) {
      return Response.json(
        { error: 'Missing required parameters for DOM-first transformation' },
        { status: 400 }
      )
    }

    // Basic validation - keep it simple for MVP
    if (operation === 'convert' && targetFormat) {
      const contentLength = domInfo.content.trim().length
      if (contentLength < 3) {
        return Response.json({
          error: 'Content too short for transformation'
        }, { status: 400 })
      }
      if (contentLength > 3000) {
        return Response.json({
          error: 'Content too long for this transformation. Please select a smaller section.'
        }, { status: 400 })
      }
    }

    console.log(`🔄 Transform operation: ${operation}${targetFormat ? ` -> ${targetFormat}` : ''} for session ${params.id}`)
    console.log(`📍 Element: ${domInfo.structuralId} (${domInfo.elementType})`)
    console.log(`📊 Content: ${domInfo.content.length} chars`)

    // Extract intelligent context using DOM-first approach (same as edit API)
    const intelligentContext = MinimalContextService.getEditContextFromDOMInfo(
      domInfo,
      parsedSections, 
      fullDocument || ''
    )
    
    console.log('🔍 Transform context extracted:')
    console.log(`   - Fragment: ${intelligentContext.editingContext.fragmentType}`)
    console.log(`   - Detail: ${intelligentContext.editingContext.suggestedDetailLevel}`)
    console.log(`   - Section: "${intelligentContext.fragmentPosition.sectionTitle}"`)

    // Create transformation prompt based on operation
    const transformPrompt = createTransformPrompt(operation, targetFormat, intelligentContext)
    
    // Enhanced system prompt for transformation
    const systemPrompt = `Jesteś CONTENT TRANSFORMER - specjalistą od przekształceń treści akademických.

🧠 CORE MINDSET:
Otrzymujesz fragment tekstu i przekształcasz go DOKŁADNIE zgodnie z poleceniem, zachowując CAŁĄ informację merytoryczną.

🎯 TWOJA MISJA:
- Zachowaj 100% informacji merytorycznej z oryginalnego fragmentu
- Przekształć format/styl zgodnie z poleceniem
- Użyj markdown do formatowania wyniku
- Wynik musi być gotowy do bezpośredniego renderowania

⚠️ ZASADY:
- NIE dodawaj komentarzy typu "Oto przekształcona treść"  
- NIE owijaj w dodatkowe sekcje
- Zwróć TYLKO przekształconą treść
- Zachowaj oryginalny poziom szczegółowości
- Używaj markdown syntax dla formatowania

📝 KONTEKST FRAGMENTU:
${intelligentContext.editingContext.fragmentType === 'paragraph' ? 'Akapit tekstowy' : 
  intelligentContext.editingContext.fragmentType === 'list_item' ? 'Element listy' :
  intelligentContext.editingContext.fragmentType === 'definition' ? 'Definicja' : 'Fragment tekstu'}
${intelligentContext.fragmentPosition.sectionTitle ? `w sekcji "${intelligentContext.fragmentPosition.sectionTitle}"` : ''}`

    console.log('🤖 Calling OpenAI for transformation')

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transformPrompt }
      ],
      temperature: operation === 'convert' ? 0.3 : 0.7, // Lower temp for conversions, higher for creative transforms
      max_tokens: 1500,
    })

    const transformedContent = response.choices[0].message.content || ''
    
    // Determine new content type based on transformation
    const newContentType = determineContentType(transformedContent, targetFormat)
    
    console.log(`✅ Transform complete: ${domInfo.elementType} -> ${newContentType}`)
    console.log(`📏 Output length: ${transformedContent.length} chars`)

    return Response.json({
      success: true,
      transformedContent: transformedContent.trim(),
      newContentType,
      operation,
      targetFormat,
      metadata: {
        originalType: domInfo.elementType,
        originalLength: domInfo.content.length,
        transformedLength: transformedContent.length,
        confidence: 0.95
      }
    })

  } catch (error) {
    console.error('❌ Error in transform API:', error)
    
    return Response.json(
      { 
        error: 'Transform operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper: Create transformation prompt based on operation
function createTransformPrompt(
  operation: string, 
  targetFormat?: string, 
  context?: any
): string {
  const originalContent = context?.editedFragment || ''
  
  switch (operation) {
    case 'convert':
      return createConvertPrompt(targetFormat!, originalContent, context)
    
    case 'make-memorable':
      return `Przekształć poniższą treść tak, aby była łatwiejsza do zapamiętania. Użyj technik mnemonicznych, analogii, lub metafor. Zachowaj całą informację merytoryczną.

ORYGINALNA TREŚĆ:
${originalContent}

Przekształć używając technik pamięciowych - memory palace, akronimy, analogie, rymowanki, itp. Wynik w markdown.`

    case 'add-example':
      return `Rozszerz poniższą treść dodając praktyczny, rzeczywisty przykład. Zachowaj oryginalną treść i dodaj przykład na końcu.

ORYGINALNA TREŚĆ:
${originalContent}

Dodaj sekcję z przykładem zaczynającą się od "**🌟 Przykład:**" lub "**💡 W praktyce:**". Przykład powinien być konkretny i łatwy do zrozumienia.`

    case 'simplify-eli5':
      return `Uprość poniższą treść do poziomu "wyjaśnij jakbym miał 5 lat". Użyj prostego języka, analogii do znanych rzeczy, unikaj żargonu. Zachowaj główne informacje.

ORYGINALNA TREŚĆ:
${originalContent}

Przepisz używając prostego języka, analogii do codziennych rzeczy, krótkich zdań. Zacznij od "**Prosto mówiąc:**"`

    default:
      return `Przekształć następującą treść zgodnie z operacją: ${operation}

TREŚĆ:
${originalContent}`
  }
}

// Helper: Create convert-specific prompts
function createConvertPrompt(targetFormat: string, content: string, context?: any): string {
  const basePrompt = `Przekształć poniższą treść do formatu: ${targetFormat}. Zachowaj CAŁĄ informację merytoryczną.

ORYGINALNA TREŚĆ:
${content}

`

  switch (targetFormat) {
    case 'table':
      return basePrompt + `Stwórz tabelę używając markdown syntax. Przykład:
| Kolumna 1 | Kolumna 2 | Kolumna 3 |
|-----------|-----------|-----------|
| Wartość 1 | Wartość 2 | Wartość 3 |

Przeanalizuj treść i wyodrębnij elementy, które można uporządkować w kolumnach.`

    case 'list':
      return basePrompt + `Przekształć w listę punktową używając markdown:
- Pierwszy punkt
- Drugi punkt  
- Trzeci punkt

Lub numerowaną:
1. Pierwszy element
2. Drugi element
3. Trzeci element

Zachowaj hierarchię informacji.`

    case 'paragraph':
      return basePrompt + `Przekształć w płynny tekst paragrafowy. Połącz informacje w spójne akapity, zachowując logiczny przepływ myśli.`

    case 'text':
      return basePrompt + `Przekształć w bardziej tekstową, płynną formę zachowując walory estetyczne. Zmień strukturalne elementy (listy, tabele) w naturalny tekst, ale zachowaj użyteczne formatowanie.

ZASADY TRANSFORMACJI:
- Listy → płynne zdania z zachowaniem **pogrubień** dla kluczowych punktów
- Tabele → opisowy tekst z wyróżnieniami  
- Nadmierne formatowanie → uporządkuj, ale zostaw estetyczne elementy
- Zachowaj ważne wyróżnienia (**bold**, *italic*) tam gdzie mają sens
- Usuń tylko strukturalne znaczniki (-, |, ###) które przeszkadzają w czytaniu

Cel: Tekst łatwiejszy do czytania, ale nadal estetyczny i dobrze sformatowany.`

    default:
      return basePrompt + `Przekształć do formatu: ${targetFormat}`
  }
}

// Helper: Determine content type after transformation
function determineContentType(content: string, targetFormat?: string): string {
  if (targetFormat) {
    // If explicit target format provided, use it
    switch (targetFormat) {
      case 'table': return 'other' // tables are classified as 'other' in the system
      case 'list': return 'list'
      case 'text': return 'paragraph' // text renders as paragraph
      case 'paragraph': return 'paragraph'
      default: return 'paragraph'
    }
  }
  
  // Auto-detect based on content (same as in handleContentSaved)
  if (content.includes('|') && content.split('\n').filter(line => line.includes('|')).length > 1) return 'other'
  if (/^[\s]*[-*+]\s/.test(content)) return 'list'
  if (/^[\s]*\d+\.\s/.test(content)) return 'list'  
  if (content.startsWith('>')) return 'quote'
  if (content.startsWith('```')) return 'code'
  return 'paragraph'
}