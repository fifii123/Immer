"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Zap, 
  RotateCcw, 
  Shuffle, 
  Eye,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Target,
  Check,
  X,
  Star,
  TrendingUp,
  Clock,
  Award,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
}

interface FlashcardDeck {
  title: string;
  description: string;
  cards: Flashcard[];
  totalCards: number;
  categories: string[];
}

interface Output {
  id: string;
  type: string;
  title: string;
  content?: string;
  sourceId: string;
  createdAt: Date;
}

interface FlashcardViewerProps {
  output: Output | null;
  selectedSource: any;
}

type StudyMode = 'preview' | 'study' | 'review'

export default function FlashcardViewer({ output, selectedSource }: FlashcardViewerProps) {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Deck data
  const [deckData, setDeckData] = useState<FlashcardDeck | null>(null)
  
  // Study state
  const [studyMode, setStudyMode] = useState<StudyMode>('preview')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set())
  const [correctCards, setCorrectCards] = useState<Set<string>>(new Set())
  const [incorrectCards, setIncorrectCards] = useState<Set<string>>(new Set())
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [showStudiedOnly, setShowStudiedOnly] = useState(false)
  const [shuffled, setShuffled] = useState(false)
  
  // Animation states
  const [cardAnimation, setCardAnimation] = useState<string>('')
  
  // Filtered cards
  const [displayCards, setDisplayCards] = useState<Flashcard[]>([])
  const [isFlipping, setIsFlipping] = useState(false)

  // Parse deck content on mount
  useEffect(() => {
    if (!output?.content) return
    
    try {
      const parsed = JSON.parse(output.content)
      setDeckData(parsed)
      setDisplayCards(parsed.cards || [])
    } catch (error) {
      console.error('Failed to parse flashcard content:', error)
      toast({
        title: "Error",
        description: "Failed to load flashcard deck",
        variant: "destructive"
      })
    }
  }, [output, toast])

  // Apply filters
  useEffect(() => {
    if (!deckData) return
    
    let filtered = [...deckData.cards]
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(card => card.category === selectedCategory)
    }
    
    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(card => card.difficulty === selectedDifficulty)
    }
    
    // Studied only filter
    if (showStudiedOnly) {
      filtered = filtered.filter(card => studiedCards.has(card.id))
    }
    
    // Shuffle if requested
    if (shuffled) {
      filtered = [...filtered].sort(() => Math.random() - 0.5)
    }
    
    setDisplayCards(filtered)
    
   
  }, [deckData, selectedCategory, selectedDifficulty, showStudiedOnly, shuffled, studiedCards])

