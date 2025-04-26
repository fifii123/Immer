"use client";

import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useUserId } from '@/hooks/useAuthApi';

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
  isCorrect: boolean;
  feedback: string;
  correctAnswer?: string;
}

export interface Test {
  test_id: number;
  test_name: string;
  question_type: string;
  created_at: string;
  content: string;
  save_score: boolean;
}

interface UseTestsProps {
  fileId: number;
  projectId?: number;
  noteId?: number;
}

export function useTests({ fileId, projectId, noteId }: UseTestsProps) {
  // Tests state
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isTestGenerationDialogOpen, setIsTestGenerationDialogOpen] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [takingTest, setTakingTest] = useState(false);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    name: '',
    questionType: 'multiple_choice',
    questionCount: 5,
    optionsCount: 4,
    difficulty: 2,
    saveScore: false
  });

  // Test taking state
  const [currentMultipleChoiceQuestions, setCurrentMultipleChoiceQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [currentOpenEndedQuestions, setCurrentOpenEndedQuestions] = useState<OpenEndedQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [answerFeedback, setAnswerFeedback] = useState<(AnswerFeedback | null)[]>([]);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testHasResults, setTestHasResults] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [isCheckingAnswers, setIsCheckingAnswers] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<boolean[]>([]);

  const { toast } = useToast();
  const { userId } = useUserId();
  
  // Fetch tests when component mounts
  useEffect(() => {
    if (fileId) {
      fetchTests();
    }
  }, [fileId]);

  // Function to fetch tests
  const fetchTests = async () => {
    if (!fileId) return;
    
    try {
      const response = await fetch(`/api/tests?fileId=${fileId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  // Helper functions for test state in localStorage
  const getInProgressTestStateKey = (testId: number) => `test_in_progress_${testId}`;

  const saveInProgressTestState = (testId: number, userAnswers: string[]) => {
    if (!testId) return;
    
    const testState = {
      testId,
      userAnswers,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(getInProgressTestStateKey(testId), JSON.stringify(testState));
  };

  const loadInProgressTestState = (testId: number) => {
    if (!testId) return null;
    
    const storedState = localStorage.getItem(getInProgressTestStateKey(testId));
    if (!storedState) return null;
    
    try {
      return JSON.parse(storedState);
    } catch (error) {
      console.error("Error loading test state:", error);
      return null;
    }
  };

  const clearInProgressTestState = (testId: number) => {
    if (!testId) return;
    localStorage.removeItem(getInProgressTestStateKey(testId));
  };

  // Function to get number of questions in test
  const getTestQuestionCount = (test: Test) => {
    if (!test || !test.content) return 0;
    
    try {
      const content = JSON.parse(test.content);
      return content.questions ? content.questions.length : 0;
    } catch (error) {
      console.error("Error parsing test content:", error);
      return 0;
    }
  };

  // Function to fetch test results from database
  const fetchTestResults = async (testId: number) => {
    try {
      if (!userId) {
        console.warn("User ID not available. Cannot fetch test results.");
        return { exists: false };
      }
      
      const response = await fetch(`/api/tests/results?testId=${testId}&userId=${userId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching test results:", error);
      return { exists: false };
    }
  };

  // Function to handle test toggle in the list
  const handleToggleTest = (test: Test) => {
    // If test is already selected, deselect it
    if (selectedTest?.test_id === test.test_id) {
      setSelectedTest(null);
      setTestHasResults(false);
      setTestInProgress(false);
    } else {
      // Otherwise, select this test
      setSelectedTest(test);
      
      // Reset states
      setUserAnswers([]);
      setAnswerFeedback([]);
      setTestSubmitted(false);
      setTakingTest(false);
      setCurrentMultipleChoiceQuestions([]);
      setCurrentOpenEndedQuestions([]);
      setTestHasResults(false);
      setTestInProgress(false);
      
      // Check temporary test state
      const inProgressState = loadInProgressTestState(test.test_id);
      if (inProgressState && inProgressState.userAnswers.some(answer => answer)) {
        setTestInProgress(true);
      }
      
      // Check if userId is available and fetch test results
      if (userId) {
        fetchTestResults(test.test_id).then(results => {
          if (results.exists) {
            try {
              // Set test score
              setTestScore(results.score);
              setTestHasResults(true);
            } catch (error) {
              console.error("Error processing test results:", error);
            }
          }
        }).catch(error => {
          console.error("Error fetching test results:", error);
        });
      }
    }
  };

  // Function to generate test
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
          projectId: projectId,
          testName: testConfig.name,
          questionType: testConfig.questionType,
          questionCount: testConfig.questionCount,
          optionsCount: testConfig.optionsCount,
          difficulty: testConfig.difficulty,
          saveScore: testConfig.saveScore,
          noteId: noteId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate test');
      }
      
      const result = await response.json();
      
      // Add newly created test to list
      setTests(prevTests => [result, ...prevTests]);
      
      // Close configuration dialog
      setIsTestGenerationDialogOpen(false);
      
      // Reset configuration
      setTestConfig({
        name: '',
        questionType: 'multiple_choice',
        questionCount: 5,
        optionsCount: 4,
        difficulty: 2,
        saveScore: false
      });
      
      // Notify of success
      toast({
        title: "Test generated",
        description: "Your test has been successfully created.",
      });
      
      // Select newly created test
      handleSelectTest(result);
    } catch (error) {
      console.error("Error generating test:", error);
      toast({
        title: "Error generating test",
        description: error instanceof Error ? error.message : "There was a problem generating the test.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // Function to select a test
  const handleSelectTest = (test: Test) => {
    setSelectedTest(test);
    
    // Reset states
    setUserAnswers([]);
    setAnswerFeedback([]);
    setTestSubmitted(false);
    setTakingTest(false);
    setCurrentMultipleChoiceQuestions([]);
    setCurrentOpenEndedQuestions([]);
    setTestHasResults(false);
    setTestInProgress(false);
    
    // Check temporary test state
    const inProgressState = loadInProgressTestState(test.test_id);
    if (inProgressState && inProgressState.userAnswers.some(answer => answer)) {
      setTestInProgress(true);
    }
    
    // Check if userId is available and fetch test results
    if (userId) {
      fetchTestResults(test.test_id).then(results => {
        if (results.exists) {
          try {
            // Load test content
            const content = JSON.parse(test.content);
            if (content.questions && content.questions.length > 0) {
              if (test.question_type === 'multiple_choice') {
                setCurrentMultipleChoiceQuestions(content.questions);
              } else if (test.question_type === 'open_ended') {
                setCurrentOpenEndedQuestions(content.questions);
              }
              
              // Set answers and results
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
            console.error("Error processing test content:", error);
          }
        }
      }).catch(error => {
        console.error("Error fetching test results:", error);
      });
    }
  };

  // Function to start test
  const startTest = () => {
    if (!selectedTest || !selectedTest.content) return;
    
    try {
      const content = JSON.parse(selectedTest.content);
      if (!content.questions || !content.questions.length) {
        throw new Error('No questions in test');
      }
      
      // Reset all test states
      setIsCheckingAnswers(false);
      setTestSubmitted(false);
      setTestHasResults(false);
      
      // Set appropriate question type
      if (selectedTest.question_type === 'multiple_choice') {
        setCurrentMultipleChoiceQuestions(content.questions);
        setCurrentOpenEndedQuestions([]);
      } else if (selectedTest.question_type === 'open_ended') {
        setCurrentOpenEndedQuestions(content.questions);
        setCurrentMultipleChoiceQuestions([]);
      }
      
      // Use saved answers or create new empty answers
      const savedState = loadInProgressTestState(selectedTest.test_id);
      if (savedState && !savedState.completed && savedState.userAnswers.length > 0) {
        setUserAnswers(savedState.userAnswers);
      } else {
        setUserAnswers(new Array(content.questions.length).fill(''));
      }
      
      // Initialize expansion state - all questions expanded by default
      setExpandedQuestions(new Array(content.questions.length).fill(true));
      
      // Explicitly set test taking state
      setAnswerFeedback(new Array(content.questions.length).fill(null));
      setTakingTest(true);
      setTestInProgress(true);
    } catch (error) {
      console.error("Error starting test:", error);
      toast({
        title: "Error starting test",
        description: "Cannot load questions. Test format is invalid.",
        variant: "destructive",
      });
    }
  };

  // Function to handle answer change
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);
    
    // Save temporary test state to localStorage
    if (selectedTest) {
      saveInProgressTestState(selectedTest.test_id, newAnswers);
    }
  };

  // Function to toggle question expansion
  const toggleQuestionExpand = (index: number) => {
    const newExpandedState = [...expandedQuestions];
    newExpandedState[index] = !newExpandedState[index];
    setExpandedQuestions(newExpandedState);
  };

  // Function to check answers for multiple choice tests
  const handleSubmitMultipleChoiceTest = () => {
    // Check if all answers have been given
    const unansweredQuestions = userAnswers.filter(answer => !answer).length;
    
    if (unansweredQuestions > 0) {
      toast({
        title: "Complete all answers",
        description: `${unansweredQuestions} ${
          unansweredQuestions === 1 ? 'question' : unansweredQuestions < 5 ? 'questions' : 'questions'
        } not answered.`,
        variant: "warning",
      });
      return;
    }
    
    // Calculate result
    let correctCount = 0;
    const feedback: AnswerFeedback[] = [];
    
    for (let i = 0; i < currentMultipleChoiceQuestions.length; i++) {
      const isCorrect = userAnswers[i] === currentMultipleChoiceQuestions[i].correctAnswer;
      if (isCorrect) {
        correctCount++;
      }
      
      feedback.push({
        isCorrect,
        feedback: isCorrect 
          ? "Correct answer" 
          : `Incorrect answer. Selected: ${userAnswers[i]}`,
        correctAnswer: currentMultipleChoiceQuestions[i].correctAnswer
      });
    }
    
    const score = Math.round((correctCount / currentMultipleChoiceQuestions.length) * 100);
    
    // Set interface states
    setTestScore(score);
    setAnswerFeedback(feedback);
    setTestSubmitted(true);
    setTestHasResults(true);
    
    // Remove temporary state from localStorage
    clearInProgressTestState(selectedTest!.test_id);
    
    // Save results to database
    saveTestResults(score, feedback);
  };

  // Function to check answers for open-ended tests
  const handleCheckOpenEndedAnswers = async () => {
    // Check if userId is available
    if (!userId) {
      console.warn("User ID not available. Cannot check answers.");
      return;
    }
    
    // Check if all answers have been entered
    const unansweredQuestions = userAnswers.filter(answer => !answer.trim()).length;
    
    if (unansweredQuestions > 0) {
      toast({
        title: "Complete all answers",
        description: `${unansweredQuestions} ${
          unansweredQuestions === 1 ? 'question' : unansweredQuestions < 5 ? 'questions' : 'questions'
        } not answered.`,
        variant: "warning",
      });
      return;
    }
    
    // Enable loading state
    setIsCheckingAnswers(true);
    
    try {
      // Show toast informing about checking answers
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
          questions: currentOpenEndedQuestions,
          answers: userAnswers
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check answers');
      }
      
      const result = await response.json();
      
      // Set score and feedback
      setAnswerFeedback(result.feedback);
      setTestScore(result.score);
      setTestSubmitted(true);
      setTestHasResults(true);
      
      // Remove temporary state from localStorage
      clearInProgressTestState(selectedTest!.test_id);
      
      // Save results to database
      saveTestResults(result.score, result.feedback);
      
      // Show toast with result
      toast({
        title: "Checking complete",
        description: `Your score: ${result.score}%. ${
          result.score >= 70 
            ? 'Good job!' 
            : 'Review the feedback to learn more.'
        }`,
        variant: result.score >= 70 ? "default" : "warning",
      });
    } catch (error) {
      console.error("Error checking answers:", error);
      toast({
        title: "Error checking answers",
        description: error instanceof Error ? error.message : "There was a problem checking your answers.",
        variant: "destructive",
      });
    } finally {
      // Always disable loading state when finished
      setIsCheckingAnswers(false);
    }
  };

  // Function to save test results
  const saveTestResults = async (score: number, feedback: AnswerFeedback[] | null = null) => {
    try {
      // Check if userId is available
      if (!userId) {
        console.warn("User ID not available. Cannot save test results.");
        return;
      }
      
      // Prepare answers for saving
      let answers;
      
      if (selectedTest?.question_type === 'multiple_choice') {
        answers = currentMultipleChoiceQuestions.map((question, index) => ({
          question_id: index,
          user_answer: userAnswers[index],
          is_correct: userAnswers[index] === question.correctAnswer,
          points: userAnswers[index] === question.correctAnswer ? 1 : 0
        }));
      } else {
        // For open-ended questions use feedback
        answers = feedback?.map((fb, index) => ({
          question_id: index,
          user_answer: userAnswers[index],
          is_correct: fb ? fb.isCorrect : false,
          points: fb && fb.isCorrect ? 1 : 0
        })) || [];
      }
      
      // Call API to save results
      const response = await fetch('/api/tests/save-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: selectedTest!.test_id,
          userId,
          score,
          answers
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save test results');
      }
      
      const result = await response.json();
      console.log("Test results saved:", result);
      
    } catch (error) {
      console.error("Error saving test results:", error);
      toast({
        title: "Error saving results",
        description: "Failed to save test results to database.",
        variant: "destructive",
      });
    }
  };

  // Function to finish test
  const handleFinishTest = () => {
    setTakingTest(false);
    setIsStartingTest(false);
    
    // Show score message
    toast({
      title: "Test completed",
      description: `Your score: ${testScore}%.`,
      variant: testScore >= 70 ? "default" : "warning",
    });
  };

  // Function to submit test (universal)
  const handleSubmitTest = () => {
    if (selectedTest?.question_type === 'multiple_choice') {
      handleSubmitMultipleChoiceTest();
    } else {
      handleCheckOpenEndedAnswers();
    }
  };

  // Function to restart test
  const handleRestartTest = () => {
    // Reset test states
    setUserAnswers([]);
    setAnswerFeedback([]);
    setTestSubmitted(false);
    setTestScore(0);
    setTestHasResults(false);
    setTestInProgress(false);
    
    // Remove temporary state from localStorage
    clearInProgressTestState(selectedTest!.test_id);
    
    // Start test again
    startTest();
  };

  // Function to view test results
  const handleViewTestResults = async () => {
    if (!userId || !selectedTest) {
      console.warn('User ID not available or no selected test');
      return;
    }
    
    try {
      // Fetch results from database
      const response = await fetch(`/api/tests/results?testId=${selectedTest.test_id}&userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const results = await response.json();
      
      if (results.exists) {
        try {
          // Load questions from test
          const content = JSON.parse(selectedTest.content);
          if (content.questions && content.questions.length > 0) {
            if (selectedTest.question_type === 'multiple_choice') {
              setCurrentMultipleChoiceQuestions(content.questions);
              setCurrentOpenEndedQuestions([]);
            } else if (selectedTest.question_type === 'open_ended') {
              setCurrentOpenEndedQuestions(content.questions);
              setCurrentMultipleChoiceQuestions([]);
            }
            
            // Process answers from database
            const userAnswersArray = new Array(content.questions.length).fill('');
            results.answers.forEach(answer => {
              if (answer.question_id >= 0 && answer.question_id < userAnswersArray.length) {
                userAnswersArray[answer.question_id] = answer.user_answer;
              }
            });
            
            // Initialize expansion state - all questions collapsed by default
            setExpandedQuestions(new Array(content.questions.length).fill(false));
            
            // Set states to display results
            setUserAnswers(userAnswersArray);
            setAnswerFeedback(results.feedback || []);
            setTestScore(results.score);
            setTestSubmitted(true);
            setTestHasResults(true);
            
            // KEY CHANGE: Set takingTest and open dialog
            setTakingTest(true);
            setIsStartingTest(true);
            
            toast({
              title: "Results preview",
              description: `Your score: ${results.score}%`,
            });
          } else {
            throw new Error('No questions found in test');
          }
        } catch (error) {
          console.error("Error processing test content:", error);
          toast({
            title: "Error",
            description: "Failed to load test results.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "No results",
          description: "No saved results found for this test.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching test results:", error);
      toast({
        title: "Error",
        description: "Failed to fetch test results.",
        variant: "destructive",
      });
    }
  };

  return {
    tests,
    selectedTest,
    isTestGenerationDialogOpen,
    isGeneratingTest,
    isStartingTest,
    takingTest,
    testConfig,
    currentMultipleChoiceQuestions,
    currentOpenEndedQuestions,
    userAnswers,
    answerFeedback,
    testSubmitted,
    testScore,
    testHasResults,
    testInProgress,
    isCheckingAnswers,
    expandedQuestions,
    setIsTestGenerationDialogOpen,
    setTestConfig,
    setIsStartingTest,
    setTakingTest,
    handleToggleTest,
    generateTest,
    handleSelectTest,
    startTest,
    handleAnswerChange,
    toggleQuestionExpand,
    handleSubmitTest,
    handleRestartTest,
    handleViewTestResults,
    handleFinishTest,
    getTestQuestionCount,
  };
}