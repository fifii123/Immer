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
      elementId,     // LEGACY: element ID for precise context
      parsedSections, // LEGACY: parsed sections structure from frontend
      domInfo,       // NEW: frontend-prepared DOM info
      useDOMFirst    // NEW: flag for DOM-first processing
    }: {
      operation: 'expand' | 'improve' | 'summarize'
      content: string
      context?: string
      editContext?: any
      fullDocument?: string
      elementId?: string
      parsedSections?: any[]
      domInfo?: {
        domElementId: string,
        structuralId: string,
        elementType: string,
        content: string
      } | null
      useDOMFirst?: boolean
    } = body

    // Walidacja
    if (!operation || !content) {
      return Response.json(
        { error: 'Missing required parameters: operation, content' },
        { status: 400 }
      )
    }

    console.log(`🔄 Processing ${operation} operation for session ${params.id}`)
    console.log(`📊 Enhanced AI mode: ${useDOMFirst && domInfo ? 'DOM_FIRST' : elementId && parsedSections ? 'ID_BASED' : fullDocument ? 'INTELLIGENT' : editContext ? 'CONTEXTUAL' : context ? 'BASIC' : 'LEGACY'}`)

    let userPrompt: string
    let systemPrompt: string
    let contextInfo: any = { mode: 'legacy' }

    // NEW: DOM-first with frontend-prepared data (most reliable)
   // NEW: DOM-first with frontend-prepared data (most reliable)
