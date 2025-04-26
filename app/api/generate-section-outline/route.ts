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
    
    console.log(`Generowanie struktury dla sekcji ${sectionNumber}, strony ${startPage}-${endPage}`);
    
    if (!fileId || !sectionNumber || !startPage || !endPage) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól' },
        { status: 400 }
      );
    }

    // Sprawdź czy treść jest dostarczona
    if (!pdfContent || pdfContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brak treści PDF do analizy' },
        { status: 400 }
      );
    }



    // Wywołanie API OpenAI do wygenerowania struktury notatki
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Jesteś asystentem tworzącym strukturę notatek studenckich na podstawie dokumentów akademickich. Twoim zadaniem jest:

          1. Stworzyć strukturę dla sekcji ${sectionNumber} (strony ${startPage}-${endPage})
          2. Podzielić materiał na 4-7 logicznych sekcji tematycznych
          3. Dla każdej sekcji przygotować tytuł i krótki opis (jedno zdanie)
          4. ${outlineOnly ? 'Nie tworzyć pełnej treści sekcji, pole content ma być puste ("").' : 'Przygotować treść każdej sekcji z definicjami, przykładami i wyjaśnieniami.'}
          
          Odpowiedz w formacie JSON zgodnie z tą strukturą:
          {
            "sections": [
              {
                "title": "Tytuł sekcji (krótki, konkretny)",
                "description": "Jedno zdanie streszczające zawartość sekcji",
                "content": ${outlineOnly ? '""' : '"Treść notatki zawierająca ważne pojęcia, definicje, wzory, przykłady itp."'}
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Stwórz strukturę notatek dla sekcji ${sectionNumber} (strony ${startPage}-${endPage}) dokumentu. ${outlineOnly ? 'Generuj tylko strukturę bez treści - pole content ma być pusty string ("").' : 'Generuj pełne notatki z treścią.'} Zwróć wynik jako obiekt JSON.
          
          Dokument: "${fileName}"
          
          Treść sekcji:
          ${pdfContent.slice(0, 15000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Parsowanie odpowiedzi AI
    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    // Walidacja wygenerowanych sekcji
    if (!aiResponse.sections || aiResponse.sections.length === 0) {
      return NextResponse.json(
        { error: 'AI nie wygenerowało użytecznych sekcji' },
        { status: 500 }
      );
    }

    // Przetwarzanie sekcji, aby upewnić się, że wszystkie mają oczekiwane właściwości
    const processedSections = aiResponse.sections.map((section, index) => ({
      id: index + 1,
      title: section.title || `Sekcja ${index + 1}`,
      description: section.description || `Zawartość ze stron ${startPage}-${endPage}`,
      content: outlineOnly ? "" : (section.content || ""),  // Puste pole content dla outlineOnly
      expanded: false // Domyślnie zwinięte
    }));

    // Tworzenie obiektu struktury notatki
    const generatedNote = {
      id: `note_${Date.now()}`,
      title: `Notatka dla ${fileName} (Sekcja ${sectionNumber})`,
      sections: processedSections
    };

    console.log(`Pomyślnie wygenerowano strukturę z ${processedSections.length} sekcjami`);
    
    return NextResponse.json(generatedNote);
  } catch (error) {
    console.error("Błąd generowania struktury notatki:", error);
    
    // Zwróć szczegółowy błąd do debugowania
    return NextResponse.json(
      { 
        error: 'Nie udało się wygenerować struktury notatki',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}