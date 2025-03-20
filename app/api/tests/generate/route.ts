import { NextRequest, NextResponse } from 'next/server';
import  Pool  from '@/lib/db';
import { OpenAI } from 'openai';

// Inicjalizacja klienta OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
     
    // Pobierz dane z ciała zapytania
    const body = await request.json();
    const { 
      fileId, 
      projectId, 
      testName, 
      questionType = 'multiple_choice', 
      questionCount = 5,
      optionsCount = 4, 
      difficulty = 2,
      saveScore = false,
      noteId = null
    } = body;
    
    if (!fileId || !projectId || !testName) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }
    
    // Pobierz text z pliku PDF
    const extractedText = await extractPdfText(fileId);
    
    // Pobierz zawartość notatki, jeśli istnieje
    let noteContent = '';
    if (noteId) {
      noteContent = await getNoteContent(noteId);
    }
    
    // Wygeneruj test używając AI w zależności od typu pytań
    let testContent;
    if (questionType === 'multiple_choice') {
      testContent = await generateMultipleChoiceTestWithAI(
        extractedText,
        noteContent,
        questionCount,
        optionsCount,
        difficulty
      );
    } else if (questionType === 'open_ended') {
      testContent = await generateOpenEndedTestWithAI(
        extractedText,
        noteContent,
        questionCount,
        difficulty
      );
    } else {
      return NextResponse.json(
        { error: 'Unsupported question type' }, 
        { status: 400 }
      );
    }
    
    // Zapisz test w bazie danych
    const result = await Pool.query(
      `INSERT INTO tests (project_id, test_name, content, question_type, save_score, file_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING test_id, test_name, content, created_at, question_type, save_score, file_id`,
      [projectId, testName, testContent, questionType, saveScore, fileId]
    );
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating test:', error);
    return NextResponse.json(
      { error: 'Failed to generate test' }, 
      { status: 500 }
    );
  }
}

// Funkcja do ekstrakcji tekstu z PDF
async function extractPdfText(fileId: number): Promise<string> {
  try {
    // Pobierz ścieżkę do pliku
    const fileResult = await Pool.query(
      `SELECT file_path, file_name FROM attached_file WHERE file_id = $1`,
      [fileId]
    );
    
    if (fileResult.rows.length === 0) {
      throw new Error('File not found');
    }
    
    const { file_path, file_name } = fileResult.rows[0];
    
    // Na potrzeby przykładu, zamiast faktycznej ekstrakcji tekstu z pliku PDF,
    // pobierzmy dane sekcji notatek związanych z tym plikiem jako źródło treści
    const notesSectionsResult = await Pool.query(
      `SELECT ns.title, ns.description, ns.content
       FROM note_section ns
       JOIN notes n ON ns.note_id = n.note_id
       WHERE n.file_id = $1
       ORDER BY ns.order_index`,
      [fileId]
    );
    
    // Skompiluj tekst z sekcji notatek
    let extractedText = `Treść dokumentu: ${file_name}\n\n`;
    
    notesSectionsResult.rows.forEach(section => {
      extractedText += `## ${section.title}\n`;
      if (section.description) {
        extractedText += `${section.description}\n`;
      }
      if (section.content) {
        extractedText += `${section.content}\n\n`;
      }
    });
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return '';
  }
}

// Funkcja do pobierania zawartości notatek
async function getNoteContent(noteId: string): Promise<string> {
  try {
    // Pobierz sekcje notatek
    const notesSectionsResult = await Pool.query(
      `SELECT title, description, content
       FROM note_section
       WHERE note_id = $1
       ORDER BY order_index`,
      [noteId]
    );
    
    // Skompiluj tekst z sekcji notatek
    let noteContent = '';
    
    notesSectionsResult.rows.forEach(section => {
      noteContent += `## ${section.title}\n`;
      if (section.description) {
        noteContent += `${section.description}\n`;
      }
      if (section.content) {
        noteContent += `${section.content}\n\n`;
      }
    });
    
    return noteContent;
  } catch (error) {
    console.error('Error getting note content:', error);
    return '';
  }
}

// Funkcja do generowania testu zamkniętego przy użyciu AI
async function generateMultipleChoiceTestWithAI(
  documentText: string,
  noteContent: string,
  questionCount: number,
  optionsCount: number,
  difficulty: number
): Promise<string> {
  try {
    // Dostosuj prompt na podstawie trudności
    const difficultyLevel = 
      difficulty === 1 ? 'podstawowe (dla początkujących)' :
      difficulty === 2 ? 'średnie (wymagające zrozumienia tekstu)' :
      'zaawansowane (wymagające analizy i syntezy informacji)';
    
    // Przygotuj prompt dla AI
    const prompt = `Wygeneruj test z ${questionCount} pytaniami jednokrotnego wyboru (multiple choice) na podstawie poniższego tekstu. 
Pytania powinny być na poziomie trudności: ${difficultyLevel}.

Dla każdego pytania:
1. Sformułuj jasne, konkretne pytanie.
2. Stwórz dokładnie ${optionsCount} odpowiedzi, z których tylko jedna jest poprawna.
3. Wskaż, która odpowiedź jest poprawna.
4. Dodaj krótkie wyjaśnienie, dlaczego ta odpowiedź jest poprawna (będzie pokazane użytkownikowi po udzieleniu odpowiedzi).
5. Opcjonalnie dodaj kontekst pytania, jeśli potrzebny.

Ważne wskazówki:
- Upewnij się, że wszystkie odpowiedzi są wiarygodne i gramatycznie spójne z pytaniem.
- Niepoprawne odpowiedzi powinny być logiczne i nie powinny być zbyt łatwe do odrzucenia.
- Unikaj odpowiedzi typu "wszystkie powyższe" lub "żadne z powyższych".
- Pytania powinny testować zrozumienie, a nie tylko pamięć faktów.

Treść do analizy składa się z treści dokumentu i notatek:

${documentText}

${noteContent ? 'Notatki do dokumentu:\n' + noteContent : ''}

Zwróć odpowiedź w formacie JSON z następującą strukturą:
{
  "questions": [
    {
      "question": "Treść pytania",
      "context": "Opcjonalny kontekst lub fragment tekstu",
      "options": ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C", "Odpowiedź D"],
      "correctAnswer": "Prawidłowa odpowiedź (identyczna jak jedna z opcji)",
      "explanation": "Wyjaśnienie, dlaczego ta odpowiedź jest poprawna"
    },
    ...
  ]
}`;

    // Wywołaj API OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // lub inny dostępny model
      messages: [
        { 
          role: "system", 
          content: "Jesteś ekspertem w tworzeniu edukacyjnych testów zamkniętych. Twoje zadanie to generowanie wysokiej jakości pytań testowych z kilkoma opcjami odpowiedzi na podstawie dostarczonych materiałów."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    
    // Walidacja wyniku
    if (!content) {
      throw new Error('No content generated by AI');
    }
    
    // Parsuj i waliduj strukturę JSON
    const parsedContent = JSON.parse(content);
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error('Invalid response format from AI');
    }
    
    return content;
  } catch (error) {
    console.error('Error generating multiple choice test with AI:', error);
    throw new Error('Failed to generate multiple choice test with AI');
  }
}

// Funkcja do generowania testu otwartego przy użyciu AI
async function generateOpenEndedTestWithAI(
  documentText: string,
  noteContent: string,
  questionCount: number,
  difficulty: number
): Promise<string> {
  try {
    // Dostosuj prompt na podstawie trudności
    const difficultyLevel = 
      difficulty === 1 ? 'podstawowe (dla początkujących)' :
      difficulty === 2 ? 'średnie (wymagające zrozumienia tekstu)' :
      'zaawansowane (wymagające analizy i syntezy informacji)';
    
    // Przygotuj prompt dla AI
    const prompt = `Wygeneruj test z ${questionCount} pytaniami otwartymi na podstawie poniższego tekstu. 
Pytania powinny być na poziomie trudności: ${difficultyLevel}.

Dla każdego pytania:
1. Sformułuj jasne, konkretne pytanie.
2. Opcjonalnie dodaj kontekst pytania jeśli jest potrzebny.
3. Podaj przykładową poprawną odpowiedź, która będzie używana jako wzorzec do oceny odpowiedzi użytkownika.

Treść do analizy składa się z treści dokumentu i notatek:

${documentText}

${noteContent ? 'Notatki do dokumentu:\n' + noteContent : ''}

Zwróć odpowiedź w formacie JSON z następującą strukturą:
{
  "questions": [
    {
      "question": "Treść pytania",
      "context": "Opcjonalny kontekst lub fragment tekstu",
      "correctAnswer": "Przykładowa poprawna odpowiedź"
    },
    ...
  ]
}`;

    // Wywołaj API OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview", // lub inny dostępny model
      messages: [
        { 
          role: "system", 
          content: "Jesteś ekspertem w tworzeniu testów edukacyjnych. Twoje zadanie to generowanie wysokiej jakości pytań na podstawie dostarczonych materiałów."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    
    // Walidacja wyniku
    if (!content) {
      throw new Error('No content generated by AI');
    }
    
    // Parsuj i waliduj strukture JSON
    const parsedContent = JSON.parse(content);
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error('Invalid response format from AI');
    }
    
    return content;
  } catch (error) {
    console.error('Error generating open-ended test with AI:', error);
    throw new Error('Failed to generate open-ended test with AI');
  }
}