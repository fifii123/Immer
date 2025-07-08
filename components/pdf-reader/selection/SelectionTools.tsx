"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePreferences } from "@/context/preferences-context";
import { 
  BookOpen, 
  X,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SelectionToolsProps {
  selectedText: string;
  setShowTools: (show: boolean) => void;
  onAddToNotes: () => void;
  pageNumber?: number;
  pagesRef?: React.MutableRefObject<{ [pageNumber: number]: HTMLDivElement }>;
}

export default function SelectionTools({
  selectedText,
  setShowTools,
  onAddToNotes,
  pageNumber,
  pagesRef
}: SelectionToolsProps) {
  const { darkMode, t } = usePreferences();
  
  // States for expanding UI
  const [isExplaining, setIsExplaining] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  
  // Refs for measurements
  const toolboxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [initialWidth, setInitialWidth] = useState(120); // Domyślna szerokość toolbox
  const [textHeight, setTextHeight] = useState(0);
  
  // Measure initial width tylko raz na początku
  useEffect(() => {
    if (toolboxRef.current && !isExplaining && initialWidth === 120) {
      // Zmierz tylko jeśli jeszcze nie było mierzone (initialWidth === domyślne 120)
      const currentWidth = toolboxRef.current.offsetWidth;
      setInitialWidth(currentWidth);
    }
  }, [isExplaining, initialWidth]);

  // Smooth height tracking
  useEffect(() => {
    if (textRef.current && isExplaining) {
      const updateHeight = () => {
        if (textRef.current) {
          const newHeight = textRef.current.scrollHeight;
          setTextHeight(Math.max(newHeight, 20));
        }
      };
      
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(textRef.current);
      updateHeight();
      
      return () => resizeObserver.disconnect();
    }
  }, [isExplaining, streamedText]);

  // Delayed button appearance
  useEffect(() => {
    if (streamComplete) {
      const timer = setTimeout(() => {
        setShowButtons(true);
      }, 800);
      
      return () => clearTimeout(timer);
    } else {
      setShowButtons(false);
    }
  }, [streamComplete]);

  // Tool functions
  const explainText = async () => {
    try {
      setIsExplaining(true);
      setIsStreaming(true);
      setStreamedText('');
      setStreamComplete(false);
      setShowButtons(false);
      
      // Pobierz kontekst
      const context = extractSmartContext();
      
      // Start streaming
      const response = await fetch('/api/explain-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          context
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              setStreamComplete(true);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setStreamedText(prev => prev + parsed.content);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
      
    } catch (error) {
      console.error("Error calling explain-text API:", error);
      setIsStreaming(false);
      setIsExplaining(false);
    }
  };
  
  // Funkcja inteligentnego pobierania kontekstu
  const extractSmartContext = (): string => {
    if (!pageNumber || !pagesRef?.current[pageNumber]) {
      return '';
    }
    
    try {
      const pageElement = pagesRef.current[pageNumber];
      const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
      
      if (!textLayer) {
        return '';
      }
      
      const fullPageText = textLayer.textContent || '';
      const selectedIndex = fullPageText.indexOf(selectedText);
      
      if (selectedIndex === -1) {
        return fullPageText.substring(0, 1000);
      }
      
      const contextRadius = 400;
      const startPos = Math.max(0, selectedIndex - contextRadius);
      const endPos = Math.min(fullPageText.length, selectedIndex + selectedText.length + contextRadius);
      
      let context = fullPageText.substring(startPos, endPos);
      
      if (startPos > 0) {
        const sentenceStart = context.indexOf('. ');
        if (sentenceStart > 0 && sentenceStart < 100) {
          context = context.substring(sentenceStart + 2);
        }
      }
      
      const lastSentenceEnd = context.lastIndexOf('. ');
      if (lastSentenceEnd > context.length - 100) {
        context = context.substring(0, lastSentenceEnd + 1);
      }
      
      return context;
      
    } catch (error) {
      console.error("Error extracting context:", error);
      return '';
    }
  };
  
  const saveToDict = () => {
    console.log("Saving to dictionary:", { selectedText, explanation: streamedText });
  };
  
  const closeExplanation = () => {
    // Całkowicie ukryj toolbox - tak jak przycisk X
    setShowTools(false);
  };

  // Calculate dynamic dimensions
  const expandedWidth = Math.max(initialWidth * 4, 320);
  const buttonHeight = showButtons ? 44 : 0;
  const dynamicHeight = isExplaining ? Math.max(textHeight + 32 + buttonHeight, 52) : 'auto';

  return (
    <div 
      ref={toolboxRef}
      className={`absolute left-1/2 transform -translate-x-1/2 bottom-24 z-50 ${
        darkMode ? 'bg-slate-800 shadow-slate-700' : 'bg-white shadow-gray-300'
      } rounded-lg shadow-lg ${isExplaining ? '' : 'overflow-visible'}`}
      style={{
        width: isExplaining ? `${expandedWidth}px` : `${initialWidth}px`,
        height: dynamicHeight,
        maxWidth: '600px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {!isExplaining ? (
        // Normal toolbar
        <div className="p-2 flex items-center gap-2">
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
      ) : (
        // Expanded explanation view
        <div className="p-4">
          {/* Streaming text area */}
          <div 
            ref={textRef}
            className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {streamedText}
            {isStreaming && <span className="animate-pulse ml-1">|</span>}
          </div>
          
          {/* Action buttons - delayed appearance */}
          {showButtons && (
            <div 
              className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-600"
              style={{
                transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
                opacity: showButtons ? 1 : 0,
                transform: showButtons ? 'translateY(-6px)' : 'translateY(0px)'
              }}
            >
              <Button 
                size="sm" 
                variant="outline" 
                onClick={saveToDict}
                className="text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Zapisz
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={closeExplanation}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Zamknij
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}