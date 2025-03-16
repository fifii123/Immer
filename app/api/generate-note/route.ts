// File: /app/api/generate-note/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileId, fileName, projectId, totalPages, pdfContent } = body;
    
    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: fileId i fileName są wymagane' },
        { status: 400 }
      );
    }

    // Sprawdź, czy mamy treść PDF do analizy
    if (!pdfContent || pdfContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brak treści PDF do analizy' },
        { status: 400 }
      );
    }

    // Wywołanie API OpenAI do analizy treści PDF i generowania inteligentnych sekcji
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Jesteś asystentem tworzącym pomocne notatki studenckie na podstawie dokumentów akademickich. Twoim zadaniem jest:

          1. Stworzyć naturalne notatki, które student mógłby sporządzić podczas nauki materiału
          2. Podzielić materiał na 4-7 logicznych sekcji tematycznych
          3. Używać prostego, zrozumiałego języka, ale z zachowaniem poprawnej terminologii akademickiej
          4. Zawrzeć konkretne informacje: definicje, wzory, przykłady, ważne koncepcje
          5. Unikać zdań w stylu "zostało omówione", "przedstawiono" - zamiast tego pisać bezpośrednio o zagadnieniach
          
          Odpowiedz w formacie JSON zgodnie z tą strukturą:
          {
            "sections": [
              {
                "title": "Tytuł sekcji (krótki, konkretny)",
                "description": "Jedno zdanie streszczające zawartość sekcji",
                "content": "Treść notatki zawierająca ważne pojęcia, definicje, wzory, przykłady itp. Pisz w stylu naturalnych notatek studenckich, nie jako formalne streszczenie. Używaj punktów, podkreśleń, pogrubień tam gdzie to ma sens."
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Stwórz dla mnie notatki ze studiów na podstawie tego dokumentu. Chcę, żeby notatki były napisane jak prawdziwe notatki studenckie - konkretne, z definicjami, wzorami i przykładami tam gdzie to potrzebne. Unikaj pisania w stylu "dokument omawia X" - zamiast tego wyciągnij te informacje i zapisz je bezpośrednio. Zwróć wynik jako obiekt JSON.
          
          Dokument: "${fileName}"
          Liczba stron: ${totalPages}
          
          Treść dokumentu:
          ${pdfContent.slice(0, 15000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Wyodrębnienie wygenerowanych sekcji z odpowiedzi AI
    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    // Jeśli nie wygenerowano sekcji, zapewnij fallback
    if (!aiResponse.sections || aiResponse.sections.length === 0) {
      return NextResponse.json(
        { error: 'AI nie wygenerowało sensownych sekcji' },
        { status: 500 }
      );
    }

    // Utwórz strukturę notatki z sekcjami wygenerowanymi przez AI
    const generatedNote = {
      id: `note_${Date.now()}`,
      title: `Notatka dla ${fileName}`,
      sections: aiResponse.sections.map((section, index) => ({
        id: index + 1,
        title: section.title,
        description: section.description,
        content: section.content,
        expanded: false // Domyślny stan to zwinięty
      }))
    };

    return NextResponse.json(generatedNote);
  } catch (error) {
    console.error("Błąd generowania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się wygenerować notatki' },
      { status: 500 }
    );
  }
}