// app/quick-study/outputs/viewers/components/QuickActionsPanel.tsx - WITH RESTORED COLORS
"use client"

import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { 
  Zap, 
  Table, 
  Brain, 
  Lightbulb,
  List,
  Sparkles,
  Loader2, 
  X, 
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  RefreshCw,
  Quote,       
  Code,      
  BookOpen     
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface QuickActionsData {
  contentId: string
  content: string
  elementType: string
  contentType: string
}

interface QuickActionDefinition {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  bestFor: string[]
  color: string
  enabled: boolean
}

interface ConvertOption {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  excludeFromTypes: string[] // Types that can't be converted to this
}

interface QuickActionsPanelProps {
  contentId: string
  contentData: QuickActionsData
  position: { top: number; left: number } | null
  onClose: () => void
  contentContainer?: HTMLElement | null 
  parsedSections?: any[]
  fullDocument?: string
  // NEW: Callback to apply transformation
  onTransformComplete?: (transformedContent: string, elementId: string) => void
}

// Quick Actions definitions - MVP set with unified Convert action
const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    id: 'convert',
    label: 'Convert',
    description: 'Transform into different format',
    icon: <RefreshCw className="h-4 w-4" />,
    bestFor: ['paragraph', 'list'],
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    enabled: true
  },
  {
    id: 'make-memorable',
    label: 'Make Memorable',
    description: 'Rewrite to be easier to remember',
    icon: <Brain className="h-4 w-4" />,
    bestFor: ['paragraph', 'definition'],
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    enabled: true
  },
  {
    id: 'add-example',
    label: 'Add Example',
    description: 'Add real-world example',
    icon: <Lightbulb className="h-4 w-4" />,
    bestFor: ['definition', 'concept'],
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    enabled: true
  },
  {
    id: 'simplify-eli5',
    label: 'Simplify (ELI5)',
    description: 'Explain like I\'m 5 years old',
    icon: <Sparkles className="h-4 w-4" />,
    bestFor: ['paragraph', 'definition'],
    color: 'bg-green-100 text-green-700 border-green-200',
    enabled: true
  }
]

// Conversion options for the Convert action - COMPLETE SET
const CONVERT_OPTIONS: ConvertOption[] = [
  {
    id: 'paragraph',
    label: 'Paragraph',
    description: 'Flowing text format',
    icon: <FileText className="h-4 w-4" />,
    excludeFromTypes: ['paragraph']
  },
  {
    id: 'list',
    label: 'Bullet List',
    description: 'Bullet points or numbered list',
    icon: <List className="h-4 w-4" />,
    excludeFromTypes: ['list', 'ordered-list', 'unordered-list']
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Structured rows and columns',
    icon: <Table className="h-4 w-4" />,
    excludeFromTypes: ['other', 'table'] // 'other' zawiera tabele
  },
  {
    id: 'text',
    label: 'Plain Text',
    description: 'Clean text without formatting',
    icon: <Quote className="h-4 w-4" />,
    excludeFromTypes: ['quote', 'blockquote']
  },

  {
    id: 'definition',
    label: 'Definition',
    description: 'Key-value definition format',
    icon: <BookOpen className="h-4 w-4" />,
    excludeFromTypes: ['definition'] // rzadko występuje, ale dla kompletności
  }
]

