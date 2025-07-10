"use client"

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'

// Types - podobnie jak w PDF Reader
interface Source {
  id: string
  name: string
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio'
  status: 'processing' | 'ready' | 'error'
  size?: string
  duration?: string
  pages?: number
  content?: string
}

interface Output {
  id: string
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap'
  title: string
  preview: string
  status: 'generating' | 'ready' | 'error'
  sourceId: string
  createdAt: string
  content: any
  count?: number
}

type PlaygroundContent = Output['type'] | 'chat' | null

export function useQuickStudy() {
  const { toast } = useToast()
  
  // Core state - podobnie jak w useNotes
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  
  // UI state
  const [curtainVisible, setCurtainVisible] = useState(true)
  const [playgroundContent, setPlaygroundContent] = useState<PlaygroundContent>(null)
  const [currentOutput, setCurrentOutput] = useState<Output | null>(null)
  
  // Loading states
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch user's sources on mount
  useEffect(() => {
    fetchSources()
  }, [])

  // API call - fetch sources
  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch('/api/quick-study/sources', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (response.ok) {
        const sources = await response.json()
        setSources(sources)
      }
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }, [])

  // Handler - source selection
  const handleSourceSelect = useCallback((source: Source) => {
    setSelectedSource(source)
    setCurtainVisible(true) // Show outputs panel when source selected
    setPlaygroundContent(null) // Clear playground
  }, [])

  // Handler - file upload
  const handleFileUpload = useCallback(async (files: File[]) => {
    setUploadInProgress(true)
    
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      // TODO: Jutro - uncomment this API call
      /*
      const response = await fetch('/api/quick-study/upload', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const newSources = await response.json()
      */
      
      // MOCK na dzisiaj - usunąć jutro
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate upload
      
      const newSources: Source[] = files.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: file.name,
        type: getFileType(file),
        status: 'ready',
        size: formatFileSize(file.size),
        content: null
      }))
      
      setSources(prev => [...prev, ...newSources])
      
      // Auto-select first uploaded source
      if (newSources.length > 0 && !selectedSource) {
        setSelectedSource(newSources[0])
      }
      
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`
      })
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setUploadInProgress(false)
    }
  }, [selectedSource, toast])

  // Handler - method selection (generate new content)
  const handleMethodSelect = useCallback(async (method: string) => {
    if (!selectedSource) return
    
    setIsGenerating(true)
    setCurtainVisible(false)
    setPlaygroundContent(method as PlaygroundContent)
    
    try {
      // TODO: Jutro - uncomment this API call
      /*
      const response = await fetch('/api/quick-study/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          sourceId: selectedSource.id,
          method: method
        })
      })
      
      if (!response.ok) {
        throw new Error('Generation failed')
      }
      
      const newOutput = await response.json()
      */
      
      // MOCK na dzisiaj - usunąć jutro
      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate AI processing
      
      const newOutput: Output = {
        id: `output-${Date.now()}`,
        type: method as any,
        title: `${method.charAt(0).toUpperCase() + method.slice(1)} from ${selectedSource.name}`,
        preview: `Generated ${method} content`,
        status: 'ready',
        sourceId: selectedSource.id,
        createdAt: new Date().toISOString(),
        content: generateMockContent(method),
        count: getContentCount(method)
      }
      
      setOutputs(prev => [...prev, newOutput])
      setCurrentOutput(newOutput)
      
      toast({
        title: "Content generated",
        description: `${method} created successfully`
      })
      
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }, [selectedSource, toast])

  // Handler - show outputs panel
  const handleShowOutputs = useCallback(() => {
    setCurtainVisible(true)
    setPlaygroundContent(null)
    setCurrentOutput(null)
  }, [])

  // Handler - chat click
  const handleChatClick = useCallback(() => {
    setCurtainVisible(false)
    setPlaygroundContent('chat')
    setCurrentOutput(null)
  }, [])

  // Handler - output click (view existing output)
  const handleOutputClick = useCallback((output: Output) => {
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
    setCurrentOutput(output)
  }, [])

  return {
    // State
    sources,
    selectedSource,
    outputs,
    playgroundContent,
    currentOutput,
    curtainVisible,
    isGenerating,
    uploadInProgress,
    
    // Handlers
    handleSourceSelect,
    handleFileUpload,
    handleMethodSelect,
    handleShowOutputs,
    handleChatClick,
    handleOutputClick,
    
    // Utils
    fetchSources
  }
}

// Helper functions - TODO: move to utils file later
function getFileType(file: File): Source['type'] {
  if (file.type.includes('pdf')) return 'pdf'
  if (file.type.includes('text')) return 'text'
  if (file.type.includes('word')) return 'docx'
  if (file.type.includes('image')) return 'image'
  if (file.type.includes('audio')) return 'audio'
  return 'text'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// TODO: Jutro - usunąć mock functions
function generateMockContent(method: string) {
  const mockContents = {
    flashcards: [
      { front: "What is machine learning?", back: "A subset of AI that learns from data" },
      { front: "Define neural network", back: "Computing system inspired by biological neural networks" },
      { front: "What is supervised learning?", back: "Learning with labeled training data" }
    ],
    quiz: [
      { 
        question: "What is the main goal of machine learning?", 
        options: ["To replace humans", "To learn patterns from data", "To create robots", "To store data"], 
        correct: 1,
        explanation: "Machine learning aims to identify patterns in data to make predictions or decisions."
      },
      { 
        question: "Which of these is a supervised learning algorithm?", 
        options: ["K-means", "Linear Regression", "PCA", "DBSCAN"], 
        correct: 1,
        explanation: "Linear regression uses labeled data to learn the relationship between input and output."
      }
    ],
    notes: {
      sections: [
        { 
          title: "Introduction to Machine Learning", 
          content: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed."
        },
        { 
          title: "Types of Machine Learning", 
          content: "There are three main types: supervised learning (with labeled data), unsupervised learning (without labels), and reinforcement learning (learning through rewards)."
        },
        { 
          title: "Key Algorithms", 
          content: "Popular algorithms include linear regression, decision trees, neural networks, and support vector machines."
        }
      ]
    },
    summary: "Machine learning enables computers to learn from data without explicit programming. Main types include supervised, unsupervised, and reinforcement learning. Key applications span from image recognition to natural language processing.",
    concepts: [
      { term: "Algorithm", definition: "A set of rules or instructions for solving a problem" },
      { term: "Training Data", definition: "Dataset used to teach the machine learning model" },
      { term: "Feature", definition: "Individual measurable properties of observed phenomena" },
      { term: "Model", definition: "Mathematical representation of a real-world process" }
    ],
    mindmap: {
      central: "Machine Learning",
      branches: [
        { 
          name: "Supervised Learning", 
          children: ["Classification", "Regression", "Decision Trees", "Neural Networks"] 
        },
        { 
          name: "Unsupervised Learning", 
          children: ["Clustering", "Dimensionality Reduction", "Association Rules"] 
        },
        { 
          name: "Reinforcement Learning", 
          children: ["Q-Learning", "Policy Gradient", "Actor-Critic"] 
        }
      ]
    }
  }
  
  return mockContents[method as keyof typeof mockContents] || {}
}

function getContentCount(method: string): number {
  const counts = {
    flashcards: 15,
    quiz: 10,
    notes: 3,
    summary: 1,
    concepts: 12,
    mindmap: 1
  }
  return counts[method as keyof typeof counts] || 1
}