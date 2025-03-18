// File: /app/api/notes/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Funkcja pomocnicza do wykonywania zapytań z ponownymi próbami
async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
        
      console.error(`Próba ${attempt}/${maxRetries} nie powiodła się:`, error);
      lastError = error;
      
      // Jeśli to nie ostatnia próba, czekaj przed ponowną próbą
      if (attempt < maxRetries) {
        // Wykładniczy backoff - czekaj coraz dłużej przy kolejnych próbach
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError;
}

export async function POST(request: Request) {
  // Używamy jednego klienta dla całej operacji
  const client = await pool.connect();
  
  try {
    const { fileId, projectId, noteName, sections } = await request.json();
    
    if (!fileId || !projectId || !noteName || !sections) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól: fileId, projectId, noteName i sections są wymagane' },
        { status: 400 }
      );
    }

    // Rozpocznij transakcję
    await client.query('BEGIN');

    // Utwórz nową notatkę w bazie danych
    const noteResult = await executeWithRetry(() => 
      client.query(
        `INSERT INTO notes (file_id, project_id, note_name, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         RETURNING note_id`,
        [fileId, projectId, noteName]
      )
    );
    
    const noteId = noteResult.rows[0].note_id;
    
    // Dodaj sekcje notatki
    const sectionPromises = sections.map(async (section, index) => {
      // Sprawdź czy content jest tablicą i przekształć go na string jeśli tak
      let contentValue = section.content;
      
      if (Array.isArray(contentValue)) {
        contentValue = contentValue.join('\n\n');
      } else if (typeof contentValue !== 'string' && contentValue !== null) {
        contentValue = String(contentValue);
      }
      
      const sectionResult = await executeWithRetry(() => 
        client.query(
          `INSERT INTO note_section (note_id, title, description, content, order_index, expanded, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
           RETURNING section_id, title, description, content, expanded, order_index`,
          [
            noteId, 
            section.title, 
            section.description || '', 
            contentValue, 
            index, 
            Boolean(section.expanded) || false
          ]
        )
      );
      
      return sectionResult.rows[0];
    });

    const sectionsData = await Promise.all(sectionPromises);
    
    // Zatwierdź transakcję
    await client.query('COMMIT');

    return NextResponse.json({
      id: noteId,
      sections: sectionsData,
      success: true,
    });
  } catch (error) {
    // Wycofaj transakcję w przypadku błędu
    await client.query('ROLLBACK');
    
    console.error("Błąd zapisywania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się zapisać notatki w bazie danych', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    // Zawsze zwolnij klienta
    client.release();
  }
}

// Pobieranie notatki po file_id lub wszystkich notatek dla project_id
export async function GET(request: Request) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    
    // Jeśli podano projectId, pobieramy wszystkie notatki dla projektu
    if (projectId) {
      // 1. Pobierz wszystkie notatki dla projektu
      const notesQuery = `
        SELECT note_id, note_name, file_id, project_id
        FROM notes
        WHERE project_id = $1
      `;
      
      const notesResult = await client.query(notesQuery, [parseInt(projectId)]);
      
      if (notesResult.rows.length === 0) {
        return NextResponse.json([], { status: 200 }); // Zwróć pustą tablicę, jeśli nie ma notatek
      }
      
      // 2. Dla każdej notatki:
      // a) Pobierz jej sekcje
      // b) Pobierz informacje o pliku bezpośrednio z projektu
      const notesWithSectionsPromises = notesResult.rows.map(async (note) => {
        // Pobierz sekcje dla tej notatki
        const sectionsQuery = `
          SELECT section_id, title, description, content, expanded, order_index 
          FROM note_section 
          WHERE note_id = $1 
          ORDER BY order_index ASC
        `;
        
        const sectionsResult = await client.query(sectionsQuery, [note.note_id]);
        
        // 3. Pobierz informacje o pliku z projektu
        // Zakładamy, że dostęp do plików jest w obiekcie project, który mamy w komponencie ProjectPage
        // Na potrzeby API zwracamy file_id jako identyfikator pliku, a nazwę pliku tworząc ją z ID
        // W interfejsie te informacje są dostępne
        
        // Format zgodny z ProjectNotes
        return {
          id: note.note_id,
          fileName: `File ID: ${note.file_id}`, // Nazwa pliku zostanie ustalona w komponencie na podstawie file_id
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
      
      // Wykonaj wszystkie zapytania równolegle
      const allNotes = await Promise.all(notesWithSectionsPromises);
      
      return NextResponse.json(allNotes);
    }
    // Oryginalna logika dla pojedynczego pliku
    else if (fileId) {
      // Pobierz notatkę powiązaną z danym plikiem
      const noteResult = await client.query(
        `SELECT note_id, note_name FROM notes WHERE file_id = $1 LIMIT 1`,
        [parseInt(fileId)]
      );

      if (noteResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Nie znaleziono notatki dla podanego pliku' },
          { status: 404 }
        );
      }

      const note = noteResult.rows[0];
      
      // Pobierz sekcje dla tej notatki
      const sectionsResult = await client.query(
        `SELECT section_id, title, description, content, expanded, order_index 
         FROM note_section 
         WHERE note_id = $1 
         ORDER BY order_index ASC`,
        [note.note_id]
      );

      // Przekształć dane do formatu używanego przez interfejs
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
    else {
      return NextResponse.json(
        { error: 'Brak wymaganego parametru: fileId lub projectId' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Błąd pobierania notatki:", error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać notatki z bazy danych', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    // Zawsze zwolnij klienta
    client.release();
  }
}