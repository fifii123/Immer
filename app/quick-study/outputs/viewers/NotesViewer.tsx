// app/quick-study/outputs/viewers/NotesViewer.tsx - Optimized AI Action Panel
"use client" 

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { 
  PenTool, Copy, Download, FileText, List, Table, ChevronDown, ChevronRight,
  Edit3, Sparkles, Eye, Zap, BookOpen, MessageSquare, Brain, Sliders, 
  RotateCcw, Type, HelpCircle, X, Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
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

interface ParsedSection {
  id: string;
  level: number;
  title: string;
  content: string[];
  children: ParsedSection[];
}

interface AIActionPanel {
  isVisible: boolean;
  element: HTMLElement | null;
  content: string;
  elementType: string;
  position: { x: number; y: number };
  detailLevel: number;
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

// Smart Suggestions - memoized for performance
const getSmartSuggestion = (elementType: string, content: string): string => {
  const wordCount = content?.split(/\s+/).length || 0
  
  switch (elementType) {
    case 'paragraph':
      if (wordCount > 50) return "📝 Break into bullet points for better readability"
      if (wordCount < 10) return "🔍 Add more details and examples"
      return "✨ Add visual formatting (bold key terms)"
    
    case 'unordered-list':
    case 'ordered-list':
      if (wordCount < 20) return "📋 Add sub-items for more structure"
      return "🎯 Convert to numbered steps or action items"
    
    case 'table':
      return "📊 Add summary row or highlight key data"
    
    case 'blockquote':
      return "🔗 Add source attribution or expand context"
    
    case 'complete-section-1':
    case 'complete-section-2':
      return "🏗️ Break into smaller subsections"
    
    case 'complete-section-3':
    case 'complete-section-4':
    case 'complete-section-5':
    case 'complete-section-6':
      return "🎨 Add visual elements (diagrams, examples)"
    
    default:
      return "🚀 Enhance with AI-powered improvements"
  }
}

export default function NotesViewer({ output, selectedSource }: NotesViewerProps) {
  const { toast } = useToast()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  
  // Optimized state management
  const [actionPanel, setActionPanel] = useState<AIActionPanel | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Refs for performance
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredRef = useRef<string | null>(null)

  // Cleanup timeouts przy unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  // Obsługa klawisza Escape - optimized
  React.useEffect(() => {
    if (!actionPanel) return
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeActionPanel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [actionPanel?.isVisible])

  // Parsowanie markdown - memoized
  const parsedSections = useMemo(() => {
    if (!output?.content) return []
    
    const lines = output.content.split('\n')
    const sections: ParsedSection[] = []
    const stack: ParsedSection[] = []
    let currentContent: string[] = []

    const flushContent = () => {
      if (currentContent.length > 0) {
        const target = stack.length > 0 ? stack[stack.length - 1] : null
        if (target) {
          target.content.push(currentContent.join('\n'))
        }
        currentContent = []
      }
    }

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headingMatch) {
        flushContent()
        
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        const id = title
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .slice(0, 20) || 'section-' + Math.random().toString(36).substr(2, 6)

        const section: ParsedSection = {
          id,
          level,
          title,
          content: [],
          children: []
        }

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        if (stack.length === 0) {
          sections.push(section)
        } else {
          stack[stack.length - 1].children.push(section)
        }

        stack.push(section)
      } else {
        currentContent.push(line)
      }
    }

    flushContent()
    return sections
  }, [output?.content])

  // Optimized handlers
  const handleCopy = useCallback(async () => {
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
  }, [output?.content, toast])

  const handleDownload = useCallback(async (format: 'md' | 'pdf' = 'md') => {
    if (!output?.content) return;

    if (format === 'md') {
      const blob = new Blob([output.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${output.title}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      try {
        const { default: html2pdf } = await import('html2pdf.js');
        const notesElement = document.querySelector('.markdown-content');
        if (!notesElement) return;

        const opt = {
          margin: 10,
          filename: `${output.title}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(notesElement).save();
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: "PDF generation failed",
          description: "Could not generate PDF",
          variant: "destructive"
        });
      }
    }
  }, [output?.content, output?.title, toast])

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(sectionId)) {
        newCollapsed.delete(sectionId)
      } else {
        newCollapsed.add(sectionId)
      }
      return newCollapsed
    })
  }, [])

  // Optimized section hover with debouncing
  const handleSectionHover = useCallback((event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => {
    if (level <= 2 || isAnimating) return
    
    event.stopPropagation()
    
    const sectionContainer = event.currentTarget.closest('.section-container') as HTMLElement
    if (!sectionContainer) return

    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Apply hover styles immediately
    Object.assign(sectionContainer.style, {
      backgroundColor: `rgba(59, 130, 246, 0.08)`,
      border: `2px solid rgba(59, 130, 246, 0.2)`,
      borderRadius: '8px',
      padding: '12px',
      margin: '8px 0',
      transition: 'all 0.2s ease-in-out',
      boxShadow: `0 2px 4px rgba(59, 130, 246, 0.15)`
    })

    lastHoveredRef.current = sectionId
  }, [isAnimating])

  const clearSectionHoverStyles = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const sectionContainer = event.currentTarget.closest('.section-container') as HTMLElement
    if (!sectionContainer) return
    
    const headingElement = sectionContainer.querySelector('[data-section-id]') as HTMLElement
    const level = parseInt(headingElement?.tagName.charAt(1) || '1')
    
    if (level <= 2) return
    
    lastHoveredRef.current = null
    
    Object.assign(sectionContainer.style, {
      backgroundColor: '',
      border: '',
      borderRadius: '',
      padding: '',
      margin: '',
      boxShadow: '',
      transition: 'all 0.2s ease-in-out'
    })
    
    setTimeout(() => {
      if (sectionContainer.style.transition) {
        sectionContainer.style.transition = ''
      }
    }, 200)
  }, [])

  // Optimized element click handler with debouncing
  const handleElementClick = useCallback((event: React.MouseEvent<HTMLElement>, elementType: string) => {
    if (isAnimating) return
    
    event.preventDefault()
    event.stopPropagation()
    
    setIsAnimating(true)
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }
    
    const element = event.currentTarget
    const content = element.textContent || element.innerHTML || 'Brak zawartości'
    
    // Log to console (replacement for debug panel)
    console.group(`🎯 Element Clicked: ${elementType}`)
    console.log('Content:', content.trim())
    console.log('Element:', element)
    console.log('Length:', content.length, 'characters')
    console.log('Word count:', content.trim().split(/\s+/).length, 'words')
    console.groupEnd()
    
    // Wait for any ongoing animations to complete
    animationTimeoutRef.current = setTimeout(() => {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      setActionPanel({
        isVisible: true,
        element,
        content: content.trim(),
        elementType,
        position: {
          x: rect.left + scrollLeft + rect.width / 2,
          y: rect.top + scrollTop - 10
        },
        detailLevel: 3
      })
      
      setIsAnimating(false)
    }, 150) // Wait for animations to complete
  }, [isAnimating])

  const closeActionPanel = useCallback(() => {
    setActionPanel(null)
    setIsAnimating(false)
  }, [])

  // Memoized section content collector
  const getSectionContent = useCallback((section: ParsedSection): string => {
    let content = `# ${section.title}\n\n`
    
    section.content.forEach(contentItem => {
      if (contentItem.trim()) {
        content += contentItem + '\n\n'
      }
    })
    
    section.children.forEach(childSection => {
      content += getSectionContent(childSection)
    })
    
    return content
  }, [])

  // Detail level utilities - memoized
  const getDetailLevelColor = useCallback((level: number): string => {
    switch (level) {
      case 1: return 'text-blue-500'
      case 2: return 'text-cyan-500'
      case 3: return 'text-green-500'
      case 4: return 'text-yellow-500'
      case 5: return 'text-red-500'
      default: return 'text-gray-500'
    }
  }, [])

  const getDetailLevelEmoji = useCallback((level: number): string => {
    switch (level) {
      case 1: return '🟦'
      case 2: return '🟨'
      case 3: return '🟩'
      case 4: return '🟧'
      case 5: return '🟥'
      default: return '⚪'
    }
  }, [])

  // Optimized transformation handler
  const handleTransformation = useCallback((type: 'tldr' | 'paraphrase' | 'quiz') => {
    if (!actionPanel) return
    
    console.group(`🔄 Transformation: ${type.toUpperCase()}`)
    console.log('Original content:', actionPanel.content)
    console.log('Detail level:', actionPanel.detailLevel)
    console.log('Element type:', actionPanel.elementType)
    console.groupEnd()
    
    toast({
      title: `${type.toUpperCase()} Transformation`,
      description: `Processing ${actionPanel.elementType} content...`,
    })
  }, [actionPanel, toast])

  // Optimized hover handler for markdown elements
  const createHoverHandler = useCallback((elementType: string, color: string) => {
    return {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        if (isAnimating) return
        
        const intensity = 0.06
        const element = e.currentTarget
        Object.assign(element.style, {
          backgroundColor: `rgba(${color}, ${intensity})`,
          borderLeft: `3px solid rgba(${color}, ${intensity * 4})`,
          borderRadius: '6px',
          padding: '8px 12px',
          margin: '4px -12px',
          transition: 'all 0.15s ease-in-out'
        })
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        const element = e.currentTarget
        Object.assign(element.style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          transition: 'all 0.15s ease-in-out'
        })
        
        setTimeout(() => {
          if (element.style.transition) {
            element.style.transition = ''
          }
        }, 150)
      },
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        handleElementClick(e, elementType)
      }
    }
  }, [handleElementClick, isAnimating])

  // Optimized markdown components
  const createMarkdownComponents = useMemo(() => ({
    p: ({ node, children, ...props }: any) => {
      const elementId = `p-${Math.random().toString(36).substr(2, 9)}`
      const handlers = createHoverHandler('paragraph', '34, 197, 94')
      
      return (
        <p
          id={elementId}
          className="mb-4 leading-relaxed text-foreground cursor-pointer section-content-element relative"
          {...handlers}
          {...props}
        >
          {children}
        </p>
      )
    },

    ul: ({ node, children, ...props }: any) => {
      const elementId = `ul-${Math.random().toString(36).substr(2, 9)}`
      const handlers = createHoverHandler('unordered-list', '168, 85, 247')
      
      return (
        <ul
          id={elementId}
          className="list-disc list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element relative"
          {...handlers}
          {...props}
        >
          {children}
        </ul>
      )
    },

    ol: ({ node, children, ...props }: any) => {
      const elementId = `ol-${Math.random().toString(36).substr(2, 9)}`
      const handlers = createHoverHandler('ordered-list', '168, 85, 247')
      
      return (
        <ol
          id={elementId}
          className="list-decimal list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element relative"
          {...handlers}
          {...props}
        >
          {children}
        </ol>
      )
    },

    table: ({ node, children, ...props }: any) => {
      const elementId = `table-${Math.random().toString(36).substr(2, 9)}`
      
      return (
        <div className="overflow-x-auto mb-6">
          <table
            id={elementId}
            className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer section-content-element relative"
            onMouseEnter={(e) => {
              if (isAnimating) return
              const element = e.currentTarget
              Object.assign(element.style, {
                backgroundColor: `rgba(249, 115, 22, 0.06)`,
                border: `2px solid rgba(249, 115, 22, 0.24)`,
                borderRadius: '8px',
                padding: '4px',
                transition: 'all 0.15s ease-in-out'
              })
            }}
            onMouseLeave={(e) => {
              const element = e.currentTarget
              Object.assign(element.style, {
                backgroundColor: '',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '',
                padding: '',
                transition: 'all 0.15s ease-in-out'
              })
              
              setTimeout(() => {
                if (element.style.transition) {
                  element.style.transition = ''
                }
                element.style.border = ''
              }, 150)
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleElementClick(e, 'table')
            }}
            {...props}
          >
            {children}
          </table>
        </div>
      )
    },

    blockquote: ({ node, children, ...props }: any) => {
      const elementId = `blockquote-${Math.random().toString(36).substr(2, 9)}`
      
      return (
        <blockquote
          id={elementId}
          className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-3 mb-4 italic rounded-r-md cursor-pointer section-content-element relative"
          onMouseEnter={(e) => {
            if (isAnimating) return
            const element = e.currentTarget
            Object.assign(element.style, {
              backgroundColor: `rgba(34, 197, 94, 0.06)`,
              borderRadius: '6px',
              transform: 'translateX(2px)',
              transition: 'all 0.15s ease-in-out'
            })
          }}
          onMouseLeave={(e) => {
            const element = e.currentTarget
            Object.assign(element.style, {
              backgroundColor: '',
              transform: '',
              transition: 'all 0.15s ease-in-out'
            })
            
            setTimeout(() => {
              if (element.style.transition) {
                element.style.transition = ''
              }
            }, 150)
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleElementClick(e, 'blockquote')
          }}
          {...props}
        >
          {children}
        </blockquote>
      )
    },

    // Pozostałe elementy bez zmian
    li: ({ node, ...props }: any) => <li className="mb-1 leading-relaxed" {...props} />,
    thead: ({ node, ...props }: any) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
    th: ({ node, ...props }: any) => <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody {...props} />,
    tr: ({ node, ...props }: any) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50" {...props} />,
    td: ({ node, ...props }: any) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" {...props} />,
    hr: ({ node, ...props }: any) => <hr className="my-8 border-gray-300 dark:border-gray-600" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    del: ({ node, ...props }: any) => <del className="line-through" {...props} />,
    input: ({ node, ...props }: any) => <input type="checkbox" disabled className="mr-2 accent-primary" {...props} />,
    img: ({ node, ...props }: any) => <img className="max-w-full h-auto my-4 rounded-lg shadow-md" {...props} />,
    
    code: ({ node, inline, className, children, ...props }: any) => {
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
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    },
    
    pre: ({ node, ...props }: any) => <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6" {...props} />,
    a: ({ node, ...props }: any) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    
    h1: () => null,
    h2: () => null,
    h3: () => null,
    h4: () => null,
    h5: () => null,
    h6: () => null,
  }), [createHoverHandler, handleElementClick, isAnimating])

  // Optimized renderSection
  const renderSection = useCallback((section: ParsedSection, depth: number = 0) => {
    const isCollapsed = collapsedSections.has(section.id)
    const HeadingTag = `h${Math.min(section.level, 6)}` as keyof JSX.IntrinsicElements
    
    const getHeadingClasses = (level: number) => {
      switch (level) {
        case 1: return "text-3xl font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-200 dark:border-gray-700"
        case 2: return "text-2xl font-bold mb-4 mt-8"
        case 3: return "text-xl font-semibold mb-3 mt-6"
        case 4: return "text-lg font-semibold mb-3 mt-4 border-b border-gray-200 dark:border-gray-700 pb-2"
        case 5: return "text-base font-semibold mb-2 mt-3"
        case 6: return "text-sm font-semibold mb-2 mt-3"
        default: return "text-base font-semibold mb-2 mt-3"
      }
    }

    const shouldHaveHover = section.level > 2

    return (
      <div 
        key={section.id} 
        className="section-container relative" 
        style={{ marginLeft: `${depth * 20}px` }}
        {...(shouldHaveHover && {
          onMouseEnter: (e) => handleSectionHover(e, section.id, section.level),
          onMouseLeave: clearSectionHoverStyles
        })}
      >
        <HeadingTag
          className={`${getHeadingClasses(section.level)} text-foreground group flex items-center gap-3 select-none cursor-pointer relative z-10 section-heading`}
          data-section-id={section.id}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('.toggle-button')) {
              return
            } else {
              e.preventDefault()
              e.stopPropagation()
              
              const sectionContent = getSectionContent(section)
              
              console.group(`🎯 Section Clicked: ${section.title}`)
              console.log('Full section content:', sectionContent.trim())
              console.log('Section level:', section.level)
              console.log('Has children:', section.children.length > 0)
              console.groupEnd()
              
              if (!isAnimating) {
                handleElementClick(e, `complete-section-${section.level}`)
              }
            }
          }}
        >
          <button 
            className="toggle-button flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              toggleSection(section.id)
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-blue-500 opacity-70 hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-500 opacity-70 hover:opacity-100 transition-opacity" />
            )}
          </button>
          
          <span className="flex-1">{section.title}</span>
        </HeadingTag>

        {!isCollapsed && (
          <div className="section-content space-y-4 relative">
            {section.content.map((content, index) => (
              content.trim() && (
                <div key={index} className="section-content-item">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={createMarkdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )
            ))}

            {section.children.length > 0 && (
              <div className="subsections-container">
                {section.children.map(childSection => 
                  renderSection(childSection, depth + 1)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }, [collapsedSections, handleSectionHover, clearSectionHoverStyles, getSectionContent, handleElementClick, toggleSection, createMarkdownComponents, isAnimating])

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

        <div className="flex justify-center mt-4 mb-4">
          <Badge className={`${noteTypeInfo.color} px-3 py-1 text-sm font-medium`}>
            <span className="flex items-center gap-1">
              {noteTypeInfo.icon}
              {noteTypeInfo.title}
            </span>
          </Badge>
        </div>

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

      {/* Content with Hierarchical Sections */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <ScrollArea className="h-full">
          <div className="p-6 rounded-xl bg-muted/50">
            <div className="markdown-content text-sm text-foreground space-y-6">
              {parsedSections.map(section => renderSection(section))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* AI Action Panel - Only shown after animations complete */}
      {actionPanel && !isAnimating && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={closeActionPanel}
          />
          
          <div
            className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl p-6 max-w-sm w-96"
            style={{
              left: `${Math.max(10, Math.min(actionPanel.position.x - 192, window.innerWidth - 400))}px`,
              top: `${Math.max(10, Math.min(actionPanel.position.y - 50, window.innerHeight - 400))}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    AI Actions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {actionPanel.elementType.replace('-', ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={closeActionPanel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Detail Level Slider */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Sliders className="h-3 w-3" />
                  Detail Level
                </span>
                <span className={`text-xs font-medium ${getDetailLevelColor(actionPanel.detailLevel)}`}>
                  {getDetailLevelEmoji(actionPanel.detailLevel)} {actionPanel.detailLevel}
                </span>
              </div>
              <Slider
                value={[actionPanel.detailLevel]}
                onValueChange={(value) => setActionPanel({...actionPanel, detailLevel: value[0]})}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>🟦 Brief</span>
                <span>🟩 Balanced</span>
                <span>🟥 Detailed</span>
              </div>
            </div>

            {/* Transformations */}
            <div className="mb-5">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Transformations
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTransformation('tldr')}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>TLDR</span>
                </button>
                <button
                  onClick={() => handleTransformation('paraphrase')}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
                >
                  <Type className="h-4 w-4 text-blue-500" />
                  <span>Rephrase</span>
                </button>
                <button
                  onClick={() => handleTransformation('quiz')}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
                >
                  <HelpCircle className="h-4 w-4 text-green-500" />
                  <span>Quiz</span>
                </button>
              </div>
            </div>

            {/* Smart Suggestion */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Smart Suggestion
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {getSmartSuggestion(actionPanel.elementType, actionPanel.content)}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Preview
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs text-gray-800 dark:text-gray-200 max-h-20 overflow-y-auto">
                {actionPanel.content.length > 100 
                  ? `${actionPanel.content.substring(0, 100)}...`
                  : actionPanel.content
                }
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  )
}