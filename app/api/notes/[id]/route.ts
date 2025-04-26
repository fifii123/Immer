// File: /app/api/notes/[id]/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const client = await pool.connect();
  
  try {
    // Get the note ID from the URL parameter
    const noteId = parseInt(params.id);
    
    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

    // Fetch the note details from the database
    const noteResult = await client.query(
      `SELECT note_id, note_name FROM notes WHERE note_id = $1`,
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const note = noteResult.rows[0];
    
    // Fetch the sections for this note
    const sectionsResult = await client.query(
      `SELECT section_id, title, description, content, expanded, order_index 
       FROM note_section 
       WHERE note_id = $1 
       ORDER BY order_index ASC`,
      [noteId]
    );

    // Format the response to match the expected structure
    const formattedNote = {
      id: `note_${note.note_id}`,
      title: note.note_name,
      sections: sectionsResult.rows.map(section => ({
        id: section.section_id,
        title: section.title,
        description: section.description || '',
        content: section.content || '',
        expanded: section.expanded || false
      }))
    };

    return NextResponse.json(formattedNote);
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: 'Failed to fetch note data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}