// app/quick-study/outputs/viewers/NotesViewer.tsx - COMPLETE FILE WITH SMART PREVIEW
"use client" 

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { 
  PenTool, Copy, Download, FileText, List, Table, ChevronDown, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

// Import our extracted components and hooks
import { useNotesHover } from './hooks/useNotesHover'
import { ContentItemRenderer } from './components/ContentItemRenderer'
import { EditModalProvider } from './components/EditModalProvider'
import { SmartPreviewPanel } from './components/SmartPreviewPanel'

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
  sessionId?: string;
}

interface ParsedSection {
  id: string;           // unique ID for this section
  level: number;
  title: string;
  content: ContentItem[];  // Changed from string[] to ContentItem[]
  children: ParsedSection[];
}

interface ContentItem {
  id: string;           // unique ID for this content item
  content: string;      // actual markdown content
  type: 'paragraph' | 'list' | 'code' | 'quote' | 'other';
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

export default function NotesViewer({ output, selectedSource, sessionId }: NotesViewerProps) {
  const { toast } = useToast()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [localContent, setLocalContent] = useState(output?.content || '')

  // Smart Preview state - ONLY ADDITION
  const [smartPreviewState, setSmartPreviewState] = useState<{
    isOpen: boolean
    sectionId: string | null
    sectionContent: string
    position: { top: number; left: number } | null
  }>({
    isOpen: false,
    sectionId: null,
    sectionContent: '',
    position: null
  })

  // Update lokalnego content gdy output się zmienia
  useEffect(() => {
    if (output?.content) {
      setLocalContent(output.content)
    }
  }, [output?.content])

  // Helper functions for parsing
  const generateSectionId = () => `section-${Math.random().toString(36).substr(2, 9)}`
  const generateContentId = () => `content-${Math.random().toString(36).substr(2, 9)}`

  // Split content into semantic blocks with proper type detection
  const splitIntoSemanticBlocks = useCallback((content: string[]): { content: string; type: ContentItem['type'] }[] => {
    if (content.length === 0) return []
    
    const blocks: { content: string; type: ContentItem['type'] }[] = []
    let currentBlock: string[] = []
    let currentType: ContentItem['type'] = 'paragraph'
    
    const determineBlockType = (lines: string[]): ContentItem['type'] => {
      const joinedContent = lines.join('\n').trim()
      
      if (joinedContent.includes('|') && lines.filter(line => line.includes('|')).length > 1) return 'other' // table
      if (lines.some(line => /^[\s]*[-*+]\s/.test(line))) return 'list'
      if (lines.some(line => /^[\s]*\d+\.\s/.test(line))) return 'list'
      if (lines.some(line => line.trim().startsWith('>'))) return 'quote'
      if (joinedContent.startsWith('```')) return 'code'
      return 'paragraph'
    }
    
    const flushBlock = () => {
      if (currentBlock.length > 0) {
        const blockContent = currentBlock.join('\n').trim()
        if (blockContent) {
          blocks.push({
            content: blockContent,
            type: currentType
          })
        }
        currentBlock = []
      }
    }
    
    for (let i = 0; i < content.length; i++) {
      const line = content[i]
      const isEmpty = line.trim() === ''
      
      if (isEmpty) {
        if (currentBlock.length > 0) {
          // Empty line might signal end of block
          const nextNonEmptyIndex = content.slice(i + 1).findIndex(l => l.trim() !== '')
          if (nextNonEmptyIndex !== -1) {
            const nextLine = content[i + 1 + nextNonEmptyIndex]
            const nextBlockType = determineBlockType([nextLine])
            
            if (nextBlockType !== currentType) {
              flushBlock()
              currentType = nextBlockType
            } else {
              currentBlock.push(line) // Keep empty line within same block type
            }
          } else {
            currentBlock.push(line) // Last empty line
          }
        }
      } else {
        if (currentBlock.length === 0) {
          currentType = determineBlockType([line])
        }
        currentBlock.push(line)
      }
    }
    
    flushBlock()
    return blocks
  }, [])

  // COMPLEX parsing with hierarchical sections
  const parsedSections = useMemo(() => {
    if (!localContent) return []

    const lines = localContent.split('\n')
    const sections: ParsedSection[] = []
    const stack: ParsedSection[] = []
    let currentContent: string[] = []

    const flushContent = () => {
      if (currentContent.length === 0) return
      
      const target = stack.length > 0 ? stack[stack.length - 1] : null
      
      if (target) {
        // SEMANTIC SPLIT: Parse mixed content into semantic blocks
        const semanticBlocks = splitIntoSemanticBlocks(currentContent)
        
        // Create separate ContentItem for each semantic block
        semanticBlocks.forEach((block, index) => {
          console.log(`Block ${index}:`, {
            type: block.type,
            content: block.content.substring(0, 50) + '...'
          })
          
          target.content.push({
            id: generateContentId(),
            content: block.content,
            type: block.type
          })
        })
      }
      currentContent = []
    }

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headingMatch) {
        flushContent()
        
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        
        const newSection: ParsedSection = {
          id: generateSectionId(),
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
  }, [localContent, splitIntoSemanticBlocks])

  // Helper function to find element by ID in parsed sections
  const findElementById = useCallback((sections: ParsedSection[], elementId: string): { type: 'section' | 'content', section?: ParsedSection, contentItem?: ContentItem, parent?: ParsedSection } | null => {
    for (const section of sections) {
      // Check if this section matches
      if (section.id === elementId) {
        return { type: 'section', section }
      }
      
      // Check content items in this section
      for (const contentItem of section.content) {
        if (contentItem.id === elementId) {
          return { type: 'content', contentItem, parent: section }
        }
      }
      
      // Recursively check children
      const childResult = findElementById(section.children, elementId)
      if (childResult) {
        return childResult
      }
    }
    
    return null
  }, [])

  // Helper function to regenerate markdown from parsed sections
  const regenerateMarkdown = useCallback((sections: ParsedSection[]): string => {
    let markdown = ''
    
    const processSection = (section: ParsedSection): string => {
      let sectionMarkdown = ''
      
      // Add section title
      const headingPrefix = '#'.repeat(section.level)
      sectionMarkdown += `${headingPrefix} ${section.title}\n\n`
      
      // Add content items
      section.content.forEach(contentItem => {
        if (contentItem.content.trim()) {
          sectionMarkdown += contentItem.content + '\n\n'
        }
      })
      
      // Add child sections
      section.children.forEach(childSection => {
        sectionMarkdown += processSection(childSection)
      })
      
      return sectionMarkdown
    }
    
    sections.forEach(section => {
      markdown += processSection(section)
    })
    
    return markdown.trim()
  }, [])

  const handleContentSaved = useCallback((element: HTMLElement, newContent: string, elementId?: string) => {
    console.log('🔄 handleContentSaved called')
    console.log('📋 New content length:', newContent.length)
    console.log('🎯 Element ID:', elementId)
    
    if (!elementId) {
      console.warn('❌ No elementId provided, cannot update content')
      return
    }

    // Create a deep copy of parsed sections for modification
    const updatedSections = JSON.parse(JSON.stringify(parsedSections))
    
    // Find the element that was updated
    const finalUpdateResult = findElementById(updatedSections, elementId)
    
    if (!finalUpdateResult) {
      console.warn(`❌ Element with ID ${elementId} not found`)
      return
    }

    // Update the appropriate element
    if (finalUpdateResult.type === 'section' && finalUpdateResult.section) {
      console.log(`🔄 Updating section: ${finalUpdateResult.section.title}`)
      
      // For section updates, parse the new content and update the section
      const lines = newContent.split('\n')
      const newContentItems: ContentItem[] = []
      let startIndex = 0
      
      // Skip the section title line if it exists
      if (lines[0] && lines[0].match(/^#{1,6}\s+(.+)$/)) {
        startIndex = 1
        // Update section title
        const titleMatch = lines[0].match(/^#{1,6}\s+(.+)$/)
        if (titleMatch) {
          finalUpdateResult.section.title = titleMatch[1].trim()
        }
      }
      
      // Process content lines
      const contentLines: string[] = []
      for (let i = startIndex; i < lines.length; i++) {
        contentLines.push(lines[i])
      }
      
      // Create semantic blocks from content
      if (contentLines.length > 0) {
        const semanticBlocks = splitIntoSemanticBlocks(contentLines)
        semanticBlocks.forEach(block => {
          newContentItems.push({
            id: generateContentId(),
            content: block.content,
            type: block.type
          })
        })
      }
      
      finalUpdateResult.section.content = newContentItems
      
    } else if (finalUpdateResult.type === 'content' && finalUpdateResult.contentItem) {
      // Content edit - try smart replacement, fallback to full replacement
      console.log(`🔄 Updating content: ${finalUpdateResult.contentItem.id}`)
      
      const originalText = element.textContent?.trim() || ''
      const originalContent = finalUpdateResult.contentItem.content
      
      // Try smart replacement if we can find the original text
      if (originalText && originalContent.includes(originalText)) {
        console.log(`🎯 Smart replacement: "${originalText}" → "${newContent.trim()}"`)
        finalUpdateResult.contentItem.content = originalContent.replace(originalText, newContent.trim())
      } else {
        console.log(`🔄 Full replacement`)
        finalUpdateResult.contentItem.content = newContent.trim()
      }
      
      // Update type based on new content
      const determineContentType = (content: string): ContentItem['type'] => {
        if (content.includes('|') && content.split('\n').filter(line => line.includes('|')).length > 1) return 'other'
        if (/^[\s]*[-*+]\s/.test(content)) return 'list'
        if (/^[\s]*\d+\.\s/.test(content)) return 'list'  
        if (content.startsWith('>')) return 'quote'
        if (content.startsWith('```')) return 'code'
        return 'paragraph'
      }
      
      finalUpdateResult.contentItem.type = determineContentType(newContent.trim())
    }

    // Regenerate and save
    const newMarkdown = regenerateMarkdown(updatedSections)
    setLocalContent(newMarkdown)
    
    toast({
      title: "Changes saved",
      description: "Content has been updated successfully",
    })
  }, [toast, parsedSections, findElementById, regenerateMarkdown, generateContentId, splitIntoSemanticBlocks])

  // Memoized section content collector - updated for ContentItem
  const getSectionContent = useCallback((section: ParsedSection): string => {
    let content = `# ${section.title}\n\n`
    
    section.content.forEach(contentItem => {
      if (contentItem.content.trim()) {
        content += contentItem.content + '\n\n'
      }
    })
    
    section.children.forEach(childSection => {
      content += getSectionContent(childSection)
    })
    
    return content
  }, [])

  // Smart Preview handlers - ONLY ADDITION
  const handleSmartPreviewClick = useCallback((
    event: React.MouseEvent<HTMLElement>, 
    sectionId: string, 
    sectionContent: string
  ) => {
    console.log('🧠 Smart Preview clicked:', sectionId)
    
    const rect = event.currentTarget.getBoundingClientRect()
    const scrollY = window.scrollY || document.documentElement.scrollTop
    
    setSmartPreviewState({
      isOpen: true,
      sectionId,
      sectionContent,
      position: {
        top: rect.top + scrollY + rect.height + 8,
        left: rect.left + rect.width / 2
      }
    })
  }, [])

  const handleSmartPreviewClose = useCallback(() => {
    setSmartPreviewState({
      isOpen: false,
      sectionId: null,
      sectionContent: '',
      position: null
    })
  }, [])

  // Handle click outside for Smart Preview - ONLY ADDITION
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (smartPreviewState.isOpen) {
        const target = event.target as Element
        if (!target.closest('.smart-preview-panel') && !target.closest('.smart-preview-icon')) {
          handleSmartPreviewClose()
        }
      }
    }

    if (smartPreviewState.isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [smartPreviewState.isOpen, handleSmartPreviewClose])

  const handleHoverClick = useCallback((event: React.MouseEvent<HTMLElement>, domData: {
    elementId: string | null
    content: string
    elementType: string
    clone: HTMLElement
    sourceElement: HTMLElement
    domInfo?: {
      domElementId: string,
      structuralId: string,
      elementType: string,
      content: string
    } | null
  }) => {
    // Get openEditModal from the current render context
    const openEditModal = (window as any).currentOpenEditModalForHover
    if (!openEditModal) return
    
    console.log(`🎯 DOM-first handleHoverClick:`, domData)
    
    // Pass domInfo through the chain
    openEditModal(
      domData.content,
      domData.elementType, 
      domData.sourceElement,
      {
        x: event.clientX,
        y: event.clientY
      }, 
      domData.clone, 
      domData.elementId,
      domData.domInfo  // NEW: Pass pre-collected DOM info
    )
  }, [])

  const hoverHandlers = useNotesHover({
    isAnimating,
    onElementClick: handleHoverClick,
    onSmartPreviewClick: handleSmartPreviewClick // ADD Smart Preview handler
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
    const hasContent = section.content.some(item => item.content) || section.children.length > 0
    
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
          
          {/* Section Title - KEEP FULL HOVER AREA but add padding for Smart Preview button */}
          <HeadingTag
            id={headingId}
            data-section-id={section.id}
            data-element-id={section.id}
            data-structural-id={section.id} 
            data-content={getSectionContent(section)}
            data-element-type={`complete-section-${section.level}`}
            className={`${getHeadingClasses(section.level)} text-foreground cursor-pointer hover:text-primary transition-colors flex-1 leading-6 flex items-center px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20`}
            style={{ 
              paddingRight: '120px', // UPDATED: More space for "Smart Review" button with text
              marginBottom: 0, 
              marginTop: 0,
              willChange: 'background-color, color',
              backfaceVisibility: 'hidden',
              contain: 'layout style',
              position: 'relative'
            }}
            onClick={(e) => {
              // Call handleElementEdit directly with section data
              const sectionContainer = e.currentTarget.closest('.section-container') as HTMLElement
              const fullContent = getSectionContent(section)
              
              // Create visual preview from entire section container
              const visualPreview = sectionContainer ? sectionContainer.cloneNode(true) as HTMLElement : e.currentTarget.cloneNode(true) as HTMLElement
              
              openEditModal(fullContent, `complete-section-${section.level}`, e.currentTarget, {
                x: e.clientX,
                y: e.clientY
              }, visualPreview, section.id) // Pass section ID
            }}
            onMouseEnter={(e) => {
              // Zapowiedź transformacji: GPU layer
              e.currentTarget.style.willChange = 'transform'
              // Ewentualnie lokalny efekt bez zmiany layoutu
              e.currentTarget.style.transform = 'translateZ(0)' // lub scale(1.02), jeśli robisz animacje
              hoverHandlers.applySectionHoverStyles(e, section.id, section.level)
            }}
            onMouseLeave={(e) => {
              // Natychmiastowa czystość bez opóźnienia
              e.currentTarget.style.transform = 'translateZ(0)'
              e.currentTarget.style.willChange = 'auto'
              hoverHandlers.clearSectionHoverStyles(e)
            }}
          >
            {section.title}
          </HeadingTag>
        </div>

        {/* Zawartość sekcji - pokazuj tylko gdy nie jest zwinięta */}
        {!isCollapsed && hasContent && (
          <div className="section-content pl-4" style={{ overflow: 'visible', contain: 'none' }}>
            {/* Section content - teraz wszystko przez hoverHandlers */}
            {section.content.map((contentItem) => (
              contentItem.content.trim() && (
                <ContentItemRenderer
                  key={contentItem.id}
                  contentItem={contentItem}
                  hoverHandlers={hoverHandlers}
                />
              )
            ))}
            
            {/* Child sections */}
            {section.children.length > 0 && (
              <div className="subsections-container" style={{ overflow: 'visible' }}>
                {section.children.map(childSection => renderSection(childSection, openEditModal))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }, [collapsedSections, toggleSection, hoverHandlers, getSectionContent, getContentType])

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select notes to view</p>
      </div>
    )
  }

  const noteTypeInfo = getNoteTypeInfo(output.noteType)

  const getCurrentDocumentContent = useCallback(() => {
    return localContent || output?.content || ''
  }, [localContent, output?.content])

  const getParsedSections = useCallback(() => {
    return parsedSections
  }, [parsedSections])

  return (
    <EditModalProvider 
      sessionId={sessionId}
      onContentSaved={handleContentSaved}
      getCurrentDocumentContent={getCurrentDocumentContent} 
      getParsedSections={getParsedSections} 
    >
        {(openEditModal) => {
          // Move the useEffect here - at the top level of the render function
          // Make openEditModal available for hoverHandlers
          React.useEffect(() => {
            (window as any).currentOpenEditModalForHover = openEditModal
          }, [openEditModal])

          return (
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
              <div className="flex-1 w-full flex justify-center">
                <ScrollArea className="h-full w-full max-w-6xl" style={{ overflow: 'auto' }}>
                  <div className="p-6 rounded-xl bg-muted/50 w-full" style={{ overflow: 'visible', minWidth: 'fit-content' }}>
                    <div className="space-y-6 w-full" style={{ overflow: 'visible' }}>
                      {parsedSections.map(section => renderSection(section, openEditModal))}
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Smart Preview Panel - ONLY ADDITION */}
              {smartPreviewState.isOpen && (
                <SmartPreviewPanel
                  sectionId={smartPreviewState.sectionId!}
                  sectionContent={smartPreviewState.sectionContent}
                  position={smartPreviewState.position}
                  onClose={handleSmartPreviewClose}
                />
              )}
            </div>
          )
        }}
      </EditModalProvider>
    )
}