if (useDOMFirst && domInfo && parsedSections) {
  console.log('🎯 Using DOM-first with frontend-prepared data (no server DOM needed)')
  console.log('📍 ELEMENT DETAILS:')
  console.log(`   - DOM Element ID: ${domInfo.domElementId}`)
  console.log(`   - Structural ID: ${domInfo.structuralId}`)
  console.log(`   - Element Type: ${domInfo.elementType}`)
  console.log(`   - Content Length: ${domInfo.content.length} chars`)
  console.log(`   - Content Preview: "${domInfo.content.substring(0, 100)}${domInfo.content.length > 100 ? '...' : ''}"`)
  console.log(`   - Parsed Sections Count: ${parsedSections.length}`)
  console.log(`   - Full Document Length: ${fullDocument?.length || 0} chars`)
  
  try {
    // Use frontend-prepared DOM info (no document.querySelector needed)
    const intelligentContext = MinimalContextService.getEditContextFromDOMInfo(
      domInfo,  // Frontend-prepared DOM info
      parsedSections, 
      fullDocument || ''
    )
    
    console.log('🔍 CONTEXT EXTRACTED:')
    console.log(`   - Fragment Type: ${intelligentContext.editingContext.fragmentType}`)
    console.log(`   - Detail Level: ${intelligentContext.editingContext.suggestedDetailLevel}`)
    console.log(`   - Section: "${intelligentContext.fragmentPosition.sectionTitle}"`)
    console.log(`   - Position in Section: ${intelligentContext.fragmentPositionInSection.paragraphIndex + 1}/${intelligentContext.fragmentPositionInSection.totalParagraphs}`)
    console.log(`   - Before Content: ${intelligentContext.fragmentPositionInSection.beforeFragment ? 'YES' : 'NO'}`)
    console.log(`   - After Content: ${intelligentContext.fragmentPositionInSection.afterFragment ? 'YES' : 'NO'}`)
    

        
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
- Listy (-) i numerowanie (1.)

🚫 ZABRONIONE:
- "Oto rozwinięcie..." / "Here's an expansion..."
- "W kontekście tego tematu..." / "In the context of..."
- "Warto dodać, że..." / "It's worth adding..."
- "Możemy również..." / "We can also..."
- Wprowadzenia i podsumowania
- Meta-komentarze o tym co robisz

✅ WYMAGANE:
- Bezpośrednie wejście w treść
- Płynne przejście z poprzedniego fragmentu
- Naturalne prowadzenie do następnego fragmentu
- Dokładnie ten sam styl i ton co otaczający tekst`
        
        contextInfo = { 
          mode: 'dom_first_universal', 
          fragmentType: intelligentContext.editingContext.fragmentType,
          detailLevel: intelligentContext.editingContext.suggestedDetailLevel
        }
        
      } catch (error) {
        console.error('❌ Failed to extract DOM-first context:', error)
        
        // Fallback to legacy ID-based mode
        if (elementId && parsedSections) {
          console.log('🔄 Falling back to legacy ID-based mode')
          try {
            const intelligentContext = MinimalContextService.getEditContextByElementId(
              elementId, 
              parsedSections, 
              fullDocument || ''
            )
            userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
            systemPrompt = getEnhancedSystemPrompt()
            contextInfo = { mode: 'id_based_fallback', fragmentType: intelligentContext.editingContext.fragmentType }
          } catch (idError) {
            console.log('🔄 Falling back to text-based mode')
            userPrompt = getBasicPrompt(operation, content, context)
            systemPrompt = getBasicSystemPrompt()
            contextInfo = { mode: 'basic_fallback' }
          }
        } else {
          console.log('🔄 Falling back to basic mode')
          userPrompt = getBasicPrompt(operation, content, context)
          systemPrompt = getBasicSystemPrompt()
          contextInfo = { mode: 'basic_fallback' }
        }
      }
    }
    // LEGACY: ID-based intelligent context (may fail with document error)
    else if (elementId && parsedSections && Array.isArray(parsedSections)) {
      console.log('🎯 Using LEGACY ID-based intelligent processing (may fail)')
      
      try {
        // This will likely fail because it tries to access document on server
        const intelligentContext = MinimalContextService.getEditContextByElementId(
          elementId, 
          parsedSections, 
          fullDocument || ''
        )
        
        userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
        systemPrompt = getEnhancedSystemPrompt()
        contextInfo = { 
          mode: 'id_based_legacy', 
          fragmentType: intelligentContext.editingContext.fragmentType,
          detailLevel: intelligentContext.editingContext.suggestedDetailLevel
        }
        
      } catch (error) {
        console.error('❌ Failed to extract legacy ID-based context:', error)
        
        // Fallback to text-based intelligent mode
        if (fullDocument) {
          console.log('🔄 Falling back to text-based intelligent mode')
          try {
            const intelligentContext = MinimalContextService.getEditContext(content, fullDocument)
            userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
            systemPrompt = getEnhancedSystemPrompt()
            contextInfo = { mode: 'intelligent_fallback', fragmentType: intelligentContext.editingContext.fragmentType }
          } catch (textError) {
            console.log('🔄 Falling back to basic mode')
            userPrompt = getBasicPrompt(operation, content, context)
            systemPrompt = getBasicSystemPrompt()
            contextInfo = { mode: 'basic_fallback' }
          }
        } else {
          console.log('🔄 Falling back to basic mode')
          userPrompt = getBasicPrompt(operation, content, context)
          systemPrompt = getBasicSystemPrompt()
          contextInfo = { mode: 'basic_fallback' }
        }
      }
    }
    // LEGACY: Text-based intelligent context
    else if (fullDocument) {
      console.log('🧠 Using intelligent document-aware editing')
      
      try {
        // Extract intelligent context
        const intelligentContext = MinimalContextService.getEditContext(content, fullDocument)
        
        // Create intelligent prompt
        userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
        
        // Enhanced system prompt for invisible editing
        systemPrompt = getEnhancedSystemPrompt()

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
        
      } catch (error) {
        console.error('❌ Failed to extract intelligent context:', error)
        // Fallback to contextual mode
        if (editContext) {
          console.log('🔄 Falling back to contextual mode')
          userPrompt = MinimalContextService.createIntelligentPrompt(operation, editContext)
          contextInfo = { mode: 'contextual_fallback', section: editContext.fragmentPosition?.sectionTitle }
        } else {
          console.log('🔄 Falling back to basic mode')
          userPrompt = getBasicPrompt(operation, content, context)
          contextInfo = { mode: 'basic_fallback' }
        }
        
        systemPrompt = getBasicSystemPrompt()
      }
    } 
    // LEGACY: Contextual editing (existing system)
    else if (editContext) {
      console.log('🎯 Using contextual prompt with document awareness')
      userPrompt = MinimalContextService.createIntelligentPrompt(operation, editContext)
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

    // CREATE STREAMING RESPONSE
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
            contextInfo: contextInfo  // Include context info for debugging
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

// HELPER: Enhanced system prompt for intelligent modes
function getEnhancedSystemPrompt(): string {
  return `Jesteś SEAMLESS CONTINUATION ENGINE - inteligentnym autocomplete dla dokumentów.

🧠 CORE MINDSET:
Nie jesteś "domain expertem" ani "tutorialem" - jesteś niewidzialnym łącznikiem między fragmentami tekstu.

🎯 TWOJA MISJA:
Myślisz TYLKO: "Jak gładko przejść z tego co jest PRZED do tego co jest POTEM?"
NIE myślisz: "Co wiem o tym temacie?"

🚫 ZABRONIONE:
- "Oto rozwinięcie..." / "Here's an expansion..."
- "W kontekście tego tematu..." / "In the context of..."
- "Warto dodać, że..." / "It's worth adding..."
- "Możemy również..." / "We can also..."
- Wprowadzenia i podsumowania
- Meta-komentarze o tym co robisz

✅ WYMAGANE:
- Bezpośrednie wejście w treść
- Płynne przejście z poprzedniego fragmentu
- Naturalne prowadzenie do następnego fragmentu
- Dokładnie ten sam styl i ton co otaczający tekst`
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

// HELPER: Basic prompts for legacy mode
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