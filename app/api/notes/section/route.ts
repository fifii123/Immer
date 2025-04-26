// app/api/notes/section/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET endpoint to check for section-specific notes
export async function GET(request: Request) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const sectionNumber = searchParams.get('sectionNumber');
    
    if (!fileId || !sectionNumber) {
      return NextResponse.json(
        { error: 'Missing fileId or sectionNumber parameter' },
        { status: 400 }
      );
    }

    // Convert parameters to numbers
    const fileIdNum = parseInt(fileId);
    const sectionNumberNum = parseInt(sectionNumber);
    
    if (isNaN(fileIdNum) || isNaN(sectionNumberNum)) {
      return NextResponse.json(
        { error: 'Invalid fileId or sectionNumber format' },
        { status: 400 }
      );
    }
    
    // Find note for this specific section using the pdf_section_number field
    const query = `
      SELECT note_id, note_name 
      FROM notes 
      WHERE file_id = $1 AND pdf_section_number = $2
      LIMIT 1
    `;
    
    const result = await client.query(query, [fileIdNum, sectionNumberNum]);
    
    // If note exists for this section, return its ID
    if (result.rows.length > 0) {
      return NextResponse.json({
        exists: true,
        id: result.rows[0].note_id,
        name: result.rows[0].note_name
      });
    }
    
    // No note found for this section
    return NextResponse.json({
      exists: false,
      message: 'No note found for this section'
    });
  } catch (error) {
    console.error("Error fetching section note:", error);
    return NextResponse.json(
      { error: 'Failed to fetch section note' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PATCH endpoint to update a section
export async function PATCH(request: Request) {
  const client = await pool.connect();
  
  try {
    const { sectionId, data } = await request.json();
    
    // Validation
    if (!sectionId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: sectionId or data' },
        { status: 400 }
      );
    }

    // Start transaction
    await client.query('BEGIN');
    
    // Update section
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    // Build dynamic update query based on provided fields
    for (const [key, value] of Object.entries(data)) {
      if (['title', 'description', 'content', 'expanded', 'order_index'].includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no valid fields were provided, return error
    if (updateFields.length === 1) { // Only updated_at was added
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Execute the update
    const updateQuery = `
      UPDATE note_section
      SET ${updateFields.join(', ')}
      WHERE section_id = $${paramIndex}
      RETURNING section_id, title, description, content, expanded, order_index
    `;
    
    updateValues.push(sectionId);
    
    const updateResult = await client.query(updateQuery, updateValues);
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Also update the note's updated_at timestamp
    const noteQuery = `
      UPDATE notes
      SET updated_at = NOW()
      WHERE note_id = (
        SELECT note_id 
        FROM note_section 
        WHERE section_id = $1
      )
      RETURNING note_id
    `;
    
    const noteResult = await client.query(noteQuery, [sectionId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      section: updateResult.rows[0],
      noteUpdated: noteResult.rows.length > 0
    });
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    
    console.error("Error updating section:", error);
    return NextResponse.json(
      { 
        error: 'Failed to update section',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}