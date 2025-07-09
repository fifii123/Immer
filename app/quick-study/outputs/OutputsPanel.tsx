"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Zap, 
  Target, 
  PenTool, 
  FileCheck, 
  Key, 
  Brain,
  ChevronLeft,
  LayoutGrid,
  Clock,
  CheckCircle,
  Loader2,
  X,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types
interface Output {
  id: string
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap'
  title: string
  preview: string
  status: 'generating' | 'ready' | 'error'
  sourceId: string
  createdAt: string
  count?: number
}

interface Source {
  id: string
  name: string
  type: string
  status: string
}

interface OutputsPanelProps {
  outputs: Output[]
  selectedSource: Source | null
  methodsOverlayVisible: boolean
  onMethodSelect: (method: string) => void
  onOutputClick: (output: Output) => void
  onShowMethodsOverlay: () => void
  onHideMethodsOverlay: () => void
}

// Icon mapping for different output types
const OUTPUT_ICONS = {
  flashcards: <Zap className="h-4 w-4" />,
  quiz: <Target className="h-4 w-4" />,
  notes: <PenTool className="h-4 w-4" />,
  summary: <FileCheck className="h-4 w-4" />,
  concepts: <Key className="h-4 w-4" />,
  mindmap: <Brain className="h-4 w-4" />
}

// Study methods configuration
const STUDY_METHODS = [
  { 
    id: 'flashcards', 
    title: 'Flashcards', 
    desc: 'Spaced repetition cards',
    icon: <Zap className="h-5 w-5" />
  },
  { 
    id: 'quiz', 
    title: 'Interactive Quiz', 
    desc: 'Adaptive testing',
    icon: <Target className="h-5 w-5" />
  },
  { 
    id: 'notes', 
    title: 'Smart Notes', 
    desc: 'Structured summaries',
    icon: <PenTool className="h-5 w-5" />
  },
  { 
    id: 'summary', 
    title: 'Key Summary', 
    desc: 'Essential points',
    icon: <FileCheck className="h-5 w-5" />
  },
  { 
    id: 'concepts', 
    title: 'Concepts Map', 
    desc: 'Key definitions',
    icon: <Key className="h-5 w-5" />
  },
  { 
    id: 'mindmap', 
    title: 'Visual Map', 
    desc: 'Connected ideas',
    icon: <Brain className="h-5 w-5" />
  }
]

export default function OutputsPanel({
  outputs,
  selectedSource,
  methodsOverlayVisible,
  onMethodSelect,
  onOutputClick,
  onShowMethodsOverlay,
  onHideMethodsOverlay
}: OutputsPanelProps) {
  const { darkMode } = usePreferences()

  // Filter outputs for selected source
  const sourceOutputs = outputs.filter(output => 
    selectedSource ? output.sourceId === selectedSource.id : false
  )

  return (
    <aside className={`relative h-full rounded-2xl overflow-hidden ${
      darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
    } border`}>
      
      {/* Compact outputs list - default state */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
              Generated Content
            </h3>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-accent"
              onClick={onShowMethodsOverlay}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedSource && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
              From: {selectedSource.name}
            </p>
          )}
        </div>
        
        {/* Outputs list */}
        <div className="flex-1 overflow-hidden">
          {sourceOutputs.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                  darkMode ? 'bg-muted' : 'bg-slate-100'
                }`}>
                  <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  No content generated yet
                </p>
                <p className={`text-xs mb-3 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                  {selectedSource 
                    ? "Choose a study method to get started"
                    : "Select a source first"
                  }
                </p>
                <Button
                  size="sm"
                  onClick={onShowMethodsOverlay}
                  disabled={!selectedSource || selectedSource.status !== 'ready'}
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Generate Content
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {sourceOutputs.map((output) => (
                  <button
                    key={output.id}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      darkMode 
                        ? 'bg-background hover:bg-accent border-border' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    } border`}
                    onClick={() => onOutputClick(output)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 ${
                        darkMode ? 'bg-muted' : 'bg-slate-200'
                      }`}>
                        {OUTPUT_ICONS[output.type as keyof typeof OUTPUT_ICONS]}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-medium line-clamp-1 ${
                            darkMode ? 'text-foreground' : 'text-slate-900'
                          }`}>
                            {output.title}
                          </span>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {output.status === 'ready' && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                            {output.status === 'generating' && (
                              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                            )}
                            {output.count && (
                              <Badge variant="secondary" className="text-xs">
                                {output.count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-xs mt-1 line-clamp-2 ${
                          darkMode ? 'text-muted-foreground' : 'text-slate-600'
                        }`}>
                          {output.preview}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {output.type}
                          </Badge>
                          <span className={`text-xs ${
                            darkMode ? 'text-muted-foreground' : 'text-slate-500'
                          }`}>
                            {new Date(output.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Quick access button */}
        {selectedSource && (
          <div className="flex-shrink-0 p-4 border-t border-border">
            <Button 
              className="w-full"
              onClick={onShowMethodsOverlay}
              disabled={selectedSource.status !== 'ready'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate New Content
            </Button>
          </div>
        )}
      </div>

      {/* Sliding curtain overlay - methods selection */}
      {methodsOverlayVisible && (
        <div className={`absolute inset-0 z-10 flex flex-col ${
          darkMode ? 'bg-card' : 'bg-white'
        }`}>
          {/* Overlay Header */}
          <div className="flex-shrink-0 p-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onHideMethodsOverlay}
                className="hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Content
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onHideMethodsOverlay}
                className="h-8 w-8 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                Choose Study Method
              </h3>
              {selectedSource && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>From:</span>
                  <span className={`font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    {selectedSource.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Methods Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {STUDY_METHODS.map((method) => (
                  <button
                    key={method.id}
                    className={`p-4 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                      darkMode 
                        ? 'bg-background hover:bg-accent/50 border-border' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    } border ${!selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (selectedSource?.status === 'ready') {
                        onMethodSelect(method.id)
                        onHideMethodsOverlay()
                      }
                    }}
                    disabled={!selectedSource || selectedSource.status !== 'ready'}
                  >
                    <div className="flex flex-col gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        darkMode ? 'bg-primary/10' : 'bg-primary/5'
                      }`}>
                        {method.icon}
                      </div>
                      <div>
                        <div className={`text-sm font-medium mb-1 ${
                          darkMode ? 'text-foreground' : 'text-slate-900'
                        }`}>
                          {method.title}
                        </div>
                        <div className={`text-xs ${
                          darkMode ? 'text-muted-foreground' : 'text-slate-600'
                        }`}>
                          {method.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled={!selectedSource || selectedSource.status !== 'ready'}
                    onClick={() => {
                      // TODO: Implement bulk generation
                      console.log('Generate all types')
                    }}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Generate All Types
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled={!selectedSource || selectedSource.status !== 'ready'}
                    onClick={() => {
                      onMethodSelect('summary')
                      onHideMethodsOverlay()
                    }}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Quick Summary
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}