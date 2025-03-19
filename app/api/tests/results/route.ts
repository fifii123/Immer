import { NextRequest, NextResponse } from 'next/server';
import Pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametry z URL
    const searchParams = request.nextUrl.searchParams;
    const testId = searchParams.get('testId');
    const userId = searchParams.get('userId');
    
    if (!testId) {
      return NextResponse.json({ error: 'Missing testId parameter' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }
    
    // Pobierz ostatni wynik testu dla użytkownika
    const resultQuery = `
      SELECT tr.result_id, tr.score, tr.taken_at
      FROM test_results tr
      WHERE tr.test_id = $1 AND tr.user_id = $2
      ORDER BY tr.taken_at DESC
      LIMIT 1
    `;
    
    const resultData = await Pool.query(resultQuery, [testId, userId]);
    
    if (resultData.rows.length === 0) {
      return NextResponse.json({ 
        exists: false,
        message: 'No test results found' 
      });
    }
    
    const result = resultData.rows[0];
    
    // Pobierz odpowiedzi
    const answersQuery = `
      SELECT question_id, user_answer, is_correct, points
      FROM test_answers
      WHERE result_id = $1
      ORDER BY question_id
    `;
    
    const answersData = await Pool.query(answersQuery, [result.result_id]);
    
    // Pobierz pytania z testu
    const testQuery = `
      SELECT content
      FROM tests
      WHERE test_id = $1
    `;
    
    const testData = await Pool.query(testQuery, [testId]);
    
    if (testData.rows.length === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }
    
    let testContent;
    try {
      testContent = JSON.parse(testData.rows[0].content);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid test content format' }, { status: 500 });
    }
    
    // Przygotuj odpowiedź z pełnymi danymi
    const response = {
      exists: true,
      resultId: result.result_id,
      score: result.score,
      takenAt: result.taken_at,
      answers: answersData.rows,
      // Przygotuj feedback dla każdej odpowiedzi
      feedback: answersData.rows.map(answer => {
        const question = testContent.questions[answer.question_id];
        if (!question) return null;
        
        return {
          isCorrect: answer.is_correct,
          feedback: answer.is_correct 
            ? "Poprawna odpowiedź" 
            : `Niepoprawna odpowiedź`,
          correctAnswer: question.correctAnswer
        };
      })
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching test results:', error);
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 });
  }
}