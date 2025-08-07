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
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SmartPreviewPanelProps {
  sectionId: string
  sectionContent: string
  position: { top: number; left: number } | null
  onClose: () => void
  focusElement?: string  // Element that was clicked before opening preview
  sectionContainer?: HTMLElement | null // Container for sticky positioning
}

// Mock data - same as stable version
const getMockData = (operation: string, sectionContent: string) => {
  const sectionLength = sectionContent.length
  
  switch (operation) {
    case 'concepts':
      return {
        concepts: [
          "Główne pojęcie z tej sekcji",
          "Kluczowy termin techniczny", 
          "Ważna definicja"
        ],
        definitions: [
          { term: "Termin 1", definition: "Definicja pierwszego terminu" },
          { term: "Termin 2", definition: "Definicja drugiego terminu" }
        ]
      }
    
    case 'questions':
      return {
        questions: [
          "Co to jest [główne pojęcie] i dlaczego jest ważne?",
          "Jakie są praktyczne zastosowania opisywanej metody?",
          "Czym różni się to podejście od alternatywnych rozwiązań?"
        ],
        recommendedTime: sectionLength > 500 ? "5-7 minut" : "2-3 minuty"
      }
    
    case 'eli5':
      return {
        simplifiedText: "To jest uproszczone wyjaśnienie tej sekcji, napisane prostym językiem tak, jakby tłumaczyło się to dziecku. Używa prostych słów i analogii z codziennego życia.",
        readingLevel: "Podstawowy",
        estimatedReadingTime: "1-2 minuty",
        keyAnalogies: [
          "Jak budowanie domu - najpierw fundament",
          "Podobne do przepisu kulinarnego - krok po kroku"
        ]
      }
    
    default:
      return null
  }
}

export function SmartPreviewPanel({ 
  sectionId, 
  sectionContent, 
  position, 
  onClose, 
  focusElement, 
  sectionContainer 
}: SmartPreviewPanelProps) {
  // State for controlling rendering and collapsible sections
  const [isPortalReady, setIsPortalReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [loadedOperations, setLoadedOperations] = useState<Set<string>>(new Set())
  const [loadingOperations, setLoadingOperations] = useState<Set<string>>(new Set())
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())

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

  // Load content for specific operation (mock with loading)
  const loadContent = useCallback(async (operation: string) => {
    if (loadingOperations.has(operation) || loadedOperations.has(operation)) return
    
    // Start loading
    setLoadingOperations(prev => new Set([...prev, operation]))
    setExpandedBlocks(prev => new Set([...prev, operation]))
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
    
    // Finish loading
    setLoadingOperations(prev => {
      const newSet = new Set(prev)
      newSet.delete(operation)
      return newSet
    })
    setLoadedOperations(prev => new Set([...prev, operation]))
  }, [loadingOperations, loadedOperations])

  // Toggle block expansion
  const toggleBlock = useCallback((operation: string) => {
    const isLoading = loadingOperations.has(operation)
    const isLoaded = loadedOperations.has(operation)
    
    if (isLoading) return // Don't do anything if loading
    
    if (isLoaded) {
      // Toggle expansion for loaded content
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
  }, [loadingOperations, loadedOperations, loadContent])

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
  const renderBlock = useCallback((operation: string) => {
    const config = blockConfigs[operation as keyof typeof blockConfigs]
    const isLoading = loadingOperations.has(operation)
    const isLoaded = loadedOperations.has(operation)
    const isExpanded = expandedBlocks.has(operation)
    const mockData = isLoaded ? getMockData(operation, sectionContent) : null
    
    return (
      <div key={operation} className="smart-preview-block">
        {/* Block Header - Always visible */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-2 transition-all duration-200 hover:bg-white/20 dark:hover:bg-white/10 hover:backdrop-blur-sm ${config.bgColor}`}
          onClick={() => toggleBlock(operation)}
          disabled={isLoading}
        >
          <div className={`${config.color} flex items-center gap-2`}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLoaded ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              config.icon
            )}
            <span className="font-medium">{config.title}</span>
          </div>
          
          {isLoading ? (
            <Loader2 className="h-3 w-3 ml-auto animate-spin opacity-60" />
          ) : isLoaded ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 ml-auto opacity-60" />
            ) : (
              <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
            )
          ) : (
            <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
          )}
        </Button>

        {/* Loading state */}
        {isLoading && isExpanded && (
          <div className="mt-2 pl-6 pr-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading AI insights...</span>
          </div>
        )}

        {/* Block Content - Show when loaded and expanded */}
        {isLoaded && isExpanded && mockData && (
          <div className="mt-2 pl-6 pr-2">
            {operation === 'concepts' && (
              <div className="space-y-1">
                {mockData.concepts.map((concept: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                    <span className="text-muted-foreground">{concept}</span>
                    {focusElement && index === 0 && (
                      <Sparkles className="h-3 w-3 text-green-500 ml-auto" title="Related to focused element" />
                    )}
                  </div>
                ))}
                
                {mockData.definitions && mockData.definitions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Definicje:</p>
                    {mockData.definitions.slice(0, 2).map((def: any, index: number) => (
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
                {mockData.questions.map((question: string, index: number) => (
                  <div key={index} className="text-sm border-l-2 border-green-200 pl-3">
                    <p className="text-muted-foreground">{question}</p>
                  </div>
                ))}
                
                {mockData.recommendedTime && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      ⏱️ Szacowany czas: {mockData.recommendedTime}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {operation === 'eli5' && (
              <div className="text-sm text-muted-foreground">
                <div className="border-l-2 border-orange-200 pl-3">
                  <div className="whitespace-pre-line mb-2">{mockData.simplifiedText}</div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      📚 {mockData.readingLevel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      ⏱️ {mockData.estimatedReadingTime}
                    </Badge>
                  </div>
                  
                  {mockData.keyAnalogies && mockData.keyAnalogies.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs font-medium mb-1">Analogie:</p>
                      <div className="text-xs space-y-0.5">
                        {mockData.keyAnalogies.map((analogy: string, index: number) => (
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
      </div>
    )
  }, [loadingOperations, loadedOperations, expandedBlocks, toggleBlock, sectionContent, focusElement])

  if (!position || !isPortalReady) return null

  // Determine if we should use portal or direct rendering
  const shouldUsePortal = sectionContainer && typeof document !== 'undefined'

  // Create the panel content once
  const panelContent = (
    <>
      {/* Test background - czy blur w ogóle działa */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #ff0000 0px, #ff0000 10px, #0000ff 10px, #0000ff 20px)',
          pointerEvents: 'none',
          zIndex: -1
        }}
      />
      
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