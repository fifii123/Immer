"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePreferences } from "@/context/preferences-context";
import { useParams } from "next/navigation";
import { X, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PDFViewer from "./PDFViewer";
import PDFControls from "./PDFControls";
import NotesPanel from "./notes/NotesPanel";
import TestsPanel from "./tests/TestPanel";
import DictionaryPanel from "./dictionary/DictionaryPanel";
import SelectionTools from "./selection/SelectionTools";
import { usePdfFile } from "@/hooks/use-pdf-file";
import { useProjects } from "@/context/projects-context";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

// Constants
const PAGES_PER_SECTION = 10;

interface PDFReaderProps {
 fileUrl: string;  
 fileName: string;
 fileId: number;
 onClose: () => void;
}

export default function SectionedPDFReader({ fileUrl, fileName, fileId, onClose }: PDFReaderProps) {
 const { darkMode, t } = usePreferences();
 const params = useParams();
 const { projects } = useProjects();
 const project = projects.find((p) => p.project_id.toString() === params.id);
 const { toast } = useToast();
 
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
 
 // Section states
 const [currentSection, setCurrentSection] = useState(1);
 const [sectionNotes, setSectionNotes] = useState<{[sectionId: number]: {
   id: number | null;
   isLoading: boolean;
   error: string | null;
 }}>({});
 const [activeTab, setActiveTab] = useState<string>("notes");
 
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
   setDocumentLoading(loading);
   
   // Update error state
   if (error) {
     console.error("PDF loading error from hook:", error);
     setDocumentError(error);
   }
 }, [loading, error]);

 // Calculate section information
 const totalSections = numPages ? Math.ceil(numPages / PAGES_PER_SECTION) : 0;
 const sectionStartPage = (currentSection - 1) * PAGES_PER_SECTION + 1;
 const sectionEndPage = Math.min(currentSection * PAGES_PER_SECTION, numPages || 0);
 const currentSectionRange = `${sectionStartPage}-${sectionEndPage}`;
 
 // Effect to update page number when section changes
 useEffect(() => {
   if (numPages) {
     // Set page number to the start of the current section
     setPageNumber(sectionStartPage);
     
     // Automatycznie przełącz na zakładkę notatek przy zmianie sekcji
     setActiveTab("notes");
     
     // Pokaż komunikat o zmianie sekcji
     toast({
       title: `Sekcja ${currentSection}`,
       description: `Wyświetlanie stron ${sectionStartPage}-${sectionEndPage} z ${numPages}`,
     });
   }
 }, [currentSection, numPages, sectionStartPage, sectionEndPage, toast]);

 // Effect to fetch section note when section changes
 useEffect(() => {
   if (currentSection && pdfSource) {
     fetchSectionNote();
   }
 }, [currentSection, pdfSource]);

 // Function to fetch existing section note
 const fetchSectionNote = async () => {
   // Jeśli już mamy informacje o tej sekcji i notatka jest w trakcie ładowania, nie powtarzaj
   if (sectionNotes[currentSection]?.isLoading) return;
   
   // Ustaw stan ładowania dla tej sekcji
   setSectionNotes(prev => ({
     ...prev, 
     [currentSection]: { 
       ...prev[currentSection],
       isLoading: true, 
       error: null 
     }
   }));
   
   try {
     console.log(`Sprawdzam notatkę dla sekcji ${currentSection}`);
     
     // Spróbuj znaleźć istniejącą notatkę dla sekcji
     const existingNoteResponse = await fetch(`/api/notes?fileId=${fileId}&sectionNumber=${currentSection}`);
     
     if (existingNoteResponse.ok) {
       const data = await existingNoteResponse.json();
       
       // Sprawdź, czy odpowiedź zawiera id notatki
       if (data && data.id) {
         console.log(`Znaleziono notatkę dla sekcji ${currentSection}, ID: ${data.id}`);
         
         // Notatka istnieje, ustaw jej ID w stanie
         const noteId = typeof data.id === 'string' ? data.id.replace('note_', '') : data.id;
         
         setSectionNotes(prev => ({
           ...prev, 
           [currentSection]: { 
             id: Number(noteId), 
             isLoading: false, 
             error: null 
           }
         }));
         return;
       }
     }
     
     // Jeśli notatka nie istnieje, ustaw null jako ID
     console.log(`Notatka dla sekcji ${currentSection} nie istnieje - oczekiwanie na generowanie`);
     setSectionNotes(prev => ({
       ...prev, 
       [currentSection]: { 
         id: null, 
         isLoading: false, 
         error: null 
       }
     }));
     
   } catch (error) {
     console.error("Błąd sprawdzania notatki sekcji:", error);
     setSectionNotes(prev => ({
       ...prev, 
       [currentSection]: { 
         ...prev[currentSection],
         isLoading: false, 
         error: error instanceof Error ? error.message : "Błąd sprawdzania notatki" 
       }
     }));
   }
 };

 // Callback function for when a note is created
 const handleNoteCreated = (noteId: number) => {
   console.log(`Notatka dla sekcji ${currentSection} została utworzona, ID: ${noteId}`);
   setSectionNotes(prev => ({
     ...prev,
     [currentSection]: {
       ...prev[currentSection],
       id: noteId,
       isLoading: false,
       error: null
     }
   }));
 };

 // Navigate to previous section
 const goToPreviousSection = () => {
   if (currentSection > 1) {
     setCurrentSection(currentSection - 1);
   }
 };

 // Navigate to next section
 const goToNextSection = () => {
   if (currentSection < totalSections) {
     setCurrentSection(currentSection + 1);
   }
 };

 // Handle retry
 const handleRetry = () => {
   console.log("Retrying PDF load...");
   if (retryCount < MAX_RETRIES) {
     setRetryCount(prev => prev + 1);
     setUsingDirectUrl(!usingDirectUrl);
     
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

 // Get current section note data
 const currentSectionNote = sectionNotes[currentSection] || { id: null, isLoading: true, error: null };

 return (
   <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
     {/* Header */}
     <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
       <div className="flex items-center gap-3">
         <FileText className="h-5 w-5 text-blue-500" />
         <h2 className="text-lg font-semibold truncate max-w-lg">{fileName}</h2>
         {numPages && (
           <Badge variant="outline" className="ml-2">
             Sekcja {currentSection}/{totalSections} • Strony {currentSectionRange} z {numPages}
           </Badge>
         )}
       </div>
       <div className="flex items-center gap-2">
         {/* Section navigation */}
         {numPages && totalSections > 1 && (
           <div className="flex items-center mr-4">
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     onClick={goToPreviousSection} 
                     disabled={currentSection <= 1 || currentSectionNote.isLoading}
                   >
                     <ChevronLeft className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Poprzednia sekcja</TooltipContent>
               </Tooltip>
             </TooltipProvider>
             
             <span className="mx-2 text-sm">
               {currentSection}/{totalSections}
             </span>
             
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     onClick={goToNextSection} 
                     disabled={currentSection >= totalSections || currentSectionNote.isLoading}
                   >
                     <ChevronRight className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>Następna sekcja</TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
         )}
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
             // Section-specific props
             sectionStartPage={sectionStartPage}
             sectionEndPage={sectionEndPage}
           />
         ) : (
           <div className="flex flex-col items-center justify-center h-full w-full">
             <p className="text-muted-foreground">Oczekiwanie na URL dokumentu PDF...</p>
             <p className="text-xs text-muted-foreground mt-2">
               To może zająć chwilę...
             </p>
           </div>
         )}
       </div>

       {/* Sidebar - for notes, tests, etc. */}
       <div className={`w-96 border-l overflow-auto ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
         <Tabs 
           defaultValue="notes" 
           value={activeTab}
           onValueChange={setActiveTab}
         >
           <TabsList className="w-full">
             <TabsTrigger value="notes" className="flex-1">
               Notatki
               {currentSectionNote.isLoading && <span className="ml-2 animate-pulse">•</span>}
             </TabsTrigger>
             <TabsTrigger value="tests" className="flex-1">
               Testy
             </TabsTrigger>
             <TabsTrigger value="dictionary" className="flex-1">
               Słownik
             </TabsTrigger>
           </TabsList>
           
           <TabsContent value="notes" className="p-4">
             <NotesPanel 
               fileId={fileId}
               fileName={`${fileName} (Sekcja ${currentSection})`}
               projectId={project?.project_id}
               selectedText={selectedText}
               pageNumber={pageNumber}
               pagesRef={pagesRef}
               renderMethod={renderMethod}
               setShowTools={setShowTools}
               // Zaktualizowane/nowe props
               noteId={currentSectionNote.id}
               noteIsLoading={currentSectionNote.isLoading}
               noteError={currentSectionNote.error}
               onNoteCreated={handleNoteCreated}
               sectionNumber={currentSection}
               sectionStartPage={sectionStartPage}
               sectionEndPage={sectionEndPage}
               pdfSource={pdfSource}
               outlineOnly={true} // Generowanie tylko struktury bez treści
             />
           </TabsContent>
           
           <TabsContent value="tests" className="p-4">
             <TestsPanel
               fileId={fileId}
               fileName={fileName}
               projectId={project?.project_id}
               // Section-specific props
               sectionNumber={currentSection}
               sectionStartPage={sectionStartPage}
               sectionEndPage={sectionEndPage}
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
         // Section-specific props
         sectionStartPage={sectionStartPage}
         sectionEndPage={sectionEndPage}
       />
     )}

     {/* Selection tools */}
     {showTools && (
       <SelectionTools
         selectedText={selectedText}
         setShowTools={setShowTools}
         onAddToNotes={() => {
           // Przełącz na zakładkę notatek
           setActiveTab("notes");
         }}
       />
     )}
   </div>  
 );
}