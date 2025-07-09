"use client";

import React, { useRef } from 'react';
import { useParams } from 'next/navigation';
import { usePreferences } from "@/context/preferences-context";
import { useProjects } from "@/context/projects-context";
import { useProjectTests } from '@/app/project/[id]/hooks/useProjectTests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
} from "lucide-react";
import type { MultipleChoiceQuestion } from '@/app/project/[id]/hooks/useProjectTests';

interface ProjectTestsProps {
  projectId: number;
  onClose: () => void;
}

const ProjectTests: React.FC<ProjectTestsProps> = ({ projectId, onClose }) => {
  const { darkMode } = usePreferences();
  const { projects } = useProjects();
  const params = useParams();
  const testContainerRef = useRef<HTMLDivElement>(null);

  // Get project
  const project = projects.find(
    (p) => p.project_id.toString() === params.id?.toString() || p.project_id === projectId
  );

  // Use the project tests hook (używamy działającego hooka)
  const {
    tests,
    loading,
    selectedTest,
    sidebarOpen,
    searchTerm,
    filterType,
    filterByFile,
    isTestTaking,
    currentQuestions,
    userAnswers,
    sortBy,
    testSubmitted,
    testScore,
    answerFeedback,
    isCheckingAnswers,
    expandedQuestions,
    hasActiveFilters,
    setSidebarOpen,
    setSearchTerm,
    setFilterType,
    setFilterByFile,
    getFilteredAndSortedTests,
    handleSelectTest,
    startTest,
    handleRestartTest,
    handleAnswerChange,
    toggleQuestionExpand,
    handleSubmitMultipleChoiceTest,
    handleCheckOpenEndedAnswers,
    resetFilters,
    setSortBy,
    formatDate
  } = useProjectTests({ projectId, project });

  const sortedTests = getFilteredAndSortedTests();

  // Stan dla nawigacji jak w oryginale
  const [currentTestIndex, setCurrentTestIndex] = React.useState(0);

  // Funkcja switchTest jak w oryginale
  const switchTest = (index: number) => {
    if (index >= 0 && index < sortedTests.length) {
      setCurrentTestIndex(index);
      handleSelectTest(sortedTests[index]);
    }
  };

  // Ustaw currentTestIndex gdy selectedTest się zmieni
  React.useEffect(() => {
    if (selectedTest) {
      const index = sortedTests.findIndex(test => test.test_id === selectedTest.test_id);
      if (index !== -1) {
        setCurrentTestIndex(index);
      }
    }
  }, [selectedTest, sortedTests]);

  // Automatycznie wybierz pierwszy test
  React.useEffect(() => {
    if (sortedTests.length > 0 && !selectedTest) {
      handleSelectTest(sortedTests[0]);
    }
  }, [sortedTests, selectedTest, handleSelectTest]);

  // Obsługa klawiatury jak w oryginale
  React.useEffect(() => {
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

  // Bieżący test
  const currentTest = sortedTests[currentTestIndex];

  // Formatowanie daty z oryginału
  const formatDateOriginal = (dateString: string) => {
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
  
  // Jeśli nie ma testów po załadowaniu
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
          {/* Przycisk resetowania filtrów */}
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
  <DropdownMenuLabel>Sortowanie</DropdownMenuLabel>
  <DropdownMenuCheckboxItem 
    checked={sortBy === 'newest'}
    onCheckedChange={() => setSortBy('newest')}
  >
    Najnowsze
  </DropdownMenuCheckboxItem>
  <DropdownMenuCheckboxItem 
    checked={sortBy === 'oldest'}
    onCheckedChange={() => setSortBy('oldest')}
  >
    Najstarsze
  </DropdownMenuCheckboxItem>
  <DropdownMenuCheckboxItem 
    checked={sortBy === 'alphabetical'}
    onCheckedChange={() => setSortBy('alphabetical')}
  >
    Alfabetycznie
  </DropdownMenuCheckboxItem>
  
  <DropdownMenuSeparator />
  
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
              <DropdownMenuItem onClick={resetFilters}>
                Resetuj filtry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Dropdown do wyboru pliku źródłowego */}
          {project?.attached_file && project.attached_file.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {filterByFile 
                    ? project.attached_file.find((f: any) => f.file_id === filterByFile)?.file_name || 'Wybierz plik'
                    : 'Wszystkie pliki'
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setFilterByFile(null)}
                  className={`flex items-center ${filterByFile === null ? 'bg-muted' : ''}`}
                >
                  Wszystkie pliki
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {project.attached_file.map((file: any) => (
                  <DropdownMenuItem
                    key={file.file_id}
                    onClick={() => setFilterByFile(file.file_id)}
                    className={`flex items-center ${filterByFile === file.file_id ? 'bg-muted' : ''}`}
                  >
                    {file.file_name}
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
<div 
  className={`transition-all duration-300 ease-in-out overflow-hidden ${
    sidebarOpen ? 'w-80' : 'w-0'
  } border-r flex flex-col ${
    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
  }`}
>
  <div className="w-80 h-full overflow-auto">
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
                          <span>{formatDateOriginal(test.created_at)}</span>
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
          </div>
        
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
          ) : currentTest && (
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
                    <span>Utworzono: {formatDateOriginal(currentTest.created_at)}</span>
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
              {!isTestTaking && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Informacje o teście</h2>
          
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
                      >
                        <PlayCircle className="h-4 w-4" />
                        {currentTest.score !== undefined ? 'Rozwiąż ponownie' : 'Rozpocznij test'}
                      </Button>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Tryb rozwiązywania testu */}
              {isTestTaking && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">
                      {testSubmitted ? 'Wyniki testu' : 'Rozwiązywanie testu'}
                    </h2>
                    
                    {testSubmitted ? (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => startTest()}
                        >
                          Wróć do podglądu
                        </Button>
                        <Button 
                          onClick={handleRestartTest}
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
                                  {question.options.map((option: string, optionIndex: number) => (
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