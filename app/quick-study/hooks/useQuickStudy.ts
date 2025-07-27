"use client"

import { useState, useCallback, useEffect } from 'react'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string; // Extracted content for AI processing
  wordCount?: number;
  processingError?: string;
  subtype?: string;
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'timeline' | 'knowledge-map';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
  content?: string;
  noteType?: string; // Add note type tracking
}

interface Session {
  id: string;
  sources: Source[];
  outputs: Output[];
  createdAt: string;
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type PlaygroundContent = 'flashcards' | 'quiz' | 'notes' | 'summary' | 'timeline' | 'knowledge-map' | 'chat' | null;

export function useQuickStudy() {
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Core state
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [sourceConversations, setSourceConversations] = useState<Record<string, Message[]>>({})
  // UI state
  const [curtainVisible, setCurtainVisible] = useState(true)
  const [playgroundContent, setPlaygroundContent] = useState<PlaygroundContent>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentOutput, setCurrentOutput] = useState<Output | null>(null)
  
// Loading states
const [uploadInProgress, setUploadInProgress] = useState(false)
const [fetchingSources, setFetchingSources] = useState(false)
const [error, setError] = useState<string | null>(null)
const [initializing, setInitializing] = useState(true)
const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set())
  
  // Initialize session on mount
  useEffect(() => {
    initializeSession()
  }, [])

  // Poll for source status updates when there are processing sources
// Poll for source and output status updates
const pollStatus = useCallback(async () => {
  if (!sessionId) return
  
  try {
    const response = await fetch(`/api/quick-study/sessions/${sessionId}`)
    if (response.ok) {
      const session: Session = await response.json()
      
      // Update sources if any status changed
      setSources(prevSources => {
        const hasChanges = prevSources.some(prevSource => {
          const newSource = session.sources.find(s => s.id === prevSource.id)
          return newSource && newSource.status !== prevSource.status
        })
        
        if (hasChanges) {
          console.log('📊 Source status updated via polling')
          
          // Auto-select first ready source if current selection is still processing
          if (selectedSource && selectedSource.status === 'processing') {
            const updatedSelected = session.sources.find(s => s.id === selectedSource.id)
            if (updatedSelected && updatedSelected.status === 'ready') {
              setSelectedSource(updatedSelected)
            }
          } else {
            // Auto-select any newly ready source for better UX
            const newlyReadySources = session.sources.filter(s => {
              const prevSource = prevSources.find(prev => prev.id === s.id)
              return s.status === 'ready' && prevSource && prevSource.status === 'processing'
            })
            
            if (newlyReadySources.length > 0) {
              // Select the first newly ready source
              setSelectedSource(newlyReadySources[0])
              console.log(`🎯 Auto-selected newly ready source: ${newlyReadySources[0].name}`)
            }
          }
          
          return session.sources
        }
        
        return prevSources
      })
      
// Update outputs - handle replacement of temporary outputs with server outputs
setOutputs(prevOutputs => {
  let hasChanges = false
  let newOutputs = [...prevOutputs]
  
  // Check for new server outputs that should replace temporary ones
  session.outputs.forEach(serverOutput => {
    const existingIndex = newOutputs.findIndex(output => output.id === serverOutput.id)
    
    if (existingIndex === -1) {
      // This is a completely new server output
      // Check if it should replace a temporary output
      const tempIndex = newOutputs.findIndex(output => 
        output.id.startsWith('temp-') &&
        output.sourceId === serverOutput.sourceId &&
        output.type === serverOutput.type &&
        output.status === 'generating'
      )
      
      if (tempIndex !== -1) {
        // Replace temporary output with server output
        const tempOutput = newOutputs[tempIndex]
        newOutputs[tempIndex] = serverOutput
        hasChanges = true
        
        // Update current output if it was the temp one
        if (currentOutput && currentOutput.id === tempOutput.id) {
          setCurrentOutput(serverOutput)
          console.log(`🔄 Replaced temporary output ${tempOutput.id} with server output: ${serverOutput.id}`)
        }
      } else {
        // Add new server output
        newOutputs.push(serverOutput)
        hasChanges = true
        console.log(`📊 Added new server output: ${serverOutput.id}`)
      }
    } else {
      // Update existing output if status changed
      const existingOutput = newOutputs[existingIndex]
      if (existingOutput.status !== serverOutput.status) {
        newOutputs[existingIndex] = serverOutput
        hasChanges = true
        
        // Update current output if it's the one that changed
        if (currentOutput && currentOutput.id === serverOutput.id) {
          setCurrentOutput(serverOutput)
          console.log(`🔄 Updated output status: ${serverOutput.id} -> ${serverOutput.status}`)
        }
      }
    }
  })
  
  // Remove temporary outputs that have been generating for too long (fallback cleanup)
  const now = new Date().getTime()
  const cleanedOutputs = newOutputs.filter(output => {
    if (output.id.startsWith('temp-') && output.status === 'generating') {
      const age = now - new Date(output.createdAt).getTime()
      if (age > 30000) { // 30 seconds timeout
        console.log(`🧹 Cleaning up old temporary output: ${output.id}`)
        hasChanges = true
        return false
      }
    }
    return true
  })
  
  if (hasChanges) {
    console.log('📊 Output status updated via polling')
    return cleanedOutputs
  }
  
  return prevOutputs
})
    }
  } catch (err) {
    console.error('Polling error:', err)
  }
}, [sessionId, selectedSource, currentOutput])

