import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const noteId = parseInt(params.id);
    
    // Get the note
    const note = await prisma.notes.findUnique({
      where: {
        note_id: noteId
      }
    });
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Get the sections for this note
    const sections = await prisma.thematic_section.findMany({
      where: {
        note_id: noteId
      },
      orderBy: {
        order_index: 'asc'
      }
    });
    
    // Return the note with its sections
    return NextResponse.json({
      ...note,
      sections: sections
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}