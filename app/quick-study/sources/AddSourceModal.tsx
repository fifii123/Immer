"use client"

import React, { useState } from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Upload,
  FileText,
  Link,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AddSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onFileUpload: (files: File[]) => void
  onTextSubmit: (text: string, title?: string) => void
  onUrlSubmit: (url: string, title?: string) => void
  uploadInProgress: boolean
}

type SourceType = 'file' | 'text' | 'url'

export default function AddSourceModal({
  isOpen,
  onClose,
  onFileUpload,
  onTextSubmit,
  onUrlSubmit,
  uploadInProgress
}: AddSourceModalProps) {
  const { darkMode } = usePreferences()
  
  const [selectedType, setSelectedType] = useState<SourceType>('file')
  const [textContent, setTextContent] = useState('')
  const [urlContent, setUrlContent] = useState('')
  const [title, setTitle] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleClose = () => {
    if (uploadInProgress || processing) return
    
    // Reset form
    setSelectedType('file')
    setTextContent('')
    setUrlContent('')
    setTitle('')
    setProcessing(false)
    onClose()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onFileUpload(Array.from(files))
      // Don't close modal here - let parent handle success/error
    }
  }

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return
    
    setProcessing(true)
    try {
      await onTextSubmit(textContent.trim(), title.trim() || undefined)
      handleClose() // Close on success
    } catch (error) {
      // Error handling is done by parent
    } finally {
      setProcessing(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlContent.trim()) return
    
    setProcessing(true)
    try {
      await onUrlSubmit(urlContent.trim(), title.trim() || undefined)
      handleClose() // Close on success
    } catch (error) {
      // Error handling is done by parent
    } finally {
      setProcessing(false)
    }
  }

  const sourceTypes = [
    {
      id: 'file' as SourceType,
      icon: Upload,
      title: 'Upload Files',
      description: 'PDF, Word, images, audio, video'
    },
    {
      id: 'text' as SourceType,
      icon: FileText,
      title: 'Paste Text',
      description: 'Articles, notes, research content'
    },
    {
      id: 'url' as SourceType,
      icon: Link,
      title: 'Add URL',
      description: 'Websites, articles, YouTube videos'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`max-w-md ${darkMode ? 'bg-card' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`text-lg font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
            Add Study Source
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Type Selection */}
          <div className="space-y-3">
            {sourceTypes.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.id
              
              return (
                <button
                  key={type.id}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? darkMode
                        ? 'border-primary bg-primary/10'
                        : 'border-primary bg-primary/5'
                      : darkMode
                        ? 'border-border hover:border-primary/50 hover:bg-accent/50'
                        : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-lg ${
                      isSelected
                        ? darkMode ? 'bg-primary/20' : 'bg-primary/10'
                        : darkMode ? 'bg-muted' : 'bg-slate-100'
                    }`}>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm ${
                        darkMode ? 'text-foreground' : 'text-slate-900'
                      }`}>
                        {type.title}
                      </h3>
                      <p className={`text-xs mt-1 ${
                        darkMode ? 'text-muted-foreground' : 'text-slate-600'
                      }`}>
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Content Input Based on Selected Type */}
          <div className="space-y-4">
            {selectedType === 'file' && (
              <div>
                <Label className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Select Files
                </Label>
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,.doc,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.mp4,.avi,.mov"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>
            )}

            {selectedType === 'text' && (
              <div className="space-y-3">
                <div>
                  <Label className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Title (optional)
                  </Label>
                  <Input
                    placeholder="e.g., Research Notes, Article Summary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Text Content *
                  </Label>
                  <Textarea
                    placeholder="Paste your text content here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="mt-1 min-h-[120px] resize-none"
                    maxLength={50000}
                  />
                  <div className={`text-xs mt-1 ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                    {textContent.length.toLocaleString()} / 50,000 characters
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'url' && (
              <div className="space-y-3">
                <div>
                  <Label className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Title (optional)
                  </Label>
                  <Input
                    placeholder="e.g., Article Title, Video Name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    URL *
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/article"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    className="mt-1"
                  />
                  <div className={`text-xs mt-1 ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                    Websites, articles, YouTube videos, and more
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={uploadInProgress || processing}
            >
              Cancel
            </Button>
            
            {selectedType === 'text' && (
              <Button 
                onClick={handleTextSubmit}
                disabled={!textContent.trim() || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add Text'
                )}
              </Button>
            )}
            
            {selectedType === 'url' && (
              <Button 
                onClick={handleUrlSubmit}
                disabled={!urlContent.trim() || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Add URL'
                )}
              </Button>
            )}
            
            {selectedType === 'file' && uploadInProgress && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}