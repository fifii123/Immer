"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Target, 
  Sparkles, 
  MessageCircle,
  Loader2,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Import ChatViewer - już gotowy!
import ChatViewer from '../outputs/viewers/ChatViewer'
// Pozostałe viewery będą dodane jutro w folderze outputs/viewers/

// Types
interface Output {
  id: string
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap'
  title: string
  content: any
}

interface Source {
  id: string
  name: string
  type: string
  status: string
}

type PlaygroundContent = Output['type'] | 'chat' | null

interface PlaygroundAreaProps {
  content: PlaygroundContent
  currentOutput: Output | null
  isGenerating: boolean
  curtainVisible: boolean
  selectedSource: Source | null
  onShowOutputs: () => void
  onChatClick: () => void
}

export default function PlaygroundArea({
  content,
  currentOutput,
  isGenerating,
  curtainVisible,
  selectedSource,
  onShowOutputs,
  onChatClick
}: PlaygroundAreaProps) {
  const { darkMode } = usePreferences()

  // Router dla różnych typów content - podobnie jak w PDF Reader switchy między tabami
  const renderContent = () => {
    if (isGenerating) {
      return renderGeneratingState()
    }

    if (!content) {
      return renderEmptyState()
    }

    // Switch między różnymi viewerami - ChatViewer już gotowy!
    switch (content) {
      case 'flashcards':
        return renderPlaceholderViewer('Flashcards', 'Interactive spaced repetition cards')
        // return <FlashcardsViewer output={currentOutput} />
      case 'quiz':
        return renderPlaceholderViewer('Quiz', 'Interactive quiz questions')
        // return <QuizViewer output={currentOutput} />
      case 'notes':
        return renderPlaceholderViewer('Notes', 'Structured smart notes')
        // return <NotesViewer output={currentOutput} />
      case 'summary':
        return renderPlaceholderViewer('Summary', 'Key points summary')
        // return <SummaryViewer output={currentOutput} />
      case 'concepts':
        return renderPlaceholderViewer('Concepts', 'Key definitions and terms')
        // return <ConceptsViewer output={currentOutput} />
      case 'mindmap':
        return renderPlaceholderViewer('Mindmap', 'Visual concept mapping')
        // return <MindmapViewer output={currentOutput} />
      case 'chat':
        return <ChatViewer selectedSource={selectedSource} />
      default:
        return renderEmptyState()
    }
  }

  return (
    <section className={`relative h-full overflow-hidden rounded-2xl ${
      darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
    } border`}>
      
      {/* Toggle buttons - podobnie jak w PDF Reader toggle dla paneli */}
      {!curtainVisible && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-accent"
            onClick={onShowOutputs}
          >
            <Target className="h-4 w-4" />
          </Button>
          {selectedSource && (
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-accent"
              onClick={onChatClick}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Content area */}
      <div className="h-full">
        {renderContent()}
      </div>
    </section>
  )

  function renderGeneratingState() {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
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
            AI is analyzing your content and creating personalized study materials
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

  function renderEmptyState() {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className={`w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 ${
            darkMode ? 'bg-primary/10' : 'bg-primary/5'
          }`}>
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
            Ready to transform your learning
          </h2>
          <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
            {selectedSource 
              ? "Choose a study method to generate personalized content"
              : "Upload a source and select how you'd like to study it"
            }
          </p>
          
          {selectedSource ? (
            <div className="space-y-3">
              <Button 
                onClick={onShowOutputs}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Choose Study Method
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-4 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onChatClick}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat with AI
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Upload Your First Source
            </Button>
          )}
        </div>
      </div>
    )
  }

  // TODO: Jutro - usunąć gdy będziesz miał prawdziwe viewery
  function renderPlaceholderViewer(title: string, description: string) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 ${
            darkMode ? 'bg-primary/10' : 'bg-primary/5'
          }`}>
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
            {title} Viewer
          </h2>
          <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
            {description}
          </p>
          
          {currentOutput && (
            <div className="space-y-2">
              <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                Content: {currentOutput.title}
              </p>
              <p className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                TODO: Implement {content} viewer component
              </p>
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            <Button variant="outline" onClick={onShowOutputs}>
              Back to Methods
            </Button>
          </div>
        </div>
      </div>
    )
  }
}