"use client"

import { useState, useCallback } from 'react'

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
  // State management - dokładnie jak w oryginalnym page.tsx
  const [sources, setSources] = useState<Source[]>([
    { 
      id: '1', 
      name: 'Machine Learning Fundamentals', 
      type: 'pdf', 
      status: 'ready',
      size: '2.4 MB',
      pages: 42
    },
    { 
      id: '2', 
      name: 'Neural Networks Explained', 
      type: 'youtube', 
      status: 'ready',
      duration: '25 min'
    },
    { 
      id: '3', 
      name: 'Deep Learning Research Notes', 
      type: 'text', 
      status: 'processing',
      size: '156 KB'
    },
    { 
      id: '4', 
      name: 'Computer Vision Basics', 
      type: 'pdf', 
      status: 'ready',
      size: '1.8 MB',
      pages: 28
    },
    { 
      id: '5', 
      name: 'AI Ethics Lecture', 
      type: 'youtube', 
      status: 'ready',
      duration: '45 min'
    }
  ])
  
  const [selectedSource, setSelectedSource] = useState<Source | null>(sources[0])
  const [curtainVisible, setCurtainVisible] = useState(true)
  const [playgroundContent, setPlaygroundContent] = useState<PlaygroundContent>(null)
  const [outputs, setOutputs] = useState<Output[]>([
    {
      id: '1',
      type: 'flashcards',
      title: 'ML Fundamentals Cards',
      preview: '24 cards covering key concepts',
      status: 'ready',
      sourceId: '1',
      createdAt: new Date(),
      count: 24
    },
    {
      id: '2',
      type: 'quiz',
      title: 'Neural Networks Quiz',
      preview: '12 questions on deep learning',
      status: 'ready',
      sourceId: '2',
      createdAt: new Date(),
      count: 12
    },
    {
      id: '3',
      type: 'notes',
      title: 'AI Research Summary',
      preview: '5 sections with key insights',
      status: 'ready',
      sourceId: '3',
      createdAt: new Date(),
      count: 5
    },
    {
      id: '4',
      type: 'summary',
      title: 'Core Concepts Overview',
      preview: 'Essential points extracted',
      status: 'ready',
      sourceId: '1',
      createdAt: new Date(),
      count: 1
    },
    {
      id: '5',
      type: 'concepts',
      title: 'Key Definitions Map',
      preview: '18 important terms defined',
      status: 'ready',
      sourceId: '2',
      createdAt: new Date(),
      count: 18
    },
    {
      id: '6',
      type: 'mindmap',
      title: 'Learning Pathways',
      preview: 'Visual connection map',
      status: 'generating',
      sourceId: '3',
      createdAt: new Date(),
      count: 1
    },
    {
      id: '7',
      type: 'flashcards',
      title: 'Computer Vision Cards',
      preview: '16 cards on image processing',
      status: 'ready',
      sourceId: '4',
      createdAt: new Date(),
      count: 16
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  // Handlers - dokładnie jak w oryginalnym page.tsx
  const handleSourceSelect = useCallback((source: Source) => {
    setSelectedSource(source)
  }, [])

  const handleTileClick = useCallback((type: string) => {
    setCurtainVisible(false)
    setPlaygroundContent(type as PlaygroundContent)
    setIsGenerating(true)
    
    setTimeout(() => {
      setIsGenerating(false)
      const counts = {
        flashcards: Math.floor(Math.random() * 20) + 15,
        quiz: Math.floor(Math.random() * 10) + 8,
        notes: Math.floor(Math.random() * 5) + 3,
        summary: 1,
        concepts: Math.floor(Math.random() * 15) + 10,
        mindmap: 1
      }
      
      const newOutput: Output = {
        id: Date.now().toString(),
        type: type as any,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} from ${selectedSource?.name}`,
        preview: `${counts[type as keyof typeof counts]} ${type === 'summary' || type === 'mindmap' ? 'section' : 'items'} generated`,
        status: 'ready',
        sourceId: selectedSource?.id || '1',
        createdAt: new Date(),
        count: counts[type as keyof typeof counts]
      }
      setOutputs(prev => [...prev, newOutput])
    }, 3000)
  }, [selectedSource])

  const handleOutputClick = useCallback((output: Output) => {
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
  }, [])

  const handleShowCurtain = useCallback(() => {
    setCurtainVisible(true)
    setPlaygroundContent(null)
  }, [])

  const handleChatClick = useCallback(() => {
    setCurtainVisible(false)
    setPlaygroundContent('chat')
  }, [])

  return {
    // State
    sources,
    selectedSource,
    curtainVisible,
    playgroundContent,
    outputs,
    isGenerating,
    
    // Handlers
    handleSourceSelect,
    handleTileClick,
    handleOutputClick,
    handleShowCurtain,
    handleChatClick
  }
}

export type { Source, Output, PlaygroundContent }