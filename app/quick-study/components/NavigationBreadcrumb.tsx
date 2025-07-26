// app/quick-study/components/NavigationBreadcrumb.tsx
"use client"

import React from 'react'
import { 
  ChevronRight,
  FileText,
  Youtube,
  Image,
  Mic,
  File,
  Globe,
  Zap,
  Target,
  PenTool,
  FileCheck,
  Clock,
  Network,
  MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Source, PlaygroundContent } from '../hooks/useQuickStudy'

interface NavigationBreadcrumbProps {
  selectedSource: Source | null
  playgroundContent: PlaygroundContent
  currentOutput: any
  curtainVisible: boolean
  onOpenCurtain: () => void
  onResetToPreview?: () => void
}

// Get source icon
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

// Get method info
const getMethodInfo = (content: PlaygroundContent) => {
  switch (content) {
    case 'flashcards':
      return { icon: <Zap className="h-4 w-4" />, label: 'Flashcards', color: 'text-indigo-600' }
    case 'quiz':
      return { icon: <Target className="h-4 w-4" />, label: 'Quiz', color: 'text-green-600' }
    case 'notes':
      return { icon: <PenTool className="h-4 w-4" />, label: 'Notes', color: 'text-blue-600' }
    case 'summary':
      return { icon: <FileCheck className="h-4 w-4" />, label: 'Summary', color: 'text-purple-600' }
    case 'timeline':
      return { icon: <Clock className="h-4 w-4" />, label: 'Timeline', color: 'text-orange-600' }
    case 'knowledge-map':
      return { icon: <Network className="h-4 w-4" />, label: 'Knowledge Map', color: 'text-emerald-600' }
    case 'chat':
      return { icon: <MessageCircle className="h-4 w-4" />, label: 'Chat', color: 'text-pink-600' }
    default:
      return null
  }
}

// Get current state description
const getCurrentState = (content: PlaygroundContent, output: any) => {
  if (!output) return null
  
  // For multi-stage viewers, determine current state
  switch (content) {
    case 'flashcards':
      // Check if we're in study mode, review mode, etc.
      // This would need to be passed from FlashcardViewer or tracked in state
      return 'Study Mode' // placeholder for now
    case 'quiz':
      return 'Taking Quiz' // placeholder
    default:
      return null
  }
}

export default function NavigationBreadcrumb({
  selectedSource,
  playgroundContent,
  currentOutput,
  curtainVisible,
  onOpenCurtain,
  onResetToPreview
}: NavigationBreadcrumbProps) {
  
  // Don't show breadcrumb when curtain is visible or no source selected
  if (!selectedSource || curtainVisible) return null
  
  const methodInfo = getMethodInfo(playgroundContent)
  const currentState = getCurrentState(playgroundContent, currentOutput)
  
  return (
    <nav className="flex items-center gap-2 text-sm">
      {/* Source breadcrumb */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenCurtain}
        className="h-8 px-3 gap-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
      >
        {getSourceIcon(selectedSource.type, (selectedSource as any).subtype)}
        <span className="font-medium truncate max-w-[200px]">
          {selectedSource.name}
        </span>
      </Button>
      
      {/* Method breadcrumb */}
      {methodInfo && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToPreview}
            className={`h-8 px-3 gap-2 hover:bg-accent rounded-lg transition-all ${methodInfo.color}`}
          >
            {methodInfo.icon}
            <span className="font-medium">
              {methodInfo.label}
            </span>
          </Button>
        </>
      )}
      
      {/* Current state */}
      {currentState && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-muted-foreground font-medium px-2">
            {currentState}
          </span>
        </>
      )}
    </nav>
  )
}