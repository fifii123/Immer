// app/quick-study/outputs/viewers/hooks/useNotesHover.ts
import { useCallback, useRef } from 'react'

export interface HoverState {
  isAnimating: boolean
  lastHoveredRef: React.MutableRefObject<string | null>
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

export interface HoverHandlers {
  createHoverHandler: (elementType: string, color: string) => {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void
    onClick: (e: React.MouseEvent<HTMLElement>) => void
  }
  applySectionHoverStyles: (event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => void
  clearSectionHoverStyles: (event: React.MouseEvent<HTMLElement>) => void
}

interface UseNotesHoverProps {
  isAnimating: boolean
  onElementClick: (event: React.MouseEvent<HTMLElement>, elementType: string, customContent?: string) => void
}

export function useNotesHover({ isAnimating, onElementClick }: UseNotesHoverProps): HoverHandlers {
  // Refs for performance
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredRef = useRef<string | null>(null)

  // Optimized hover handler for markdown elements
  const createHoverHandler = useCallback((elementType: string, color: string) => {
    return {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        if (isAnimating) return
        
        const intensity = 0.06
        const element = e.currentTarget
        Object.assign(element.style, {
          backgroundColor: `rgba(${color}, ${intensity})`,
          borderLeft: `3px solid rgba(${color}, ${intensity * 4})`,
          borderRadius: '6px',
          padding: '8px 12px',
          margin: '4px -12px',
          transition: 'all 0.15s ease-in-out'
        })
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        const element = e.currentTarget
        Object.assign(element.style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          transition: 'all 0.15s ease-in-out'
        })
        
        setTimeout(() => {
          if (element.style.transition) {
            element.style.transition = ''
          }
        }, 150)
      },
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        onElementClick(e, elementType)
      }
    }
  }, [onElementClick, isAnimating])

// Poprawione hover handlery - bez race conditions
const applySectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => {
  if (isAnimating) return
  
  const sectionContainer = event.currentTarget.closest('.section-container') as HTMLElement
  if (!sectionContainer) return

  // KLUCZOWE: Wyczyść poprzedni timeout I poprzedni highlight
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = null
  }

  // Jeśli poprzedni element był highlighted, wyczyść go natychmiast
  if (lastHoveredRef.current && lastHoveredRef.current !== sectionId) {
    const prevElement = document.querySelector(`[data-section-id="${lastHoveredRef.current}"]`)
    const prevContainer = prevElement?.closest('.section-container') as HTMLElement
    if (prevContainer) {
      Object.assign(prevContainer.style, {
        backgroundColor: '',
        borderLeft: '',
        borderRadius: '',
        padding: '',
        margin: '',
        boxShadow: '',
        transition: ''
      })
    }
  }

  // Apply hover styles do kontenera
  Object.assign(sectionContainer.style, {
    backgroundColor: `rgba(59, 130, 246, 0.08)`,
    borderLeft: `3px solid rgba(59, 130, 246, 0.3)`,
    borderRadius: '8px',
    padding: '8px 12px',
    margin: '4px -12px',
    transition: 'all 0.15s ease-in-out',
    boxShadow: `0 1px 3px rgba(59, 130, 246, 0.1)`
  })

  lastHoveredRef.current = sectionId
}, [isAnimating])

const clearSectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>) => {
  // Sprawdź czy mysz rzeczywiście opuściła tytuł
  const relatedTarget = event.relatedTarget as Node
  const titleElement = event.currentTarget
  
  if (relatedTarget && titleElement.contains(relatedTarget)) {
    return
  }
  
  const sectionContainer = titleElement.closest('.section-container') as HTMLElement
  if (!sectionContainer) return
  
  const currentSectionId = titleElement.getAttribute('data-section-id')
  
  // Wyczyść poprzedni timeout
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current)
  }
  
  // Dodaj timeout z cleanup check
  hoverTimeoutRef.current = setTimeout(() => {
    // Double-check że nadal powinniśmy czyścić ten element
    if (lastHoveredRef.current === currentSectionId) {
      lastHoveredRef.current = null
      
      // Clear all hover styles
      Object.assign(sectionContainer.style, {
        backgroundColor: '',
        borderLeft: '',
        borderRadius: '',
        padding: '',
        margin: '',
        boxShadow: '',
        transition: 'all 0.15s ease-in-out'
      })
      
      setTimeout(() => {
        if (sectionContainer.style.transition) {
          sectionContainer.style.transition = ''
        }
      }, 150)
    }
    hoverTimeoutRef.current = null
  }, 50)
}, [])



  return {
    createHoverHandler,
    applySectionHoverStyles,
    clearSectionHoverStyles
  }
}