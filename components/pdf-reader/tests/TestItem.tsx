"use client";

import React from "react";
import { usePreferences } from "@/context/preferences-context";
import { ChevronDown, BookOpen, RefreshCw, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Test } from "../hooks/useTests";

interface TestItemProps {
  test: Test;
  isSelected: boolean;
  hasResults: boolean;
  isInProgress: boolean;
  testScore: number;
  onToggle: () => void;
  onStartTest: () => void;
  onViewResults: () => void;
  onRestartTest: () => void;
  getQuestionCount: () => number;
}

export default function TestItem({
  test,
  isSelected,
  hasResults,
  isInProgress,
  testScore,
  onToggle,
  onStartTest,
  onViewResults,
  onRestartTest,
  getQuestionCount
}: TestItemProps) {
  const { darkMode } = usePreferences();
  const questionCount = getQuestionCount();

  return (
    <div 
      className={`border rounded-md overflow-hidden transition-all duration-200 ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}
    >
      {/* Test header - always visible */}
      <div 
        className={`p-3 cursor-pointer ${
          darkMode ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-gray-50 border-gray-200'
        } ${isSelected ? (darkMode ? 'bg-slate-800' : 'bg-gray-50') : ''}`}
        onClick={onToggle}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{test.test_name}</h4>
              
              {hasResults && (
                <Badge variant="success" className="text-xs">
                  Score: {testScore}%
                </Badge>
              )}
              
              {isInProgress && !hasResults && (
                <Badge variant="outline" className="text-xs">
                  In progress
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(test.created_at).toLocaleDateString()} · {questionCount} questions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={test.question_type === 'open_ended' ? 'outline' : 'secondary'}>
              {test.question_type === 'open_ended' ? 'Open-ended' : 'Multiple choice'}
            </Badge>
            <ChevronDown 
              className={`h-5 w-5 transition-transform ${isSelected ? 'transform rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>
      
      {/* Expanded test details */}
      {isSelected && (
        <div className="p-3 border-t">
          <div className="mb-4">
            <p className="text-sm mb-3">
              This test contains {questionCount} {test.question_type === 'open_ended' ? 'open-ended' : 'multiple choice'} questions about the document content.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {test.question_type === 'open_ended' ? 'Open-ended questions' : 'Multiple choice questions'}
              </Badge>
              <Badge variant={test.save_score ? 'default' : 'secondary'} className="text-xs">
                {test.save_score ? 'Score saving enabled' : 'Practice mode'}
              </Badge>
            </div>
            
            {/* Test status info */}
            {hasResults && (
              <div className="mt-3 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">This test has been completed.</p>
                  <Badge variant="success">Score: {testScore}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can review your answers and results or take the test again.
                </p>
              </div>
            )}
            
            {isInProgress && !hasResults && (
              <div className="mt-3 p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20">
                <p className="font-medium">This test is in progress.</p>
                <p className="text-sm text-muted-foreground">
                  You can continue from where you left off.
                </p>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end mt-4">
            {hasResults ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onViewResults}
                  className="flex items-center gap-1"
                >
                  <FileText className="h-4 w-4" />
                  View results
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRestartTest}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Take again
                </Button>
              </div>
            ) : isInProgress ? (
              <Button 
                size="sm" 
                onClick={onStartTest}
                className="flex items-center gap-1"
              >
                <BookOpen className="h-4 w-4" />
                Continue test
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={onStartTest}
                className="flex items-center gap-1"
              >
                <BookOpen className="h-4 w-4" />
                Start test
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}