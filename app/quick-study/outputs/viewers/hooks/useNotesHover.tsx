// app/quick-study/outputs/viewers/hooks/useNotesHover.tsx - COMPLETE FIXED VERSION
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
  onSmartPreviewClick?: (event: React.MouseEvent<HTMLElement>, sectionId: string, sectionContent: string) => void
  onQuickActionsClick?: (event: React.MouseEvent<HTMLElement>, contentId: string, contentData: any) => void
}

export function useNotesHover({ isAnimating, onElementClick, onSmartPreviewClick, onQuickActionsClick }: UseNotesHoverProps): HoverHandlers {
  // Refs for performance
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredRef = useRef<string | null>(null)
  
  // Refs dla śledzenia czasu na elemencie
  const hoverStartTimeRef = useRef<number | null>(null)
  const pencilCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentHoveredElementRef = useRef<HTMLElement | null>(null)
  // Funkcja do wyświetlania ikonki ołówka
  const showEditIcon = useCallback((container: HTMLElement, targetElement?: HTMLElement) => {
    const elementToMark = targetElement || container
   
    
    if (elementToMark.querySelector('.edit-pencil-icon')) return

    const pencilIcon = document.createElement('div')
    pencilIcon.className = 'edit-pencil-icon'
    pencilIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>
    `
    
    Object.assign(pencilIcon.style, {
      position: 'absolute',
      left: '-28px',
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

    if (getComputedStyle(elementToMark).position === 'static') {
      elementToMark.style.position = 'relative'
    }

    elementToMark.appendChild(pencilIcon)
  }, [])
const clearAllQuickActionButtons = useCallback(() => {
  const existingQuickIcons = document.querySelectorAll('.quick-actions-icon')
  existingQuickIcons.forEach(icon => icon.remove())
}, [])
  // Smart Preview button
  const showSmartPreviewIcon = useCallback((container: HTMLElement, targetElement?: HTMLElement) => {
    if (!onSmartPreviewClick) return
    
    const elementToMark = targetElement || container
    const sectionId = elementToMark.getAttribute('data-section-id')
    
    if (!sectionId) return
    if (elementToMark.querySelector('.smart-preview-icon')) return

    const brainIcon = document.createElement('div')
    brainIcon.className = 'smart-preview-icon'
    brainIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 6px;">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
      <span style="font-size: 12px; font-weight: 500; white-space: nowrap;">Smart Review</span>
    `
    
    Object.assign(brainIcon.style, {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      height: '26px',
      padding: '0 8px',
      backgroundColor: 'rgba(34, 197, 94, 0.9)',
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

    brainIcon.addEventListener('click', (e) => {
      e.stopPropagation()
      const sectionContent = elementToMark.getAttribute('data-content') || ''
      const syntheticEvent = {
        ...e,
        currentTarget: elementToMark,
      } as React.MouseEvent<HTMLElement>
      onSmartPreviewClick(syntheticEvent, sectionId, sectionContent)
    })

    brainIcon.addEventListener('mouseenter', () => {
      brainIcon.style.backgroundColor = 'rgba(34, 197, 94, 1)'
      brainIcon.style.transform = 'translateY(-50%) scale(1.02)'
      brainIcon.style.transition = 'all 0.15s ease-in-out'
    })
    
    brainIcon.addEventListener('mouseleave', () => {
      brainIcon.style.backgroundColor = 'rgba(34, 197, 94, 0.9)'
      brainIcon.style.transform = 'translateY(-50%) scale(1)'
    })

    if (getComputedStyle(elementToMark).position === 'static') {
      elementToMark.style.position = 'relative'
    }

    elementToMark.appendChild(brainIcon)
  }, [onSmartPreviewClick])

  // Quick Actions button
  const showQuickActionsIcon = useCallback((container: HTMLElement, targetElement?: HTMLElement) => {
    if (!onQuickActionsClick) return
    
    const elementToMark = targetElement || container
    const contentId = elementToMark.getAttribute('data-content-id') || elementToMark.getAttribute('data-element-id')
    
    if (!contentId) return
    if (elementToMark.getAttribute('data-section-id')) return
    if (elementToMark.querySelector('.quick-actions-icon')) return

    const quickIcon = document.createElement('div')
    quickIcon.className = 'quick-actions-icon'
    quickIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-right: 6px;">
        <path d="m13 2-2 2.5h3L12 7"/>
        <path d="M10.5 17.5 8 15l1.5-1.5L8 12l1.5-1.5L8 9l1.5-1.5L8 6l2.5-2.5"/>
        <path d="m17 6-2.5 2.5L16 10l-1.5 1.5L16 13l-1.5 1.5L16 16l-2.5 2.5"/>
        <path d="M22 18v-2a4 4 0 0 0-4-4H2"/>
      </svg>
      <span style="font-size: 12px; font-weight: 500; white-space: nowrap;">Quick Actions</span>
    `
    
    Object.assign(quickIcon.style, {
      position: 'absolute',
      right: '8px',
      top: '8px',
      height: '28px',
      padding: '0 10px',
      backgroundColor: 'rgba(147, 51, 234, 0.9)',
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

    quickIcon.addEventListener('click', (e) => {
      e.stopPropagation()
      
      const contentData = {
        contentId,
        content: elementToMark.getAttribute('data-content') || elementToMark.textContent || '',
        elementType: elementToMark.getAttribute('data-element-type') || 'paragraph',
        contentType: elementToMark.getAttribute('data-content-type') || 'paragraph'
      }
      
      const syntheticEvent = {
        ...e,
        currentTarget: elementToMark,
      } as React.MouseEvent<HTMLElement>
      
      onQuickActionsClick(syntheticEvent, contentId, contentData)
    })

quickIcon.addEventListener('mouseenter', () => {
  quickIcon.style.backgroundColor = 'rgba(147, 51, 234, 1)'
})

quickIcon.addEventListener('mouseleave', () => {
  quickIcon.style.backgroundColor = 'rgba(147, 51, 234, 0.9)'
})

    if (getComputedStyle(elementToMark).position === 'static') {
      elementToMark.style.position = 'relative'
    }

    // NEW: Ensure minimum height for button
    if (elementToMark.offsetHeight < 36) {
      elementToMark.style.minHeight = '36px'
      elementToMark.style.display = elementToMark.style.display || 'block'
    }

    elementToMark.appendChild(quickIcon)
  }, [onQuickActionsClick])

  // NEW: Content item cleanup logic (like sections have)
  const clearContentItemHoverEffects = useCallback((currentElementId: string) => {
    
    const allContentItems = document.querySelectorAll('[data-element-id]:not([data-section-id])')
    
    allContentItems.forEach((element) => {
      
      const elementId = element.getAttribute('data-element-id')
      if (elementId && elementId !== currentElementId) {
  
        // Reset visual styles
        Object.assign((element as HTMLElement).style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          transition: 'all 0.15s ease-in-out'
        })
      }
    })
    
    // Clean up old icons (except current element)
    const existingIcons = document.querySelectorAll('.edit-pencil-icon, .quick-actions-icon')
    existingIcons.forEach(icon => {
      const parentElement = icon.closest('[data-element-id]')
      const parentId = parentElement?.getAttribute('data-element-id')
      if (parentId !== currentElementId) {
        icon.remove()
      }
    })
  }, [])

   const clearAllContentItemHoverEffects = useCallback(() => {
    
    const allContentItems = document.querySelectorAll('[data-element-id]:not([data-section-id])')
    
    allContentItems.forEach((element) => {
      
      const elementId = element.getAttribute('data-element-id')
      if (true) {
  
        // Reset visual styles
        Object.assign((element as HTMLElement).style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          transition: 'all 0.15s ease-in-out'
        })
      }
    })
    
    // Clean up old icons (except current element)
    const existingIcons = document.querySelectorAll('.edit-pencil-icon, .quick-actions-icon')
    existingIcons.forEach(icon => {
      const parentElement = icon.closest('[data-element-id]')
      const parentId = parentElement?.getAttribute('data-element-id')
      if (true) {
        icon.remove()
      }
    })
  }, [])

  // Check pencil display logic
  const checkPencilDisplay = useCallback(() => {
    if (!hoverStartTimeRef.current || !currentHoveredElementRef.current) return
    
    const timeOnElement = Date.now() - hoverStartTimeRef.current
    const element = currentHoveredElementRef.current
    
    if (timeOnElement >= 500) {
      const sectionContainer = element.closest('.section-container') as HTMLElement
      const isSection = !!element.getAttribute('data-section-id')
      
      // For sections - use strict hover check
      if (isSection && element.matches(':hover')) {
        showEditIcon(sectionContainer || element, element)
        showSmartPreviewIcon(sectionContainer || element, element)
      }
      
      // For content items - no hover dependency
      if (!isSection) {
        showEditIcon(sectionContainer || element, element)
        showQuickActionsIcon(sectionContainer || element, element)
      }
      
      if (pencilCheckIntervalRef.current) {
        clearInterval(pencilCheckIntervalRef.current)
        pencilCheckIntervalRef.current = null
      }
    }
  }, [showEditIcon, showSmartPreviewIcon, showQuickActionsIcon])

  // Start hover tracking
  const startHoverTracking = useCallback((element: HTMLElement) => {
    if (pencilCheckIntervalRef.current) {
      clearInterval(pencilCheckIntervalRef.current)
      pencilCheckIntervalRef.current = null
    }
    
    // Clean all existing icons
    const existingIcons = document.querySelectorAll('.edit-pencil-icon')
    existingIcons.forEach(icon => icon.remove())
    
    const existingSmartIcons = document.querySelectorAll('.smart-preview-icon')
    existingSmartIcons.forEach(icon => icon.remove())
    
    const existingQuickIcons = document.querySelectorAll('.quick-actions-icon')
    existingQuickIcons.forEach(icon => icon.remove())
    
    hoverStartTimeRef.current = Date.now()
    currentHoveredElementRef.current = element
    
    pencilCheckIntervalRef.current = setInterval(checkPencilDisplay, 100)
  }, [checkPencilDisplay])

  // Stop hover tracking
  const stopHoverTracking = useCallback(() => {
    hoverStartTimeRef.current = null
    currentHoveredElementRef.current = null
    
    if (pencilCheckIntervalRef.current) {
      clearInterval(pencilCheckIntervalRef.current)
      pencilCheckIntervalRef.current = null
    }
    
    const existingIcons = document.querySelectorAll('.edit-pencil-icon')
    existingIcons.forEach(icon => icon.remove())
    
    const existingSmartIcons = document.querySelectorAll('.smart-preview-icon')
    existingSmartIcons.forEach(icon => icon.remove())
    
    const existingQuickIcons = document.querySelectorAll('.quick-actions-icon')
    existingQuickIcons.forEach(icon => icon.remove())
  }, [])

  // FIXED: Create hover handler with proper onClick implementation
  const createHoverHandler = useCallback((elementType: string, color: string) => {
    return {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        if (isAnimating) return
        e.stopPropagation()
        const element = e.currentTarget
        const elementId = element.getAttribute('data-element-id')

        // NEW: Clean up other content items first
        if (elementId) {
          clearContentItemHoverEffects(elementId)
        }

        // Visual styles
        const intensity = 0.06
        Object.assign(element.style, {
          backgroundColor: `rgba(${color}, ${intensity})`,
          borderLeft: `3px solid rgba(${color}, ${intensity * 4})`,
          borderRadius: '6px',
          padding: '8px 12px',
          margin: '4px -12px',
          transition: 'all 0.15s ease-in-out'
        })

        startHoverTracking(element)
      },
      
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        if (isAnimating) return
        e.stopPropagation()
        const element = e.currentTarget
        const elementId = element.getAttribute('data-element-id')

        // NEW: Clean up other content items first
       
          clearAllContentItemHoverEffects()
        

        // Remove visual styles only
        Object.assign(element.style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          transition: 'all 0.15s ease-in-out'
        })

        
        
        // Don't call stopHoverTracking immediately
        setTimeout(() => {
          if (element.style.transition) {
            element.style.transition = ''
            
          }
        }, 150)
      },
      
      // FIXED: Restored complete onClick implementation
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        e.preventDefault()
        
        const element = e.currentTarget
        
  clearAllQuickActionButtons()

        console.log('🎯 === CLICK EVENT START ===', {
          elementType,
          timestamp: Date.now()
        })
        
        // Collect DOM data
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
        
        // Create domData
        const domData = {
          elementId,
          content: textContent,
          elementType: domElementType,
          clone: element.cloneNode(true) as HTMLElement,
          sourceElement: element,
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
  }, [onElementClick, isAnimating, startHoverTracking, clearContentItemHoverEffects])

  // Section hover handlers (unchanged)
  const applySectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => {
    if (isAnimating) return
    
    event.stopPropagation()
    const targetElement = event.currentTarget
    const sectionContainer = targetElement.closest('.section-container') as HTMLElement
    if (!sectionContainer) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (lastHoveredRef.current && lastHoveredRef.current !== sectionId) {
      const prevElement = document.querySelector(`[data-section-id="${lastHoveredRef.current}"]`)
      const prevContainer = prevElement?.closest('.section-container') as HTMLElement
      if (prevContainer) {
        Object.assign(sectionContainer.style, {
          backgroundColor: `rgba(59, 130, 246, 0.08)`,
          borderRadius: '8px',
          transform: 'scale(1.01)',
          boxShadow: `inset 3px 0 0 rgba(59, 130, 246, 0.3), 0 1px 3px rgba(59, 130, 246, 0.1)`,
          transition: 'all 0.15s ease-in-out'
        })
      }
    }

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
    startHoverTracking(targetElement)
  }, [isAnimating, startHoverTracking])

  const clearSectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    const targetElement = event.currentTarget
    const sectionContainer = targetElement.closest('.section-container') as HTMLElement
    if (!sectionContainer) return

    stopHoverTracking()

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    Object.assign(sectionContainer.style, {
      backgroundColor: '',
      borderLeft: '',
      borderRadius: '',
      transform: '',
      boxShadow: '',
      transition: 'all 0.15s ease-in-out'
    })

    lastHoveredRef.current = null

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