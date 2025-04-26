// TODO: test / note deletion, full-on testing

"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePreferences } from "@/context/preferences-context";
import { useParams } from "next/navigation";
import { useUserId } from '@/hooks/useAuthApi';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

// Importuj style dla podświetlania składni
import 'highlight.js/styles/github.css';
import MarkdownContent from '@/components/MarkdownContent';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Languages,
  Bookmark,
  Search,
  RefreshCw,
  Download,
  Maximize2,
  Type,
  MessageSquare,
  Check,
  Globe,
  Layers,
  ChevronDown
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import { useToast } from "@/components/ui/use-toast"
// Set up worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Import the hook you provided
import { usePdfFile } from "@/hooks/use-pdf-file";
import { useProjects } from "@/context/projects-context";

// Define available rendering methods
type RenderMethod = 'pdf.js' | 'iframe' | 'embed' | 'object';

interface PDFReaderProps {
  fileUrl: string;  
  fileName: string;
  fileId: number;
  onClose: () => void;
}



export default function PDFReader({ fileUrl, fileName, fileId, onClose }: PDFReaderProps) {
  const { darkMode, t } = usePreferences();
  const userId = useUserId();
  // PDF states
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [showTools, setShowTools] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [usingDirectUrl, setUsingDirectUrl] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  // New state for the rendering method
  const [renderMethod, setRenderMethod] = useState<RenderMethod>('pdf.js');
  const MAX_RETRIES = 3;
  const {projects} = useProjects();
  const documentRef = useRef<HTMLDivElement>(null);
  // Ref do śledzenia aktualnie renderowanych stron
  const pagesRef = useRef<{ [pageNumber: number]: HTMLDivElement }>({});
  const autoGenerationAttemptedRef = useRef(false);
  const params = useParams();
  // Determine if we're using native browser rendering (vs PDF.js)
  const usingNativeRenderer = renderMethod !== 'pdf.js';
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [highlightedSectionId, setHighlightedSectionId] = useState<number | null>(null);
  // Reference for scrolling to sections
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const { toast } = useToast()
  // Use the custom hook to get the signed URL
  const { signedUrl, loading, error, retry } = usePdfFile({ 
    fileId: typeof fileId === 'number' ? fileId : -1, 
    fileUrl 
  });
  const [retryCount, setRetryCount] = useState(0);

  
  // Detekcja urządzeń o wysokiej gęstości pikseli
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const project = projects.find((p) => p.project_id.toString() === params.id);


// Section editing states
// Update this state declaration
const [editingSection, setEditingSection] = useState<null | {
  id: number;
  action: 'expand' | 'format' | 'custom' | 'confirm' | 'confirm_new'; // Add 'confirm_new'
  prompt?: string; 
  result?: string;
  // Add these new properties for the expanded functionality
  noteId?: number;
  title?: string;
  description?: string;
  orderIndex?: number;
  currentContent?: string;
}>(null);

// Find this type definition for the note state

//// tests
const [isCheckingAnswers, setIsCheckingAnswers] = useState(false);
const [expandedQuestions, setExpandedQuestions] = useState<boolean[]>([]);
const toggleQuestionExpand = (index: number) => {
  const newExpandedState = [...expandedQuestions];
  newExpandedState[index] = !newExpandedState[index];
  setExpandedQuestions(newExpandedState);
};
// Stan do zarządzania testami
const getInProgressTestStateKey = (testId) => `test_in_progress_${testId}`;
const [tests, setTests] = useState<Array<{
  test_id: number;
  test_name: string;
  question_type: string;
  created_at: string;
  content: string;
  save_score: boolean;
}>>([]);
// Flaga wskazująca, czy test ma zapisane wyniki w bazie danych
const [testHasResults, setTestHasResults] = useState(false);

// Flaga wskazująca, czy test jest w trakcie rozwiązywania
const [testInProgress, setTestInProgress] = useState(false);
const [selectedTest, setSelectedTest] = useState<any>(null);
const [isTestGenerationDialogOpen, setIsTestGenerationDialogOpen] = useState(false);
const [isGeneratingTest, setIsGeneratingTest] = useState(false);
const [isStartingTest, setIsStartingTest] = useState(false);
const [takingTest, setTakingTest] = useState(false);
const [testConfig, setTestConfig] = useState({
  name: '',
  questionType: 'multiple_choice', // domyślny typ: zamknięte
  questionCount: 5,
  optionsCount: 4, // tylko dla pytań zamkniętych
  difficulty: 2,
  saveScore: false
});

// Zmienne stanu dla pytań zamkniętych
const [currentMultipleChoiceQuestions, setCurrentMultipleChoiceQuestions] = useState<Array<{
  question: string;
  context?: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}>>([]);

// Zmienne stanu dla pytań otwartych
const [currentOpenEndedQuestions, setCurrentOpenEndedQuestions] = useState<Array<{
  question: string;
  context?: string;
  correctAnswer: string;
}>>([]);

// Wspólne zmienne stanu dla obu typów testów
const [userAnswers, setUserAnswers] = useState<string[]>([]);
const [answerFeedback, setAnswerFeedback] = useState<Array<{
  isCorrect: boolean;
  feedback: string;
  correctAnswer?: string;
} | null>>([]);
const [testSubmitted, setTestSubmitted] = useState(false);
const [testScore, setTestScore] = useState(0);


//// tests \\\\



const [customPrompt, setCustomPrompt] = useState('');
const [isProcessingAction, setIsProcessingAction] = useState(false);


  const pulseAnimation = `
  @keyframes pulse-highlight {
    0% { background-color: rgba(59, 130, 246, 0); }
    30% { background-color: rgba(59, 130, 246, 0.15); }
    100% { background-color: rgba(59, 130, 246, 0); }
  }
  
  .section-highlight {
    animation: pulse-highlight 5.5s ease-in-out;
  }
`;

// TEST CREATION WILL BE IMPLEMENTED HERE //////////////////////////////////////////////////////////////////////////
const handleToggleTest = (test) => {
  // Jeśli test jest już wybrany, odznacz go
  if (selectedTest?.test_id === test.test_id) {
    setSelectedTest(null);
    setTestHasResults(false);
    setTestInProgress(false);
  } else {
    // W przeciwnym razie, wybierz ten test
    setSelectedTest(test);
    
    // Resetowanie stanów
    setUserAnswers([]);
    setAnswerFeedback([]);
    setTestSubmitted(false);
    setTakingTest(false);
    setCurrentMultipleChoiceQuestions([]);
    setCurrentOpenEndedQuestions([]);
    setTestHasResults(false);
    setTestInProgress(false);
    
    // Sprawdź tymczasowy stan testu
    const inProgressState = loadInProgressTestState(test.test_id);
    if (inProgressState && inProgressState.userAnswers.some(answer => answer)) {
      setTestInProgress(true);
    }
    
    // Sprawdź czy userId jest dostępne i pobierz wyniki testu
    if (userId) {
      fetchTestResults(test.test_id).then(results => {
        if (results.exists) {
          try {
            // Ustaw wynik testu
            setTestScore(results.score);
            setTestHasResults(true);
          } catch (error) {
            console.error("Błąd przetwarzania wyników testu:", error);
          }
        }
      }).catch(error => {
        console.error("Błąd podczas pobierania wyników testu:", error);
      });
    }
  }
};
const saveInProgressTestState = (testId, userAnswers) => {
  if (!testId) return;
  
  const testState = {
    testId,
    userAnswers,
    lastUpdated: Date.now()
  };
  
  localStorage.setItem(getInProgressTestStateKey(testId), JSON.stringify(testState));
};

// Funkcja wczytująca tymczasowy stan testu z localStorage
const loadInProgressTestState = (testId) => {
  if (!testId) return null;
  
  const storedState = localStorage.getItem(getInProgressTestStateKey(testId));
  if (!storedState) return null;
  
  try {
    return JSON.parse(storedState);
  } catch (error) {
    console.error("Błąd podczas wczytywania stanu testu:", error);
    return null;
  }
};

// Funkcja usuwająca tymczasowy stan testu (np. po ukończeniu testu)
const clearInProgressTestState = (testId) => {
  if (!testId) return;
  localStorage.removeItem(getInProgressTestStateKey(testId));
};

// Funkcja do pobierania wyników testu z bazy danych
const fetchTestResults = async (testId) => {
  try {
    // Sprawdź czy userId jest dostępne
    if (!userId) {
      console.warn("User ID not available. Cannot fetch test results.");
      return { exists: false };
    }
    
    // Wywołaj API z userId jako parametr zapytania
    const response = await fetch(`/api/tests/results?testId=${testId}&userId=${userId}`);
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Błąd pobierania wyników testu:", error);
    return { exists: false };
  }
};
// Funkcja pobierająca testy
const fetchTests = async () => {
  if (!fileId) return;
  
  try {
    const response = await fetch(`/api/tests?fileId=${fileId}`);
    
    if (response.ok) {
      const data = await response.json();
      setTests(data);
    }
  } catch (error) {
    console.error("Błąd pobierania testów:", error);
  }
};

// useEffect do pobierania testów po załadowaniu komponentu
useEffect(() => {
  if (fileId) {
    fetchTests();
  }
}, [fileId]);

// Funkcja zwracająca liczbę pytań w teście
const getTestQuestionCount = (test) => {
  if (!test || !test.content) return 0;
  
  try {
    const content = JSON.parse(test.content);
    return content.questions ? content.questions.length : 0;
  } catch (error) {
    console.error("Błąd parsowania zawartości testu:", error);
    return 0;
  }
};

// Funkcja obsługująca wybór testu
const handleSelectTest = (test) => {
  setSelectedTest(test);
  
  // Resetowanie stanów
  setUserAnswers([]);
  setAnswerFeedback([]);
  setTestSubmitted(false);
  setTakingTest(false);
  setCurrentMultipleChoiceQuestions([]);
  setCurrentOpenEndedQuestions([]);
  setTestHasResults(false);
  setTestInProgress(false);
  
  // Sprawdź tymczasowy stan testu
  const inProgressState = loadInProgressTestState(test.test_id);
  if (inProgressState && inProgressState.userAnswers.some(answer => answer)) {
    setTestInProgress(true);
  }
  
  // Sprawdź czy userId jest dostępne i pobierz wyniki testu
  if (userId) {
    fetchTestResults(test.test_id).then(results => {
      if (results.exists) {
        try {
          // Wczytaj zawartość testu
          const content = JSON.parse(test.content);
          if (content.questions && content.questions.length > 0) {
            if (test.question_type === 'multiple_choice') {
              setCurrentMultipleChoiceQuestions(content.questions);
            } else if (test.question_type === 'open_ended') {
              setCurrentOpenEndedQuestions(content.questions);
            }
            
            // Ustaw odpowiedzi i wyniki
            const userAnswersArray = new Array(content.questions.length).fill('');
            results.answers.forEach(answer => {
              if (answer.question_id >= 0 && answer.question_id < userAnswersArray.length) {
                userAnswersArray[answer.question_id] = answer.user_answer;
              }
            });
            
            setUserAnswers(userAnswersArray);
            setAnswerFeedback(results.feedback);
            setTestScore(results.score);
            setTestHasResults(true);
          }
        } catch (error) {
          console.error("Błąd przetwarzania zawartości testu:", error);
        }
      }
    }).catch(error => {
      console.error("Błąd podczas pobierania wyników testu:", error);
    });
  }
};

// Funkcja generująca test
const generateTest = async () => {
  setIsGeneratingTest(true);
  
  try {
    const response = await fetch('/api/tests/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId,
        projectId: project?.project_id,
        testName: testConfig.name,
        questionType: testConfig.questionType,
        questionCount: testConfig.questionCount,
        optionsCount: testConfig.optionsCount,
        difficulty: testConfig.difficulty,
        saveScore: testConfig.saveScore,
        noteId: note.id // Przekazywanie ID notatki, jeśli istnieje
      }),
    });
    
    if (!response.ok) {
      throw new Error('Nie udało się wygenerować testu');
    }
    
    const result = await response.json();
    
    // Dodanie nowo utworzonego testu do listy
    setTests(prevTests => [result, ...prevTests]);
    
    // Zamknięcie dialogu konfiguracji
    setIsTestGenerationDialogOpen(false);
    
    // Resetowanie konfiguracji
    setTestConfig({
      name: '',
      questionType: 'multiple_choice',
      questionCount: 5,
      optionsCount: 4,
      difficulty: 2,
      saveScore: false
    });
    
    // Powiadomienie o sukcesie
    toast({
      title: "Test wygenerowany",
      description: "Twój test został pomyślnie utworzony.",
    });
    
    // Wybierz nowo utworzony test
    handleSelectTest(result);
  } catch (error) {
    console.error("Błąd generowania testu:", error);
    toast({
      title: "Błąd generowania testu",
      description: error instanceof Error ? error.message : "Wystąpił problem z generowaniem testu.",
      variant: "destructive",
    });
  } finally {
    setIsGeneratingTest(false);
  }
};