export function QuickActionsPanel({ 
  contentId, 
  contentData, 
  position, 
  onClose, 
  contentContainer,
  parsedSections,
  fullDocument,
  onTransformComplete
}: QuickActionsPanelProps) {
  const [isPortalReady, setIsPortalReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())
  const [completedActions, setCompletedActions] = useState<Map<string, any>>(new Map())
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const [convertSubmenu, setConvertSubmenu] = useState<string | null>(null) // 'convert' when submenu is open

  const { toast } = useToast()

  // Prepare portal on mount
  useEffect(() => {
    if (contentContainer && typeof document !== 'undefined') {
      if (getComputedStyle(contentContainer).position === 'static') {
        contentContainer.style.position = 'relative'
      }
      if (getComputedStyle(contentContainer).overflow === 'hidden') {
        contentContainer.style.overflow = 'visible'
      }
      
      setIsPortalReady(true)
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsPortalReady(true)
      setIsVisible(true)
    }
  }, [contentContainer])

  // Get available conversion options for current content
  const getAvailableConversions = useCallback(() => {
    const contentType = contentData.contentType.toLowerCase()
    const elementType = contentData.elementType.toLowerCase()
    
    return CONVERT_OPTIONS.filter(option => 
      !option.excludeFromTypes.some(excludeType => 
        contentType.includes(excludeType) || elementType.includes(excludeType)
      )
    )
  }, [contentData])

  // Filter actions based on content type
  const availableActions = QUICK_ACTIONS.filter(action => {
    if (!action.enabled) return false
    
    const contentType = contentData.contentType.toLowerCase()
    const elementType = contentData.elementType.toLowerCase()
    
    // Core actions always available
    if (['make-memorable', 'add-example', 'simplify-eli5'].includes(action.id)) {
      return true
    }
    
    // Convert action - available if content can be converted to something
    if (action.id === 'convert') {
      const availableConversions = getAvailableConversions()
      return availableConversions.length > 0
    }
    
    return action.bestFor.some(type => 
      contentType.includes(type) || elementType.includes(type)
    )
  })

  // NEW: Real API call for transformation
  const callTransformAPI = useCallback(async (
    operation: string, 
    targetFormat?: string
  ): Promise<{ transformedContent: string; newContentType: string }> => {
    // Extract session ID from contentId (assuming format like "content-123-session-456")
    const sessionIdMatch = contentId.match(/session-(\w+)/) || window.location.pathname.match(/sessions\/([^\/]+)/)
    const sessionId = sessionIdMatch?.[1] || 'default'
    
    console.log(`🚀 Calling Transform API: ${operation}${targetFormat ? ` -> ${targetFormat}` : ''}`)
    console.log(`📍 Session: ${sessionId}, Element: ${contentId}`)
    
    // Prepare DOM info (same structure as in edit system)
    const domInfo = {
      domElementId: contentId,
      structuralId: contentId,
      elementType: contentData.elementType,
      content: contentData.content
    }
    
    const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/notes/edit/quick-actions/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation,
        targetFormat,
        domInfo,
        parsedSections: parsedSections || [],
        fullDocument: fullDocument || ''
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(`Transform API error: ${response.status} - ${errorData.error}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Transform operation failed')
    }
    
    return {
      transformedContent: result.transformedContent,
      newContentType: result.newContentType
    }
  }, [contentId, contentData, parsedSections, fullDocument])

  // Execute conversion with specific target format - NOW WITH REAL API
  const executeConversion = useCallback(async (targetFormat: string) => {
    console.log(`⚡ Converting to ${targetFormat} for content:`, contentData.content.substring(0, 100))
    
    const actionId = `convert-${targetFormat}`
    setLoadingActions(prev => new Set(prev).add(actionId))
    
    try {
      // 🚀 REAL API CALL
      const { transformedContent, newContentType } = await callTransformAPI('convert', targetFormat)
      
      setCompletedActions(prev => new Map(prev).set(actionId, {
        success: true,
        result: transformedContent,
        targetFormat,
        newContentType
      }))
      
      // 🎯 APPLY TRANSFORMATION via callback
      if (onTransformComplete) {
        onTransformComplete(transformedContent, contentId)
      }
      
      toast({
        title: `Converted to ${targetFormat}!`,
        description: `Content transformed successfully.`
      })
      
      // Close submenu after successful conversion
      setConvertSubmenu(null)
      
    } catch (error) {
      console.error(`❌ Conversion to ${targetFormat} failed:`, error)
      
      setCompletedActions(prev => new Map(prev).set(actionId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        targetFormat
      }))
      
      toast({
        title: `Conversion to ${targetFormat} failed`,
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: "destructive"
      })
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionId)
        return newSet
      })
    }
  }, [contentData, toast, callTransformAPI, onTransformComplete, contentId])

  // Execute Quick Action - NOW WITH REAL API
  const executeAction = useCallback(async (action: QuickActionDefinition) => {
    // Special handling for convert action - open submenu
    if (action.id === 'convert') {
      setConvertSubmenu('convert')
      return
    }

    console.log(`⚡ Executing ${action.id} for content:`, contentData.content.substring(0, 100))
    
    setLoadingActions(prev => new Set(prev).add(action.id))
    
    try {
      // 🚀 REAL API CALL
      const { transformedContent, newContentType } = await callTransformAPI(action.id)
      
      setCompletedActions(prev => new Map(prev).set(action.id, {
        success: true,
        result: transformedContent,
        newContentType
      }))
      
      // 🎯 APPLY TRANSFORMATION via callback
      if (onTransformComplete) {
        onTransformComplete(transformedContent, contentId)
      }
      
      toast({
        title: `${action.label} complete!`,
        description: `Content transformed successfully.`
      })
      
    } catch (error) {
      console.error(`❌ ${action.label} failed:`, error)
      
      setCompletedActions(prev => new Map(prev).set(action.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      
      toast({
        title: `${action.label} failed`,
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: "destructive"
      })
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(action.id)
        return newSet
      })
    }
  }, [contentData, toast, callTransformAPI, onTransformComplete, contentId])

  // Toggle expanded state
  const toggleExpanded = useCallback((actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }, [])

  // Close submenu and go back to main actions
  const closeSubmenu = useCallback(() => {
    setConvertSubmenu(null)
  }, [])

  if (!isPortalReady || !isVisible) {
    return null
  }

  const availableConversions = getAvailableConversions()

  const panelContent = (
    <div 
      className="quick-actions-panel absolute z-[9999] animate-in fade-in-0 duration-200"
      style={{
        top: position?.top || 0,
        right: 8,
        width: '384px', // w-96 = 384px
      }}
    >
      <div className="w-96 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            {convertSubmenu ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeSubmenu}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Convert to Format</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Quick Actions</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {convertSubmenu ? (
            /* Convert Submenu */
            <div className="p-3">
              <div className="text-xs text-gray-600 mb-3 px-1">
                Choose target format for conversion:
              </div>
              <div className="space-y-1">
                {availableConversions.map((option) => {
                  const actionId = `convert-${option.id}`
                  const isLoading = loadingActions.has(actionId)
                  const result = completedActions.get(actionId)
                  const isCompleted = !!result

                  return (
                    <button
                      key={option.id}
                      onClick={() => !isLoading && executeConversion(option.id)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                          ) : isCompleted && result?.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : isCompleted && !result?.success ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            option.icon
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {isLoading ? 'Processing...' : 'Convert'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Main Actions */
            <div className="p-3 space-y-1">
              {availableActions.map((action) => {
                const isLoading = loadingActions.has(action.id)
                const result = completedActions.get(action.id)
                const isCompleted = !!result
                const isExpanded = expandedActions.has(action.id)

                return (
                  <div key={action.id} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-md border ${action.color}`}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isCompleted && result?.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : isCompleted && !result?.success ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            action.icon
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{action.label}</div>
                          <div className="text-xs text-gray-500">{action.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(action.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => executeAction(action)}
                          disabled={isLoading}
                          className="h-8 text-xs flex items-center gap-1.5"
                        >
                          {action.id === 'convert' ? (
                            <div className="flex items-center gap-1">
                              <span>{isLoading ? 'Processing...' : isCompleted ? 'Redo' : 'Transform'}</span>
                              <ChevronRight className="h-3 w-3" />
                            </div>
                          ) : (
                            isLoading ? 'Processing...' : isCompleted ? 'Redo' : 'Transform'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Result Preview */}
                    {isCompleted && isExpanded && result && result.success && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {result.result}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-200/50">
          <p className="text-xs text-gray-500 text-center">
            {convertSubmenu ? `Converting: ${contentData.contentType}` : `Content: ${contentData.contentType}`} • {contentData.content.length} chars
          </p>
        </div>
      </div>
    </div>
  )

  // Render with portal if container available
  if (contentContainer) {
    return ReactDOM.createPortal(panelContent, contentContainer)
  }

  return panelContent
}