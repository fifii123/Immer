"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { usePreferences } from "@/context/preferences-context";

interface NoteGenerationProgressProps {
  progress: number;
  sectionSpecific?: boolean;
  sectionNumber?: number;
  outlineOnly?: boolean; // Czy generujemy tylko strukturę bez treści
}

export default function NoteGenerationProgress({ 
  progress, 
  sectionSpecific = false,
  sectionNumber = 1,
  outlineOnly = false
}: NoteGenerationProgressProps) {
  const { darkMode } = usePreferences();

  return (
    <div className={`border rounded-md p-3 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">
          {progress < 40 
            ? (sectionSpecific 
                ? `Odczytywanie treści z sekcji ${sectionNumber}`
                : "Odczytywanie treści dokumentu") 
            : (outlineOnly
                ? `Tworzenie struktury notatki dla sekcji ${sectionNumber}`
                : (sectionSpecific
                    ? `Generowanie notatki dla sekcji ${sectionNumber}`
                    : "Generowanie notatki"))}
        </h3>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="w-full h-2" />
      <p className="text-xs text-muted-foreground mt-2">
        {progress < 40 
          ? (sectionSpecific
              ? "Odczytywanie tekstu z tej sekcji..."
              : "Odczytywanie tekstu dokumentu...") 
          : (outlineOnly
              ? "Analizowanie treści sekcji i tworzenie struktury nagłówków..."
              : (sectionSpecific
                  ? "Analizowanie treści sekcji i tworzenie szczegółowych notatek..."
                  : "Analizowanie treści dokumentu i tworzenie notatek..."))}
      </p>
    </div>
  );
}