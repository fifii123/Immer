"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePreferences } from "@/context/preferences-context";
import { useProjects } from "@/context/projects-context";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  X, 
  ArrowLeft,
  Menu,
  Search,
  ChevronDown,
  ArrowUp,
  BookOpen,
  RefreshCw,
  Home,
  ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
// POPRAWIONY IMPORT - używa właściwego komponentu MarkdownContent
import MarkdownContent from '@/components/MarkdownContent';

// Interfejsy typów
interface Note {
  id: string | number;
  fileName?: string;
  fileId: number;
  sections: Section[];
}

interface Section {
  id: number;
  title: string;
  description: string;
  content: string;
  expanded: boolean;
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
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  
  // Referencje do sekcji dla scrollowania
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  // Pobierz bieżący projekt
  const project = projects.find(
    (p) => p.project_id.toString() === params.id?.toString() || p.project_id === projectId
  );
  
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
        console.log("Pobrane notatki:", data); // Dodanie logowania dla debugowania
        
        // Uzupełnij nazwy plików, jeśli istnieją w projekcie
        if (project && project.attached_file && project.attached_file.length > 0) {
          const notesWithFileNames = data.map((note: Note) => {
            const matchingFile = project.attached_file.find(
              (file) => file.file_id === note.fileId
            );
            
            return {
              ...note,
              fileName: matchingFile ? matchingFile.file_name : `Plik ID: ${note.fileId}`
            };
          });
          
          setNotes(notesWithFileNames);
        } else {
          setNotes(data);
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
  
  // Przełącz notatkę
  const switchNote = (index: number) => {
    setCurrentNoteIndex(index);
    setActiveSection(null);
    // Przewiń na górę
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
  
  // Ustawienie aktywnej sekcji podczas scrollowania
  useEffect(() => {
    const handleScroll = () => {
      if (!notes.length || !notes[currentNoteIndex]?.sections?.length) return;
      
      // Znajdź sekcję, która jest aktualnie w widoku
      const sections = notes[currentNoteIndex].sections;
      
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
  }, [notes, currentNoteIndex]);
  
  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentNoteIndex < notes.length - 1) {
        switchNote(currentNoteIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentNoteIndex > 0) {
        switchNote(currentNoteIndex - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNoteIndex, notes.length, onClose]);
  
  // Filtrowanie sekcji na podstawie wyszukiwania
  const filteredSections = notes[currentNoteIndex]?.sections?.filter(section => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.content.toLowerCase().includes(searchLower)
    );
  }) || [];
  
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
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Ładowanie notatek...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Bieżąca notatka
  const currentNote = notes[currentNoteIndex];
  
  // Jeśli nie ma notatek po załadowaniu
  if (!currentNote) {
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
  
  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
      {/* Nagłówek */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} title="Wróć do projektu">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <BookOpen className="h-5 w-5 text-blue-500" />
          
          <h2 className="text-lg font-semibold">Biblioteka notatek projektu</h2>
          
          <div className="ml-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
              {sidebarOpen ? 'Ukryj menu' : 'Pokaż menu'}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {currentNote?.fileName || `Notatka ${currentNoteIndex + 1}`}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {notes.map((note, index) => (
              <DropdownMenuItem 
                key={index} 
                onClick={() => switchNote(index)}
                className={currentNoteIndex === index ? 'bg-muted' : ''}
              >
                {note.fileName || `Notatka ${index + 1}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Główna zawartość */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lewy panel - spis treści */}
        {sidebarOpen && (
          <div 
            className={`w-72 border-r flex flex-col ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Szukaj w notatkach..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="font-medium text-sm">Spis treści</h3>
              <span className="text-xs text-muted-foreground">
                {filteredSections?.length || 0} sekcji
              </span>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="px-3 py-2">
                {filteredSections?.map((section) => (
                  <div 
                    key={section.id}
                    className={`py-1.5 px-2 my-1 rounded-md cursor-pointer text-sm hover:bg-primary/10 ${
                      activeSection === section.id ? 'bg-primary/20 text-primary' : ''
                    }`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    <div className="font-medium">{section.title}</div>
                    {section.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {section.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {currentNoteIndex + 1} / {notes.length} notatek
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={currentNoteIndex === 0}
                  onClick={() => switchNote(currentNoteIndex - 1)}
                  title="Poprzednia notatka"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={currentNoteIndex === notes.length - 1}
                  onClick={() => switchNote(currentNoteIndex + 1)}
                  title="Następna notatka"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Główny panel - treść notatki */}
        <div className="flex-1 overflow-auto relative">
          <div className="max-w-4xl mx-auto p-6">
            {/* Nagłówek notatki */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Home className="h-4 w-4" />
                <span>Projekt: {project?.subject_name}</span>
                <ChevronRight className="h-4 w-4" />
                <span>Notatka: {currentNote?.fileName || `Notatka ${currentNoteIndex + 1}`}</span>
              </div>
              
              <h1 className="text-3xl font-bold mb-2">
                {currentNote?.fileName || `Notatka ${currentNoteIndex + 1}`}
              </h1>
              
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
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {section.description && (
                    <p className="text-muted-foreground mb-4 text-base">{section.description}</p>
                  )}
                  
                  <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
                    <MarkdownContent content={section.content} />
                  </div>
                  
                  <Separator className="my-8" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Przycisk "Do góry" */}
          <div className="fixed bottom-6 right-6">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full shadow-lg"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectNotes;