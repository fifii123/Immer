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
}

export default function SelectionTools({
  selectedText,
  setShowTools,
  onAddToNotes
}: SelectionToolsProps) {
  const { darkMode, t } = usePreferences();

  // Tool functions
  const explainText = () => {
    console.log("Explaining text:", selectedText);
    // Here you would implement the actual explanation functionality
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