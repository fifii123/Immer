// app/quick-study/outputs/viewers/hooks/useAIOperations.ts
import { useState, useCallback } from 'react'

export type AIOperationType = 'expand' | 'improve' | 'summarize'

export interface AIOperationState {
  isProcessing: boolean
  content: string
  operation: AIOperationType | null
  error: string | null
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
    context?: string
  ) => {
    console.log(`🚀 Starting AI operation: ${operation}`)
    
    setOperationState({
      isProcessing: true,
      content: '',
      operation,
      error: null
    })

    try {
      const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          content,
          context
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk') {
                fullContent += data.content
                
                setOperationState(prev => ({
                  ...prev,
                  content: fullContent
                }))
                
              } else if (data.type === 'complete') {
                console.log(`✅ AI operation completed: ${operation}`)
                
                setOperationState(prev => ({
                  ...prev,
                  isProcessing: false,
                  content: data.fullContent
                }))
                
                return data.fullContent
                
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Unknown error')
              }
            } catch (parseError) {
              console.warn('Error parsing stream data:', parseError)
              continue
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ AI operation failed:', error)
      
      setOperationState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      
      throw error
    }
  }, [])

  const resetOperation = useCallback(() => {
    setOperationState({
      isProcessing: false,
      content: '',
      operation: null,
      error: null
    })
  }, [])

  return {
    operationState,
    processContent,
    resetOperation
  }
}