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
      parsedSections,
      domInfo,
      fullDocument
    }: {
      operation: 'expand' | 'improve' | 'summarize'
      content: string
      parsedSections: any[]
      domInfo: {
        domElementId: string,
        structuralId: string,
        elementType: string,
        content: string
      }
      fullDocument?: string
    } = body

    // Walidacja - wszystkie parametry wymagane dla DOM-first
    if (!operation || !content || !domInfo || !parsedSections) {
      return Response.json(
        { error: 'Missing required parameters for DOM-first editing' },
        { status: 400 }
      )
    }

    console.log(`🎯 DOM-first editing: ${operation} operation for session ${params.id}`)
    console.log(`📍 Element: ${domInfo.structuralId} (${domInfo.elementType})`)
    console.log(`📊 Content: ${domInfo.content.length} chars`)
    console.log(`📚 Document: ${parsedSections.length} sections`)

    // Extract intelligent context using DOM-first approach
    const intelligentContext = MinimalContextService.getEditContextFromDOMInfo(
      domInfo,
      parsedSections, 
      fullDocument || ''
    )
    
    console.log('🔍 Context extracted:')
    console.log(`   - Fragment: ${intelligentContext.editingContext.fragmentType}`)
    console.log(`   - Detail: ${intelligentContext.editingContext.suggestedDetailLevel}`)
    console.log(`   - Section: "${intelligentContext.fragmentPosition.sectionTitle}"`)
    console.log(`   - Position: ${intelligentContext.fragmentPositionInSection.paragraphIndex + 1}/${intelligentContext.fragmentPositionInSection.totalParagraphs}`)

    // Create intelligent prompt
    const userPrompt = MinimalContextService.createIntelligentPrompt(operation, intelligentContext)
    
    // Enhanced system prompt for seamless editing
    const systemPrompt = `Jesteś SEAMLESS CONTINUATION ENGINE - inteligentnym autocomplete dla dokumentów.

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

    // Create streaming response
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

          // Completion with context info
          const completeData = JSON.stringify({ 
            type: 'complete', 
            fullContent: fullResponse,
            operation: operation,
            contextInfo: {
              mode: 'dom_first_clean',
              fragmentType: intelligentContext.editingContext.fragmentType,
              detailLevel: intelligentContext.editingContext.suggestedDetailLevel
            }
          })
          controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`))
          controller.close()

          console.log(`✅ ${operation} operation completed successfully`)

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