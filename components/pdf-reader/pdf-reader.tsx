"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePreferences } from "@/context/preferences-context";
import { useParams } from "next/navigation";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PDFViewer from "./PDFViewer";  // Zmodyfikowany komponent
import PDFControls from "./PDFControls";
import NotesPanel from "./notes/NotesPanel";
import TestsPanel from "./tests/TestPanel";
import DictionaryPanel from "./dictionary/DictionaryPanel";
import SelectionTools from "./selection/SelectionTools";
import { usePdfFile } from "@/hooks/use-pdf-file";
import { useProjects } from "@/context/projects-context";
import pdfjs from "./pdfjs-setup";
interface PDFReaderProps {
  fileUrl: string;  
  fileName: string;
  fileId: number;
  onClose: () => void;
}

export default function PDFReader({ fileUrl, fileName, fileId, onClose }: PDFReaderProps) {
  const { darkMode, t } = usePreferences();
  const params = useParams();
  const { projects } = useProjects();
  const project = projects.find((p) => p.project_id.toString() === params.id);
  
  // PDF states
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [showTools, setShowTools] = useState(false);
  const [usingDirectUrl, setUsingDirectUrl] = useState(false);
  const [renderMethod, setRenderMethod] = useState<'pdf.js' | 'iframe' | 'embed' | 'object'>('pdf.js');
  
  // Use the custom hook to get the signed URL
  const { signedUrl, loading, error, retry } = usePdfFile({ 
    fileId: typeof fileId === 'number' ? fileId : -1, 
    fileUrl 
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  const documentRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<{ [pageNumber: number]: HTMLDivElement }>({});

  // Determine the final PDF source URL
  const pdfSource = usingDirectUrl ? fileUrl : signedUrl;
  
  // Update document loading state based on the hook's loading state
  useEffect(() => {
    console.log("Hook loading state changed:", loading);
    setDocumentLoading(loading);
    
    // Update error state
    if (error) {
      console.error("PDF loading error from hook:", error);
      setDocumentError(error);
    }
  }, [loading, error]);

  // Logowanie stanu źródła PDF dla debugowania
  useEffect(() => {
    console.log("PDF source updated:", {
      pdfSource: pdfSource ? `${pdfSource.substring(0, 50)}...` : null,
      signedUrl: signedUrl ? `${signedUrl.substring(0, 50)}...` : null,
      fileUrl: fileUrl ? `${fileUrl.substring(0, 50)}...` : null,
      usingDirectUrl
    });
  }, [pdfSource, signedUrl, fileUrl, usingDirectUrl]);

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
    console.log("Retrying PDF load...");
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setUsingDirectUrl(!usingDirectUrl); // Toggle between signed and direct URL
      
      // Try different render method on each retry
      const methods: Array<'pdf.js' | 'iframe' | 'embed' | 'object'> = ['pdf.js', 'iframe', 'embed', 'object'];
      const nextMethodIndex = (methods.indexOf(renderMethod) + 1) % methods.length;
      setRenderMethod(methods[nextMethodIndex]);
      
      setDocumentLoading(true);
      setLoadingProgress(0);
      setDocumentError(null);
      retry();
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
          {/* Debug info */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="absolute top-0 left-0 z-50 bg-black bg-opacity-70 text-white p-2 text-xs">
              PDF Status: {documentLoading ? 'Loading' : documentError ? 'Error' : 'Loaded'}<br />
              Progress: {loadingProgress}%<br />
              Method: {renderMethod}<br />
              Source: {pdfSource ? 'Yes' : 'No'}
            </div>
          )}
          
          {/* Renderowanie komponentu PDFViewer z prawidłowymi propami */}
          {pdfSource ? (
            <PDFViewer 
              pdfSource={pdfSource}
              renderMethod={renderMethod}
              setRenderMethod={setRenderMethod}
              scale={scale}
              numPages={numPages}
              setNumPages={setNumPages}
              pageNumber={pageNumber}
              documentLoading={documentLoading}
              setDocumentLoading={setDocumentLoading}
              loadingProgress={loadingProgress}
              setLoadingProgress={setLoadingProgress}
              documentError={documentError}
              setDocumentError={setDocumentError}
              pagesRef={pagesRef}
              handleRetry={handleRetry}
              onClose={onClose}
              downloadUrl={pdfSource}
              fileName={fileName}
              setSelectedText={setSelectedText}
              setShowTools={setShowTools}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <p className="text-muted-foreground">Waiting for PDF source URL...</p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a moment...
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - for notes, tests, etc. */}
        <div className={`w-96 border-l overflow-auto ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <Tabs defaultValue="notes">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">
                Notes
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex-1">
                Tests
              </TabsTrigger>
              <TabsTrigger value="dictionary" className="flex-1">
                Dictionary
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes" className="p-4">
              <NotesPanel 
                fileId={fileId}
                fileName={fileName}
                projectId={project?.project_id}
                selectedText={selectedText}
                pageNumber={pageNumber}
                pagesRef={pagesRef}
                renderMethod={renderMethod}
                setShowTools={setShowTools}
              />
            </TabsContent>
            
            <TabsContent value="tests" className="p-4">
              <TestsPanel
                fileId={fileId}
                fileName={fileName}
                projectId={project?.project_id}
              />
            </TabsContent>
            
            <TabsContent value="dictionary" className="p-4">
              <DictionaryPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Controls at the bottom */}
      {!documentLoading && !documentError && numPages && (
        <PDFControls 
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          numPages={numPages}
          scale={scale}
          setScale={setScale}
          renderMethod={renderMethod}
        />
      )}

      {/* Selection tools */}
      {showTools && (
        <SelectionTools
          selectedText={selectedText}
          setShowTools={setShowTools}
          onAddToNotes={() => {
            // Reference to the notes tab's addSelectedText function
            const notesTab = document.querySelector('[data-state="inactive"][value="notes"]');
            if (notesTab) {
              (notesTab as HTMLElement).click();
            }
          }}
        />
      )}
    </div>  
  );
}