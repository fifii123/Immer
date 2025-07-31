import { useState, useCallback } from 'react'
import { EditContext } from '@/app/services/MinimalContextService'

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
    contextOrFullDocumentOrStructure?: string | EditContext | {
      fullDocument: string,
      parsedSections: any[],
      elementId: string
    }  // NEW: Support structured context with ID and parsed sections
  ) => {
    console.log(`🚀 Starting AI operation: ${operation}`)
    console.log(`📊 Context type: ${typeof contextOrFullDocumentOrStructure} (${contextOrFullDocumentOrStructure ? 'provided' : 'none'})`)
    
    setOperationState({
      isProcessing: true,
      content: '',
      operation,
      error: null
    })

    try {
      // NEW: Determine request body format based on context type
      let requestBody: any = {
        operation,
        content
      }

      if (typeof contextOrFullDocumentOrStructure === 'object' && 
          contextOrFullDocumentOrStructure !== null &&
          'parsedSections' in contextOrFullDocumentOrStructure) {
        // NEW: ID-based mode - most reliable
        console.log('🎯 Using elementId + parsedSections for ID-based processing')
        requestBody.elementId = contextOrFullDocumentOrStructure.elementId
        requestBody.parsedSections = contextOrFullDocumentOrStructure.parsedSections
        requestBody.fullDocument = contextOrFullDocumentOrStructure.fullDocument // Also pass for fallback
      } else if (typeof contextOrFullDocumentOrStructure === 'string') {
        // LEGACY: fullDocument mode - text-based intelligent processing
        console.log('🧠 Using fullDocument for text-based intelligent processing')
        requestBody.fullDocument = contextOrFullDocumentOrStructure
      } else if (typeof contextOrFullDocumentOrStructure === 'object' && contextOrFullDocumentOrStructure !== null) {
        // LEGACY: editContext mode - contextual processing
        console.log('🎯 Using editContext for contextual processing')
        requestBody.editContext = contextOrFullDocumentOrStructure
      } else {
        // FALLBACK: basic mode
        console.log('⚡ Using basic processing mode')
        requestBody.context = undefined
      }

      const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
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
                console.log(`📋 Context info:`, data.contextInfo || 'No context info')
                
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