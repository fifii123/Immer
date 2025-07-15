"use client"

import React, { useState } from 'react'
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
    // Auto-close modal after successful file selection
    handleClose()
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
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
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
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-2 rounded-lg ${
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground">
                        {type.title}
                      </h3>
                      <p className="text-xs mt-1 text-muted-foreground">
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
  <div className="space-y-4">
    <div>
      <Label className="block text-sm font-medium mb-2 text-foreground">
        Select Files
      </Label>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-sm text-foreground">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, Word, images, audio, video files supported
          </p>
        </div>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploadInProgress}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi,.mov"
        />
      </div>
    </div>
    
    {uploadInProgress && (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Processing files...
      </div>
    )}
  </div>
)}

            {selectedType === 'text' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">
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
                  <Label className="text-sm font-medium text-foreground">
                    Text Content *
                  </Label>
                  <Textarea
                    placeholder="Paste your text content here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="mt-1 min-h-[120px] resize-none"
                    maxLength={50000}
                  />
                  <div className="text-xs mt-1 text-muted-foreground">
                    {textContent.length.toLocaleString()} / 50,000 characters
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'url' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">
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
                  <Label className="text-sm font-medium text-foreground">
                    URL *
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/article"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    className="mt-1"
                  />
                  <div className="text-xs mt-1 text-muted-foreground">
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
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}