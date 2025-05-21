import { NextRequest, NextResponse } from 'next/server';
import Pool from '@/lib/db';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------- Typy ---------- */
type QuestionInput = {
  question: string;
  context?: string;
  correctAnswer: string;
};

type FeedbackItem = {
  grade: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  correctAnswer?: string;
};

/* ---------- Helfer: bezpieczne parsowanie JSON ---------- */
function tryParseJson(text: string): any | null {
  try {
    const s = text.indexOf('{');
    const e = text.lastIndexOf('}');
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

/* ---------- AI evaluation ---------- */
async function checkAnswersWithAI(
  questions: QuestionInput[],
  userAnswers: string[]
): Promise<FeedbackItem[]> {
  const items = questions.map((q, i) => ({
    question: q.question,
    context: q.context ?? '',
    correctAnswer: q.correctAnswer,
    userAnswer: userAnswers[i] ?? ''
  }));

  /* 📝 Prompt – pierwsze zdanie zawiera słowo json */
  const prompt = `Odpowiedz w formacie json zgodnie z poniższą strukturą:
{
  "results": [
    {
      "grade": "correct" | "partial" | "incorrect",
      "feedback": "krótka konstruktywna informacja",
      "correctAnswer": "tylko gdy grade ≠ 'correct'"
    }
  ]
}

Twoje zadanie: ocenić odpowiedzi studentów na pytania otwarte.

### Kryteria
* correct  – kluczowe idee, brak błędów merytorycznych  
* partial  – brak ≥1 ważnego aspektu LUB drobna nieścisłość  
* incorrect – błąd merytoryczny lub brak zrozumienia

### Pytania i odpowiedzi
${JSON.stringify(items, null, 2)}
`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Oceniaj dokładnie, ale motywująco. Zwięźle! Pamiętaj: odpowiedź musi być w formacie json.'
        },
        { role: 'user', content: prompt }
      ]
    });

    const raw = resp.choices?.[0]?.message?.content ?? '';
    console.debug('🧠 AI raw content:', raw);

    if (!raw) throw new Error('Empty response from OpenAI');

    const parsed = tryParseJson(raw);
    console.debug('✅ Parsed JSON:', parsed);

    /* --- Akceptujemy dwa warianty: Array lub { results: Array } --- */
    if (Array.isArray(parsed)) {
      return parsed as FeedbackItem[];
    }
    if (Array.isArray(parsed?.results)) {
      return parsed.results as FeedbackItem[];
    }
    throw new Error('Invalid JSON shape');
  } catch (err) {
    console.error('AI evaluation error:', err);
    /* Fallback – wszystkie jako incorrect */
    return questions.map((q) => ({
      grade: 'incorrect',
      feedback:
        'Nie udało się ocenić z powodu błędu technicznego. Spróbuj ponownie.',
      correctAnswer: q.correctAnswer
    }));
  }
}

/* ---------- POST /api/tests/check-answers ---------- */
export async function POST(request: NextRequest) {
  try {
    /* 1. Walidacja wejścia */
    const body = await request.json();
    const { testId, userId, questions, answers } = body;

    if (
      !testId ||
      !userId ||
      !Array.isArray(questions) ||
      !Array.isArray(answers) ||
      questions.length !== answers.length
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters' },
        { status: 400 }
      );
    }

    /* 2. Weryfikacja testu */
    const testRes = await Pool.query(
      'SELECT question_type FROM tests WHERE test_id = $1',
      [testId]
    );
    if (testRes.rowCount === 0)
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    if (testRes.rows[0].question_type !== 'open_ended')
      return NextResponse.json(
        { error: 'This endpoint is for open-ended tests only' },
        { status: 400 }
      );

    /* 3. Ocena AI */
    const feedback = await checkAnswersWithAI(
      questions as QuestionInput[],
      answers as string[]
    );

    /* 4. Punktacja */
    let rawScore = 0;
    let correct = 0;
    let partial = 0;
    let incorrect = 0;

    for (const f of feedback) {
      if (f.grade === 'correct') {
        rawScore += 1;
        correct += 1;
      } else if (f.grade === 'partial') {
        rawScore += 0.5;
        partial += 1;
      } else incorrect += 1;
    }

    const score = Math.round((rawScore / questions.length) * 100);

    return NextResponse.json({
      feedback,
      stats: { correct, partial, incorrect, total: questions.length },
      score // procent
    });
  } catch (err) {
    console.error('Error in POST /check-answers:', err);
    return NextResponse.json(
      { error: 'Failed to check answers' },
      { status: 500 }
    );
  }
}
