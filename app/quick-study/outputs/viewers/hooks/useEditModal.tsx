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
}

export function useEditModal() {
  const [editModal, setEditModal] = useState<EditModalState | null>(null)

  const openEditModal = useCallback((
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement
  ) => {
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
          el.removeAttribute('data-section-id')
        }
      })
      
      // Remove cursor pointer from all elements
      const allElements = [cleanedPreview, ...Array.from(cleanedPreview.querySelectorAll('*'))]
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.classList.remove('cursor-pointer')
          el.classList.add('cursor-default')
          el.style.pointerEvents = 'none'
        }
      })
      
      // Special cleanup for sections
      if (elementType.startsWith('complete-section')) {
        // Remove only buttons, not the entire container
        const buttons = cleanedPreview.querySelectorAll('button')
        buttons.forEach(button => button.remove())
        
        // Remove spacer divs
        const spacers = cleanedPreview.querySelectorAll('div.w-6.h-6.shrink-0')
        spacers.forEach(spacer => spacer.remove())
        
        // Ensure all section content is visible (expand collapsed sections)
        const sectionContents = cleanedPreview.querySelectorAll('.section-content')
        sectionContents.forEach(content => {
          content.style.display = 'block'
          content.style.visibility = 'visible'
        })
        
        // Clean up interactive styling from all headings in the section
        const headings = cleanedPreview.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headings.forEach(heading => {
          heading.classList.remove('cursor-pointer', 'hover:text-primary')
          heading.classList.add('cursor-default')
          
          const hoverClasses = ['hover:bg-blue-50', 'dark:hover:bg-blue-900/20']
          hoverClasses.forEach(cls => heading.classList.remove(cls))
        })
      }
      
      // For content elements, remove hover effects
      if (!elementType.startsWith('complete-section')) {
        const allElements = [cleanedPreview, ...Array.from(cleanedPreview.querySelectorAll('*'))]
        allElements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.classList.remove('cursor-pointer')
            el.classList.add('cursor-default')
          }
        })
      }
    }

    setEditModal({
      isOpen: true,
      content,
      originalContent: content,
      elementType,
      sourceElement,
      clickPosition,
      visualPreview: cleanedPreview
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
        sourceElement: editModal.sourceElement
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