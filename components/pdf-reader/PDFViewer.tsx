"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page } from 'react-pdf';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";

interface PDFViewerProps {
  pdfSource: string | null;
  renderMethod: 'pdf.js' | 'iframe' | 'embed' | 'object';
  setRenderMethod: (method: 'pdf.js' | 'iframe' | 'embed' | 'object') => void;
  scale: number;
  numPages: number | null;
  setNumPages: (pages: number) => void;
  pageNumber: number;
  documentLoading: boolean;
  setDocumentLoading: (loading: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
  documentError: string | null;
  setDocumentError: (error: string | null) => void;
  pagesRef: React.MutableRefObject<{ [pageNumber: number]: HTMLDivElement }>;
  handleRetry: () => void;
  onClose: () => void;
  downloadUrl: string | null;
  fileName: string;
  setSelectedText: (text: string) => void;
  setShowTools: (show: boolean) => void;
  // Section-specific props
  sectionStartPage?: number;
  sectionEndPage?: number;
}

export default function PDFViewer({
  pdfSource,
  renderMethod,
  setRenderMethod,
  scale,
  numPages,
  setNumPages,
  pageNumber,
  documentLoading,
  setDocumentLoading,
  loadingProgress,
  setLoadingProgress,
  documentError,
  setDocumentError,
  pagesRef,
  handleRetry,
  onClose,
  downloadUrl,
  fileName,
  setSelectedText,
  setShowTools,
  sectionStartPage = 1,
  sectionEndPage
}: PDFViewerProps) {
  // Device pixel ratio for high-DPI displays
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  
  // Determine if we're using native browser rendering (vs PDF.js)
  const usingNativeRenderer = renderMethod !== 'pdf.js';
  
  // Store refs for embedded viewers to access their documents
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const embedRef = useRef<HTMLEmbedElement | null>(null);
  const objectRef = useRef<HTMLObjectElement | null>(null);

  // Reset loading state when PDF source changes
  useEffect(() => {
    if (pdfSource) {
      setDocumentLoading(true);
      setLoadingProgress(0);
      setDocumentError(null);
    }
  }, [pdfSource, setDocumentLoading, setLoadingProgress, setDocumentError]);

  // Apply TextLayer styles globally with enhanced alignment
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Main PDF page container */
      .react-pdf__Page {
        position: relative !important;
        overflow: hidden !important;
      }
      
      /* Canvas layer */
      .react-pdf__Page__canvas {
        margin: 0 auto !important;
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Text layer - critical for proper overlay */
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
      
      /* Text elements */
      .react-pdf__Page__textContent span {
        color: transparent !important;
        position: absolute !important;
        white-space: pre !important;
        cursor: text !important;
        transform-origin: 0% 0% !important;
        line-height: 1.0 !important;
      }
      
      /* Selection highlight */
      ::selection {
        background: rgba(0, 100, 255, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Track text selection
  useEffect(() => {
    const handleSelection = () => {
      // Get selection from the main document
      const mainSelection = window.getSelection();
      let selectedContent = mainSelection?.toString() || "";
      
      // Try to get selection from embedded elements when using native renderers
      if (!selectedContent && usingNativeRenderer) {
        try {
          // For iframe
          if (renderMethod === 'iframe' && iframeRef.current?.contentWindow) {
            const iframeSelection = iframeRef.current.contentWindow.getSelection();
            selectedContent = iframeSelection?.toString() || "";
          }
        } catch (error) {
          console.error("Error accessing selection in embedded element:", error);
        }
      }
      
      if (selectedContent && selectedContent.trim().length > 0) {
        setSelectedText(selectedContent);
        setShowTools(true);
      } else if (selectedContent.trim().length === 0) {
        setShowTools(false);
      }
    };

    // Listen to mouseup events on the document
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('selectionchange', handleSelection);
    
    // For iframe elements, try to attach listeners to their document too
    const attachIframeListeners = () => {
      if (renderMethod === 'iframe' && iframeRef.current?.contentWindow && iframeRef.current?.contentDocument) {
        try {
          iframeRef.current.contentDocument.addEventListener('mouseup', handleSelection);
          iframeRef.current.contentDocument.addEventListener('selectionchange', handleSelection);
        } catch (e) {
          console.error("Failed to attach iframe listeners:", e);
        }
      }
    };
    
    // Try to attach iframe listeners after a small delay
    if (usingNativeRenderer && renderMethod === 'iframe') {
      const timer = setTimeout(attachIframeListeners, 1000);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mouseup', handleSelection);
        document.removeEventListener('selectionchange', handleSelection);
        
        if (iframeRef.current?.contentDocument) {
          try {
            iframeRef.current.contentDocument.removeEventListener('mouseup', handleSelection);
            iframeRef.current.contentDocument.removeEventListener('selectionchange', handleSelection);
          } catch (e) {
            // Ignore errors on cleanup
          }
        }
      };
    }
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [setSelectedText, setShowTools, usingNativeRenderer, renderMethod]);

  // Function for page load success
  const onPageLoadSuccess = (page: any) => {
    // Only adjust layers when using PDF.js
    if (renderMethod === 'pdf.js') {
      setTimeout(() => {
        const pageContainer = page.pageElement;
        if (!pageContainer) return;
        
        const canvasLayer = pageContainer.querySelector('.react-pdf__Page__canvas');
        const textLayer = pageContainer.querySelector('.react-pdf__Page__textContent');
        
        if (!canvasLayer || !textLayer) return;
        
        const canvasWidth = canvasLayer.width / devicePixelRatio;
        const canvasHeight = canvasLayer.height / devicePixelRatio;
        
        textLayer.style.width = `${canvasWidth}px`;
        textLayer.style.height = `${canvasHeight}px`;
        textLayer.style.top = '0px';
        textLayer.style.left = '0px';
        textLayer.style.transform = 'none';
      }, 50);
    }
  };

  // Function to handle document loading success
  const onDocumentLoadSuccess = ({ numPages: loadedPages }: { numPages: number }) => {
    setNumPages(loadedPages);
    setDocumentLoading(false);
    setDocumentError(null);
    setLoadingProgress(100);
    
    // Additional layer alignment
    setTimeout(() => {
      const pages = document.querySelectorAll('.react-pdf__Page');
      pages.forEach((page) => {
        const canvas = page.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
        const textLayer = page.querySelector('.react-pdf__Page__textContent') as HTMLElement;
        
        if (canvas && textLayer) {
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

  // Function to handle document loading error
  const onDocumentLoadError = (error: Error) => {
    console.error("PDF loading error:", error);
    setDocumentError(`Failed to load PDF: ${error.message}`);
    setDocumentLoading(false);
  };

  // Function to handle native renderer load events
  const handleNativeLoad = () => {
    setDocumentLoading(false);
    setLoadingProgress(100);
    setDocumentError(null);
  };
  
  // Function to handle native renderer error events
  const handleNativeError = (error: any) => {
    console.error(`Native ${renderMethod} renderer error:`, error);
    setDocumentError(`Failed to load PDF in ${renderMethod} mode`);
    setDocumentLoading(false);
  };

  // Function to download the PDF
  const downloadPdf = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate pages to render based on section
  const actualEndPage = sectionEndPage || numPages || 0;
  
  // Function to render PDF based on selected method
  const renderPdf = () => {
    if (!pdfSource) {
      return null;
    }
    
    switch (renderMethod) {
      case 'iframe':
        // Native renderers can't limit to specific page ranges
        return (
          <div className="w-full h-full flex justify-center">
            <iframe 
              ref={iframeRef}
              src={pdfSource} 
              className="w-full h-full border-none"
              title={fileName || 'PDF Document'}
              onLoad={handleNativeLoad}
              onError={handleNativeError}
            />
          </div>
        );
      
      case 'embed':
        return (
          <div className="w-full h-full flex justify-center">
            <embed 
              ref={embedRef}
              src={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
              onLoad={handleNativeLoad}
              onError={handleNativeError}
            />
          </div>
        );
      
      case 'object':
        return (
          <div className="w-full h-full flex justify-center">
            <object 
              ref={objectRef}
              data={pdfSource} 
              type="application/pdf"
              className="w-full h-full"
              onLoad={handleNativeLoad}
              onError={handleNativeError}
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
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex justify-center p-4">
                <Progress value={loadingProgress} className="w-40" />
              </div>
            }
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/standard_fonts/',
              renderMode: 0, // Best quality
              textLayerMode: 2, // Full rendering
              renderInteractiveForms: true,
              disableAutoFetch: false,
              disableStream: false,
              rangeChunkSize: 65536,
            }}
          >
            {/* Only render pages in the current section */}
            {Array.from(
              new Array(actualEndPage - sectionStartPage + 1),
              (_, index) => {
                const actualPageNumber = sectionStartPage + index;
                return (
                  <div 
                    key={`page_${actualPageNumber}`} 
                    className="mb-8 shadow-lg shadow-gray-300 dark:shadow-slate-700"
                    ref={(el) => {
                      if (el) {
                        pagesRef.current[actualPageNumber] = el;
                      }
                    }}
                  >
                    <Page
                      key={`page_${actualPageNumber}`}
                      pageNumber={actualPageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="bg-white"
                      onLoadSuccess={onPageLoadSuccess}
                      devicePixelRatio={devicePixelRatio}
                      renderForms={true}
                      renderMode="canvas"
                      customTextRenderer={({ str }) => {
                        return str;
                      }}
                    />
                  </div>
                );
              }
            )}
          </Document>
        );
    }
  };

  // For loading state
  if (documentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Progress 
          value={loadingProgress} 
          className="w-1/3 mb-4" 
        />
        <p className="text-sm text-muted-foreground">
          Loading PDF... ({loadingProgress}%)
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          This may take a moment...
        </p>
        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={handleRetry} 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try another method
          </Button>
        </div>
      </div>
    );
  }

  // For error state
  if (documentError) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-6">
        <p className="text-red-500 text-center mb-4">{documentError}</p>
        <p className="text-xs text-muted-foreground mb-4">
          Debug info: 
          <br />
          Source: {pdfSource ? `${pdfSource.substring(0, 50)}...` : 'none'}
          <br />
          Method: {renderMethod}
        </p>
        
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={handleRetry} 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button onClick={onClose}>
            Go back
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
    );
  }

  // Render the PDF content
  return (
    <div className={`flex flex-col items-center ${usingNativeRenderer ? 'h-full w-full' : 'py-8'}`}>
      {pdfSource ? (
        <div className="relative">
          {/* Section indicator */}
          {!usingNativeRenderer && (
            <div className="absolute top-0 left-0 bg-black bg-opacity-60 text-white px-2 py-1 text-xs z-10 rounded-br">
              Viewing pages {sectionStartPage}-{actualEndPage}
            </div>
          )}
          {renderPdf()}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 w-full">
          <p className="text-muted-foreground">No PDF source URL provided.</p>
        </div>
      )}
    </div>
  );
}