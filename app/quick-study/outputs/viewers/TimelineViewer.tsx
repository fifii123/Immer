"use client"

import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Trophy,
  Target,
  Shuffle,
  Eye,
  GripVertical,
  ArrowDown,
  ArrowUp,
  Star,
  Calendar,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  sequence: number;
  category?: string;
  importance: 'low' | 'medium' | 'high';
}

interface TimelineContent {
  title: string;
  description: string;
  events: TimelineEvent[];
  totalEvents: number;
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

interface TimelineViewerProps {
  output: Output | null;
  selectedSource: any;
}

type GameState = 'preview' | 'building' | 'completed'

export default function TimelineViewer({ output, selectedSource }: TimelineViewerProps) {
  const { toast } = useToast()
  
  // Timeline data
  const [timelineData, setTimelineData] = useState<TimelineContent | null>(null)
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('preview')
  const [userOrder, setUserOrder] = useState<TimelineEvent[]>([])
  const [correctOrder, setCorrectOrder] = useState<TimelineEvent[]>([])
  const [shuffledEvents, setShuffledEvents] = useState<TimelineEvent[]>([])
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(0)
  const [showHints, setShowHints] = useState(false)

  // Parse timeline content on mount
  useEffect(() => {
    if (!output?.content) return
    
    try {
      const parsed = JSON.parse(output.content)
      setTimelineData(parsed)
      
      // Set correct order (sorted by sequence)
      const sortedEvents = [...parsed.events].sort((a, b) => a.sequence - b.sequence)
      setCorrectOrder(sortedEvents)
      
      // Create shuffled version
      const shuffled = [...sortedEvents].sort(() => Math.random() - 0.5)
      setShuffledEvents(shuffled)
      setUserOrder(shuffled)
    } catch (error) {
      console.error('Failed to parse timeline content:', error)
      toast({
        title: "Error",
        description: "Failed to load timeline content",
        variant: "destructive"
      })
    }
  }, [output, toast])

  const startBuilding = () => {
    setGameState('building')
    setAttempts(0)
    setScore(0)
    setShowHints(false)
    
    // Re-shuffle events
    const shuffled = [...correctOrder].sort(() => Math.random() - 0.5)
    setShuffledEvents(shuffled)
    setUserOrder(shuffled)
  }

  const resetTimeline = () => {
    setGameState('preview')
    setAttempts(0)
    setScore(0)
    setShowHints(false)
  }

  const moveEvent = (fromIndex: number, toIndex: number) => {
    const newOrder = [...userOrder]
    const [movedEvent] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedEvent)
    setUserOrder(newOrder)
  }

  const moveEventUp = (index: number) => {
    if (index > 0) {
      moveEvent(index, index - 1)
    }
  }

  const moveEventDown = (index: number) => {
    if (index < userOrder.length - 1) {
      moveEvent(index, index + 1)
    }
  }

  const checkOrder = () => {
    setAttempts(prev => prev + 1)
    
    let correctCount = 0
    userOrder.forEach((event, index) => {
      if (event.id === correctOrder[index]?.id) {
        correctCount++
      }
    })
    
    const percentage = Math.round((correctCount / correctOrder.length) * 100)
    setScore(percentage)
    
    if (percentage === 100) {
      setGameState('completed')
      toast({
        title: "Perfect! 🎉",
        description: "You got the timeline exactly right!",
      })
    } else if (percentage >= 70) {
      toast({
        title: "Great job! 👍",
        description: `${percentage}% correct. Almost there!`,
      })
    } else {
      toast({
        title: "Keep trying! 💪",
        description: `${percentage}% correct. You can do better!`,
        variant: "destructive"
      })
    }
  }

