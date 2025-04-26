"use client";

import React, { useEffect } from "react";
import { useNotes } from "..//hooks/useNotes";
import NoteSection from "./NoteSection";
import NoteGenerationProgress from "./NoteGenerationProgress";
import { usePdfFile } from "@/hooks/use-pdf-file";
import pdfjs from "../pdfjs-setup";

interface NotesPanelProps {
  fileId: number;
  fileName?: string;
  projectId?: number;
  selectedText: string;
  pageNumber: number;
  pagesRef: React.MutableRefObject<{ [pageNumber: number]: HTMLDivElement }>;
  renderMethod: 'pdf.js' | 'iframe' | 'embed' | 'object';
  setShowTools: (show: boolean) => void;
}

export default function NotesPanel({
  fileId,
  fileName,
  projectId,
  selectedText,
  pageNumber,
  pagesRef,
  renderMethod,
  setShowTools
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
    addTextToNotes,
    toggleSection,
    expandSection,
    formatSection,
    openCustomPrompt,
    setCustomPrompt,
    submitCustomPrompt,
    confirmSectionChanges,
    cancelSectionChanges,
  } = useNotes({ fileId, projectId, fileName });

  // Get PDF URL for extracting text
  const { signedUrl } = usePdfFile({ fileId });

  // Add auto-generation effect
  useEffect(() => {
    // Function to auto-generate notes when PDF is loaded
    const autoGenerateNotes = async () => {
      if (signedUrl && !noteGenerated && !isGeneratingNote) {
        try {
          // Get total pages from the PDF
          const loadingTask = pdfjs.getDocument(signedUrl);
          const pdf = await loadingTask.promise;
          const numPages = pdf.numPages;
          
          // Generate initial note
          console.log("GENERATING INITIAL NOTE...............");
          generateInitialNote(signedUrl, numPages);
        } catch (error) {
          console.error("Error in auto-generation:", error);
        }
      }
    };

    // Only run if we have a URL and notes aren't already generated
    if (signedUrl && !noteGenerated && !isGeneratingNote) {
      autoGenerateNotes();
    }
  }, [signedUrl, noteGenerated, isGeneratingNote, generateInitialNote]);

  // Function to add selected text to notes
  const handleAddSelectedText = async () => {
    if (!selectedText) return;
    
    // Get surrounding context if possible
    let surroundingContext = "";
    try {
      if (renderMethod === 'pdf.js' && pagesRef.current[pageNumber]) {
        const pageElement = pagesRef.current[pageNumber];
        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (textLayer) {
          surroundingContext = textLayer.textContent || "";
          
          // Limit context size
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
      console.error("Error getting context:", error);
    }
    
    // Add text to notes
    await addTextToNotes(selectedText, pageNumber, surroundingContext);
    setShowTools(false);
  };

  // Add the animation style for highlighting
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

  return (
    <div className="flex flex-col gap-4">
      {/* Add animation style */}
      <style dangerouslySetInnerHTML={{ __html: pulseAnimation }} />
      
      {/* Generation progress indicator */}
      {isGeneratingNote && (
        <NoteGenerationProgress progress={generationProgress} />
      )}
      
      {/* Generated note with sections */}
      {!isGeneratingNote && note.id && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Note for: {fileName}</h3>
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
              />
            ))}
          </div>
        </>
      )}
      
      {/* Empty state */}
      {!isGeneratingNote && !note.id && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No notes yet. Click the "Add to notes" button in the PDF viewer to generate a note.
          </p>
        </div>
      )}
      
      {/* Action button for selected text */}
      {selectedText && (
        <div className="fixed bottom-4 right-4">
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg"
            onClick={handleAddSelectedText}
          >
            Add to Notes
          </button>
        </div>
      )}
    </div>
  );
}