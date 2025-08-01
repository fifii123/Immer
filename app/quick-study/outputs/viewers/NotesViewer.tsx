// app/quick-study/outputs/viewers/NotesViewer.tsx - WITH EDIT MODAL
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

  // Update lokalnego content gdy output się zmienia
  useEffect(() => {
    setLocalContent(output?.content || '')
  }, [output?.content])
// ID generators
  let sectionIdCounter = 0
  let contentIdCounter = 0

  const generateSectionId = () => `section_${++sectionIdCounter}_${Date.now()}`
  const generateContentId = () => `content_${++contentIdCounter}_${Date.now()}`


  // Helper function to determine content type
  const determineContentType = (content: string): ContentItem['type'] => {
    if (content.trim().startsWith('- ') || content.trim().match(/^\d+\./)) {
      return 'list'
    } else if (content.trim().startsWith('```')) {
      return 'code'
    } else if (content.trim().startsWith('> ')) {
      return 'quote'
    }
    return 'paragraph'
  }

  // Parsowanie markdown - memoized with ID generation
  const parsedSections = useMemo(() => {
    if (!localContent) return []
    
    const lines = localContent.split('\n')
    const sections: ParsedSection[] = []
    const stack: ParsedSection[] = []
    let currentContent: string[] = []

    const flushContent = () => {
      if (currentContent.length > 0) {
        const target = stack.length > 0 ? 
          stack[stack.length - 1] : 
          null
        
        if (target) {
          const joinedContent = currentContent.join('\n')
          // Create ContentItem with ID and type
          target.content.push({
            id: generateContentId(),
            content: joinedContent,
            type: determineContentType(joinedContent)
          })
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
  }, [localContent])
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
  console.log(`📝 SAVING: ${newContent.length} chars for DOM element: ${elementId}`)
  
  if (!newContent.trim()) {
    console.warn('⚠️ Empty content, not saving')
    return
  }

  // DOM-first approach: pobierz structural ID z DOM elementu
  const structuralId = element.getAttribute('data-structural-id') || 
                       element.closest('[data-structural-id]')?.getAttribute('data-structural-id')

  if (!structuralId) {
    console.warn('⚠️ No structural ID found in DOM, cannot replace content')
    toast({
      title: "Error",
      description: "Could not identify element to update",
      variant: "destructive",
    })
    return
  }

  console.log(`🎯 DOM → Structural mapping: ${elementId} → ${structuralId}`)

  // Debug: log wszystkie ID w parsedSections
  console.log(`🔍 DEBUG: Available IDs in parsedSections:`)
  const debugLogIds = (sections: ParsedSection[], prefix = '') => {
    sections.forEach(section => {
      console.log(`${prefix}Section: ${section.id}`)
      section.content.forEach(contentItem => {
        console.log(`${prefix}  Content: ${contentItem.id}`)
      })
      if (section.children.length > 0) {
        debugLogIds(section.children, prefix + '  ')
      }
    })
  }
  debugLogIds(parsedSections)

// Find the element in current parsed sections using structural ID
  const foundElement = findElementById(parsedSections, structuralId)
  
  if (!foundElement) {
    console.warn(`⚠️ Element ${structuralId} not found in current sections`)
    toast({
      title: "Error", 
      description: "Could not find element to update",
      variant: "destructive",
    })
    return
  }

  console.log(`✅ Found element in parsedSections:`, foundElement)

  // Create a deep copy of parsed sections for modification
  const updatedSections = JSON.parse(JSON.stringify(parsedSections)) as ParsedSection[]
  
  // Debug: Check if deep copy preserved IDs
  console.log(`🔍 DEBUG: IDs after deep copy:`)
  debugLogIds(updatedSections)
  
// Debug: Sprawdź dokładnie co się dzieje z findElementById
  console.log(`🔍 DEEP DEBUG: Searching for ${structuralId} in updatedSections`)
  console.log(`📊 Original result:`, foundElement)
  
  // Find and update the element in the copy  
  const updateResult = findElementById(updatedSections, structuralId)
  console.log(`📊 Updated result:`, updateResult)
  
  if (!updateResult) {
    console.error('❌ CRITICAL: findElementById failed on identical data structure!')
    console.log('🔍 Manual search in updatedSections:')
    
    // Manual search to find the bug
    for (const section of updatedSections) {
      console.log(`  Checking section: ${section.id}`)
      for (const contentItem of section.content) {
        console.log(`    Checking content: ${contentItem.id}`)
        if (contentItem.id === structuralId) {
          console.log(`    🎯 FOUND IT MANUALLY! contentItem:`, contentItem)
        }
      }
    }
    
    toast({
      title: "Critical Error",
      description: "findElementById function has a bug",
      variant: "destructive",
    })
    return
  }
// Sprawdź czy to granular edit (DOM elementId != structural ID)
  const isGranularEdit = elementId.startsWith('li-') || 
                         elementId.startsWith('p-') || 
                         elementId.startsWith('ul-') ||
                         elementId.startsWith('ol-')
  
  console.log(`🎯 Edit type: ${isGranularEdit ? 'GRANULAR' : 'STRUCTURAL'}`)
  
  if (isGranularEdit && updateResult.type === 'content' && updateResult.contentItem) {
    // GRANULAR REPLACEMENT - replace only clicked part
    console.log(`🔄 Granular replacing in: ${updateResult.contentItem.id}`)
    console.log(`📝 Original content: "${updateResult.contentItem.content}"`)
    
    // Get original text from DOM element
    const originalText = element.textContent?.trim() || ''
    console.log(`📝 Original text: "${originalText}"`)
    console.log(`📝 New text: "${newContent.trim()}"`)
    
    if (originalText && updateResult.contentItem.content.includes(originalText)) {
      // Replace only the specific text
      const updatedContent = updateResult.contentItem.content.replace(originalText, newContent.trim())
      updateResult.contentItem.content = updatedContent
      console.log(`📝 Updated content: "${updatedContent}"`)
    } else {
      console.warn(`⚠️ Could not find original text "${originalText}" in content`)
      // Fallback to full replacement
      updateResult.contentItem.content = newContent.trim()
    }
    
    // Don't change type for granular edits
  } else  if (updateResult.type === 'section' && updateResult.section) {
    // For sections, parse the new content and replace entire section
    console.log(`🔄 Replacing section: ${updateResult.section.title}`)
    
    // Parse new content to detect new structure
    const lines = newContent.trim().split('\n')
    const newContentItems: ContentItem[] = []
    let currentContent: string[] = []
    
    const flushCurrentContent = () => {
      if (currentContent.length > 0) {
        const joinedContent = currentContent.join('\n')
        newContentItems.push({
          id: generateContentId(),
          content: joinedContent,
          type: determineContentType(joinedContent)
        })
        currentContent = []
      }
    }
    
    // Skip first line if it's a heading (section title)
    let startIndex = 0
    if (lines[0] && lines[0].match(/^#{1,6}\s+/)) {
      startIndex = 1
      // Update section title if it changed
      const titleMatch = lines[0].match(/^#{1,6}\s+(.+)$/)
      if (titleMatch) {
        updateResult.section.title = titleMatch[1].trim()
      }
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this is a subsection heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch && headingMatch[1].length > updateResult.section.level) {
        // This is a subsection - for now, treat as content
        // In future, could parse as child sections
        currentContent.push(line)
      } else {
        currentContent.push(line)
      }
    }
    
    flushCurrentContent()
    
    // Replace section content
    updateResult.section.content = newContentItems
    // Clear children for now (could be enhanced to preserve/parse subsections)
    updateResult.section.children = []
    
  } else if (updateResult.type === 'content' && updateResult.contentItem) {
    // STRUCTURAL CONTENT REPLACEMENT  
    console.log(`🔄 Structural replacing content item: ${updateResult.contentItem.id}`)
    
    updateResult.contentItem.content = newContent.trim()
    updateResult.contentItem.type = determineContentType(newContent.trim())
  }

  // Regenerate markdown from updated sections
  const newMarkdown = regenerateMarkdown(updatedSections)
  console.log(`✅ Generated new markdown: ${newMarkdown.length} chars`)
  
  // Update local content
  setLocalContent(newMarkdown)
  
  toast({
    title: "Changes saved",
    description: "Content has been updated successfully",
  })
}, [toast, parsedSections, findElementById, regenerateMarkdown, generateContentId, determineContentType])




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
const handleHoverClick = useCallback((event: React.MouseEvent<HTMLElement>, domData: {
    elementId: string | null
    content: string
    elementType: string
    clone: HTMLElement
  }) => {
    // Get openEditModal from the current render context
    const openEditModal = (window as any).currentOpenEditModalForHover
    if (!openEditModal) return
    
    console.log(`🎯 DOM-first handleHoverClick:`, domData)
    
    openEditModal(
      domData.content,
      domData.elementType, 
      event.currentTarget, 
      {
        x: event.clientX,
        y: event.clientY
      }, 
      domData.clone, 
      domData.elementId
    )
  }, [])


  const hoverHandlers = useNotesHover({
    isAnimating,
    onElementClick: handleHoverClick
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
        
        {/* Section Title - clickable for EditModal, używa hoverHandlers */}
<HeadingTag
          id={headingId}
          data-section-id={section.id}
          data-element-id={section.id}
          data-structural-id={section.id} 
          data-content={getSectionContent(section)}
          data-element-type={`complete-section-${section.level}`}
          className={`${getHeadingClasses(section.level)} text-foreground cursor-pointer hover:text-primary transition-colors flex-1 leading-6 flex items-center px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20`}
          style={{ 
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
          </div>
        )
      }}
    </EditModalProvider>
  )
}