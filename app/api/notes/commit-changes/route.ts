// File: /app/api/notes/commit-changes/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { 
      action,
      sectionId,
      noteId,
      content,
      title,
      description,
      orderIndex
    } = body;
    
    // Validate essential fields
    if (action !== 'update' && action !== 'create') {
      return NextResponse.json(
        { error: 'Nieprawidłowa akcja' },
        { status: 400 }
      );
    }

    if (action === 'update') {
      // Validate update fields
      if (!sectionId || !content) {
        return NextResponse.json(
          { error: 'Brakuje wymaganych pól dla aktualizacji' },
          { status: 400 }
        );
      }
      
      // Start a transaction
      await client.query('BEGIN');
      
      // Update the section
      const updateQuery = `
        UPDATE note_section
        SET content = $1, updated_at = NOW()
        WHERE section_id = $2
        RETURNING section_id, content
      `;
      
      const updateResult = await client.query(updateQuery, [content, sectionId]);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      if (updateResult.rows.length === 0) {
        throw new Error('Nie znaleziono sekcji do aktualizacji');
      }
      
      return NextResponse.json({
        success: true,
        action: "updated",
        sectionId: updateResult.rows[0].section_id,
        content: updateResult.rows[0].content
      });
    }
    
    if (action === 'create') {
      // Validate create fields
      if (!noteId || !title || !content) {
        return NextResponse.json(
          { error: 'Brakuje wymaganych pól dla utworzenia sekcji' },
          { status: 400 }
        );
      }
      
      // Start a transaction
      await client.query('BEGIN');
      
      // Create the new section
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
        RETURNING section_id, title, description, content
      `;
      
      const createResult = await client.query(createQuery, [
        noteId,
        title,
        description || '',
        content,
        orderIndex || 0,
        true // Expanded by default
      ]);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        action: "created",
        sectionId: createResult.rows[0].section_id,
        title: createResult.rows[0].title,
        description: createResult.rows[0].description,
        content: createResult.rows[0].content
      });
    }
    
    return NextResponse.json(
      { error: 'Nieobsługiwana akcja' },
      { status: 400 }
    );
  } catch (error) {
    // If there's an active transaction, roll it back
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    
    console.error("Błąd zapisywania zmian:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wystąpił błąd podczas zapisywania zmian' },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}