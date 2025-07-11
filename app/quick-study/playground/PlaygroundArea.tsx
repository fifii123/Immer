"use client"

import React, { useState, useEffect } from 'react'
import { 
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  PenTool,
  FileCheck,
  Key,
  Brain,
  MessageCircle,
  Loader2,
  Sparkles,
  Bot,
  Send,
  Upload,
  Clock,
  FileText,
  Youtube,
  Image,
  Mic,
  File,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Source, PlaygroundContent } from '../hooks/useQuickStudy'



// Import viewers
import SummaryViewer from '../outputs/viewers/SummaryViewer'
import NotesViewer from '../outputs/viewers/NotesViewer'
import ChatViewer from '../outputs/viewers/ChatViewer'
import QuizViewer from '../outputs/viewers/QuizViewer'
import FlashcardViewer from '../outputs/viewers/FlashcardViewer'
import TimelineViewer from '../outputs/viewers/TimelineViewer'

interface PlaygroundAreaProps {
  curtainVisible: boolean
  playgroundContent: PlaygroundContent
  selectedSource: Source | null
  isGenerating: boolean
  currentOutput: any
  onShowCurtain: () => void
  onTileClick: (type: string) => void
  onChatClick: () => void
}

const tiles = [
  { 
    id: 'flashcards', 
    icon: <Zap className="h-5 w-5" />, 
    title: 'Flashcards', 
    desc: 'Spaced repetition cards'
  },
  { 
    id: 'quiz', 
    icon: <Target className="h-5 w-5" />, 
    title: 'Interactive Quiz', 
    desc: 'Adaptive testing'
  },
  { 
    id: 'notes', 
    icon: <PenTool className="h-5 w-5" />, 
    title: 'Smart Notes', 
    desc: 'Structured summaries'
  },
  { 
    id: 'summary', 
    icon: <FileCheck className="h-5 w-5" />, 
    title: 'Key Summary', 
    desc: 'Essential points'
  },
  { 
    id: 'timeline', 
    icon: <Clock className="h-5 w-5"/>, 
    title: 'Timeline Builder', 
    desc: 'Interactive sequence'
  },
  { 
    id: 'mindmap', 
    icon: <Brain className="h-5 w-5" />, 
    title: 'Visual Map', 
    desc: 'Connected ideas'
  }
]

const getSourceIcon = (type: string, subtype?: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />
    case 'youtube':
      return <Youtube className="h-4 w-4 text-red-600" />
    case 'image':
      return <Image className="h-4 w-4 text-blue-500" />
    case 'audio':
      return <Mic className="h-4 w-4 text-purple-500" />
    case 'docx':
      return <File className="h-4 w-4 text-blue-600" />
    case 'text':
      return subtype === 'pasted' 
        ? <FileText className="h-4 w-4 text-green-500" />
        : <FileText className="h-4 w-4 text-muted-foreground" />
    case 'url':
      return subtype === 'youtube'
        ? <Youtube className="h-4 w-4 text-red-600" />
        : <Globe className="h-4 w-4 text-blue-500" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

export default function PlaygroundArea({
  curtainVisible,
  playgroundContent,
  selectedSource,
  isGenerating,
  currentOutput,
  onShowCurtain,
  onTileClick,
  onChatClick
}: PlaygroundAreaProps) {
  const [handleVisible, setHandleVisible] = useState(true)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    if (!curtainVisible) {
      const timer = setTimeout(() => {
        setHandleVisible(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    } else {
      // Reset handle visibility when curtain opens
      setHandleVisible(true)
      setIsHovering(false)
    }
  }, [curtainVisible])

  // Render content based on current state
  const renderContent = () => {
    // If generating, show loading state
    if (isGenerating) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-card/50">
          <div className="text-center max-w-md">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/25">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
              {/* <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse shadow-lg" /> */}
            </div>
            
            <h3 className="text-2xl font-bold mb-4 text-foreground">
              Generating content...
            </h3>
            <p className="text-lg leading-relaxed mb-6 text-muted-foreground">
              AI is analyzing <span className="font-semibold text-indigo-600">"{selectedSource?.name}"</span> and creating personalized study materials
            </p>
            
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-muted-foreground font-medium">This might take a moment</span>
            </div>
          </div>
        </div>
      )
    }
    // Route to appropriate viewer based on content type
// Route to appropriate viewer based on content type
switch (playgroundContent) {
  case 'summary':
    return <SummaryViewer output={currentOutput} selectedSource={selectedSource} />
    
  case 'notes':
    return <NotesViewer output={currentOutput} selectedSource={selectedSource} />
    
  case 'chat':
    return <ChatViewer selectedSource={selectedSource} />
    
  case 'quiz':
    return <QuizViewer output={currentOutput} selectedSource={selectedSource} />
    
  case 'flashcards':
    return <FlashcardViewer output={currentOutput} selectedSource={selectedSource} />
    
    case 'timeline':
      return <TimelineViewer output={currentOutput} selectedSource={selectedSource} />
      
  case 'mindmap':
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-card/30 to-background">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/25">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">
            {playgroundContent} viewer coming soon
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            This content type will be implemented next
          </p>
          
          <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-700 font-medium">
              🚧 Under development
            </p>
          </div>
        </div>
      </div>
    )
}
  }

  return (
    <section className="relative h-full overflow-hidden rounded-2xl bg-card border-border border">
      
      {/* Playground Content */}
      <div className={`absolute inset-0 ${!curtainVisible && playgroundContent === 'chat' ? 'pr-12' : ''}`}>
        <div className="h-full overflow-y-auto">
          {renderContent()}
        </div>
      </div>

{/* Sliding Curtain */}
<div className={`absolute top-0 bottom-0 transition-all duration-500 ease-out overflow-hidden z-10 ${
  curtainVisible ? 'left-0 right-0' : 'left-[calc(100%-48px)] right-0'
} ${
  curtainVisible 
    ? 'bg-card border-border'
    : (handleVisible || isHovering) 
      ? 'bg-card border-border'
      : 'bg-transparent border-transparent'
} border-l`}>
  
  {/* Full curtain content */}
  <div className={`h-full transition-all duration-300 ${
    curtainVisible ? 'opacity-100 p-6' : 'opacity-0 p-0 overflow-hidden'
  }`}>
    <header className="text-center mb-6">
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        Choose your study method
      </h3>
      {selectedSource && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">From:</span>
          <div className="flex items-center gap-2">
            {getSourceIcon(selectedSource.type, (selectedSource as any).subtype)}
            <span className="font-medium text-foreground">
              {selectedSource.name}
            </span>
          </div>
        </div>
      )}
      {!selectedSource && (
        <p className="text-sm text-muted-foreground">
          Select a source to generate content
        </p>
      )}
    </header>
    
{/* Study Method Tiles */}
<div className="grid grid-cols-2 gap-3 mb-4">
  {tiles.map((tile) => (
    <button
      key={tile.id}
      className={`group relative overflow-hidden p-4 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
        !selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => selectedSource?.status === 'ready' && onTileClick(tile.id)}
      disabled={!selectedSource || selectedSource.status !== 'ready'}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 opacity-90"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative flex flex-col gap-2">
        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
          <div className="text-indigo-600 dark:text-indigo-400">
            {tile.icon}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {tile.title}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tile.desc}
          </div>
        </div>
      </div>
    </button>
  ))}
</div>
    
{/* Ask Questions Button */}
<button
  className={`group relative overflow-hidden rounded-xl p-4 text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full ${
    !selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''
  }`}
  onClick={() => selectedSource?.status === 'ready' && onChatClick()}
  disabled={!selectedSource || selectedSource.status !== 'ready'}
>
  <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850 opacity-90"></div>
  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  <div className="relative flex items-center justify-center gap-3">
    <MessageCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
      Ask Questions
    </span>
  </div>
</button>
  </div>
  
  {/* Collapsed handle - simplified */}
  {!curtainVisible && (
    <div 
      className="absolute left-0 top-0 bottom-0 w-12"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Button - always visible */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
        <button
          className="w-8 h-16 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm bg-card/95 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/60"
          onClick={onShowCurtain}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )}
</div>
    </section>
  )
}