// Start/stop polling based on processing sources or generating outputs
useEffect(() => {
  const hasProcessingSources = sources.some(source => source.status === 'processing')
  const hasGeneratingOutputs = outputs.some(output => output.status === 'generating')
  const hasActiveGenerations = activeGenerations.size > 0
  const needsPolling = hasProcessingSources || hasGeneratingOutputs || hasActiveGenerations
  
  if (needsPolling && !pollingInterval) {
    // Start polling every 500ms
    const interval = setInterval(pollStatus, 500)
    setPollingInterval(interval)
    console.log('🔄 Started polling for status updates')
  } else if (!needsPolling && pollingInterval) {
    // Stop polling when nothing is processing
    clearInterval(pollingInterval)
    setPollingInterval(null)
    console.log('⏹️ Stopped polling - all items ready')
  }
  
  // Cleanup on unmount
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
  }
}, [sources, outputs, pollingInterval, pollStatus])

  // Initialize session - try to restore or create new
  const initializeSession = useCallback(async () => {
    setInitializing(true)
    setError(null)
    
    try {
      // Try to restore existing session from localStorage
      const storedSessionId = localStorage.getItem('quickStudySessionId')
      
      if (storedSessionId) {
        // Try to restore session
        const restored = await restoreSession(storedSessionId)
        if (restored) {
          return // Successfully restored
        }
      }
      
      // Create new session if restore failed or no stored session
      await createNewSession()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session')
    } finally {
      setInitializing(false)
    }
  }, [])

  // Create new session
  const createNewSession = useCallback(async () => {
    try {
      const response = await fetch('/api/quick-study/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to create session')
      }
      
      const { sessionId: newSessionId } = await response.json()
      
      setSessionId(newSessionId)
      localStorage.setItem('quickStudySessionId', newSessionId)
      
      // Reset state for new session
      setSources([])
      setOutputs([])
      setSelectedSource(null)
      setCurtainVisible(true)
      setPlaygroundContent(null)
      setCurrentOutput(null)
      
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create session')
    }
  }, [])

  // Restore session
  const restoreSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log(`🔄 Attempting to restore session: ${id}`)
      
      const response = await fetch(`/api/quick-study/sessions/${id}`)
      
      if (!response.ok) {
        console.log('❌ Session not found or expired')
        localStorage.removeItem('quickStudySessionId')
        return false
      }
      
      const session: Session = await response.json()
      
      // Restore state
      setSessionId(id)
      setSources(session.sources)
      setOutputs(session.outputs)
      
      // Auto-select first ready source if any
      const readySources = session.sources.filter(s => s.status === 'ready')
      if (readySources.length > 0) {
        setSelectedSource(readySources[0])
      }
      
      console.log(`✅ Session restored with ${session.sources.length} sources, ${session.outputs.length} outputs`)
      
      return true
      
    } catch (err) {
      console.error('❌ Failed to restore session:', err)
      localStorage.removeItem('quickStudySessionId')
      return false
    }
  }, [])

  // Handler - file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!sessionId) {
      setError('No active session')
      return
    }
    
    if (files.length === 0) return
    
    setUploadInProgress(true)
    setError(null)
    
    try {
      const formData = new FormData()
      
      files.forEach(file => {
        formData.append('files', file)
      })
      

const response = await fetch(`/api/quick-study/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }
      
      const newSources: Source[] = await response.json()
      
      setSources(prev => [...prev, ...newSources])
      
// Auto-select first uploaded source (improve UX by always selecting newly uploaded files)
if (newSources.length > 0) {
  const firstReady = newSources.find(s => s.status === 'ready')
  if (firstReady) {
    setSelectedSource(firstReady)
    console.log(`🎯 Auto-selected uploaded ready file: ${firstReady.name}`)
  } else {
    // If no ready sources yet, select the first processing one (will auto-select when ready)
    setSelectedSource(newSources[0])
    console.log(`🔄 Auto-selected processing file: ${newSources[0].name} (will auto-update when ready)`)
  }
}
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadInProgress(false)
    }
  }, [sessionId, selectedSource])

  // Handler - text submission
  const handleTextSubmit = useCallback(async (text: string, title?: string) => {
    if (!sessionId) {
      setError('No active session')
      return
    }
    
    setUploadInProgress(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/quick-study/sessions/${sessionId}/add-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'text',
          content: text,
          title: title
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add text')
      }
      
      const newSource: Source = await response.json()
      setSources(prev => [...prev, newSource])
      
// Auto-select newly added text source for better UX
setSelectedSource(newSource)
console.log(`🎯 Auto-selected text source: ${newSource.name}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add text')
      throw err // Re-throw for modal handling
    } finally {
      setUploadInProgress(false)
    }
  }, [sessionId, selectedSource])

  // Handler - URL submission
  const handleUrlSubmit = useCallback(async (url: string, title?: string) => {
    if (!sessionId) {
      setError('No active session')
      return
    }
    
    setUploadInProgress(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/quick-study/sessions/${sessionId}/add-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'url',
          content: url,
          title: title
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add URL')
      }
      
      const newSource: Source = await response.json()
      setSources(prev => [...prev, newSource])
      
// Auto-select newly added URL source for better UX
setSelectedSource(newSource)
console.log(`🎯 Auto-selected URL source: ${newSource.name}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add URL')
      throw err // Re-throw for modal handling
    } finally {
      setUploadInProgress(false)
    }
  }, [sessionId, selectedSource])

  // FIXED - Handler - source selection (resetuje stan przy zmianie źródła)
  const handleSourceSelect = useCallback((source: Source) => {
    // Resetuj stan playground gdy przełączamy źródła
    setSelectedSource(source)
    setCurtainVisible(true)          // Pokaż kurtynę z wyborem metod
    setPlaygroundContent(null)       // Wyczyść aktualną metodę  
    setCurrentOutput(null)           // Wyczyść aktualny output
    setError(null)
  }, [])

// Handler - generate content (tile click) with options support
const handleTileClick = useCallback(async (type: string, options?: any) => {
  if (!sessionId || !selectedSource) {
    setError('No session or source selected')
    return
  }
  
  if (selectedSource.status !== 'ready') {
    setError('Source is not ready for processing')
    return
  }
  
  // Create unique generation key for tracking
  const generationKey = `${selectedSource.id}-${type}-${Date.now()}`
  
  setIsGenerating(true)
  setError(null)
  setCurtainVisible(false)
  setPlaygroundContent(type as PlaygroundContent)
  
  // Track this generation
  setActiveGenerations(prev => new Set([...prev, generationKey]))
  
const generateTitle = (type: string, sourceName: string, noteType?: string): string => {
  const cleanName = sourceName.replace(/\.[^/.]+$/, "")
  switch (type) {
    case 'flashcards': return `Flashcards - ${cleanName}`
    case 'quiz': return `Quiz - ${cleanName}`
    case 'notes': 
      if (noteType) {
        switch (noteType) {
          case 'key-points': return `Kluczowe punkty - ${cleanName}`
          case 'structured': return `Notatki strukturalne - ${cleanName}`
          case 'summary-table': return `Tabele i zestawienia - ${cleanName}`
          case 'general': 
          default: return `Notatki - ${cleanName}`
        }
      }
      return `Notes - ${cleanName}`
    case 'summary': return `Summary - ${cleanName}`
    case 'timeline': return `Timeline - ${cleanName}`
    case 'knowledge-map': return `Knowledge Map - ${cleanName}`
    default: return `${type} - ${cleanName}`
  }
}
  
const generatingOutput: Output = {
  id: `temp-${generationKey}`,
  type: type as Output['type'],
  title: generateTitle(type, selectedSource.name, options?.noteType),
  preview: 'Generating content...',
  status: 'generating',
  sourceId: selectedSource.id,
  createdAt: new Date(),
  noteType: options?.noteType // Track the requested note type
}
  
  // Add generating output immediately
  setOutputs(prev => [...prev, generatingOutput])
  setCurrentOutput(generatingOutput)
  
  console.log(`🔄 Created temporary generating output: ${generatingOutput.id}`)
  
  try {
    console.log(`🎯 Generating ${type} for source: ${selectedSource.id}`)
    
    const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceId: selectedSource.id,
        type: type,
        settings: options || {}
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Generation failed')
    }
    
    const newOutput: Output = await response.json()
    
    // Don't replace immediately - let polling handle it
    // This ensures the temporary output stays visible until server confirms
    console.log(`✅ Generated ${type}:`, newOutput.id)
    console.log(`🔄 Polling will replace temporary output ${generatingOutput.id}`)
    
  } catch (err) {
    // Remove temporary output on error
    setOutputs(prev => prev.filter(output => output.id !== generatingOutput.id))
    setCurrentOutput(null)
    setError(err instanceof Error ? err.message : 'Generation failed')
    setCurtainVisible(true)
  } finally {
    setIsGenerating(false)
    // Remove from active generations
    setActiveGenerations(prev => {
      const newSet = new Set(prev)
      newSet.delete(generationKey)
      return newSet
    })
  }
}, [sessionId, selectedSource])

  // Handler - output click
  const handleOutputClick = useCallback((output: Output) => {
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
    setCurrentOutput(output)
  }, [])

  // FIXED - Handler - show/hide curtain (resetuje stan przy otwieraniu)
  const handleShowCurtain = useCallback(() => {
    if (curtainVisible) {
      // Jeśli kurtyna już widoczna, po prostu ją zamknij
      setCurtainVisible(false)
    } else {
      // Jeśli kurtyna ukryta, pokaż ją i zresetuj stan contentu
      setCurtainVisible(true)
      setPlaygroundContent(null)
      setCurrentOutput(null)
    }
  }, [curtainVisible])

  // Handler - chat click
  const handleChatClick = useCallback(() => {
    setCurtainVisible(false)
    setPlaygroundContent('chat')
    setCurrentOutput(null)
  }, [])

  // NEW - Handler - reset do wyboru metod (zachowuje źródło)
  const handleResetToMethodSelection = useCallback(() => {
    setCurtainVisible(true)
    setPlaygroundContent(null)
    setCurrentOutput(null)
  }, [])

  // Handler - start new session
  const handleStartNewSession = useCallback(async () => {
    try {
      await createNewSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new session')
    }
  }, [createNewSession])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Refresh session data
  const refreshSession = useCallback(async () => {
    if (!sessionId) return
    
    setFetchingSources(true)
    try {
      const restored = await restoreSession(sessionId)
      if (!restored) {
        // Session expired, create new one
        await createNewSession()
      }
    } catch (err) {
      setError('Failed to refresh session')
    } finally {
      setFetchingSources(false)
    }
  }, [sessionId, restoreSession, createNewSession])

return {
    // Session state
    sessionId,
    initializing,
    
    // Core state
    sources,
    selectedSource,
    outputs,
    
    // Chat state
    sourceConversations,
    setSourceConversations,
    
    // UI state
    curtainVisible,
    playgroundContent,
    currentOutput,
    isGenerating,
    
    // Loading states
    uploadInProgress,
    fetchingSources,
    error,
    
    // Handlers
    handleSourceSelect,
    handleTileClick,
    handleOutputClick,
    handleShowCurtain,
    handleChatClick,
    handleFileUpload,
    handleTextSubmit,
    handleUrlSubmit,
    handleStartNewSession,
    refreshSession,
    clearError
  }
}

// Helper functions
function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('audio')) return 'audio'
  if (mimeType.includes('video')) return 'youtube'
  
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text'
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'docx'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) return 'image'
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav')) return 'audio'
  if (fileName.endsWith('.mp4') || fileName.endsWith('.mov')) return 'youtube'
  
  return 'text'
}

export type { Source, Output, PlaygroundContent, Session }