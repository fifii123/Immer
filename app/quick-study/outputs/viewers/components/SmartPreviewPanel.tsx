// app/quick-study/outputs/viewers/components/SmartPreviewPanel.tsx
"use client"

import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { 
  Brain, 
  HelpCircle, 
  Lightbulb, 
  Loader2, 
  X, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSmartPreview, SmartPreviewOperation } from '../hooks/useSmartPreview'

interface SmartPreviewPanelProps {
  sectionId: string
  sectionContent: string
  position: { top: number; left: number } | null
  onClose: () => void
  focusElement?: string  
  sectionContainer?: HTMLElement | null 
  parsedSections?: any[]  // NEW: For context
  fullDocument?: string   // NEW: For context
}

export function SmartPreviewPanel({ 
  sectionId, 
  sectionContent, 
  position, 
  onClose, 
  focusElement, 
  sectionContainer,
  parsedSections,    // NEW
  fullDocument       // NEW
}: SmartPreviewPanelProps) {
  // State for controlling rendering and collapsible sections
  const [isPortalReady, setIsPortalReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [loadingOperations, setLoadingOperations] = useState<Set<SmartPreviewOperation>>(new Set()) // NEW: Per-operation loading
  
  // NEW: Use the Smart Preview hook
  const { 
    loadOperation, 
    getResponse, 
    isLoaded, 
    getError,
    clearAll 
  } = useSmartPreview()

  // Clear data when section changes
  useEffect(() => {
    clearAll()
    setExpandedBlocks(new Set())
    setLoadingOperations(new Set()) // NEW: Clear loading operations
  }, [sectionId, clearAll])

  // Prepare portal on mount
  useEffect(() => {
    if (sectionContainer && typeof document !== 'undefined') {
      // Ensure section container has proper styles
      if (getComputedStyle(sectionContainer).position === 'static') {
        sectionContainer.style.position = 'relative'
      }
      if (getComputedStyle(sectionContainer).overflow === 'hidden') {
        sectionContainer.style.overflow = 'visible'
      }
      
      setIsPortalReady(true)
      // Delay visibility to prevent flash
      setTimeout(() => setIsVisible(true), 10)
    } else {
      // No portal needed, render immediately
      setIsPortalReady(true)
      setIsVisible(true)
    }
  }, [sectionContainer])

  // Load content for specific operation using real API
  const loadContent = useCallback((operation: SmartPreviewOperation) => {
    if (isLoaded(operation) || loadingOperations.has(operation)) return
    
    setExpandedBlocks(prev => new Set([...prev, operation]))
    setLoadingOperations(prev => new Set([...prev, operation])) // Start loading this operation
    
    // Fire and forget - async loading
    loadOperation({
      operation,
      sectionId,
      sectionContent,
      focusElement
    }, {
      parsedSections,
      fullDocument
    }).then(() => {
      setLoadingOperations(prev => {
        const next = new Set(prev)
        next.delete(operation)
        return next
      })
    }).catch(error => {
      console.error(`Failed to load ${operation}:`, error)
      setLoadingOperations(prev => {
        const next = new Set(prev)
        next.delete(operation)
        return next
      })
    })
  }, [loadOperation, sectionId, sectionContent, focusElement, parsedSections, fullDocument, isLoaded, loadingOperations])

  // Toggle block expansion
  const toggleBlock = useCallback((operation: SmartPreviewOperation) => {
    const isCurrentlyLoaded = isLoaded(operation)
    const hasError = getError(operation)
    
    if (isCurrentlyLoaded || hasError) {
      // Toggle expansion for loaded content or errors
      setExpandedBlocks(prev => {
        const newSet = new Set(prev)
        if (newSet.has(operation)) {
          newSet.delete(operation)
        } else {
          newSet.add(operation)
        }
        return newSet
      })
    } else {
      // Start loading content
      loadContent(operation)
    }
  }, [isLoaded, getError, loadContent])

  // Handle click outside to close
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent closing when clicking inside panel
  }, [])

  // Block configurations
  const blockConfigs = {
    concepts: {
      title: "Główne pojęcia",
      icon: <Brain className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
    },
    questions: {
      title: "Pytania sprawdzające", 
      icon: <HelpCircle className="h-4 w-4" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "hover:bg-green-50 dark:hover:bg-green-900/20"
    },
    eli5: {
      title: "Uproszczona wersja",
      icon: <Lightbulb className="h-4 w-4" />,
      color: "text-orange-600 dark:text-orange-400", 
      bgColor: "hover:bg-orange-50 dark:hover:bg-orange-900/20"
    }
  }

  // Render individual block
  const renderBlock = useCallback((operation: SmartPreviewOperation) => {
    const config = blockConfigs[operation]
    const isCurrentlyLoaded = isLoaded(operation)
    const isExpanded = expandedBlocks.has(operation)
    const response = getResponse(operation)
    const error = getError(operation)
    
    // Check if this specific operation is loading (using local state)
    const isOperationLoading = loadingOperations.has(operation)
    
    return (
      <div key={operation} className="smart-preview-block">
        {/* Block Header - Always visible */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-2 transition-all duration-200 hover:bg-white/20 dark:hover:bg-white/10 hover:backdrop-blur-sm ${config.bgColor}`}
          onClick={() => toggleBlock(operation)}
          disabled={isOperationLoading}
        >
          <div className={`${config.color} flex items-center gap-2`}>
            {isOperationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : error ? (
              <AlertCircle className="h-4 w-4" />
            ) : isCurrentlyLoaded ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              config.icon
            )}
            <span className="font-medium">{config.title}</span>
          </div>
          
          {isOperationLoading ? (
            <Loader2 className="h-3 w-3 ml-auto animate-spin opacity-60" />
          ) : (isCurrentlyLoaded || error) ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 ml-auto opacity-60" />
            ) : (
              <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
            )
          ) : (
            <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
          )}
        </Button>

        {/* Usunięty cały panel ładowania */}

        {/* Error state */}
        {error && isExpanded && (
          <div className="mt-2 pl-6 pr-2">
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Error: {error}</span>
            </div>
          </div>
        )}

        {/* Block Content - Show when loaded and expanded */}
        {isCurrentlyLoaded && isExpanded && response && (
          <div className="mt-2 pl-6 pr-2">
            {operation === 'concepts' && response.content && (
              <div className="space-y-1">
                {response.content.concepts?.map((concept: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">{concept}</span>
                    {focusElement && index === 0 && (
                      <Sparkles className="h-3 w-3 text-green-500 ml-auto" title="Related to focused element" />
                    )}
                  </div>
                ))}
                
                {response.content.definitions && response.content.definitions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Definicje:</p>
                    <div className="space-y-2">
                      {response.content.definitions.map((def: any, index: number) => (
                        <div key={index} className="text-xs">
                          <span className="font-medium text-foreground">{def.term}:</span>{' '}
                          <span className="text-muted-foreground">{def.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {operation === 'questions' && response.content && (
              <div className="space-y-2">
                {response.content.questions?.map((q: any, index: number) => (
                  <div key={index} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 font-medium flex-shrink-0">{index + 1}.</span>
                      <span className="text-muted-foreground">{q.question || q}</span>
                      {focusElement && index === 0 && (
                        <Sparkles className="h-3 w-3 text-green-500 ml-auto mt-0.5" title="Related to focused element" />
                      )}
                    </div>
                    {q.type && q.difficulty && (
                      <div className="ml-5 mt-1 flex gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {q.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {q.difficulty}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                
                {response.content.recommendedTime && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>⏱️ Zalecany czas:</span>
                      <span className="font-medium">{response.content.recommendedTime}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {operation === 'eli5' && response.content && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {response.content.simplifiedText}
                  {focusElement && (
                    <Sparkles className="h-3 w-3 text-green-500 ml-2 inline" title="Adapted for focused element" />
                  )}
                </div>
                
                <div className="flex gap-1 mt-2">
                  <Badge variant="outline" className="text-xs">
                    📚 {response.content.readingLevel}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ⏱️ {response.content.estimatedReadingTime}
                  </Badge>
                </div>
                
                {response.content.keyAnalogies && response.content.keyAnalogies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-xs font-medium mb-1">Analogie:</p>
                    <div className="text-xs space-y-0.5">
                      {response.content.keyAnalogies.map((analogy: string, index: number) => (
                        <div key={index}>• {analogy}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }, [loadingOperations, expandedBlocks, toggleBlock, sectionContent, focusElement, isLoaded, getResponse, getError])

  if (!position || !isPortalReady) return null

  // Determine if we should use portal or direct rendering
  const shouldUsePortal = sectionContainer && typeof document !== 'undefined'

  // Create the panel content once
  const panelContent = (
    <>
      <div
        className={shouldUsePortal ? "absolute z-50 smart-preview-panel" : "fixed z-50 smart-preview-panel"}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-85%)',
          opacity: isVisible ? 1 : 0,
          visibility: isVisible ? 'visible' : 'hidden',
          transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
        }}
        onClick={handleClick}
      >
        {/* Fallback: Strong semi-transparent background instead of blur */}
        <div 
          className="w-80 shadow-2xl border border-white/40 rounded-lg overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37), 0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/5 pointer-events-none" />
          
          {/* Header */}
          <div className="p-4 pb-3 relative bg-white/20">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                <Brain className="h-4 w-4 text-blue-600" />
                Smart Preview
                {focusElement && (
                  <Sparkles className="h-3 w-3 text-green-500" title="Context-aware for focused element" />
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-black/10 transition-colors text-gray-700"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {focusElement 
                ? "AI insights for your selected content" 
                : "Click to load AI-generated insights"
              }
            </p>
          </div>
          
          {/* Content */}
          <div className="px-4 pb-4 space-y-3 relative">
            {renderBlock('concepts')}
            {renderBlock('questions')}
            {renderBlock('eli5')}
          </div>
        </div>
      </div>
    </>
  )

  // Return portal or direct content
  if (shouldUsePortal) {
    return ReactDOM.createPortal(panelContent, sectionContainer)
  }

  return panelContent
}