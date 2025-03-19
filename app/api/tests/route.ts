import { NextRequest, NextResponse } from 'next/server';
import  Pool  from '@/lib/db';


export async function GET(request: NextRequest) {
  try {

    // Pobierz parametry z URL
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    
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
    
    // Pobierz testy powiązane z projektem
    const result = await Pool.query(
      `SELECT test_id, test_name, content, created_at, question_type, score_mode, save_score 
       FROM tests 
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}