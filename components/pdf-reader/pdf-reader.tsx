    "use client";

    import React, { useState, useEffect, useRef } from "react";
    import { usePreferences } from "@/context/preferences-context";

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

    // TextLayer CSS is applied inline instead of import

    // Set up worker for PDF.js
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    // Import the hook you provided
    import { usePdfFile } from "@/hooks/use-pdf-file";

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
    
    const documentRef = useRef<HTMLDivElement>(null);

    // Determine if we're using native browser rendering (vs PDF.js)
    const usingNativeRenderer = renderMethod !== 'pdf.js';

    // Use the custom hook to get the signed URL
    const { signedUrl, loading, error, retry } = usePdfFile({ 
        fileId: typeof fileId === 'number' ? fileId : -1, 
        fileUrl 
    });
    const [retryCount, setRetryCount] = useState(0);

    // Apply TextLayer styles globally
    // Enhanced CSS for better text alignment
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
        .react-pdf__Page__textContent {
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            line-height: 1.0 !important;
            user-select: text !important;
        }
        
        .react-pdf__Page__textContent span {
            color: transparent !important;
            /* Ważne - ustawienie origin transformacji w lewym górnym rogu */
            transform-origin: 0% 0%;
            /* Dostosuj te wartości dla swojego konkretnego PDF */
            transform: scaleX(0.975) !important; 
            white-space: pre !important;
            position: absolute !important;
        }
        
        /* Upewnij się, że canvas jest na odpowiedniej pozycji */
        .react-pdf__Page__canvas {
            margin: 0 auto !important;
            position: relative !important;
            z-index: 1;
        }
        
        /* Warstwa tekstowa powinna być dokładnie nad canvasem */
        .react-pdf__Page__textContent {
            position: absolute !important;
            z-index: 2;
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

    // Fix text alignment after PDF loads
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setDocumentLoading(false);
        setDocumentError(null);
        setLoadingProgress(100);
        
        // Apply styles to fix text layer alignment
        setTimeout(() => {
        const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');
        textLayers.forEach((layer) => {
            if (layer instanceof HTMLElement) {
            layer.style.top = '0';
            layer.style.left = '0';
            layer.style.transform = 'none';
            layer.style.lineHeight = '1.0';
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
                }}
            >
                {Array.from(
                new Array(numPages || 0),
                (_, index) => (
                    <div 
                    key={`page_${index + 1}`} 
                    className={`mb-8 shadow-lg ${darkMode ? 'shadow-slate-700' : 'shadow-gray-300'}`}
                    >
                    <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="bg-white"
                        /* customTextRenderer must return a string, not JSX */
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
                    <div className="flex items-center gap-2">
                    <Input placeholder={t('searchNotes') || 'Search notes...'} />
                    <Button size="icon" variant="ghost">
                        <Search className="h-4 w-4" />
                    </Button>
                    </div>
                    <p className="text-muted-foreground text-center py-8">
                    {t('noNotesYet') || 'No notes yet. Select text to add a note.'}
                    </p>
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
                    <Button variant="ghost" size="icon" onClick={createNote}>
                    <FileText className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('addToNotes') || 'Add to notes'}</TooltipContent>
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