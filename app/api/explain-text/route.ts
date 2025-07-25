import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { selectedText, context } = await request.json();
    
    if (!selectedText?.trim()) {
      return NextResponse.json(
        { error: 'Selected text is required' },
        { status: 400 }
      );
    }
    
    const prompt = buildExplanationPrompt(selectedText, context);
    
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Jesteś pomocniczym asystentem nauki. Analizujesz kontekst i dajesz krótkie wyjaśnienie, ale NIE wspominasz o analizie kontekstu.

ZASADY:
- Przeanalizuj otaczający tekst (w myślach) żeby zrozumieć dziedzinę
- Wyjaśnij zaznaczony tekst zgodnie z tą dziedziną
- Maksymalnie 2-3 zdania, idź prosto do sedna
- Zacznij od definicji, nie od "w kontekście", "odnosi się do"

ZAKAZANE FRAZY:
- "w kontekście"
- "odnosi się do"  
- "zaznaczony tekst"
- "na podstawie kontekstu"

PRZYKŁAD DOBREJ ODPOWIEDZI:
"Gradient to wektor wskazujący kierunek najszybszego wzrostu funkcji. W uczeniu maszynowym służy do optymalizacji wag poprzez aktualizację w kierunku przeciwnym do gradientu."

PRZYKŁAD ZŁEJ ODPOWIEDZI:
"Zaznaczony tekst 'gradient' w kontekście uczenia maszynowego odnosi się do..."`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 250,
      stream: true
    });
    
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('ExplainText error:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}

function buildExplanationPrompt(selectedText: string, context: string): string {
  return `Wyjaśnij: "${selectedText}"

${context ? `Otaczający tekst:\n"${context}"\n` : ''}

Przeanalizuj otaczający tekst i wyjaśnij zgodnie z dziedziną. Zacznij od definicji, nie wspominaj o kontekście w odpowiedzi. Maksymalnie 2-3 zdania.`;
}