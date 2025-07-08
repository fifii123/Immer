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
          content: `Jesteś ekspertem w tworzeniu zwięzłych notatek studenckich. Twoim zadaniem jest:

          1. Stworzyć strukturę dla sekcji ${sectionNumber} (strony ${startPage}-${endPage})
          2. Podzielić materiał na 4-7 logicznych sekcji tematycznych
          3. Dla każdej sekcji przygotować tytuł i krótki opis (jedno zdanie)
          4. ${outlineOnly 
              ? 'Dla każdej sekcji stworzyć zwięzłą treść w formie bullet points (3-6 punktów)' 
              : 'Przygotować szczegółową treść każdej sekcji z definicjami, przykładami i wyjaśnieniami.'}
          
          WAŻNE ZASADY dla treści sekcji:
          - NIE używaj zwrotów typu "Ta sekcja omawia...", "W tej części...", "Sekcja opisuje..."
          - Zacznij od konkretnych informacji i definicji
          - Używaj markdown list format (- ) dla kluczowych pojęć
          - KAŻDY punkt listy MUSI być w NOWEJ LINII
          - Dodawaj praktyczne przykłady i wzory gdzie to możliwe
          - Zachowuj zwięzłość ale merytoryczność
          
          Przykład DOBREJ treści sekcji (zwróć uwagę na markdown format!):
          "- Polis - niezależne miasto-państwo z własnym rządem i prawami
          - Ewolucja władzy: monarchia → tyrania → arystokracja → oligarchia → demokracja  
          - Sparta vs Ateny - różne modele: militarny vs kulturalny
          - Agora - centrum życia politycznego i handlowego miasta"
          
          Przykład ZŁEJ treści (NIE RÓB TAK):
          "Ta sekcja omawia różnorodność greckich miast-państw oraz ich systemy rządów..."
          
          Przykład ZŁEGO FORMATOWANIA (NIE RÓB TAK):
          "- Polis - miasto-państwo - Ewolucja władzy - Sparta vs Ateny"
          (punkty w jednej linii - ŹLE!)
          
          Odpowiedz w formacie JSON zgodnie z tą strukturą:
          {
            "sections": [
              {
                "title": "Tytuł sekcji (krótki, konkretny)",
                "description": "Jedno zdanie streszczające zawartość sekcji",
                "content": "${outlineOnly 
                  ? 'Zwięzła treść w formie bullet points (3-6 punktów), zaczynająca od konkretnych informacji, NIE od "Ta sekcja..."'
                  : 'Szczegółowa treść notatki zawierająca ważne pojęcia, definicje, wzory, przykłady.'
                }"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Stwórz strukturę notatek dla sekcji ${sectionNumber} (strony ${startPage}-${endPage}) dokumentu.
          
          ${outlineOnly 
            ? 'Generuj treść w formie zwięzłych bullet points (3-6 punktów na sekcję). Zacznij od konkretnych definicji i faktów, NIE od "Ta sekcja omawia..."\n\nKRYTYCZNE: Każdy punkt • MUSI być w osobnej linii!' 
            : 'Generuj szczegółowe notatki z pełną treścią, definicjami i przykładami.'
          }
          
          Styl wymaganej treści:
          ✅ DOBRZE: 
          "- SQL - język zapytań do baz danych
          - SELECT - podstawowa komenda wyboru danych"
          
          ❌ ŹLE: 
          "Ta sekcja opisuje język SQL..."
          "- SQL - język zapytań - SELECT - komenda" (punkty w jednej linii)
          
          Zwróć wynik jako obiekt JSON.
                  
          Dokument: "${fileName}"
                  
          Treść sekcji:
          ${pdfContent.slice(0, 15000)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2500, // Zwiększone dla lepszej jakości
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
    const processedSections = aiResponse.sections.map((section, index) => {
      let content = section.content || "";
      
      // Post-processing: Konwertuj bullet points na markdown
      if (content && content.includes('•')) {
        console.log('Original content:', content);
        
        // Zamień • na - (markdown list format) i wymuś nowe linie
        content = content
          .replace(/•\s*/g, '\n- ') // Zamień • na markdown list format
          .replace(/^\n/, '') // Usuń początkowy \n jeśli istnieje
          .trim();
          
        console.log('Processed content:', content);
      }
      
      return {
        id: index + 1,
        title: section.title || `Sekcja ${index + 1}`,
        description: section.description || `Zawartość ze stron ${startPage}-${endPage}`,
        content: outlineOnly ? content : content,
        expanded: false // Domyślnie zwinięte
      };
    });

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