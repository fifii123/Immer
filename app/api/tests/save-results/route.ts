import { NextRequest, NextResponse } from 'next/server';
import Pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Pobierz dane z ciała zapytania
    const body = await request.json();
    const { testId, userId, score, answers } = body;
    
    if (!testId || !userId || score === undefined || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing or invalid required parameters' }, 
        { status: 400 }
      );
    }
    
    // Sprawdź, czy test istnieje i czy ma włączone zapisywanie wyników
    const testResult = await Pool.query(
      `SELECT test_id, save_score FROM tests WHERE test_id = $1`,
      [testId]
    );
    
    if (testResult.rows.length === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }
    
    const { save_score } = testResult.rows[0];
    
    if (!save_score) {
      return NextResponse.json(
        { error: 'Saving results is disabled for this test' }, 
        { status: 400 }
      );
    }
    
    // Rozpocznij transakcję
    const client = await Pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Zapisz wynik testu
      const resultInsertResult = await client.query(
        `INSERT INTO test_results (test_id, user_id, score)
         VALUES ($1, $2, $3)
         RETURNING result_id`,
        [testId, userId, score]
      );
      
      const resultId = resultInsertResult.rows[0].result_id;
      
      // Zapisz odpowiedzi na pytania
      for (const answer of answers) {
        await client.query(
          `INSERT INTO test_answers (result_id, question_id, user_answer, is_correct, points)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            resultId,
            answer.question_id,
            answer.user_answer,
            answer.is_correct,
            answer.points
          ]
        );
      }
      
      // Zatwierdź transakcję
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        resultId,
        message: 'Test results saved successfully'
      });
    } catch (error) {
      // Wycofaj transakcję w przypadku błędu
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Zawsze zwolnij klienta
      client.release();
    }
  } catch (error) {
    console.error('Error saving test results:', error);
    return NextResponse.json(
      { error: 'Failed to save test results' }, 
      { status: 500 }
    );
  }
}