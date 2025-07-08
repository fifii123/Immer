"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePreferences } from '@/context/preferences-context';
import { useProjects } from '@/context/projects-context';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
// Importuj style dla podświetlania składni
import 'highlight.js/styles/github.css';
import {
  BookOpen,
  X,
  Search,
  FileText,
  Home,
  ChevronRight,
  Link2,
  PanelLeft,
  PanelRight
} from 'lucide-react';

interface Section {
  id: number;
  title: string;
  description: string;
  content: string;
  expanded: boolean;
}

interface Note {
  id: number;
  title: string;
  fileId: number;
  fileName?: string;
  sectionInfo?: {
    sectionNumber?: number;
    startPage?: number;
    endPage?: number;
  };
  sections: Section[];
}

interface GroupedNotes {
  [fileId: string]: {
    fileName: string;
    notes: Note[];
  };
}

interface ProjectNotesProps {
  projectId: number;
  onClose: () => void;
}

const ProjectNotes: React.FC<ProjectNotesProps> = ({ projectId, onClose }) => {
  const { darkMode, t } = usePreferences();
  const { toast } = useToast();
  const { projects } = useProjects();
  const params = useParams();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<GroupedNotes>({});
  const [selectedFileId, setSelectedFileId] = useState<string>('all'); // 'all' lub konkretny fileId
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  
  // Referencje do sekcji dla scrollowania
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  // Pobierz bieżący projekt
  const project = projects.find(
    (p) => p.project_id.toString() === params.id?.toString() || p.project_id === projectId
  );
  
  // Responsywne zachowanie
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setRightSidebarOpen(false);
      }
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Sprawdź przy pierwszym ładowaniu
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Pobierz wszystkie notatki dla projektu
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/notes?projectId=${projectId}`);
        
        if (!response.ok) {
          throw new Error('Nie udało się pobrać notatek');
        }
        
        const data = await response.json();
        console.log("Pobrane notatki:", data);
        
        // Uzupełnij nazwy plików, jeśli istnieją w projekcie
        let notesWithFileNames = data;
        if (project && project.attached_file && project.attached_file.length > 0) {
          notesWithFileNames = data.map((note: Note) => {
            const matchingFile = project.attached_file.find(
              (file) => file.file_id === note.fileId
            );
            
            return {
              ...note,
              fileName: matchingFile ? matchingFile.file_name : `Plik ID: ${note.fileId}`
            };
          });
        }
        
        setNotes(notesWithFileNames);
        
        // Grupuj notatki po fileId
        const grouped = notesWithFileNames.reduce((acc: GroupedNotes, note: Note) => {
          const fileKey = note.fileId.toString();
          if (!acc[fileKey]) {
            acc[fileKey] = {
              fileName: note.fileName || `Plik ID: ${note.fileId}`,
              notes: []
            };
          }
          acc[fileKey].notes.push(note);
          return acc;
        }, {});
        
        setGroupedNotes(grouped);
        
        // Automatycznie wybierz pierwszą notatkę
        if (notesWithFileNames.length > 0) {
          setSelectedNoteId(notesWithFileNames[0].id);
        }
        
      } catch (error) {
        console.error('Błąd podczas pobierania notatek:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się załadować notatek",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotes();
  }, [projectId, toast, project]);
  
  // Funkcja do przełączania pomiędzy plikami
  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    setActiveSection(null);
    
    // Automatycznie wybierz pierwszą notatkę z wybranego pliku
    if (fileId === 'all' && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    } else if (groupedNotes[fileId] && groupedNotes[fileId].notes.length > 0) {
      setSelectedNoteId(groupedNotes[fileId].notes[0].id);
    }
    
    // Przewiń na górę
    window.scrollTo(0, 0);
  };
  
  // Funkcja do wyboru konkretnej notatki
  const handleNoteSelect = (noteId: number) => {
    setSelectedNoteId(noteId);
    setActiveSection(null);
    window.scrollTo(0, 0);
  };
  
  // Funkcja do scrollowania do sekcji
  const scrollToSection = (sectionId: number) => {
    setActiveSection(sectionId);
    
    if (sectionRefs.current[sectionId]) {
      sectionRefs.current[sectionId]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };
  
  // Ustawienie aktywnej sekcji podczas scrollowania - prosta wersja
  useEffect(() => {
    const handleScroll = () => {
      const currentNote = notes.find(note => note.id === selectedNoteId);
      if (!currentNote?.sections?.length) return;
      
      // Znajdź sekcję, która jest aktualnie w widoku
      const sections = currentNote.sections;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = sectionRefs.current[section.id];
        
        if (!element) continue;
        
        const rect = element.getBoundingClientRect();
        
        // Jeśli sekcja jest widoczna na ekranie lub powyżej widoku
        if (rect.top <= 150) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [notes, selectedNoteId]);
  
  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  // Pobierz dostępne notatki do wyświetlenia
  const getVisibleNotes = () => {
    if (selectedFileId === 'all') {
      return notes;
    } else {
      return groupedNotes[selectedFileId]?.notes || [];
    }
  };
  
  // Pobierz aktualną notatkę
  const currentNote = notes.find(note => note.id === selectedNoteId);
  
  // Filtrowanie sekcji na podstawie wyszukiwania
  const filteredSections = currentNote?.sections?.filter(section => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.content.toLowerCase().includes(searchLower)
    );
  }) || [];
  
  // Pobierz listę unikalnych plików
  const availableFiles = Object.keys(groupedNotes).map(fileId => ({
    id: fileId,
    name: groupedNotes[fileId].fileName,
    noteCount: groupedNotes[fileId].notes.length
  }));
  
  // Jeśli nie ma notatek
  if (!loading && (!notes.length || notes.length === 0)) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Biblioteka notatek projektu</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Brak notatek</h3>
            <p className="text-muted-foreground mb-6">
              W tym projekcie nie ma jeszcze żadnych notatek. Otwórz dokument PDF i utwórz notatki.
            </p>
            <Button onClick={onClose}>Wróć do projektu</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Jeśli trwa ładowanie
  if (loading) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Biblioteka notatek projektu</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie notatek...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Biblioteka notatek projektu</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Ukryj panel nawigacji" : "Pokaż panel nawigacji"}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          
          {currentNote && currentNote.sections.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              title={rightSidebarOpen ? "Ukryj spis treści" : "Pokaż spis treści"}
            >
              <PanelRight className="h-5 w-5" />
            </Button>
          )}
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Lewy sidebar */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-80' : 'w-0'
        } border-r ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="w-80 h-full overflow-auto">
            <div className="p-4">
              {/* Selektor pliku */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Wybierz źródło:</label>
                <select
                  value={selectedFileId}
                  onChange={(e) => handleFileSelect(e.target.value)}
                  className={`w-full p-2 rounded border ${
                    darkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300 text-black'
                  }`}
                >
                  <option value="all">Wszystkie notatki ({notes.length})</option>
                  {availableFiles.map(file => (
                    <option key={file.id} value={file.id}>
                      {file.name} ({file.noteCount})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Wyszukiwanie */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj w sekcjach..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Lista notatek */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Notatki {selectedFileId !== 'all' ? `z pliku: ${groupedNotes[selectedFileId]?.fileName}` : 'ze wszystkich plików'}
                </h3>
                
                {getVisibleNotes().map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedNoteId === note.id
                        ? darkMode 
                          ? 'bg-slate-700 border border-slate-600' 
                          : 'bg-white border border-gray-300'
                        : darkMode 
                          ? 'hover:bg-slate-700' 
                          : 'hover:bg-white'
                    }`}
                    onClick={() => handleNoteSelect(note.id)}
                  >
                    <div className="font-medium text-sm">{note.title}</div>
                    {selectedFileId === 'all' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📄 {note.fileName}
                      </div>
                    )}
                    {note.sectionInfo && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Sekcja {note.sectionInfo.sectionNumber} 
                        {note.sectionInfo.startPage && note.sectionInfo.endPage && 
                          ` • Strony ${note.sectionInfo.startPage}-${note.sectionInfo.endPage}`}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {note.sections.length} sekcji
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Główny panel - treść notatki */}
        <div className="flex-1 overflow-auto relative flex">
          {/* Środkowa część - treść */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              {currentNote ? (
                <>
                  {/* Nagłówek notatki */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                      <Home className="h-4 w-4" />
                      <span>Projekt: {project?.subject_name}</span>
                      <ChevronRight className="h-4 w-4" />
                      <span>Plik: {currentNote.fileName}</span>
                      <ChevronRight className="h-4 w-4" />
                      <span>Notatka: {currentNote.title}</span>
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-2">{currentNote.title}</h1>
                    
                    {currentNote.sectionInfo && (
                      <div className="text-muted-foreground text-sm">
                        {currentNote.sectionInfo.sectionNumber && (
                          <span>Sekcja {currentNote.sectionInfo.sectionNumber}</span>
                        )}
                        {currentNote.sectionInfo.startPage && currentNote.sectionInfo.endPage && (
                          <span> • Strony {currentNote.sectionInfo.startPage}-{currentNote.sectionInfo.endPage}</span>
                        )}
                      </div>
                    )}
                    
                    <Separator className="my-4" />
                  </div>
                  
                  {/* Sekcje notatki */}
                  <div className="space-y-12">
                    {filteredSections?.map((section) => (
                      <div 
                        key={section.id}
                        id={`section-${section.id}`}
                        className="scroll-mt-24"
                        ref={(el) => sectionRefs.current[section.id] = el}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <h2 
                            className={`text-2xl font-semibold ${
                              activeSection === section.id ? 'text-primary' : ''
                            }`}
                          >
                            {section.title}
                          </h2>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Link do sekcji"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href + `#section-${section.id}`);
                              toast({
                                title: "Link skopiowany",
                                description: "Link do tej sekcji został skopiowany do schowka.",
                              });
                            }}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {section.description && (
                          <p className="text-muted-foreground mb-4">{section.description}</p>
                        )}
                        
                        <div className="markdown-content text-sm">
                          <style dangerouslySetInnerHTML={{ __html: `
                            /* Style dla nagłówków */
                            .markdown-content h2 {
                              font-size: 1.25rem;
                              font-weight: 600;
                              margin-top: 1.5rem;
                              margin-bottom: 0.75rem;
                              color: #2563eb;
                            }
                            
                            .dark .markdown-content h2 {
                              color: #60a5fa;
                            }
                            
                            .markdown-content h3 {
                              font-size: 1.1rem;
                              font-weight: 600;
                              margin-top: 1.25rem;
                              margin-bottom: 0.5rem;
                              color: #3b82f6;
                            }
                            
                            .dark .markdown-content h3 {
                              color: #93c5fd;
                            }
                            
                            /* Style dla list */
                            .markdown-content ul {
                              margin-top: 0.5rem;
                              margin-bottom: 0.5rem;
                              padding-left: 1.5rem;
                              list-style-type: disc;
                            }
                            
                            .markdown-content ol {
                              margin-top: 0.5rem;
                              margin-bottom: 0.5rem;
                              padding-left: 1.5rem;
                              list-style-type: decimal;
                            }
                            
                            .markdown-content li {
                              margin-top: 0.25rem;
                              margin-bottom: 0.25rem;
                            }
                            
                            /* Style dla bloków kodu */
                            .markdown-content code {
                              background-color: #f3f4f6;
                              padding: 0.2rem 0.4rem;
                              border-radius: 0.25rem;
                              font-size: 0.875rem;
                              font-family: monospace;
                            }
                            
                            .dark .markdown-content code {
                              background-color: #334155;
                            }
                            
                            /* Style dla bloków cytatu */
                            .markdown-content blockquote {
                              border-left: 4px solid #60a5fa;
                              padding-left: 1rem;
                              margin-left: 0;
                              margin-right: 0;
                              font-style: italic;
                              background-color: #eff6ff;
                              padding: 0.5rem;
                              border-radius: 0.25rem;
                            }
                            
                            .dark .markdown-content blockquote {
                              background-color: rgba(30, 58, 138, 0.2);
                              border-left-color: #3b82f6;
                            }
                            
                            /* Style dla pogrubienia i kursywy */
                            .markdown-content strong {
                              font-weight: 600;
                              color: #1d4ed8;
                            }
                            
                            .dark .markdown-content strong {
                              color: #93c5fd;
                            }
                            
                            .markdown-content em {
                              color: #4f46e5;
                            }
                            
                            .dark .markdown-content em {
                              color: #a5b4fc;
                            }
                            
                            /* Dodatkowe style dla lepszego wyglądu tekstu */
                            .markdown-content p {
                              margin-bottom: 0.75rem;
                              line-height: 1.5;
                            }
                            
                            /* Style dla tabel */
                            .markdown-content table {
                              border-collapse: collapse;
                              width: 100%;
                              margin: 1rem 0;
                              font-size: 0.875rem;
                            }
                            
                            .markdown-content th {
                              background-color: #f3f4f6;
                              border: 1px solid #e5e7eb;
                              padding: 0.5rem;
                              text-align: left;
                              font-weight: 600;
                            }
                            
                            .dark .markdown-content th {
                              background-color: #334155;
                              border-color: #475569;
                            }
                            
                            .markdown-content td {
                              border: 1px solid #e5e7eb;
                              padding: 0.5rem;
                            }
                            
                            .dark .markdown-content td {
                              border-color: #475569;
                            }
                            
                            /* Style dla wykreśleń */
                            .markdown-content del {
                              color: #ef4444;
                              text-decoration: line-through;
                            }
                            
                            /* Specjalne stylowanie dla bloków kodu z podświetlaniem składni */
                            .markdown-content pre {
                              background-color: #f8fafc;
                              border-radius: 0.375rem;
                              padding: 1rem;
                              overflow-x: auto;
                              margin: 1rem 0;
                            }
                            
                            .dark .markdown-content pre {
                              background-color: #1e293b;
                            }
                            
                            /* Odstępy między elementami */
                            .markdown-content > * + * {
                              margin-top: 0.5rem;
                            }
                          ` }} />
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]} // Obsługa tabel i wykreślenia (GFM)
                            rehypePlugins={[
                              rehypeRaw, // Obsługa surowego HTML
                              rehypeSanitize, // Zabezpieczenie przed XSS
                              rehypeHighlight // Podświetlanie składni kodu
                            ]}
                            components={{
                              // Niestandardowe renderowanie komponentów
                              h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-md font-semibold text-blue-500 dark:text-blue-300 mt-3 mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                              li: ({node, ...props}) => <li className="my-1" {...props} />,
                              blockquote: ({node, ...props}) => (
                                <blockquote className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-1 my-2 bg-blue-50 dark:bg-blue-900/20 rounded" {...props} />
                              ),
                              code: ({node, inline, className, children, ...props}) => {
                                // Różne style dla inline vs. blok kodu
                                if (inline) {
                                  return (
                                    <code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <div className="bg-gray-50 dark:bg-slate-800 rounded-md p-3 my-3 overflow-x-auto">
                                    <code className="text-sm font-mono leading-relaxed" {...props}>
                                      {children}
                                    </code>
                                  </div>
                                );
                              },
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-3">
                                  <table className="min-w-full border border-gray-200 dark:border-slate-700 text-sm" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-slate-700" {...props} />,
                              th: ({node, ...props}) => <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-slate-600 font-medium" {...props} />,
                              td: ({node, ...props}) => <td className="px-3 py-2 border-b border-gray-200 dark:border-slate-700" {...props} />,
                            }}
                          >
                            {section.content}
                          </ReactMarkdown>
                        </div>
                        
                        <Separator className="mt-8" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-6">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Wybierz notatkę</h3>
                    <p className="text-muted-foreground">
                      Wybierz notatkę z panelu bocznego, aby wyświetlić jej zawartość.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Prawy sidebar - sekcje notatki */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            currentNote && currentNote.sections.length > 0 && rightSidebarOpen ? 'w-80' : 'w-0'
          } border-l ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
            {currentNote && currentNote.sections.length > 0 && (
              <div className="w-80 h-full overflow-auto">
                <div className="p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Spis treści
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      {filteredSections.length} z {currentNote.sections.length} sekcji
                      {searchTerm && ` (filtrowane)`}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {filteredSections.map((section, index) => (
                      <div
                        key={section.id}
                        className={`p-3 rounded cursor-pointer transition-colors border ${
                          activeSection === section.id
                            ? darkMode 
                              ? 'bg-primary/20 text-primary border-primary/30' 
                              : 'bg-primary/10 text-primary border-primary/30'
                            : darkMode 
                              ? 'hover:bg-slate-700 border-slate-600' 
                              : 'hover:bg-gray-100 border-gray-200'
                        }`}
                        onClick={() => scrollToSection(section.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            activeSection === section.id
                              ? 'bg-primary text-primary-foreground'
                              : darkMode
                                ? 'bg-slate-600 text-slate-300'
                                : 'bg-gray-200 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {section.title}
                            </div>
                            {section.description && (
                              <div 
                                className="text-xs text-muted-foreground mt-1"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {section.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectNotes;