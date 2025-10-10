// app/quick-study/outputs/viewers/components/EditModalProvider.tsx
import React, { useState, useCallback } from 'react'
import { useEditModal } from '../hooks/useEditModal'
import { EditModalOverlay } from './EditModalOverlay'

interface EditModalProviderProps {
  sessionId?: string
  onContentSaved?: (element: HTMLElement, newContent: string, elementId?: string) => void
  getCurrentDocumentContent?: () => string 
  getParsedSections?: () => any[]  // NEW: Get parsed sections for ID-based context
  children: (openEditModal: (
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement,
    elementId?: string  // Add element ID parameter
  ) => void) => React.ReactNode
}

const getModalDimensions = () => {
  return {
    headerHeight: 60,
    footerHeight: 60,
    padding: 17
  }
}

const measureVisualPreviewAccurately = (visualPreview: HTMLElement, sourceElement: HTMLElement): number => {
  const tempContainer = document.createElement('div')
  const sourceRect = sourceElement.getBoundingClientRect()
  
  let containerWidth = sourceRect.width
  
  if (visualPreview.classList.contains('section-container')) {
    const realContainer = document.querySelector('.section-container')
    if (realContainer) {
      containerWidth = realContainer.getBoundingClientRect().width
    }
  }
  
  tempContainer.style.cssText = `
    position: absolute;
    visibility: hidden;
    left: -9999px;
    width: ${containerWidth}px;
    overflow: visible;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  `
  
  const clonedPreview = visualPreview.cloneNode(true) as HTMLElement
  copyNestedStyles(visualPreview, clonedPreview)
  
  tempContainer.appendChild(clonedPreview)
  document.body.appendChild(tempContainer)
  
  tempContainer.offsetHeight
  
  const containerHeight = tempContainer.getBoundingClientRect().height
  const containerScrollHeight = tempContainer.scrollHeight
  const clonedHeight = clonedPreview.getBoundingClientRect().height
  const clonedScrollHeight = clonedPreview.scrollHeight
  
  const allHeights = [containerHeight, containerScrollHeight, clonedHeight, clonedScrollHeight]
    .filter(h => h > 0)
  
  const finalHeight = Math.max(...allHeights)
  
  document.body.removeChild(tempContainer)
  
  return finalHeight
}

const copyNestedStyles = (original: HTMLElement, clone: HTMLElement) => {
  const originalStyle = window.getComputedStyle(original)
  const cloneEl = clone as HTMLElement
  
  const importantStyles = [
    'font-family', 'font-size', 'font-weight', 'line-height',
    'padding', 'margin', 'border', 'box-sizing',
    'display', 'width', 'height', 'max-width', 'max-height'
  ]
  
  importantStyles.forEach(property => {
    cloneEl.style.setProperty(property, originalStyle.getPropertyValue(property))
  })
  
  const originalChildren = Array.from(original.children) as HTMLElement[]
  const cloneChildren = Array.from(clone.children) as HTMLElement[]
  
  originalChildren.forEach((child, index) => {
    if (cloneChildren[index]) {
      copyNestedStyles(child, cloneChildren[index])
    }
  })
}

const calculateModalDimensions = (sourceElement: HTMLElement, elementType: string, visualPreview?: HTMLElement) => {
  const { headerHeight, footerHeight } = getModalDimensions()
  
  let fullContentHeight = 0
  let measurementElement = sourceElement
  const sourceRect = sourceElement.getBoundingClientRect()
  
  if (visualPreview) {
    fullContentHeight = measureVisualPreviewAccurately(visualPreview, sourceElement)
  } else {
    if (elementType.startsWith('complete-section')) {
      const sectionContainer = sourceElement.closest('.section-container') as HTMLElement
      if (sectionContainer) {
        measurementElement = sectionContainer
        fullContentHeight = sectionContainer.scrollHeight
      } else {
        fullContentHeight = sourceElement.scrollHeight
      }
    } else {
      fullContentHeight = Math.max(
        sourceElement.scrollHeight,
        sourceElement.offsetHeight,
        sourceRect.height
      )
    }
  }
  
  const contentPadding = 32
  fullContentHeight += contentPadding
  
  const viewportHeight = window.innerHeight
  const maxModalContentHeight = Math.min(400, viewportHeight - headerHeight - footerHeight - 80, viewportHeight * 0.6)
  
  const actualModalContentHeight = Math.min(fullContentHeight, maxModalContentHeight)
  const totalModalHeight = headerHeight + actualModalContentHeight + footerHeight
  
  return { 
    totalModalHeight, 
    headerHeight, 
    actualModalContentHeight,
    willNeedScroll: fullContentHeight > maxModalContentHeight
  }
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

const scrollToFitModal = (sourceElement: HTMLElement, elementType: string, visualPreview?: HTMLElement): Promise<boolean> => {
  return new Promise((resolve) => {
    const scrollContainer = findScrollableContainer(sourceElement)
    const currentScrollTop = scrollContainer?.scrollTop || window.pageYOffset || 0
    
    const maxScrollTop = scrollContainer ? 
      scrollContainer.scrollHeight - scrollContainer.clientHeight :
      document.documentElement.scrollHeight - window.innerHeight
    
    const rect = sourceElement.getBoundingClientRect()
    const { totalModalHeight, headerHeight: modalHeaderHeight } = calculateModalDimensions(sourceElement, elementType, visualPreview)
    
    const modalTop = rect.top - modalHeaderHeight
    const modalBottom = modalTop + totalModalHeight
    
    const baseBuffer = 20
    const modalSizeBuffer = Math.min(totalModalHeight * 0.1, 40)
    const bottomPageBuffer = rect.bottom > window.innerHeight * 0.8 ? 60 : 0
    const BUFFER = baseBuffer + modalSizeBuffer + bottomPageBuffer
    
    const outsideTop = modalTop < BUFFER
    const outsideBottom = modalBottom > window.innerHeight - BUFFER
    
    if (!outsideTop && !outsideBottom) {
      resolve(false)
      return
    }
    
    let scrollAdjustment = 0
    
    if (outsideTop && outsideBottom) {
      if (totalModalHeight > window.innerHeight * 0.9) {
        scrollAdjustment = modalTop - BUFFER
      } else {
        const viewportCenter = window.innerHeight / 2
        const modalCenter = modalTop + totalModalHeight / 2
        scrollAdjustment = modalCenter - viewportCenter
      }
    } else if (outsideTop) {
      scrollAdjustment = modalTop - BUFFER
    } else if (outsideBottom) {
      scrollAdjustment = modalBottom - (window.innerHeight - BUFFER)
    }
    
    const newScrollTop = Math.max(0, Math.min(currentScrollTop + scrollAdjustment, maxScrollTop))
    const actualScrollAdjustment = newScrollTop - currentScrollTop
    
    if (Math.abs(actualScrollAdjustment) > 1) {
      // FIXED: Improved scroll implementation with better timing
      const startTime = performance.now()
      const startScrollTop = currentScrollTop
      const distance = actualScrollAdjustment
      const duration = 150 // Reduced from 200ms to 150ms for even faster response
      
      const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4)
      
      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easeOutQuart(progress)
        
        const currentPos = startScrollTop + (distance * easedProgress)
        
        if (scrollContainer) {
          scrollContainer.scrollTop = currentPos
        } else {
          window.scrollTo(0, currentPos)
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll)
        } else {
          resolve(true)
        }
      }
      
      requestAnimationFrame(animateScroll)
    } else {
      resolve(false)
    }
  })
}

