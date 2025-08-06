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
    sourceElement: HTMLElement
    domInfo?: {
      domElementId: string,
      structuralId: string,
      elementType: string,
      content: string
    } | null
  }) => void
  // ONLY ADD: Smart Preview handler (OPTIONAL)
  onSmartPreviewClick?: (event: React.MouseEvent<HTMLElement>, sectionId: string, sectionContent: string) => void
}

export function useNotesHover({ isAnimating, onElementClick, onSmartPreviewClick }: UseNotesHoverProps): HoverHandlers {
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

  // NEW: Funkcja do wyświetlania Smart Preview button
  const showSmartPreviewIcon = useCallback((container: HTMLElement, targetElement?: HTMLElement) => {
    // ONLY if Smart Preview handler is provided AND element is a section header
    if (!onSmartPreviewClick) return
    
    const elementToMark = targetElement || container
    const sectionId = elementToMark.getAttribute('data-section-id')
    
    if (!sectionId) return // Only show on section headers
    if (elementToMark.querySelector('.smart-preview-icon')) return

    // Create Smart Preview button with text
    const brainIcon = document.createElement('div')
    brainIcon.className = 'smart-preview-icon'
    brainIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 6px;">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
      <span style="font-size: 12px; font-weight: 500; white-space: nowrap;">Smart Review</span>
    `
    
    // Green theme, positioned INSIDE the hover area with text
    Object.assign(brainIcon.style, {
      position: 'absolute',
      right: '8px', // Small margin from edge
      top: '50%',
      transform: 'translateY(-50%)',
      height: '26px', // Slightly taller for text
      padding: '0 8px', // Horizontal padding for text
      backgroundColor: 'rgba(34, 197, 94, 0.9)', // Green
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
      pointerEvents: 'auto',
      minWidth: 'fit-content'
    })

    // Click handler
    brainIcon.addEventListener('click', (e) => {
      e.stopPropagation()
      const sectionContent = elementToMark.getAttribute('data-content') || ''
      const syntheticEvent = {
        ...e,
        currentTarget: elementToMark,
      } as React.MouseEvent<HTMLElement>
      onSmartPreviewClick(syntheticEvent, sectionId, sectionContent)
    })

    // Hover effects
    brainIcon.addEventListener('mouseenter', () => {
      brainIcon.style.backgroundColor = 'rgba(34, 197, 94, 1)'
      brainIcon.style.transform = 'translateY(-50%) scale(1.02)'
      brainIcon.style.transition = 'all 0.15s ease-in-out'
    })
    
    brainIcon.addEventListener('mouseleave', () => {
      brainIcon.style.backgroundColor = 'rgba(34, 197, 94, 0.9)'
      brainIcon.style.transform = 'translateY(-50%) scale(1)'
    })

    // Ensure relative positioning
    if (getComputedStyle(elementToMark).position === 'static') {
      elementToMark.style.position = 'relative'
    }

    elementToMark.appendChild(brainIcon)
  }, [onSmartPreviewClick])

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
        // NEW: ONLY show Smart Preview if it's a section header
        showSmartPreviewIcon(sectionContainer || currentHoveredElementRef.current, currentHoveredElementRef.current)
      }
      
      // Zatrzymaj sprawdzanie - ołówek już wyświetlony
      if (pencilCheckIntervalRef.current) {
        clearInterval(pencilCheckIntervalRef.current)
        pencilCheckIntervalRef.current = null
      }
    }
  }, [showEditIcon, showSmartPreviewIcon])

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
    // NEW: Remove Smart Preview icons too
    const existingSmartIcons = document.querySelectorAll('.smart-preview-icon')
    existingSmartIcons.forEach(icon => icon.remove())
    
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
    // NEW: Remove Smart Preview icons too
    const existingSmartIcons = document.querySelectorAll('.smart-preview-icon')
    existingSmartIcons.forEach(icon => icon.remove())
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
  
  console.log('🎯 === CLICK EVENT START ===', {
    elementType,
    timestamp: Date.now()
  })
  
  // FIXED: Zbierz WSZYSTKIE potrzebne dane DOM TERAZ (gdy element jest connected)
  const elementId = element.getAttribute('data-element-id') || `fallback_${Date.now()}`
  const structuralId = element.getAttribute('data-structural-id') || 
                       element.closest('[data-structural-id]')?.getAttribute('data-structural-id')
  const domElementType = element.getAttribute('data-element-type') || elementType
  const textContent = element.textContent?.trim() || ''
  
  console.log('🔍 Collecting DOM data at click time:', {
    elementId,
    structuralId,
    domElementType,
    isConnected: element.isConnected,
    hasTextContent: !!textContent
  })
  
  // Create domData with ALL info needed for AI
  const domData = {
    elementId,
    content: textContent,
    elementType: domElementType,
    clone: element.cloneNode(true) as HTMLElement,
    sourceElement: element,
    // NEW: Pre-collected DOM info for AI
    domInfo: structuralId ? {
      domElementId: elementId,
      structuralId,
      elementType: domElementType,
      content: textContent
    } : null
  }
  
  console.log('🎯 DOM-first onClick - complete domData:', domData)
  
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