"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { usePreferences } from "@/context/preferences-context";

interface NoteGenerationProgressProps {
  progress: number;
}

export default function NoteGenerationProgress({ progress }: NoteGenerationProgressProps) {
  const { darkMode } = usePreferences();

  return (
    <div className={`border rounded-md p-3 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">
          {progress < 40 
            ? "Extracting PDF content" 
            : "Generating note"}
        </h3>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full h-2" />
      <p className="text-xs text-muted-foreground mt-2">
        {progress < 40 
          ? "Reading document text for analysis..." 
          : "Analyzing PDF content and creating thematic sections..."}
      </p>
    </div>
  );
}