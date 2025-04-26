"use client";

import React from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePreferences } from "@/context/preferences-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PDFControlsProps {
  pageNumber: number;
  setPageNumber: (pageNumber: number) => void;
  numPages: number | null;
  scale: number;
  setScale: (scale: number) => void;
  renderMethod: 'pdf.js' | 'iframe' | 'embed' | 'object';
}

export default function PDFControls({
  pageNumber,
  setPageNumber,
  numPages,
  scale,
  setScale,
  renderMethod,
}: PDFControlsProps) {
  const { darkMode, t } = usePreferences();
  
  // Determine if we're using native browser rendering (vs PDF.js)
  const usingNativeRenderer = renderMethod !== 'pdf.js';

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

  return (
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
  );
}