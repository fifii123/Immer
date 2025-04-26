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
import { Badge } from "@/components/ui/badge";

interface PDFControlsProps {
  pageNumber: number;
  setPageNumber: (pageNumber: number) => void;
  numPages: number | null;
  scale: number;
  setScale: (scale: number) => void;
  renderMethod: 'pdf.js' | 'iframe' | 'embed' | 'object';
  // Section-specific props
  sectionStartPage?: number;
  sectionEndPage?: number;
}

export default function PDFControls({
  pageNumber,
  setPageNumber,
  numPages,
  scale,
  setScale,
  renderMethod,
  sectionStartPage = 1,
  sectionEndPage
}: PDFControlsProps) {
  const { darkMode, t } = usePreferences();
  
  // Determine if we're using native browser rendering (vs PDF.js)
  const usingNativeRenderer = renderMethod !== 'pdf.js';

  // Compute the actual end page with a fallback to the total pages
  const actualEndPage = sectionEndPage || numPages || 0;

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  // Page navigation functions - constrained to section
  const goToPrevPage = () => {
    if (pageNumber > sectionStartPage) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < actualEndPage) {
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

          {/* Section indicator badge */}
          {!usingNativeRenderer && (
            <Badge variant="outline" className="ml-2">
              Section pages: {sectionStartPage}-{actualEndPage}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Only show page navigation for PDF.js renderer */}
          {!usingNativeRenderer && (
            <>
              <span className="text-sm">
                {pageNumber} / {actualEndPage}
              </span>
              
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={goToPrevPage} 
                        disabled={pageNumber <= sectionStartPage}
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
                        disabled={pageNumber >= actualEndPage}
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