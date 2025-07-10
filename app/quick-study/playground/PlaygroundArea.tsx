"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
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
    id: 'concepts', 
    icon: <Key className="h-5 w-5" />, 
    title: 'Concepts Map', 
    desc: 'Key definitions'
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
        : <FileText className="h-4 w-4 text-slate-500" />
    case 'url':
      return subtype === 'youtube'
        ? <Youtube className="h-4 w-4 text-red-600" />
        : <Globe className="h-4 w-4 text-blue-500" />
    default:
      return <FileText className="h-4 w-4 text-slate-500" />
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
  const { darkMode } = usePreferences()

  // Render content based on current state
  const renderContent = () => {
    // If generating, show loading state
    if (isGenerating) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 ${
                darkMode ? 'bg-primary/10' : 'bg-primary/5'
              }`}>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full animate-pulse" />
            </div>
            
            <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
              Generating content...
            </h3>
            <p className={`text-base leading-relaxed mb-4 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
              AI is analyzing "{selectedSource?.name}" and creating personalized study materials
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>This might take a moment</span>
            </div>
          </div>
        </div>
      )
    }

    // Route to appropriate viewer based on content type
    switch (playgroundContent) {
      case 'summary':
        return <SummaryViewer output={currentOutput} selectedSource={selectedSource} />
        
      case 'notes':
        return <NotesViewer output={currentOutput} selectedSource={selectedSource} />
        
      case 'chat':
        return <ChatViewer selectedSource={selectedSource} />
        
      // TODO: Add more viewers later
      case 'flashcards':
        return (
          <article className="h-full flex flex-col p-8">
            <header className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  darkMode ? 'bg-primary/10' : 'bg-primary/5'
                }`}>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className={`text-2xl font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Interactive Flashcards
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                    Coming soon - this feature will be implemented next
                  </p>
                </div>
              </div>
            </header>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'bg-muted' : 'bg-slate-100'
                }`}>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Flashcards viewer coming soon
                </h3>
                <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                  This content type will be implemented next
                </p>
              </div>
            </div>
          </article>
        )

      case 'quiz':
      case 'concepts':
      case 'mindmap':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                darkMode ? 'bg-muted' : 'bg-slate-100'
              }`}>
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                {playgroundContent} viewer coming soon
              </h3>
              <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                This content type will be implemented next
              </p>
            </div>
          </div>
        )
      
      default:
        // Empty state - no content selected
        if (!selectedSource) {
          return (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                  darkMode ? 'bg-primary/10' : 'bg-primary/5'
                }`}>
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Upload your first source
                </h2>
                <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                  Upload documents, videos, or audio files to start generating personalized study materials
                </p>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
              </div>
            </div>
          )
        }

        // Default empty state with source selected
        return (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                darkMode ? 'bg-primary/10' : 'bg-primary/5'
              }`}>
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                Ready to transform your learning
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                Choose a study method to generate personalized content from "{selectedSource.name}"
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={onShowCurtain}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Choose Study Method
                </Button>
                <div className="flex items-center gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onChatClick}
                    disabled={!selectedSource || selectedSource.status !== 'ready'}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat with AI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <section className={`relative h-full overflow-hidden rounded-2xl ${
      darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
    } border`}>
      
{/* Playground Content */}
<div className={`absolute inset-0 ${!curtainVisible && playgroundContent === 'chat' ? 'pr-12' : ''}`}>
  <div className="h-full overflow-y-auto">
    {renderContent()}
  </div>
</div>
      {/* Sliding Curtain */}
      <div className={`absolute top-0 bottom-0 transition-all duration-500 ease-out overflow-hidden z-10 ${
        curtainVisible ? 'left-0 right-0' : 'left-[calc(100%-48px)] right-0'
      } ${darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'} border-l`}>
        
        {/* Full curtain content */}
        <div className={`h-full transition-all duration-300 ${
          curtainVisible ? 'opacity-100 p-6' : 'opacity-0 p-0 overflow-hidden'
        }`}>
          <header className="text-center mb-6">
            <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
              Choose your study method
            </h3>
            {selectedSource && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>From:</span>
                <div className="flex items-center gap-2">
                  {getSourceIcon(selectedSource.type, (selectedSource as any).subtype)}
                  <span className={`font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    {selectedSource.name}
                  </span>
                </div>
              </div>
            )}
            {!selectedSource && (
              <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                Select a source to generate content
              </p>
            )}
          </header>
          
          {/* Study Method Tiles */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                className={`group relative p-4 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                  darkMode 
                    ? 'bg-background hover:bg-accent/50 border-border' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                } border ${!selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => selectedSource?.status === 'ready' && onTileClick(tile.id)}
                disabled={!selectedSource || selectedSource.status !== 'ready'}
              >
                <div className="flex flex-col gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-primary/10' : 'bg-primary/5'
                  }`}>
                    {tile.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                      {tile.title}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                      {tile.desc}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Ask Questions Button */}
          <Card 
            className={`w-full cursor-pointer transition-all duration-200 rounded-xl ${
              darkMode 
                ? 'hover:bg-accent/50' 
                : 'hover:bg-slate-50'
            } ${!selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => selectedSource?.status === 'ready' && onChatClick()}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <MessageCircle className={`h-5 w-5 ${darkMode ? 'text-muted-foreground' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Ask Questions
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Collapsed handle */}
        {!curtainVisible && (
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
            <button
              className={`w-8 h-16 rounded-lg flex items-center justify-center transition-all duration-200 ${
                darkMode 
                  ? 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              onClick={onShowCurtain}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}