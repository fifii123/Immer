"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePreferences } from "@/context/preferences-context";
import { useParams } from "next/navigation";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Languages,
  Bookmark,
  Search,
  RefreshCw,
  Download,
  // Add these icons for renderer selection
  Globe,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import { useToast } from "@/components/ui/use-toast"
// Set up worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Import the hook you provided
import { usePdfFile } from "@/hooks/use-pdf-file";
import { useProjects } from "@/context/projects-context";

// Define available rendering methods
type RenderMethod = 'pdf.js' | 'iframe' | 'embed' | 'object';

interface PDFReaderProps {
  fileUrl: string;  
  fileName: string;
  fileId: number;
  onClose: () => void;
}

export default function PDFReader({ fileUrl, fileName, fileId, onClose }: PDFReaderProps) {
  const { darkMode, t } = usePreferences();
  
  // PDF states
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [showTools, setShowTools] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [usingDirectUrl, setUsingDirectUrl] = useState(false);
  // New state for the rendering method
  const [renderMethod, setRenderMethod] = useState<RenderMethod>('pdf.js');
  const MAX_RETRIES = 3;
  const {projects} = useProjects();
  const documentRef = useRef<HTMLDivElement>(null);
  // Ref do śledzenia aktualnie renderowanych stron
  const pagesRef = useRef<{ [pageNumber: number]: HTMLDivElement }>({});
  const params = useParams();
  // Determine if we're using native browser rendering (vs PDF.js)
  const usingNativeRenderer = renderMethod !== 'pdf.js';
const { toast } = useToast()
  // Use the custom hook to get the signed URL
  const { signedUrl, loading, error, retry } = usePdfFile({ 
    fileId: typeof fileId === 'number' ? fileId : -1, 
    fileUrl 
  });
  const [retryCount, setRetryCount] = useState(0);
  
  // Detekcja urządzeń o wysokiej gęstości pikseli
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const project = projects.find((p) => p.project_id.toString() === params.id);


// NOTE CREATION WILL BE IMPLEMENTED HERE ///////////////////////////////////////////////////////////////////////////

// State for note generation
const [isGeneratingNote, setIsGeneratingNote] = useState(false);
const [generationProgress, setGenerationProgress] = useState(0);
const [noteGenerated, setNoteGenerated] = useState(false);

// State for the generated note with sections

const [note, setNote] = useState<{
  id: string | null;
  sections: Array<{
    id: number;
    title: string;
    description: string;
    content: string;
    expanded: boolean;
  }>;
}>({
  id: null,
  sections: []
});

// Check for existing notes in localStorage when component mounts
// Check for existing notes in localStorage when component mounts
useEffect(() => {
  if (fileId) {
    const existingNote = localStorage.getItem(`pdf_note_${fileId}`);
    if (existingNote) {
      const parsedNote = JSON.parse(existingNote);
      // Make sure all sections have an expanded property
      const sections = parsedNote.sections.map(section => ({
        ...section,
        expanded: section.expanded || false
      }));
      setNote({
        id: parsedNote.id,
        sections: sections
      });
      setNoteGenerated(true);
    }
  }
}, [fileId]);


// Function to toggle section expansion
const toggleSection = (sectionId: number) => {
  setNote(prevNote => ({
    ...prevNote,
    sections: prevNote.sections.map(section => 
      section.id === sectionId 
        ? { ...section, expanded: !section.expanded } 
        : section
    )
  }));
};


// Function to generate initial note from PDF
const generateInitialNote = async () => {
  // Check if note was already generated
  if (noteGenerated || isGeneratingNote) return;
  
  setIsGeneratingNote(true);
  setGenerationProgress(20); // Start with some progress
  
  try {
    // Notify the user
    toast({
      title: "Note generation started",
      description: "Analyzing PDF content to generate note...",
    });
    
    // Simulate progress increases
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 15);
        return newProgress < 90 ? newProgress : 90; // Cap at 90% until complete
      });
    }, 800);
    
    // Call the API to get generated note
    const response = await fetch('/api/generate-note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId,
        fileName: fileName,
        projectId: project?.project_id,
        totalPages: numPages || 0
      }),
    });
    
    // Clear the progress interval
    clearInterval(progressInterval);
    
    if (!response.ok) {
      throw new Error(`Failed to generate note: ${response.statusText}`);
    }
    
    // Get the generated note directly
    const generatedNote = await response.json();
    
    // Save to localStorage
    localStorage.setItem(`pdf_note_${fileId}`, JSON.stringify(generatedNote));
    
    // Update state
    setNote({
      id: generatedNote.id,
      sections: generatedNote.sections
    });
    
    // Set progress to 100%
    setGenerationProgress(100);
    
    // Mark as complete after a short delay
    setTimeout(() => {
      setIsGeneratingNote(false);
      setNoteGenerated(true);
      
      // Show the notes tab
      const notesTab = document.querySelector('[data-state="inactive"][value="notes"]');
      if (notesTab) {
        (notesTab as HTMLElement).click();
      }
      
      toast({
        title: "Note generated",
        description: "Your note has been successfully generated with thematic sections.",
      });
    }, 500);
    
  } catch (error) {
    console.error("Error generating note:", error);
    setIsGeneratingNote(false);
    
    toast({
      title: "Error generating note",
      description: "There was a problem analyzing this PDF. Please try again.",
      variant: "destructive",
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Apply TextLayer styles globally with enhanced alignment
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Główny kontener strony PDF */
      .react-pdf__Page {
        position: relative !important;
        overflow: hidden !important;
      }
      
      /* Canvas - warstwa graficzna */
      .react-pdf__Page__canvas {
        margin: 0 auto !important;
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Warstwa tekstowa - kluczowe dla nakładania */
      .react-pdf__Page__textContent {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2 !important;
        transform: none !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      
      /* Pojedyncze elementy tekstowe */
      .react-pdf__Page__textContent span {
        color: transparent !important;
        position: absolute !important;
        white-space: pre !important;
        cursor: text !important;
        transform-origin: 0% 0% !important;
        line-height: 1.0 !important;
      }
      

      
      /* Aktywne zaznaczenie tekstu */
      ::selection {
        background: rgba(0, 100, 255, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // Update document loading state based on the hook's loading state
    setDocumentLoading(loading);
    
    // Update error state
    if (error) {
      setDocumentError(error);
    }
  }, [loading, error]);

  // Add fallback to direct URL if signed URL fails
  useEffect(() => {
    if (documentLoading && loadingProgress === 0) {
      const timer = setTimeout(() => {
        console.log("Loading timeout, trying direct URL...");
        setUsingDirectUrl(true);
      }, 5000); // 5 seconds timeout
      
      return () => clearTimeout(timer);
    }
  }, [documentLoading, loadingProgress]);

  // Handle retry
  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setUsingDirectUrl(!usingDirectUrl); // Toggle between signed and direct URL
      retry();
    }
  };

  // Track text selection - improved to work with iframe/embed/object elements
  useEffect(() => {
    const handleSelection = () => {
      // Get selection from the main document
      const mainSelection = window.getSelection();
      let selectedContent = mainSelection?.toString() || "";
      
      // Try to get selection from embedded elements when using native renderers
      if (!selectedContent && usingNativeRenderer) {
        try {
          // For iframe
          const iframeElement = documentRef.current?.querySelector('iframe');
          if (iframeElement && iframeElement.contentWindow) {
            const iframeSelection = iframeElement.contentWindow.getSelection();
            selectedContent = iframeSelection?.toString() || "";
          }
          
          // For object/embed - this is trickier as they don't expose selection directly
          // This would require a more complex approach with messaging
        } catch (error) {
          console.error("Error accessing selection in embedded element:", error);
        }
      }
      
      if (selectedContent) {
        setSelectedText(selectedContent);
        setShowTools(true);
      } else if (!selectedContent && showTools) {
        setShowTools(false);
      }
    };

    // Listen to mouseup events on the document
    document.addEventListener('mouseup', handleSelection);
    
    // For iframe elements, we need to attach listeners to their document too
    const attachIframeListeners = () => {
      const iframeElement = documentRef.current?.querySelector('iframe');
      if (iframeElement && iframeElement.contentWindow && iframeElement.contentDocument) {
        iframeElement.contentDocument.addEventListener('mouseup', handleSelection);
        iframeElement.contentDocument.addEventListener('selectionchange', handleSelection);
      }
    };
    
    // Try to attach iframe listeners after a small delay to ensure iframe is loaded
    if (usingNativeRenderer && renderMethod === 'iframe') {
      const timer = setTimeout(attachIframeListeners, 1000);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mouseup', handleSelection);
        
        const iframeElement = documentRef.current?.querySelector('iframe');
        if (iframeElement && iframeElement.contentDocument) {
          iframeElement.contentDocument.removeEventListener('mouseup', handleSelection);
          iframeElement.contentDocument.removeEventListener('selectionchange', handleSelection);
        }
      };
    }
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, [showTools, usingNativeRenderer, renderMethod]);

  // Funkcja wywoływana po pomyślnym załadowaniu strony PDF
  const onPageLoadSuccess = (page: any) => {
    // Dostosuj warstwy tylko gdy używamy PDF.js (nie w przypadku iframe/embed/object)
    if (renderMethod === 'pdf.js') {
      // Odczekaj moment aby upewnić się, że wszystkie warstwy są załadowane
      setTimeout(() => {
        // Pobierz referencje do elementów strony
        const pageContainer = page.pageElement;
        if (!pageContainer) return;
        
        // Znajdź warstwę canvas (graficzną)
        const canvasLayer = pageContainer.querySelector('.react-pdf__Page__canvas');
        // Znajdź warstwę tekstową
        const textLayer = pageContainer.querySelector('.react-pdf__Page__textContent');
        
        if (!canvasLayer || !textLayer) return;
        
        // Pobierz rzeczywiste wymiary canvas
        const canvasWidth = canvasLayer.width / devicePixelRatio;
        const canvasHeight = canvasLayer.height / devicePixelRatio;
        
        // Ustaw dokładne wymiary i pozycję warstwy tekstowej
        textLayer.style.width = `${canvasWidth}px`;
        textLayer.style.height = `${canvasHeight}px`;
        textLayer.style.top = '0px';
        textLayer.style.left = '0px';
        textLayer.style.transform = 'none';
        
        // Opcjonalnie dostosuj poszczególne elementy tekstowe jeśli nadal występuje niedopasowanie
        const textElements = textLayer.querySelectorAll('span');
        textElements.forEach((span: HTMLElement) => {
          // Zachowaj oryginalne transformacje, ale dostosuj je nieznacznie
          // Dla każdego PDF może być wymagana inna wartość - można to eksperymentalnie dostosować
          if (span.style.transform) {
            // Wyodrębnij bieżące wartości transformacji (translate, scale itp.)
            const transformValue = span.style.transform;
            
            // Poniższe można dostosować dla konkretnego PDF - tutaj użyty jest przykładowy współczynnik korekcji
            // Dostosuj mnożnik skali X (0.975) dla idealnego dopasowania
            span.style.transform = transformValue;
            span.style.transformOrigin = '0% 0%';
          }
        });
      }, 50); // krótkie opóźnienie dla pewności, że DOM się zaktualizował
    }
  };

  // Function to handle PDF document loading success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setDocumentLoading(false);
    setDocumentError(null);
    setLoadingProgress(100);
    
    // Dodatkowe środki dla pewności dopasowania warstw
    setTimeout(() => {
      // Znajdź wszystkie warstwy tekstowe i canvasy
      const pages = document.querySelectorAll('.react-pdf__Page');
      pages.forEach((page) => {
        const canvas = page.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
        const textLayer = page.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        
        if (canvas && textLayer) {
          // Ustaw dokładne wymiary
          const canvasWidth = canvas.width / devicePixelRatio;
          const canvasHeight = canvas.height / devicePixelRatio;
          
          textLayer.style.width = `${canvasWidth}px`;
          textLayer.style.height = `${canvasHeight}px`;
          textLayer.style.top = '0px';
          textLayer.style.left = '0px';
          textLayer.style.transform = 'none';
        }
      });
    }, 100);
  };

  // Function to handle PDF document loading progress
  const onDocumentLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    const progress = Math.round((loaded / total) * 100);
    setLoadingProgress(progress);
  };

  // Function to handle PDF document loading error
  const onDocumentLoadError = (error: Error) => {
    console.error("PDF loading error:", error);
    setDocumentError(`Failed to load PDF: ${error.message}`);
    setDocumentLoading(false);
    
    // If using signed URL failed, try direct URL
    if (!usingDirectUrl) {
      console.log("Error with signed URL, trying direct URL");
      setUsingDirectUrl(true);
      setDocumentLoading(true);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  // Page navigation functions
  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };
  
  // Functions for tools
  const createNote = () => {
    console.log("Creating note for text:", selectedText);
  };
  
  const createTest = () => {
    console.log("Creating test for text:", selectedText);
  };
  
  const translateText = () => {
    console.log("Translating text:", selectedText);
  };
  
  const explainText = () => {
    console.log("Explaining text:", selectedText);
    // Here you would implement the actual explanation functionality
    // For example, using an AI service to generate an explanation
  };
  
  const downloadPdf = () => {
    const url = usingDirectUrl ? fileUrl : signedUrl;
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Determine which URL to use
  const pdfSource = usingDirectUrl ? fileUrl : signedUrl;

  // Function to render PDF based on selected method
  const renderPdf = () => {
    if (!pdfSource) return null;
    
    switch (renderMethod) {
      case 'iframe':
        return (
          <div className="w-full h-full flex justify-center">
            <iframe 
              src={pdfSource} 
              className="w-full h-full border-none"
              title={fileName || 'PDF Document'}
            />
          </div>
        );
      
      case 'embed':
        return (
          <div className="w-full h-full flex justify-center">
            <embed 
              src={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
            />
          </div>
        );
      
      case 'object':
        return (
          <div className="w-full h-full flex justify-center">
            <object 
              data={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="text-center p-4">
                <p className="mb-2">Your browser doesn't support PDF viewing.</p>
                <Button 
                  variant="outline" 
                  onClick={downloadPdf} 
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </object>
          </div>
        );
      
      default: // 'pdf.js'
        return (
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadProgress={onDocumentLoadProgress}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex justify-center p-4">
                <Progress value={loadingProgress} className="w-40" />
              </div>
            }
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: true,
              // Dodatkowe opcje dla lepszego renderowania
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/standard_fonts/',
              // Użyj najlepszego trybu renderowania dla dokładnego dopasowania
              renderMode: 0, // najlepsza jakość (wolniejsza)
              // Włącz warstwę tekstową
              textLayerMode: 2, // pełne renderowanie
              // Włącz obsługę formularzy interaktywnych
              renderInteractiveForms: true,
              // Ustaw prawidłową wartość DPI
              disableAutoFetch: false,
              disableStream: false,
              // Wartość devicePixelRatio dla ekranów HiDPI
              rangeChunkSize: 65536,
            }}
          >
            {Array.from(
              new Array(numPages || 0),
              (_, index) => (
                <div 
                  key={`page_${index + 1}`} 
                  className={`mb-8 shadow-lg ${darkMode ? 'shadow-slate-700' : 'shadow-gray-300'}`}
                  ref={(el) => {
                    if (el) {
                      pagesRef.current[index + 1] = el;
                    }
                  }}
                >
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="bg-white"
                    onLoadSuccess={onPageLoadSuccess}
                    // Ustaw odpowiedni współczynnik devicePixelRatio
                    devicePixelRatio={devicePixelRatio}
                    // Włącz renderowanie czcionek
                    renderForms={true}
                    renderMode="canvas"
                    // Precyzyjne opcje renderowania
                    customTextRenderer={({ str, itemIndex }) => {
                      return str;
                    }}
                  />
                </div>
              )
            )}
          </Document>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold truncate max-w-lg">{fileName}</h2>
          {retryCount > 0 && (
            <span className="text-xs text-muted-foreground">
              (Attempt {retryCount}/{MAX_RETRIES})
            </span>
          )}
          {usingDirectUrl && (
            <span className="text-xs text-orange-500">
              (Using direct URL)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Added a selector for render methods */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setRenderMethod(renderMethod === 'pdf.js' ? 'iframe' : 
                              renderMethod === 'iframe' ? 'embed' : 
                              renderMethod === 'embed' ? 'object' : 'pdf.js')}
                >
                  <Layers className="h-4 w-4" />
                  {renderMethod === 'pdf.js' ? 'PDF.js' : 
                   renderMethod === 'iframe' ? 'iframe' : 
                   renderMethod === 'embed' ? 'embed' : 'object'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change PDF rendering method</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" size="icon" onClick={downloadPdf} title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div 
          className="flex-1 overflow-auto flex justify-center bg-slate-100 dark:bg-slate-800" 
          ref={documentRef}
        >
          {documentLoading ? (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <Progress 
                value={loadingProgress} 
                className="w-1/3 mb-4" 
              />
              <p className="text-sm text-muted-foreground">
                {t('loadingPdf') || 'Loading PDF...'} ({loadingProgress}%)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment...
              </p>
              {retryCount > 0 && (
                <Button onClick={handleRetry} variant="outline" size="sm" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('manualRetry') || 'Try again'}
                </Button>
              )}
            </div>
          ) : documentError ? (
            <div className="flex flex-col items-center justify-center h-full w-full p-6">
              <p className="text-red-500 text-center mb-4">{documentError}</p>
              
              {retryCount >= MAX_RETRIES ? (
                <div className="text-sm text-muted-foreground text-center mb-4">
                  <p>Too many failed attempts to load this document.</p>
                  <p>Try downloading the PDF directly.</p>
                </div>
              ) : null}
              
              <div className="flex gap-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleRetry} 
                  className="flex items-center gap-2"
                  disabled={retryCount >= MAX_RETRIES}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('retry') || 'Try again'}
                </Button>
                <Button onClick={onClose}>
                  {t('goBack') || 'Go back'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={downloadPdf} 
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center ${usingNativeRenderer ? 'h-full w-full' : 'py-8'}`}>
              {/* Using our new renderPdf function */}
              {pdfSource && renderPdf()}
            </div>
          )}
        </div>

        {/* Sidebar - for notes, tests, etc. */}
        <div className={`w-80 border-l overflow-auto ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <Tabs defaultValue="notes">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                {t('notes') || 'Notes'}
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex-1">
                <GraduationCap className="h-4 w-4 mr-2" />
                {t('tests') || 'Tests'}
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex-1">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('glossary') || 'Dictionary'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes" className="p-4">
  <div className="flex flex-col gap-4">
    {/* Note generation progress indicator */}
    {isGeneratingNote && (
      <div className={`border rounded-md p-3 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Generating note</h3>
          <span className="text-xs text-muted-foreground">{generationProgress}%</span>
        </div>
        <Progress value={generationProgress} className="w-full h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          Analyzing PDF content and creating thematic sections...
        </p>
      </div>
    )}
    
{/* Generated note with sections */}
{!isGeneratingNote && note.id && (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium">Note for: {fileName}</h3>
    </div>
    
    <div className="space-y-4">
      {note.sections.map((section) => (
        <div 
          key={section.id}
          className={`border rounded-md overflow-hidden ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          {/* Section header with title */}
          <div 
            className={`p-3 ${section.expanded ? 'border-b' : ''} ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            } cursor-pointer`}
            onClick={() => toggleSection(section.id)}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-base">{section.title}</h3>
              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
                section.expanded ? 'transform rotate-90' : ''
              }`} />
            </div>
          </div>
          
          {/* Section description - always visible */}
          <div className={`px-3 py-2 ${section.expanded ? 'border-b' : ''} ${
            darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'
          }`}>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          
          {/* Section content - only visible when expanded */}
          {section.expanded && (
            <div className="p-3">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {section.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-sm mb-2">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>
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
  </div>
</TabsContent>
            
            <TabsContent value="tests" className="p-4">
              <p className="text-muted-foreground text-center py-8">
                {t('noTestsYet') || 'No tests yet. Select text to create a test.'}
              </p>
            </TabsContent>
            
            <TabsContent value="terms" className="p-4">
              <p className="text-muted-foreground text-center py-8">
                {t('noTermsYet') || 'No terms yet. Select text to add to dictionary.'}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Controls at the bottom of the screen */}
      {!documentLoading && !documentError && (
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Only show zoom controls for PDF.js renderer */}
              {!usingNativeRenderer && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={zoomOut}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('zoomOut') || 'Zoom out'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Slider 
                    className="w-32" 
                    value={[scale * 100]} 
                    min={50} 
                    max={300} 
                    step={10}
                    onValueChange={(value) => setScale(value[0] / 100)}
                  />
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={zoomIn}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('zoomIn') || 'Zoom in'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              
              {/* Show a message for native renderers */}
              {usingNativeRenderer && (
                <span className="text-sm text-muted-foreground">
                  Using {renderMethod} viewer (browser's native controls)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Only show page navigation for PDF.js renderer */}
              {!usingNativeRenderer && numPages && (
                <>
                  <span className="text-sm">
                    {pageNumber} / {numPages || 0}
                  </span>
                  
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={goToPrevPage} 
                            disabled={pageNumber <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('previousPage') || 'Previous page'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={goToNextPage} 
                            disabled={pageNumber >= (numPages || 0)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('nextPage') || 'Next page'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tools for selected text */}
      {showTools && (
        <div 
          className={`absolute left-1/2 transform -translate-x-1/2 bottom-24 flex items-center gap-2 p-2 rounded-lg shadow-lg z-50 ${
            darkMode ? 'bg-slate-800 shadow-slate-700' : 'bg-white shadow-gray-300'
          }`}
        >
          {/* Text explanation option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={explainText}>
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('explainText') || 'Explain text'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-8" />
          
{/* Add to notes option */}
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={generateInitialNote}
        disabled={isGeneratingNote || noteGenerated}
      >
        {isGeneratingNote ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isGeneratingNote 
        ? 'Generating note...' 
        : noteGenerated
          ? 'Note already generated'
          : (t('addToNotes') || 'Add to notes')}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

          <Separator orientation="vertical" className="h-8" />
          
          {/* Create test option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={createTest}>
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('createTest') || 'Create test'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-8" />
          
          {/* Translate option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={translateText}>
                  <Languages className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('translate') || 'Translate'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-8" />
          
          {/* Bookmark option */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('bookmark') || 'Bookmark'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Close button */}
          <Separator orientation="vertical" className="h-8" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowTools(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('closeTools') || 'Close'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>  
  );
}