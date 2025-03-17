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
    
    if (action === 'expand') {
      prompt = `Poszerz następującą sekcję o dodatkowe szczegóły, przykłady i wyjaśnienia. Zachowaj oryginalny styl i poziom języka. Oto obecna treść sekcji:

${currentContent}`;
    } else if (action === 'format') {
      prompt = `Zformatuj następującą sekcję, używając list punktowanych, nagłówków i akapitów dla lepszej czytelności. Zachowaj wszystkie informacje i nie zmieniaj treści. Oto obecna treść sekcji:

${currentContent}`;
    } else if (action === 'custom') {
      // Validate custom prompt
      if (!customPrompt) {
        return NextResponse.json(
          { error: 'Brak polecenia niestandardowego' },
          { status: 400 }
        );
      }
      
      prompt = `${customPrompt}

Oto obecna treść sekcji:

${currentContent}`;
    } else {
      return NextResponse.json(
        { error: 'Nieznana akcja' },
        { status: 400 }
      );
    }
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Jesteś asystentem, który pomaga edytować i ulepszać notatki studenckie. Twoje odpowiedzi powinny być dokładne, pomocne i odpowiednie dla kontekstu edukacyjnego."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    const enhancedContent = response.choices[0].message.content;
    
    return NextResponse.json({
      success: true,
      enhancedContent
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