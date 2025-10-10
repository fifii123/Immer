"use client"

import React, { useState, useEffect } from 'react'
import { 
 Target, 
 Play, 
 RotateCcw, 
 CheckCircle, 
 XCircle, 
 Clock,
 Trophy,
 Lightbulb,
 ChevronRight,
 ChevronLeft,
 X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface QuizQuestion {
 id: string;
 question: string;
 options: string[];
 correctAnswer: string;
 explanation: string;
 difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizContent {
 title: string;
 description: string;
 questions: QuizQuestion[];
 timeLimit?: number;
 passingScore: number;
}

interface Output {
 id: string;
 type: string;
 title: string;
 content?: string;
 sourceId: string;
 createdAt: Date;
}

interface QuizViewerProps {
 output: Output | null;
 selectedSource: any;
}

type QuizState = 'preview' | 'active' | 'completed'

export default function QuizViewer({ output, selectedSource }: QuizViewerProps) {
 const { toast } = useToast()
 
 // Quiz data
 const [quizData, setQuizData] = useState<QuizContent | null>(null)
 
 // Quiz state
 const [quizState, setQuizState] = useState<QuizState>('preview')
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
 const [userAnswers, setUserAnswers] = useState<string[]>([])
 const [selectedAnswer, setSelectedAnswer] = useState<string>('')
 const [showExplanation, setShowExplanation] = useState(false)
 
 // Timer
 const [timeRemaining, setTimeRemaining] = useState<number>(0)
 const [timerActive, setTimerActive] = useState(false)

// Results
const [score, setScore] = useState(0)
const [correctAnswers, setCorrectAnswers] = useState(0)

// Parse quiz content on mount
useEffect(() => {
  if (!output?.content) return
  
  try {
    const parsed = JSON.parse(output.content)
    setQuizData(parsed)
    setTimeRemaining((parsed.timeLimit || 20) * 60) // Convert minutes to seconds
  } catch (error) {
    console.error('Failed to parse quiz content:', error)
    toast({
      title: "Error",
      description: "Failed to load quiz content",
      variant: "destructive"
    })
  }
}, [output, toast])

// Hide global UI elements during active quiz
useEffect(() => {
  const hideElements = quizState === 'active'
  
  // Hide navigation breadcrumb and playground buttons
  const style = document.createElement('style')
  style.id = 'quiz-active-styles'
  style.innerHTML = hideElements ? `
    nav[class*="flex items-center gap-2 text-sm"] { display: none !important; }
    div[class*="absolute z-20"] { display: none !important; }
  ` : ''
  
  document.head.appendChild(style)
  
  return () => {
    const existingStyle = document.getElementById('quiz-active-styles')
    if (existingStyle) {
      existingStyle.remove()
    }
  }
}, [quizState])

// Timer effect
useEffect(() => {
  if (!timerActive || timeRemaining <= 0) return
  
  const timer = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) {
        setTimerActive(false)
        handleQuizComplete()
        return 0
      }
      return prev - 1
    })
  }, 1000)
  
  return () => clearInterval(timer)
}, [timerActive, timeRemaining])

const startQuiz = () => {
  if (!quizData) return
  
  setQuizState('active')
  setCurrentQuestionIndex(0)
  setUserAnswers(new Array(quizData.questions.length).fill(''))
  setSelectedAnswer('')
  setShowExplanation(false)
  setTimerActive(true)
  setTimeRemaining((quizData.timeLimit || 20) * 60)
}

const exitQuiz = () => {
  setQuizState('preview')
  setTimerActive(false)
  setCurrentQuestionIndex(0)
  setUserAnswers([])
  setSelectedAnswer('')
  setShowExplanation(false)
}

const restartQuiz = () => {
  setQuizState('preview')
  setCurrentQuestionIndex(0)
  setUserAnswers([])
  setSelectedAnswer('')
  setShowExplanation(false)
  setScore(0)
  setCorrectAnswers(0)
  setTimerActive(false)
  if (quizData) {
    setTimeRemaining((quizData.timeLimit || 20) * 60)
  }
}

const handleAnswerSelect = (answer: string) => {
  setSelectedAnswer(answer)
}

const handleAnswerSubmit = () => {
  if (!selectedAnswer || !quizData) return
  
  const newAnswers = [...userAnswers]
  newAnswers[currentQuestionIndex] = selectedAnswer
  setUserAnswers(newAnswers)
  setShowExplanation(true)
}

const handleNextQuestion = () => {
  if (!quizData) return
  
  if (currentQuestionIndex < quizData.questions.length - 1) {
    setCurrentQuestionIndex(prev => prev + 1)
    setSelectedAnswer(userAnswers[currentQuestionIndex + 1] || '')
    setShowExplanation(false)
  } else {
    handleQuizComplete()
  }
}

