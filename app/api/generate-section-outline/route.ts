// api/generate-section-outline/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      fileId, 
      fileName, 
      projectId, 
      sectionNumber, 
      startPage, 
      endPage, 
      pdfContent, 
      outlineOnly 
    } = body;
    
    if (!fileId || !sectionNumber || !startPage || !endPage) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól' },
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

    // Wywołanie API OpenAI do wygenerowania struktury notatek
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Jesteś asystentem tworzącym strukturę notatek studenckich na podstawie dokumentów akademickich. Twoim zadaniem jest:

          1. Stworzyć strukturę notatek dla sekcji dokumentu (strony ${startPage}-${endPage})
          2. Podzielić materiał na 4-7 logicznych sekcji tematycznych
          3. Dla każdej sekcji przygotować tytuł i krótki opis (jednozdaniowy)
          4. ${outlineOnly ? 'Nie tworzyć pełnej treści sekcji, tylko pozostawić to pole puste lub z minimalną wskazówką.' : 'Przygotować treść każdej sekcji z definicjami, przykładami i wyjaśnieniami.'}
          
          Odpowiedz w formacie JSON zgodnie z tą strukturą:
          {
            "sections": [
              {
                "title": "Tytuł sekcji (krótki, konkretny)",
                "description": "Jedno zdanie streszczające zawartość sekcji",
                "content": ${outlineOnly ? '"Placeholder dla treści"' : '"Treść notatki zawierająca ważne pojęcia, definicje, wzory, przykłady itp."'}
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Stwórz strukturę notatek dla sekcji ${sectionNumber} (strony ${startPage}-${endPage}) dokumentu. ${outlineOnly ? 'Generuj tylko strukturę bez treści.' : 'Generuj pełne notatki.'} Zwróć wynik jako obiekt JSON.
          
          Dokument: "${fileName}"
          
          Treść sekcji:
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
      title: `Notatka dla ${fileName} (Sekcja ${sectionNumber})`,
      sections: aiResponse.sections.map((section, index) => ({
        id: index + 1,
        title: section.title,
        description: section.description,
        content: outlineOnly ? (section.content || "") : section.content,
        expanded: false // Domyślny stan to zwinięty
      }))
    };

    return NextResponse.json(generatedNote);
  } catch (error) {
    console.error("Błąd generowania struktury notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się wygenerować struktury notatki' },
      { status: 500 }
    );
  }
}