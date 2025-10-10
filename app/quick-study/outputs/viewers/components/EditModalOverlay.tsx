// app/quick-study/outputs/viewers/components/EditModalOverlay.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X, Save, RotateCcw, Type, Wand2, Edit3, Sparkles, FileText, Clock, Eye, Edit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditModalState } from '../hooks/useEditModal'
import { useAIOperations, AIOperationType } from '../hooks/useAIOperations'
import { MinimalContextService } from '@/app/services/MinimalContextService'
import { ContentMorphingPanel, MorphingParams } from './ContentMorphingPanel'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface EditModalOverlayProps {
  editModal: EditModalState
  onClose: () => void
  onContentChange: (content: string) => void
  onSave: () => void
  onReset: () => void
  hasChanges: boolean
  sessionId?: string
  getCurrentDocumentContent?: () => string 
  getParsedSections?: () => any[] 
}

export function EditModalOverlay({
  editModal, onClose, onContentChange, onSave, onReset, hasChanges, sessionId, getCurrentDocumentContent, getParsedSections
}: EditModalOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [viewMode, setViewMode] = useState<'visual' | 'edit' | 'ai-processing'>('visual')
  const [fixedModalHeight, setFixedModalHeight] = useState<number | null>(null) // NEW: Fixed height state
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // AI Operations hook
  const { operationState, processContent, resetOperation } = useAIOperations()

  // FIXED: Better animation timing with position recalculation
  useEffect(() => {
    if (editModal.isOpen) {
      // Force a small delay to ensure DOM is stable before positioning
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 50) // Reduced from 100ms to 50ms for faster response
      
      return () => clearTimeout(timer)
    }
  }, [editModal.isOpen])

  // NEW: Capture modal height before AI processing starts
  useEffect(() => {
    if (viewMode === 'ai-processing' && fixedModalHeight === null && modalRef.current) {
      // Get the content area height, not the whole modal
      const contentArea = modalRef.current.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl') as HTMLElement
      if (contentArea) {
        const currentHeight = contentArea.getBoundingClientRect().height
        setFixedModalHeight(Math.max(currentHeight, 200)) // Minimum 200px for AI content
      }
    }
    
    // Reset fixed height when leaving AI processing mode
    if (viewMode !== 'ai-processing' && fixedModalHeight !== null) {
      setFixedModalHeight(null)
    }
  }, [viewMode, fixedModalHeight])

  // FIXED: Update content from AI operations when processing completes
  useEffect(() => {
    if (!operationState.isProcessing && operationState.content && viewMode === 'ai-processing') {
      // Update the modal content with AI generated content
      onContentChange(operationState.content)
    }
  }, [operationState.isProcessing, operationState.content, viewMode, onContentChange])

  // Focus handling for edit mode
  useEffect(() => {
    if (!isAnimating && viewMode === 'edit' && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 100)
    }
  }, [viewMode, isAnimating])

  // Update visual preview when switching to visual mode
  useEffect(() => {
    if (viewMode === 'visual' && previewRef.current && editModal.visualPreview) {
      previewRef.current.innerHTML = ''
      const clonedElement = editModal.visualPreview.cloneNode(true) as HTMLElement
      previewRef.current.appendChild(clonedElement)
    }
  }, [viewMode, editModal.visualPreview])



const handleMorphGenerate = useCallback(async (params: MorphingParams) => {
  if (!editModal?.content || !sessionId) {
    console.error('❌ Missing required data for morphing')
    return
  }

  try {
    console.log('🚀 MORPH GENERATE CLICKED!')
    console.log('🎛️ Morphing params:', params)
    console.log('📝 Original content:', editModal.content)
    console.log('🎯 Element type:', editModal.elementType)
    console.log('📍 Element ID:', editModal.elementId)
    
    // Mock response based on density and tone
    const densityLabels = ['Minimal', 'Concise', 'Balanced', 'Detailed', 'Comprehensive']
    const mockResponse = `**[MOCK MORPH RESPONSE]**

**Settings Applied:**
- Density: ${params.density}/5 (${densityLabels[params.density - 1]})  
- Tone: ${params.tone}

**Original Content Length:** ${editModal.content.length} characters
**Element Type:** ${editModal.elementType}

**Mock Morphed Content:**
${editModal.content}

*This is a frontend mock response. Backend integration coming next.*`
    
    console.log('✅ Mock morph response generated:', mockResponse)
    
    // Set to AI processing mode to show the mock response
    setViewMode('ai-processing')
      if (previewRef.current) {
    previewRef.current.innerHTML = ''
    // USUŃ: previewRef.current.style.display = 'none'  ← To psuło layout
  }
    // Update content to show mock response
    onContentChange(mockResponse)
    
  } catch (error) {
    console.error('❌ Morph generation failed:', error)
  }
}, [editModal, sessionId, onContentChange, setViewMode])
  // Calculate maximum modal height based on viewport (more compact)
  const getMaxModalHeight = () => {
    const viewportHeight = window.innerHeight
    const headerHeight = 60 // Height of the header
    const footerHeight = 60 // Height of the footer
    const padding = 80 // More padding for compact feel
    
    // Max 400px or 60% of viewport, whichever is smaller
    const calculatedHeight = viewportHeight - headerHeight - footerHeight - padding
    return Math.min(400, calculatedHeight, viewportHeight * 0.6)
  }
