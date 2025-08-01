// app/quick-study/outputs/viewers/hooks/useNotesHover.tsx
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
  onElementClick: (event: React.MouseEvent<HTMLElement>, domData: {
    elementId: string | null
    content: string
    elementType: string
    clone: HTMLElement
  }) => void
}

export function useNotesHover({ isAnimating, onElementClick }: UseNotesHoverProps): HoverHandlers {
  // Refs for performance
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredRef = useRef<string | null>(null)
  
  // Refs dla śledzenia czasu na elemencie
  const hoverStartTimeRef = useRef<number | null>(null)
  const pencilCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentHoveredElementRef = useRef<HTMLElement | null>(null)

  // Funkcja do wyświetlania ikonki ołówka
  const showEditIcon = useCallback((container: HTMLElement, targetElement?: HTMLElement) => {
    // Użyj targetElement jeśli podany, inaczej container
    const elementToMark = targetElement || container
    
    // Sprawdź czy ikonka już istnieje na tym konkretnym elemencie
    if (elementToMark.querySelector('.edit-pencil-icon')) return

    // Stwórz element ikonki
    const pencilIcon = document.createElement('div')
    pencilIcon.className = 'edit-pencil-icon'
    pencilIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>
    `
    
    // Styling ikonki - pozycjonowanie poza kontenerem z lewej strony
    Object.assign(pencilIcon.style, {
      position: 'absolute',
      left: '-28px', // Poza kontenerem z lewej strony
      top: '50%',
      transform: 'translateY(-50%)',
      width: '22px',
      height: '22px',
      backgroundColor: 'rgba(59, 130, 246, 0.9)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      cursor: 'pointer',
      opacity: '0',
      animation: 'fadeIn 0.2s ease-out forwards',
      zIndex: '1000',
      pointerEvents: 'auto'
    })

    // Upewnij się że element ma position relative
    if (getComputedStyle(elementToMark).position === 'static') {
      elementToMark.style.position = 'relative'
    }

    // Dodaj ikonkę do konkretnego elementu
    elementToMark.appendChild(pencilIcon)
  }, [])

  // Funkcja do sprawdzania czy należy pokazać ołówek
  const checkPencilDisplay = useCallback(() => {
    if (!hoverStartTimeRef.current || !currentHoveredElementRef.current) return
    
    const timeOnElement = Date.now() - hoverStartTimeRef.current
    
    // Jeśli jesteśmy na elemencie dłużej niż 500ms I element nadal jest hoverowany
    if (timeOnElement >= 500 && currentHoveredElementRef.current.matches(':hover')) {
      // Sprawdź czy to najgłębszy element (żeby uniknąć duplikacji)
      const hoveredChildren = currentHoveredElementRef.current.querySelectorAll(':hover')
      const deepestHovered = hoveredChildren.length > 0 ? hoveredChildren[hoveredChildren.length - 1] : currentHoveredElementRef.current
      
      // Pokaż ołówek tylko jeśli to najgłębszy element
      if (deepestHovered === currentHoveredElementRef.current || !deepestHovered.closest('[data-section-id]')) {
        const sectionContainer = currentHoveredElementRef.current.closest('.section-container') as HTMLElement
        showEditIcon(sectionContainer || currentHoveredElementRef.current, currentHoveredElementRef.current)
      }
      
      // Zatrzymaj sprawdzanie - ołówek już wyświetlony
      if (pencilCheckIntervalRef.current) {
        clearInterval(pencilCheckIntervalRef.current)
        pencilCheckIntervalRef.current = null
      }
    }
  }, [showEditIcon])

  // Funkcja do rozpoczęcia śledzenia czasu na elemencie
  const startHoverTracking = useCallback((element: HTMLElement) => {
    // Wyczyść poprzednie śledzenie
    if (pencilCheckIntervalRef.current) {
      clearInterval(pencilCheckIntervalRef.current)
      pencilCheckIntervalRef.current = null
    }
    
    // Usuń wszystkie istniejące ikonki
    const existingIcons = document.querySelectorAll('.edit-pencil-icon')
    existingIcons.forEach(icon => icon.remove())
    
    // Rozpocznij nowe śledzenie
    hoverStartTimeRef.current = Date.now()
    currentHoveredElementRef.current = element
    
    // Sprawdzaj co 100ms czy należy pokazać ołówek
    pencilCheckIntervalRef.current = setInterval(checkPencilDisplay, 100)
  }, [checkPencilDisplay])

  // Funkcja do zatrzymania śledzenia
  const stopHoverTracking = useCallback(() => {
    hoverStartTimeRef.current = null
    currentHoveredElementRef.current = null
    
    if (pencilCheckIntervalRef.current) {
      clearInterval(pencilCheckIntervalRef.current)
      pencilCheckIntervalRef.current = null
    }
    
    // Usuń wszystkie ikonki ołówka
    const existingIcons = document.querySelectorAll('.edit-pencil-icon')
    existingIcons.forEach(icon => icon.remove())
  }, [])

  // Optimized hover handler for markdown elements
  const createHoverHandler = useCallback((elementType: string, color: string) => {
    return {
onMouseOver: (e: React.MouseEvent<HTMLElement>) => {
  if (isAnimating) return

  e.stopPropagation()
  const element = e.currentTarget

  // ⛔️ Ważne: ignoruj zdarzenia pochodzące z dzieci (bo onMouseOver bąbelkuje!)
  if (!element.contains(e.target as Node)) return

  const section = element.closest('.section-container')
  if (!section) return

  startHoverTracking(element)

  const intensity = 0.06
  Object.assign(element.style, {
    backgroundColor: `rgba(${color}, ${intensity})`,
    borderLeft: `3px solid rgba(${color}, ${intensity * 4})`,
    borderRadius: '6px',
    padding: '8px 12px',
    margin: '4px -12px',
    transition: 'all 0.15s ease-in-out'
  })
}
,
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        const element = e.currentTarget
        
        // Zatrzymaj śledzenie ołówka
        stopHoverTracking()

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
        e.preventDefault()
        
        const element = e.currentTarget
        
        // Pobierz wszystkie dane z DOM - single source of truth!
        const domData = {
          elementId: element.getAttribute('data-element-id') || `fallback_${Date.now()}`,
          content: element.textContent?.trim() || '',
          elementType: element.getAttribute('data-element-type') || elementType,
          clone: element.cloneNode(true) as HTMLElement
        }
        
        console.log('🎯 DOM-first onClick:', domData)
        
        onElementClick(e, domData)
      }
    }
  }, [onElementClick, isAnimating, startHoverTracking, stopHoverTracking])

  // Hover handlery dla sekcji
  const applySectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => {
    if (isAnimating) return
    
    event.stopPropagation()
    const targetElement = event.currentTarget
    const sectionContainer = targetElement.closest('.section-container') as HTMLElement
    if (!sectionContainer) return

    // Wyczyść poprzedni timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Jeśli poprzedni element był highlighted, wyczyść go
    if (lastHoveredRef.current && lastHoveredRef.current !== sectionId) {
      const prevElement = document.querySelector(`[data-section-id="${lastHoveredRef.current}"]`)
      const prevContainer = prevElement?.closest('.section-container') as HTMLElement
      if (prevContainer) {
      Object.assign(sectionContainer.style, {
  backgroundColor: `rgba(59, 130, 246, 0.08)`,
  borderRadius: '8px',
  transform: 'scale(1.01)', // lub translateY, zamiast margin/padding
  boxShadow: `inset 3px 0 0 rgba(59, 130, 246, 0.3), 0 1px 3px rgba(59, 130, 246, 0.1)`,
  transition: 'all 0.15s ease-in-out'
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

    // Rozpocznij śledzenie dla ołówka
    startHoverTracking(targetElement)
  }, [isAnimating, startHoverTracking])

  const clearSectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    const targetElement = event.currentTarget
    const sectionContainer = targetElement.closest('.section-container') as HTMLElement
    if (!sectionContainer) return

    // Zatrzymaj śledzenie ołówka
    stopHoverTracking()

    // Wyczyść timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Usuń style hover
    Object.assign(sectionContainer.style, {
      backgroundColor: '',
      borderLeft: '',
      borderRadius: '',
      transform: '',
      boxShadow: '',
      transition: 'all 0.15s ease-in-out'
    })

    // Wyczyść reference
    lastHoveredRef.current = null

    // Usuń transition po animacji
    setTimeout(() => {
      if (sectionContainer.style.transition) {
        sectionContainer.style.transition = ''
      }
    }, 150)
  }, [stopHoverTracking])

  return {
    createHoverHandler,
    applySectionHoverStyles,
    clearSectionHoverStyles
  }
}