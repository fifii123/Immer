// app/quick-study/outputs/viewers/hooks/useEditModal.ts
import { useState, useCallback } from 'react'

export interface EditModalState {
  isOpen: boolean
  content: string
  originalContent: string
  elementType: string
  sourceElement: HTMLElement | null
  clickPosition: { x: number; y: number } | null
  visualPreview?: HTMLElement | null
  elementId: string | null  // Add element ID
}

export function useEditModal() {
  const [editModal, setEditModal] = useState<EditModalState | null>(null)

  const openEditModal = useCallback((
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement,
    elementId?: string  // Add element ID parameter
  ) => {
    console.log(`🎯 useEditModal: Opening modal for element: ${elementId}`)
    
    // Create a clean visual preview if provided
    let cleanedPreview: HTMLElement | undefined = undefined
    
    if (visualPreview) {
      cleanedPreview = visualPreview.cloneNode(true) as HTMLElement
      
      // Clean up the preview element
      cleanedPreview.style.pointerEvents = 'none'
      cleanedPreview.style.userSelect = 'none'
      cleanedPreview.removeAttribute('onclick')
      cleanedPreview.removeAttribute('onmouseenter')
      cleanedPreview.removeAttribute('onmouseleave')
      cleanedPreview.removeAttribute('data-content')
      cleanedPreview.removeAttribute('data-element-type')
      cleanedPreview.removeAttribute('data-section-id')
      
      // Remove interactive elements more thoroughly
      const interactiveElements = cleanedPreview.querySelectorAll('button, [onclick], [onmouseenter], [onmouseleave], [data-content], [data-element-type]')
      interactiveElements.forEach(el => {
        if (el.tagName.toLowerCase() === 'button') {
          el.remove()
        } else {
          el.removeAttribute('onclick')
          el.removeAttribute('onmouseenter') 
          el.removeAttribute('onmouseleave')
          el.removeAttribute('data-content')
          el.removeAttribute('data-element-type')
        }
      })
    }

    setEditModal({
      isOpen: true,
      content,
      originalContent: content,
      elementType,
      sourceElement,
      clickPosition,
      visualPreview: cleanedPreview || null,
      elementId: elementId || null  // Store the ID
    })
  }, [])

  const closeEditModal = useCallback(() => {
    setEditModal(null)
  }, [])

  const updateContent = useCallback((newContent: string) => {
    setEditModal(prev => prev ? { ...prev, content: newContent } : null)
  }, [])

  const saveChanges = useCallback(() => {
    if (editModal) {
      // Here you would typically update the actual content in your data store
      // For now, we'll just log it
      console.log('Saving changes:', {
        content: editModal.content,
        elementType: editModal.elementType,
        sourceElement: editModal.sourceElement,
        elementId: editModal.elementId  // Log the element ID
      })
      
      // You could emit an event or call a callback to update the content
      // Example: updateNotesContent(editModal.sourceElement, editModal.content)
      
      closeEditModal()
    }
  }, [editModal, closeEditModal])

  const resetContent = useCallback(() => {
    setEditModal(prev => prev ? { ...prev, content: prev.originalContent } : null)
  }, [])

  const hasChanges = useCallback(() => {
    return editModal ? editModal.content !== editModal.originalContent : false
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