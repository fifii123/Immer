// app/api/tests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametry z URL
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    const projectOnly = searchParams.get('projectOnly');
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
    }
    
    // Pobierz dane projektu dla pliku
    const fileResult = await Pool.query(
      `SELECT project_id FROM attached_file WHERE file_id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const projectId = fileResult.rows[0].project_id;
    var result;
    // Pobierz testy z podziałem na te powiązane z plikiem i pozostałe z projektu
    if (projectOnly === 'true') {
      // Pobierz wszystkie testy z projektu
       result = await Pool.query(
        `SELECT test_id, test_name, content, created_at, question_type, score_mode, save_score, file_id,
         CASE WHEN file_id = $1 THEN true ELSE false END AS is_file_test
         FROM tests WHERE project_id = $2
         ORDER BY is_file_test DESC, created_at DESC`,
        [fileId, projectId]
      );
    } else {
      // Pobierz tylko testy dla konkretnego pliku
       result = await Pool.query(
        `SELECT test_id, test_name, content, created_at, question_type, score_mode, save_score, file_id,
         true AS is_file_test
         FROM tests WHERE file_id = $1
         ORDER BY created_at DESC`,
        [fileId]
      );
    }
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

// Dodaj metodę OPTIONS dla obsługi CORS i preflight requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}