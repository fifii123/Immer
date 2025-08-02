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
  contextOrDOMContext?: string | EditContext | {
    domInfo: {
      domElementId: string,
      structuralId: string,
      elementType: string,
      content: string
    } | null,
    parsedSections: any[],
    fullDocument: string,
    useDOMFirst: boolean
  }
) => {
  console.log(`🚀 Starting AI operation: ${operation}`)
  console.log(`📊 Context type: ${typeof contextOrDOMContext} (${contextOrDOMContext ? 'provided' : 'none'})`)
  
  setOperationState({
    isProcessing: true,
    content: '',
    operation,
    error: null
  })

  try {
    // Determine request body format based on context type
    let requestBody: any = {
      operation,
      content
    }

    // NEW: DOM-first mode with frontend-prepared data
    if (typeof contextOrDOMContext === 'object' && 
        contextOrDOMContext !== null &&
        'useDOMFirst' in contextOrDOMContext) {
      
      console.log('🌟 Using DOM-first with frontend-prepared data')
      console.log('🎯 DOM Info being sent to API:', contextOrDOMContext.domInfo)
      
      requestBody.domInfo = contextOrDOMContext.domInfo
      requestBody.parsedSections = contextOrDOMContext.parsedSections
      requestBody.fullDocument = contextOrDOMContext.fullDocument
      requestBody.useDOMFirst = true
      
    } else if (typeof contextOrDOMContext === 'string') {
      // LEGACY: fullDocument mode - text-based intelligent processing
      console.log('🧠 Using fullDocument for text-based intelligent processing')
      requestBody.fullDocument = contextOrDOMContext
      
    } else if (typeof contextOrDOMContext === 'object' && contextOrDOMContext !== null) {
      // LEGACY: editContext mode - structured context
      console.log('📋 Using structured editContext')
      requestBody.editContext = contextOrDOMContext
      
    } else {
      // BASIC: No context
      console.log('⚡ Using basic processing (no context)')
    }

    const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              setOperationState(prev => ({
                ...prev,
                isProcessing: false,
                content: fullContent
              }))
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              
              // Handle new streaming format
              if (parsed.type === 'chunk' && parsed.content) {
                const deltaContent = parsed.content
                fullContent += deltaContent
                
                setOperationState(prev => ({
                  ...prev,
                  content: fullContent
                }))
              } else if (parsed.type === 'complete') {
                console.log(`✅ AI operation completed:`, {
                  operation: parsed.operation,
                  contextInfo: parsed.contextInfo,
                  contentLength: parsed.fullContent?.length
                })
                
                setOperationState(prev => ({
                  ...prev,
                  isProcessing: false,
                  content: parsed.fullContent || fullContent
                }))
                return
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'AI processing failed')
              }
              // LEGACY: Handle old format
              else if (parsed.choices?.[0]?.delta?.content) {
                const deltaContent = parsed.choices[0].delta.content
                fullContent += deltaContent
                
                setOperationState(prev => ({
                  ...prev,
                  content: fullContent
                }))
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    setOperationState(prev => ({
      ...prev,
      isProcessing: false,
      content: fullContent
    }))

  } catch (error) {
    console.error('AI operation failed:', error)
    setOperationState({
      isProcessing: false,
      content: '',
      operation: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    })
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