const handlePreviousQuestion = () => {
  if (currentQuestionIndex > 0) {
    setCurrentQuestionIndex(prev => prev - 1)
    setSelectedAnswer(userAnswers[currentQuestionIndex - 1] || '')
    setShowExplanation(!!userAnswers[currentQuestionIndex - 1])
  }
}

const handleQuizComplete = () => {
  if (!quizData) return
  
  let correct = 0
  userAnswers.forEach((answer, index) => {
    if (answer === quizData.questions[index]?.correctAnswer) {
      correct++
    }
  })
  
  setCorrectAnswers(correct)
  setScore(Math.round((correct / quizData.questions.length) * 100))
  setQuizState('completed')
  setTimerActive(false)
  
  const passed = (correct / quizData.questions.length) * 100 >= quizData.passingScore
  
  toast({
    title: passed ? "Quiz Completed!" : "Quiz Completed",
    description: `You scored ${Math.round((correct / quizData.questions.length) * 100)}%`,
    variant: passed ? "default" : "destructive"
  })
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    case 'hard': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

if (!output || !quizData) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
          <Target className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          Quiz not available
        </h3>
        <p className="text-sm text-muted-foreground">
          Unable to load quiz content
        </p>
      </div>
    </div>
  )
}

const currentQuestion = quizData.questions[currentQuestionIndex]
const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100

// Preview State
if (quizState === 'preview') {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/25">
          <Target className="h-10 w-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold mb-4 text-foreground">
          {quizData.title}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          {quizData.description}
        </p>
        
        {/* Quiz Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {quizData.questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {quizData.timeLimit || 'No limit'}
              </div>
              <div className="text-sm text-muted-foreground">
                {quizData.timeLimit ? 'Minutes' : 'Time limit'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {quizData.passingScore}%
              </div>
              <div className="text-sm text-muted-foreground">Passing Score</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Difficulty Distribution */}
        <div className="flex justify-center gap-2 mb-8">
          {['easy', 'medium', 'hard'].map(difficulty => {
            const count = quizData.questions.filter(q => q.difficulty === difficulty).length
            if (count === 0) return null
            
            return (
              <Badge key={difficulty} className={getDifficultyColor(difficulty)}>
                {count} {difficulty}
              </Badge>
            )
          })}
        </div>
        
        <Button 
          size="lg" 
          onClick={startQuiz}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25"
        >
          <Play className="mr-3 h-5 w-5" />
          Start Quiz
        </Button>
      </div>
    </div>
  )
}

// Active Quiz State
if (quizState === 'active') {
  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </h3>
          <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
            {currentQuestion.difficulty}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timer */}
          {quizData.timeLimit && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-mono text-sm ${
                timeRemaining < 300 ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          
          {/* Exit Quiz Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exitQuiz}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 px-2"
            title="Exit Quiz"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Question */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h4 className="text-xl font-medium mb-6 text-foreground leading-relaxed">
              {currentQuestion.question}
            </h4>
            
            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option
                const isCorrect = option === currentQuestion.correctAnswer
                const isIncorrect = showExplanation && selectedAnswer === option && !isCorrect
                
                return (
                  <button
                    key={index}
                    onClick={() => !showExplanation && handleAnswerSelect(option)}
                    disabled={showExplanation}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      showExplanation
                        ? isCorrect
                          ? 'bg-green-50 border-2 border-green-200 text-green-800'
                          : isIncorrect
                            ? 'bg-red-50 border-2 border-red-200 text-red-800'
                            : 'bg-muted border border-border text-muted-foreground'
                        : isSelected
                          ? 'bg-primary/10 border-2 border-primary text-primary'
                          : 'bg-card border border-border hover:border-primary/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showExplanation && isCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {showExplanation && isIncorrect && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Explanation */}
            {showExplanation && (
              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">Explanation</h5>
                    <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {!showExplanation ? (
              <Button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer}
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNextQuestion}>
                {currentQuestionIndex === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Completed State
if (quizState === 'completed') {
  const passed = score >= quizData.passingScore
  
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 shadow-2xl ${
          passed 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25' 
            : 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/25'
        }`}>
          {passed ? (
            <Trophy className="h-10 w-10 text-white" />
          ) : (
            <Target className="h-10 w-10 text-white" />
          )}
        </div>
        
        <h2 className="text-3xl font-bold mb-4 text-foreground">
          {passed ? 'Congratulations!' : 'Quiz Complete'}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          {passed 
            ? 'You passed the quiz! Great job understanding the material.'
            : 'You completed the quiz. Review the material and try again to improve your score.'
          }
        </p>
        
        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                {score}%
              </div>
              <div className="text-sm text-muted-foreground">Final Score</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {correctAnswers}/{quizData.questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Correct Answers</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASS' : 'RETRY'}
              </div>
              <div className="text-sm text-muted-foreground">
                Required: {quizData.passingScore}%
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline"
            onClick={restartQuiz}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}

return null
}