// Funkcja rozpoczynająca test
const startTest = () => {
  if (!selectedTest || !selectedTest.content) return;
  
  try {
    const content = JSON.parse(selectedTest.content);
    if (!content.questions || !content.questions.length) {
      throw new Error('Brak pytań w teście');
    }
    
    // Resetuj wszystkie stany testu
    setIsCheckingAnswers(false);
    setTestSubmitted(false);
    setTestHasResults(false);
    
    // Ustawienie odpowiedniego typu pytań
    if (selectedTest.question_type === 'multiple_choice') {
      setCurrentMultipleChoiceQuestions(content.questions);
      setCurrentOpenEndedQuestions([]);
    } else if (selectedTest.question_type === 'open_ended') {
      setCurrentOpenEndedQuestions(content.questions);
      setCurrentMultipleChoiceQuestions([]);
    }
    
    // Użyj zapisanych odpowiedzi lub utwórz nowe puste odpowiedzi
    const savedState = loadInProgressTestState(selectedTest.test_id);
    if (savedState && !savedState.completed && savedState.userAnswers.length > 0) {
      setUserAnswers(savedState.userAnswers);
    } else {
      setUserAnswers(new Array(content.questions.length).fill(''));
    }
    
    // Inicjalizuj stan rozwijania - domyślnie wszystkie pytania rozwinięte
    setExpandedQuestions(new Array(content.questions.length).fill(true));
    
    // Wyraźnie ustaw stan wykonywania testu
    setAnswerFeedback(new Array(content.questions.length).fill(null));
    setTakingTest(true);
    setTestInProgress(true);
  } catch (error) {
    console.error("Błąd rozpoczynania testu:", error);
    toast({
      title: "Błąd rozpoczynania testu",
      description: "Nie można wczytać pytań. Format testu jest nieprawidłowy.",
      variant: "destructive",
    });
  }
};
// Funkcja obsługująca zmianę odpowiedzi
const handleAnswerChange = (index, value) => {
  const newAnswers = [...userAnswers];
  newAnswers[index] = value;
  setUserAnswers(newAnswers);
  
  // Zapisz tymczasowy stan testu w localStorage
  if (selectedTest) {
    saveInProgressTestState(selectedTest.test_id, newAnswers);
  }
};

// Funkcja sprawdzająca odpowiedzi dla testów zamkniętych
const handleSubmitMultipleChoiceTest = () => {
  // Sprawdzenie, czy wszystkie odpowiedzi zostały udzielone
  const unansweredQuestions = userAnswers.filter(answer => !answer).length;
  
  if (unansweredQuestions > 0) {
    toast({
      title: "Uzupełnij wszystkie odpowiedzi",
      description: `Nie odpowiedziano na ${unansweredQuestions} ${
        unansweredQuestions === 1 ? 'pytanie' : unansweredQuestions < 5 ? 'pytania' : 'pytań'
      }.`,
      variant: "warning",
    });
    return;
  }
  
  // Obliczanie wyniku
  let correctCount = 0;
  const feedback = [];
  
  for (let i = 0; i < currentMultipleChoiceQuestions.length; i++) {
    const isCorrect = userAnswers[i] === currentMultipleChoiceQuestions[i].correctAnswer;
    if (isCorrect) {
      correctCount++;
    }
    
    feedback.push({
      isCorrect,
      feedback: isCorrect 
        ? "Poprawna odpowiedź" 
        : `Niepoprawna odpowiedź. Wybrano: ${userAnswers[i]}`,
      correctAnswer: currentMultipleChoiceQuestions[i].correctAnswer
    });
  }
  
  const score = Math.round((correctCount / currentMultipleChoiceQuestions.length) * 100);
  
  // Ustaw stany interfejsu
  setTestScore(score);
  setAnswerFeedback(feedback);
  setTestSubmitted(true);
  setTestHasResults(true);
  
  // Usuń tymczasowy stan z localStorage
  clearInProgressTestState(selectedTest.test_id);
  
  // Zapisz wyniki w bazie danych
  saveTestResults(score, feedback);
};

// Funkcja sprawdzająca odpowiedzi dla testów otwartych
// Funkcja sprawdzająca odpowiedzi dla testów otwartych
const handleCheckOpenEndedAnswers = async () => {

  // Sprawdź czy userId jest dostępne
  if (!userId) {
    console.warn("User ID not available. Cannot check answers.");
    return;
  }
  
  // Sprawdzenie, czy wszystkie odpowiedzi zostały wprowadzone
  const unansweredQuestions = userAnswers.filter(answer => !answer.trim()).length;
  
  if (unansweredQuestions > 0) {
    toast({
      title: "Uzupełnij wszystkie odpowiedzi",
      description: `Nie odpowiedziano na ${unansweredQuestions} ${
        unansweredQuestions === 1 ? 'pytanie' : unansweredQuestions < 5 ? 'pytania' : 'pytań'
      }.`,
      variant: "warning",
    });
    return;
  }
  
  // Włącz stan ładowania
  setIsCheckingAnswers(true);
  
  try {
    // Pokaż toast informujący o sprawdzaniu odpowiedzi
    toast({
      title: "Sprawdzanie odpowiedzi",
      description: "Trwa analizowanie odpowiedzi przez AI. Może to potrwać do 30 sekund.",
    });
    
    const response = await fetch('/api/tests/check-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testId: selectedTest.test_id,
        userId,
        questions: currentOpenEndedQuestions,
        answers: userAnswers
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Nie udało się sprawdzić odpowiedzi');
    }
    
    const result = await response.json();
    
    // Ustawienie oceny i informacji zwrotnej
    setAnswerFeedback(result.feedback);
    setTestScore(result.score);
    setTestSubmitted(true);
    setTestHasResults(true);
    
    // Usuń tymczasowy stan z localStorage
    clearInProgressTestState(selectedTest.test_id);
    
    // Zapisz wyniki w bazie danych
    saveTestResults(result.score, result.feedback);
    
    // Pokaż toast z wynikiem
    toast({
      title: "Sprawdzanie zakończone",
      description: `Twój wynik: ${result.score}%. ${
        result.score >= 70 
          ? 'Dobra robota!' 
          : 'Przejrzyj informację zwrotną, aby dowiedzieć się więcej.'
      }`,
      variant: result.score >= 70 ? "default" : "warning",
    });
  } catch (error) {
    console.error("Błąd sprawdzania odpowiedzi:", error);
    toast({
      title: "Błąd sprawdzania odpowiedzi",
      description: error instanceof Error ? error.message : "Wystąpił problem ze sprawdzaniem odpowiedzi.",
      variant: "destructive",
    });
  } finally {
    // Zawsze wyłącz stan ładowania po zakończeniu
    setIsCheckingAnswers(false);
  }
};
// Funkcja zapisująca wyniki testu
const saveTestResults = async (score, feedback = null) => {
  try {
    // Sprawdź czy userId jest dostępne
    if (!userId) {
      console.warn("User ID not available. Cannot save test results.");
      return;
    }
    
    // Przygotowanie odpowiedzi do zapisu
    let answers;
    
    if (selectedTest.question_type === 'multiple_choice') {
      answers = currentMultipleChoiceQuestions.map((question, index) => ({
        question_id: index,
        user_answer: userAnswers[index],
        is_correct: userAnswers[index] === question.correctAnswer,
        points: userAnswers[index] === question.correctAnswer ? 1 : 0
      }));
    } else {
      // Dla pytań otwartych wykorzystujemy informację zwrotną
      answers = feedback.map((fb, index) => ({
        question_id: index,
        user_answer: userAnswers[index],
        is_correct: fb ? fb.isCorrect : false,
        points: fb && fb.isCorrect ? 1 : 0
      }));
    }
    
    // Wywołanie API do zapisu wyników
    const response = await fetch('/api/tests/save-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testId: selectedTest.test_id,
        userId, // Przekazanie userId w ciele zapytania
        score,
        answers
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Nie udało się zapisać wyników testu');
    }
    
    const result = await response.json();
    console.log("Wyniki testu zostały zapisane:", result);
    
  } catch (error) {
    console.error("Błąd zapisywania wyników testu:", error);
    toast({
      title: "Błąd zapisywania wyników",
      description: "Nie udało się zapisać wyników testu w bazie danych.",
      variant: "destructive",
    });
  }
};
// Funkcja kończąca test
const handleFinishTest = () => {
  setTakingTest(false);
  setIsStartingTest(false);
  
  // Pokazanie komunikatu o wyniku
  toast({
    title: "Test zakończony",
    description: `Twój wynik: ${testScore}%.`,
    variant: testScore >= 70 ? "default" : "warning",
  });
};

// Funkcja obsługująca sprawdzanie odpowiedzi (uniwersalna)
const handleSubmitTest = () => {
  if (selectedTest.question_type === 'multiple_choice') {
    handleSubmitMultipleChoiceTest();
  } else {
    handleCheckOpenEndedAnswers();
  }
};



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// NOTE CREATION WILL BE IMPLEMENTED HERE ///////////////////////////////////////////////////////////////////////////

// State for note generation
const [isGeneratingNote, setIsGeneratingNote] = useState(false);
const [generationProgress, setGenerationProgress] = useState(0);
const [noteGenerated, setNoteGenerated] = useState(false);

// State for the generated note with sections

const [note, setNote] = useState<{
  id: string | null;
  sections: Array<{
    id: number;
    title: string;
    description: string;
    content: string;
    expanded: boolean;
    isTemporary?: boolean; // Add this property
  }>;
}>({
  id: null,
  sections: []
});

const fetchExistingNote = async (fileId: number) => {
  try {
    const response = await fetch(`/api/notes?fileId=${fileId}`);
    
    if (response.ok) {
      const data = await response.json();
      setNote({
        id: data.id,
        sections: data.sections
      });
      setNoteGenerated(true);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Błąd pobierania notatki:", error);
    return false;
  }
};

useEffect(() => {
  if (fileId) {
    fetchExistingNote(fileId);
  }
}, [fileId]);

const saveNoteToDatabase = async (noteData: any) => {
  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId,
        projectId: project?.project_id,
        noteName: `Notatka dla ${fileName}`,
        sections: noteData.sections
      }),
    });
    
    if (!response.ok) {
      throw new Error('Nie udało się zapisać notatki w bazie danych');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Błąd zapisywania notatki:", error);
    throw error;
  }
};



// Check for existing notes in localStorage when component mounts

useEffect(() => {
  if (fileId) {
    const existingNote = localStorage.getItem(`pdf_note_${fileId}`);
    if (existingNote) {
      const parsedNote = JSON.parse(existingNote);
      // Make sure all sections have an expanded property
      const sections = parsedNote.sections.map(section => ({
        ...section,
        expanded: section.expanded || false
      }));
      setNote({
        id: parsedNote.id,
        sections: sections
      });
      setNoteGenerated(true);
    }
  }
}, [fileId]);


// Add this with the other useEffect hooks
useEffect(() => {
  // Only run when the PDF is fully loaded and has pages
  // and we haven't attempted auto-generation yet
  if (!documentLoading && numPages && numPages > 0 && !autoGenerationAttemptedRef.current && !noteGenerated) {
    // Mark that we've attempted auto-generation
    autoGenerationAttemptedRef.current = true;
    
    // Slight delay to ensure PDF is fully rendered
    const timer = setTimeout(() => {
      // Generate note automatically
      generateInitialNote();
    }, 1000);
    
    return () => clearTimeout(timer);
  }
}, [documentLoading, numPages, noteGenerated]);


// Function to toggle section expansion
// Zmodyfikowana funkcja toggleSection
const toggleSection = async (sectionId: number) => {
  // Najpierw zaktualizuj stan lokalnie dla natychmiastowej reakcji UI
  setNote(prevNote => ({
    ...prevNote,
    sections: prevNote.sections.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded } 
        : section
    )
  }));
  
  // Następnie zapisz zmiany w bazie danych
  try {
    // Znajdź bieżący stan sekcji
    const section = note.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Aktualizuj stan w bazie danych
    await fetch('/api/notes/section', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sectionId,
        data: { expanded: !section.expanded }
      }),
    });
  } catch (error) {
    console.error("Błąd aktualizacji stanu sekcji:", error);
    // Możesz dodać obsługę błędów, np. wyświetlenie powiadomienia toast
  }
};

// Function to generate initial note from PDF

