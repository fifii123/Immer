"use client";

import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useUserId } from '@/hooks/useAuthApi';
import pdfjs from "../pdfjs-setup";

export interface NoteSection {
  id: number;
  title: string;
  description: string;
  content: string;
  expanded: boolean;
  isTemporary?: boolean;
}

export interface Note {
  id: string | null;
  sections: NoteSection[];
}

interface UseNotesProps {
  fileId: number;
  projectId?: number;
  fileName?: string;
  noteId?: number | null;  // Specific note ID for a section
  sectionStartPage?: number;  // Start page for the section
  sectionEndPage?: number;  // End page for the section
}

export function useNotes({ 
  fileId, 
  projectId, 
  fileName, 
  noteId = null,
  sectionStartPage = 1,
  sectionEndPage
}: UseNotesProps) {
  const [note, setNote] = useState<Note>({
    id: null,
    sections: []
  });
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [noteGenerated, setNoteGenerated] = useState(false);
  const [highlightedSectionId, setHighlightedSectionId] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<null | {
    id: number;
    action: 'expand' | 'format' | 'custom' | 'confirm' | 'confirm_new';
    prompt?: string; 
    result?: string;
    noteId?: number;
    title?: string;
    description?: string;
    orderIndex?: number;
    currentContent?: string;
  }>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const generationAttemptedRef = useRef(false);
  const sectionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const autoGenerationAttemptedRef = useRef(false);
  const { toast } = useToast();
  const { authFetch } = useUserId();
  const fetchAttemptedRef = useRef(false);

  // Fetch existing note when component mounts
  useEffect(() => {

    if (!fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true;
      
      if (noteId) {
        fetchNoteById(noteId);
      } else if (fileId) {
        fetchExistingNote(fileId);
      }
    }
  }, [fileId, noteId]);

  // Function to fetch a specific note by ID
  const fetchNoteById = async (id: number) => {
    try {
      const response = await fetch(`/api/notes/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setNote({
          id: data.id,
          sections: data.sections.map((section: NoteSection) => ({
            ...section,
            expanded: section.expanded || false
          }))
        });
        setNoteGenerated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error fetching note by ID:", error);
      return false;
    }
  };

  // Function to fetch existing note from the database
  const fetchExistingNote = async (fileId: number) => {
    try {
      const response = await fetch(`/api/notes?fileId=${fileId}`);
      
      if (response.ok) {
        const data = await response.json();
        setNote({
          id: data.id,
          sections: data.sections.map((section: NoteSection) => ({
            ...section,
            expanded: section.expanded || false
          }))
        });
        setNoteGenerated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error fetching note:", error);
      return false;
    }
  };

  // Function to save note to the database
  const saveNoteToDatabase = async (noteData: any) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          projectId: projectId,
          noteName: `Notatka dla ${fileName}`,
          sections: noteData.sections
        }),
      });
      
      if (!response.ok) {
        throw new Error('Nie udało się zapisać notatki w bazie danych');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Błąd zapisywania notatki:", error);
      throw error;
    }
  };

  // Function to toggle section expansion
  const toggleSection = async (sectionId: number) => {
    // First update state locally for immediate UI response
    setNote(prevNote => ({
      ...prevNote,
      sections: prevNote.sections.map(section => 
        section.id === sectionId 
          ? { ...section, expanded: !section.expanded } 
          : section
      )
    }));
    
    // Then save changes to the database
    try {
      // Find current section state
      const section = note.sections.find(s => s.id === sectionId);
      if (!section) return;
      
      // Update state in the database
      await fetch('/api/notes/section', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionId,
          data: { expanded: !section.expanded }
        }),
      });
    } catch (error) {
      console.error("Error updating section state:", error);
    }
  };

  // Function to extract text from PDF (specific page range)
  const extractPdfText = async (pdfSource: string, totalPages: number = 0, sectioned: boolean = false, startPage: number = 1, endPage?: number) => {
    if (!pdfSource) return '';
    
    try {
      setExtractingText(true);
      setGenerationProgress(5);
      
      // Use pdf.js API to load the document
      const loadingTask = pdfjs.getDocument(pdfSource);
      const pdf = await loadingTask.promise;
     
      // Determine page range to extract
      const numPagesToExtract = sectioned 
        ? Math.min(endPage || startPage + 9, pdf.numPages) - startPage + 1 
        : Math.min(pdf.numPages, 50);
      
      let extractedText = '';
      
      // Extract text from specified page range
      const actualStartPage = sectioned ? startPage : 1;
      const actualEndPage = sectioned ? Math.min(endPage || (startPage + 9), pdf.numPages) : numPagesToExtract;
      
      // Update progress message
      if (sectioned) {
        toast({
          title: "Extracting section text",
          description: `Processing pages ${actualStartPage}-${actualEndPage}`,
        });
      }
      
      // Extract text from all pages in the range
      for (let i = actualStartPage; i <= actualEndPage; i++) {
        // Update progress
        const progressPercentage = 5 + Math.round(((i - actualStartPage) / (actualEndPage - actualStartPage + 1)) * 35);
        setGenerationProgress(progressPercentage);
        
        // Get page and its text content
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Join text elements
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        extractedText += `[Page ${i}]\n${pageText}\n\n`;
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to read PDF content');
    } finally {
      setExtractingText(false);
    }
  };

  // Function to generate initial note from PDF
  const generateInitialNote = async (
    pdfSource: string, 
    numPages: number, 
    sectioned: boolean = false,
    startPage: number = 1,
    endPage?: number
  ) => {
    // Check if note already generated
    if (noteGenerated || isGeneratingNote) return;
    
    setIsGeneratingNote(true);
    setGenerationProgress(0);
    
    try {
      // First check if note already exists
      let noteExists = false;
      
      if (noteId) {
        noteExists = await fetchNoteById(noteId);
      } else {
        noteExists = await fetchExistingNote(fileId);
      }
      
      if (noteExists) {
        setIsGeneratingNote(false);
        toast({
          title: "Note loaded",
          description: "Found and loaded existing note from database.",
        });
        return;
      }
      
      // Step 1: Extract text from PDF (specific pages for sections)
      const extractedText = await extractPdfText(pdfSource, numPages, sectioned, startPage, endPage);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Failed to extract text from PDF');
      }
      
      // Step 2: Notify user about analysis
      setGenerationProgress(40);
      
      if (sectioned) {
        toast({
          title: "Analyzing section content",
          description: `Processing content from pages ${startPage}-${endPage || (startPage + 9)}...`,
        });
      } else {
        toast({
          title: "Analyzing PDF content",
          description: "Identifying key topics and sections...",
        });
      }
      
      // Simulate progress increments for AI analysis
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 5);
          return newProgress < 90 ? newProgress : 90;
        });
      }, 800);
      
      // Step 3: Call API to get generated note
      const endpoint = sectioned ? '/api/generate-section-note' : '/api/generate-note';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          fileName: fileName,
          projectId: projectId,
          totalPages: numPages,
          pdfContent: extractedText,
          // Section-specific data
          sectionNumber: sectioned ? Math.ceil(startPage / 10) : undefined,
          startPage: sectioned ? startPage : undefined,
          endPage: sectioned ? endPage : undefined,
          noteId: noteId // Pass existing note ID if available
        }),
      });
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate note: ${errorData.error || response.statusText}`);
      }
      
      // Step 4: Get generated note
      const generatedNote = await response.json();
      
      // Step 5: Save to database
      await saveNoteToDatabase(generatedNote);
      
      // Step 6: Update state
      setNote({
        id: generatedNote.id,
        sections: generatedNote.sections
      });
      
      // Step 7: Set progress to 100%
      setGenerationProgress(100);
      
      // Step 8: Mark as complete after short delay
      setTimeout(() => {
        setIsGeneratingNote(false);
        setNoteGenerated(true);
        
        toast({
          title: sectioned ? "Section note generated" : "Note generated",
          description: `Notes have been successfully generated for pages ${startPage}-${endPage || (startPage + 9)}.`,
        });
      }, 500);
    } catch (error) {
      console.error("Error generating note:", error);
      setIsGeneratingNote(false);
      
      toast({
        title: "Error generating note",
        description: error instanceof Error ? error.message : "There was a problem analyzing this PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  // Zmodyfikowana funkcja generowania notatek dla sekcji
// Do użycia w useNotes.ts

/**
 * Generuje wstępne notatki dla danej sekcji PDF (tylko nagłówki i opisy, bez treści)
 * @param pdfSource URL do pliku PDF
 * @param sectionNumber Numer aktualnej sekcji
 * @param sectionStartPage Pierwsza strona sekcji
 * @param sectionEndPage Ostatnia strona sekcji
 */
const generateSectionOutline  = async (
  pdfSource: string,
  sectionNumber: number,
  sectionStartPage: number,
  sectionEndPage: number
) => {
  setIsGeneratingNote(true);
  setGenerationProgress(0);
  
  try {
    // Sprawdź, czy notatka już istnieje
    if (noteId) {
      const noteExists = await fetchNoteById(noteId);
      if (noteExists) {
        setIsGeneratingNote(false);
        setNoteGenerated(true);
        return;
      }
    }
    
    // Step 1: Ekstrakcja tekstu z sekcji PDF
    const extractedText = await extractPdfText(
      pdfSource, 
      sectionEndPage - sectionStartPage + 1, 
      true, 
      sectionStartPage, 
      sectionEndPage
    );
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Nie udało się odczytać tekstu z sekcji PDF');
    }
    
    // Step 2: Informacja o analizie
    setGenerationProgress(40);
    toast({
      title: `Analiza sekcji ${sectionNumber}`,
      description: `Identyfikowanie kluczowych tematów ze stron ${sectionStartPage}-${sectionEndPage}...`,
    });
    
    // Symulacja postępu
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 5);
        return newProgress < 90 ? newProgress : 90;
      });
    }, 800);
    
    // Step 3: Wywołanie API tylko do generowania struktury notatki (bez pełnej treści)
    const response = await fetch('/api/generate-section-outline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        fileName,
        projectId,
        sectionNumber,
        startPage: sectionStartPage,
        endPage: sectionEndPage,
        pdfContent: extractedText,
        outlineOnly: true // Ważny parametr - generuje tylko strukturę bez treści
      }),
    });
    
    clearInterval(progressInterval);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Błąd generowania notatki: ${errorData.error || response.statusText}`);
    }
    
    // Step 4: Pobieranie wygenerowanej struktury notatki
    const generatedNote = await response.json();
    
    // Step 5: Zapisanie do bazy danych
    
    const savedNote = await saveNoteToDatabase(generatedNote);
    console.log(savedNote);
    // Step 6: Aktualizacja stanu
    setNote({
      id: savedNote.id,
      sections: savedNote.sections
    });
    
    // Step 7: Postęp 100%
    setGenerationProgress(100);
    
    // Step 8: Zakończenie
    setTimeout(() => {
      setIsGeneratingNote(false);
      setNoteGenerated(true);
      
      toast({
        title: `Struktura notatki dla sekcji ${sectionNumber} utworzona`,
        description: "Wygenerowano podstawową strukturę notatki. Użyj narzędzi, aby rozwinąć poszczególne sekcje.",
      });
    }, 500);
  } catch (error) {
    console.error("Błąd generowania notatki:", error);
    setIsGeneratingNote(false);
    
    toast({
      title: "Błąd generowania struktury notatki",
      description: error instanceof Error ? error.message : "Wystąpił problem podczas analizy tej sekcji PDF. Spróbuj ponownie.",
      variant: "destructive",
    });
  }
};

  // Function to add selected text to notes
  const addTextToNotes = async (selectedText: string, pageNumber: number, surroundingContext: string) => {
    if (!selectedText || selectedText.trim().length === 0) {
      toast({
        title: "No text selected",
        description: "Select a text fragment to add to notes.",
        variant: "destructive",
      });
      return;
    }
    
    // If no note exists yet, generate initial note first
    if (!note.id) {
      toast({
        title: "Generating section note",
        description: "We need to generate a basic note for this section first...",
      });
      // Wait for the note to be generated
      if (!note.id) return;
    }
    
    // Set loading state
    setIsAddingNote(true);
    
    // Show loading toast
    toast({
      title: "Processing text",
      description: "Analyzing and matching text to sections...",
    });
    
    try {
      // Call the API to process the selected text (phase 1: analysis)
      const response = await fetch('/api/notes/add-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText,
          fileId,
          noteId: note.id,
          surroundingContext,
          pageNumber,
          // Section-specific data
          sectionStartPage,
          sectionEndPage
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process text');
      }
      
      // Handle "ignore" action immediately
      if (result.action === "ignore") {
        toast({
          title: "Text skipped",
          description: result.message,
          variant: "default",
        });
        return;
      }
      
      // Process proposals and set up confirmation UI
      if (result.action === "update_proposed") {
        // Proposed update to existing section
        setEditingSection({ 
          id: result.sectionId, 
          action: 'confirm', 
          currentContent: result.currentContent,
          result: result.proposedContent
        });
        
        // Expand the section
        setNote(prevNote => ({
          ...prevNote,
          sections: prevNote.sections.map(section => 
            section.id === result.sectionId 
              ? { ...section, expanded: true } 
              : section
          )
        }));
        
        // Scroll to section
        setTimeout(() => {
          if (sectionRefs.current[result.sectionId]) {
            sectionRefs.current[result.sectionId]?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 200);
        
        toast({
          title: "Update section proposal",
          description: "Check proposed changes and approve or reject.",
        });
      } 
      else if (result.action === "create_proposed") {
        // Proposed creation of new section
        setEditingSection({
          id: -1, // Temporary ID for new section
          action: 'confirm_new',
          result: result.proposedContent,
          title: result.title,
          description: result.description,
          noteId: result.noteId,
          orderIndex: result.orderIndex
        });
        
        toast({
          title: "New section proposal",
          description: "Check proposed new section and approve or reject.",
        });
        
        // Show temporary preview of new section at top of notes list
        const tempSection = {
          id: -1,
          title: result.title,
          description: result.description,
          content: result.proposedContent,
          expanded: true,
          isTemporary: true
        };
        
        // Add temporary section at the beginning for visibility
        setNote(prevNote => ({
          ...prevNote,
          sections: [tempSection, ...prevNote.sections]
        }));
        
        // Scroll to top to show the new section
        setTimeout(() => {
          const notesContainer = document.querySelector('[data-value="notes"]');
          if (notesContainer) notesContainer.scrollTop = 0;
        }, 200);
      }
    } catch (error) {
      console.error("Error adding text to notes:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add text to notes.",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Section action handlers
  // Handle section expansion
  const expandSection = async (sectionId: number) => {
    setEditingSection({ id: sectionId, action: 'expand' });
    setIsProcessingAction(true);
    
    try {
      const section = note.sections.find(s => s.id === sectionId);
      if (!section) return;
      
      // Call AI to expand the section
      const response = await fetch('/api/notes/enhance-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          action: 'expand',
          currentContent: section.content,
          // Section-specific data
          sectionStartPage,
          sectionEndPage
        }),
      });
      
      if (!response.ok) throw new Error('Failed to expand section');
      
      const result = await response.json();
      
      // Show the result for confirmation
      setEditingSection({ 
        id: sectionId, 
        action: 'confirm', 
        result: result.enhancedContent 
      });
    } catch (error) {
      console.error("Error expanding section:", error);
      toast({
        title: "Error",
        description: "Failed to expand section.",
        variant: "destructive",
      });
      setEditingSection(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle section formatting
  const formatSection = async (sectionId: number) => {
    setEditingSection({ id: sectionId, action: 'format' });
    setIsProcessingAction(true);
    
    try {
      const section = note.sections.find(s => s.id === sectionId);
      if (!section) return;
      
      // Call AI to format the section
      const response = await fetch('/api/notes/enhance-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          action: 'format',
          currentContent: section.content
        }),
      });
      
      if (!response.ok) throw new Error('Failed to format section');
      
      const result = await response.json();
      
      // Show the result for confirmation
      setEditingSection({ 
        id: sectionId, 
        action: 'confirm', 
        result: result.enhancedContent 
      });
    } catch (error) {
      console.error("Error formatting section:", error);
      toast({
        title: "Error",
        description: "Failed to format section.",
        variant: "destructive",
      });
      setEditingSection(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open custom prompt dialog
  const openCustomPrompt = (sectionId: number) => {
    setEditingSection({ id: sectionId, action: 'custom' });
    setCustomPrompt('');
  };

  // Submit custom prompt
  const submitCustomPrompt = async () => {
    if (!editingSection || !customPrompt.trim()) return;
    
    setIsProcessingAction(true);
    
    try {
      const section = note.sections.find(s => s.id === editingSection.id);
      if (!section) return;
      
      // Validate the prompt
      if (customPrompt.toLowerCase().includes("delete") || 
          customPrompt.toLowerCase().includes("remove")) {
        throw new Error("To delete section, use the delete option.");
      }
      
      // Call AI with custom prompt
      const response = await fetch('/api/notes/enhance-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: editingSection.id,
          action: 'custom',
          customPrompt,
          currentContent: section.content,
          // Section-specific data
          sectionStartPage,
          sectionEndPage
        }),
      });
      
      if (!response.ok) throw new Error('Failed to process custom prompt');
      
      const result = await response.json();
      
      // Show the result for confirmation
      setEditingSection({ 
        id: editingSection.id, 
        action: 'confirm', 
        prompt: customPrompt,
        result: result.enhancedContent 
      });
    } catch (error) {
      console.error("Error processing custom prompt:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process query.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Confirm section changes - phase 2: commit to database
  const confirmSectionChanges = async () => {
    if (!editingSection) return;
    
    setIsProcessingAction(true);
    
    try {
      // Determine if we're confirming an update or a new section
      const isNewSection = editingSection.action === 'confirm_new';
      
      // Construct request payload based on action type
      const payload = isNewSection 
        ? {
            action: 'create',
            noteId: editingSection.noteId,
            title: editingSection.title,
            description: editingSection.description,
            content: editingSection.result,
            orderIndex: editingSection.orderIndex
          }
        : {
            action: 'update',
            sectionId: editingSection.id,
            content: editingSection.result
          };
      
      // Call commit endpoint - phase 2: save to database
      const response = await fetch('/api/notes/commit-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }
      
      const result = await response.json();
      
      // Update local state with the saved data
      if (isNewSection) {
        // Remove temporary preview section and add the real one
        setNote(prevNote => ({
          ...prevNote,
          // Filter out temporary section and add the real one with database ID
          sections: [
            ...prevNote.sections.filter(s => !s.isTemporary),
            {
              id: result.sectionId,
              title: result.title || editingSection.title,
              description: result.description || editingSection.description || '',
              content: result.content,
              expanded: true
            }
          ]
        }));
      } else {
        // Update the existing section content
        setNote(prevNote => ({
          ...prevNote,
          sections: prevNote.sections.map(section => 
            section.id === editingSection.id
              ? { ...section, content: result.content || editingSection.result }
              : section
          )
        }));
      }
      
      // Show highlight effect on the section
      setHighlightedSectionId(result.sectionId);
      
      // Remove highlight after animation completes
      setTimeout(() => {
        setHighlightedSectionId(null);
      }, 6000);
      
      // Clear editing state
      setEditingSection(null);
      
      toast({
        title: isNewSection ? "New section created" : "Section updated",
        description: "Changes have been saved successfully.",
      });
      
      // Scroll to the final section location
      setTimeout(() => {
        if (sectionRefs.current[result.sectionId]) {
          sectionRefs.current[result.sectionId]?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 200);
    } catch (error) {
      console.error("Error confirming changes:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Cancel section changes - discard proposal without saving
  const cancelSectionChanges = () => {
    // If this was a new section preview, remove it from the UI
    if (editingSection?.action === 'confirm_new') {
      setNote(prevNote => ({
        ...prevNote,
        sections: prevNote.sections.filter(s => !s.isTemporary)
      }));
    }
    
    // Clear editing state
    setEditingSection(null);
    setCustomPrompt('');
    
    toast({
      title: "Changes rejected",
      description: "Changes were not saved.",
    });
  };

  return {
    note,
    isGeneratingNote,
    generationProgress,
    noteGenerated,
    highlightedSectionId,
    editingSection,
    customPrompt,
    isProcessingAction,
    isAddingNote,
    sectionRefs,
    generateInitialNote,
    generateSectionOutline,
    addTextToNotes,
    toggleSection,
    expandSection,
    formatSection,
    openCustomPrompt,
    setCustomPrompt,
    submitCustomPrompt,
    confirmSectionChanges,
    cancelSectionChanges,
  };
}