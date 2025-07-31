// app/api/quick-study/sessions/[id]/generate/notes/edit/route.ts
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'


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
  context 
}: {
  operation: 'expand' | 'improve' | 'summarize'
  content: string
  context?: string
} = body

    // Walidacja
    if (!operation || !content) {
      return Response.json(
        { error: 'Missing required parameters: operation, content' },
        { status: 400 }
      )
    }

    console.log(`🔄 Processing ${operation} operation for session ${params.id}`)

    // Przygotuj prompt w zależności od operacji
    const systemPrompt = `Jesteś ekspertem w przetwarzaniu treści edukacyjnych. 
Wykonuj operacje precyzyjnie, zachowując akademicki poziom i używając formatowania Markdown.

FORMATOWANIE:
- Używaj **pogrubienia** dla kluczowych terminów
- Używaj *kursywy* dla podkreśleń  
- Używaj nagłówków ## i ### dla struktury
- Używaj list punktowanych (-) i numerowanych (1.)
- Używaj \`kod\` dla terminów technicznych
- Używaj > dla cytatów i definicji

Odpowiadaj zawsze w języku polskim.`

    let userPrompt = ''
    
    switch (operation) {
      case 'expand':
        userPrompt = `Rozwiń poniższy fragment tekstu, dodając więcej szczegółów, przykładów i wyjaśnień. Zachowaj oryginalny ton i styl.

ORYGINALNY TEKST:
${content}

${context ? `\nKONTEKST:\n${context}` : ''}

INSTRUKCJE:
- Dodaj konkretne przykłady i szczegóły
- Wyjaśnij kluczowe koncepcje głębiej
- Zachowaj spójność z oryginalnym tekstem
- Użyj formatowania Markdown dla lepszej czytelności
- Rozwiń każdy punkt o dodatkowe informacje`
        break

case 'improve':
  userPrompt = `Ulepsz prezentację poniższego fragmentu tekstu, skupiając się na lepszym formatowaniu i strukturze. Możesz też delikatnie poprawić treść, ale główny fokus ma być na prezentacji.

ORYGINALNY TEKST:
${content}

${context ? `\nKONTEKST:\n${context}` : ''}

INSTRUKCJE:
- Użyj formatowania Markdown: **pogrubienie** dla kluczowych terminów, *kursywa* dla podkreśleń
- Dodaj nagłówki ## i ### dla lepszej struktury
- Przekształć w listy punktowane (-) lub numerowane (1.) gdzie to sensowne  
- Użyj \`kod\` dla terminów technicznych
- Użyj > dla cytatów i definicji
- Popraw klarowność i precyzję bez dodawania zbędnej treści
- Zachowaj oryginalny sens i długość, ale uczyń prezentację bardziej profesjonalną`
        break

case 'summarize':
  userPrompt = `Streszczaj poniższy fragment tekstu, wydobywając najważniejsze informacje.

ORYGINALNY TEKST:
${content}

${context ? `\nKONTEKST:\n${context}` : ''}

INSTRUKCJE:
- Wyodrębnij kluczowe punkty i główne idee
- Zachowaj logiczną strukturę
- Usuń szczegóły drugorzędne
- Użyj zwięzłego języka
- Zachowaj wszystkie istotne informacje`
        break

      default:
        return Response.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        )
    }
    // Stwórz streaming response
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

          // Zakończenie
          const completeData = JSON.stringify({ 
            type: 'complete', 
            fullContent: fullResponse,
            operation: operation
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