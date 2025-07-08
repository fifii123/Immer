"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePreferences } from "@/context/preferences-context";
import { useProjects } from "@/context/projects-context";
import { useParams } from "next/navigation";
import { useUserId } from '@/hooks/useAuthApi';
import { 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  X, 
  ArrowLeft,
  Menu,
  Search,
  ChevronDown,
  ArrowUp,
  Home,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  BarChart4,
  FileText,
  Clock,
  PlayCircle,
  CheckSquare,
  FilterX
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import MarkdownContent from '@/components/MarkdownContent';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Interfejsy typów
interface Test {
  test_id: number;
  test_name: string;
  question_type: string;
  created_at: string;
  content: string;
  save_score: boolean;
  file_id?: number;
  fileName?: string; // Nazwa pliku powiązanego z testem
  score?: number; // Wynik testu, jeśli został już rozwiązany
  questionsCount?: number; // Liczba pytań w teście
}

interface Question {
  question: string;
  context?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface ProjectTestsProps {
  projectId: number;
  onClose: () => void;
}

const ProjectTests: React.FC<ProjectTestsProps> = ({ projectId, onClose }) => {
  const { darkMode, t } = usePreferences();
  const { toast } = useToast();
  const { projects } = useProjects();
  const params = useParams();
  const { userId } = useUserId();
  
  const [tests, setTests] = useState<Test[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [testInProgress, setTestInProgress] = useState(false);
  const [takingTest, setTakingTest] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isCheckingAnswers, setIsCheckingAnswers] = useState(false);
  const [filterByFile, setFilterByFile] = useState<number | null>(null);
  
  // States for test-taking
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [answerFeedback, setAnswerFeedback] = useState<Array<{
    isCorrect: boolean;
    feedback: string;
    correctAnswer?: string;
  } | null>>([]);
  const [testScore, setTestScore] = useState(0);
  const [expandedQuestions, setExpandedQuestions] = useState<boolean[]>([]);
  
  // References
  const testContainerRef = useRef<HTMLDivElement>(null);
  
  // Pobierz bieżący projekt
  const project = projects.find(
    (p) => p.project_id.toString() === params.id?.toString() || p.project_id === projectId
  );
  
  // Pobierz wszystkie testy dla projektu
  useEffect(() => {
    const fetchTests = async () => {
        try {
          setLoading(true);
          
          // Sprawdzamy, czy projekt ma jakiekolwiek pliki
          if (!project || !project.attached_file || project.attached_file.length === 0) {
            console.log("Brak plików w projekcie, nie można pobrać testów");
            setLoading(false);
            return;
          }
          
          // Używamy ID pierwszego pliku w projekcie, aby pobrać wszystkie testy projektu
          const firstFileId = project.attached_file[0].file_id;
          console.log(`Pobieranie testów używając fileId=${firstFileId} z projektu ID=${projectId}`);
          
          const response = await fetch(`/api/tests?fileId=${firstFileId}&projectOnly=true`);
          
          if (!response.ok) {
            throw new Error('Nie udało się pobrać testów');
          }
          
          const data = await response.json();
          console.log(`Pobrano ${data.length} testów dla projektu`);
          
          // Przetwarzanie testów - dodanie liczby pytań i nazw plików
          const processedTests = data.map((test) => {
            // Dodaj liczbę pytań
            let questionsCount = 0;
            try {
              const content = JSON.parse(test.content);
              questionsCount = content.questions?.length || 0;
            } catch (e) {
              console.error("Nie można sparsować zawartości testu:", e);
            }
            
            // Dodaj nazwę pliku, jeśli plik istnieje
            let fileName = "";
            if (test.file_id && project.attached_file) {
              const matchingFile = project.attached_file.find(
                file => file.file_id === test.file_id
              );
              if (matchingFile) {
                fileName = matchingFile.file_name;
              }
            }
            
            return {
              ...test,
              questionsCount,
              fileName
            };
          });
          
          setTests(processedTests);
          
          // Jeśli są testy, pobierz też wyniki dla poszczególnych testów
          if (processedTests.length > 0 && userId) {
            await fetchTestResults(processedTests);
          }
        } catch (error) {
          console.error('Błąd podczas pobierania testów:', error);
          toast({
            title: "Błąd",
            description: "Nie udało się załadować testów",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      
    // Pobierz wyniki testów dla zalogowanego użytkownika i wszystkich testów
    const fetchTestResults = async (testsToCheck: Test[]) => {
      try {
        // Dla każdego testu pobierz wyniki, jeśli istnieją
        const updatedTests = [...testsToCheck];
        
        for (const test of updatedTests) {
          // Używamy istniejącego API do pobrania wyników testu
          const response = await fetch(`/api/tests/results?testId=${test.test_id}&userId=${userId}`);
          
          if (response.ok) {
            const result = await response.json();
            
            // Jeśli test ma wyniki, dodaj je do obiektu testu
            if (result.exists) {
              const testIndex = updatedTests.findIndex(t => t.test_id === test.test_id);
              if (testIndex !== -1) {
                updatedTests[testIndex] = {
                  ...updatedTests[testIndex],
                  score: result.score
                };
              }
            }
          }
        }
        
        // Aktualizuj stan testów z wynikami
        setTests(updatedTests);
      } catch (error) {
        console.error('Błąd podczas pobierania wyników testów:', error);
      }
    };
    
    fetchTests();
  }, [projectId, toast, project, userId]);
  
  // Filtrowanie testów
  const filteredTests = tests.filter(test => {
    // Filtrowanie według wyszukiwania
    if (searchTerm && !test.test_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (filterByFile !== null && test.file_id !== filterByFile) {
      return false;
    }
    
    // Filtrowanie według typu
    if (filterType) {
      if (filterType === 'multiple_choice' && test.question_type !== 'multiple_choice') return false;
      if (filterType === 'open_ended' && test.question_type !== 'open_ended') return false;
      if (filterType === 'completed' && !test.score) return false;
      if (filterType === 'not_completed' && test.score !== undefined) return false;
    }
    
    return true;
  });
  
  // Sortowanie testów
  const sortedTests = [...filteredTests].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'alphabetical') {
      return a.test_name.localeCompare(b.test_name);
    }
    return 0;
  });

  // Funkcja resetowania filtrów
  const resetFilters = () => {
    setFilterType(null);
    setFilterByFile(null);
    setSearchTerm('');
    setSortBy('newest');
    setCurrentTestIndex(0);
  };

  // Sprawdź czy są zastosowane jakiekolwiek filtry
  const hasActiveFilters = filterType !== null || filterByFile !== null || searchTerm !== '';
  
  // Przełącz test
  const switchTest = (index: number) => {
    // Resetuj stan testu
    setTestInProgress(false);
    setTakingTest(false);
    setTestSubmitted(false);
    setUserAnswers([]);
    setAnswerFeedback([]);
    setExpandedQuestions([]);
    
    // Ustaw nowy indeks
    setCurrentTestIndex(index);
    
    // Przewiń na górę
    if (testContainerRef.current) {
      testContainerRef.current.scrollTop = 0;
    }
  };
  
  // Rozpocznij rozwiązywanie testu
  const startTest = () => {
    if (!sortedTests[currentTestIndex]) return;
    
    try {
      // Parsuj zawartość testu
      const content = JSON.parse(sortedTests[currentTestIndex].content);
      if (!content.questions || !content.questions.length) {
        throw new Error('Brak pytań w teście');
      }
      
      // Ustaw pytania
      setCurrentQuestions(content.questions);
      
      // Zainicjuj odpowiedzi użytkownika
      setUserAnswers(new Array(content.questions.length).fill(''));
      
      // Zainicjuj stan rozwijania - domyślnie wszystkie pytania rozwinięte
      setExpandedQuestions(new Array(content.questions.length).fill(true));
      
      // Wyczyść feedback
      setAnswerFeedback(new Array(content.questions.length).fill(null));
      
      // Ustaw stan testu
      setTakingTest(true);
      setTestInProgress(true);
      setTestSubmitted(false);
    } catch (error) {
      console.error("Błąd rozpoczynania testu:", error);
      toast({
        title: "Błąd rozpoczynania testu",
        description: "Nie można wczytać pytań. Format testu jest nieprawidłowy.",
        variant: "destructive",
      });
    }
  };
  
  // Obsługa zmiany odpowiedzi
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };
  
  // Przełączanie rozwinięcia pytania
  const toggleQuestionExpand = (index: number) => {
    const newExpandedState = [...expandedQuestions];
    newExpandedState[index] = !newExpandedState[index];
    setExpandedQuestions(newExpandedState);
  };
  
  // Sprawdzanie odpowiedzi dla testów zamkniętych
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
    
    for (let i = 0; i < currentQuestions.length; i++) {
      const isCorrect = userAnswers[i] === currentQuestions[i].correctAnswer;
      if (isCorrect) {
        correctCount++;
      }
      
      feedback.push({
        isCorrect,
        feedback: isCorrect 
          ? "Poprawna odpowiedź" 
          : `Niepoprawna odpowiedź. Prawidłowa odpowiedź: ${currentQuestions[i].correctAnswer}`,
        correctAnswer: currentQuestions[i].correctAnswer
      });
    }
    
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    
    // Ustaw stany interfejsu
    setTestScore(score);
    setAnswerFeedback(feedback);
    setTestSubmitted(true);
    
    // Zapisz wyniki w bazie danych
    saveTestResults(score, feedback);
    
    // Toast z wynikiem
    toast({
      title: "Test zakończony",
      description: `Twój wynik: ${score}%.`,
      variant: score >= 70 ? "default" : "warning",
    });
  };
  
  // Sprawdzanie odpowiedzi dla testów otwartych
  const handleCheckOpenEndedAnswers = async () => {
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
      
      // Używamy istniejącego API do sprawdzania odpowiedzi
      const response = await fetch('/api/tests/check-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: sortedTests[currentTestIndex].test_id,
          userId,
          questions: currentQuestions,
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
  
  // Zapisywanie wyników testu
  const saveTestResults = async (score: number, feedback = null) => {
    try {
      if (!userId) {
        console.warn("User ID not available. Cannot save test results.");
        return;
      }
      
      const currentTest = sortedTests[currentTestIndex];
      
      // Przygotowanie odpowiedzi do zapisu
      let answers;
      
      if (currentTest.question_type === 'multiple_choice') {
        answers = currentQuestions.map((question, index) => ({
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
      
      // Używamy istniejącego API do zapisu wyników
      const response = await fetch('/api/tests/save-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: currentTest.test_id,
          userId,
          score,
          answers
        }),
      });
      
      if (!response.ok) {
        throw new Error('Nie udało się zapisać wyników testu');
      }
      
      // Aktualizuj lokalny stan wyników
      const updatedTest = { ...currentTest, score };
      setTests(prevTests => prevTests.map(test => 
        test.test_id === updatedTest.test_id ? updatedTest : test
      ));
      
    } catch (error) {
      console.error("Błąd zapisywania wyników testu:", error);
      toast({
        title: "Błąd zapisywania wyników",
        description: "Nie udało się zapisać wyników testu w bazie danych.",
        variant: "destructive",
      });
    }
  };
  
  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentTestIndex < sortedTests.length - 1) {
        switchTest(currentTestIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentTestIndex > 0) {
        switchTest(currentTestIndex - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTestIndex, sortedTests.length, onClose]);
  
  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  

  
  // Jeśli trwa ładowanie
  if (loading) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Biblioteka testów projektu</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Ładowanie testów...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Bieżący test
  const currentTest = sortedTests[currentTestIndex];
  
  // Jeśli nie ma testów po załadowaniu (faktyczny brak testów w bazie danych)
  if (!loading && tests.length === 0) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Biblioteka testów projektu</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Brak testów</h3>
            <p className="text-muted-foreground mb-6">
              W tym projekcie nie ma jeszcze żadnych testów. Otwórz dokument PDF i utwórz testy.
            </p>
            <Button onClick={onClose}>Wróć do projektu</Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
      {/* Nagłówek */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} title="Wróć do projektu">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <GraduationCap className="h-5 w-5 text-blue-500" />
          
          <h2 className="text-lg font-semibold">Biblioteka testów projektu</h2>
          
          <div className="ml-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
              {sidebarOpen ? 'Ukryj menu' : 'Pokaż menu'}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Przycisk resetowania filtrów - pokazuj tylko gdy są aktywne filtry */}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="gap-2" onClick={resetFilters}>
              <FilterX className="h-4 w-4" />
              Resetuj filtry
            </Button>
          )}

          {/* Dropdown do filtrowania */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtruj
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Typ testu</DropdownMenuLabel>
              <DropdownMenuCheckboxItem 
                checked={filterType === 'multiple_choice'}
                onCheckedChange={() => setFilterType(filterType === 'multiple_choice' ? null : 'multiple_choice')}
              >
                Pytania zamknięte
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={filterType === 'open_ended'}
                onCheckedChange={() => setFilterType(filterType === 'open_ended' ? null : 'open_ended')}
              >
                Pytania otwarte
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Plik źródłowy</DropdownMenuLabel>
              {project?.attached_file?.map((file) => (
                <DropdownMenuCheckboxItem 
                  key={file.file_id}
                  checked={filterByFile === file.file_id}
                  onCheckedChange={() => setFilterByFile(filterByFile === file.file_id ? null : file.file_id)}
                >
                  {file.file_name}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem 
                checked={filterType === 'completed'}
                onCheckedChange={() => setFilterType(filterType === 'completed' ? null : 'completed')}
              >
                Rozwiązane
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={filterType === 'not_completed'}
                onCheckedChange={() => setFilterType(filterType === 'not_completed' ? null : 'not_completed')}
              >
                Nierozwiązane
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Sortowanie</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                {sortBy === 'newest' && "✓ "}Od najnowszych
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                {sortBy === 'oldest' && "✓ "}Od najstarszych
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
                {sortBy === 'alphabetical' && "✓ "}Alfabetycznie
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={resetFilters}>
                Resetuj filtry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Dropdown do wyboru testu - pokazuj tylko gdy są testy do wyświetlenia */}
          {sortedTests.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {currentTest.test_name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[50vh] overflow-y-auto">
                {sortedTests.map((test, index) => (
                  <DropdownMenuItem 
                    key={test.test_id} 
                    onClick={() => switchTest(index)}
                    className={`flex items-center justify-between ${currentTestIndex === index ? 'bg-muted' : ''}`}
                  >
                    <div className="flex flex-col gap-1 mr-2">
                      <span>{test.test_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {test.fileName || 'Bez pliku'} · {formatDate(test.created_at)}
                      </span>
                    </div>
                    
                    {test.score !== undefined && (
                      <Badge variant={test.score >= 70 ? "success" : "warning"}>
                        {test.score}%
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Główna zawartość */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lewy panel - lista testów */}
        {sidebarOpen && (
          <div 
            className={`w-80 border-r flex flex-col ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Szukaj w testach..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="font-medium text-sm">Lista testów</h3>
              <span className="text-xs text-muted-foreground">
                {sortedTests.length} {sortedTests.length === 1 ? 'test' : 
                  sortedTests.length < 5 ? 'testy' : 'testów'}
              </span>
            </div>
            
            <ScrollArea className="flex-1">
              {sortedTests.length === 0 ? (
                <div className="p-6 text-center">
                  <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h4 className="font-medium mb-2">Brak wyników</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nie znaleziono testów spełniających kryteria filtrowania.
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                    <FilterX className="h-4 w-4" />
                    Resetuj filtry
                  </Button>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  {sortedTests.map((test, index) => (
                    <Card 
                      key={test.test_id}
                      className={`p-3 cursor-pointer border transition-colors ${
                        currentTestIndex === index 
                          ? (darkMode ? 'bg-slate-700 border-blue-500' : 'bg-blue-50 border-blue-200') 
                          : (darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-gray-50')
                      }`}
                      onClick={() => switchTest(index)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium line-clamp-1">{test.test_name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant={test.question_type === 'multiple_choice' ? 'secondary' : 'outline'} className="text-xs">
                              {test.question_type === 'multiple_choice' ? 'Zamknięte' : 'Otwarte'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {test.questionsCount || 0} {test.questionsCount === 1 ? 'pytanie' : 
                                test.questionsCount < 5 ? 'pytania' : 'pytań'}
                            </Badge>
                          </div>
                        </div>
                        
                        {test.score !== undefined && (
                          <Badge variant={test.score >= 70 ? "success" : "warning"} className="ml-2">
                            {test.score}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(test.created_at)}</span>
                        </div>
                        {test.fileName && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{test.fileName}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {sortedTests.length > 0 && (
              <div className="p-3 border-t flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {currentTestIndex + 1} / {sortedTests.length} testów
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentTestIndex === 0}
                    onClick={() => switchTest(currentTestIndex - 1)}
                    title="Poprzedni test"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentTestIndex === sortedTests.length - 1}
                    onClick={() => switchTest(currentTestIndex + 1)}
                    title="Następny test"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Główny panel - szczegóły testu */}
        <div className="flex-1 overflow-auto" ref={testContainerRef}>
          {sortedTests.length === 0 ? (
            // Widok gdy filtrowanie nie zwraca wyników
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6">
                <Filter className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Brak wyników filtrowania</h3>
                <p className="text-muted-foreground mb-6">
                  Nie znaleziono testów spełniających wybrane kryteria. Spróbuj zmienić filtry lub wyszukiwanie.
                </p>
                <Button onClick={resetFilters} className="gap-2">
                  <FilterX className="h-4 w-4" />
                  Resetuj filtry
                </Button>
              </div>
            </div>
          ) : (
            // Normalny widok testu
            <div className="max-w-4xl mx-auto p-6">
              {/* Nawigacja */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Home className="h-4 w-4" />
                <span>Projekt: {project?.subject_name}</span>
                <ChevronRight className="h-4 w-4" />
                <span>Test: {currentTest.test_name}</span>
              </div>
              
              {/* Nagłówek testu */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold">{currentTest.test_name}</h1>
                  
                  {currentTest.score !== undefined && (
                    <Badge variant={currentTest.score >= 70 ? "success" : "warning"} className="text-lg py-1 px-3">
                      {currentTest.score}%
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant={currentTest.question_type === 'multiple_choice' ? 'secondary' : 'outline'} className="text-sm">
                    {currentTest.question_type === 'multiple_choice' ? 'Pytania zamknięte' : 'Pytania otwarte'}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {currentTest.questionsCount || 0} {currentTest.questionsCount === 1 ? 'pytanie' : 
                      currentTest.questionsCount < 5 ? 'pytania' : 'pytań'}
                  </Badge>
                  <Badge variant={currentTest.save_score ? 'default' : 'secondary'} className="text-sm">
                    {currentTest.save_score ? 'Zapisywanie wyników' : 'Tryb ćwiczeniowy'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Utworzono: {formatDate(currentTest.created_at)}</span>
                  </div>
                  {currentTest.fileName && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>Plik: {currentTest.fileName}</span>
                    </div>
                  )}
                </div>
                
                <Separator className="my-6" />
              </div>
              
              {/* Tryb podglądu testu */}
              {!takingTest && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Informacje o teście</h2>
                    <Button 
                      onClick={startTest} 
                      className="gap-2"
                      disabled={testInProgress && testSubmitted}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {testInProgress && testSubmitted ? 'Test już rozwiązany' : 
                       currentTest.score !== undefined ? 'Rozwiąż ponownie' : 'Rozpocznij test'}
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                        <BarChart4 className="h-5 w-5 text-blue-500" />
                        Statystyki testu
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Liczba pytań:</span>
                            <span className="font-medium">{currentTest.questionsCount || 0}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Typ pytań:</span>
                            <span className="font-medium">
                              {currentTest.question_type === 'multiple_choice' ? 'Zamknięte' : 'Otwarte'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Tryb zapisywania:</span>
                            <span className="font-medium">
                              {currentTest.save_score ? 'Zapisywanie wyników' : 'Tryb ćwiczeniowy'}
                            </span>
                          </div>
                        </div>
                        {currentTest.score !== undefined && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Twój wynik:</span>
                              <span className="font-medium">{currentTest.score}%</span>
                            </div>
                            <Progress 
                              value={currentTest.score} 
                              className="h-2"
                              color={currentTest.score >= 70 ? 'bg-green-500' : 'bg-amber-500'}
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-indigo-500" />
                        Informacje o treści
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {currentTest.question_type === 'multiple_choice' 
                          ? 'Ten test zawiera pytania jednokrotnego wyboru. Każde pytanie ma tylko jedną poprawną odpowiedź.'
                          : 'Ten test zawiera pytania otwarte. Twoje odpowiedzi będą analizowane przez AI i porównywane z wzorcowymi odpowiedziami.'}
                      </p>
                      
                      <Button 
                        onClick={startTest} 
                        className="w-full gap-2"
                        disabled={testInProgress && testSubmitted}
                      >
                        <PlayCircle className="h-4 w-4" />
                        {testInProgress && testSubmitted ? 'Test już rozwiązany' : 
                         currentTest.score !== undefined ? 'Rozwiąż ponownie' : 'Rozpocznij test'}
                      </Button>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Tryb rozwiązywania testu */}
              {takingTest && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">
                      {testSubmitted ? 'Wyniki testu' : 'Rozwiązywanie testu'}
                    </h2>
                    
                    {testSubmitted ? (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setTakingTest(false)}
                        >
                          Wróć do podglądu
                        </Button>
                        <Button 
                          onClick={() => {
                            setTestInProgress(false);
                            setTestSubmitted(false);
                            setUserAnswers([]);
                            setAnswerFeedback([]);
                            startTest();
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Rozwiąż ponownie
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => currentTest.question_type === 'multiple_choice' 
                          ? handleSubmitMultipleChoiceTest() 
                          : handleCheckOpenEndedAnswers()
                        }
                        disabled={isCheckingAnswers}
                        className="gap-2"
                      >
                        {isCheckingAnswers ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Sprawdzanie...
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4" />
                            Sprawdź odpowiedzi
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {testSubmitted && (
                    <div className="mb-6">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Twój wynik</h3>
                          <Badge variant={testScore >= 70 ? "success" : "warning"} className="text-lg py-1 px-3">
                            {testScore}%
                          </Badge>
                        </div>
                        <Progress 
                          value={testScore} 
                          className="h-2 mt-2"
                          color={testScore >= 70 ? 'bg-green-500' : 'bg-amber-500'}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          {testScore >= 70 
                            ? 'Gratulacje! Dobrze opanowałeś materiał.' 
                            : 'Przejrzyj błędne odpowiedzi i spróbuj ponownie.'}
                        </p>
                      </Card>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    {currentQuestions.map((question, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div 
                          className={`p-4 cursor-pointer flex justify-between items-center border-b ${
                            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => toggleQuestionExpand(index)}
                        >
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{index + 1}.</span>
                            <span className="font-medium truncate">{question.question.length > 70 ? 
                              `${question.question.substring(0, 70)}...` : question.question}</span>
                          </div>
                          <div className="flex items-center">
                            {testSubmitted && answerFeedback[index] && (
                              <Badge 
                                variant={answerFeedback[index].isCorrect ? 'success' : 'destructive'} 
                                className="mr-2"
                              >
                                {answerFeedback[index].isCorrect ? 'Poprawna' : 'Błędna'}
                              </Badge>
                            )}
                            <ChevronDown className={`h-5 w-5 transition-transform ${
                              expandedQuestions[index] ? 'transform rotate-180' : ''
                            }`} />
                          </div>
                        </div>
                        
                        {expandedQuestions[index] && (
                          <div className="p-4">
                            <div className="mb-4">
                              <p className="font-medium mb-2">{question.question}</p>
                              {question.context && (
                                <div className="bg-muted p-3 rounded-md text-sm italic mb-3">
                                  <p className="text-muted-foreground">Kontekst:</p>
                                  <p>{question.context}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Pytania zamknięte */}
                            {currentTest.question_type === 'multiple_choice' && question.options && (
                              <div className="space-y-2">
                                <RadioGroup 
                                  value={userAnswers[index] || ''} 
                                  onValueChange={(value) => handleAnswerChange(index, value)}
                                  disabled={testSubmitted}
                                >
                                  {question.options.map((option, optionIndex) => (
                                    <div 
                                      key={optionIndex} 
                                      className={`flex items-center space-x-2 p-2 rounded-md ${
                                        testSubmitted && option === question.correctAnswer
                                          ? 'bg-green-50 dark:bg-green-900/20' 
                                          : testSubmitted && userAnswers[index] === option && option !== question.correctAnswer
                                            ? 'bg-red-50 dark:bg-red-900/20'
                                            : ''
                                      }`}
                                    >
                                      <RadioGroupItem value={option} id={`q${index}-opt${optionIndex}`} />
                                      <Label htmlFor={`q${index}-opt${optionIndex}`} className="flex-1 cursor-pointer">
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
                                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <p className="font-medium">Wyjaśnienie:</p>
                                    <p className="text-sm">{question.explanation}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Pytania otwarte */}
                            {currentTest.question_type === 'open_ended' && (
                              <div className="space-y-3">
                                <Textarea 
                                  placeholder="Twoja odpowiedź..."
                                  value={userAnswers[index] || ''}
                                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                                  disabled={testSubmitted}
                                  rows={4}
                                />
                                
                                {testSubmitted && answerFeedback[index] && (
                                  <div className={`p-3 rounded-md ${
                                    answerFeedback[index].isCorrect 
                                      ? 'bg-green-50 dark:bg-green-900/20' 
                                      : 'bg-amber-50 dark:bg-amber-900/20'
                                  }`}>
                                    <p className="font-medium mb-1">
                                      {answerFeedback[index].isCorrect ? 'Odpowiedź poprawna' : 'Odpowiedź częściowo poprawna'}
                                    </p>
                                    <p className="text-sm">{answerFeedback[index].feedback}</p>
                                    
                                    {!answerFeedback[index].isCorrect && answerFeedback[index].correctAnswer && (
                                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                                        <p className="font-medium">Przykładowa poprawna odpowiedź:</p>
                                        <p className="text-sm">{answerFeedback[index].correctAnswer}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                  
                  {!testSubmitted && (
                    <div className="mt-8 flex justify-end">
                      <Button 
                        onClick={() => currentTest.question_type === 'multiple_choice' 
                          ? handleSubmitMultipleChoiceTest() 
                          : handleCheckOpenEndedAnswers()
                        }
                        disabled={isCheckingAnswers}
                        className="gap-2"
                      >
                        {isCheckingAnswers ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Sprawdzanie...
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4" />
                            Sprawdź odpowiedzi
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Przycisk "Do góry" */}
          <div className="fixed bottom-6 right-6">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full shadow-lg"
              onClick={() => {
                if (testContainerRef.current) {
                  testContainerRef.current.scrollTop = 0;
                }
              }}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTests;