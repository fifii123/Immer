import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import pool from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    console.log('[DEBUG] Request body:', JSON.stringify(body, null, 2));

    const { 
      sectionId, 
      action, 
      currentContent, 
      customPrompt,
      sectionTitle,
      sectionDescription,
      sectionStartPage,
      sectionEndPage 
    } = body;
    
    // Validate inputs
    if (!sectionId || !action) {
      console.error('[ERROR] Validation failed - missing sectionId or action');
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: sectionId lub action' },
        { status: 400 }
      );
    }
    
    // Generate prompt based on action
    let prompt = '';
    let isAdditive = false;
    let systemContent = '';
    
    if (action === 'expand') {
      console.log('[DEBUG] Handling expand action');
      
      // Determine if content is empty, minimal, or substantial
      const contentLength = (currentContent || '').trim().length;
      const wordCount = (currentContent || '').trim().split(/\s+/).length;
      
      if (!currentContent || contentLength === 0) {
        console.log('[DEBUG] Empty content detected, using title and description');
        
        if (!sectionTitle || !sectionDescription) {
          console.error('[ERROR] Missing title/description for empty content');
          return NextResponse.json(
            { error: 'Brakuje tytułu lub opisu sekcji dla pustej zawartości' },
            { status: 400 }
          );
        }

        prompt = `Stwórz szczegółowe notatki w formie ciągłego tekstu na podstawie:
---
Tytuł sekcji: "${sectionTitle}"
Opis sekcji: "${sectionDescription}"
Zakres stron: ${sectionStartPage}-${sectionEndPage}

Instrukcje:
1. Używaj naturalnego języka notatek studenckich
2. Rozwiń kluczowe punkty z opisu
3. Dodaj praktyczne przykłady i wyjaśnienia
4. Unikaj nagłówków i list punktowanych
5. Zachowaj spójny styl z resztą dokumentu

Przykład poprawnego formatu:
"SQL to język zapytań używany do komunikacji z bazami danych. Podstawową konstrukcją jest SELECT,
który pozwala wybierać dane z tabel. Przykładowe zapytanie: SELECT * FROM produkty WHERE cena > 100.
Klauzula WHERE służy do filtrowania wyników..."`;
      } 
      else if (wordCount < 30) {
        // Dla krótkiej treści - traktuj ją jako punkty wyjściowe do rozwinięcia
        console.log('[DEBUG] Minimal content detected, treating as starting points');
        
        prompt = `Znacząco rozwiń i wzbogać następującą krótką treść sekcji:
---
Tytuł sekcji: "${sectionTitle}"
Opis sekcji: "${sectionDescription}"
Obecna treść (do rozwinięcia):
${currentContent}

Instrukcje:
1. Użyj istniejącej treści jako punkt wyjścia
2. Dodaj znacząco więcej szczegółów, przykładów i wyjaśnień
3. Poszerz każdą koncepcję o 3-4 zdania
4. Dodaj praktyczne zastosowania omawianych koncepcji
5. Zachowaj oryginalny styl i poziom języka
6. Nie zmieniaj znaczenia istniejącej treści, tylko ją rozwiń`;

        systemContent = "Jesteś ekspertem akademickim, który przekształca krótkie notatki w pełne, szczegółowe treści. Tworzysz bogate wyjaśnienia zachowując oryginalny styl i integralność wyjściowej treści.";
      } 
      else {
        // Dla pełnej treści - standardowe poszerzenie
        prompt = `Poszerz następującą sekcję o dodatkowe szczegóły, przykłady i wyjaśnienia:
---
Tytuł sekcji: "${sectionTitle}"
Obecna treść:
${currentContent}

Instrukcje:
1. Zachowaj oryginalny styl i poziom języka
2. Nie używaj szablonowych zwrotów typu "Oto wyjaśnienie"
3. Dodaj praktyczne zastosowania omawianych koncepcji
4. Zachowaj format ciągłego tekstu bez list`;
        
        systemContent = "Jesteś doświadczonym studentem rozszerzającym istniejące notatki. Rozwijaj treść w naturalnym stylu, dodając praktyczne przykłady i dodatkowe wyjaśnienia.";
      }
    } 
    else if (action === 'format') {
      console.log('[DEBUG] Handling format action');
      
      if (!currentContent || currentContent.trim().length === 0) {
        console.error('[ERROR] Cannot format empty content');
        return NextResponse.json(
          { error: 'Nie można formatować pustej sekcji' },
          { status: 400 }
        );
      }

      // Dla krótkiej treści - rozwiń i sformatuj
      const wordCount = currentContent.trim().split(/\s+/).length;
      if (wordCount < 30) {
        prompt = `Rozwiń i sformatuj następującą krótką treść używając składni markdown:
---
Tytuł sekcji: "${sectionTitle}"
Opis sekcji: "${sectionDescription}"
Obecna treść:
${currentContent}

Instrukcje formatowania:
1. Znacząco rozwiń i wzbogać początkową treść (co najmniej 3x dłuższa)
2. Użyj nagłówków ## dla głównych tematów
3. Wyróżnij kluczowe pojęcia pogrubieniem
4. Dodaj listy punktowane dla wyliczeń
5. Użyj bloków cytatów dla definicji
6. Zachowaj oryginalną treść jako podstawę, ale dodaj znacząco więcej szczegółów`;

        systemContent = "Jesteś ekspertem akademickim, który przekształca krótkie notatki w pełne, dobrze sformatowane treści z użyciem markdown. Rozwijasz materiał zachowując jego oryginalny charakter.";
      } else {
        // Standardowe formatowanie dla dłuższej treści
        prompt = `Zformatuj następującą sekcję używając składni markdown:
---
Obecna treść:
${currentContent}

Instrukcje formatowania:
1. Użyj nagłówków ## dla głównych tematów
2. Wyróżnij kluczowe pojęcia pogrubieniem
3. Dodaj listy punktowane dla wyliczeń
4. Użyj bloków cytatów dla definicji
5. Zachowaj oryginalną treść, tylko dodaj formatowanie`;

        systemContent = "Jesteś ekspertem w formatowaniu tekstu akademickiego. Twórz czytelne notatki z użyciem markdown, zachowując całą oryginalną treść.";
      }
      
      console.log('[DEBUG] Generated format prompt:', prompt);
    } 
    else if (action === 'custom') {
      console.log('[DEBUG] Handling custom action');
      
      if (!customPrompt) {
        console.error('[ERROR] Missing custom prompt');
        return NextResponse.json(
          { error: 'Brak polecenia niestandardowego' }, 
          { status: 400 }
        );
      }

      isAdditive = true;
      
      // Analiza polecenia użytkownika
      const analysisPrompt = `Przeanalizuj polecenie: "${customPrompt}"
      
Wyodrębnij:
1. Główny temat (1-3 słowa)
2. Typ operacji (dodaj informacje, popraw błąd, zmień styl)
3. Kontekst wymagany do realizacji`;

      console.log('[DEBUG] Analysis prompt:', analysisPrompt);
      
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 100
      });
      
      const topicAnalysis = analysisResponse.choices[0].message.content;
      console.log('[DEBUG] Custom action analysis:', topicAnalysis);

      // Dla pustej lub krótkiej treści - traktuj jak tworzenie nowej treści
      const contentLength = (currentContent || '').trim().length;
      const wordCount = (currentContent || '').trim().split(/\s+/).length;
      
      if (!currentContent || contentLength === 0 || wordCount < 30) {
        prompt = `Stwórz treść sekcji zgodnie z poleceniem:
---
Tytuł sekcji: "${sectionTitle}"
Opis sekcji: "${sectionDescription}"
Polecenie: "${customPrompt}"
Analiza: "${topicAnalysis}"
---
${currentContent ? `Obecna treść (krótka/podstawowa):\n${currentContent}` : 'Brak istniejącej treści - tworzymy nową sekcję'}

Instrukcje:
1. Stwórz pełną, szczegółową treść zgodnie z poleceniem użytkownika
2. Użyj naturalnego stylu notatek studenckich
3. Dodaj praktyczne przykłady i wyjaśnienia
4. Treść powinna być obszerna i merytoryczna (minimum 3-4 akapity)`;

        systemContent = "Jesteś ekspertem akademickim tworzącym szczegółowe notatki na podstawie tytułu, opisu i specyficznych wymagań. Generujesz wartościową treść edukacyjną w naturalnym stylu studenckim.";
      } else {
        // Dla istniejącej treści - standardowe dostosowanie
        prompt = `Dostosuj notatki zgodnie z poleceniem:
---
Polecenie: "${customPrompt}"
Analiza: "${topicAnalysis}"
---
Obecna treść:
${currentContent || "Brak istniejącej treści - tworzymy nową sekcję"}

Instrukcje:
1. Zrealizuj dokładnie polecenie użytkownika
2. Zachowaj spójność stylu
3. Unikaj zbędnych komentarzy
4. Maksymalna długość: 3 akapity`;

        systemContent = "Jesteś asystentem dostosowującym notatki do specyficznych potrzeb użytkownika. Precyzyjnie implementuj otrzymane polecenia, zachowując akademicki charakter notatek.";
      }
      
      console.log('[DEBUG] Generated custom prompt:', prompt);
    } 
    else {
      console.error('[ERROR] Unknown action:', action);
      return NextResponse.json(
        { error: 'Nieznana akcja' }, 
        { status: 400 }
      );
    }

    // Logowanie kontekstu
    console.log('[DEBUG] System message:', systemContent);
    console.log('[DEBUG] Full prompt:', prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt }
      ],
      temperature: action === 'format' ? 0.3 : 0.7,
      max_tokens: 1500,
    });

    console.log('[DEBUG] OpenAI response:', JSON.stringify(response, null, 2));
    
    let enhancedContent = response.choices[0].message.content || '';

    if (isAdditive) {
      const delimiter = currentContent.trim().endsWith('.') ? '\n\n' : ' ';
      enhancedContent = `${currentContent.trim()}${delimiter}${enhancedContent.trim()}`;
      console.log('[DEBUG] Combined content:', enhancedContent.substring(0, 200) + '...');
    }

    return NextResponse.json({
      success: true,
      enhancedContent,
      isAdditive
    });

  } catch (error) {
    console.error('[ERROR] Full error details:', error);
    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}\nStack: ${error.stack?.substring(0, 500)}` 
      : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas przetwarzania',
        details: errorMessage 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}