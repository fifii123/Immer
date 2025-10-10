// app/quick-study/outputs/viewers/hooks/useSmartPreview.tsx
import { useState, useCallback } from 'react'

export type SmartPreviewOperation = 'concepts' | 'questions' | 'eli5'

export interface SmartPreviewRequest {
  operation: SmartPreviewOperation
  sectionId: string
  sectionContent: string
  focusElement?: string  // For highlighting related content
}

export interface SmartPreviewResponse {
  operation: SmartPreviewOperation
  content: any
  relatedElements?: string[]
  processingTime?: number
  metadata?: {
    confidence: number
    sourceLength: number
    generatedAt: string
  }
}

export interface SmartPreviewState {
  isLoading: boolean
  loadedOperations: Set<SmartPreviewOperation>
  responses: Record<SmartPreviewOperation, SmartPreviewResponse | null>
  errors: Record<SmartPreviewOperation, string | null>
}

export interface SmartPreviewContext {
  parsedSections?: any[]
  fullDocument?: string
}

// Mock API service - easily replaceable with real API
class SmartPreviewMockAPI {
  static async generateConcepts(request: SmartPreviewRequest): Promise<SmartPreviewResponse> {
    // Simulate realistic processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
    
    // Extract potential concepts from section content
    const conceptMatches = request.sectionContent.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || []
    const mockConcepts = [
      ...new Set([
        "Algorytmy sortowania",
        "Złożoność czasowa",
        "Big O notation", 
        "Divide and conquer",
        "Rekurencja",
        ...conceptMatches.slice(0, 3)
      ])
    ].slice(0, 5)
    
    return {
      operation: 'concepts',
      content: {
        concepts: mockConcepts,
        definitions: mockConcepts.map(concept => ({
          term: concept,
          definition: `Definicja dla ${concept} - automatycznie wygenerowana na podstawie kontekstu sekcji.`
        }))
      },
      relatedElements: request.focusElement ? [request.focusElement] : ["paragraph-1", "paragraph-3"],
      metadata: {
        confidence: 0.85 + Math.random() * 0.1,
        sourceLength: request.sectionContent.length,
        generatedAt: new Date().toISOString()
      }
    }
  }

  static async generateQuestions(request: SmartPreviewRequest): Promise<SmartPreviewResponse> {
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300))
    
    const questions = [
      {
        question: "Jakie są główne różnice między algorytmami przedstawionymi w tej sekcji?",
        type: "comparison",
        difficulty: "medium",
        expectedAnswer: "Różnice w złożoności czasowej i przestrzennej..."
      },
      {
        question: "W jakich sytuacjach zastosowałbyś opisaną metodę?",
        type: "application", 
        difficulty: "advanced",
        expectedAnswer: "Praktyczne zastosowania obejmują..."
      },
      {
        question: "Jak można zoptymalizować przedstawione rozwiązanie?",
        type: "analysis",
        difficulty: "advanced", 
        expectedAnswer: "Optymalizacje mogą obejmować..."
      }
    ]
    
    return {
      operation: 'questions',
      content: {
        questions,
        recommendedTime: request.sectionContent.length > 500 ? "5-7 minut" : "2-3 minuty"
      },
      relatedElements: request.focusElement ? [request.focusElement] : ["paragraph-2", "paragraph-4"],
      metadata: {
        confidence: 0.88 + Math.random() * 0.08,
        sourceLength: request.sectionContent.length,
        generatedAt: new Date().toISOString()
      }
    }
  }

  static async generateELI5(request: SmartPreviewRequest): Promise<SmartPreviewResponse> {
    await new Promise(resolve => setTimeout(resolve, 900 + Math.random() * 500))
    
    const simplifiedText = `
To jest uproszczone wyjaśnienie tej sekcji. Wyobraź sobie, że tłumaczysz to swojemu młodszemu rodzeństwu.

Główna idea to coś jak ${request.sectionContent.length > 300 ? 'organizowanie dużej biblioteki' : 'porządkowanie szuflady'}. 

Każdy sposób ma swoje zalety - niektóre są szybsze, inne łatwiejsze do zrozumienia.
    `.trim()
    
    return {
      operation: 'eli5',
      content: {
        simplifiedText,
        readingLevel: "basic",
        keyAnalogies: [
          "Sortowanie kart do gry",
          "Organizowanie książek na półce", 
          "Układanie kolejki według wzrostu"
        ],
        estimatedReadingTime: "2-3 minutes"
      },
      relatedElements: request.focusElement ? [request.focusElement] : ["paragraph-1", "paragraph-2", "paragraph-3"],
      metadata: {
        confidence: 0.92 + Math.random() * 0.05,
        sourceLength: request.sectionContent.length,
        generatedAt: new Date().toISOString()
      }
    }
  }
}

