// app/api/generate-section-outline/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import pool from '@/lib/db';

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
      pdfContent, 
      sectionNumber = 1,
      startPage = 1,
      endPage = 10
    } = body;
    
    if (!fileId || !fileName || !projectId) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: fileId, fileName i projectId są wymagane' },
        { status: 400 }
      );
    }

    const contentToAnalyze = pdfContent?.trim() || `Sekcja ${sectionNumber} dokumentu, strony ${startPage}-${endPage}`;

// app/api/generate-section-outline/route.ts
const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: `Jesteś asystentem tworzącym struktury notatek. 
                Przeanalizuj treść i stwórz 3-5 nagłówków w formacie JSON.
                MUSISZ użyć formatu JSON w odpowiedzi. 
                JSON Structure:
                {
                  "sections": [
                    {
                      "title": "Tytuł sekcji",
                      "description": "Opis...",
                      "content": ""
                    }
                  ]
                }`
    },
    {
      role: "user",
      content: `Stwórz strukturę notatki w formacie JSON dla sekcji ${sectionNumber}...
                Treść: ${contentToAnalyze.slice(0, 12000)}`
    }
  ],
  temperature: 0.5,
  max_tokens: 1000,
  response_format: { type: "json_object" }
});

    let aiResponse;
    try {
      aiResponse = JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("Błąd parsowania odpowiedzi:", response.choices[0].message.content);
      aiResponse = { sections: [] }; // Resetujemy odpowiedź
    }
    
    // Walidacja struktury odpowiedzi
    if (!aiResponse?.sections?.length) {
      aiResponse = {
        sections: [
          { title: "Wprowadzenie", description: "Podstawowe informacje z tej sekcji dokumentu", content: "" },
          { title: "Najważniejsze koncepcje", description: "Kluczowe pojęcia i definicje", content: "" },
          { title: "Praktyczne zastosowania", description: "Przykłady zastosowania wiedzy", content: "" }
        ]
      };
    }

    // Dodajemy brakującą logikę zapisu do bazy danych


    // BRAKUJĄCA CZĘŚĆ - zwracamy odpowiedź
    return NextResponse.json({ 
      success: true, 
      sections: aiResponse.sections 
    });

  } catch (error) {
    console.error("Błąd:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd serwera' },
      { status: 500 }
    );
  }
}