// app/quick-study/outputs/viewers/components/ContentItemRenderer.tsx
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { HoverHandlers } from '../hooks/useNotesHover'

import 'katex/dist/katex.min.css'

interface ContentItem {
  id: string
  content: string
  type: 'paragraph' | 'list' | 'code' | 'quote' | 'other'
}

interface ContentItemRendererProps {
  contentItem: ContentItem
  hoverHandlers: HoverHandlers
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
}

export function ContentItemRenderer({ 
  contentItem, 
  hoverHandlers,
  onClick 
}: ContentItemRendererProps) {
  const { id, content, type } = contentItem
  
  // Determine hover color based on content type
  const getHoverColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'list': return '168, 85, 247'        // Purple for lists
      case 'code': return '239, 68, 68'         // Red for code
      case 'quote': return '34, 197, 94'        // Green for quotes
      case 'other': return '250, 204, 21'       // Yellow for tables/other
      default: return '34, 197, 94'             // Green for paragraphs
    }
  }
  
  // Determine element type for hover handler
  const getElementType = (type: ContentItem['type']) => {
    switch (type) {
      case 'list': return content.trim().match(/^\d+\./) ? 'ordered-list' : 'unordered-list'
      case 'code': return 'code-block'
      case 'quote': return 'blockquote'
      case 'other': return content.includes('|') ? 'table' : 'other'
      default: return 'paragraph'
    }
  }
  
  const elementType = getElementType(type)
  const hoverColor = getHoverColor(type)
  const handlers = hoverHandlers.createHoverHandler(elementType, hoverColor)
  
  // Create markdown components WITHOUT their own IDs
  const markdownComponents = {
    p: ({ children, ...props }: any) => (
      <p className="mb-4 leading-relaxed text-foreground" {...props}>
        {children}
      </p>
    ),

    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }: any) => (
      <li className="text-foreground leading-relaxed" {...props}>
        {children}
      </li>
    ),

    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border-collapse bg-background" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }: any) => (
      <thead className="bg-muted" {...props}>
        {children}
      </thead>
    ),

    tbody: ({ children, ...props }: any) => (
      <tbody {...props}>
        {children}
      </tbody>
    ),

    tr: ({ children, ...props }: any) => (
      <tr className="border-b border-border hover:bg-muted/50 transition-colors" {...props}>
        {children}
      </tr>
    ),

    th: ({ children, ...props }: any) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border last:border-r-0" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }: any) => (
      <td className="px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top" {...props}>
        {children}
      </td>
    ),

    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 italic text-foreground" {...props}>
        {children}
      </blockquote>
    ),

    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      
      if (!inline && match) {
        return (
          <div className="mb-6 rounded-lg overflow-hidden border border-border">
            <div className="bg-muted px-4 py-2 text-sm text-muted-foreground border-b border-border">
              {match[1]}
            </div>
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="!m-0 !bg-background text-sm"
              showLineNumbers={true}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        )
      }
      
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      )
    },

    strong: ({ children, ...props }: any) => (
      <strong className="font-bold text-foreground" {...props}>
        {children}
      </strong>
    ),

    em: ({ children, ...props }: any) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),

    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),

    hr: ({ ...props }: any) => (
      <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
    ),

    h1: ({ children, ...props }: any) => (
      <h1 className="text-3xl font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-200 dark:border-gray-700 text-foreground" {...props}>
        {children}
      </h1>
    ),

    h2: ({ children, ...props }: any) => (
      <h2 className="text-2xl font-bold mb-4 mt-8 text-foreground" {...props}>
        {children}
      </h2>
    ),

    h3: ({ children, ...props }: any) => (
      <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props}>
        {children}
      </h3>
    ),

    h4: ({ children, ...props }: any) => (
      <h4 className="text-lg font-semibold mb-3 mt-4 text-foreground border-b border-gray-200 dark:border-gray-700 pb-2" {...props}>
        {children}
      </h4>
    ),

    h5: ({ children, ...props }: any) => (
      <h5 className="text-base font-semibold mb-2 mt-3 text-foreground" {...props}>
        {children}
      </h5>
    ),

    h6: ({ children, ...props }: any) => (
      <h6 className="text-sm font-semibold mb-2 mt-3 text-foreground uppercase tracking-wide" {...props}>
        {children}
      </h6>
    ),
  }
  
  return (
    <div
      key={id}
      data-element-id={id} // <- PRAWDZIWE ID Z parsedSections!
      className="mb-4 cursor-pointer section-content-element relative"
      style={{ overflow: 'visible', minWidth: '0' }}
      onClick={onClick}
      {...handlers} // Apply hover handlers to the container
    >
      <div className="markdown-content text-sm text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}