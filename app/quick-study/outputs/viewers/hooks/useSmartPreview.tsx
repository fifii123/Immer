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
        type: "optimization",
        difficulty: "expert",
        expectedAnswer: "Możliwe optymalizacje to..."
      }
    ]
    
    return {
      operation: 'questions',
      content: {
        questions: questions.slice(0, 2 + Math.floor(Math.random() * 2)),
        totalDifficulty: "medium",
        recommendedTime: "5-8 minutes"
      },
      relatedElements: request.focusElement ? [request.focusElement] : ["paragraph-2", "paragraph-4"],
      metadata: {
        confidence: 0.78 + Math.random() * 0.15,
        sourceLength: request.sectionContent.length,
        generatedAt: new Date().toISOString()
      }
    }
  }

  static async generateELI5(request: SmartPreviewRequest): Promise<SmartPreviewResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500))
    
    const simplifiedText = `
**Prosty sposób myślenia o tym:**

Wyobraź sobie, że masz stos nieposortowanych kart i chcesz je ułożyć. To właśnie robią algorytmy sortowania, ale każdy na swój sposób.

🔄 **Pierwszy sposób (Bubble Sort)**: Porównujesz każdą kartę z sąsiednią i zamieniasz miejscami jeśli są w złej kolejności. Robisz to w kółko aż wszystko będzie na miejscu.

⚡ **Drugi sposób (Quick Sort)**: Wybierasz jedną kartę jako "wzorzec" i układasz wszystkie mniejsze po lewej, a większe po prawej. Potem robisz to samo z każdą grupą.

🔗 **Trzeci sposób (Merge Sort)**: Dzielisz stos na pół, sortujesz każdą połowę osobno, a potem łączysz je w prawidłowej kolejności.

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

// Real API service interface - for future implementation
class SmartPreviewRealAPI {
  static async callAPI(request: SmartPreviewRequest): Promise<SmartPreviewResponse> {
    // TODO: Replace with actual API call
    const response = await fetch(`/api/quick-study/sessions/${request.sectionId.split('-')[1]}/generate/notes/smart-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: request.operation,
        sectionId: request.sectionId,
        sectionContent: request.sectionContent,
        focusElement: request.focusElement
      })
    })

    if (!response.ok) {
      throw new Error(`Smart Preview API error: ${response.status}`)
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
  const loadOperation = useCallback(async (request: SmartPreviewRequest) => {
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

      // TODO: Switch between mock and real API based on environment
      const USE_MOCK_API = true // Change to false when backend is ready
      
      if (USE_MOCK_API) {
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
        // Use real API
        response = await SmartPreviewRealAPI.callAPI(request)
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