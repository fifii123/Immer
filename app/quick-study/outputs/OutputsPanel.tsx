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
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  visible: boolean
  outputs: Output[]
  selectedSource: Source | null
  onMethodSelect: (method: string) => void
  onOutputClick: (output: Output) => void
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
  visible,
  outputs,
  selectedSource,
  onMethodSelect,
  onOutputClick
}: OutputsPanelProps) {
  const { darkMode } = usePreferences()

  // Filter outputs for selected source
  const sourceOutputs = outputs.filter(output => 
    selectedSource ? output.sourceId === selectedSource.id : false
  )

  return (
    <aside className={`transition-all duration-500 ease-out overflow-hidden z-10 ${
      visible ? 'w-full' : 'w-12'
    } ${darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'} border rounded-2xl h-full flex flex-col`}>
      
      {/* Collapsed state - tylko toggle button */}
      {!visible && (
        <div className="h-full flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rotate-180 hover:bg-accent"
            onClick={() => {/* Panel is controlled by parent */}}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Expanded state */}
      {visible && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <header className="flex-shrink-0 p-6 border-b border-border">
            <div className="text-center">
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                Choose your study method
              </h3>
              {selectedSource && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>From:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                      {selectedSource.name}
                    </span>
                  </div>
                </div>
              )}
              {!selectedSource && (
                <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                  Select a source to generate content
                </p>
              )}
            </div>
          </header>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Existing Outputs - wygenerowane rzeczy */}
              {sourceOutputs.length > 0 && (
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Generated Content
                  </h4>
                  <div className="space-y-2">
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
                </div>
              )}
              
              {/* Generate New - metody do wygenerowania nowych */}
              <div>
                <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Generate New
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {STUDY_METHODS.map((method) => (
                    <button
                      key={method.id}
                      className={`p-4 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                        darkMode 
                          ? 'bg-background hover:bg-accent/50 border-border' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      } border ${!selectedSource || selectedSource.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => selectedSource?.status === 'ready' && onMethodSelect(method.id)}
                      disabled={!selectedSource || selectedSource.status !== 'ready'}
                    >
                      <div className="flex flex-col gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          darkMode ? 'bg-primary/10' : 'bg-primary/5'
                        }`}>
                          {method.icon}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${
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
              </div>
              
              {/* Quick Actions */}
              {selectedSource && (
                <div className="pt-4 border-t border-border">
                  <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Quick Actions
                  </h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      disabled={selectedSource.status !== 'ready'}
                    >
                      <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                      Generate All Types
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      disabled={selectedSource.status !== 'ready'}
                    >
                      <Clock className="mr-2 h-3.5 w-3.5" />
                      Quick Summary
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}