"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Plus, 
  Youtube, 
  FileText, 
  Image, 
  Mic,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Source } from '../hooks/useQuickStudy'

interface SourcesPanelProps {
  sources: Source[]
  selectedSource: Source | null
  onSourceSelect: (source: Source) => void
}

const getSourceIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="h-4 w-4" />
    case 'youtube': return <Youtube className="h-4 w-4" />
    case 'image': return <Image className="h-4 w-4" />
    case 'audio': return <Mic className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ready': return <CheckCircle className="h-3 w-3" />
    case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />
    case 'error': return <AlertCircle className="h-3 w-3" />
    default: return null
  }
}

export default function SourcesPanel({ sources, selectedSource, onSourceSelect }: SourcesPanelProps) {
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
            Sources
          </h3>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Sources list */}
        <ul className="space-y-2 max-h-[400px] overflow-y-auto">
          {sources.map((source) => (
            <li key={source.id}>
              <button
                className={`w-full group relative p-3.5 rounded-xl text-left transition-all duration-200 ${
                  selectedSource?.id === source.id
                    ? darkMode
                      ? "bg-accent border-primary/20"
                      : "bg-primary/5 border-primary/20"
                    : darkMode
                      ? "hover:bg-accent/50 border-transparent"
                      : "hover:bg-slate-50 border-transparent"
                } border`}
                onClick={() => onSourceSelect(source)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-lg ${
                    darkMode ? 'bg-background' : 'bg-slate-100'
                  }`}>
                    {getSourceIcon(source.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      darkMode ? 'text-foreground' : 'text-slate-900'
                    }`}>
                      {source.name}
                    </p>
                    <p className={`text-xs mt-1 ${
                      darkMode ? 'text-muted-foreground' : 'text-slate-500'
                    }`}>
                      {source.pages && `${source.pages} pages • `}
                      {source.size || source.duration}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {getStatusIcon(source.status)}
                      <span className={`text-xs ${
                        source.status === 'ready'
                          ? darkMode ? 'text-green-400' : 'text-green-600'
                          : source.status === 'processing'
                            ? darkMode ? 'text-amber-400' : 'text-amber-600'
                            : darkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {source.status === 'ready' ? 'Ready' : 
                         source.status === 'processing' ? 'Processing' : 'Error'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
        
        {/* Study Actions */}
        <div className="space-y-2 pt-5 mt-5 border-t border-border">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Target className="mr-2 h-4 w-4" />
            Start Study Session
          </Button>
          <Button variant="outline" size="sm" className="w-full hover:bg-accent">
            <Clock className="mr-2 h-3.5 w-3.5" />
            Quick Study (15 min)
          </Button>
        </div>
      </div>
    </aside>
  )
}