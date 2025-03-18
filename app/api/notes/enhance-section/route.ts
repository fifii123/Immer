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
    const { sectionId, action, currentContent, customPrompt } = body;
    
    // Validate inputs
    if (!sectionId || !action || !currentContent) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól' },
        { status: 400 }
      );
    }
    
    // Generate prompt based on action
    let prompt = '';
    let isAdditive = false;
    
    if (action === 'expand') {
      prompt = `Poszerz następującą sekcję o dodatkowe szczegóły, przykłady i wyjaśnienia. Zachowaj oryginalny styl i poziom języka. Nie używaj szablonowych zwrotów typu "Oto wyjaśnienie" lub numerowanych list "1., 2., 3.". Pisz w stylu naturalnych notatek studenckich.

Treść sekcji:
${currentContent}`;
    } 
    else if (action === 'format') {
      prompt = `Zformatuj następującą sekcję używając składni markdown dla lepszej czytelności. Stosuj następujące elementy:
    
1. Użyj nagłówków ## dla głównych punktów i ### dla podpunktów
2. Użyj list punktowanych (- ) dla wyliczania elementów
3. Użyj **pogrubienia** dla ważnych pojęć i definicji
4. Użyj *kursywy* dla podkreślenia istotnych informacji
5. Używaj krótkich akapitów (max 3-4 zdania)
6. Dodaj odstępy między akapitami
7. Wyróżnij definicje używając > dla cytatów blokowych
8. Użyj \`kodu\` dla wzorów, równań lub specjalnych pojęć
    
Przykład dobrego formatowania:
## Główny temat
Wprowadzający akapit o temacie. Krótkie wyjaśnienie czego dotyczy sekcja.
    
### Podtemat 1
Wyjaśnienie podtematu. **Ważne pojęcie** to kluczowy element który należy zapamiętać.
    
> Definicja: Formalne wyjaśnienie ważnego pojęcia.
    
- Punkt pierwszy dotyczący tematu
- Punkt drugi z *dodatkowym podkreśleniem*
- Punkt trzeci zawierający \`a = b + c\`
    
### Podtemat 2
Kolejne wyjaśnienie z konkretami.
    
Treść sekcji do sformatowania:
${currentContent}`;
    } 
    else if (action === 'custom') {
      if (!customPrompt) {
        return NextResponse.json({ error: 'Brak polecenia niestandardowego' }, { status: 400 });
      }
      
      isAdditive = true;
      
      // Analyze what the user is asking for to determine the right approach
      const analysisPrompt = `Przeanalizuj polecenie użytkownika: "${customPrompt}"
      
Jakie jest główne zagadnienie w tym poleceniu? (jedna linijka)`;

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 100
      });
      
      const topicAnalysis = analysisResponse.choices[0].message.content;
      
      // Improved prompt for more natural additions
      prompt = `Jesteś asystentem tworzącym uzupełnienia do notatek studenckich. Przeczytaj istniejące notatki, a następnie KONTYNUUJ je, dodając nową treść związaną z tematem: "${customPrompt}".

Zasady:
- Nie powtarzaj istniejącej treści, tylko dodaj nową
- Nie używaj fraz typu "Oto wyjaśnienie..." czy "Poniżej przedstawiam..."
- Nie numeruj punktów (1, 2, 3) ani nie twórz formalnych list
- Pisz w tym samym stylu co istniejące notatki - naturalnym, studenckim
- Nie rozpoczynaj od nagłówków ani tytułów
- Nie używaj podsumowań typu "Podsumowując..." ani nie kończ konkluzją
- Po prostu pisz, jakbyś kontynuował notatkę z wykładu

Temat do rozwinięcia: ${topicAnalysis || customPrompt}

Istniejące notatki:
${currentContent}

Kontynuacja notatek (napisz bezpośrednio w tonie kontynuacji, bez wprowadzeń):`;
    } 
    else {
      return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
    }
    
    // GŁÓWNA MODYFIKACJA: Dostosowanie wiadomości systemowej do akcji
    const systemContent = action === 'format'
      ? "Jesteś ekspertem w formatowaniu tekstu z wykorzystaniem składni markdown. Tworzysz czytelne, dobrze zorganizowane treści dla studentów, które będą wyświetlane w interfejsie notatek. Używasz nagłówków, punktów, pogrubień, kursywy i innych elementów markdown, aby tekst był przejrzysty i łatwy do nauki. Twój markdown musi być poprawny składniowo i gotowy do wyświetlenia."
      : "Jesteś doświadczonym studentem tworzącym swoje notatki z wykładów. Piszesz w naturalnym stylu, bez formalnych struktur, nagłówków czy list numerowanych. Twoje notatki są zwięzłe, merytoryczne i przypominają prawdziwe zapiski z zajęć.";
    
    // Call the OpenAI API z zmodyfikowaną wiadomością systemową
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    let enhancedContent = response.choices[0].message.content || '';
    
    // For custom prompts, combine original with new and ensure smooth transition
    if (isAdditive) {
      // Find appropriate delimiter to use between existing and new content
      const delimiter = currentContent.trim().endsWith('.') ? '\n\n' : ' ';
      enhancedContent = `${currentContent.trim()}${delimiter}${enhancedContent.trim()}`;
    }
    
    return NextResponse.json({
      success: true,
      enhancedContent,
      isAdditive
    });
  } catch (error) {
    console.error("Błąd ulepszania sekcji:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas przetwarzania' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}