"use client"

import React from 'react'
import { FileCheck, Copy, Download } from "lucide-react"
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

interface SummaryViewerProps {
  output: Output | null;
  selectedSource: any;
}

export default function SummaryViewer({ output, selectedSource }: SummaryViewerProps) {
  const { toast } = useToast()

  const handleCopy = async () => {
    if (!output?.content) return
    
    try {
      await navigator.clipboard.writeText(output.content)
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard",
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
    
    const blob = new Blob([output.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${output.title}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!output || !output.content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <FileCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No summary content
          </h3>
          <p className="text-sm text-muted-foreground">
            The summary content is not available
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className="h-full flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              {output.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedSource ? `Summary of ${selectedSource.name}` : 'Document Summary'}
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
      <div className="flex-1 max-w-4xl mx-auto w-full pb-8">
        <ScrollArea className="h-full">
          <div className="prose prose-sm max-w-none">
            <div className="p-6 rounded-xl bg-muted/50">
              <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                {output.content}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </article>
  )
}