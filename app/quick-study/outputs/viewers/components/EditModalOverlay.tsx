// app/quick-study/outputs/viewers/components/EditModalOverlay.tsx
import React, { useEffect, useRef, useState } from 'react'
import { X, Save, RotateCcw, Type, Wand2, Edit3, Sparkles, FileText, Clock } from 'lucide-react'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editModal.isOpen) {
      const timer = setTimeout(() => {
        setIsAnimating(false)
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [editModal.isOpen])

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = Math.max(120, Math.min(300, textarea.scrollHeight)) + 'px'
    }
  }, [editModal.content])

  const modalStyle = {
    left: '50%',
    top: '50%',
    transform: isAnimating 
      ? `translate(-50%, -50%) scale(0.9) rotateX(10deg)` 
      : `translate(-50%, -50%) scale(1) rotateX(0deg)`,
    transformOrigin: 'center center',
  }

  const getElementTypeInfo = (elementType: string) => {
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

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />
      
      <div
        className={`fixed z-[10001] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full mx-4 transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        style={modalStyle}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${elementInfo.color} flex items-center justify-center shadow-lg text-white`}>
              {elementInfo.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Edit {elementInfo.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Make your changes below
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={editModal.content}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full min-h-[120px] max-h-[400px] p-4 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-y-auto"
              placeholder="Enter your content here..."
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
              {editModal.content.length} chars
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Enhancements</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />Improve
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex items-center gap-1.5">
                <Type className="h-3 w-3" />Simplify
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex items-center gap-1.5">
                <Edit3 className="h-3 w-3" />Expand
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={onReset} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />Reset
              </Button>
            )}
            {hasChanges && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />Unsaved changes
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave} disabled={!hasChanges} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Save className="h-4 w-4" />Save Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}