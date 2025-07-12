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

  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let codeBlock: string[] = []
    let inCodeBlock = false
    let inList = false

    lines.forEach((line, index) => {
      if (line.trim() === '```') {
        if (inCodeBlock) {
          elements.push(
            <pre key={index} className="bg-muted p-4 rounded mb-4 overflow-auto">
              <code className="text-xs whitespace-pre-wrap">{codeBlock.join('\n')}</code>
            </pre>
          )
          codeBlock = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeBlock.push(line)
        return
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={index} className="my-6 border-muted" />)
        return
      }

      // Blockquote
      if (line.startsWith('>')) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
            {line.replace(/^>\s?/, '')}
          </blockquote>
        )
        return
      }

      // Header levels
      if (line.startsWith('### ')) {
        elements.push(<h4 key={index} className="text-base font-semibold mt-5 mb-2">{line.replace('### ', '')}</h4>)
        return
      }

      if (line.startsWith('## ')) {
        elements.push(<h3 key={index} className="text-lg font-semibold mt-6 mb-3">{line.replace('## ', '')}</h3>)
        return
      }

      // Checkbox
      if (line.startsWith('- [ ]')) {
        elements.push(
          <div key={index} className="flex items-center gap-2 ml-4 mb-2">
            <input type="checkbox" disabled />
            <span>{line.replace('- [ ] ', '')}</span>
          </div>
        )
        return
      }

      // Bullet or numbered list
      if (/^(\d+\.|- |\* )/.test(line)) {
        if (!inList) {
          elements.push(<ul key={`ul-${index}`} className="list-disc ml-6 mb-2">{
            <li key={index}>{line.replace(/^(\d+\.)|- |\* /, '')}</li>
          }</ul>)
          inList = true
        } else {
          elements.push(<li key={index} className="ml-6 mb-1">{line.replace(/^(\d+\.)|- |\* /, '')}</li>)
        }
        return
      } else {
        inList = false
      }

      // Table
      if (line.includes('|') && line.includes('---')) {
        return // skip the separator row
      } else if (line.includes('|')) {
        const cells = line.split('|').map(cell => cell.trim())
        elements.push(
          <div key={index} className="grid grid-cols-3 gap-4 bg-muted px-4 py-2 rounded mb-2 text-sm">
            {cells.map((cell, i) => (
              <div key={i}>{cell}</div>
            ))}
          </div>
        )
        return
      }

      // Bold / Italic / Inline code
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')

      if (formatted.trim() === '') {
        elements.push(<br key={index} />)
        return
      }

      elements.push(
        <p
          key={index}
          className="mb-2 leading-relaxed text-sm"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })

    return elements
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
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <ScrollArea className="h-full">
          <div className="p-6 rounded-xl bg-muted/50">
            <div className="text-sm text-foreground space-y-2">
              {renderMarkdownContent(output.content)}
            </div>
          </div>
        </ScrollArea>
      </div>
    </article>
  )
}