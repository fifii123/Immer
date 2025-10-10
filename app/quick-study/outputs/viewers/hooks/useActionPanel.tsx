// app/quick-study/outputs/viewers/hooks/useActionPanel.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from "@/components/ui/use-toast"

export interface AIActionPanel {
  isVisible: boolean
  element: HTMLElement | null
  content: string
  elementType: string
  position: { x: number; y: number }
  detailLevel: number
}

interface UseActionPanelProps {
  isAnimating: boolean
  setIsAnimating: (value: boolean) => void
}

export function useActionPanel({ isAnimating, setIsAnimating }: UseActionPanelProps) {
  const { toast } = useToast()
  const [actionPanel, setActionPanel] = useState<AIActionPanel | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  // Handle Escape key - optimized
  useEffect(() => {
    if (!actionPanel) return
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActionPanel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [actionPanel?.isVisible])

  // Optimized element click handler with debouncing
  const handleElementClick = useCallback((event: React.MouseEvent<HTMLElement>, elementType: string) => {
    if (isAnimating) return
    
    event.preventDefault()
    event.stopPropagation()
    
    setIsAnimating(true)
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }
    
    const element = event.currentTarget
    const content = element.textContent || element.innerHTML || 'Brak zawartości'
    
    // Log to console (replacement for debug panel)
    console.group(`🎯 Element Clicked: ${elementType}`)
    console.log('Content:', content.trim())
    console.log('Element:', element)
    console.log('Length:', content.length, 'characters')
    console.log('Word count:', content.trim().split(/\s+/).length, 'words')
    console.groupEnd()
    
    // Wait for any ongoing animations to complete
    animationTimeoutRef.current = setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      setActionPanel({
        isVisible: true,
        element,
        content: content.trim(),
        elementType,
        position: {
          x: rect.left + scrollLeft + rect.width / 2,
          y: rect.top + scrollTop - 10
        },
        detailLevel: 3
      })
      
      setIsAnimating(false)
    }, 150) // Wait for animations to complete
  }, [isAnimating, setIsAnimating])

  const closeActionPanel = useCallback(() => {
    setActionPanel(null)
    setIsAnimating(false)
  }, [setIsAnimating])

  // Update detail level
  const updateDetailLevel = useCallback((level: number) => {
    if (!actionPanel) return
    
    setActionPanel(prev => prev ? {
      ...prev,
      detailLevel: level
    } : null)
  }, [actionPanel])

  // Optimized transformation handler
  const handleTransformation = useCallback((type: 'tldr' | 'paraphrase' | 'quiz' | 'expand' | 'simplify') => {
    if (!actionPanel) return
    
    console.group(`🔄 Transformation: ${type.toUpperCase()}`)
    console.log('Original content:', actionPanel.content)
    console.log('Detail level:', actionPanel.detailLevel)
    console.log('Element type:', actionPanel.elementType)
    console.groupEnd()
    
    toast({
      title: `${type.toUpperCase()} Transformation`,
      description: `Processing ${actionPanel.elementType} content...`,
    })

    // Here you would implement the actual AI transformation logic
    // For now, just close the panel
    setTimeout(() => {
      closeActionPanel()
    }, 1000)
  }, [actionPanel, toast, closeActionPanel])

  return {
    actionPanel,
    handleElementClick,
    closeActionPanel,
    updateDetailLevel,
    handleTransformation
  }
}