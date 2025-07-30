// app/quick-study/outputs/viewers/components/EditModalOverlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import { X, Save, RotateCcw, Type, Wand2, Edit3, Sparkles, FileText, Clock, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditModalState } from '../hooks/useEditModal'

interface EditModalOverlayProps {
  editModal: EditModalState
  onClose: () => void
  onContentChange: (content: string) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
}

export function EditModalOverlay({
  editModal, onClose, onContentChange, onSave, onReset, hasChanges
}: EditModalOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [viewMode, setViewMode] = useState<'visual' | 'edit'>('visual')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Smart scroll to center element if needed
  useEffect(() => {
    if (editModal.isOpen && editModal.sourceElement) {
      const rect = editModal.sourceElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Check if element needs centering
      const elementCenter = rect.top + rect.height / 2
      const viewportCenter = viewportHeight / 2
      
      // If element is not well-centered, scroll to center it
      if (Math.abs(elementCenter - viewportCenter) > viewportHeight * 0.1) {
        const scrollTarget = window.scrollY + elementCenter - viewportCenter
        
        window.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: 'smooth'
        })
        
        // Wait for scroll to complete before starting animation
        setTimeout(() => {
          setIsAnimating(false)
        }, 300)
      } else {
        // Element is already well-positioned, start animation immediately
        setTimeout(() => {
          setIsAnimating(false)
        }, 100)
      }
    }
  }, [editModal.isOpen])

  // Focus handling for edit mode
  useEffect(() => {
    if (!isAnimating && viewMode === 'edit' && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 100)
    }
  }, [viewMode, isAnimating])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = Math.max(120, Math.min(300, textarea.scrollHeight)) + 'px'
    }
  }, [editModal.content])

  // Update visual preview when switching to visual mode
  useEffect(() => {
    if (viewMode === 'visual' && previewRef.current && editModal.visualPreview) {
      previewRef.current.innerHTML = ''
      const clonedElement = editModal.visualPreview.cloneNode(true) as HTMLElement
      previewRef.current.appendChild(clonedElement)
    }
  }, [viewMode, editModal.visualPreview])

  // Calculate positioning for the illusion effect
  const getPositioning = () => {
    if (!editModal.sourceElement) {
      return {
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'auto',
        maxWidth: '800px'
      }
    }

    const rect = editModal.sourceElement.getBoundingClientRect()
    
    // Account for content area padding (16px) and border (1px) = 17px total
    const offset = 17
    
    return {
      position: 'fixed' as const,
      left: rect.left - offset,
      top: rect.top - offset,
      width: rect.width,
      minWidth: Math.max(rect.width, 400), // Ensure minimum usable width
      transform: isAnimating 
        ? 'scale(1)' 
        : 'scale(1.05)', // Subtle pop-out effect
      transformOrigin: 'top left',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 10001
    }
  }

  const modalStyle = getPositioning()

  const getElementTypeInfo = (elementType: string) => {
    if (elementType.startsWith('complete-section')) {
      return { icon: <FileText className="h-4 w-4" />, label: 'Section', color: 'bg-indigo-500' }
    }
    
    switch (elementType) {
      case 'paragraph':
        return { icon: <Type className="h-4 w-4" />, label: 'Paragraph', color: 'bg-blue-500' }
      case 'unordered-list':
      case 'ordered-list':
        return { icon: <FileText className="h-4 w-4" />, label: 'List Item', color: 'bg-green-500' }
      case 'table':
        return { icon: <FileText className="h-4 w-4" />, label: 'Table Cell', color: 'bg-purple-500' }
      case 'blockquote':
        return { icon: <FileText className="h-4 w-4" />, label: 'Quote', color: 'bg-orange-500' }
      default:
        return { icon: <Edit3 className="h-4 w-4" />, label: 'Content', color: 'bg-gray-500' }
    }
  }

  const elementInfo = getElementTypeInfo(editModal.elementType)
  const hasVisualPreview = !!editModal.visualPreview

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />
      
      {/* Modal positioned at source element location */}
      <div
        ref={modalRef}
        className={`transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        style={modalStyle}
      >
        {/* Header - positioned absolutely above the clone */}
        <div 
          className="absolute left-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-lg border border-gray-200 dark:border-gray-700 border-b-0 flex items-center justify-between p-4 pb-3"
          style={{
            top: '-60px', // Position above the clone
            width: '100%',
            minWidth: '400px',
            zIndex: 1
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${elementInfo.color} flex items-center justify-center shadow-lg text-white`}>
              {elementInfo.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Edit {elementInfo.label}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {hasVisualPreview ? 'Visual preview or edit mode' : 'Make your changes below'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {hasVisualPreview && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant={viewMode === 'visual' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('visual')}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </Button>
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
              </div>
            )}
            
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area - This is the clone positioned exactly at source element */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
          {viewMode === 'visual' && hasVisualPreview ? (
            <div>
              {/* Visual Preview Container - matches original element styling with padding */}
              <div 
                ref={previewRef}
                className="min-h-[100px] overflow-visible p-4"
                style={{ 
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  color: 'inherit'
                }}
              />
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Edit className="h-3 w-3" />
                  <span className="font-medium">Edit Mode</span>
                </div>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Make your changes below. {hasVisualPreview ? 'Switch to Preview to see how it looks.' : ''}
                </p>
              </div>
              
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={editModal.content}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="w-full min-h-[150px] max-h-[300px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-y-auto font-mono text-sm"
                  placeholder="Enter your content here..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                  {editModal.content.length} chars
                </div>
              </div>

              {/* AI Enhancements - only show in edit mode */}
              <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">AI Enhancements</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-6 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />Improve
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-6 flex items-center gap-1">
                    <Type className="h-3 w-3" />Simplify
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-6 flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />Expand
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - positioned absolutely below the clone */}
        <div 
          className="absolute left-0 bg-white dark:bg-gray-900 rounded-b-2xl shadow-lg border border-gray-200 dark:border-gray-700 border-t-0 flex items-center justify-between p-4 pt-3 bg-gray-50 dark:bg-gray-800/50"
          style={{
            top: '100%', // Position below the clone
            width: '100%',
            minWidth: '400px',
            zIndex: 1
          }}
        >
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-2 h-7 text-xs">
                <RotateCcw className="h-3 w-3" />Reset
              </Button>
            )}
            {hasChanges && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />Unsaved changes
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={onSave} 
              disabled={!hasChanges || viewMode === 'visual'} 
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50 h-7 text-xs"
            >
              <Save className="h-3 w-3" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}