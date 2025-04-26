"use client";

import React, { useEffect } from "react";
import { useNotes } from "../hooks/useNotes";
import NoteSection from "./NoteSection";
import NoteGenerationProgress from "./NoteGenerationProgress";
import { usePdfFile } from "@/hooks/use-pdf-file";
import { FileText, Book, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotesPanelProps {
  fileId: number;
  fileName?: string;
  projectId?: number;
  selectedText: string;
  pageNumber: number;
  pagesRef: React.MutableRefObject<{ [pageNumber: number]: HTMLDivElement }>;
  renderMethod: 'pdf.js' | 'iframe' | 'embed' | 'object';
  setShowTools: (show: boolean) => void;
  // Section-specific props
  noteId?: number | null;
  sectionNumber?: number;
  sectionStartPage?: number;
  sectionEndPage?: number;
  isLoading?: boolean;
  pdfSource?: string | null;
  outlineOnly?: boolean; // Czy generować tylko strukturę bez treści
}

export default function NotesPanel({
  fileId,
  fileName,
  projectId,
  selectedText,
  pageNumber,
  pagesRef,
  renderMethod,
  setShowTools,
  noteId,
  sectionNumber = 1,
  sectionStartPage = 1,
  sectionEndPage,
  isLoading = false,
  pdfSource,
  outlineOnly = true
}: NotesPanelProps) {
  const {
    note,
    isGeneratingNote,
    generationProgress,
    noteGenerated,
    highlightedSectionId,
    editingSection,
    customPrompt,
    isProcessingAction,
    sectionRefs,
    generateInitialNote,
    generateSectionOutline, // Nowa funkcja do generowania tylko struktury
    addTextToNotes,
    toggleSection,
    expandSection,
    formatSection,
    openCustomPrompt,
    setCustomPrompt,
    submitCustomPrompt,
    confirmSectionChanges,
    cancelSectionChanges,
  } = useNotes({ 
    fileId, 
    projectId, 
    fileName,
    noteId, // Przekaż konkretne ID notatki jeśli istnieje
    sectionStartPage,
    sectionEndPage,
    outlineOnly
  });

  // Auto-generowanie struktury notatki dla sekcji
  useEffect(() => {
    // Automatycznie generuj strukturę notatki, gdy wszystkie warunki są spełnione
    const autoGenerateSectionOutline = async () => {
      if (
        pdfSource && 
        noteId && 
        !noteGenerated && 
        !isGeneratingNote && 
        !isLoading &&
        sectionStartPage && 
        sectionEndPage
      ) {
        try {
          if (outlineOnly) {
            // Generuj tylko strukturę notatki bez treści
            await generateSectionOutline(
              pdfSource, 
              sectionNumber, 
              sectionStartPage, 
              sectionEndPage
            );
          } else {
            // Generuj pełną notatkę (dla kompatybilności wstecznej)
            await generateInitialNote(
              pdfSource, 
              sectionEndPage - sectionStartPage + 1, 
              true, 
              sectionStartPage, 
              sectionEndPage
            );
          }
        } catch (error) {
          console.error("Błąd auto-generowania notatki dla sekcji:", error);
        }
      }
    };

    autoGenerateSectionOutline();
  }, [pdfSource, noteId, noteGenerated, isGeneratingNote, isLoading, sectionStartPage, sectionEndPage, sectionNumber, outlineOnly]);

  // Funkcja do dodawania zaznaczonego tekstu do notatek
  const handleAddSelectedText = async () => {
    if (!selectedText) return;
    
    // Pobierz kontekst otaczający zaznaczony tekst
    let surroundingContext = "";
    try {
      if (renderMethod === 'pdf.js' && pagesRef.current[pageNumber]) {
        const pageElement = pagesRef.current[pageNumber];
        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (textLayer) {
          surroundingContext = textLayer.textContent || "";
          
          // Ogranicz rozmiar kontekstu
          if (surroundingContext.length > 1000) {
            const position = surroundingContext.indexOf(selectedText);
            if (position > 0) {
              const startPos = Math.max(0, position - 300);
              const endPos = Math.min(surroundingContext.length, position + selectedText.length + 300);
              surroundingContext = surroundingContext.substring(startPos, endPos);
            } else {
              surroundingContext = surroundingContext.substring(0, 1000);
            }
          }
        }
      }
    } catch (error) {
      console.error("Błąd pobierania kontekstu:", error);
    }
    
    // Dodaj tekst do notatki dla tej sekcji
    await addTextToNotes(selectedText, pageNumber, surroundingContext);
    setShowTools(false);
  };

  // Dodaj animację podświetlania
  const pulseAnimation = `
    @keyframes pulse-highlight {
      0% { background-color: rgba(59, 130, 246, 0); }
      30% { background-color: rgba(59, 130, 246, 0.15); }
      100% { background-color: rgba(59, 130, 246, 0); }
    }
    
    .section-highlight {
      animation: pulse-highlight 5.5s ease-in-out;
    }
  `;

  // Funkcja do regeneracji struktury notatek
  const handleRegenerateOutline = async () => {
    if (!pdfSource) return;
    
    // Generuj strukturę notatki ponownie
    if (outlineOnly) {
      await generateSectionOutline(
        pdfSource, 
        sectionNumber, 
        sectionStartPage, 
        sectionEndPage || (sectionStartPage + 9)
      );
    } else {
      await generateInitialNote(
        pdfSource, 
        sectionEndPage || (sectionStartPage + 9), 
        true, 
        sectionStartPage, 
        sectionEndPage
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dodaj animację podświetlania */}
      <style dangerouslySetInnerHTML={{ __html: pulseAnimation }} />
      
      {/* Nagłówek sekcji */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Book className="h-4 w-4 mr-2 text-blue-500" />
          <h3 className="text-sm font-medium">
            {sectionNumber ? `Notatki dla sekcji ${sectionNumber}` : 'Notatki'}
            {sectionStartPage && sectionEndPage && (
              <Badge variant="outline" className="ml-2 text-xs">
                Strony {sectionStartPage}-{sectionEndPage}
              </Badge>
            )}
          </h3>
        </div>
        
        {/* Przycisk regeneracji struktury notatek */}
        {noteGenerated && !isGeneratingNote && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRegenerateOutline}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="text-xs">Odśwież</span>
          </Button>
        )}
      </div>
      
      {/* Wskaźnik postępu generowania */}
      {isGeneratingNote && (
        <NoteGenerationProgress 
          progress={generationProgress} 
          sectionSpecific={true}
          sectionNumber={sectionNumber}
          outlineOnly={outlineOnly}
        />
      )}
      
      {/* Wygenerowane sekcje notatek */}
      {!isGeneratingNote && note.id && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {fileName ? `Notatki dla: ${fileName}` : 'Notatki sekcji'}
            </h3>
          </div>
          
          <div className="space-y-4">
            {note.sections.map((section) => (
              <NoteSection 
                key={section.id + (section.isTemporary ? '-temp' : '')}
                section={section}
                isEditing={editingSection?.id === section.id}
                editingAction={editingSection?.action}
                isHighlighted={highlightedSectionId === section.id}
                customPrompt={customPrompt}
                isProcessing={isProcessingAction}
                editingResult={editingSection?.result}
                sectionRef={(el) => sectionRefs.current[section.id] = el}
                onToggle={() => !section.isTemporary && toggleSection(section.id)}
                onExpand={() => expandSection(section.id)}
                onFormat={() => formatSection(section.id)}
                onCustomPrompt={() => openCustomPrompt(section.id)}
                onUpdateCustomPrompt={setCustomPrompt}
                onSubmitCustomPrompt={submitCustomPrompt}
                onConfirm={confirmSectionChanges}
                onCancel={cancelSectionChanges}
                outlineOnly={outlineOnly} // Przekaż informację o trybie generowania
              />
            ))}
          </div>
          
          {/* Informacja o trybie generowania */}
          {outlineOnly && note.sections.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-md text-sm text-muted-foreground">
              <p>Wygenerowano strukturę notatek bez treści. Użyj przycisków "Poszerz" lub "Formatuj", aby uzupełnić treść wybranych sekcji.</p>
            </div>
          )}
        </>
      )}
      
      {/* Pusty stan */}
      {!isGeneratingNote && !note.id && !isLoading && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Brak notatek dla tej sekcji. Kliknij przycisk "Wygeneruj strukturę notatek" dla stron {sectionStartPage}-{sectionEndPage || (sectionStartPage + 9)}.
          </p>
          <Button 
            onClick={handleRegenerateOutline}
            disabled={!pdfSource}
          >
            Wygeneruj strukturę notatek
          </Button>
        </div>
      )}
      
      {/* Stan ładowania */}
      {isLoading && !note.id && !isGeneratingNote && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Ładowanie notatek dla tej sekcji...
          </p>
        </div>
      )}
      
      {/* Przycisk akcji dla zaznaczonego tekstu */}
      {selectedText && (
        <div className="fixed bottom-4 right-4">
          <Button 
            className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg"
            onClick={handleAddSelectedText}
          >
            Dodaj do notatek
          </Button>
        </div>
      )}
    </div>
  );
}