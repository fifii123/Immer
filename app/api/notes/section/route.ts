// app/api/notes/section/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        noteId: result.rows[0].note_id,
        noteName: result.rows[0].note_name
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
export async function PATCH(request: Request) {
  try {
    const { sectionId, data } = await request.json();
    
    // Walidacja
    if (!sectionId || !data) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: sectionId lub data' },
        { status: 400 }
      );
    }

    // Aktualizacja z użyciem transakcji
    const result = await prisma.$transaction([
      prisma.note_section.update({
        where: { section_id: sectionId },
        data: {
          ...data,
          updated_at: new Date()
        }
      }),
      prisma.notes.updateMany({
        where: { note_sections: { some: { section_id: sectionId } } },
        data: { updated_at: new Date() }
      })
    ]);

    return NextResponse.json({
      success: true,
      section: result[0],
      parentNoteUpdated: result[1].count > 0
    });

  } catch (error) {
    console.error("Błąd aktualizacji sekcji:", error);
    return NextResponse.json(
      { 
        error: 'Aktualizacja nie powiodła się',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}