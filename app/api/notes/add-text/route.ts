// File: /app/api/notes/add-text/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import pool from '@/lib/db';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  // Create a client from the pool for this request
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
    
    // Extract numeric parts from IDs (handles both "note_60" format and numeric formats)
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
      SELECT section_id, title, description, content
      FROM note_section
      WHERE note_id = $1
      ORDER BY order_index ASC
    `;
    
    const sectionsResult = await client.query(sectionsQuery, [noteId]);
    const existingSections = sectionsResult.rows;

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
          3. Podaj rozszerzony tekst, który wzbogaci istniejącą sekcję o nowe informacje
          
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
    
    // 4. Process the AI's decision
    if (aiResponse.action === "ignore") {
      return NextResponse.json({
        success: false,
        message: aiResponse.reason,
        action: "ignore"
      });
    }
    
    if (aiResponse.action === "add_to_existing") {
      // Start a transaction for the update
      await client.query('BEGIN');
      
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
      
      // Update existing section
      const updateQuery = `
        UPDATE note_section
        SET content = $1, updated_at = NOW()
        WHERE section_id = $2
        RETURNING section_id
      `;
      
      const updateResult = await client.query(updateQuery, [
        aiResponse.enhancedContent,
        targetSectionId
      ]);
      
      await client.query('COMMIT');
      
      if (updateResult.rows.length === 0) {
        throw new Error('Nie znaleziono sekcji do aktualizacji');
      }
      
      return NextResponse.json({
        success: true,
        message: aiResponse.reason,
        action: "updated",
        sectionId: updateResult.rows[0].section_id
      });
    }
    
    if (aiResponse.action === "create_new") {
      // Start a transaction
      await client.query('BEGIN');
      
      // Find the highest order_index
      const orderQuery = `
        SELECT order_index 
        FROM note_section 
        WHERE note_id = $1 
        ORDER BY order_index DESC 
        LIMIT 1
      `;
      
      const orderResult = await client.query(orderQuery, [noteId]);
      const highestOrderIndex = orderResult.rows.length > 0 ? orderResult.rows[0].order_index : -1;
      const newOrderIndex = highestOrderIndex + 1;
      
      // Create new section
      const createQuery = `
        INSERT INTO note_section (
          note_id, 
          title, 
          description, 
          content, 
          order_index, 
          expanded, 
          created_at, 
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING section_id
      `;
      
      const createResult = await client.query(createQuery, [
        noteId,
        aiResponse.newSectionTitle,
        aiResponse.newSectionDescription,
        aiResponse.enhancedContent,
        newOrderIndex,
        true // expanded
      ]);
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: aiResponse.reason,
        action: "created",
        sectionId: createResult.rows[0].section_id
      });
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
  } catch (error) {
    // If there's an active transaction, roll it back
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    
    console.error("Błąd dodawania tekstu do notatek:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas przetwarzania tekstu' },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}