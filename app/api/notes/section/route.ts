// app/api/notes/section/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const sectionNumber = searchParams.get('sectionNumber');

    // Walidacja parametrów
    if (!fileId || !sectionNumber) {
      return NextResponse.json(
        { error: 'Brakuje parametrów fileId lub sectionNumber' },
        { status: 400 }
      );
    }

    const numericFileId = parseInt(fileId, 10);
    const cleanSectionNumber = sectionNumber.replace(/[^0-9]/g, '');

    let note;
    
    try {
      // Próba 1: Wyszukaj przez note_metadata (nowy format)
      note = await prisma.$queryRaw`
        SELECT 
          note_id as "note_id", 
          note_name as "note_name"
        FROM notes
        WHERE 
          file_id = ${numericFileId} AND
          note_metadata->>'sectionNumber' = ${cleanSectionNumber}
        LIMIT 1
      `;
    } catch (error) {
      // Jeśli błąd związany z nieistniejącą kolumną, przejdź do metody alternatywnej
      if (error.code === '42703') {
        note = await prisma.notes.findFirst({
          where: {
            file_id: numericFileId,
            note_name: {
              contains: `Sekcja ${cleanSectionNumber}`,
              mode: 'insensitive'
            }
          },
          select: {
            note_id: true
          }
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      exists: !!note,
      noteId: note?.note_id || null
    });

  } catch (error) {
    console.error("Błąd pobierania notatki:", error);
    return NextResponse.json(
      { 
        error: 'Nie udało się pobrać notatki dla sekcji',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
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