// FIXED: Better positioning with DOM stability check + extensive logging
const getPositioning = () => {

  // FIXED: Always try to find current element by selector first
  let currentElement = editModal.sourceElement
  let rect = editModal.originalRect

  if (editModal.elementSelector) {
    const freshElement = document.querySelector(editModal.elementSelector) as HTMLElement
    if (freshElement && freshElement.isConnected) {
      console.log('🎯 Found fresh element via selector - using fresh position')
      currentElement = freshElement
      rect = freshElement.getBoundingClientRect()
    } else {
      console.log('⚠️ Using cached position from originalRect')
      currentElement = null
      rect = editModal.originalRect
    }
  } else if (currentElement && currentElement.isConnected) {
    console.log('🎯 Using original element - fresh position')
    rect = currentElement.getBoundingClientRect()
  } else {
    console.log('⚠️ Using cached position from originalRect')
    rect = editModal.originalRect
  }

  const maxHeight = getMaxModalHeight()

  // FALLBACK: If we have no position data at all
  if (!rect) {
    console.error('❌ No position data available - using center positioning as last resort')
    return {
      position: 'fixed' as const,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'auto',
      maxWidth: '800px',
      maxHeight: maxHeight,
      ...(fixedModalHeight && { height: `${fixedModalHeight}px` })
    }
  }


  // Check for invalid positioning and use clickPosition fallback
  if (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0) {
    console.error('❌ INVALID RECT - Element has zero dimensions/position!')

    
    // Use clickPosition as fallback for in-place effect
    if (editModal.clickPosition) {
      console.log('🎯 Using clickPosition as fallback for in-place effect')
      const offset = 17
      return {
        position: 'fixed' as const,
        left: editModal.clickPosition.x - offset,
        top: editModal.clickPosition.y - offset,
        width: 400,
        minWidth: 400,
        maxHeight: maxHeight,
        ...(fixedModalHeight && { height: `${fixedModalHeight}px` }),
        transform: isAnimating ? 'scale(1)' : 'scale(1.05)',
        transformOrigin: 'top left',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10001
      }
    }
  }

  // Special handling for edit mode - use compact dimensions
  if (viewMode === 'edit') {
    const offset = 17
    return {
      position: 'fixed' as const,
      left: rect.left - offset,
      top: rect.top - offset,
      width: Math.max(rect.width, 400),
      height: '280px', // Compact fixed height for edit mode
      minWidth: 400,
      transform: isAnimating ? 'scale(1)' : 'scale(1.05)',
      transformOrigin: 'top left',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 10001
    }
  }

  // Normal positioning with element dimensions
  const offset = 17
  return {
    position: 'fixed' as const,
    left: rect.left - offset,
    top: rect.top - offset,
    width: rect.width,
    minWidth: Math.max(rect.width, 400),
    maxHeight: maxHeight,
    ...(fixedModalHeight && { height: `${fixedModalHeight}px` }),
    transform: isAnimating ? 'scale(1)' : 'scale(1.05)',
    transformOrigin: 'top left',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10001
  }
}
  const modalStyle = getPositioning()
  // FIXED: Use fixed height during AI processing, otherwise use calculated max height
  const maxContentHeight = fixedModalHeight 
    ? fixedModalHeight - 0 // Use full fixed height for content area
    : (modalStyle.maxHeight ? modalStyle.maxHeight : 400)

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
      {/* <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      /> */}
      
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
                {hasVisualPreview ? 
                  'Visual preview or edit mode' : 'Make your changes below'}
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
                  onClick={() => {
                    setViewMode('visual')
                    resetOperation()
                  }}
                  className="h-7 text-xs flex items-center gap-1.5"
                  disabled={operationState.isProcessing}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </Button>
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                      if (previewRef.current) {
    previewRef.current.innerHTML = ''
    // USUŃ: previewRef.current.style.display = 'none'  ← To psuło layout
  }
                    setViewMode('edit')
                    resetOperation()
                  }}
                  className="h-7 text-xs flex items-center gap-1.5"
                  disabled={operationState.isProcessing}
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

        {/* Content Area - This is the clone positioned exactly at source element with scroll */}
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
          style={{
            // FIXED: Ensure content area has proper height
            height: fixedModalHeight ? `${fixedModalHeight}px` : 'auto',
            maxHeight: fixedModalHeight ? `${fixedModalHeight}px` : `${maxContentHeight}px`,
            minHeight: viewMode === 'ai-processing' ? '200px' : 'auto' // Minimum height for AI processing
          }}
        >
          <div 
            className="overflow-y-auto flex-1"
            style={{ 
              // FIXED: Content should fill available space
              maxHeight: fixedModalHeight ? `${fixedModalHeight}px` : `${maxContentHeight}px`,
              minHeight: viewMode === 'ai-processing' ? '150px' : 'auto'
            }}
          >
            {viewMode === 'ai-processing' ? (
              /* AI Processing Area - streaming markdown with proper background */
              <div className="min-h-[150px] p-4 bg-white dark:bg-gray-900">
                <div className={`${operationState.isProcessing ? 
                  'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {operationState.content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight, rehypeKatex]}
                      >
                        {operationState.content}
                      </ReactMarkdown>
                      {operationState.isProcessing && (
                        <div className="flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Generating...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {/* <span>Starting AI enhancement...</span> */}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : viewMode === 'visual' && hasVisualPreview ? (
              /* Visual Preview Container - matches original element styling with padding */
              <div 
                ref={previewRef}
                className="min-h-[100px] p-4"
                style={{ 
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  color: 'inherit'
                }}
              />
            ) : (
              /* Edit Mode - same container dimensions as preview */
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={editModal.content}
                  onChange={(e) => onContentChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                  placeholder="Enter your content here..."
                  style={{
                    height: '100%',
                    minHeight: '100px'
                  }}
                />
              </div>
            )}
          </div>


<ContentMorphingPanel 
  onGenerate={handleMorphGenerate}
  onSave={onSave}
  hasChanges={hasChanges}
  isProcessing={operationState.isProcessing}
  disabled={!editModal?.content}
/>
        </div>

      </div>
    </>
  )
}