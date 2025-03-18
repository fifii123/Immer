// File: /app/api/notes/add-text/route.ts
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
    const { 
      selectedText, 
      fileId: rawFileId, 
      noteId: rawNoteId, 
      surroundingContext = "", 
      pageNumber 
    } = body;
    
    // Extract numeric parts from IDs
    let noteId;
    if (typeof rawNoteId === 'string' && rawNoteId.includes('_')) {
      noteId = parseInt(rawNoteId.split('_')[1], 10);
    } else {
      noteId = parseInt(String(rawNoteId), 10);
    }
    
    let fileId;
    if (typeof rawFileId === 'string' && rawFileId.includes('_')) {
      fileId = parseInt(rawFileId.split('_')[1], 10);
    } else {
      fileId = parseInt(String(rawFileId), 10);
    }
    
    // Validate inputs
    if (!selectedText || isNaN(noteId) || isNaN(fileId)) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól lub nieprawidłowy format ID' },
        { status: 400 }
      );
    }

    // 1. Fetch existing note sections to provide context
    const sectionsQuery = `
      SELECT section_id, title, description, content, order_index
      FROM note_section
      WHERE note_id = $1
      ORDER BY order_index ASC
    `;
    
    const sectionsResult = await client.query(sectionsQuery, [noteId]);
    const existingSections = sectionsResult.rows;

    // Calculate next order index for potential new sections
    const nextOrderIndex = existingSections.length > 0 
      ? Math.max(...existingSections.map(s => s.order_index)) + 1 
      : 0;

    // 2. Create a simplified context to save tokens
    const sectionsContext = existingSections.map(section => 
      `Section ID: ${section.section_id}
       Title: ${section.title}
       Description: ${section.description || ''}
       Preview: ${section.content ? section.content.substring(0, 150) : ''}...`
    ).join('\n\n');

    // 3. Ask AI to make a decision
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Jako asystent analizy treści, pomóż dopasować fragment tekstu do istniejących sekcji notatek lub zaproponuj utworzenie nowej sekcji, jeśli to konieczne.
          
          Twoje zadanie:
          1. Zdecyduj, czy zaznaczony fragment zawiera konstruktywne informacje warte dodania do notatek
          2. Jeśli tak, dopasuj go do istniejącej sekcji LUB zaproponuj utworzenie nowej
          3. Podaj rozszerzony tekst, który wzbogaci istniejącą sekcję o nowe informacje zachowując wszystkie informacje z oryginalnej sekcji.
          
          Odpowiedz w formacie JSON:
          {
            "action": "add_to_existing" | "create_new" | "ignore",
            "reason": "Krótkie wyjaśnienie decyzji",
            "targetSectionId": null | ID_sekcji, // jeśli add_to_existing
            "newSectionTitle": null | "tytuł", // jeśli create_new
            "newSectionDescription": null | "opis", // jeśli create_new
            "enhancedContent": "Nowa lub rozszerzona treść uwzględniająca zaznaczony fragment"
          }`
        },
        {
          role: "user",
          content: `Zaznaczony fragment tekstu: "${selectedText}"
          
          Kontekst otaczający (fragment tekstu przed/po zaznaczeniu): 
          "${surroundingContext}"
          
          Istniejące sekcje notatek:
          ${sectionsContext}
          
          Podejmij decyzję co zrobić z tym fragmentem.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(response.choices[0].message.content);
    
    // 4. Process the AI's decision (WITHOUT SAVING TO DATABASE)
    if (aiResponse.action === "ignore") {
      return NextResponse.json({
        success: false,
        message: aiResponse.reason,
        action: "ignore"
      });
    }
    
    if (aiResponse.action === "add_to_existing") {
      // Parse the target section ID if it's a string
      let targetSectionId = aiResponse.targetSectionId;
      if (typeof targetSectionId === 'string' && targetSectionId.includes('_')) {
        targetSectionId = parseInt(targetSectionId.split('_')[1], 10);
      } else if (typeof targetSectionId === 'string') {
        targetSectionId = parseInt(targetSectionId, 10);
      }
      
      if (isNaN(targetSectionId)) {
        throw new Error('Nieprawidłowy format ID sekcji');
      }
      
      // Find the existing section
      const section = existingSections.find(s => s.section_id === targetSectionId);
      if (!section) {
        throw new Error('Nie znaleziono sekcji do aktualizacji');
      }
      
      // Return the proposal but DON'T modify database
      return NextResponse.json({
        success: true,
        message: aiResponse.reason,
        action: "update_proposed",
        sectionId: targetSectionId,
        currentContent: section.content,
        proposedContent: aiResponse.enhancedContent
      });
    }
    
    if (aiResponse.action === "create_new") {
      // Return the proposal to create a new section but DON'T modify database
      return NextResponse.json({
        success: true,
        message: aiResponse.reason,
        action: "create_proposed",
        noteId: noteId,
        title: aiResponse.newSectionTitle,
        description: aiResponse.newSectionDescription,
        proposedContent: aiResponse.enhancedContent,
        orderIndex: nextOrderIndex
      });
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
  } catch (error) {
    console.error("Błąd analizy tekstu:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas analizy tekstu' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}