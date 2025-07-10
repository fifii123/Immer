"use client"

import { useState, useCallback, useEffect } from 'react'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
}

type PlaygroundContent = 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap' | 'chat' | null;

export function useQuickStudy() {
  // Core state - puste na początku, gotowe na backend
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  
  // UI state
  const [curtainVisible, setCurtainVisible] = useState(true)
  const [playgroundContent, setPlaygroundContent] = useState<PlaygroundContent>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Loading states
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [fetchingSources, setFetchingSources] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load sources on mount
  useEffect(() => {
    fetchSources()
  }, [])

  // Fetch sources from backend
  const fetchSources = useCallback(async () => {
    setFetchingSources(true)
    setError(null)
    
    try {
      const response = await fetch('/api/quick-study/sources', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch sources')
      }
      
      const sources = await response.json()
      setSources(sources)
      
      // Auto-select first source if none selected
      if (sources.length > 0 && !selectedSource) {
        setSelectedSource(sources[0])
      }

      // Fetch outputs for the selected source
      if (sources.length > 0) {
        await fetchOutputs(selectedSource?.id || sources[0].id)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sources')
      // Set empty arrays on error
      setSources([])
      setOutputs([])
    } finally {
      setFetchingSources(false)
    }
  }, [selectedSource])

  // Fetch outputs for a specific source
  const fetchOutputs = useCallback(async (sourceId: string) => {
    try {
      const response = await fetch(`/api/quick-study/outputs?sourceId=${sourceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (response.ok) {
        const outputs = await response.json()
        setOutputs(outputs)
      }
    } catch (err) {
      console.error('Failed to fetch outputs:', err)
      // Don't show error to user for outputs fetch failure
    }
  }, [])

  // Handler - file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    setUploadInProgress(true)
    setError(null)
    
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      const response = await fetch('/api/quick-study/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }
      
      const newSources = await response.json()
      setSources(prev => [...prev, ...newSources])
      
      // Auto-select first uploaded source if none selected
      if (newSources.length > 0 && !selectedSource) {
        setSelectedSource(newSources[0])
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadInProgress(false)
    }
  }, [selectedSource])

  // Handler - source selection
  const handleSourceSelect = useCallback((source: Source) => {
    setSelectedSource(source)
    setError(null)
    
    // Reset playground when switching sources
    if (playgroundContent) {
      setCurtainVisible(true)
      setPlaygroundContent(null)
    }

    // Fetch outputs for the selected source
    fetchOutputs(source.id)
  }, [playgroundContent, fetchOutputs])

  // Handler - generate content
  const handleTileClick = useCallback(async (type: string) => {
    if (!selectedSource || selectedSource.status !== 'ready') {
      setError('Please select a ready source first')
      return
    }
    
    setCurtainVisible(false)
    setPlaygroundContent(type as PlaygroundContent)
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/quick-study/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          sourceId: selectedSource.id,
          type: type,
          settings: {} // Additional generation settings
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Generation failed')
      }
      
      const newOutput = await response.json()
      setOutputs(prev => [...prev, newOutput])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setCurtainVisible(true) // Show curtain again on error
      setPlaygroundContent(null)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedSource])

  // Handler - view existing output
  const handleOutputClick = useCallback((output: Output) => {
    if (output.status !== 'ready') {
      setError('Content is still generating')
      return
    }
    
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
    setError(null)
  }, [])

  // Handler - show curtain
  const handleShowCurtain = useCallback(() => {
    setCurtainVisible(true)
    setPlaygroundContent(null)
    setError(null)
  }, [])

  // Handler - chat mode
  const handleChatClick = useCallback(() => {
    if (!selectedSource || selectedSource.status !== 'ready') {
      setError('Please select a ready source first')
      return
    }
    
    setCurtainVisible(false)
    setPlaygroundContent('chat')
    setError(null)
  }, [selectedSource])

  // Handler - delete source
  const handleDeleteSource = useCallback(async (sourceId: string) => {
    try {
      const response = await fetch(`/api/quick-study/sources/${sourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete source')
      }
      
      // Remove from state
      setSources(prev => prev.filter(s => s.id !== sourceId))
      setOutputs(prev => prev.filter(o => o.sourceId !== sourceId))
      
      // Clear selection if deleted source was selected
      if (selectedSource?.id === sourceId) {
        setSelectedSource(null)
        setCurtainVisible(true)
        setPlaygroundContent(null)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source')
    }
  }, [selectedSource])

  // Handler - delete output
  const handleDeleteOutput = useCallback(async (outputId: string) => {
    try {
      const response = await fetch(`/api/quick-study/outputs/${outputId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete output')
      }
      
      // Remove from state
      setOutputs(prev => prev.filter(o => o.id !== outputId))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete output')
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchSources()
    if (selectedSource) {
      await fetchOutputs(selectedSource.id)
    }
  }, [fetchSources, selectedSource, fetchOutputs])

  return {
    // State
    sources,
    selectedSource,
    curtainVisible,
    playgroundContent,
    outputs,
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
    handleDeleteSource,
    handleDeleteOutput,
    fetchSources,
    fetchOutputs,
    refreshData,
    clearError
  }
}

// Helper functions
function getFileType(file: File): Source['type'] {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  // Check by MIME type first
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('text')) return 'text'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('audio')) return 'audio'
  if (mimeType.includes('video')) return 'youtube' // Treat video files as youtube type
  
  // Check by file extension as fallback
  if (fileName.endsWith('.pdf')) return 'pdf'
  if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text'
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'docx'
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif')) return 'image'
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.m4a')) return 'audio'
  if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || fileName.endsWith('.mov')) return 'youtube'
  
  // Default fallback
  return 'text'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export type { Source, Output, PlaygroundContent }