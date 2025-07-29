// app/quick-study/outputs/viewers/hooks/useEditModal.tsx
import { useState, useCallback, useRef, useEffect } from 'react'

export interface EditModalState {
  isOpen: boolean
  content: string
  originalContent: string
  elementType: string
  position: { x: number; y: number }
  sourceElement: HTMLElement | null
}

interface UseEditModalReturn {
  editModal: EditModalState | null
  openEditModal: (
    content: string, 
    elementType: string, 
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number }
  ) => void
  closeEditModal: () => void
  updateContent: (content: string) => void
  saveChanges: () => void
  hasChanges: () => boolean
  resetContent: () => void
}

export function useEditModal(): UseEditModalReturn {
  const [editModal, setEditModal] = useState<EditModalState | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Handle Escape key
  useEffect(() => {
    if (!editModal?.isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditModal()
      }
      // Ctrl+S for save
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault()
        saveChanges()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [editModal?.isOpen])

  const openEditModal = useCallback((
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number }
  ) => {
    // Clean content - remove markdown and extra whitespace
    const cleanContent = content.replace(/[#*_`]/g, '').trim()
    
    console.group(`🖊️ Edit Modal Opening`)
    console.log('Content:', cleanContent)
    console.log('Element Type:', elementType)
    console.log('Position:', clickPosition)
    console.log('Source Element:', sourceElement)
    console.groupEnd()

    setEditModal({
      isOpen: true,
      content: cleanContent,
      originalContent: cleanContent,
      elementType,
      position: clickPosition,
      sourceElement
    })

    // Add visual feedback to source element
    sourceElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    sourceElement.style.transform = 'scale(1.02) translateZ(0)'
    sourceElement.style.opacity = '0.7'
    sourceElement.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.2)'
  }, [])

  const closeEditModal = useCallback(() => {
    if (!editModal) return

    // Restore source element
    if (editModal.sourceElement) {
      const el = editModal.sourceElement
      el.style.transform = 'scale(1) translateZ(0)'
      el.style.opacity = '1'
      el.style.boxShadow = 'none'
      
      // Clean up styles after animation
      animationTimeoutRef.current = setTimeout(() => {
        el.style.transition = ''
        el.style.transform = ''
        el.style.opacity = ''
        el.style.boxShadow = ''
      }, 300)
    }

    setEditModal(null)
  }, [editModal])

  const updateContent = useCallback((content: string) => {
    if (!editModal) return
    
    setEditModal(prev => prev ? {
      ...prev,
      content
    } : null)
  }, [editModal])

  const saveChanges = useCallback(() => {
    if (!editModal) return
    
    console.group(`💾 Saving Changes`)
    console.log('Original:', editModal.originalContent)
    console.log('New:', editModal.content)
    console.log('Element Type:', editModal.elementType)
    console.groupEnd()

    // TODO: Implement actual save logic here
    // For now, just close the modal
    closeEditModal()
  }, [editModal, closeEditModal])

  const hasChanges = useCallback(() => {
    if (!editModal) return false
    return editModal.content !== editModal.originalContent
  }, [editModal])

  const resetContent = useCallback(() => {
    if (!editModal) return
    
    setEditModal(prev => prev ? {
      ...prev,
      content: prev.originalContent
    } : null)
  }, [editModal])

  return {
    editModal,
    openEditModal,
    closeEditModal,
    updateContent,
    saveChanges,
    hasChanges,
    resetContent
  }
}