  const toggleHints = () => {
    setShowHints(!showHints)
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return <Star className="h-4 w-4 text-amber-500" />
      case 'medium': return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'low': return <Calendar className="h-4 w-4 text-gray-500" />
      default: return null
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20'
      case 'medium': return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'low': return 'border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-900/20'
      default: return 'border-l-4 border-l-gray-300'
    }
  }

  const isEventCorrect = (eventId: string, position: number) => {
    return correctOrder[position]?.id === eventId
  }

  if (!output || !timelineData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            Timeline not available
          </h3>
          <p className="text-sm text-muted-foreground">
            Unable to load timeline content
          </p>
        </div>
      </div>
    )
  }

  // Preview State
  if (gameState === 'preview') {
    return (
      <div className="h-full flex flex-col p-8 overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-6 shadow-2xl shadow-emerald-500/25">
            <Clock className="h-10 w-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-3 text-foreground">
            {timelineData.title}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {timelineData.description}
          </p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto w-full">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                {timelineData.totalEvents}
              </div>
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Events</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {timelineData.categories.length}
              </div>
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Categories</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {score}%
              </div>
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Best Score</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {timelineData.categories.map(category => (
            <Badge key={category} variant="outline" className="px-4 py-2 text-sm">
              {category}
            </Badge>
          ))}
        </div>
        
        {/* Preview Timeline */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <h3 className="text-xl font-semibold mb-4 text-foreground text-center">
            Correct Sequence Preview
          </h3>
          <div className="space-y-3">
            {correctOrder.map((event, index) => (
              <div key={event.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <Card className={`flex-1 ${getImportanceColor(event.importance)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getImportanceIcon(event.importance)}
                          <h4 className="font-semibold text-foreground">
                            {event.title}
                          </h4>
                          {event.category && (
                            <Badge variant="secondary" className="text-xs">
                              {event.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
        
        {/* Start Button */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={startBuilding}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 px-8 py-6 text-lg"
          >
            <Target className="mr-3 h-6 w-6" />
            Start Timeline Challenge
          </Button>
        </div>
      </div>
    )
  }

  // Building State
  if (gameState === 'building') {
    return (
      <div className="h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-foreground">
              Arrange Timeline Events
            </h3>
            <Badge variant="outline" className="px-3 py-1">
              Attempt {attempts + 1}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleHints}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showHints ? 'Hide' : 'Show'} Hints
            </Button>
            <Button variant="ghost" size="sm" onClick={resetTimeline}>
              Exit
            </Button>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 mb-6 border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-800 dark:text-emerald-200 text-center">
            📝 Drag and drop or use the arrow buttons to arrange events in the correct chronological order
          </p>
        </div>
        
        {/* Timeline Building Area */}
        <div className="flex-1 overflow-y-auto mb-6">
          <div className="space-y-3 max-w-4xl mx-auto">
            {userOrder.map((event, index) => {
              const isCorrect = attempts > 0 && isEventCorrect(event.id, index)
              const isIncorrect = attempts > 0 && !isEventCorrect(event.id, index)
              
              return (
                <div key={event.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCorrect 
                      ? 'bg-green-500 text-white' 
                      : isIncorrect 
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <Card className={`flex-1 transition-all ${
                    isCorrect 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : isIncorrect 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : getImportanceColor(event.importance)
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getImportanceIcon(event.importance)}
                            <h4 className="font-semibold text-foreground">
                              {event.title}
                            </h4>
                            {event.category && (
                              <Badge variant="secondary" className="text-xs">
                                {event.category}
                              </Badge>
                            )}
                            {showHints && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                Position: {event.sequence}
                              </Badge>
                            )}
                            {isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {isIncorrect && <AlertCircle className="h-4 w-4 text-red-600" />}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveEventUp(index)}
                            disabled={index === 0}
                            className="p-1 h-8 w-8"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveEventDown(index)}
                            disabled={index === userOrder.length - 1}
                            className="p-1 h-8 w-8"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              const shuffled = [...userOrder].sort(() => Math.random() - 0.5)
              setUserOrder(shuffled)
            }}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle Again
          </Button>
          
          <Button
            onClick={checkOrder}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8"
          >
            Check My Timeline
          </Button>
        </div>
      </div>
    )
  }

  // Completed State
  if (gameState === 'completed') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 mb-8 shadow-2xl shadow-emerald-500/25">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Timeline Mastered! 🎉
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            Perfect! You've arranged all events in the correct chronological order.
          </p>
          
          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  {attempts}
                </div>
                <div className="text-lg font-medium text-emerald-700 dark:text-emerald-300">
                  Attempts Used
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  100%
                </div>
                <div className="text-lg font-medium text-amber-700 dark:text-amber-300">
                  Final Score
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button 
              onClick={startBuilding}
              variant="outline"
              className="w-full sm:w-auto border-2 py-6 px-8 text-lg"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Try Again
            </Button>
            
            <Button 
              onClick={resetTimeline}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 px-8 text-lg"
            >
              <Clock className="mr-2 h-5 w-5" />
              View Timeline
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}