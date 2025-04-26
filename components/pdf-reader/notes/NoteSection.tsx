"use client";

import React from "react";
import { usePreferences } from "@/context/preferences-context";
import { Check, ChevronRight, Maximize2, MessageSquare, RefreshCw, Type, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownContent from '@/components/MarkdownContent';
import { NoteSection as NoteSectionType } from "../hooks/useNotes";
import { Textarea } from "@/components/ui/textarea";

interface NoteSectionProps {
  section: NoteSectionType;
  isEditing: boolean;
  editingAction?: 'expand' | 'format' | 'custom' | 'confirm' | 'confirm_new';
  isHighlighted: boolean;
  customPrompt: string;
  isProcessing: boolean;
  editingResult?: string;
  sectionRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onExpand: () => void;
  onFormat: () => void;
  onCustomPrompt: () => void;
  onUpdateCustomPrompt: (prompt: string) => void;
  onSubmitCustomPrompt: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  outlineOnly?: boolean; // Czy sekcja jest częścią notatki tylko z nagłówkami
}

export default function NoteSection({
  section,
  isEditing,
  editingAction,
  isHighlighted,
  customPrompt,
  isProcessing,
  editingResult,
  sectionRef,
  onToggle,
  onExpand,
  onFormat,
  onCustomPrompt,
  onUpdateCustomPrompt,
  onSubmitCustomPrompt,
  onConfirm,
  onCancel,
  outlineOnly = false
}: NoteSectionProps) {
  const { darkMode } = usePreferences();
  
  // Sprawdź, czy sekcja ma treść (lub jest pusta w trybie outlineOnly)
  const hasContent = section.content && section.content.trim().length > 0;
  const isEmpty = outlineOnly && (!hasContent || section.content.trim() === "");
  
  return (
    <div 
      ref={sectionRef}
      className={`border rounded-md overflow-hidden transition-all duration-300 ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      } ${
        section.isTemporary 
          ? 'border-dashed border-blue-400 dark:border-blue-600' 
          : ''
      } ${
        isHighlighted 
          ? 'shadow-lg ring-2 ring-blue-500 dark:ring-blue-400 section-highlight' 
          : ''
      } ${
        isEmpty
          ? 'border-dashed' 
          : ''
      }`}
    >
      {/* Nagłówek sekcji z dodatkowym wskaźnikiem dla pustych sekcji */}
      <div 
        className={`p-3 ${section.expanded ? 'border-b' : ''} ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        } ${
          section.isTemporary
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : isHighlighted 
              ? 'bg-blue-50 dark:bg-blue-900/30' 
              : isEmpty
                ? 'bg-amber-50 dark:bg-amber-900/10'
                : ''
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center" onClick={onToggle} style={{ cursor: !section.isTemporary ? 'pointer' : 'default', width: '80%' }}>
            <h3 className="font-medium text-base">{section.title}</h3>
            {section.isTemporary && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block">
                Propozycja
              </span>
            )}
            {isHighlighted && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block animate-pulse">
                Zaktualizowano
              </span>
            )}
            {isEmpty && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100 rounded-full inline-block">
                Wymaga uzupełnienia
              </span>
            )}
            {!section.isTemporary && (
              <ChevronRight className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                section.expanded ? 'transform rotate-90' : ''
              }`} />
            )}
          </div>
          
          {/* Przyciski akcji tylko dla sekcji niebędących tymczasowymi */}
          {!section.isTemporary && (
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Rozwiń treść sekcji" onClick={onExpand}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Formatuj sekcję" onClick={onFormat}>
                <Type className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Zadaj własne pytanie" onClick={onCustomPrompt}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Opis sekcji - zawsze widoczny */}
      <div className={`px-3 py-2 ${section.expanded ? 'border-b' : ''} ${
        darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'
      } ${
        isHighlighted 
          ? 'bg-blue-50/50 dark:bg-blue-900/20' 
          : ''
      }`}>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
      
      {/* Treść sekcji - widoczna tylko po rozwinięciu */}
      {section.expanded && (
        <div className={`p-3 ${
          isHighlighted 
            ? 'bg-blue-50/30 dark:bg-blue-900/10' 
            : ''
        }`}>
          {hasContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={section.content} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center bg-amber-50/50 dark:bg-amber-900/10 rounded-md">
              <FileText className="h-10 w-10 text-amber-400 dark:text-amber-500 mb-2" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Ta sekcja wymaga uzupełnienia treści. Użyj przycisku "Poszerz" lub "Formatuj" aby automatycznie wygenerować treść.
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onExpand}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1" />
                  Rozszerz treść
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onCustomPrompt}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Własne polecenie
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* UI potwierdzenia */}
      {isEditing && editingAction === 'confirm' && (
        <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Proponowane zmiany:</h4>
            <div className="bg-white dark:bg-slate-800 rounded p-3 max-h-60 overflow-y-auto text-sm border border-blue-200 dark:border-blue-800">
              {/* Renderowanie podglądu markdown */}
              <MarkdownContent content={editingResult || ''} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Odrzuć
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Potwierdź
            </Button>
          </div>
        </div>
      )}

      {/* Okno dialogowe własnego polecenia */}
      {isEditing && editingAction === 'custom' && (
        <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Wprowadź własne polecenie:</h4>
            <Textarea
              className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              placeholder={isEmpty 
                ? "Np. 'Napisz treść o...' lub 'Wyjaśnij temat...'" 
                : "Np. 'Dodaj więcej szczegółów o...' lub 'Wyjaśnij pojęcie...'"}
              rows={3}
              value={customPrompt}
              onChange={(e) => onUpdateCustomPrompt(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              disabled={isProcessing}
            >
              Anuluj
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onSubmitCustomPrompt}
              disabled={isProcessing || !customPrompt.trim()}
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : 'Wyślij'}
            </Button>
          </div>
        </div>
      )}

      {/* Wskaźnik przetwarzania */}
      {isEditing && 
       (editingAction === 'expand' || editingAction === 'format') && (
        <div className="border-t p-4 bg-blue-50/30 dark:bg-blue-900/10 flex justify-center items-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>
            {editingAction === 'expand' ? 'Rozszerzanie sekcji...' : 'Formatowanie sekcji...'}
          </span>
        </div>
      )}
    </div>
  );
}