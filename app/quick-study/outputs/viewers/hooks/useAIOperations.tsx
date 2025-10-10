// app/quick-study/outputs/viewers/hooks/useAIOperations.tsx
import { useState, useCallback } from 'react'

export type AIOperationType = 'expand' | 'improve' | 'summarize' | 'morph'

// Add morphing interface
export interface MorphingParams {
  density: number  
  tone: 'formal' | 'casual' | 'explanatory' | 'academic' | 'technical'
}

export interface AIOperationState {
  isProcessing: boolean
  content: string
  operation: AIOperationType | null
  error: string | null
}

export interface DOMContext {
  domInfo: {
    domElementId: string,
    structuralId: string,
    elementType: string,
    content: string
  },
  parsedSections: any[],
  fullDocument: string
}

export function useAIOperations() {
  const [operationState, setOperationState] = useState<AIOperationState>({
    isProcessing: false,
    content: '',
    operation: null,
    error: null
  })

  const processContent = useCallback(async (
    sessionId: string,
    operation: AIOperationType,
    content: string,
    domContext: DOMContext
  ) => {
    console.log(`🚀 DOM-first AI operation: ${operation}`)
    console.log(`🎯 Element: ${domContext.domInfo.structuralId} (${domContext.domInfo.elementType})`)
    console.log(`📊 Content length: ${content.length} chars`)
    console.log(`📚 Sections: ${domContext.parsedSections.length}`)
    
    setOperationState({
      isProcessing: true,
      content: '',
      operation,
      error: null
    })

    try {
      const requestBody = {
        operation,
        content,
        domInfo: domContext.domInfo,
        parsedSections: domContext.parsedSections,
        fullDocument: domContext.fullDocument
      }

      console.log('📤 Sending DOM-first request to API')

      const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk' && data.content) {
                accumulatedContent += data.content
                setOperationState(prev => ({
                  ...prev,
                  content: accumulatedContent
                }))
              } else if (data.type === 'complete') {
                console.log(`✅ ${operation} operation completed successfully`)
                console.log(`📋 Context info: ${data.contextInfo?.mode} (${data.contextInfo?.fragmentType})`)
                
                setOperationState(prev => ({
                  ...prev,
                  isProcessing: false,
                  content: data.fullContent || accumulatedContent
                }))
                return
              } else if (data.type === 'error') {
                console.error('❌ AI operation error:', data.message)
                throw new Error(data.message || 'AI processing failed')
              }
            } catch (parseError) {
              // Ignore JSON parsing errors for malformed chunks
              console.warn('Failed to parse SSE data:', parseError)
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ AI operation failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setOperationState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }))
    }
  }, [])

  const resetOperation = useCallback(() => {
    console.log('🔄 Resetting AI operation state')
    setOperationState({
      isProcessing: false,
      content: '',
      operation: null,
      error: null
    })
  }, [])

const processMorphing = useCallback(async (
  sessionId: string,
  content: string,
  morphingParams: MorphingParams,
  domContext: DOMContext
) => {
  console.log(`🎛️ TODO: Implement morphing backend`)
  console.log('Params:', morphingParams)
  console.log('Context:', domContext)
  
  // Placeholder - backend implementation will come later
  return Promise.resolve()
}, [])

return {
  operationState,
  processContent,
  processMorphing, // NEW: Export placeholder
  resetOperation
}
}