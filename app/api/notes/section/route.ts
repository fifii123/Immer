// File: /app/api/notes/section/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const { sectionId, data } = await request.json();
    
    if (!sectionId) {
      return NextResponse.json(
        { error: 'Brak wymaganego pola sectionId' },
        { status: 400 }
      );
    }

    // Aktualizuj sekcję notatki
    const updatedSection = await prisma.note_section.update({
      where: {
        section_id: sectionId
      },
      data: {
        ...data,
        updated_at: new Date()
      }
    });

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error("Błąd aktualizacji sekcji notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się zaktualizować sekcji notatki' },
      { status: 500 }
    );
  }
}