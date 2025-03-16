// File: /app/api/notes/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { fileId, projectId, noteName, sections } = await request.json();
    
    if (!fileId || !projectId || !noteName || !sections) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: fileId, projectId, noteName i sections są wymagane' },
        { status: 400 }
      );
    }

    // Utwórz nową notatkę w bazie danych
    const newNote = await prisma.notes.create({
      data: {
        file_id: fileId,
        project_id: projectId,
        note_name: noteName,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Dodaj sekcje notatki
    const noteSections = await Promise.all(
      sections.map((section, index) => 
        prisma.note_section.create({
          data: {
            note_id: newNote.note_id,
            title: section.title,
            description: section.description || '',
            content: section.content || '',
            order_index: index,
            expanded: section.expanded || false,
          },
        })
      )
    );

    return NextResponse.json({
      id: newNote.note_id,
      sections: noteSections,
      success: true,
    });
  } catch (error) {
    console.error("Błąd zapisywania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się zapisać notatki w bazie danych' },
      { status: 500 }
    );
  }
}

// Pobieranie notatki po file_id
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Brak wymaganego parametru fileId' },
        { status: 400 }
      );
    }

    // Pobierz notatkę powiązaną z danym plikiem
    const note = await prisma.notes.findFirst({
      where: {
        file_id: parseInt(fileId)
      },
      include: {
        note_section: {
          orderBy: {
            order_index: 'asc'
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Nie znaleziono notatki dla podanego pliku' },
        { status: 404 }
      );
    }

    // Przekształć dane do formatu używanego przez interfejs
    const formattedNote = {
      id: `note_${note.note_id}`,
      title: note.note_name,
      sections: note.note_section.map(section => ({
        id: section.section_id,
        title: section.title,
        description: section.description || '',
        content: section.content || '',
        expanded: section.expanded || false
      }))
    };

    return NextResponse.json(formattedNote);
  } catch (error) {
    console.error("Błąd pobierania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać notatki z bazy danych' },
      { status: 500 }
    );
  }
}