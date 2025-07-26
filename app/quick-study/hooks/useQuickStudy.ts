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

type PlaygroundContent = 'flashcards' | 'quiz' | 'notes' | 'summary' | 'timeline' | 'knowledge-map' | 'chat' | null;

export function useQuickStudy() {
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Core state
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  
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
  
  // Initialize session on mount
  useEffect(() => {
    initializeSession()
  }, [])

  // Poll for source status updates when there are processing sources
  const pollSourceStatus = useCallback(async () => {
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
            }
            
            return session.sources
          }
          
          return prevSources
        })
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, [sessionId, selectedSource])

  // Start/stop polling based on processing sources
  useEffect(() => {
    const hasProcessingSources = sources.some(source => source.status === 'processing')
    
    if (hasProcessingSources && !pollingInterval) {
      // Start polling every 500ms
      const interval = setInterval(pollSourceStatus, 500)
      setPollingInterval(interval)
      console.log('🔄 Started polling for source updates')
    } else if (!hasProcessingSources && pollingInterval) {
      // Stop polling when no processing sources
      clearInterval(pollingInterval)
      setPollingInterval(null)
      console.log('⏹️ Stopped polling - all sources ready')
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [sources, pollingInterval, pollSourceStatus])

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
      
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create session')
    }
  }, [])

  // Restore existing session
  const restoreSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/quick-study/sessions/${sessionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Session expired/not found, create new one
          localStorage.removeItem('quickStudySessionId')
          return false
        }
        throw new Error('Failed to restore session')
      }
      
      const session: Session = await response.json()
      
      // Restore state from session
      setSessionId(session.id)
      setSources(session.sources)
      setOutputs(session.outputs)
      
      // Auto-select first ready source
      const readySources = session.sources.filter(s => s.status === 'ready')
      if (readySources.length > 0) {
        setSelectedSource(readySources[0])
      }
      
      return true
      
    } catch (err) {
      console.error('Failed to restore session:', err)
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
    
    setUploadInProgress(true)
    setError(null)
    
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
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
      
      // Auto-select first uploaded source if none selected
      if (newSources.length > 0 && !selectedSource) {
        // Find first source that's ready or will be ready
        const sourceToSelect = newSources.find(s => s.status === 'ready') || newSources[0]
        setSelectedSource(sourceToSelect)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      // FIXED: Simply set uploadInProgress to false since API now waits for processing completion
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
      
      // Auto-select if none selected
      if (!selectedSource) {
        setSelectedSource(newSource)
      }
      
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
      
      // Auto-select if none selected
      if (!selectedSource) {
        setSelectedSource(newSource)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add URL')
      throw err // Re-throw for modal handling
    } finally {
      setUploadInProgress(false)
    }
  }, [sessionId, selectedSource])

  // Handler - source selection
  const handleSourceSelect = useCallback((source: Source) => {
    setSelectedSource(source)
    setError(null)
  }, [])

  // Handler - generate content (tile click) with options support
  const handleTileClick = useCallback(async (type: string, options?: any) => {
    console.log("🔍 DEBUG: useQuickStudy received type:", type);
    console.log("🔍 DEBUG: useQuickStudy received options:", options);
    
    if (!sessionId) {
      setError('No active session')
      return
    }
    
    if (!selectedSource || selectedSource.status !== 'ready') {
      setError('Please select a ready source first')
      return
    }
    
    setCurtainVisible(false)
    setPlaygroundContent(type as PlaygroundContent)
    setCurrentOutput(null)
    setIsGenerating(true)
    setError(null)
    
    try {
      // Prepare settings based on content type and options
      let settings = {}
      
      if (type === 'quiz') {
        settings = {
          questionCount: options?.questionCount || 10,
          difficulty: options?.difficulty || 'mixed',
          timeLimit: options?.timeLimit || 20 // minutes
        }
      } else if (type === 'flashcards') {
        settings = {
          cardCount: options?.cardCount || 20,
          difficulty: options?.difficulty || 'mixed',
          includeCategories: options?.includeCategories !== false
        }
      } else if (type === 'notes') {
        settings = {
          noteType: options?.noteType || 'general'
        }
      } else if (type === 'timeline') {
        settings = {
          maxEvents: options?.maxEvents || 8
        }
      } else if (type === 'knowledge-map') {
        settings = {
          maxNodes: options?.maxNodes || 15,
          includeConnections: options?.includeConnections !== false
        }
      }
      
      console.log("🔍 DEBUG: Final settings before API call:", settings);
      
      const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceId: selectedSource.id,
          settings: settings
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Generation failed')
      }
      
      const newOutput: Output = await response.json()
      
      // Add note type to output if it was notes generation
      if (type === 'notes' && options?.noteType) {
        newOutput.noteType = options.noteType
      }
      
      setOutputs(prev => [...prev, newOutput])
      setCurrentOutput(newOutput)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setCurtainVisible(true)
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, selectedSource])

  // Handler - output click
  const handleOutputClick = useCallback((output: Output) => {
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
    setCurrentOutput(output)
  }, [])

  // Handler - show/hide curtain
  const handleShowCurtain = useCallback(() => {
    setCurtainVisible(!curtainVisible)
  }, [curtainVisible])

  // Handler - chat click
  const handleChatClick = useCallback(() => {
    setCurtainVisible(false)
    setPlaygroundContent('chat')
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
    curtainVisible,
    playgroundContent,
    outputs,
    currentOutput,
    isGenerating,
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