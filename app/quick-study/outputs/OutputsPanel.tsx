"use client"

import React from 'react'
import { 
  ChevronRight,
  Zap,
  Target,
  PenTool,
  FileCheck,
  Key,
  Brain,
  LayoutGrid,
  CheckCircle,
  Loader2,
  Sparkles
} from "lucide-react"
import { Output } from '../hooks/useQuickStudy'

interface OutputsPanelProps {
  outputs: Output[]
  curtainVisible: boolean
  selectedSource: any
  onShowCurtain: () => void
  onOutputClick: (output: Output) => void
}

const getTileIcon = (type: string) => {
  const iconMap = {
    flashcards: <Zap className="h-5 w-5" />,
    quiz: <Target className="h-5 w-5" />,
    notes: <PenTool className="h-5 w-5" />,
    summary: <FileCheck className="h-5 w-5" />,
    concepts: <Key className="h-5 w-5" />,
    mindmap: <Brain className="h-5 w-5" />
  }
  return iconMap[type as keyof typeof iconMap] || <LayoutGrid className="h-5 w-5" />
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ready': return <CheckCircle className="h-3 w-3" />
    case 'generating': return <Loader2 className="h-3 w-3 animate-spin" />
    default: return null
  }
}

export default function OutputsPanel({ 
  outputs, 
  curtainVisible, 
  selectedSource,
  onShowCurtain, 
  onOutputClick 
}: OutputsPanelProps) {
  // Filter outputs for selected source
  const sourceOutputs = outputs.filter(output => 
    selectedSource ? output.sourceId === selectedSource.id : false
  )

  return (
    <aside className="h-full overflow-hidden flex flex-col rounded-2xl bg-card border-border border">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Generated
          </h3>
          {!curtainVisible && (
            <button
              className="p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onShowCurtain}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Empty state */}
        {sourceOutputs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-12">
            <div>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">
                {selectedSource ? 'No content generated yet' : 'No source selected'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedSource 
                  ? 'Generate flashcards, quizzes, or notes to see them here'
                  : 'Select a source to see generated content'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Outputs list */}
            <ul className="space-y-2 max-h-[600px] overflow-y-auto">
              {sourceOutputs.map((output) => (
                <li key={output.id}>
                  <button
                    className={`w-full group p-3.5 rounded-xl text-left transition-all duration-200 bg-background hover:bg-accent/50 border-border border ${output.status !== 'ready' ? 'opacity-75 cursor-not-allowed' : ''}`}
                    onClick={() => output.status === 'ready' && onOutputClick(output)}
                    disabled={output.status !== 'ready'}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-card">
                        {getTileIcon(output.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">
                          {output.title}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {output.preview}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {getStatusIcon(output.status)}
                          <span className={`text-xs ${
                            output.status === 'ready'
                              ? 'text-green-500'
                              : 'text-blue-500'
                          }`}>
                            {output.status === 'ready' ? 'Ready' : 'Generating...'}
                          </span>
                          {output.count && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                •
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {output.count} items
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            
            {/* Item counter */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {sourceOutputs.length} item{sourceOutputs.length !== 1 ? 's' : ''} generated
            </p>
          </>
        )}
      </div>
    </aside>
  )
}