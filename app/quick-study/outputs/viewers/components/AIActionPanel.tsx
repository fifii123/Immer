// app/quick-study/outputs/viewers/components/AIActionPanel.tsx
import React, { useMemo, useCallback } from 'react'
import { 
  Sparkles, X, Sliders, Edit3, Eye, Zap, BookOpen, 
  MessageSquare, Brain, RotateCcw, Type, HelpCircle, Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { AIActionPanel as AIActionPanelType } from '../hooks/useActionPanel'

interface AIActionPanelComponentProps {
  actionPanel: AIActionPanelType
  isAnimating: boolean
  onClose: () => void
  onDetailLevelChange: (level: number) => void
  onTransformation: (type: 'tldr' | 'paraphrase' | 'quiz' | 'expand' | 'simplify') => void
}

// Smart Suggestions - memoized for performance
const getSmartSuggestion = (elementType: string, content: string): string => {
  const wordCount = content?.split(/\s+/).length || 0
  
  switch (elementType) {
    case 'paragraph':
      if (wordCount > 50) return "📝 Break into bullet points for better readability"
      if (wordCount < 10) return "🔍 Add more details and examples"
      return "✨ Add visual formatting (bold key terms)"
    
    case 'unordered-list':
    case 'ordered-list':
      if (wordCount < 20) return "📋 Add sub-items for more structure"
      return "🎯 Convert to numbered steps or action items"
    
    case 'table':
      return "📊 Add summary row or highlight key data"
    
    case 'blockquote':
      return "🔗 Add source attribution or expand context"
    
    case 'complete-section-1':
    case 'complete-section-2':
      return "🏗️ Break into smaller subsections"
    
    case 'complete-section-3':
    case 'complete-section-4':
    case 'complete-section-5':
    case 'complete-section-6':
      return "🎨 Add visual elements (diagrams, examples)"
    
    default:
      return "🚀 Enhance with AI-powered improvements"
  }
}

export function AIActionPanelComponent({
  actionPanel,
  isAnimating,
  onClose,
  onDetailLevelChange,
  onTransformation
}: AIActionPanelComponentProps) {
  // Detail level utilities - memoized
  const getDetailLevelColor = useCallback((level: number): string => {
    switch (level) {
      case 1: return 'text-blue-500'
      case 2: return 'text-cyan-500'
      case 3: return 'text-green-500'
      case 4: return 'text-yellow-500'
      case 5: return 'text-red-500'
      default: return 'text-gray-500'
    }
  }, [])

  const getDetailLevelEmoji = useCallback((level: number): string => {
    switch (level) {
      case 1: return '🟦'
      case 2: return '🟨'
      case 3: return '🟩'
      case 4: return '🟧'
      case 5: return '🟥'
      default: return '⚪'
    }
  }, [])

  const smartSuggestion = useMemo(() => 
    getSmartSuggestion(actionPanel.elementType, actionPanel.content), 
    [actionPanel.elementType, actionPanel.content]
  )

  // Don't render if animating
  if (isAnimating) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-[9998]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl p-6 max-w-sm w-96"
        style={{
          left: `${Math.max(10, Math.min(actionPanel.position.x - 192, window.innerWidth - 400))}px`,
          top: `${Math.max(10, Math.min(actionPanel.position.y - 50, window.innerHeight - 400))}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                AI Actions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {actionPanel.elementType.replace('-', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Detail Level Slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Sliders className="h-3 w-3" />
              Detail Level
            </span>
            <span className={`text-xs font-medium ${getDetailLevelColor(actionPanel.detailLevel)}`}>
              {getDetailLevelEmoji(actionPanel.detailLevel)} Level {actionPanel.detailLevel}
            </span>
          </div>
          <Slider
            value={[actionPanel.detailLevel]}
            onValueChange={([value]) => onDetailLevelChange(value)}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Basic</span>
            <span>Advanced</span>
          </div>
        </div>

        {/* Smart Suggestion */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {smartSuggestion}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransformation('tldr')}
              className="text-xs h-8 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Eye className="h-3 w-3" />
              TL;DR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransformation('expand')}
              className="text-xs h-8 flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Zap className="h-3 w-3" />
              Expand
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransformation('simplify')}
              className="text-xs h-8 flex items-center gap-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
            >
              <Type className="h-3 w-3" />
              Simplify
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransformation('paraphrase')}
              className="text-xs h-8 flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              <Edit3 className="h-3 w-3" />
              Rephrase
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onTransformation('quiz')}
            className="w-full text-xs h-8 flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <MessageSquare className="h-3 w-3" />
            Create Quiz
          </Button>
        </div>

        {/* Content Preview */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-500">Content Preview</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded max-h-20 overflow-y-auto">
            {actionPanel.content.slice(0, 150)}
            {actionPanel.content.length > 150 && '...'}
          </div>
        </div>
      </div>
    </>
  )
}