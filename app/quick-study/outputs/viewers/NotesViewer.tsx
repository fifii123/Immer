"use client"

import React from 'react'
import { PenTool, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface Output {
  id: string;
  type: string;
  title: string;
  content?: string;
  sourceId: string;
  createdAt: Date;
}

interface NotesViewerProps {
  output: Output | null;
  selectedSource: any;
}

export default function NotesViewer({ output, selectedSource }: NotesViewerProps) {
  const { toast } = useToast()

  const handleCopy = async () => {
    if (!output?.content) return
    
    try {
      await navigator.clipboard.writeText(output.content)
      toast({
        title: "Copied!",
        description: "Notes copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const handleDownload = () => {
    if (!output?.content) return
    
    const blob = new Blob([output.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${output.title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Render markdown-like content
  const renderMarkdownContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-6 mb-3 text-foreground">
            {line.replace('## ', '')}
          </h3>
        )
      }
      
      // Bold text
      if (line.includes('**')) {
        const parts = line.split('**')
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        )
      }
      
      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <li key={index} className="mb-1 ml-4">
            {line.replace(/^[•-] /, '')}
          </li>
        )
      }
      
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2 leading-relaxed">
          {line}
        </p>
      )
    })
  }

  if (!output || !output.content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <PenTool className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No notes content
          </h3>
          <p className="text-sm text-muted-foreground">
            The notes content is not available
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className="h-full flex flex-col p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <PenTool className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              {output.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedSource ? `Study notes from ${selectedSource.name}` : 'Study Notes'}
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <ScrollArea className="h-full">
          <div className="p-6 rounded-xl bg-muted/50">
            <div className="text-sm text-foreground">
              {renderMarkdownContent(output.content)}
            </div>
          </div>
        </ScrollArea>
      </div>
    </article>
  )
}