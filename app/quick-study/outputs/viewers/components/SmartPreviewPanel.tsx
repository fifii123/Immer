// app/quick-study/outputs/viewers/components/SmartPreviewPanel.tsx
"use client"

import React, { useCallback, useEffect } from 'react'
import { 
  Brain, 
  HelpCircle, 
  Lightbulb, 
  Loader2, 
  X, 
  ChevronRight,
  Sparkles,
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSmartPreview, SmartPreviewOperation } from '../hooks/useSmartPreview'

interface SmartPreviewPanelProps {
  sectionId: string
  sectionContent: string
  position: { top: number; left: number } | null
  onClose: () => void
  focusElement?: string  // Element that was clicked before opening preview
}

export function SmartPreviewPanel({ sectionId, sectionContent, position, onClose, focusElement }: SmartPreviewPanelProps) {
  const { 
    isLoading, 
    loadOperation, 
    getResponse, 
    isLoaded, 
    getError, 
    clearAll 
  } = useSmartPreview()

  // Clear previous data when section changes
  useEffect(() => {
    clearAll()
  }, [sectionId, clearAll])

  // Load content for specific operation
  const loadContent = useCallback(async (operation: SmartPreviewOperation) => {
    try {
      await loadOperation({
        operation,
        sectionId,
        sectionContent,
        focusElement
      })
    } catch (error) {
      // Error is already handled by the hook
      console.log(`Failed to load ${operation}:`, error)
    }
  }, [loadOperation, sectionId, sectionContent, focusElement])

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
    const response = getResponse(operation)
    const error = getError(operation)
    const loaded = isLoaded(operation)
    
    // Determine status for this operation
    const operationLoading = isLoading // Note: hook tracks overall loading, could be improved
    const status = error ? 'error' : loaded ? 'loaded' : operationLoading ? 'loading' : 'idle'
    
    return (
      <div key={operation} className="smart-preview-block">
        {/* Block Header - Always visible */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-2 ${config.bgColor} transition-colors`}
          onClick={() => status === 'idle' ? loadContent(operation) : undefined}
          disabled={status === 'loading'}
        >
          <div className={`${config.color} flex items-center gap-2`}>
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'loaded' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              config.icon
            )}
            <span className="font-medium">{config.title}</span>
          </div>
          
          {status === 'idle' && (
            <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
          )}
          
          {status === 'loaded' && response?.metadata && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {Math.round((response.metadata.confidence || 0.8) * 100)}%
            </Badge>
          )}
        </Button>

        {/* Block Content - Show when loaded */}
        {status === 'loaded' && response && (
          <div className="mt-2 pl-6 pr-2">
            {operation === 'concepts' && (
              <div className="space-y-1">
                {response.content.concepts.map((concept: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">{concept}</span>
                    {response.relatedElements?.includes(focusElement || `paragraph-${index + 1}`) && (
                      <Sparkles className="h-3 w-3 text-green-500 ml-auto" title="Related to focused element" />
                    )}
                  </div>
                ))}
                
                {response.content.definitions && response.content.definitions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Definicje:</p>
                    {response.content.definitions.slice(0, 2).map((def: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground mb-1">
                        <strong>{def.term}:</strong> {def.definition}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {operation === 'questions' && (
              <div className="space-y-2">
                {response.content.questions.map((q: any, index: number) => (
                  <div key={index} className="text-sm border-l-2 border-green-200 pl-3">
                    <p className="text-muted-foreground font-medium">{q.question}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{q.difficulty || q.level}</Badge>
                      <Badge variant="outline" className="text-xs">{q.type || q.focus}</Badge>
                    </div>
                  </div>
                ))}
                
                {response.content.recommendedTime && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      ⏱️ Szacowany czas: {response.content.recommendedTime}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {operation === 'eli5' && (
              <div className="text-sm text-muted-foreground">
                <div className="border-l-2 border-orange-200 pl-3">
                  <div className="whitespace-pre-line mb-2">{response.content.simplifiedText}</div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      📚 {response.content.readingLevel}
                    </Badge>
                    {response.content.estimatedReadingTime && (
                      <Badge variant="outline" className="text-xs">
                        ⏱️ {response.content.estimatedReadingTime}
                      </Badge>
                    )}
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
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="mt-2 pl-6 text-sm text-red-500">
            {error || 'Failed to load'}. <button 
              onClick={() => loadContent(operation)}
              className="underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    )
  }, [getResponse, getError, isLoaded, isLoading, loadContent, focusElement])

  if (!position) return null

  return (
    <div
      className="fixed z-50 smart-preview-panel"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)', // Center horizontally
      }}
      onClick={handleClick}
    >
      <Card className="w-80 bg-background/95 backdrop-blur-sm shadow-xl border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              Smart Preview
              {focusElement && (
                <Sparkles className="h-3 w-3 text-green-500" title="Context-aware for focused element" />
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {focusElement 
              ? "AI insights for your selected content" 
              : "Click to load AI-generated insights"
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {renderBlock('concepts')}
          {renderBlock('questions')}
          {renderBlock('eli5')}
        </CardContent>
      </Card>
    </div>
  )
}