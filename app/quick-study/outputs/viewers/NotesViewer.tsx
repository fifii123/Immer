// app/quick-study/outputs/viewers/NotesViewer.tsx
"use client"

import React from 'react'
import { PenTool, Copy, Download, FileText, List, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'


import 'katex/dist/katex.min.css'

interface Output {
  id: string;
  type: string;
  title: string;
  content?: string;
  sourceId: string;
  createdAt: Date;
  noteType?: string;
}

interface NotesViewerProps {
  output: Output | null;
  selectedSource: any;
}

const getNoteTypeInfo = (noteType?: string) => {
  switch (noteType) {
    case 'key-points':
      return {
        title: 'Kluczowe Punkty',
        description: 'Lista najważniejszych terminów i pojęć',
        icon: <List className="h-4 w-4" />,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }
    case 'structured':
      return {
        title: 'Strukturalne Notatki',
        description: 'Hierarchiczna organizacja z tabelami',
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      }
    case 'summary-table':
      return {
        title: 'Tabele i Zestawienia',
        description: 'Informacje w formie tabel',
        icon: <Table className="h-4 w-4" />,
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      }
    default:
      return {
        title: 'Ogólne Notatki',
        description: 'Kompletne notatki studenckie',
        icon: <PenTool className="h-4 w-4" />,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      }
  }
}

export default function NotesViewer({ output, selectedSource }: NotesViewerProps) {
  const { toast } = useToast()

  const handleCopy = async () => {
    if (!output?.content) return
    try {
      await navigator.clipboard.writeText(output.content)
      toast({
        title: "Copied!",
        description: "Notes content copied to clipboard"
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
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

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <PenTool className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            Notes not available
          </h3>
          <p className="text-sm text-muted-foreground">
            Unable to load notes content
          </p>
        </div>
      </div>
    )
  }

  const noteTypeInfo = getNoteTypeInfo(output.noteType)

  return (
    <article className="h-full flex flex-col">
      {/* Header */}
      <header className="text-center py-6 border-b border-border">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            {output.title}
          </h2>
          <div className="text-sm text-muted-foreground">
            <p>
              {selectedSource ? 
                `Study notes from ${selectedSource.name}` : 'Study Notes'}
            </p>
          </div>
        </div>

        {/* Note Type Badge */}
        <div className="flex justify-center mt-4 mb-4">
          <Badge className={`${noteTypeInfo.color} px-3 py-1 text-sm font-medium`}>
            <span className="flex items-center gap-1">
              {noteTypeInfo.icon}
              {noteTypeInfo.title}
            </span>
          </Badge>
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
            <div className="markdown-content text-sm text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-200 dark:border-gray-700 text-foreground" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold mb-4 mt-8 text-foreground" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold mb-3 mt-4 text-foreground border-b border-gray-200 dark:border-gray-700 pb-2" {...props} />
                  ),
                  h5: ({ node, ...props }) => (
                    <h5 className="text-base font-semibold mb-2 mt-3 text-foreground" {...props} />
                  ),
                  h6: ({ node, ...props }) => (
                    <h6 className="text-sm font-semibold mb-2 mt-3 text-foreground" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="mb-4 leading-relaxed text-foreground" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="mb-1 leading-relaxed" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote 
                      className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-3 mb-4 italic rounded-r-md" 
                      {...props} 
                    />
                  ),
                  code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg mb-4"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto mb-6">
                      <table
                        className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg"
                        {...props}
                      />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold"
                      {...props}
                    />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" {...props} />
                  ),
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-gray-300 dark:border-gray-600" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-foreground" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="italic" {...props} />
                  ),
                  del: ({ node, ...props }) => (
                    <del className="line-through" {...props} />
                  ),
                  input: ({ node, ...props }) => (
                    <input
                      type="checkbox"
                      disabled
                      className="mr-2 accent-primary"
                      {...props}
                    />
                  ),
                  img: ({ node, ...props }) => (
                    <img
                      className="max-w-full h-auto my-4 rounded-lg shadow-md"
                      {...props}
                    />
                  ),
                }}
              >
                {output.content}
              </ReactMarkdown>
            </div>
          </div>
        </ScrollArea>
      </div>
    </article>
  )
}