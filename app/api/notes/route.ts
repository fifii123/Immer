// File: /app/api/notes/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    const sectionNumber = searchParams.get('sectionNumber');
    
    // Handle section-specific note query
    if (fileId && sectionNumber) {
      const fileIdNum = parseInt(fileId);
      const sectionNum = parseInt(sectionNumber);
      
      if (isNaN(fileIdNum) || isNaN(sectionNum)) {
        return NextResponse.json(
          { error: 'Invalid fileId or sectionNumber format' },
          { status: 400 }
        );
      }
      
      // Try to find a note for this section (based on name pattern or metadata if available)
      const sectionNoteQuery = `
        SELECT note_id, note_name FROM notes 
        WHERE file_id = $1 
        AND (
          note_name LIKE $2 
          OR note_name LIKE $3
        )
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const noteResult = await client.query(sectionNoteQuery, [
        fileIdNum,
        `%Section ${sectionNum}%`,
        `%Sekcja ${sectionNum}%`
      ]);
      
      if (noteResult.rows.length > 0) {
        const note = noteResult.rows[0];
        
        // Fetch sections for this note
        const sectionsResult = await client.query(
          `SELECT section_id, title, description, content, expanded, order_index 
           FROM note_section 
           WHERE note_id = $1 
           ORDER BY order_index ASC`,
          [note.note_id]
        );
        
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
      } else {
        // No note found for this section
        return NextResponse.json(
          { error: 'No note found for this section' },
          { status: 404 }
        );
      }
    }
    
    // If only fileId is provided - return note for this file
    else if (fileId) {
      // Existing code to fetch note by fileId
      const noteResult = await client.query(
        `SELECT note_id, note_name FROM notes WHERE file_id = $1 LIMIT 1`,
        [parseInt(fileId)]
      );

      if (noteResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No note found for this file' },
          { status: 404 }
        );
      }

      const note = noteResult.rows[0];
      
      // Fetch sections for this note
      const sectionsResult = await client.query(
        `SELECT section_id, title, description, content, expanded, order_index 
         FROM note_section 
         WHERE note_id = $1 
         ORDER BY order_index ASC`,
        [note.note_id]
      );

      // Format the response
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
    }
    
    // Handle project-specific notes query
    else if (projectId) {
      // Existing code for fetching all notes for a project
      const notesQuery = `
        SELECT note_id, note_name, file_id, project_id
        FROM notes
        WHERE project_id = $1
      `;
      
      const notesResult = await client.query(notesQuery, [parseInt(projectId)]);
      
      if (notesResult.rows.length === 0) {
        return NextResponse.json([], { status: 200 }); 
      }
      
      const notesWithSectionsPromises = notesResult.rows.map(async (note) => {
        // Fetch sections for each note
        const sectionsQuery = `
          SELECT section_id, title, description, content, expanded, order_index 
          FROM note_section 
          WHERE note_id = $1 
          ORDER BY order_index ASC
        `;
        
        const sectionsResult = await client.query(sectionsQuery, [note.note_id]);
        
        return {
          id: note.note_id,
          fileName: `File ID: ${note.file_id}`,
          fileId: note.file_id,
          sections: sectionsResult.rows.map(section => ({
            id: section.section_id,
            title: section.title,
            description: section.description || '',
            content: section.content || '',
            expanded: section.expanded || false
          }))
        };
      });
      
      const allNotes = await Promise.all(notesWithSectionsPromises);
      
      return NextResponse.json(allNotes);
    }
    else {
      return NextResponse.json(
        { error: 'Missing required parameter: fileId, projectId, or both fileId and sectionNumber' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: 'Failed to fetch notes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST method to create a new note
export async function POST(request: Request) {
  const client = await pool.connect();
  
  try {
    const { 
      fileId, 
      projectId, 
      noteName, 
      sections,
      pdfSectionNumber,  // New field
      sectionStartPage,  // New field
      sectionEndPage     // New field
    } = await request.json();
    
    if (!fileId || !noteName || !sections) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, noteName and sections are required' },
        { status: 400 }
      );
    }

    // Begin transaction
    await client.query('BEGIN');

    // Create new note in database with section information
    const noteQuery = `
      INSERT INTO notes (
        file_id, 
        project_id, 
        note_name, 
        pdf_section_number,
        section_start_page,
        section_end_page,
        created_at, 
        updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING note_id
    `;
    
    const noteParams = [
      fileId, 
      projectId || null, 
      noteName,
      pdfSectionNumber || null,
      sectionStartPage || null,
      sectionEndPage || null
    ];
    
    const noteResult = await client.query(noteQuery, noteParams);
    
    const noteId = noteResult.rows[0].note_id;
    
    // Add note sections
    const sectionPromises = sections.map(async (section, index) => {
      // Handle different content formats
      let contentValue = section.content;
      
      if (Array.isArray(contentValue)) {
        contentValue = contentValue.join('\n\n');
      } else if (typeof contentValue !== 'string' && contentValue !== null) {
        contentValue = String(contentValue);
      }
      
      const sectionResult = await client.query(
        `INSERT INTO note_section (
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
        RETURNING section_id, title, description, content, expanded, order_index`,
        [
          noteId, 
          section.title, 
          section.description || '', 
          contentValue || '', 
          index, 
          Boolean(section.expanded) || false
        ]
      );
      
      return sectionResult.rows[0];
    });

    const sectionsData = await Promise.all(sectionPromises);
    
    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({
      id: noteId,
      sections: sectionsData,
      success: true,
    });
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    
    console.error("Error saving note:", error);
    return NextResponse.json(
      { 
        error: 'Failed to save note to database', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  } finally {
    // Always release the client
    client.release();
  }
}