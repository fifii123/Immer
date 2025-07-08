import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { selectedText, context } = await request.json();
    
    // Podstawowa walidacja
    if (!selectedText?.trim()) {
      return NextResponse.json(
        { error: 'Selected text is required' },
        { status: 400 }
      );
    }
    
    // Prosty, uniwersalny prompt
    const prompt = buildExplanationPrompt(selectedText, context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
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
      max_tokens: 330
    });
    
    const explanation = response.choices[0].message.content;
    
    console.log(`Explained: "${selectedText.substring(0, 50)}..."`);
    
    return NextResponse.json({
      success: true,
      explanation,
      selectedText
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