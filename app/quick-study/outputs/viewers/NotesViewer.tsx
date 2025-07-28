// app/quick-study/outputs/viewers/NotesViewer.tsx - Hierarchical Expandable Sections
"use client"

import React, { useState, useMemo } from 'react'
import { PenTool, Copy, Download, FileText, List, Table, ChevronDown, ChevronRight } from "lucide-react"
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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [hoverTimeouts, setHoverTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map())
const [isTransitioning, setIsTransitioning] = useState<Set<string>>(new Set())
const [debugPanel, setDebugPanel] = useState<{
  isVisible: boolean;
  element: HTMLElement | null;
  content: string;
  elementType: string;
  position: { x: number; y: number };
} | null>(null)

  // Cleanup timeouts przy unmount
  React.useEffect(() => {
    return () => {
      hoverTimeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Parsowanie markdown do hierarchicznej struktury
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

        // Znajdź odpowiednie miejsce w hierarchii
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
        // Dodaj linię do aktualnej zawartości
        currentContent.push(line)
      }
    }

    flushContent()
    return sections
  }, [output?.content])

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

const handleDownload = async (format: 'md' | 'pdf' = 'md') => {
  if (!output?.content) return;

  if (format === 'md') {
    // Pobieranie jako Markdown
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
    // Pobieranie jako PDF z zachowaniem struktury tekstu
    try {
      const { default: html2pdf } = await import('html2pdf.js');

      const notesElement = document.querySelector('.markdown-content');
      if (!notesElement) return;

      const opt = {
        margin:       10,
        filename:     `${output.title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Renderuj PDF
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
}

  // Toggle collapse sekcji
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  // Style hover dla nagłówków sekcji
  const getSectionHoverStyles = (level: number) => {
    const intensity = Math.max(0.12 - (level - 1) * 0.02, 0.06)
    const borderIntensity = Math.max(0.4 - (level - 1) * 0.05, 0.2)
    
    return {
      backgroundColor: `rgba(59, 130, 246, ${intensity})`,
      borderLeft: `${Math.max(4 - level, 2)}px solid rgba(59, 130, 246, ${borderIntensity})`,
      borderRadius: '8px',
      padding: '12px 16px',
      margin: '8px -16px',
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
      boxShadow: `0 2px 4px rgba(59, 130, 246, ${intensity * 2})`,
      transform: 'translateX(2px)'
    }
  }

  const handleSectionHover = (event: React.MouseEvent<HTMLElement>, sectionId: string, level: number) => {
    // Tylko dla podsekcji (h3+) - nie dla głównych sekcji (h1, h2)
    if (level <= 2) return
    
    event.stopPropagation()
    
    const sectionContainer = event.currentTarget.closest('.section-container') as HTMLElement
    if (!sectionContainer) return
    
    setHoveredSection(sectionId)
    
    // Znajdź wszystkie elementy należące do tej sekcji
    const sectionElements = [
      sectionContainer.querySelector('.section-heading'),
      sectionContainer.querySelector('.section-content'),
      ...Array.from(sectionContainer.querySelectorAll('.subsections-container'))
    ].filter(Boolean) as HTMLElement[]
    
    // Aplikuj hover style na wszystkie elementy sekcji
    sectionElements.forEach(element => {
      if (element) {
        Object.assign(element.style, getSectionHoverStyles(level))
      }
    })
  }

  const clearSectionHoverStyles = (event: React.MouseEvent<HTMLElement>) => {
    const sectionContainer = event.currentTarget.closest('.section-container') as HTMLElement
    if (!sectionContainer) return
    
    // Znajdź section ID na podstawie data attribute
    const headingElement = sectionContainer.querySelector('[data-section-id]') as HTMLElement
    const sectionId = headingElement?.getAttribute('data-section-id') || 'unknown'
    const level = parseInt(headingElement?.tagName.charAt(1) || '1')
    
    // Tylko dla podsekcji
    if (level <= 2) return
    
    setHoveredSection(null)
    
    // Znajdź wszystkie elementy należące do tej sekcji i wyczyść style
    const sectionElements = [
      sectionContainer.querySelector('.section-heading'),
      sectionContainer.querySelector('.section-content'),
      ...Array.from(sectionContainer.querySelectorAll('.subsections-container'))
    ].filter(Boolean) as HTMLElement[]
    
    sectionElements.forEach(element => {
      if (element) {
        Object.assign(element.style, {
          backgroundColor: '',
          borderLeft: '',
          borderRadius: '',
          padding: '',
          margin: '',
          boxShadow: '',
          transform: '',
          transition: 'all 0.5s ease-in-out'
        })
        
        // Usuń transition po animacji
        setTimeout(() => {
          if (element.style.transition) {
            element.style.transition = ''
          }
        }, 200)
      }
    })
  }
// Funkcja do obsługi kliknięcia na element z hover
const handleElementClick = (event: React.MouseEvent<HTMLElement>, elementType: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  const element = event.currentTarget
  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
  
  // Pobierz zawartość elementu
  const content = element.textContent || element.innerHTML || 'Brak zawartości'
  
  setDebugPanel({
    isVisible: true,
    element,
    content: content.trim(),
    elementType,
    position: {
      x: rect.left + scrollLeft + rect.width / 2,
      y: rect.top + scrollTop - 10
    }
  })
}

// Funkcja do zamykania debug panelu
const closeDebugPanel = () => {
  setDebugPanel(null)
}
  // Komponenty do renderowania markdown z hover (ulepszony dla zawartości sekcji)
// Obsługa klawisza Escape dla debug panelu
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && debugPanel) {
        closeDebugPanel()
      }
    }
    
    if (debugPanel) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [debugPanel])

  // Komponenty do renderowania markdown z hover (ulepszony dla zawartości sekcji)
  const createMarkdownComponents = () => ({
    // Paragrafy z hover - mniej intensywny w sekcjach
    p: ({ node, children, ...props }: any) => (
      <p
        className="mb-4 leading-relaxed text-foreground cursor-pointer section-content-element"
        onMouseEnter={(e) => {
          // Sprawdź czy jesteśmy w sekcji z hover
          const sectionContainer = e.currentTarget.closest('.section-container.section-container-hovered')
          const intensity = sectionContainer ? 0.04 : 0.08 // Mniejsza intensywność jeśli sekcja ma hover
          
          const element = e.currentTarget
          Object.assign(element.style, {
            backgroundColor: `rgba(34, 197, 94, ${intensity})`,
            borderLeft: `3px solid rgba(34, 197, 94, ${intensity * 4})`,
            borderRadius: '6px',
            padding: '8px 12px',
            margin: '4px -12px',
            transition: 'all 0.15s ease-in-out'
          })
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget
          // Animowane wyjście z hover
          Object.assign(element.style, {
            backgroundColor: '',
            borderLeft: '',
            borderRadius: '',
            padding: '',
            margin: '',
            transition: 'all 0.15s ease-in-out' // Zachowaj transition przy wyjściu
          })
          
          // Usuń transition po animacji
          setTimeout(() => {
            if (element.style.transition) {
              element.style.transition = ''
            }
          }, 150)
        }}
        onClick={(e) => handleElementClick(e, 'paragraph')}
        {...props}
      >
        {children}
      </p>
    ),

    // Listy z hover
    ul: ({ node, children, ...props }: any) => (
      <ul
        className="list-disc list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element"
        onMouseEnter={(e) => {
          const sectionContainer = e.currentTarget.closest('.section-container.section-container-hovered')
          const intensity = sectionContainer ? 0.04 : 0.08
          
          const element = e.currentTarget
          Object.assign(element.style, {
            backgroundColor: `rgba(168, 85, 247, ${intensity})`,
            borderLeft: `3px solid rgba(168, 85, 247, ${intensity * 4})`,
            borderRadius: '6px',
            padding: '8px 12px',
            margin: '4px -12px',
            transition: 'all 0.15s ease-in-out'
          })
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget
          // Animowane wyjście z hover
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
        }}
        onClick={(e) => handleElementClick(e, 'unordered-list')}
        {...props}
      >
        {children}
      </ul>
    ),

    ol: ({ node, children, ...props }: any) => (
      <ol
        className="list-decimal list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element"
        onMouseEnter={(e) => {
          const sectionContainer = e.currentTarget.closest('.section-container.section-container-hovered')
          const intensity = sectionContainer ? 0.04 : 0.08
          
          const element = e.currentTarget
          Object.assign(element.style, {
            backgroundColor: `rgba(168, 85, 247, ${intensity})`,
            borderLeft: `3px solid rgba(168, 85, 247, ${intensity * 4})`,
            borderRadius: '6px',
            padding: '8px 12px',
            margin: '4px -12px',
            transition: 'all 0.15s ease-in-out'
          })
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget
          // Animowane wyjście z hover dla list
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
        }}
        onClick={(e) => handleElementClick(e, 'ordered-list')}
        {...props}
      >
        {children}
      </ol>
    ),

    // Tabele z hover
    table: ({ node, children, ...props }: any) => (
      <div className="overflow-x-auto mb-6">
        <table
          className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer section-content-element"
          onMouseEnter={(e) => {
            const sectionContainer = e.currentTarget.closest('.section-container.section-container-hovered')
            const intensity = sectionContainer ? 0.04 : 0.08
            
            const element = e.currentTarget
            Object.assign(element.style, {
              backgroundColor: `rgba(249, 115, 22, ${intensity})`,
              border: `2px solid rgba(249, 115, 22, ${intensity * 4})`,
              borderRadius: '8px',
              padding: '4px',
              transition: 'all 0.15s ease-in-out'
            })
          }}
          onMouseLeave={(e) => {
            const element = e.currentTarget
            // Animowane wyjście z hover dla tabel
            Object.assign(element.style, {
              backgroundColor: '',
              border: '1px solid rgba(0, 0, 0, 0.1)', // Przywróć domyślny border
              borderColor: '',
              borderRadius: '',
              padding: '',
              transition: 'all 0.15s ease-in-out'
            })
            
            setTimeout(() => {
              if (element.style.transition) {
                element.style.transition = ''
              }
              // Przywróć oryginalne klasy border
              element.style.border = ''
            }, 150)
          }}
          onClick={(e) => handleElementClick(e, 'table')}
          {...props}
        >
          {children}
        </table>
      </div>
    ),

    blockquote: ({ node, children, ...props }: any) => (
      <blockquote
        className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-3 mb-4 italic rounded-r-md cursor-pointer section-content-element"
        onMouseEnter={(e) => {
          const sectionContainer = e.currentTarget.closest('.section-container.section-container-hovered')
          const intensity = sectionContainer ? 0.04 : 0.08
          
          const element = e.currentTarget
          Object.assign(element.style, {
            backgroundColor: `rgba(34, 197, 94, ${intensity})`,
            borderRadius: '6px',
            transform: 'translateX(2px)',
            transition: 'all 0.15s ease-in-out'
          })
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget
          // Animowane wyjście z hover dla blockquote
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
        onClick={(e) => handleElementClick(e, 'blockquote')}
        {...props}
      >
        {children}
      </blockquote>
    ),

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
    
    // Wyłącz nagłówki bo renderujemy je osobno
    h1: () => null,
    h2: () => null,
    h3: () => null,
    h4: () => null,
    h5: () => null,
    h6: () => null,
  })
// Funkcja do zbierania całej zawartości sekcji (rekurencyjnie)
const getSectionContent = (section: ParsedSection): string => {
  let content = `# ${section.title}\n\n`
  
  // Dodaj zawartość sekcji
  section.content.forEach(contentItem => {
    if (contentItem.trim()) {
      content += contentItem + '\n\n'
    }
  })
  
  // Dodaj zawartość podsekcji (rekurencyjnie)
  section.children.forEach(childSection => {
    content += getSectionContent(childSection)
  })
  
  return content
}
  // Komponent do renderowania hierarchicznej sekcji
  const renderSection = (section: ParsedSection, depth: number = 0) => {
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

    // Tylko podsekcje (h3+) mają hover effect
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
    // Sprawdź czy kliknięto w przycisk strzałki
    const target = e.target as HTMLElement
    if (target.closest('.toggle-button')) {
      return // Nie rób nic, button handler się zajmie
    } else {
      // Kliknięto w obszar tytułu - wyślij całą sekcję do debug panelu
      e.preventDefault()
      e.stopPropagation()
      
      // Zbierz całą zawartość sekcji (tytuł + content + dzieci)
      const sectionContent = getSectionContent(section)
      
      const rect = e.currentTarget.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      setDebugPanel({
        isVisible: true,
        element: e.currentTarget,
        content: sectionContent.trim(),
        elementType: `complete-section-${section.level}`,
        position: {
          x: rect.left + scrollLeft + rect.width / 2,
          y: rect.top + scrollTop - 10
        }
      })
    }
  }}
>
  {/* Przycisk strzałki - teraz z klasą toggle-button */}
  <button 
    className="toggle-button flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
    onClick={(e) => {
      e.stopPropagation() // Zapobiegaj propagacji do parent
      toggleSection(section.id)
    }}
  >
    {isCollapsed ? (
      <ChevronRight className="h-4 w-4 text-blue-500 opacity-70 hover:opacity-100 transition-opacity" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-500 opacity-70 hover:opacity-100 transition-opacity" />
    )}
  </button>
  
  {/* Tytuł sekcji */}
  <span className="flex-1">{section.title}</span>
</HeadingTag>

        {/* Zawartość sekcji */}
        {!isCollapsed && (
          <div className="section-content space-y-4 relative">
            {/* Renderuj zawartość markdown */}
            {section.content.map((content, index) => (
              content.trim() && (
                <div key={index} className="section-content-item">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={createMarkdownComponents()}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )
            ))}

            {/* Renderuj podsekcje */}
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

      {/* Debug Panel Popup */}
      {debugPanel && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={closeDebugPanel}
          />
          
          {/* Debug Panel */}
          <div
            className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 max-w-md w-80"
            style={{
              left: `${Math.min(debugPanel.position.x - 160, window.innerWidth - 320)}px`,
              top: `${Math.max(debugPanel.position.y - 200, 10)}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Debug Panel
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Element: {debugPanel.elementType}
                </p>
              </div>
              <button
                onClick={closeDebugPanel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <span className="sr-only">Zamknij</span>
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zawartość:
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                  {debugPanel.content}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Informacje techniczne:
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs text-gray-600 dark:text-gray-400">
                  <div>Typ: {debugPanel.elementType}</div>
                  <div>Długość: {debugPanel.content.length} znaków</div>
                  <div>Pozycja: x:{Math.round(debugPanel.position.x)}, y:{Math.round(debugPanel.position.y)}</div>
                </div>
              </div>
              
              {/* Przycisk kopiowania */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(debugPanel.content)
                  toast({
                    title: "Skopiowano!",
                    description: "Zawartość elementu została skopiowana do schowka"
                  })
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                Kopiuj zawartość
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  )
}