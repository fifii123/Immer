// app/quick-study/outputs/viewers/NotesViewer.tsx - WITH EDIT MODAL
"use client" 

import React, { useState, useMemo, useCallback } from 'react'
import { 
  PenTool, Copy, Download, FileText, List, Table, ChevronDown, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

// Import our extracted components and hooks
import { useNotesHover } from './hooks/useNotesHover'
import { MarkdownRenderer } from './components/MarkdownRenderer'
import { EditModalProvider } from './components/EditModalProvider'

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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)

  // Parsowanie markdown - memoized (IMPROVED LOGIC FROM PASTE2)
  const parsedSections = useMemo(() => {
    if (!output?.content) return []
    
    const lines = output.content.split('\n')
    const sections: ParsedSection[] = []
    const stack: ParsedSection[] = []
    let currentContent: string[] = []

    const flushContent = () => {
      if (currentContent.length > 0) {
        const target = stack.length > 0 ? 
          stack[stack.length - 1] : 
          null
        
        if (target) {
          // Join content lines and push as single content item
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
        
        const newSection: ParsedSection = {
          id,
          level,
          title,
          content: [],
          children: []
        }
        
        // Handle section hierarchy
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }
        
        if (stack.length === 0) {
          sections.push(newSection)
        } else {
          stack[stack.length - 1].children.push(newSection)
        }
        
        stack.push(newSection)
      } else {
        // Add line to current content (including empty lines)
        currentContent.push(line)
      }
    }
    
    flushContent()
    return sections
  }, [output?.content])

  // Memoized section content collector (UNCHANGED)
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

  // Handler dla wszystkich elementów - teraz jako callback dla hoverHandlers
  const handleElementEdit = useCallback((event: React.MouseEvent<HTMLElement>, elementType: string) => {
    event.preventDefault()
    event.stopPropagation()
    
    const element = event.currentTarget
    const openEditModal = (window as any).currentOpenEditModal
    
    if (!openEditModal) return
    
    // Get content from data attribute or textContent
    let content = element.getAttribute('data-content') || element.textContent || ''
    
    // If no data-content, try to extract content based on element type
    if (!element.getAttribute('data-content')) {
      if (elementType.startsWith('complete-section')) {
        // For sections, we need to get the full section content
        const sectionId = element.getAttribute('data-section-id')
        if (sectionId) {
          // Find the section in parsedSections and get its content
          const findSection = (sections: ParsedSection[], id: string): ParsedSection | null => {
            for (const section of sections) {
              if (section.id === id) return section
              const found = findSection(section.children, id)
              if (found) return found
            }
            return null
          }
          const section = findSection(parsedSections, sectionId)
          if (section) {
            content = getSectionContent(section)
          }
        }
      } else {
        // For other elements, use textContent or innerHTML
        content = element.textContent || element.innerHTML || ''
      }
    }
    
    const actualElementType = element.getAttribute('data-element-type') || elementType
    
    const clickPosition = {
      x: event.clientX,
      y: event.clientY
    }
    
    openEditModal(content, actualElementType, element, clickPosition)
  }, [parsedSections, getSectionContent])

  const hoverHandlers = useNotesHover({
    isAnimating,
    onElementClick: handleElementEdit // Use handleElementEdit for all clicks
  })

  // Section handlers (UNCHANGED)
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  // Copy and download handlers (UNCHANGED)
  const handleCopy = useCallback(async () => {
    if (!output?.content) return
    
    try {
      await navigator.clipboard.writeText(output.content)
      toast({
        title: "Copied!",
        description: "Notes copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy notes",
        variant: "destructive",
      })
    }
  }, [output?.content, toast])

  const handleDownload = useCallback(() => {
    if (!output?.content) return
    
    const blob = new Blob([output.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${output.title || 'notes'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Downloaded!",
      description: "Notes saved as markdown file",
    })
  }, [output, toast])

  // Helper to detect content type (same logic as before)
  const getContentType = useCallback((content: string) => {
    if (content.includes('|') && content.split('\n').filter(line => line.includes('|')).length > 1) return 'table'
    if (/^[\s]*[-*+]\s/.test(content)) return 'unordered-list'
    if (/^[\s]*\d+\.\s/.test(content)) return 'ordered-list'  
    if (content.startsWith('>')) return 'blockquote'
    return 'paragraph'
  }, [])

// Modified renderSection - teraz używa hoverHandlers dla wszystkich elementów
const renderSection = useCallback((section: ParsedSection, openEditModal: any): React.ReactNode => {
  const isCollapsed = collapsedSections.has(section.id)
  const HeadingTag = `h${Math.min(section.level, 6)}` as keyof JSX.IntrinsicElements
  const headingId = `heading-${section.id}`
  
  const getHeadingClasses = (level: number) => {
    switch (level) {
      case 1: return "text-3xl font-bold border-b-2 border-gray-200 dark:border-gray-700 pb-3"
      case 2: return "text-2xl font-bold"
      case 3: return "text-xl font-semibold"
      case 4: return "text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2"
      case 5: return "text-base font-semibold"
      case 6: return "text-sm font-semibold"
      default: return "text-base font-semibold"
    }
  }
  
  // Sprawdź czy sekcja ma jakąkolwiek zawartość (content lub children)
  const hasContent = section.content.some(item => item.trim()) || section.children.length > 0
  
  return (
    <div key={section.id} className="section-container mb-6 first:mt-8">
      <div 
        className="flex items-center gap-2 mb-3 group relative"
      >
        {/* Collapse/Expand Button - pokazuj dla wszystkich sekcji z zawartością */}
        {hasContent && (
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              toggleSection(section.id)
            }}
            title={isCollapsed ? "Rozwiń sekcję" : "Zwiń sekcję"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {/* Spacer dla sekcji bez zawartości */}
        {!hasContent && <div className="w-6 h-6 shrink-0" />}
        
        {/* Section Title - clickable for EditModal, używa hoverHandlers */}
        <HeadingTag
          id={headingId}
          data-section-id={section.id}
          data-content={getSectionContent(section)}
          data-element-type={`complete-section-${section.level}`}
          className={`${getHeadingClasses(section.level)} text-foreground cursor-pointer hover:text-primary transition-colors flex-1 leading-6 flex items-center px-2 py-1 -mx-2 -my-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20`}
          style={{ marginBottom: 0, marginTop: 0 }}
          onClick={(e) => {
            // Store openEditModal globally for handleElementEdit
            (window as any).currentOpenEditModal = openEditModal
            // Call handleElementEdit directly
            handleElementEdit(e, `complete-section-${section.level}`)
          }}
          onMouseEnter={(e) => hoverHandlers.applySectionHoverStyles(e, section.id, section.level)}
          onMouseLeave={hoverHandlers.clearSectionHoverStyles}
        >
          {section.title}
        </HeadingTag>
      </div>

      {/* Zawartość sekcji - pokazuj tylko gdy nie jest zwinięta */}
      {!isCollapsed && hasContent && (
        <div className="section-content pl-4">
          {/* Section content - każdy element używa hoverHandlers */}
          {section.content.map((contentItem, index) => (
            contentItem.trim() && (
              <div key={index} className="mb-4">
                <MarkdownRenderer 
                  content={contentItem}
                  hoverHandlers={hoverHandlers}
                />
              </div>
            )
          ))}
          
          {/* Child sections */}
          {section.children.length > 0 && (
            <div className="subsections-container">
              {section.children.map(childSection => renderSection(childSection, openEditModal))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}, [collapsedSections, toggleSection, hoverHandlers, getSectionContent, handleElementEdit])

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select notes to view</p>
      </div>
    )
  }

  const noteTypeInfo = getNoteTypeInfo(output.noteType)

  return (
    <EditModalProvider>
      {(openEditModal) => (
        <div className="h-full flex flex-col bg-background">
          {/* Header (UNCHANGED) */}
          <header className="flex-shrink-0 p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {noteTypeInfo.icon}
                  <span className="text-sm font-medium">
                    {"Tip: Click to edit"}
                  </span>
                </div>
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
          </header>

          {/* Content with Hierarchical Sections */}
          <div className="flex-1 max-w-4xl mx-auto w-full">
            <ScrollArea className="h-full">
              <div className="p-6 rounded-xl bg-muted/50">
                <div className="space-y-6">
                  {parsedSections.map(section => renderSection(section, openEditModal))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </EditModalProvider>
  )
}