// Reset flip state when card changes
useEffect(() => {
  console.log('Card changed to index:', currentCardIndex, '- resetting flip state')
  setIsFlipped(false)
  setCardAnimation('')
  setIsFlipping(false) // Reset flipping flag too
}, [currentCardIndex])

  const startStudy = useCallback(() => {
    setStudyMode('study')
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setStudiedCards(new Set())
    setCorrectCards(new Set())
    setIncorrectCards(new Set())
    setCardAnimation('study-enter')
  }, [])

  const resetDeck = useCallback(() => {
    setStudyMode('preview')
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setStudiedCards(new Set())
    setCorrectCards(new Set())
    setIncorrectCards(new Set())
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setShowStudiedOnly(false)
    setShuffled(false)
    setCardAnimation('')
  }, [])

  const flipCard = useCallback(() => {
    // Prevent multiple calls during animation
    if (isFlipping) {
      console.log('Already flipping, ignoring click')
      return
    }
    
    setIsFlipping(true)
    
    // Use functional state update to get current value
    setIsFlipped(prevFlipped => {
      console.log('Flipping card - current state:', prevFlipped)
      const newFlipped = !prevFlipped
      console.log('Setting card to:', newFlipped ? 'back' : 'front')
      
      // Mark as studied when flipping to back (revealing answer)
      if (!prevFlipped && displayCards[currentCardIndex]) {
        const currentCard = displayCards[currentCardIndex]
        console.log('Marking card as studied:', currentCard.id)
        
        setStudiedCards(prev => {
          const newStudied = new Set(prev)
          newStudied.add(currentCard.id)
          return newStudied
        })
      }
      
      return newFlipped
    })
    
    // Reset flipping flag after animation completes
    setTimeout(() => {
      setIsFlipping(false)
    }, 100)
    
  }, [isFlipping, displayCards, currentCardIndex])
  const handleCardResult = useCallback((correct: boolean) => {
    if (isFlipping) return
    const currentCard = displayCards[currentCardIndex]
    if (!currentCard) return
    
    console.log('Handling card result:', correct, 'for card:', currentCard.id)
    
    // Add animation
    setCardAnimation(correct ? 'card-success' : 'card-error')
    
    if (correct) {
      setCorrectCards(prev => {
        const newCorrect = new Set(prev)
        newCorrect.add(currentCard.id)
        return newCorrect
      })
      setIncorrectCards(prev => {
        const newIncorrect = new Set(prev)
        newIncorrect.delete(currentCard.id)
        return newIncorrect
      })
    } else {
      setIncorrectCards(prev => {
        const newIncorrect = new Set(prev)
        newIncorrect.add(currentCard.id)
        return newIncorrect
      })
      setCorrectCards(prev => {
        const newCorrect = new Set(prev)
        newCorrect.delete(currentCard.id)
        return newCorrect
      })
    }
    
    // Move to next card after animation
    setTimeout(() => {
      nextCard()
    }, 600)
  }, [displayCards, currentCardIndex])

  const nextCard = useCallback(() => {
    if (isFlipping) return 
    if (currentCardIndex < displayCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setIsFlipped(false)
      setCardAnimation('study-enter')
    } else {
      // End of deck
      setStudyMode('review')
    }
  }, [currentCardIndex, displayCards.length])

  const previousCard = useCallback(() => {
    if (isFlipping) return 
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1)
      setIsFlipped(false)
      setCardAnimation('study-enter')
    }
  }, [currentCardIndex])

  const shuffleDeck = useCallback(() => {
    setShuffled(!shuffled)
    toast({
      title: shuffled ? "Order restored" : "Deck shuffled",
      description: shuffled ? "Cards are back in original order" : "Cards have been randomized"
    })
  }, [shuffled, toast])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <Star className="h-3 w-3" />
      case 'medium': return <TrendingUp className="h-3 w-3" />
      case 'hard': return <Award className="h-3 w-3" />
      default: return null
    }
  }

  if (!output || !deckData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
            <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            Flashcards not available
          </h3>
          <p className="text-sm text-muted-foreground">
            Unable to load flashcard deck
          </p>
        </div>
      </div>
    )
  }

  const currentCard = displayCards[currentCardIndex]
  const progress = displayCards.length > 0 ? ((currentCardIndex + 1) / displayCards.length) * 100 : 0

  // Preview State
  if (studyMode === 'preview') {
    return (
      <div className="h-full flex flex-col p-8 overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/25">
            <Zap className="h-10 w-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-3 text-foreground">
            {deckData.title}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {deckData.description}
          </p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto w-full">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {deckData.totalCards}
              </div>
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Cards</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {deckData.categories.length}
              </div>
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Categories</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {studiedCards.size}
              </div>
              <div className="text-sm font-medium text-orange-700 dark:text-orange-300">Studied</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {correctCards.size}
              </div>
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Mastered</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-2">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {deckData.categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-2">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={shuffled ? "default" : "outline"}
            onClick={shuffleDeck}
            className="flashcard-action-btn border-2"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {shuffled ? 'Shuffled' : 'Shuffle'}
          </Button>
          
          <Button
            variant={showStudiedOnly ? "default" : "outline"}
            onClick={() => setShowStudiedOnly(!showStudiedOnly)}
            disabled={studiedCards.size === 0}
            className="flashcard-action-btn border-2"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showStudiedOnly ? 'Studied Only' : 'Show Studied'}
          </Button>
        </div>
        
        {/* Difficulty Distribution */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['easy', 'medium', 'hard'].map(difficulty => {
            const count = displayCards.filter(card => card.difficulty === difficulty).length
            if (count === 0) return null
            
            return (
              <Badge key={difficulty} className={`${getDifficultyColor(difficulty)} px-4 py-2 text-sm font-medium`}>
                <span className="flex items-center gap-1">
                  {getDifficultyIcon(difficulty)}
                  {count} {difficulty}
                </span>
              </Badge>
            )
          })}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
          <Button 
            size="lg" 
            onClick={startStudy}
            disabled={displayCards.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 flashcard-action-btn text-lg py-6 px-8"
          >
            <BookOpen className="mr-3 h-6 w-6" />
            Start Studying ({displayCards.length} cards)
          </Button>
          
          {studiedCards.size > 0 && (
            <Button 
              variant="outline"
              onClick={resetDeck}
              className="w-full sm:w-auto flashcard-action-btn border-2 py-6 px-8"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset Progress
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Study State
  if (studyMode === 'study') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-foreground">
              {currentCardIndex + 1} of {displayCards.length}
            </h3>
            {currentCard && (
              <div className="flex items-center gap-2">
                <Badge className={`${getDifficultyColor(currentCard.difficulty)} px-3 py-1`}>
                  <span className="flex items-center gap-1">
                    {getDifficultyIcon(currentCard.difficulty)}
                    {currentCard.difficulty}
                  </span>
                </Badge>
                {currentCard.category && (
                  <Badge variant="outline" className="px-3 py-1 bg-white dark:bg-gray-800">
                    {currentCard.category}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {studiedCards.size} studied
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStudyMode('preview')} className="flashcard-action-btn">
              Exit Study
            </Button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
            <div 
              className="study-progress h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Flashcard */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <div className={`w-full max-w-2xl h-80 flashcard-container ${cardAnimation}`}>
          <div 
              className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                flipCard()
              }}
              style={{ 
                cursor: isFlipping ? 'wait' : 'pointer',
                pointerEvents: isFlipping ? 'none' : 'auto'
              }}
            >
              {/* Front Face */}
              <div className="flashcard-face flashcard-front">
                <div className="p-8 text-center w-full flashcard-content">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 mb-4">
                      <Target className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h4 className="text-2xl font-bold text-foreground leading-relaxed mb-6">
                    {currentCard?.front}
                  </h4>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Click anywhere to reveal answer</span>
                  </div>
                </div>
              </div>
              
              {/* Back Face */}
              <div className="flashcard-face flashcard-back">
                <div className="p-8 text-center w-full flashcard-content">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 mb-4">
                      <Zap className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-xl font-medium text-foreground leading-relaxed mb-6">
                    {currentCard?.back}
                  </div>
                  {currentCard?.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {currentCard.tags.map(tag => (
                        <span 
                          key={tag}
                          className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation and Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={previousCard}
            disabled={currentCardIndex === 0}
            className="flashcard-action-btn border-2 px-6 py-3"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>
          
          {isFlipped ? (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardResult(false)
                }}
                className="flashcard-action-btn border-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 px-6 py-3"
              >
                <X className="h-5 w-5 mr-2" />
                Study Again
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCardResult(true)
                }}
                className="flashcard-action-btn bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3"
              >
                <Check className="h-5 w-5 mr-2" />
                Got It!
              </Button>
            </div>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                flipCard()
              }}
              className="flashcard-action-btn bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3"
            >
              <Eye className="h-5 w-5 mr-2" />
              Reveal Answer
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={nextCard}
            disabled={currentCardIndex === displayCards.length - 1}
            className="flashcard-action-btn border-2 px-6 py-3"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Review State
  if (studyMode === 'review') {
    const accuracy = studiedCards.size > 0 ? Math.round((correctCards.size / studiedCards.size) * 100) : 0
    
    return (
      <div className="h-full flex items-center justify-center p-8 overflow-y-auto">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 mb-8 shadow-2xl shadow-emerald-500/25">
            <Award className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Study Session Complete!
          </h2>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Excellent work! You've completed this flashcard session. Here's how you performed:
          </p>
          
          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {studiedCards.size}
                </div>
                <div className="text-lg font-medium text-blue-700 dark:text-blue-300">Cards Studied</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  {correctCards.size}
                </div>
                <div className="text-lg font-medium text-emerald-700 dark:text-emerald-300">Mastered</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                  {incorrectCards.size}
                </div>
                <div className="text-lg font-medium text-orange-700 dark:text-orange-300">Need Review</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Accuracy Score */}
          {studiedCards.size > 0 && (
            <div className="mb-12 score-reveal">
              <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                {accuracy}%
              </div>
              <div className="text-xl text-muted-foreground">
                Accuracy Rate
              </div>
              <div className="w-full max-w-md mx-auto mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4">
                  <div 
                    className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000 ease-out"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button 
              onClick={() => {
                if (incorrectCards.size > 0) {
                  setShowStudiedOnly(false)
                  setSelectedCategory('all')
                  setSelectedDifficulty('all')
                  setDisplayCards(deckData.cards.filter(card => incorrectCards.has(card.id)))
                  setStudyMode('study')
                  setCurrentCardIndex(0)
                  setIsFlipped(false)
                }
              }}
              disabled={incorrectCards.size === 0}
              variant="outline"
              className="w-full sm:w-auto flashcard-action-btn border-2 py-6 px-8 text-lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Review Missed Cards ({incorrectCards.size})
            </Button>
            
            <Button 
              onClick={resetDeck}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flashcard-action-btn py-6 px-8 text-lg"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Study Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}