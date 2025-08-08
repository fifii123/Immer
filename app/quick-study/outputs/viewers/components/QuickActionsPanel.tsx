// app/quick-study/outputs/viewers/components/QuickActionsPanel.tsx
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
  AlertCircle
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

interface QuickActionsPanelProps {
  contentId: string
  contentData: QuickActionsData
  position: { top: number; left: number } | null
  onClose: () => void
  contentContainer?: HTMLElement | null 
  parsedSections?: any[]
  fullDocument?: string
}

// Quick Actions definitions - MVP set
const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    id: 'convert-table',
    label: 'Convert to Table',
    description: 'Transform list or data into table format',
    icon: <Table className="h-4 w-4" />,
    bestFor: ['list', 'paragraph'],
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
    id: 'convert-list',
    label: 'Convert to List',
    description: 'Break down into bullet points',
    icon: <List className="h-4 w-4" />,
    bestFor: ['paragraph'],
    color: 'bg-blue-100 text-blue-700 border-blue-200',
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

export function QuickActionsPanel({ 
  contentId, 
  contentData, 
  position, 
  onClose, 
  contentContainer,
  parsedSections,
  fullDocument
}: QuickActionsPanelProps) {
  const [isPortalReady, setIsPortalReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())
  const [completedActions, setCompletedActions] = useState<Map<string, any>>(new Map())
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())

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

  // Filter actions based on content type
  const availableActions = QUICK_ACTIONS.filter(action => {
    if (!action.enabled) return false
    
    const contentType = contentData.contentType.toLowerCase()
    const elementType = contentData.elementType.toLowerCase()
    
    // Core actions always available
    if (['make-memorable', 'add-example', 'simplify-eli5'].includes(action.id)) {
      return true
    }
    
    // Context-specific actions
    if (action.id === 'convert-table') {
      return contentType.includes('list') || elementType.includes('list') || 
             contentData.content.includes('\n-') || contentData.content.includes('\n*')
    }
    
    if (action.id === 'convert-list') {
      return !contentType.includes('list') && !elementType.includes('list')
    }
    
    return action.bestFor.some(type => 
      contentType.includes(type) || elementType.includes(type)
    )
  })

  // Execute Quick Action - MOCK for now
  const executeAction = useCallback(async (action: QuickActionDefinition) => {
    console.log(`⚡ Executing ${action.id} for content:`, contentData.content.substring(0, 100))
    
    setLoadingActions(prev => new Set(prev).add(action.id))
    
    try {
      // MOCK delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // MOCK response based on action type
      let mockResult = ''
      
      switch (action.id) {
        case 'convert-table':
          mockResult = `| Element | Description | Example |
|---------|-------------|---------|
| First item | Based on original content | Sample data |
| Second item | Converted from text | More data |`
          break
          
        case 'make-memorable':
          mockResult = `🧠 **Memory Palace Version:**

Think of this like walking through your house - each room represents a key idea. Use familiar objects to remember concepts.`
          break
          
        case 'add-example':
          mockResult = `${contentData.content}

**🌟 Real-World Example:** Consider how Netflix recommends movies - it takes complex data and shows only what's relevant to you.`
          break
          
        case 'convert-list':
          mockResult = `**Key Points:**
• First main idea extracted
• Second important concept  
• Third essential element`
          break
          
        case 'simplify-eli5':
          mockResult = `**Simple Version:** Imagine you have LEGO blocks. This concept is like having a sorter that puts each color in its own box, making it easier to build!`
          break
          
        default:
          mockResult = `**${action.label} Result:**\n\n[Transformed content would appear here]`
      }

      setCompletedActions(prev => new Map(prev).set(action.id, {
        success: true,
        result: mockResult
      }))
      
      toast({
        title: `${action.label} complete!`,
        description: `Content transformed successfully.`
      })
      
    } catch (error) {
      setCompletedActions(prev => new Map(prev).set(action.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      
      toast({
        title: `${action.label} failed`,
        description: 'Something went wrong',
        variant: "destructive"
      })
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(action.id)
        return newSet
      })
    }
  }, [contentData, toast])

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

  if (!isPortalReady || !isVisible) {
    return null
  }

  const panelContent = (
    <div 
      className="quick-actions-panel fixed z-50 animate-in fade-in-0 duration-200"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="w-96 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900">Quick Actions</h3>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
              {availableActions.length} available
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions List */}
        <div className="max-h-80 overflow-y-auto p-2">
          <div className="space-y-2">
            {availableActions.map(action => {
              const isLoading = loadingActions.has(action.id)
              const result = completedActions.get(action.id)
              const isCompleted = !!result
              const isExpanded = expandedActions.has(action.id)

              return (
                <div key={action.id} className="quick-action-block border rounded-lg bg-white/80 backdrop-blur-sm">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-md border ${action.color}`}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isCompleted ? (
                            result?.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )
                          ) : (
                            action.icon
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{action.label}</h4>
                          <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(action.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => executeAction(action)}
                          disabled={isLoading}
                          className="h-8 px-3 text-xs font-medium hover:bg-purple-50"
                        >
                          {isLoading ? 'Processing...' : isCompleted ? 'Redo' : 'Transform'}
                        </Button>
                      </div>
                    </div>

                    {/* Result */}
                    {isCompleted && isExpanded && result && result.success && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {result.result}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-200/50">
          <p className="text-xs text-gray-500 text-center">
            Content: {contentData.contentType} • {contentData.content.length} chars
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