export function EditModalProvider({ 
  children, 
  sessionId, 
  onContentSaved, 
  getCurrentDocumentContent,
  getParsedSections  // NEW: Accept parsed sections getter
}: EditModalProviderProps) {
  // Zawsze wywołuj wszystkie hooki w tej samej kolejności
  const editModalHook = useEditModal()
  const [scrolling, setScrolling] = useState(false)
  
  // Destrukturyzacja po wywołaniu hooków
  const {
    editModal,
    openEditModal: originalOpenEditModal,
    closeEditModal,
    updateContent,
    saveChanges: originalSaveChanges,
    hasChanges,
    resetContent
  } = editModalHook

// Custom saveChanges handler with elementId
  const saveChanges = useCallback(() => {
    if (editModal && onContentSaved) {
      console.log(`💾 EditModalProvider: Saving element ${editModal.elementId}`)
      onContentSaved(editModal.sourceElement!, editModal.content, editModal.elementId || undefined)
    } else {
      originalSaveChanges()
    }
    closeEditModal()
  }, [editModal, onContentSaved, originalSaveChanges, closeEditModal])

// FIXED: Improved modal opening with better DOM stability
  const openEditModalWithAutoScroll = useCallback(async (
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement,
    elementId?: string
  ) => {
    console.log(`🎯 Opening edit modal for element: ${elementId}`)
    
// FIXED: Ensure DOM stability before positioning for granular elements
const isGranularElement = elementId?.startsWith('li-') || 
                         elementId?.startsWith('p-') || 
                         elementId?.startsWith('ul-') ||
                         elementId?.startsWith('ol-');

if (isGranularElement && sourceElement && sourceElement.isConnected) {
  // Force layout recalculation for granular elements - only if element is in DOM
  try {
    // Force reflow by accessing layout properties
    sourceElement.offsetHeight;
    sourceElement.offsetWidth;
    sourceElement.getBoundingClientRect(); // This also forces layout
  } catch (error) {
    console.warn('Could not force layout recalculation:', error);
  }
  await new Promise(resolve => setTimeout(resolve, 25));
} else {
  await new Promise(resolve => setTimeout(resolve, 10));
}

// Sprawdź czy potrzebny scroll - bez delay
const needsScroll = await scrollToFitModal(sourceElement, elementType, visualPreview)

if (needsScroll) {
  // FIXED: Additional delay for granular elements after scroll
  const scrollDelay = isGranularElement ? 35 : 20;
  await new Promise(resolve => setTimeout(resolve, scrollDelay));
  originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview, elementId)
} else {
  // Bez scroll - instant otwarcie z dodatkowym delay dla granular
  if (isGranularElement) {
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview, elementId)
}
  }, [originalOpenEditModal])

  return (
    <>
      {children(openEditModalWithAutoScroll)}
      
      {editModal && editModal.isOpen && (
        <EditModalOverlay
          editModal={editModal}
          onClose={closeEditModal}
          onContentChange={updateContent}
          onSave={saveChanges}
          onReset={resetContent}
          hasChanges={hasChanges()}
          sessionId={sessionId}
          getCurrentDocumentContent={getCurrentDocumentContent} 
          getParsedSections={getParsedSections}  // NEW: Pass parsed sections getter
        />
      )}
    </>
  )
}