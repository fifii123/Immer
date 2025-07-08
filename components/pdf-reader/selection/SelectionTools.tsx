"use client";

import React from "react";
import { usePreferences } from "@/context/preferences-context";
import { 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Languages, 
  Bookmark, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

  // Tool functions
  const explainText = async () => {
    try {
      // Pobierz inteligentny kontekst
      const context = extractSmartContext();
      
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
      
      const result = await response.json();
      
      if (result.success) {
        console.log("Explanation:", result.explanation);
        // Tutaj dodasz UI do wyświetlenia wyjaśnienia
      } else {
        console.error("Failed to generate explanation:", result.error);
      }
      
    } catch (error) {
      console.error("Error calling explain-text API:", error);
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
        // Jeśli nie znaleziono dokładnego tekstu, zwróć początek strony
        return fullPageText.substring(0, 1000);
      }
      
      // Pobierz inteligentny kontekst wokół zaznaczonego tekstu
      const contextRadius = 400; // znaki przed i po zaznaczonym tekście
      const startPos = Math.max(0, selectedIndex - contextRadius);
      const endPos = Math.min(fullPageText.length, selectedIndex + selectedText.length + contextRadius);
      
      let context = fullPageText.substring(startPos, endPos);
      
      // Spróbuj znaleźć naturalne granice (końce zdań)
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
  
  const createTest = () => {
    console.log("Creating test for text:", selectedText);
  };
  
  const translateText = () => {
    console.log("Translating text:", selectedText);
  };
  
  const bookmarkText = () => {
    console.log("Bookmarking text:", selectedText);
  };

  return (
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
      
      {/* Close button */}
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
  );
}