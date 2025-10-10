// app/services/AIOperationsService.ts
import { Source } from '@/types'
import { QuickStudyTextService } from './QuickStudyTextService'

export type AIOperationType = 'expand' | 'improve' | 'simplify' | 'summarize' | 'explain' | 'analyze'

export interface AIOperationRequest {
  operation: AIOperationType
  content: string
  context?: string
  source?: Source
  elementType?: string
}

export interface AIOperationResponse {
  content: string
  operation: AIOperationType
  originalContent: string
}

export class AIOperationsService {
  private static getOperationPrompt(operation: AIOperationType, content: string, context?: string): string {
    const baseContext = context ? `\n\nKONTEKST:\n${context}` : ''
    
    switch (operation) {
      case 'expand':
        return `Rozwiń poniższy fragment tekstu, dodając więcej szczegółów, przykładów i wyjaśnień. Zachowaj oryginalny ton i styl.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Dodaj konkretne przykłady i szczegóły
- Wyjaśnij kluczowe koncepcje głębiej
- Zachowaj spójność z oryginalnym tekstem
- Użyj formatowania Markdown dla lepszej czytelności
- Rozwiń każdy punkt o dodatkowe informacje`

      case 'improve':
        return `Ulepsz poniższy fragment tekstu, poprawiając jego klarowność, precyzję i jakość przekazu.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Popraw jasność i precyzję wyrażania
- Zoptymalizuj strukturę i przepływ tekstu
- Usuń redundancje i niepotrzebne słowa
- Wzmocnij kluczowe punkty
- Zachowaj oryginalny sens i intencję`

      case 'simplify':
        return `Uprość poniższy fragment tekstu, czyniąc go bardziej przystępnym i łatwym do zrozumienia.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Użyj prostszego języka i krótszych zdań
- Wyjaśnij trudne terminy
- Rozbij złożone koncepcje na prostsze części
- Zachowaj wszystkie kluczowe informacje
- Dodaj przykłady ułatwiające zrozumienie`

      case 'summarize':
        return `Streszczaj poniższy fragment tekstu, wydobywając najważniejsze informacje.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Wyodrębnij kluczowe punkty i główne idee
- Zachowaj logiczną strukturę
- Usuń szczegóły drugorzędne
- Użyj zwięzłego języka
- Zachowaj wszystkie istotne informacje`

      case 'explain':
        return `Wyjaśnij szczegółowo poniższy fragment tekstu, dodając definicje i kontekst.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Wyjaśnij wszystkie ważne terminy i koncepcje
- Dodaj kontekst historyczny lub teoretyczny gdzie to możliwe
- Użyj analogii i przykładów
- Przedstaw informacje w logicznej kolejności
- Czyń tekst dostępnym dla osób uczących się tematu`

      case 'analyze':
        return `Przeanalizuj poniższy fragment tekstu, identyfikując kluczowe elementy i wzorce.

ORYGINALNY TEKST:
${content}${baseContext}

INSTRUKCJE:
- Zidentyfikuj główne argumenty i tezy
- Oceń struktrę i logikę tekstu
- Wskaż mocne i słabe strony prezentacji
- Wyodrębnij kluczowe terminy i koncepcje
- Przedstaw krytyczną ocenę treści`

      default:
        return `Przetworz poniższy tekst zgodnie z operacją: ${operation}

TEKST:
${content}${baseContext}`
    }
  }

  static async processContent(request: AIOperationRequest): Promise<ReadableStream<Uint8Array>> {
    const { operation, content, context, source } = request

    // Przygotuj prompt dla danej operacji
    const prompt = this.getOperationPrompt(operation, content, context)
    
    // Przygotuj kontekst źródłowy jeśli dostępny
    let enhancedContext = context || ''
    if (source) {
      try {
        const textResult = QuickStudyTextService.getProcessingText(source, 'chat')
        enhancedContext += `\n\nMATERIAŁ ŹRÓDŁOWY: ${source.name}\n---\n${textResult.text.slice(0, 2000)}...\n---`
      } catch (error) {
        console.warn('Could not get source context:', error)
      }
    }

    const systemPrompt = `Jesteś ekspertem w przetwarzaniu i ulepszaniu treści edukacyjnych. 
Wykonuj operacje precyzyjnie zgodnie z instrukcjami, zachowując akademicki poziom i używając formatowania Markdown.

FORMATOWANIE:
- Używaj **pogrubienia** dla kluczowych terminów
- Używaj *kursywy* dla podkreśleń  
- Używaj nagłówków ## i ### dla struktury
- Używaj list punktowanych (-) i numerowanych (1.)
- Używaj \`kod\` dla terminów technicznych
- Używaj > dla cytatów i definicji
- Używaj tabel gdy to możliwe

Odpowiadaj zawsze w języku polskim.`

    // Tworzenie streamu odpowiedzi
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 2000,
              stream: true
            })
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response stream available')
          }

          let fullResponse = ''

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                
                if (data === '[DONE]') {
                  // Wyślij sygnał zakończenia
                  const completeData = JSON.stringify({ 
                    type: 'complete', 
                    fullContent: fullResponse,
                    operation: operation,
                    originalContent: content
                  })
                  controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  
                  if (content) {
                    fullResponse += content
                    
                    // Wyślij chunk do klienta
                    const chunkData = JSON.stringify({ 
                      type: 'chunk', 
                      content: content,
                      operation: operation
                    })
                    controller.enqueue(new TextEncoder().encode(`data: ${chunkData}\n\n`))
                  }
                } catch (parseError) {
                  // Ignoruj błędy parsowania - mogą wystąpić przy niepełnych chunkach
                  continue
                }
              }
            }
          }

        } catch (error) {
          console.error('❌ Error in AI operations stream:', error)
          
          const errorData = JSON.stringify({ 
            type: 'error', 
            message: 'Failed to process content',
            details: error instanceof Error ? error.message : 'Unknown error',
            operation: operation
          })
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return stream
  }
}