// app/quick-study/outputs/viewers/components/EditModalProvider.tsx
import React, { useState, useCallback } from 'react'
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
  const getModalDimensions = () => {
    return {
      headerHeight: 60,
      footerHeight: 60,
      padding: 17
    }
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

  const scrollToFitModal = useCallback((sourceElement: HTMLElement, elementType: string, visualPreview?: HTMLElement) => {
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
      return false
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
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: newScrollTop,
          behavior: 'smooth'
        })
      } else {
        window.scrollTo({
          top: newScrollTop,
          behavior: 'smooth'
        })
      }
      
      return true
    }
    
    return false
  }, [])

  return { scrollToFitModal }
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

  const { scrollToFitModal } = useAutoScroll()
  const [scrolling, setScrolling] = useState(false)

  const openEditModalWithAutoScroll = useCallback((
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number },
    visualPreview?: HTMLElement
  ) => {
    const needsScroll = scrollToFitModal(sourceElement, elementType, visualPreview)
    
    if (needsScroll) {
      setScrolling(true)
      setTimeout(() => {
        originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview)
        setScrolling(false)
      }, 400)
    } else {
      originalOpenEditModal(content, elementType, sourceElement, clickPosition, visualPreview)
    }
  }, [originalOpenEditModal, scrollToFitModal])

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