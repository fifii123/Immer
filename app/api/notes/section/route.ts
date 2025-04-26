// app/api/notes/section/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// PATCH metoda już istnieje - dodajemy metodę GET
export async function GET(request: Request) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const sectionNumber = searchParams.get('sectionNumber');
    
    if (!fileId || !sectionNumber) {
      return NextResponse.json(
        { error: 'Brakuje parametrów fileId lub sectionNumber' },
        { status: 400 }
      );
    }

    // Sprawdź, czy istnieje notatka dla tej sekcji pliku
    const query = `
      SELECT n.note_id, n.note_name
      FROM notes n
      WHERE n.file_id = $1 AND n.note_metadata->>'sectionNumber' = $2
      LIMIT 1
    `;
    
    // Jeśli note_metadata nie istnieje, można użyć alternatywnego zapytania:
    const fallbackQuery = `
      SELECT n.note_id, n.note_name
      FROM notes n
      WHERE n.file_id = $1 AND n.note_name LIKE $2
      LIMIT 1
    `;
    
    let result;
    
    try {
      // Próbuj głównego zapytania
      result = await client.query(query, [fileId, sectionNumber]);
    } catch (e) {
      // Jeśli nie ma kolumny note_metadata, użyj zapytania alternatywnego
      result = await client.query(fallbackQuery, [fileId, `%Sekcja ${sectionNumber}%`]);
    }
    
    if (result.rows.length === 0) {
      // Nie znaleziono notatki dla tej sekcji
      return NextResponse.json({ 
        exists: false,
        noteId: null 
      });
    }
    
    // Zwróć ID znalezionej notatki
    return NextResponse.json({ 
      exists: true, 
      noteId: result.rows[0].note_id
    });
  } catch (error) {
    console.error("Błąd pobierania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać notatki dla sekcji' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}