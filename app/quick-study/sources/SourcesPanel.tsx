"use client"

import React, { useState } from 'react'
import { 
  Plus, 
  RefreshCw,
  Youtube, 
  FileText, 
  Image, 
  Mic,
  File,
  Link,
  Globe,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Source } from '../hooks/useQuickStudy'
import AddSourceModal from './AddSourceModal'

interface SourcesPanelProps {
  sources: Source[]
  selectedSource: Source | null
  onSourceSelect: (source: Source) => void
  uploadInProgress: boolean
  onFileUpload: (files: File[]) => void
  onTextSubmit: (text: string, title?: string) => void
  onUrlSubmit: (url: string, title?: string) => void
  fetchingSources: boolean
  onRefresh: () => void
}

const getSourceIcon = (type: string, subtype?: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />
    case 'youtube':
      return <Youtube className="h-4 w-4 text-red-600" />
    case 'image':
      return <Image className="h-4 w-4 text-blue-500" />
    case 'audio':
      return <Mic className="h-4 w-4 text-purple-500" />
    case 'docx':
      return <File className="h-4 w-4 text-blue-600" />
    case 'text':
      return subtype === 'pasted' 
        ? <FileText className="h-4 w-4 text-green-500" />
        : <FileText className="h-4 w-4 text-muted-foreground" />
    case 'url':
      return subtype === 'youtube'
        ? <Youtube className="h-4 w-4 text-red-600" />
        : <Globe className="h-4 w-4 text-blue-500" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
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

const getSourceTypeLabel = (source: Source) => {
  if (source.type === 'url') {
    // Check if it's a YouTube URL
    if (source.name.includes('youtube.com') || source.name.includes('youtu.be')) {
      return 'YouTube'
    }
    return 'Website'
  }
  
  const labels = {
    pdf: 'PDF',
    youtube: 'YouTube',
    text: 'Text',
    docx: 'Word Doc',
    image: 'Image',
    audio: 'Audio'
  }
  
  return labels[source.type as keyof typeof labels] || source.type.toUpperCase()
}

export default function SourcesPanel({ 
  sources, 
  selectedSource, 
  onSourceSelect,
  uploadInProgress,
  onFileUpload,
  onTextSubmit,
  onUrlSubmit,
  fetchingSources,
  onRefresh
}: SourcesPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  return (
    <>
      <aside className="h-full overflow-hidden flex flex-col rounded-2xl bg-card border-border border">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Sources
            </h3>
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 hover:bg-accent"
                onClick={onRefresh}
                disabled={fetchingSources}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingSources ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 hover:bg-accent"
                onClick={() => setModalOpen(true)}
                disabled={uploadInProgress}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Loading state */}
          {fetchingSources && sources.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading sources...
                </p>
              </div>
            </div>
          )}
          
          {/* Sources list */}
          {sources.length > 0 ? (
            <ul className="space-y-2 max-h-[400px] overflow-y-auto">
              {sources.map((source) => (
                <li key={source.id}>
                  <button
                    className={`w-full group relative p-3.5 rounded-xl text-left transition-all duration-200 ${
                      selectedSource?.id === source.id
                        ? "bg-accent border-primary/20"
                        : "hover:bg-accent/50 border-transparent"
                    } border`}
                    onClick={() => onSourceSelect(source)}
                    disabled={source.status === 'error'}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-background">
                        {getSourceIcon(source.type, (source as any).subtype)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`font-medium text-sm truncate text-foreground ${source.status === 'error' ? 'opacity-50' : ''}`}>
                            {source.name}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-muted text-muted-foreground">
                            {getSourceTypeLabel(source)}
                          </span>
                        </div>
                        
                        {(source.size || source.duration || source.pages || source.wordCount) && (
                          <p className={`text-xs mt-1 text-muted-foreground ${source.status === 'error' ? 'opacity-50' : ''}`}>
                            {source.pages && `${source.pages} pages`}
                            {source.pages && (source.size || source.duration || source.wordCount) && ' • '}
                            {source.wordCount && `${source.wordCount.toLocaleString()} words`}
                            {source.wordCount && (source.size || source.duration) && ' • '}
                            {source.size || source.duration}
                          </p>
                        )}
                        
                        {/* Processing error display */}
                        {source.status === 'error' && source.processingError && (
                          <p className="text-xs mt-1 text-destructive">
                            Error: {source.processingError}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-2">
                          {getStatusIcon(source.status)}
                          <span className={`text-xs ${
                            source.status === 'ready'
                              ? 'text-green-500'
                              : source.status === 'processing'
                                ? 'text-amber-500'
                                : 'text-destructive'
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
          ) : !fetchingSources && (
            <div className="flex-1 flex items-center justify-center text-center py-12">
              <div>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-primary/10">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">
                  No sources yet
                </h4>
                <p className="text-xs mb-4 text-muted-foreground">
                  Add files, text, or URLs to get started
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  disabled={uploadInProgress}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Source
                </Button>
              </div>
            </div>
          )}
          

{/* Processing progress indicator */}
{(uploadInProgress || sources.some(s => s.status === 'processing')) && (
  <div className="mt-4 p-3 rounded-lg bg-primary/10">
    <div className="flex items-center gap-3">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {uploadInProgress ? 'Uploading files...' : 'Processing content...'}
        </p>
        <p className="text-xs text-muted-foreground">
          {uploadInProgress 
            ? 'Files are being uploaded'
            : 'Content is being extracted and analyzed'
          }
        </p>
      </div>
    </div>
  </div>
)}
        </div>
        
        {/* Footer Actions - tylko gdy są sources */}
        {sources.length > 0 && (
          <div className="flex-shrink-0 p-5 border-t border-border">
            <div className="space-y-2">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!selectedSource || selectedSource.status !== 'ready'}
              >
                <Target className="mr-2 h-4 w-4" />
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

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onFileUpload={onFileUpload}
        onTextSubmit={onTextSubmit}
        onUrlSubmit={onUrlSubmit}
        uploadInProgress={uploadInProgress}
      />
    </>
  )
}