// Real API service interface
class SmartPreviewRealAPI {
  static async callAPI(request: SmartPreviewRequest, parsedSections?: any[], fullDocument?: string): Promise<SmartPreviewResponse> {
    const sessionId = request.sectionId.includes('-') ? request.sectionId.split('-')[1] : request.sectionId
    
    const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit/smart-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: request.operation,
        sectionId: request.sectionId,
        sectionContent: request.sectionContent,
        focusElement: request.focusElement,
        parsedSections,
        fullDocument
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Smart Preview API error: ${response.status} - ${errorData.error}`)
    }

    return await response.json()
  }
}

export function useSmartPreview() {
  const [state, setState] = useState<SmartPreviewState>({
    isLoading: false,
    loadedOperations: new Set(),
    responses: {
      concepts: null,
      questions: null,
      eli5: null
    },
    errors: {
      concepts: null,
      questions: null,
      eli5: null
    }
  })

  // Load content for specific operation
  const loadOperation = useCallback(async (request: SmartPreviewRequest, context?: SmartPreviewContext) => {
    console.log(`🧠 useSmartPreview: Loading ${request.operation} for section ${request.sectionId}`)
    
    // Set loading state
    setState(prev => ({
      ...prev,
      isLoading: true,
      errors: {
        ...prev.errors,
        [request.operation]: null
      }
    }))

    try {
      let response: SmartPreviewResponse

      // Switch between mock and real API based on environment
      const USE_MOCK_API = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_SMART_PREVIEW === 'true'
      
      if (USE_MOCK_API) {
        console.log('🎭 Using Mock Smart Preview API')
        // Use mock API
        switch (request.operation) {
          case 'concepts':
            response = await SmartPreviewMockAPI.generateConcepts(request)
            break
          case 'questions':
            response = await SmartPreviewMockAPI.generateQuestions(request)
            break
          case 'eli5':
            response = await SmartPreviewMockAPI.generateELI5(request)
            break
          default:
            throw new Error(`Unknown operation: ${request.operation}`)
        }
      } else {
        console.log('🚀 Using Real Smart Preview API')
        // Use real API
        response = await SmartPreviewRealAPI.callAPI(request, context?.parsedSections, context?.fullDocument)
      }

      // Update state with successful response
      setState(prev => ({
        ...prev,
        isLoading: false,
        loadedOperations: new Set([...prev.loadedOperations, request.operation]),
        responses: {
          ...prev.responses,
          [request.operation]: response
        }
      }))

      console.log(`✅ useSmartPreview: Loaded ${request.operation}`, response)
      return response

    } catch (error) {
      console.error(`❌ useSmartPreview: Error loading ${request.operation}`, error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: {
          ...prev.errors,
          [request.operation]: errorMessage
        }
      }))

      throw error
    }
  }, [])

  // Clear all loaded data (useful for section changes)
  const clearAll = useCallback(() => {
    setState({
      isLoading: false,
      loadedOperations: new Set(),
      responses: {
        concepts: null,
        questions: null,
        eli5: null
      },
      errors: {
        concepts: null,
        questions: null,
        eli5: null
      }
    })
  }, [])

  // Get response for specific operation
  const getResponse = useCallback((operation: SmartPreviewOperation) => {
    return state.responses[operation]
  }, [state.responses])

  // Check if operation is loaded
  const isLoaded = useCallback((operation: SmartPreviewOperation) => {
    return state.loadedOperations.has(operation)
  }, [state.loadedOperations])

  // Get error for specific operation
  const getError = useCallback((operation: SmartPreviewOperation) => {
    return state.errors[operation]
  }, [state.errors])

  return {
    // State
    isLoading: state.isLoading,
    
    // Actions
    loadOperation,
    clearAll,
    
    // Getters
    getResponse,
    isLoaded,
    getError,
    
    // Utilities
    hasAnyLoaded: state.loadedOperations.size > 0,
    loadedCount: state.loadedOperations.size
  }
}