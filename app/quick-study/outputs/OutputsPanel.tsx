"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
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
  Loader2
} from "lucide-react"
import { Output } from '../hooks/useQuickStudy'

interface OutputsPanelProps {
  outputs: Output[]
  curtainVisible: boolean
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
  onShowCurtain, 
  onOutputClick 
}: OutputsPanelProps) {
  const { darkMode } = usePreferences()

  return (
    <aside className={`h-full overflow-hidden flex flex-col rounded-2xl ${
      darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
    } border`}>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-xs font-semibold tracking-wide uppercase ${
            darkMode ? 'text-muted-foreground' : 'text-slate-500'
          }`}>
            Generated
          </h3>
          {!curtainVisible && (
            <button
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                darkMode 
                  ? 'text-muted-foreground hover:text-foreground hover:bg-accent' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              onClick={onShowCurtain}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Outputs list */}
        <ul className="space-y-2 max-h-[600px] overflow-y-auto">
          {outputs.map((output) => (
            <li key={output.id}>
              <button
                className={`w-full group p-3.5 rounded-xl text-left transition-all duration-200 ${
                  darkMode 
                    ? 'bg-background hover:bg-accent/50 border-border' 
                    : 'bg-slate-50 hover:bg-white hover:shadow-sm border-slate-200'
                } border`}
                onClick={() => onOutputClick(output)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    darkMode ? 'bg-card' : 'bg-white'
                  }`}>
                    {getTileIcon(output.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      darkMode ? 'text-foreground' : 'text-slate-900'
                    }`}>
                      {output.title}
                    </p>
                    <p className={`text-xs mt-1 ${
                      darkMode ? 'text-muted-foreground' : 'text-slate-600'
                    }`}>
                      {output.preview}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {getStatusIcon(output.status)}
                      <span className={`text-xs ${
                        output.status === 'ready'
                          ? darkMode ? 'text-green-400' : 'text-green-600'
                          : darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        {output.status === 'ready' ? 'Ready' : 'Generating...'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        
        {/* Item counter */}
        {outputs.length > 0 && (
          <p className={`mt-4 text-center text-xs ${
            darkMode ? 'text-muted-foreground' : 'text-slate-400'
          }`}>
            {outputs.length} item{outputs.length !== 1 ? 's' : ''} generated
          </p>
        )}
      </div>
    </aside>
  )
}