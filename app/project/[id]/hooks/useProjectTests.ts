"use client";

import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useUserId } from '@/hooks/useAuthApi';

// Interfaces z useTests.ts
export interface TestConfig {
  name: string;
  questionType: 'multiple_choice' | 'open_ended';
  questionCount: number;
  optionsCount: number;
  difficulty: number;
  saveScore: boolean;
}

export interface MultipleChoiceQuestion {
  question: string;
  context?: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface OpenEndedQuestion {
  question: string;
  context?: string;
  correctAnswer: string;
}

export interface AnswerFeedback {
  grade: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  correctAnswer?: string;
  isCorrect?: boolean; // backwards compatibility
}

export interface Test {
  test_id: number;
  test_name: string;
  question_type: 'multiple_choice' | 'open_ended';
  created_at: string;
  content: string;
  save_score: boolean;
  file_id?: number;
  fileName?: string;
  score?: number;
  questionsCount?: number;
}

interface UseProjectTestsProps {
  projectId: number;
  project?: any; // Projekt z attached_file
}

export function useProjectTests({ projectId, project }: UseProjectTestsProps) {
  const { toast } = useToast();
  const userId = useUserId();

  // Core states
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  // UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterByFile, setFilterByFile] = useState<number | null>(null);

  // Test taking states
  const [isTestTaking, setIsTestTaking] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<(MultipleChoiceQuestion | OpenEndedQuestion)[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState<number>(0);
  const [answerFeedback, setAnswerFeedback] = useState<(AnswerFeedback | null)[]>([]);
  const [isCheckingAnswers, setIsCheckingAnswers] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<boolean[]>([]);
  
  // New state for viewing results
  const [isViewingResults, setIsViewingResults] = useState(false);

  // Fetch tests from project
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        
        // Check if project has any files
        if (!project || !project.attached_file || project.attached_file.length === 0) {
          console.log("No files in project, cannot fetch tests");
          setLoading(false);
          return;
        }
        
        // Use first file ID to fetch all project tests
        const firstFileId = project.attached_file[0].file_id;
        console.log(`Fetching tests using fileId=${firstFileId} from project ID=${projectId}`);
        
        const response = await fetch(`/api/tests?fileId=${firstFileId}&projectOnly=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tests');
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} tests for project`);
        
        // Process tests - add question count and file names
        const processedTests = data.map((test: Test) => {
          let questionsCount = 0;
          try {
            const content = JSON.parse(test.content);
            questionsCount = content.questions?.length || 0;
          } catch (e) {
            console.error("Cannot parse test content:", e);
          }
          
          // Add file name if file exists
          let fileName = "";
          if (test.file_id && project.attached_file) {
            const matchingFile = project.attached_file.find(
              (file: any) => file.file_id === test.file_id
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
        
        // Fetch test results if user is logged in
        if (processedTests.length > 0 && userId) {
          await fetchAllTestResults(processedTests);
        }
      } catch (error) {
        console.error('Error fetching tests:', error);
        toast({
          title: "Error",
          description: "Failed to load tests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTests();
  }, [projectId, userId, toast, project]);

  // Fetch results for all tests
  const fetchAllTestResults = async (testsToCheck: Test[]) => {
    try {
      const updatedTests = [...testsToCheck];
      
      for (const test of updatedTests) {
        const response = await fetch(`/api/tests/results?testId=${test.test_id}&userId=${userId}`);
        
        if (response.ok) {
          const result = await response.json();
          
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
      
      setTests(updatedTests);
    } catch (error) {
      console.error('Error fetching test results:', error);
    }
  };

  // Filter and sort tests
  const getFilteredAndSortedTests = () => {
    let filtered = tests.filter(test => {
      // Search filter
      if (searchTerm && !test.test_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // File filter
      if (filterByFile !== null && test.file_id !== filterByFile) {
        return false;
      }
      
      // Type filter
      if (filterType) {
        if (filterType === 'multiple_choice' && test.question_type !== 'multiple_choice') return false;
        if (filterType === 'open_ended' && test.question_type !== 'open_ended') return false;
        if (filterType === 'completed' && test.score === undefined) return false;
        if (filterType === 'not_completed' && test.score !== undefined) return false;
      }
      
      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'alphabetical') {
        return a.test_name.localeCompare(b.test_name);
      }
      return 0;
    });
  };

  // Select test and check for existing results
  const handleSelectTest = async (test: Test) => {
    setSelectedTest(test);
    resetTestStates();

    // Check for existing results
    if (userId) {
      try {
        const response = await fetch(`/api/tests/results?testId=${test.test_id}&userId=${userId}`);
        if (response.ok) {
          const results = await response.json();
          if (results.exists) {
            setTestScore(results.score);
            
            // Update test in the list
            setTests(prevTests => 
              prevTests.map(t => 
                t.test_id === test.test_id 
                  ? { ...t, score: results.score }
                  : t
              )
            );
          }
        }
      } catch (error) {
        console.error("Error fetching test results:", error);
      }
    }
  };

  // Reset test states
  const resetTestStates = () => {
    setIsTestTaking(false);
    setTestSubmitted(false);
    setUserAnswers([]);
    setAnswerFeedback([]);
    setExpandedQuestions([]);
    setCurrentQuestions([]);
    setIsViewingResults(false);
  };

  // Start test (fresh)
  const startTest = () => {
    if (!selectedTest) return;
    
    try {
      const content = JSON.parse(selectedTest.content);
      if (!content.questions || !content.questions.length) {
        throw new Error('No questions in test');
      }
      
      // Reset states for fresh test start
      setCurrentQuestions(content.questions);
      setUserAnswers(new Array(content.questions.length).fill(''));
      setExpandedQuestions(new Array(content.questions.length).fill(true));
      setAnswerFeedback(new Array(content.questions.length).fill(null));
      setIsTestTaking(true);
      setTestSubmitted(false);
      setIsViewingResults(false);
    } catch (error) {
      console.error("Error starting test:", error);
      toast({
        title: "Error starting test",
        description: "Cannot load questions. Test format is invalid.",
        variant: "destructive",
      });
    }
  };

  // Start fresh test (reset previous results)
  const startFreshTest = () => {
    if (!selectedTest) return;
    
    resetTestStates();
    
    // Remove score from current test
    setTests(prevTests => 
      prevTests.map(test => 
        test.test_id === selectedTest.test_id 
          ? { ...test, score: undefined }
          : test
      )
    );
    
    startTest();
  };

  // View saved results
  const viewResults = async () => {
    if (!selectedTest || !userId) return;
    
    try {
      const response = await fetch(`/api/tests/results?testId=${selectedTest.test_id}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const results = await response.json();
      if (!results.exists) {
        toast({
          title: "No results found",
          description: "No saved results found for this test.",
          variant: "destructive",
        });
        return;
      }
      
      // Parse test content to get questions
      let testContent;
      try {
        testContent = JSON.parse(selectedTest.content);
      } catch (e) {
        console.error("Cannot parse test content:", e);
        toast({
          title: "Error",
          description: "Cannot load test content.",
          variant: "destructive",
        });
        return;
      }
      
      // Set up results viewing state
      setCurrentQuestions(testContent.questions);
      setUserAnswers(results.answers.map((answer: any) => answer.user_answer || ''));
      
      // Map feedback to include isCorrect for backward compatibility
      const mappedFeedback = results.feedback?.map((fb: any) => ({
        ...fb,
        isCorrect: fb.grade === 'correct' || fb.isCorrect === true
      })) || [];
      
      setAnswerFeedback(mappedFeedback);
      setExpandedQuestions(new Array(testContent.questions.length).fill(false));
      setTestScore(results.score);
      setIsTestTaking(true);
      setTestSubmitted(true);
      setIsViewingResults(true);
      
    } catch (error) {
      console.error("Error fetching results:", error);
      toast({
        title: "Error",
        description: "Failed to load test results.",
        variant: "destructive",
      });
    }
  };

  // Go back to overview
  const backToOverview = () => {
    setIsTestTaking(false);
    setTestSubmitted(false);
    setIsViewingResults(false);
  };

  // Restart test
  const handleRestartTest = () => {
    startFreshTest();
  };

  // Handle answer change
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
  };

  // Toggle question expansion
  const toggleQuestionExpand = (index: number) => {
    const newExpandedState = [...expandedQuestions];
    newExpandedState[index] = !newExpandedState[index];
    setExpandedQuestions(newExpandedState);
  };

  // Submit multiple choice test
  const handleSubmitMultipleChoiceTest = async () => {
    const unansweredQuestions = userAnswers.filter(answer => !answer).length;
    
    if (unansweredQuestions > 0) {
      toast({
        title: "Complete all answers",
        description: `${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} not answered.`,
        variant: "destructive",
      });
      return;
    }
    
    // Calculate score
    let correctCount = 0;
    const feedback: AnswerFeedback[] = [];
    
    for (let i = 0; i < currentQuestions.length; i++) {
      const question = currentQuestions[i] as MultipleChoiceQuestion;
      const isCorrect = userAnswers[i] === question.correctAnswer;
      if (isCorrect) correctCount++;
      
      feedback.push({
        grade: isCorrect ? 'correct' : 'incorrect',
        isCorrect,
        feedback: isCorrect 
          ? "Correct answer" 
          : `Incorrect. Correct answer: ${question.correctAnswer}`,
        correctAnswer: question.correctAnswer
      });
    }
    
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    
    setTestScore(score);
    setAnswerFeedback(feedback);
    setTestSubmitted(true);
    setIsViewingResults(true);

    // Save results
    await saveTestResults(score, feedback);

    // Update test in list
    setTests(prevTests => 
      prevTests.map(test => 
        test.test_id === selectedTest!.test_id 
          ? { ...test, score: score }
          : test
      )
    );

    toast({
      title: "Test completed",
      description: `Your score: ${score}%`,
      variant: score >= 70 ? "default" : "destructive",
    });
  };

  // Check open-ended answers
  const handleCheckOpenEndedAnswers = async () => {
    if (!userId) {
      console.warn("User ID not available. Cannot check answers.");
      return;
    }
    
    const unansweredQuestions = userAnswers.filter(answer => !answer.trim()).length;
    
    if (unansweredQuestions > 0) {
      toast({
        title: "Complete all answers",
        description: `${unansweredQuestions} question${unansweredQuestions === 1 ? '' : 's'} not answered.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsCheckingAnswers(true);
    
    try {
      toast({
        title: "Checking answers",
        description: "AI is analyzing your answers. This may take up to 30 seconds.",
      });
      
      const response = await fetch('/api/tests/check-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: selectedTest!.test_id,
          userId,
          questions: currentQuestions,
          answers: userAnswers
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check answers');
      }
      
      const result = await response.json();
      
      // Map feedback to include isCorrect for backward compatibility
      const mappedFeedback = result.feedback.map((fb: any) => ({
        ...fb,
        isCorrect: fb.grade === 'correct'
      }));
      
      setAnswerFeedback(mappedFeedback);
      setTestScore(result.score);
      setTestSubmitted(true);
      setIsViewingResults(true);

      // Save results
      await saveTestResults(result.score, mappedFeedback);

      // Update test in list
      setTests(prevTests => 
        prevTests.map(test => 
          test.test_id === selectedTest!.test_id 
            ? { ...test, score: result.score }
            : test
        )
      );

      toast({
        title: "Checking complete",
        description: `Your score: ${result.score}%. ${
          result.score >= 70 ? 'Good job!' : 'Review the feedback to learn more.'
        }`,
        variant: result.score >= 70 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error checking answers:", error);
      toast({
        title: "Error checking answers",
        description: error instanceof Error ? error.message : "There was a problem checking your answers.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingAnswers(false);
    }
  };

  // Save test results
  const saveTestResults = async (score: number, feedback: AnswerFeedback[] | null = null) => {
    try {
      if (!userId || !selectedTest) {
        console.warn("User ID or selected test not available. Cannot save test results.");
        return;
      }
      
      // Prepare answers for saving
      let answers;
      
      if (selectedTest.question_type === 'multiple_choice') {
        answers = (currentQuestions as MultipleChoiceQuestion[]).map((question, index) => ({
          question_id: index,
          user_answer: userAnswers[index],
          is_correct: userAnswers[index] === question.correctAnswer,
          points: userAnswers[index] === question.correctAnswer ? 1 : 0,
          grade: userAnswers[index] === question.correctAnswer ? 'correct' : 'incorrect',
          feedback: null
        }));
      } else {
        // For open-ended questions use feedback
        answers = feedback?.map((fb, index) => ({
          question_id: index,
          user_answer: userAnswers[index],
          is_correct: fb.grade === 'correct',
          points: fb.grade === 'correct' ? 1 : fb.grade === 'partial' ? 0.5 : 0,
          grade: fb.grade,
          feedback: fb.feedback
        })) || [];
      }
      
      const response = await fetch('/api/tests/save-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: selectedTest.test_id,
          userId,
          score,
          answers
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save test results');
      }
      
      console.log("Test results saved successfully");
      
    } catch (error) {
      console.error("Error saving test results:", error);
      toast({
        title: "Error saving results",
        description: "Failed to save test results to database.",
        variant: "destructive",
      });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterType(null);
    setFilterByFile(null);
    setSearchTerm('');
    setSortBy('newest');
    setSelectedTest(null);
  };

  // Check if filters are active
  const hasActiveFilters = filterType !== null || filterByFile !== null || searchTerm !== '' || selectedTest !== null;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return {
    // States
    tests,
    loading,
    selectedTest,
    sidebarOpen,
    searchTerm,
    sortBy,
    filterType,
    filterByFile,
    isTestTaking,
    currentQuestions,
    userAnswers,
    testSubmitted,
    testScore,
    answerFeedback,
    isCheckingAnswers,
    expandedQuestions,
    hasActiveFilters,
    isViewingResults,

    // Setters
    setSidebarOpen,
    setSearchTerm,
    setSortBy,
    setFilterType,
    setFilterByFile,

    // Functions
    getFilteredAndSortedTests,
    handleSelectTest,
    startTest,
    startFreshTest,
    viewResults,
    backToOverview,
    handleRestartTest,
    handleAnswerChange,
    toggleQuestionExpand,
    handleSubmitMultipleChoiceTest,
    handleCheckOpenEndedAnswers,
    resetFilters,
    formatDate
  };
}