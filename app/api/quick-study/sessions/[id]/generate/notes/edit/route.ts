// app/api/quick-study/sessions/[id]/generate/notes/edit/route.ts
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
      content, 
      context,
      editContext,
      fullDocument,  // LEGACY: full document for intelligent context
      elementId,     // NEW: element ID for precise context
      parsedSections // NEW: parsed sections structure from frontend
    }: {
      operation: 'expand' | 'improve' | 'summarize'
      content: string
      context?: string
      editContext?: any
      fullDocument?: string
      elementId?: string
      parsedSections?: any[]
    } = body

    // Walidacja
    if (!operation || !content) {
      return Response.json(
        { error: 'Missing required parameters: operation, content' },
        { status: 400 }
      )
    }

    console.log(`🔄 Processing ${operation} operation for session ${params.id}`)
    console.log(`📊 Enhanced AI mode: ${elementId && parsedSections ? 'ID_BASED' : fullDocument ? 'INTELLIGENT' : editContext ? 'CONTEXTUAL' : context ? 'BASIC' : 'LEGACY'}`)

    let userPrompt: string
    let systemPrompt: string
    let contextInfo: any = { mode: 'legacy' }

    // NEW: ID-based intelligent context (most reliable)
    if (elementId && parsedSections && Array.isArray(parsedSections)) {
      console.log('🎯 Using ID-based intelligent processing (most reliable)')
      
      try {
        // Extract context using element ID and parsed structure
        const intelligentContext = MinimalContextService.getEditContextByElementId(
          elementId, 
          parsedSections, 
          fullDocument || ''
        )
        
        // Create intelligent prompt
        userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
        
        // Enhanced system prompt for invisible editing
        systemPrompt = `Jesteś SEAMLESS CONTINUATION ENGINE - inteligentnym autocomplete dla dokumentów.

🧠 CORE MINDSET:
Nie jesteś "domain expertem" ani "tutorialem" - jesteś niewidzialnym łącznikiem między fragmentami tekstu.

🎯 TWOJA MISJA:
Myślisz TYLKO: "Jak gładko przejść z tego co jest PRZED do tego co jest POTEM?"
NIE myślisz: "Co wiem o tym temacie?"

🔍 POZYCYJNA ŚWIADOMOŚĆ:
- Fragment type: ${intelligentContext.editingContext.fragmentType}
- Detail level: ${intelligentContext.editingContext.suggestedDetailLevel}  
- Style context: ${intelligentContext.editingContext.styleContext.toneLevel}
- Mathematical content: ${intelligentContext.editingContext.styleContext.isMathematical}

📝 FORMATOWANIE (gdy potrzebne):
- **pogrubienie** dla kluczowych terminów
- *kursywa* dla podkreśleń
- $LaTeX$ dla wzorów matematycznych
- Listy (-) i numerowanie (1.) gdy naturalne
- Bloki cytat (>) dla definicji

🚫 ABSOLUTE NEVER LIST:
- Tytuły/nagłówki (jeśli nie edytujesz nagłówka)
- "W tej sekcji", "Oto wyjaśnienie", "Podsumowując"
- Duplikowanie treści z kontekstu
- Ignorowanie tego co jest bezpośrednio PRZED i POTEM
- Tworzenie treści "od zera" zamiast kontynuacji

🎯 SUCCESS METRIC:
Czytelnik nie może rozpoznać gdzie kończy się oryginał a zaczyna Twoja edycja.

Odpowiadaj TYLKO przepracowanym fragmentem, bez meta-komentarzy.`

        contextInfo = {
          mode: 'id_based',
          elementId: elementId,
          fragmentType: intelligentContext.editingContext.fragmentType,
          detailLevel: intelligentContext.editingContext.suggestedDetailLevel,
          styleContext: intelligentContext.editingContext.styleContext
        }

        console.log(`📋 ID-based context info:`)
        console.log(`   - Element ID: ${elementId}`)
        console.log(`   - Fragment: ${intelligentContext.editingContext.fragmentType}`)
        console.log(`   - Detail: ${intelligentContext.editingContext.suggestedDetailLevel}`)
        console.log(`   - Style: ${intelligentContext.editingContext.styleContext.toneLevel}`)
        console.log(`   - Math: ${intelligentContext.editingContext.styleContext.isMathematical}`)
        console.log(`   - Max header level: ${intelligentContext.editingContext.structuralConstraints.maxHeaderLevel}`)
        
        // NEW: Log the complete prompt being sent to AI
        console.log('🔍 COMPLETE PROMPT BEING SENT TO AI (ID-BASED):')
        console.log('='.repeat(80))
        console.log('SYSTEM PROMPT:')
        console.log(systemPrompt)
        console.log('='.repeat(80))
        console.log('USER PROMPT:')
        console.log(userPrompt)
        console.log('='.repeat(80))
        
      } catch (error) {
        console.error('❌ Failed to extract ID-based context:', error)
        // Fallback to text-based intelligent mode
        if (fullDocument) {
          console.log('🔄 Falling back to text-based intelligent mode')
          try {
            const intelligentContext = MinimalContextService.getEditContext(content, fullDocument)
            userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
            contextInfo = { mode: 'intelligent_fallback', fragmentType: intelligentContext.editingContext.fragmentType }
          } catch (textError) {
            console.log('🔄 Falling back to basic mode')
            userPrompt = getBasicPrompt(operation, content, context)
            contextInfo = { mode: 'basic_fallback' }
          }
        } else {
          console.log('🔄 Falling back to basic mode')
          userPrompt = getBasicPrompt(operation, content, context)
          contextInfo = { mode: 'basic_fallback' }
        }
        
        systemPrompt = getBasicSystemPrompt()
      }
    }
    // FALLBACK: Text-based intelligent context
    else if (fullDocument) {
      console.log('🧠 Using intelligent document-aware editing')
      
      try {
        // Extract intelligent context
        const intelligentContext = MinimalContextService.getEditContext(content, fullDocument)
        
        // Create intelligent prompt
        userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
        
        // Enhanced system prompt for invisible editing
        systemPrompt = `Jesteś SEAMLESS CONTINUATION ENGINE - inteligentnym autocomplete dla dokumentów.

🧠 CORE MINDSET:
Nie jesteś "domain expertem" ani "tutorialem" - jesteś niewidzialnym łącznikiem między fragmentami tekstu.

🎯 TWOJA MISJA:
Myślisz TYLKO: "Jak gładko przejść z tego co jest PRZED do tego co jest POTEM?"
NIE myślisz: "Co wiem o tym temacie?"

🔍 POZYCYJNA ŚWIADOMOŚĆ:
- Fragment type: ${intelligentContext.editingContext.fragmentType}
- Detail level: ${intelligentContext.editingContext.suggestedDetailLevel}  
- Style context: ${intelligentContext.editingContext.styleContext.toneLevel}
- Mathematical content: ${intelligentContext.editingContext.styleContext.isMathematical}

📝 FORMATOWANIE (gdy potrzebne):
- **pogrubienie** dla kluczowych terminów
- *kursywa* dla podkreśleń
- $LaTeX$ dla wzorów matematycznych
- Listy (-) i numerowanie (1.) gdy naturalne
- Bloki cytat (>) dla definicji

🚫 ABSOLUTE NEVER LIST:
- Tytuły/nagłówki (jeśli nie edytujesz nagłówka)
- "W tej sekcji", "Oto wyjaśnienie", "Podsumowując"
- Duplikowanie treści z kontekstu
- Ignorowanie tego co jest bezpośrednio PRZED i POTEM
- Tworzenie treści "od zera" zamiast kontynuacji

🎯 SUCCESS METRIC:
Czytelnik nie może rozpoznać gdzie kończy się oryginał a zaczyna Twoja edycja.

Odpowiadaj TYLKO przepracowanym fragmentem, bez meta-komentarzy.`

        contextInfo = {
          mode: 'intelligent',
          fragmentType: intelligentContext.editingContext.fragmentType,
          detailLevel: intelligentContext.editingContext.suggestedDetailLevel,
          styleContext: intelligentContext.editingContext.styleContext
        }

        console.log(`📋 Intelligent context info:`)
        console.log(`   - Fragment: ${intelligentContext.editingContext.fragmentType}`)
        console.log(`   - Detail: ${intelligentContext.editingContext.suggestedDetailLevel}`)
        console.log(`   - Style: ${intelligentContext.editingContext.styleContext.toneLevel}`)
        console.log(`   - Math: ${intelligentContext.editingContext.styleContext.isMathematical}`)
        console.log(`   - Max header level: ${intelligentContext.editingContext.structuralConstraints.maxHeaderLevel}`)
        
        // NEW: Log the complete prompt being sent to AI
        console.log('🔍 COMPLETE PROMPT BEING SENT TO AI:')
        console.log('='.repeat(80))
        console.log('SYSTEM PROMPT:')
        console.log(systemPrompt)
        console.log('='.repeat(80))
        console.log('USER PROMPT:')
        console.log(userPrompt)
        console.log('='.repeat(80))
        
      } catch (error) {
        console.error('❌ Failed to extract intelligent context:', error)
        // Fallback to contextual mode
        if (editContext) {
          console.log('🔄 Falling back to contextual mode')
          userPrompt = MinimalContextService.createContextualPrompt(operation, editContext)
          contextInfo = { mode: 'contextual_fallback', section: editContext.fragmentPosition?.sectionTitle }
        } else {
          console.log('🔄 Falling back to basic mode')
          userPrompt = getBasicPrompt(operation, content, context)
          contextInfo = { mode: 'basic_fallback' }
        }
        
        systemPrompt = getBasicSystemPrompt()
      }
    } 
    // FALLBACK: Contextual editing (existing system)
    else if (editContext) {
      console.log('🎯 Using contextual prompt with document awareness')
      userPrompt = MinimalContextService.createContextualPrompt(operation, editContext)
      systemPrompt = getBasicSystemPrompt()
      contextInfo = { 
        mode: 'contextual', 
        section: editContext.fragmentPosition?.sectionTitle,
        level: editContext.fragmentPosition?.sectionLevel,
        positionInDoc: `${editContext.fragmentPosition?.indexInDocument + 1}/${editContext.fragmentPosition?.totalSections}`,
        positionInSection: `${editContext.fragmentPositionInSection?.percentPosition}%`
      }
      
      console.log('📋 Context info:', contextInfo)
    } 
    // LEGACY: Basic prompts
    else {
      console.log('⚡ Using basic prompt (legacy mode)')
      userPrompt = getBasicPrompt(operation, content, context)
      systemPrompt = getBasicSystemPrompt()
      contextInfo = { mode: 'basic' }
    }

    // CREATE STREAMING RESPONSE (RESTORED ORIGINAL FUNCTIONALITY)
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
          })

          let fullResponse = ''

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            
            if (content) {
              fullResponse += content
              
              const data = JSON.stringify({ 
                type: 'chunk', 
                content: content,
                operation: operation
              })
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
            }
          }

          // Zakończenie z dodatkowymi informacjami kontekstowymi
          const completeData = JSON.stringify({ 
            type: 'complete', 
            fullContent: fullResponse,
            operation: operation,
            contextInfo: contextInfo  // NEW: Include context info for debugging
          })
          controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`))
          controller.close()

          console.log(`✅ ${operation} operation completed successfully (${contextInfo.mode} mode)`)

        } catch (error) {
          console.error('❌ Error in edit operation:', error)
          
          const errorData = JSON.stringify({ 
            type: 'error', 
            message: 'Failed to process content',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('❌ Error in edit endpoint:', error)
    
    return Response.json(
      { error: 'Edit operation failed' },
      { status: 500 }
    )
  }
}

// HELPER: Basic system prompt for fallback modes
function getBasicSystemPrompt(): string {
  return `Jesteś ekspertem w przetwarzaniu treści edukacyjnych. 
Wykonuj operacje precyzyjnie, zachowując akademicki poziom i używając formatowania Markdown.

FORMATOWANIE:
- Używaj **pogrubienia** dla kluczowych terminów
- Używaj *kursywy* dla podkreśleń  
- Używaj nagłówków ## i ### dla struktury
- Używaj list punktowanych (-) i numerowanych (1.)
- Używaj \`kod\` dla terminów technicznych
- Używaj > dla cytatów i definicji

Odpowiadaj zawsze w języku polskim.`
}

// HELPER: Basic prompts for legacy mode (RESTORED FROM ORIGINAL)
function getBasicPrompt(operation: 'expand' | 'improve' | 'summarize', content: string, context?: string): string {
  const baseContext = context ? `\n\nKONTEKST:\n${context}` : ''
  
  switch (operation) {
    case 'expand':
      return `Rozwiń poniższy fragment tekstu, dodając więcej szczegółów, przykładów i wyjaśnień. Zachowaj oryginalny ton i styl.

FRAGMENT DO ROZSZERZENIA:
${content}${baseContext}

Instrukcje:
1. Znacząco zwiększ objętość treści
2. Dodaj praktyczne przykłady i wyjaśnienia
3. Zachowaj merytoryczny charakter
4. Użyj formatowania markdown dla lepszej czytelności
5. Nie zmieniaj głównego tematu ani stylu`

    case 'improve':
      return `Popraw poniższy fragment tekstu pod kątem jasności, stylu i struktury. Zachowaj wszystkie kluczowe informacje.

FRAGMENT DO POPRAWY:
${content}${baseContext}

Instrukcje:
1. Popraw czytelność i płynność tekstu
2. Wzmocnij najważniejsze punkty
3. Usuń redundancję zachowując pełną treść
4. Użyj lepszego formatowania markdown
5. Zachowaj oryginalny ton i poziom szczegółowości`

    case 'summarize':
      return `Podsumuj poniższy fragment tekstu, zachowując wszystkie najważniejsze informacje w zwięzłej formie.

FRAGMENT DO PODSUMOWANIA:
${content}${baseContext}

Instrukcje:
1. Zachowaj wszystkie kluczowe informacje i pojęcia
2. Usuń szczegóły drugorzędne i powtórzenia
3. Skondensuj treść do 60-80% oryginalnej długości
4. Zachowaj logiczną strukturę i argumentację
5. Użyj zwięzłego ale czytelnego formatowania markdown`

    default:
      return `Przetwórz poniższy fragment tekstu zgodnie z operacją "${operation}":

FRAGMENT:
${content}${baseContext}`
  }
}