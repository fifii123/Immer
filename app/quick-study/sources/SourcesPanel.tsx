"use client"

import React from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Plus, 
  FileText, 
  Youtube, 
  Image, 
  Mic, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Clock 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Types
interface Source {
  id: string
  name: string
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio'
  status: 'processing' | 'ready' | 'error'
  size?: string
  duration?: string
  pages?: number
}

interface SourcesPanelProps {
  sources: Source[]
  selectedSource: Source | null
  onSourceSelect: (source: Source) => void
  uploadInProgress: boolean
}

// Icon mapping for different source types
const getSourceIcon = (type: string) => {
  switch (type) {
    case 'pdf': 
    case 'docx':
      return <FileText className="h-4 w-4" />
    case 'youtube': 
      return <Youtube className="h-4 w-4" />
    case 'image': 
      return <Image className="h-4 w-4" />
    case 'audio': 
      return <Mic className="h-4 w-4" />
    default: 
      return <FileText className="h-4 w-4" />
  }
}

// Status icon mapping
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ready': 
      return <CheckCircle className="h-3 w-3" />
    case 'processing': 
      return <Loader2 className="h-3 w-3 animate-spin" />
    case 'error': 
      return <AlertCircle className="h-3 w-3" />
    default: 
      return null
  }
}

export default function SourcesPanel({ 
  sources, 
  selectedSource, 
  onSourceSelect, 
  uploadInProgress 
}: SourcesPanelProps) {
  const { darkMode } = usePreferences()

  return (
    <aside className={`h-full overflow-hidden flex flex-col rounded-2xl ${
      darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
    } border`}>
      
      {/* Header */}
      <div className="flex-shrink-0 p-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xs font-semibold tracking-wide uppercase ${
            darkMode ? 'text-muted-foreground' : 'text-slate-500'
          }`}>
            Sources
          </h3>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 hover:bg-accent"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploadInProgress}
          >
            {uploadInProgress ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        
        {/* Upload progress indicator */}
        {uploadInProgress && (
          <div className="mb-4">
            <div className={`text-xs mb-2 ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
              Uploading files...
            </div>
            <div className="w-full bg-border rounded-full h-1">
              <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Sources List */}
      <div className="flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <div className="p-5 text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
              darkMode ? 'bg-muted' : 'bg-slate-100'
            }`}>
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
              No sources yet
            </p>
            <p className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
              Upload files to start studying
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {sources.map((source) => (
              <button
                key={source.id}
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
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                    darkMode ? 'bg-muted' : 'bg-slate-100'
                  }`}>
                    {getSourceIcon(source.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-medium line-clamp-2 ${
                        darkMode ? 'text-foreground' : 'text-slate-900'
                      }`}>
                        {source.name}
                      </h4>
                      <div className="flex-shrink-0">
                        <div className={`flex items-center gap-1 ${
                          source.status === 'ready'
                            ? darkMode ? 'text-green-400' : 'text-green-600'
                            : source.status === 'processing'
                              ? darkMode ? 'text-amber-400' : 'text-amber-600'
                              : darkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {getStatusIcon(source.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {source.type.toUpperCase()}
                      </Badge>
                      
                      {source.size && (
                        <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                          {source.size}
                        </span>
                      )}
                      
                      {source.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                            {source.duration}
                          </span>
                        </div>
                      )}
                      
                      {source.pages && (
                        <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                          {source.pages} pages
                        </span>
                      )}
                    </div>
                    
                    <div className={`text-xs mt-1 ${
                      source.status === 'ready'
                        ? darkMode ? 'text-green-400' : 'text-green-600'
                        : source.status === 'processing'
                          ? darkMode ? 'text-amber-400' : 'text-amber-600'
                          : darkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {source.status === 'ready' ? 'Ready' : 
                       source.status === 'processing' ? 'Processing' : 'Error'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      {sources.length > 0 && (
        <div className="flex-shrink-0 p-5 border-t border-border">
          <div className="space-y-2">
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!selectedSource || selectedSource.status !== 'ready'}
            >
              <FileText className="mr-2 h-4 w-4" />
              Start Study Session
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full hover:bg-accent"
              disabled={!selectedSource || selectedSource.status !== 'ready'}
            >
              <Clock className="mr-2 h-3.5 w-3.5" />
              Quick Study (15 min)
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}