const generateInitialNote = async () => {
  // Sprawdź, czy notatka została już wygenerowana
  if (noteGenerated || isGeneratingNote) return;
  
  setIsGeneratingNote(true);
  setGenerationProgress(0);
  
  try {
    // Najpierw sprawdź, czy notatka już istnieje w bazie danych
    const noteExists = await fetchExistingNote(fileId);
    
    if (noteExists) {
      setIsGeneratingNote(false);
      toast({
        title: "Notatka załadowana",
        description: "Znaleziono i załadowano istniejącą notatkę z bazy danych.",
      });
      return;
    }
    
    // Krok 1: Ekstrakcja tekstu z PDF
    const extractedText = await extractPdfText();
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Nie udało się wyodrębnić tekstu z PDF');
    }
    
    // Krok 2: Powiadom użytkownika o analizie
    setGenerationProgress(40);
    toast({
      title: "Analiza treści PDF",
      description: "Identyfikacja kluczowych tematów i sekcji...",
    });
    
    // Symuluj przyrosty postępu dla analizy AI
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 5);
        return newProgress < 90 ? newProgress : 90;
      });
    }, 800);
    
    // Krok 3: Wywołaj API do uzyskania wygenerowanej notatki
    const response = await fetch('/api/generate-note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId,
        fileName: fileName,
        projectId: project?.project_id,
        totalPages: numPages || 0,
        pdfContent: extractedText // Przekaż wyodrębniony tekst
      }),
    });
    
    // Wyczyść interwał postępu
    clearInterval(progressInterval);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Nie udało się wygenerować notatki: ${errorData.error || response.statusText}`);
    }
    
    // Krok 4: Pobierz wygenerowaną notatkę
    const generatedNote = await response.json();
    
    // Krok 5: Zapisz do bazy danych
    await saveNoteToDatabase(generatedNote);
    
    // Krok 6: Zaktualizuj stan
    setNote({
      id: generatedNote.id,
      sections: generatedNote.sections
    });
    
    // Krok 7: Ustaw postęp na 100%
    setGenerationProgress(100);
    
    // Krok 8: Oznacz jako zakończone po krótkim opóźnieniu
    setTimeout(() => {
      setIsGeneratingNote(false);
      setNoteGenerated(true);
      
      // Pokaż zakładkę z notatkami
      const notesTab = document.querySelector('[data-state="inactive"][value="notes"]');
      if (notesTab) {
        (notesTab as HTMLElement).click();
      }
      
      toast({
        title: "Notatka wygenerowana",
        description: "Twoja notatka została pomyślnie wygenerowana i zapisana w bazie danych.",
      });
    }, 500);
  } catch (error) {
    console.error("Błąd generowania notatki:", error);
    setIsGeneratingNote(false);
    
    toast({
      title: "Błąd generowania notatki",
      description: error instanceof Error ? error.message : "Wystąpił problem z analizą tego PDF. Spróbuj ponownie.",
      variant: "destructive",
    });
  }
};
// Funkcja do ekstrakcji tekstu z PDF
const extractPdfText = async () => {
  if (!pdfSource) return '';
  
  try {
    setExtractingText(true);
    setGenerationProgress(5);
    
    // Użyj API pdf.js do wczytania dokumentu
    const loadingTask = pdfjs.getDocument(pdfSource);
    const pdf = await loadingTask.promise;
    
    // Ogranicz liczbę stron dla wydajności
    const numPagesToExtract = Math.min(pdf.numPages, 50);
    let extractedText = '';
    
    // Ekstrakcja tekstu ze wszystkich stron
    for (let i = 1; i <= numPagesToExtract; i++) {
      // Aktualizacja postępu
      setGenerationProgress(5 + Math.round((i / numPagesToExtract) * 35));
      
      // Pobierz stronę i jej zawartość tekstową
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Złącz elementy tekstowe
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + '\n\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Błąd ekstrakcji tekstu PDF:', error);
    throw new Error('Nie udało się odczytać treści PDF');
  } finally {
    setExtractingText(false);
  }
};

/**
 * Adds selected text to note sections with user confirmation
 * Uses two-phase commit pattern: propose changes first, commit after confirmation
 */
const addTextToNotes = async () => {
  if (!selectedText || selectedText.trim().length === 0) {
    toast({
      title: "Brak zaznaczonego tekstu",
      description: "Zaznacz fragment tekstu, który chcesz dodać do notatek.",
      variant: "destructive",
    });
    return;
  }
  
  // If no note exists yet, generate initial note first
  if (!note.id) {
    toast({
      title: "Generowanie głównej notatki",
      description: "Najpierw musimy wygenerować podstawową notatkę...",
    });
    await generateInitialNote();
    // Wait for the note to be generated
    if (!note.id) return;
  }
  
  // Set loading state
  setIsAddingNote(true);
  
  // Show loading toast instead of hiding tools immediately
  toast({
    title: "Przetwarzanie tekstu",
    description: "Analizowanie i dopasowywanie tekstu do sekcji...",
  });
  
  try {
    // Get surrounding context if possible
    let surroundingContext = "";
    try {
      if (renderMethod === 'pdf.js' && pagesRef.current[pageNumber]) {
        const pageElement = pagesRef.current[pageNumber];
        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (textLayer) {
          surroundingContext = textLayer.textContent || "";
          
          // Limit context size
          if (surroundingContext.length > 1000) {
            const position = surroundingContext.indexOf(selectedText);
            if (position > 0) {
              const startPos = Math.max(0, position - 300);
              const endPos = Math.min(surroundingContext.length, position + selectedText.length + 300);
              surroundingContext = surroundingContext.substring(startPos, endPos);
            } else {
              surroundingContext = surroundingContext.substring(0, 1000);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting context:", error);
    }
    
    // Call the API to process the selected text (phase 1: analysis)
    const response = await fetch('/api/notes/add-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedText,
        fileId,
        noteId: note.id,
        surroundingContext,
        pageNumber
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Nie udało się przetworzyć tekstu');
    }
    
    // Handle "ignore" action immediately
    if (result.action === "ignore") {
      setShowTools(false); // Now safe to hide tools
      toast({
        title: "Tekst pominięty",
        description: result.message,
        variant: "default",
      });
      return;
    }
    
    // Switch to notes tab
    const notesTab = document.querySelector('[data-state="inactive"][value="notes"]');
    if (notesTab) {
      (notesTab as HTMLElement).click();
    }
    
    // Hide tools now that we're switching tabs
    setShowTools(false);
    
    // Process proposals and set up confirmation UI
    if (result.action === "update_proposed") {
      // Proposed update to existing section
      setEditingSection({ 
        id: result.sectionId, 
        action: 'confirm', 
        currentContent: result.currentContent,
        result: result.proposedContent
      });
      
      // Expand the section
      setNote(prevNote => ({
        ...prevNote,
        sections: prevNote.sections.map(section => 
          section.id === result.sectionId 
            ? { ...section, expanded: true } 
            : section
        )
      }));
      
      // Scroll to section
      setTimeout(() => {
        if (sectionRefs.current[result.sectionId]) {
          sectionRefs.current[result.sectionId]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 200);
      
      toast({
        title: "Propozycja aktualizacji sekcji",
        description: "Sprawdź proponowane zmiany i zatwierdź lub odrzuć.",
      });
    } 
    else if (result.action === "create_proposed") {
      // Proposed creation of new section
      setEditingSection({
        id: -1, // Temporary ID for new section
        action: 'confirm_new',
        result: result.proposedContent,
        title: result.title,
        description: result.description,
        noteId: result.noteId,
        orderIndex: result.orderIndex
      });
      
      toast({
        title: "Propozycja nowej sekcji",
        description: "Sprawdź proponowaną nową sekcję i zatwierdź lub odrzuć.",
      });
      
      // Show temporary preview of new section at top of notes list
      const tempSection = {
        id: -1,
        title: result.title,
        description: result.description,
        content: result.proposedContent,
        expanded: true,
        isTemporary: true
      };
      
      // Add temporary section at the beginning for visibility
      setNote(prevNote => ({
        ...prevNote,
        sections: [tempSection, ...prevNote.sections]
      }));
      
      // Scroll to top to show the new section
      setTimeout(() => {
        const notesContainer = document.querySelector('[data-value="notes"]');
        if (notesContainer) notesContainer.scrollTop = 0;
      }, 200);
    }
  } catch (error) {
    console.error("Error adding text to notes:", error);
    setShowTools(false); // Hide tools on error
    toast({
      title: "Błąd",
      description: error instanceof Error ? error.message : "Nie udało się dodać tekstu do notatek.",
      variant: "destructive",
    });
  } finally {
    setIsAddingNote(false);
  }
};
// Section action handlers
// Handle section expansion
const expandSection = async (sectionId: number) => {
  setEditingSection({ id: sectionId, action: 'expand' });
  setIsProcessingAction(true);
  
  try {
    const section = note.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Call AI to expand the section
    const response = await fetch('/api/notes/enhance-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId,
        action: 'expand',
        currentContent: section.content
      }),
    });
    
    if (!response.ok) throw new Error('Failed to expand section' + response);
    
    const result = await response.json();
    
    // Show the result for confirmation
    setEditingSection({ 
      id: sectionId, 
      action: 'confirm', 
      result: result.enhancedContent 
    });
  } catch (error) {
    console.error("Error expanding section:", error);
    toast({
      title: "Błąd",
      description: "Nie udało się poszerzyć sekcji.",
      variant: "destructive",
    });
    setEditingSection(null);
  } finally {
    setIsProcessingAction(false);
  }
};

// Handle section formatting
const formatSection = async (sectionId: number) => {
  setEditingSection({ id: sectionId, action: 'format' });
  setIsProcessingAction(true);
  
  try {
    const section = note.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Call AI to format the section
    const response = await fetch('/api/notes/enhance-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId,
        action: 'format',
        currentContent: section.content
      }),
    });
    
    if (!response.ok) throw new Error('Failed to format section');
    
    const result = await response.json();
    
    // Show the result for confirmation
    setEditingSection({ 
      id: sectionId, 
      action: 'confirm', 
      result: result.enhancedContent 
    });
  } catch (error) {
    console.error("Error formatting section:", error);
    toast({
      title: "Błąd",
      description: "Nie udało się sformatować sekcji.",
      variant: "destructive",
    });
    setEditingSection(null);
  } finally {
    setIsProcessingAction(false);
  }
};

// Open custom prompt dialog
const openCustomPrompt = (sectionId: number) => {
  setEditingSection({ id: sectionId, action: 'custom' });
  setCustomPrompt('');
};

// Submit custom prompt
const submitCustomPrompt = async () => {
  if (!editingSection || !customPrompt.trim()) return;
  
  setIsProcessingAction(true);
  
  try {
    const section = note.sections.find(s => s.id === editingSection.id);
    if (!section) return;
    
    // Validate the prompt
    if (customPrompt.toLowerCase().includes("delete") || 
        customPrompt.toLowerCase().includes("remove")) {
      throw new Error("Aby usunąć sekcję, użyj opcji usuwania.");
    }
    
    // Call AI with custom prompt
    const response = await fetch('/api/notes/enhance-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId: editingSection.id,
        action: 'custom',
        customPrompt,
        currentContent: section.content
      }),
    });
    
    if (!response.ok) throw new Error('Failed to process custom prompt');
    
    const result = await response.json();
    
    // Show the result for confirmation
    setEditingSection({ 
      id: editingSection.id, 
      action: 'confirm', 
      prompt: customPrompt,
      result: result.enhancedContent 
    });
  } catch (error) {
    console.error("Error processing custom prompt:", error);
    toast({
      title: "Błąd",
      description: error instanceof Error ? error.message : "Nie udało się przetworzyć zapytania.",
      variant: "destructive",
    });
  } finally {
    setIsProcessingAction(false);
  }
};

// Confirm section changes - phase 2: commit to database
const confirmSectionChanges = async () => {
  if (!editingSection) return;
  
  setIsProcessingAction(true);
  
  try {
    // Determine if we're confirming an update or a new section
    const isNewSection = editingSection.action === 'confirm_new';
    
    // Construct request payload based on action type
    const payload = isNewSection 
      ? {
          action: 'create',
          noteId: editingSection.noteId,
          title: editingSection.title,
          description: editingSection.description,
          content: editingSection.result,
          orderIndex: editingSection.orderIndex
        }
      : {
          action: 'update',
          sectionId: editingSection.id,
          content: editingSection.result
        };
    
    // Call commit endpoint - phase 2: save to database
    const response = await fetch('/api/notes/commit-changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Nie udało się zapisać zmian');
    }
    
    const result = await response.json();
    
    // Update local state with the saved data
    if (isNewSection) {
      // Remove temporary preview section and add the real one
      setNote(prevNote => ({
        ...prevNote,
        // Filter out temporary section and add the real one with database ID
        sections: [
          ...prevNote.sections.filter(s => !s.isTemporary),
          {
            id: result.sectionId,
            title: result.title || editingSection.title,
            description: result.description || editingSection.description || '',
            content: result.content,
            expanded: true
          }
        ]
      }));
    } else {
      // Update the existing section content
      setNote(prevNote => ({
        ...prevNote,
        sections: prevNote.sections.map(section => 
          section.id === editingSection.id
            ? { ...section, content: result.content || editingSection.result }
            : section
        )
      }));
    }
    
    // Show highlight effect on the section
    setHighlightedSectionId(result.sectionId);
    
    // Remove highlight after animation completes
    setTimeout(() => {
      setHighlightedSectionId(null);
    }, 6000);
    
    // Clear editing state
    setEditingSection(null);
    
    toast({
      title: isNewSection ? "Nowa sekcja utworzona" : "Sekcja zaktualizowana",
      description: "Zmiany zostały zapisane pomyślnie.",
    });
    
    // Scroll to the final section location
    setTimeout(() => {
      if (sectionRefs.current[result.sectionId]) {
        sectionRefs.current[result.sectionId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 200);
  } catch (error) {
    console.error("Error confirming changes:", error);
    toast({
      title: "Błąd",
      description: error instanceof Error ? error.message : "Nie udało się zapisać zmian.",
      variant: "destructive",
    });
  } finally {
    setIsProcessingAction(false);
  }
};

// Cancel section changes - discard proposal without saving
const cancelSectionChanges = () => {
  // If this was a new section preview, remove it from the UI
  if (editingSection?.action === 'confirm_new') {
    setNote(prevNote => ({
      ...prevNote,
      sections: prevNote.sections.filter(s => !s.isTemporary)
    }));
  }
  
  // Clear editing state
  setEditingSection(null);
  setCustomPrompt('');
  
  toast({
    title: "Zmiany odrzucone",
    description: "Zmiany nie zostały zapisane.",
  });
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Apply TextLayer styles globally with enhanced alignment
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Główny kontener strony PDF */
      .react-pdf__Page {
        position: relative !important;
        overflow: hidden !important;
      }
      
      /* Canvas - warstwa graficzna */
      .react-pdf__Page__canvas {
        margin: 0 auto !important;
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Warstwa tekstowa - kluczowe dla nakładania */
      .react-pdf__Page__textContent {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2 !important;
        transform: none !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      
      /* Pojedyncze elementy tekstowe */
      .react-pdf__Page__textContent span {
        color: transparent !important;
        position: absolute !important;
        white-space: pre !important;
        cursor: text !important;
        transform-origin: 0% 0% !important;
        line-height: 1.0 !important;
      }
      

      
      /* Aktywne zaznaczenie tekstu */
      ::selection {
        background: rgba(0, 100, 255, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Update document loading state based on the hook's loading state
    setDocumentLoading(loading);
    
    // Update error state
    if (error) {
      setDocumentError(error);
    }
  }, [loading, error]);

  // Add fallback to direct URL if signed URL fails
  useEffect(() => {
    if (documentLoading && loadingProgress === 0) {
      const timer = setTimeout(() => {
        console.log("Loading timeout, trying direct URL...");
        setUsingDirectUrl(true);
      }, 5000); // 5 seconds timeout
      
      return () => clearTimeout(timer);
    }
  }, [documentLoading, loadingProgress]);

  // Handle retry
  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setUsingDirectUrl(!usingDirectUrl); // Toggle between signed and direct URL
      retry();
    }
  };
  const handleRestartTest = () => {
    // Resetowanie stanów testu
    setUserAnswers([]);
    setAnswerFeedback([]);
    setTestSubmitted(false);
    setTestScore(0);
    setTestHasResults(false);
    setTestInProgress(false);
    
    // Usuń tymczasowy stan z localStorage
    clearInProgressTestState(selectedTest.test_id);
    
    // Rozpoczęcie testu od nowa
    startTest();
  };
// Funkcja do podglądu wyników testu
const handleViewTestResults = async () => {
  if (!userId || !selectedTest) {
    console.warn('User ID not available or no selected test');
    return;
  }
  
  try {
    // Pobierz wyniki z bazy danych
    const response = await fetch(`/api/tests/results?testId=${selectedTest.test_id}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const results = await response.json();
    
    if (results.exists) {
      try {
        // Wczytaj pytania z testu
        const content = JSON.parse(selectedTest.content);
        if (content.questions && content.questions.length > 0) {
          if (selectedTest.question_type === 'multiple_choice') {
            setCurrentMultipleChoiceQuestions(content.questions);
            setCurrentOpenEndedQuestions([]);
          } else if (selectedTest.question_type === 'open_ended') {
            setCurrentOpenEndedQuestions(content.questions);
            setCurrentMultipleChoiceQuestions([]);
          }
          
          // Przetwórz odpowiedzi z bazy danych
          const userAnswersArray = new Array(content.questions.length).fill('');
          results.answers.forEach(answer => {
            if (answer.question_id >= 0 && answer.question_id < userAnswersArray.length) {
              userAnswersArray[answer.question_id] = answer.user_answer;
            }
          });
          
          // Inicjalizuj stan rozwijania - domyślnie wszystkie pytania zwinięte
          setExpandedQuestions(new Array(content.questions.length).fill(false));
          
          // Ustaw stany do wyświetlenia wyników
          setUserAnswers(userAnswersArray);
          setAnswerFeedback(results.feedback || []);
          setTestScore(results.score);
          setTestSubmitted(true);
          setTestHasResults(true);
          
          // KLUCZOWA ZMIANA: Ustaw takingTest i otwórz dialog
          setTakingTest(true);
          setIsStartingTest(true);
          
          toast({
            title: "Podgląd wyników",
            description: `Twój wynik: ${results.score}%`,
          });
        } else {
          throw new Error('Nie znaleziono pytań w teście');
        }
      } catch (error) {
        console.error("Błąd przetwarzania zawartości testu:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się wczytać wyników testu.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Brak wyników",
        description: "Nie znaleziono zapisanych wyników dla tego testu.",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Błąd pobierania wyników testu:", error);
    toast({
      title: "Błąd",
      description: "Nie udało się pobrać wyników testu.",
      variant: "destructive",
    });
  }
};

  // Track text selection - improved to work with iframe/embed/object elements
  useEffect(() => {
    const handleSelection = () => {
      // Get selection from the main document
      const mainSelection = window.getSelection();
      let selectedContent = mainSelection?.toString() || "";
      
      // Try to get selection from embedded elements when using native renderers
      if (!selectedContent && usingNativeRenderer) {
        try {
          // For iframe
          const iframeElement = documentRef.current?.querySelector('iframe');
          if (iframeElement && iframeElement.contentWindow) {
            const iframeSelection = iframeElement.contentWindow.getSelection();
            selectedContent = iframeSelection?.toString() || "";
          }
          
          // For object/embed - this is trickier as they don't expose selection directly
          // This would require a more complex approach with messaging
        } catch (error) {
          console.error("Error accessing selection in embedded element:", error);
        }
      }
      
      if (selectedContent) {
        setSelectedText(selectedContent);
        setShowTools(true);
      } else if (!selectedContent && showTools) {
        setShowTools(false);
      }
    };

    // Listen to mouseup events on the document
    document.addEventListener('mouseup', handleSelection);
    
    // For iframe elements, we need to attach listeners to their document too
    const attachIframeListeners = () => {
      const iframeElement = documentRef.current?.querySelector('iframe');
      if (iframeElement && iframeElement.contentWindow && iframeElement.contentDocument) {
        iframeElement.contentDocument.addEventListener('mouseup', handleSelection);
        iframeElement.contentDocument.addEventListener('selectionchange', handleSelection);
      }
    };
    
    // Try to attach iframe listeners after a small delay to ensure iframe is loaded
    if (usingNativeRenderer && renderMethod === 'iframe') {
      const timer = setTimeout(attachIframeListeners, 1000);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mouseup', handleSelection);
        
        const iframeElement = documentRef.current?.querySelector('iframe');
        if (iframeElement && iframeElement.contentDocument) {
          iframeElement.contentDocument.removeEventListener('mouseup', handleSelection);
          iframeElement.contentDocument.removeEventListener('selectionchange', handleSelection);
        }
      };
    }
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, [showTools, usingNativeRenderer, renderMethod]);

  // Funkcja wywoływana po pomyślnym załadowaniu strony PDF
  const onPageLoadSuccess = (page: any) => {
    // Dostosuj warstwy tylko gdy używamy PDF.js (nie w przypadku iframe/embed/object)
    if (renderMethod === 'pdf.js') {
      // Odczekaj moment aby upewnić się, że wszystkie warstwy są załadowane
      setTimeout(() => {
        // Pobierz referencje do elementów strony
        const pageContainer = page.pageElement;
        if (!pageContainer) return;
        
        // Znajdź warstwę canvas (graficzną)
        const canvasLayer = pageContainer.querySelector('.react-pdf__Page__canvas');
        // Znajdź warstwę tekstową
        const textLayer = pageContainer.querySelector('.react-pdf__Page__textContent');
        
        if (!canvasLayer || !textLayer) return;
        
        // Pobierz rzeczywiste wymiary canvas
        const canvasWidth = canvasLayer.width / devicePixelRatio;
        const canvasHeight = canvasLayer.height / devicePixelRatio;
        
        // Ustaw dokładne wymiary i pozycję warstwy tekstowej
        textLayer.style.width = `${canvasWidth}px`;
        textLayer.style.height = `${canvasHeight}px`;
        textLayer.style.top = '0px';
        textLayer.style.left = '0px';
        textLayer.style.transform = 'none';
        
        // Opcjonalnie dostosuj poszczególne elementy tekstowe jeśli nadal występuje niedopasowanie
        const textElements = textLayer.querySelectorAll('span');
        textElements.forEach((span: HTMLElement) => {
          // Zachowaj oryginalne transformacje, ale dostosuj je nieznacznie
          // Dla każdego PDF może być wymagana inna wartość - można to eksperymentalnie dostosować
          if (span.style.transform) {
            // Wyodrębnij bieżące wartości transformacji (translate, scale itp.)
            const transformValue = span.style.transform;
            
            // Poniższe można dostosować dla konkretnego PDF - tutaj użyty jest przykładowy współczynnik korekcji
            // Dostosuj mnożnik skali X (0.975) dla idealnego dopasowania
            span.style.transform = transformValue;
            span.style.transformOrigin = '0% 0%';
          }
        });
      }, 50); // krótkie opóźnienie dla pewności, że DOM się zaktualizował
    }
  };

  // Function to handle PDF document loading success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setDocumentLoading(false);
    setDocumentError(null);
    setLoadingProgress(100);
    
    // Dodatkowe środki dla pewności dopasowania warstw
    setTimeout(() => {
      // Znajdź wszystkie warstwy tekstowe i canvasy
      const pages = document.querySelectorAll('.react-pdf__Page');
      pages.forEach((page) => {
        const canvas = page.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
        const textLayer = page.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        
        if (canvas && textLayer) {
          // Ustaw dokładne wymiary
          const canvasWidth = canvas.width / devicePixelRatio;
          const canvasHeight = canvas.height / devicePixelRatio;
          
          textLayer.style.width = `${canvasWidth}px`;
          textLayer.style.height = `${canvasHeight}px`;
          textLayer.style.top = '0px';
          textLayer.style.left = '0px';
          textLayer.style.transform = 'none';
        }
      });
    }, 100);
  };

  // Function to handle PDF document loading progress
  const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    const progress = Math.round((loaded / total) * 100);
    setLoadingProgress(progress);
  };

  // Function to handle PDF document loading error
  const onDocumentLoadError = (error: Error) => {
    console.error("PDF loading error:", error);
    setDocumentError(`Failed to load PDF: ${error.message}`);
    setDocumentLoading(false);
    
    // If using signed URL failed, try direct URL
    if (!usingDirectUrl) {
      console.log("Error with signed URL, trying direct URL");
      setUsingDirectUrl(true);
      setDocumentLoading(true);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  // Page navigation functions
  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };
  
  // Functions for tools
  const createNote = () => {
    console.log("Creating note for text:", selectedText);
  };
  
  const createTest = () => {
    console.log("Creating test for text:", selectedText);
  };
  
  const translateText = () => {
    console.log("Translating text:", selectedText);
  };
  
  const explainText = () => {
    console.log("Explaining text:", selectedText);
    // Here you would implement the actual explanation functionality
    // For example, using an AI service to generate an explanation
  };
  
  const downloadPdf = () => {
    const url = usingDirectUrl ? fileUrl : signedUrl;
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Determine which URL to use
  const pdfSource = usingDirectUrl ? fileUrl : signedUrl;

  // Function to render PDF based on selected method
  const renderPdf = () => {
    if (!pdfSource) return null;
    
    switch (renderMethod) {
      case 'iframe':
        return (
          <div className="w-full h-full flex justify-center">
            <iframe 
              src={pdfSource} 
              className="w-full h-full border-none"
              title={fileName || 'PDF Document'}
            />
          </div>
        );
      
      case 'embed':
        return (
          <div className="w-full h-full flex justify-center">
            <embed 
              src={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
            />
          </div>
        );
      
      case 'object':
        return (
          <div className="w-full h-full flex justify-center">
            <object 
              data={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="text-center p-4">
                <p className="mb-2">Your browser doesn't support PDF viewing.</p>
                <Button 
                  variant="outline" 
                  onClick={downloadPdf} 
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </object>
          </div>
        );
      
      default: // 'pdf.js'
        return (
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadProgress={onDocumentLoadProgress}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex justify-center p-4">
                <Progress value={loadingProgress} className="w-40" />
              </div>
            }
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: true,
              // Dodatkowe opcje dla lepszego renderowania
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/standard_fonts/',
              // Użyj najlepszego trybu renderowania dla dokładnego dopasowania
              renderMode: 0, // najlepsza jakość (wolniejsza)
              // Włącz warstwę tekstową
              textLayerMode: 2, // pełne renderowanie
              // Włącz obsługę formularzy interaktywnych
              renderInteractiveForms: true,
              // Ustaw prawidłową wartość DPI
              disableAutoFetch: false,
              disableStream: false,
              // Wartość devicePixelRatio dla ekranów HiDPI
              rangeChunkSize: 65536,
            }}
          >
            {Array.from(
              new Array(numPages || 0),
              (_, index) => (
                <div 
                  key={`page_${index + 1}`} 
                  className={`mb-8 shadow-lg ${darkMode ? 'shadow-slate-700' : 'shadow-gray-300'}`}
                  ref={(el) => {
                    if (el) {
                      pagesRef.current[index + 1] = el;
                    }
                  }}
                >
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="bg-white"
                    onLoadSuccess={onPageLoadSuccess}
                    // Ustaw odpowiedni współczynnik devicePixelRatio
                    devicePixelRatio={devicePixelRatio}
                    // Włącz renderowanie czcionek
                    renderForms={true}
                    renderMode="canvas"
                    // Precyzyjne opcje renderowania
                    customTextRenderer={({ str, itemIndex }) => {
                      return str;
                    }}
                  />
                </div>
              )
            )}
          </Document>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold truncate max-w-lg">{fileName}</h2>
          {retryCount > 0 && (
            <span className="text-xs text-muted-foreground">
              (Attempt {retryCount}/{MAX_RETRIES})
            </span>
          )}
          {usingDirectUrl && (
            <span className="text-xs text-orange-500">
              (Using direct URL)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Added a selector for render methods */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setRenderMethod(renderMethod === 'pdf.js' ? 'iframe' : 
                              renderMethod === 'iframe' ? 'embed' : 
                              renderMethod === 'embed' ? 'object' : 'pdf.js')}
                >
                  <Layers className="h-4 w-4" />
                  {renderMethod === 'pdf.js' ? 'PDF.js' : 
                   renderMethod === 'iframe' ? 'iframe' : 
                   renderMethod === 'embed' ? 'embed' : 'object'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change PDF rendering method</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" size="icon" onClick={downloadPdf} title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div 
          className="flex-1 overflow-auto flex justify-center bg-slate-100 dark:bg-slate-800" 
          ref={documentRef}
        >
          {documentLoading ? (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <Progress 
                value={loadingProgress} 
                className="w-1/3 mb-4" 
              />
              <p className="text-sm text-muted-foreground">
                {t('loadingPdf') || 'Loading PDF...'} ({loadingProgress}%)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment...
              </p>
              {retryCount > 0 && (
                <Button onClick={handleRetry} variant="outline" size="sm" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('manualRetry') || 'Try again'}
                </Button>
              )}
            </div>
          ) : documentError ? (
            <div className="flex flex-col items-center justify-center h-full w-full p-6">
              <p className="text-red-500 text-center mb-4">{documentError}</p>
              
              {retryCount >= MAX_RETRIES ? (
                <div className="text-sm text-muted-foreground text-center mb-4">
                  <p>Too many failed attempts to load this document.</p>
                  <p>Try downloading the PDF directly.</p>
                </div>
              ) : null}
              
              <div className="flex gap-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleRetry} 
                  className="flex items-center gap-2"
                  disabled={retryCount >= MAX_RETRIES}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('retry') || 'Try again'}
                </Button>
                <Button onClick={onClose}>
                  {t('goBack') || 'Go back'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={downloadPdf} 
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center ${usingNativeRenderer ? 'h-full w-full' : 'py-8'}`}>
              {/* Using our new renderPdf function */}
              {pdfSource && renderPdf()}
            </div>
          )}
        </div>

        {/* Sidebar - for notes, tests, etc. */}
        <div className={`w-96 border-l overflow-auto ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <Tabs defaultValue="notes">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                {t('notes') || 'Notes'}
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex-1">
                <GraduationCap className="h-4 w-4 mr-2" />
                {t('tests') || 'Tests'}
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-1">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('glossary') || 'Dictionary'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes" className="p-4">
  <div className="flex flex-col gap-4">
    {/* Wskaźnik postępu generowania notatek */}
    {isGeneratingNote && (
      <div className={`border rounded-md p-3 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">
            {generationProgress < 40 
              ? "Ekstrakcja treści PDF" 
              : "Generowanie notatki"}
          </h3>
          <span className="text-xs text-muted-foreground">{generationProgress}%</span>
        </div>
        <Progress value={generationProgress} className="w-full h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {generationProgress < 40 
            ? "Odczytywanie tekstu dokumentu do analizy..." 
            : "Analiza treści PDF i tworzenie sekcji tematycznych..."}
        </p>
      </div>
    )}
    
    {/* Wygenerowana notatka z sekcjami */}
    {/* Add the animation style */}
<style dangerouslySetInnerHTML={{ __html: pulseAnimation }} />

{!isGeneratingNote && note.id && (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium">Notatka dla: {fileName}</h3>
    </div>
    
    <div className="space-y-4">
    {note.sections.map((section) => (
  <div 
    key={section.id + (section.isTemporary ? '-temp' : '')}
    ref={!section.isTemporary ? (el) => sectionRefs.current[section.id] = el : undefined}
    className={`border rounded-md overflow-hidden transition-all duration-300 ${
      darkMode ? 'border-slate-700' : 'border-gray-200'
    } ${
      section.isTemporary 
        ? 'border-dashed border-blue-400 dark:border-blue-600' 
        : ''
    } ${
      highlightedSectionId === section.id 
        ? 'shadow-lg ring-2 ring-blue-500 dark:ring-blue-400 section-highlight' 
        : ''
    }`}
  >
    {/* Section header with additional indicator for temporary sections */}
    <div 
      className={`p-3 ${section.expanded ? 'border-b' : ''} ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
      } ${
        section.isTemporary
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : highlightedSectionId === section.id 
            ? 'bg-blue-50 dark:bg-blue-900/30' 
            : ''
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center" onClick={() => !section.isTemporary && toggleSection(section.id)} style={{ cursor: !section.isTemporary ? 'pointer' : 'default', width: '80%' }}>
          <h3 className="font-medium text-base">{section.title}</h3>
          {section.isTemporary && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block">
              Propozycja
            </span>
          )}
          {highlightedSectionId === section.id && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block animate-pulse">
              Zaktualizowano
            </span>
          )}
          {!section.isTemporary && (
            <ChevronRight className={`ml-2 h-4 w-4 transition-transform duration-200 ${
              section.expanded ? 'transform rotate-90' : ''
            }`} />
          )}
        </div>
        
        {/* Action buttons only for non-temporary sections */}
        {!section.isTemporary && (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Poszerz zawartość sekcji" onClick={() => expandSection(section.id)}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Formatuj sekcję" onClick={() => formatSection(section.id)}>
              <Type className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Zadaj własne pytanie" onClick={() => openCustomPrompt(section.id)}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
    
    {/* Opis sekcji - zawsze widoczny */}
    <div className={`px-3 py-2 ${section.expanded ? 'border-b' : ''} ${
      darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'
    } ${
      highlightedSectionId === section.id 
        ? 'bg-blue-50/50 dark:bg-blue-900/20' 
        : ''
    }`}>
      <p className="text-sm text-muted-foreground">{section.description}</p>
    </div>
    
    {/* Treść sekcji - widoczna tylko po rozwinięciu */}
    {section.expanded && (
      <div className={`p-3 ${
        highlightedSectionId === section.id 
          ? 'bg-blue-50/30 dark:bg-blue-900/10' 
          : ''
      }`}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownContent content={section.content} />
        </div>
      </div>
    )}
    
    {/* Confirmation UI */}
    {editingSection && editingSection.id === section.id && editingSection.action === 'confirm' && (
  <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
    <div className="mb-3">
      <h4 className="text-sm font-medium mb-2">Proponowane zmiany:</h4>
      <div className="bg-white dark:bg-slate-800 rounded p-3 max-h-60 overflow-y-auto text-sm border border-blue-200 dark:border-blue-800">
        {/* Renderowanie podglądu markdown w potwierdzeniu */}
        <MarkdownContent content={editingSection.result || ''} />
      </div>
    </div>
    <div className="flex justify-end space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={cancelSectionChanges}
        disabled={isProcessingAction}
      >
        <X className="h-4 w-4 mr-1" />
        Odrzuć
      </Button>
      <Button 
        variant="default" 
        size="sm" 
        onClick={confirmSectionChanges}
        disabled={isProcessingAction}
      >
        {isProcessingAction ? (
          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-1" />
        )}
        Zatwierdź
      </Button>
    </div>
  </div>
)}

    {/* Custom prompt dialog */}
    {editingSection && editingSection.id === section.id && editingSection.action === 'custom' && (
      <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2">Wprowadź własne polecenie:</h4>
          <textarea
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            placeholder="Np. 'Dodaj więcej szczegółów o...' lub 'Wyjaśnij pojęcie...'"
            rows={3}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={cancelSectionChanges}
            disabled={isProcessingAction}
          >
            Anuluj
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={submitCustomPrompt}
            disabled={isProcessingAction || !customPrompt.trim()}
          >
            {isProcessingAction ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : 'Wyślij'}
          </Button>
        </div>
      </div>
    )}

    {/* Processing indicator */}
    {editingSection && editingSection.id === section.id && 
     (editingSection.action === 'expand' || editingSection.action === 'format') && (
      <div className="border-t p-4 bg-blue-50/30 dark:bg-blue-900/10 flex justify-center items-center">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        <span>
          {editingSection.action === 'expand' ? 'Poszerzanie sekcji...' : 'Formatowanie sekcji...'}
        </span>
      </div>
    )}
  </div>
))}
    </div>
  </>
)}
    
    {/* Stan pustych notatek */}
    {!isGeneratingNote && !note.id && (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Brak notatek. Kliknij przycisk "Dodaj do notatek" w przeglądarce PDF, aby wygenerować notatkę.
        </p>
      </div>
    )}
  </div>
</TabsContent>
            
<TabsContent value="tests" className="p-4 h-full overflow-y-auto">
  <div className="flex flex-col gap-4 h-full">
    {/* Generator testów */}
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-medium">Testy dla: {fileName}</h3>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2"
        onClick={() => setIsTestGenerationDialogOpen(true)}
        disabled={isGeneratingTest || !noteGenerated}
      >
        <GraduationCap className="h-4 w-4" />
        {isGeneratingTest ? 'Generowanie...' : 'Utwórz test'}
      </Button>
    </div>
    
   {/* Lista testów */}
   <div className="space-y-3 flex-1 overflow-y-auto">
  {tests.length > 0 ? (
    tests.map((test) => {
      // Sprawdź tymczasowy stan testu w localStorage
      const inProgressState = loadInProgressTestState(test.test_id);
      const isInProgress = inProgressState && inProgressState.userAnswers.some(answer => answer);
      
      // Sprawdź czy to aktualnie wybrany test
      const isSelected = selectedTest?.test_id === test.test_id;
      
      return (
        <div 
          key={test.test_id} 
          className={`border rounded-md overflow-hidden transition-all duration-200 ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          {/* Nagłówek karty testu - zawsze widoczny */}
          <div 
            className={`p-3 cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-gray-50 border-gray-200'
            } ${isSelected ? (darkMode ? 'bg-slate-800' : 'bg-gray-50') : ''}`}
            onClick={() => handleToggleTest(test)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{test.test_name}</h4>
                  
                  {testHasResults && isSelected && (
                    <Badge variant="success" className="text-xs">
                      Wynik: {testScore}%
                    </Badge>
                  )}
                  
                  {isInProgress && !testHasResults && (
                    <Badge variant="outline" className="text-xs">
                      Rozpoczęty
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(test.created_at).toLocaleDateString()} · {getTestQuestionCount(test)} pytań
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={test.question_type === 'open_ended' ? 'outline' : 'secondary'}>
                  {test.question_type === 'open_ended' ? 'Otwarte' : 'Zamknięte'}
                </Badge>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${isSelected ? 'transform rotate-180' : ''}`} 
                />
              </div>
            </div>
          </div>
          
          {/* Rozwijane szczegóły testu - widoczne tylko po kliknięciu */}
          {isSelected && (
            <div className="p-3 border-t">
              <div className="mb-4">
                <p className="text-sm mb-3">
                  Ten test zawiera {getTestQuestionCount(test)} pytań {test.question_type === 'open_ended' ? 'otwartych' : 'jednokrotnego wyboru'} dotyczących treści dokumentu.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {test.question_type === 'open_ended' ? 'Pytania otwarte' : 'Pytania zamknięte'}
                  </Badge>
                  <Badge variant={test.save_score ? 'default' : 'secondary'} className="text-xs">
                    {test.save_score ? 'Zapisywanie wyników' : 'Tryb ćwiczeniowy'}
                  </Badge>
                </div>
                
                {/* Informacja o statusie testu */}
                {testHasResults && (
                  <div className="mt-3 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">Ten test został już rozwiązany.</p>
                      <Badge variant="success">Wynik: {testScore}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Możesz przejrzeć swoje odpowiedzi i wyniki lub rozwiązać test ponownie.
                    </p>
                  </div>
                )}
                
                {isInProgress && !testHasResults && (
                  <div className="mt-3 p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20">
                    <p className="font-medium">Ten test został rozpoczęty.</p>
                    <p className="text-sm text-muted-foreground">
                      Możesz kontynuować rozwiązywanie testu od miejsca, w którym przerwałeś.
                    </p>
                  </div>
                )}
              </div>
              
{/* Przyciski akcji */}
<div className="flex justify-end mt-4 w-full">
  {testHasResults ? (
    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full justify-end">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleViewTestResults}
        className="h-8 text-xs sm:text-sm min-w-0 flex-shrink"
      >
        <FileText className="h-4 w-4 mr-1 flex-shrink-0" />
        <span className="truncate">Podgląd wyników</span>
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleRestartTest}
        className="h-8 text-xs sm:text-sm min-w-0 flex-shrink"
      >
        <RefreshCw className="h-4 w-4 mr-1 flex-shrink-0" />
        <span className="truncate">Rozwiąż ponownie</span>
      </Button>
    </div>
  ) : isInProgress ? (
    <Button 
      size="sm" 
      onClick={() => {
        startTest();
        setIsStartingTest(true);
      }}
      className="h-8"
    >
      <BookOpen className="h-4 w-4 mr-1" />
      Kontynuuj test
    </Button>
  ) : (
    <Button 
      size="sm" 
      onClick={() => {
        startTest();
        setIsStartingTest(true);
      }}
      className="h-8"
    >
      <GraduationCap className="h-4 w-4 mr-1" />
      Rozpocznij test
    </Button>
  )}
</div>
            </div>
          )}
        </div>
      );
    })
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
      <GraduationCap className="h-10 w-10 text-muted-foreground mb-2" />
      <p className="text-muted-foreground">
        {isGeneratingTest 
          ? 'Generowanie testu...'
          : noteGenerated 
            ? 'Nie masz jeszcze testów. Kliknij "Utwórz test" aby wygenerować pierwszy test.'
            : 'Aby wygenerować test, najpierw utwórz lub wczytaj notatkę dla tego dokumentu.'}
      </p>
    </div>
  )}
</div>
    

  </div>
  
  {/* Dialog generowania testu */}
  {/* Dialog generowania testu */}
<Dialog open={isTestGenerationDialogOpen} onOpenChange={setIsTestGenerationDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Utwórz nowy test</DialogTitle>
      <DialogDescription>
        Skonfiguruj parametry testu, który zostanie wygenerowany na podstawie treści dokumentu i notatek.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="test-name">Nazwa testu</Label>
        <Input 
          id="test-name" 
          value={testConfig.name} 
          onChange={(e) => setTestConfig({...testConfig, name: e.target.value})}
          placeholder="np. Test z rozdziału 3"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Typ pytań</Label>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroup 
              value={testConfig.questionType} 
              onValueChange={(value) => setTestConfig({...testConfig, questionType: value})}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple_choice" id="multiple_choice" />
                <Label htmlFor="multiple_choice">Pytania zamknięte</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open_ended" id="open_ended" />
                <Label htmlFor="open_ended">Pytania otwarte</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="question-count">Liczba pytań</Label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-6">{testConfig.questionCount}</span>
          <Slider 
            id="question-count"
            value={[testConfig.questionCount]} 
            min={3} 
            max={10}
            step={1}
            onValueChange={(value) => setTestConfig({...testConfig, questionCount: value[0]})}
            className="flex-1"
          />
        </div>
      </div>
      
      {/* Opcje dostępne tylko dla pytań zamkniętych */}
      {testConfig.questionType === 'multiple_choice' && (
        <div className="space-y-2">
          <Label htmlFor="options-count">Liczba opcji odpowiedzi</Label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-6">{testConfig.optionsCount}</span>
            <Slider 
              id="options-count"
              value={[testConfig.optionsCount]} 
              min={2} 
              max={5}
              step={1}
              onValueChange={(value) => setTestConfig({...testConfig, optionsCount: value[0]})}
              className="flex-1"
            />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="difficulty">Poziom trudności</Label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-16">
            {testConfig.difficulty === 1 ? 'Łatwy' : 
             testConfig.difficulty === 2 ? 'Średni' : 'Trudny'}
          </span>
          <Slider 
            id="difficulty"
            value={[testConfig.difficulty]} 
            min={1} 
            max={3}
            step={1}
            onValueChange={(value) => setTestConfig({...testConfig, difficulty: value[0]})}
            className="flex-1"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="save-score" 
          checked={testConfig.saveScore}
          onCheckedChange={(checked) => setTestConfig({...testConfig, saveScore: !!checked})}
        />
        <Label htmlFor="save-score">Zapisuj wyniki do historii</Label>
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsTestGenerationDialogOpen(false)}>Anuluj</Button>
      <Button 
        onClick={generateTest} 
        disabled={!testConfig.name || isGeneratingTest}
      >
        {isGeneratingTest ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generowanie...
          </>
        ) : 'Utwórz test'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
  <Dialog open={isStartingTest} onOpenChange={setIsStartingTest}>
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
    <DialogHeader>
      <DialogTitle className="flex items-center justify-between">
        <span>{selectedTest?.test_name}</span>
        {takingTest && testSubmitted && (
          <Badge variant={testScore >= 70 ? 'success' : testScore >= 50 ? 'warning' : 'destructive'} className="ml-2">
            {testScore}%
          </Badge>
        )}
      </DialogTitle>
      <DialogDescription>
        {takingTest ? 
          `Test ${testSubmitted ? 'ukończony' : 'w trakcie'} - ${selectedTest?.question_type === 'open_ended' ? 'pytania otwarte' : 'pytania jednokrotnego wyboru'}` : 
          `Przygotuj się do odpowiedzi na ${selectedTest?.question_type === 'open_ended' ? 'pytania otwarte' : 'pytania jednokrotnego wyboru'}. Możesz korzystać z dokumentu podczas testu.`
        }
      </DialogDescription>
    </DialogHeader>
    
    {takingTest ? (
      <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-1">
        {/* Renderowanie pytań zamkniętych */}
        {selectedTest?.question_type === 'multiple_choice' && currentMultipleChoiceQuestions.map((question, index) => (
          <div key={index} className="mb-6 border rounded-md overflow-hidden">
            <div 
              className={`p-3 border-b cursor-pointer flex justify-between items-center ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => toggleQuestionExpand(index)}
            >
              <div className="flex items-center">
                <span className="font-medium mr-2">{index + 1}.</span>
                <span className="font-medium truncate">{question.question.length > 50 ? `${question.question.substring(0, 50)}...` : question.question}</span>
              </div>
              <div className="flex items-center">
                {testSubmitted && (
                  <Badge variant={userAnswers[index] === question.correctAnswer ? 'success' : 'destructive'} className="mr-2">
                    {userAnswers[index] === question.correctAnswer ? 'Poprawna' : 'Błędna'}
                  </Badge>
                )}
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedQuestions[index] ? 'transform rotate-180' : ''}`} />
              </div>
            </div>
            
            {expandedQuestions[index] && (
              <div className="p-3">
                <div className="mb-3">
                  <p className="font-medium">{question.question}</p>
                  {question.context && (
                    <p className="text-sm text-muted-foreground mt-1 mb-2 italic">
                      Kontekst: {question.context}
                    </p>
                  )}
                </div>
                
                <div className="pl-0">
                  <RadioGroup 
                    value={userAnswers[index] || ''}
                    onValueChange={(value) => handleAnswerChange(index, value)}
                    disabled={testSubmitted}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className={`flex items-center space-x-2 p-2 rounded-md ${
                        testSubmitted && option === question.correctAnswer 
                          ? 'bg-green-50 dark:bg-green-900/20' 
                          : testSubmitted && userAnswers[index] === option && option !== question.correctAnswer
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : ''
                      }`}>
                        <RadioGroupItem 
                          value={option} 
                          id={`q${index}-option-${optionIndex}`} 
                        />
                        <Label htmlFor={`q${index}-option-${optionIndex}`} className="flex-1">
                          {option}
                        </Label>
                        {testSubmitted && option === question.correctAnswer && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {testSubmitted && userAnswers[index] === option && option !== question.correctAnswer && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {testSubmitted && question.explanation && (
                    <div className="mt-2 p-2 rounded-md text-sm bg-blue-50 dark:bg-blue-900/20">
                      <p className="font-medium">Wyjaśnienie:</p>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Renderowanie pytań otwartych */}
        {selectedTest?.question_type === 'open_ended' && currentOpenEndedQuestions.map((question, index) => (
          <div key={index} className="mb-6 border rounded-md overflow-hidden">
            <div 
              className={`p-3 border-b cursor-pointer flex justify-between items-center ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => toggleQuestionExpand(index)}
            >
              <div className="flex items-center">
                <span className="font-medium mr-2">{index + 1}.</span>
                <span className="font-medium truncate">{question.question.length > 50 ? `${question.question.substring(0, 50)}...` : question.question}</span>
              </div>
              <div className="flex items-center">
                {testSubmitted && answerFeedback[index] && (
                  <Badge variant={answerFeedback[index].isCorrect ? 'success' : 'warning'} className="mr-2">
                    {answerFeedback[index].isCorrect ? 'Poprawna' : 'Niepełna'}
                  </Badge>
                )}
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedQuestions[index] ? 'transform rotate-180' : ''}`} />
              </div>
            </div>
            
            {expandedQuestions[index] && (
              <div className="p-3">
                <div className="mb-3">
                  <p className="font-medium">{question.question}</p>
                  {question.context && (
                    <p className="text-sm text-muted-foreground mt-1 mb-2 italic">
                      Kontekst: {question.context}
                    </p>
                  )}
                </div>
                
                <Textarea
                  placeholder="Twoja odpowiedź..."
                  value={userAnswers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  rows={4}
                  className="w-full"
                  disabled={testSubmitted}
                />
                
                {testSubmitted && answerFeedback[index] && (
                  <div className={`p-2 mt-2 rounded-md text-sm ${
                    answerFeedback[index].isCorrect
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                  }`}>
                    <p className="font-medium mb-1">
                      {answerFeedback[index].isCorrect ? 'Dobra robota!' : 'Odpowiedź niepełna'}
                    </p>
                    <p>{answerFeedback[index].feedback}</p>
                    
                    {!answerFeedback[index].isCorrect && answerFeedback[index].correctAnswer && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                        <p className="font-medium">Przykładowa poprawna odpowiedź:</p>
                        <p>{answerFeedback[index].correctAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="py-4 overflow-y-auto">
        <p className="mb-4">Ten test zawiera {getTestQuestionCount(selectedTest)} pytań {selectedTest?.question_type === 'open_ended' ? 'otwartych' : 'jednokrotnego wyboru'}.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Typ testu:</span>
            <Badge variant="outline">
              {selectedTest?.question_type === 'open_ended' ? 'Pytania otwarte' : 'Pytania zamknięte'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Czas:</span>
            <span>Nieograniczony</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Zapisywanie wyników:</span>
            <Badge variant={selectedTest?.save_score ? 'default' : 'secondary'}>
              {selectedTest?.save_score ? 'Tak' : 'Nie'}
            </Badge>
          </div>
          
          {/* Informacja o statusie testu */}
          {testHasResults && (
            <div className="mt-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Ten test został już rozwiązany.</p>
                <Badge variant="success">Wynik: {testScore}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Możesz przejrzeć swoje odpowiedzi i wyniki lub rozwiązać test ponownie.
              </p>
            </div>
          )}
          
          {testInProgress && !testHasResults && (
            <div className="mt-4 p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20">
              <p className="font-medium">Ten test został rozpoczęty.</p>
              <p className="text-sm text-muted-foreground">
                Możesz kontynuować rozwiązywanie testu od miejsca, w którym przerwałeś.
              </p>
            </div>
          )}
        </div>
      </div>
    )}
    
    <DialogFooter className="mt-4 pt-4 border-t flex-wrap gap-2">
      {takingTest ? (
        !testSubmitted ? (
          <>
            <Button variant="outline" onClick={() => {
              // Zapisz stan i zamknij dialog
              saveInProgressTestState(selectedTest.test_id, userAnswers);
              setTakingTest(false);
            }}>
              Zapisz i wróć później
            </Button>
            <Button 
  onClick={() => {
    console.log("Button clicked", selectedTest?.question_type);
    if (selectedTest?.question_type === 'multiple_choice') {
      handleSubmitMultipleChoiceTest();
    } else {
      handleCheckOpenEndedAnswers();
    }
  }}
  disabled={isCheckingAnswers}
>
  {selectedTest?.question_type === 'open_ended' && isCheckingAnswers ? (
    <>
      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      Sprawdzanie...
    </>
  ) : (
    'Sprawdź odpowiedzi'
  )}
</Button>
          </>
        ) : (
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={() => setTakingTest(false)}>
              Zamknij podgląd
            </Button>
            <Button onClick={handleRestartTest}>
              Rozwiąż ponownie
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={() => setIsStartingTest(false)}>
              Anuluj
            </Button>
            
            {/* Dodatkowe przyciski w zależności od stanu testu */}
            {testHasResults ? (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleViewTestResults}>
                  Podgląd wyników
                </Button>
                <Button onClick={handleRestartTest}>
                  Rozwiąż ponownie
                </Button>
              </div>
            ) : testInProgress ? (
              <Button onClick={() => startTest()}>
                Kontynuuj test
              </Button>
            ) : (
              <Button onClick={() => startTest()}>
                Rozpocznij test
              </Button>
            )}
          </div>
        </>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>


</TabsContent>
            
            <TabsContent value="terms" className="p-4">
              <p className="text-muted-foreground text-center py-8">
                {t('noTermsYet') || 'No terms yet. Select text to add to dictionary.'}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Controls at the bottom of the screen */}
      {!documentLoading && !documentError && (
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Only show zoom controls for PDF.js renderer */}
              {!usingNativeRenderer && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={zoomOut}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('zoomOut') || 'Zoom out'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Slider 
                    className="w-32" 
                    value={[scale * 100]} 
                    min={50} 
                    max={300} 
                    step={10}
                    onValueChange={(value) => setScale(value[0] / 100)}
                  />
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={zoomIn}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('zoomIn') || 'Zoom in'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              
              {/* Show a message for native renderers */}
              {usingNativeRenderer && (
                <span className="text-sm text-muted-foreground">
                  Using {renderMethod} viewer (browser's native controls)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Only show page navigation for PDF.js renderer */}
              {!usingNativeRenderer && numPages && (
                <>
                  <span className="text-sm">
                    {pageNumber} / {numPages || 0}
                  </span>
                  
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={goToPrevPage} 
                            disabled={pageNumber <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('previousPage') || 'Previous page'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={goToNextPage} 
                            disabled={pageNumber >= (numPages || 0)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('nextPage') || 'Next page'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tools for selected text */}
      {showTools && (
        <div 
          className={`absolute left-1/2 transform -translate-x-1/2 bottom-24 flex items-center gap-2 p-2 rounded-lg shadow-lg z-50 ${
            darkMode ? 'bg-slate-800 shadow-slate-700' : 'bg-white shadow-gray-300'
          }`}
        >
          {/* Text explanation option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={explainText}>
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('explainText') || 'Explain text'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-8" />
          
{/* Add to notes option */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={noteGenerated ? addTextToNotes : generateInitialNote}
        disabled={isGeneratingNote || isAddingNote}
      >
        {isGeneratingNote || isAddingNote ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isGeneratingNote 
        ? 'Generowanie notatki...' 
        : isAddingNote
          ? 'Dodawanie tekstu do notatek...'
          : noteGenerated
            ? 'Dodaj zaznaczony tekst do notatek'
            : 'Utwórz notatkę dla dokumentu'}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

          <Separator orientation="vertical" className="h-8" />
          
          {/* Create test option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={createTest}>
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('createTest') || 'Create test'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-8" />
          
          {/* Translate option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={translateText}>
                  <Languages className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('translate') || 'Translate'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-8" />
          
          {/* Bookmark option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('bookmark') || 'Bookmark'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Close button */}
          <Separator orientation="vertical" className="h-8" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowTools(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('closeTools') || 'Close'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>  
  );
}