// File: /app/api/notes/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET endpoint to fetch notes
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
      
      // Try to find a note for this section using the pdf_section_number field
      const sectionNoteQuery = `
        SELECT note_id, note_name, pdf_section_number, section_start_page, section_end_page 
        FROM notes 
        WHERE file_id = $1 AND pdf_section_number = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const noteResult = await client.query(sectionNoteQuery, [fileIdNum, sectionNum]);
      
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
          id: note.note_id,
          title: note.note_name,
          sectionInfo: {
            sectionNumber: note.pdf_section_number,
            startPage: note.section_start_page,
            endPage: note.section_end_page
          },
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
        return NextResponse.json({ error: 'No note found for this section' }, { status: 404 });
      }
    }
    
    // If only fileId is provided - return note for this file
    else if (fileId) {
      const noteResult = await client.query(
        `SELECT note_id, note_name, pdf_section_number, section_start_page, section_end_page 
         FROM notes 
         WHERE file_id = $1 
         ORDER BY created_at DESC
         LIMIT 1`,
        [parseInt(fileId)]
      );

      if (noteResult.rows.length === 0) {
        return NextResponse.json({ error: 'No note found for this file' }, { status: 404 });
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
        id: note.note_id,
        title: note.note_name,
        sectionInfo: {
          sectionNumber: note.pdf_section_number,
          startPage: note.section_start_page,
          endPage: note.section_end_page
        },
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
      const notesQuery = `
        SELECT note_id, note_name, file_id, project_id, pdf_section_number, section_start_page, section_end_page
        FROM notes
        WHERE project_id = $1
        ORDER BY created_at DESC
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
          title: note.note_name,
          fileId: note.file_id,
          sectionInfo: {
            sectionNumber: note.pdf_section_number,
            startPage: note.section_start_page,
            endPage: note.section_end_page
          },
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
      pdfSectionNumber,
      sectionStartPage,
      sectionEndPage
    } = await request.json();
    
    console.log('POST /api/notes - Received data:', JSON.stringify({ 
      fileId, projectId, noteName, sectionInfo: { pdfSectionNumber, sectionStartPage, sectionEndPage },
      sectionCount: sections?.length 
    }));
    
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
    
    console.log('Executing note insert query with params:', noteParams);
    
    const noteResult = await client.query(noteQuery, noteParams);
    const noteId = noteResult.rows[0].note_id;
    
    console.log(`Created note with ID: ${noteId}`);
    
    // Add note sections
    const sectionPromises = sections.map(async (section, index) => {
      // Handle different content formats
      let contentValue = section.content;
      
      if (Array.isArray(contentValue)) {
        contentValue = contentValue.join('\n\n');
      } else if (typeof contentValue !== 'string' && contentValue !== null) {
        contentValue = String(contentValue);
      }
      
      const sectionQuery = `
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
        RETURNING section_id, title, description, content, expanded, order_index
      `;
      
      const sectionParams = [
        noteId, 
        section.title, 
        section.description || '', 
        contentValue || '', 
        index, 
        Boolean(section.expanded) || false
      ];
      
      try {
        const sectionResult = await client.query(sectionQuery, sectionParams);
        return sectionResult.rows[0];
      } catch (sectionError) {
        console.error(`Error creating section ${index}:`, sectionError);
        throw sectionError;
      }
    });

    try {
      const sectionsData = await Promise.all(sectionPromises);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Successfully created note with ${sectionsData.length} sections`);

      return NextResponse.json({
        id: noteId,
        sections: sectionsData,
        success: true,
      });
    } catch (sectionsError) {
      // If any section failed, rollback and report error
      console.error("Failed to create sections:", sectionsError);
      throw sectionsError;
    }
  } catch (error) {
    // Rollback in case of error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    
    // Log specific details about database errors
    if (error.code) {
      console.error(`Database error code: ${error.code}`);
      console.error(`Constraint: ${error.constraint || 'none'}`);
      console.error(`Detail: ${error.detail || 'none'}`);
      console.error(`Schema: ${error.schema || 'none'}`);
      console.error(`Table: ${error.table || 'none'}`);
    }
    
    console.error("Error saving note:", error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save note to database', 
        details: error instanceof Error ? error.message : String(error),
        code: error.code || 'unknown'
      },
      { status: 500 }
    );
  } finally {
    // Always release the client
    client.release();
  }
}