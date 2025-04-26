"use client";

import React from "react";
import { usePreferences } from "@/context/preferences-context";
import { Check, ChevronRight, Maximize2, MessageSquare, RefreshCw, Type, X } from "lucide-react";
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
  onCancel
}: NoteSectionProps) {
  const { darkMode } = usePreferences();
  
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
      }`}
    >
      {/* Section header with additional indicator for temporary sections */}
      <div 
        className={`p-3 ${section.expanded ? 'border-b' : ''} ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
        } ${
          section.isTemporary
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : isHighlighted 
              ? 'bg-blue-50 dark:bg-blue-900/30' 
              : ''
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center" onClick={onToggle} style={{ cursor: !section.isTemporary ? 'pointer' : 'default', width: '80%' }}>
            <h3 className="font-medium text-base">{section.title}</h3>
            {section.isTemporary && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block">
                Proposal
              </span>
            )}
            {isHighlighted && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full inline-block animate-pulse">
                Updated
              </span>
            )}
            {!section.isTemporary && (
              <ChevronRight className={`ml-2 h-4 w-4 transition-transform duration-200 ${
                section.expanded ? 'transform rotate-90' : ''
              }`} />
            )}
          </div>
          
          {/* Action buttons only for non-temporary sections */}
          {!section.isTemporary && (
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Expand section content" onClick={onExpand}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Format section" onClick={onFormat}>
                <Type className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Ask custom question" onClick={onCustomPrompt}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Section description - always visible */}
      <div className={`px-3 py-2 ${section.expanded ? 'border-b' : ''} ${
        darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'
      } ${
        isHighlighted 
          ? 'bg-blue-50/50 dark:bg-blue-900/20' 
          : ''
      }`}>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
      
      {/* Section content - visible only when expanded */}
      {section.expanded && (
        <div className={`p-3 ${
          isHighlighted 
            ? 'bg-blue-50/30 dark:bg-blue-900/10' 
            : ''
        }`}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownContent content={section.content} />
          </div>
        </div>
      )}
      
      {/* Confirmation UI */}
      {isEditing && editingAction === 'confirm' && (
        <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Proposed changes:</h4>
            <div className="bg-white dark:bg-slate-800 rounded p-3 max-h-60 overflow-y-auto text-sm border border-blue-200 dark:border-blue-800">
              {/* Render markdown preview in confirmation */}
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
              Reject
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
              Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Custom prompt dialog */}
      {isEditing && editingAction === 'custom' && (
        <div className="border-t p-3 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Enter custom command:</h4>
            <Textarea
              className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              placeholder="E.g. 'Add more details about...' or 'Explain the concept...'"
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
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onSubmitCustomPrompt}
              disabled={isProcessing || !customPrompt.trim()}
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isEditing && 
       (editingAction === 'expand' || editingAction === 'format') && (
        <div className="border-t p-4 bg-blue-50/30 dark:bg-blue-900/10 flex justify-center items-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span>
            {editingAction === 'expand' ? 'Expanding section...' : 'Formatting section...'}
          </span>
        </div>
      )}
    </div>
  );
}