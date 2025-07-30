import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useEditModal } from '../hooks/useEditModal'
import { EditModalOverlay } from './EditModalOverlay'

interface EditModalProviderProps {
  children: (openEditModal: (
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement
  ) => void) => React.ReactNode
}

const useAutoScroll = () => {
  const debugElementsRef = useRef<HTMLElement[]>([])

  const addDebugStyles = () => {
    const styleId = 'scroll-debug-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .scroll-debug-element {
          position: fixed;
          height: 2px;
          left: 0;
          right: 0;
          z-index: 9999;
          pointer-events: none;
        }
        .scroll-debug-label {
          position: fixed;
          left: 10px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 2px 5px;
          font-family: monospace;
          font-size: 12px;
          z-index: 9999;
          pointer-events: none;
        }
      `
      document.head.appendChild(style)
    }
  }

  const createDebugElement = (position: number, color: string, label: string) => {
    addDebugStyles()

    const line = document.createElement('div')
    line.className = 'scroll-debug-element'
    line.style.top = `${position}px`
    line.style.backgroundColor = color
    document.body.appendChild(line)

    const labelEl = document.createElement('div')
    labelEl.className = 'scroll-debug-label'
    labelEl.style.top = `${position}px`
    labelEl.textContent = `${label}: ${position}px`
    labelEl.style.color = color
    document.body.appendChild(labelEl)

    debugElementsRef.current.push(line, labelEl)
  }

  const clearDebugElements = () => {
    debugElementsRef.current.forEach(el => el.remove())
    debugElementsRef.current = []
  }

  const findScrollableContainer = (element: HTMLElement): HTMLElement | null => {
    let current = element.parentElement
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current)
      const hasScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay'
      const isScrollable = current.scrollHeight > current.clientHeight
      
      if (hasScroll && isScrollable) {
        return current
      }
      current = current.parentElement
    }
    return null
  }

  const scrollToFitModal = useCallback((sourceElement: HTMLElement, modalElement: HTMLElement) => {
    clearDebugElements()

    const scrollContainer = findScrollableContainer(sourceElement)
    const containerScrollTop = scrollContainer?.scrollTop || 0
    const windowScrollTop = window.pageYOffset || 0
    const currentScrollTop = scrollContainer ? containerScrollTop : windowScrollTop
    
    const sourceRect = sourceElement.getBoundingClientRect()
    const modalRect = modalElement.getBoundingClientRect()

    // Oblicz pozycję modala względem dokumentu
    const modalTop = modalRect.top + window.scrollY
    const modalBottom = modalTop + modalRect.height

    // Oblicz granice widocznego obszaru
    const BUFFER = 20
    const viewportTop = window.scrollY + BUFFER
    const viewportBottom = window.scrollY + window.innerHeight - BUFFER

    // Debug - pokaż granice
    createDebugElement(viewportTop, 'red', 'Viewport Top')
    createDebugElement(viewportBottom, 'blue', 'Viewport Bottom')
    createDebugElement(modalTop, 'orange', 'Modal Top')
    createDebugElement(modalBottom, 'green', 'Modal Bottom')

    // Sprawdź, czy modal wymaga scrollowania
    const needsScroll = modalTop < viewportTop || modalBottom > viewportBottom
    
    if (!needsScroll) {
      return false
    }

    // Oblicz potrzebną korektę scrolla
    let scrollAdjustment = 0
    if (modalTop < viewportTop) {
      // Modal jest powyżej widocznego obszaru - scroll w górę
      scrollAdjustment = modalTop - viewportTop - BUFFER
    } else if (modalBottom > viewportBottom) {
      // Modal jest poniżej widocznego obszaru - scroll w dół
      scrollAdjustment = modalBottom - viewportBottom + BUFFER
    }

    // Oblicz nową pozycję scrolla
    const newScrollTop = currentScrollTop + scrollAdjustment

    // Ogranicz do prawidłowego zakresu
    const containerHeight = scrollContainer ? scrollContainer.clientHeight : window.innerHeight
    const scrollableHeight = scrollContainer ? scrollContainer.scrollHeight : document.documentElement.scrollHeight
    const maxScroll = scrollableHeight - containerHeight
    const finalScrollTop = Math.max(0, Math.min(newScrollTop, maxScroll))

    // Zastosuj scroll
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: finalScrollTop, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: finalScrollTop, behavior: 'smooth' })
    }

    return true
  }, [])

  return { scrollToFitModal, clearDebugElements }
}

export function EditModalProvider({ children }: EditModalProviderProps) {
  const {
    editModal,
    openEditModal: originalOpenEditModal,
    closeEditModal,
    updateContent,
    saveChanges,
    hasChanges,
    resetContent
  } = useEditModal()

  const { scrollToFitModal, clearDebugElements } = useAutoScroll()
  const [scrolling, setScrolling] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const openEditModalWithAutoScroll = useCallback((
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement
  ) => {
    // Tymczasowo otwórz modal, aby zmierzyć jego rozmiar
    const modalInstance = originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview)
    
    // Pobierz element DOM modala
    const modalElement = document.querySelector('[data-modal-container]') as HTMLElement
    
    if (!modalElement) {
      console.error('Element modala nie znaleziony, otwieram bez scrollowania')
      return
    }
    
    // Zamknij tymczasowy modal
    closeEditModal()
    
    // Oblicz potrzebny scroll
    const needsScroll = scrollToFitModal(sourceElement, modalElement)
    
    // Otwórz modal z odpowiednim opóźnieniem jeśli potrzebny jest scroll
    if (needsScroll) {
      setScrolling(true)
      setTimeout(() => {
        originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview)
        setScrolling(false)
      }, 300)
    } else {
      originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview)
    }
  }, [originalOpenEditModal, closeEditModal, scrollToFitModal])

  useEffect(() => {
    return () => {
      clearDebugElements()
    }
  }, [clearDebugElements])

  return (
    <>
      {children(openEditModalWithAutoScroll)}
      
      {editModal && editModal.isOpen && !scrolling && (
        <EditModalOverlay
          editModal={editModal}
          onClose={closeEditModal}
          onContentChange={updateContent}
          onSave={saveChanges}
          onReset={resetContent}
          hasChanges={hasChanges()}
        />
      )}
    </>
  )
}