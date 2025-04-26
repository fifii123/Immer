"use client";

import React from "react";
import { ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/context/preferences-context";
import { MultipleChoiceQuestion, AnswerFeedback } from "../hooks/useTests";

interface MultipleChoiceQuestionsProps {
  questions: MultipleChoiceQuestion[];
  userAnswers: string[];
  answerFeedback: (AnswerFeedback | null)[];
  testSubmitted: boolean;
  expandedQuestions: boolean[];
  onToggleQuestion: (index: number) => void;
  onChangeAnswer: (index: number, value: string) => void;
}

export default function MultipleChoiceQuestions({
  questions,
  userAnswers,
  answerFeedback,
  testSubmitted,
  expandedQuestions,
  onToggleQuestion,
  onChangeAnswer
}: MultipleChoiceQuestionsProps) {
  const { darkMode } = usePreferences();

  return (
    <>
      {questions.map((question, index) => (
        <div key={index} className="mb-6 border rounded-md overflow-hidden">
          <div 
            className={`p-3 border-b cursor-pointer flex justify-between items-center ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}
            onClick={() => onToggleQuestion(index)}
          >
            <div className="flex items-center">
              <span className="font-medium mr-2">{index + 1}.</span>
              <span className="font-medium truncate">{question.question.length > 50 ? `${question.question.substring(0, 50)}...` : question.question}</span>
            </div>
            <div className="flex items-center">
              {testSubmitted && (
                <Badge variant={userAnswers[index] === question.correctAnswer ? 'success' : 'destructive'} className="mr-2">
                  {userAnswers[index] === question.correctAnswer ? 'Correct' : 'Incorrect'}
                </Badge>
              )}
              <ChevronDown className={`h-5 w-5 transition-transform ${expandedQuestions[index] ? 'transform rotate-180' : ''}`} />
            </div>
          </div>
          
          {expandedQuestions[index] && (
            <div className="p-3">
              <div className="mb-3">
                <p className="font-medium">{question.question}</p>
                {question.context && (
                  <p className="text-sm text-muted-foreground mt-1 mb-2 italic">
                    Context: {question.context}
                  </p>
                )}
              </div>
              
              <div className="pl-0">
                <RadioGroup 
                  value={userAnswers[index] || ''}
                  onValueChange={(value) => onChangeAnswer(index, value)}
                  disabled={testSubmitted}
                >
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className={`flex items-center space-x-2 p-2 rounded-md ${
                      testSubmitted && option === question.correctAnswer 
                        ? 'bg-green-50 dark:bg-green-900/20' 
                        : testSubmitted && userAnswers[index] === option && option !== question.correctAnswer
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : ''
                    }`}>
                      <RadioGroupItem 
                        value={option} 
                        id={`q${index}-option-${optionIndex}`} 
                      />
                      <Label htmlFor={`q${index}-option-${optionIndex}`} className="flex-1">
                        {option}
                      </Label>
                      {testSubmitted && option === question.correctAnswer && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {testSubmitted && userAnswers[index] === option && option !== question.correctAnswer && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
                </RadioGroup>
                
                {testSubmitted && question.explanation && (
                  <div className="mt-2 p-2 rounded-md text-sm bg-blue-50 dark:bg-blue-900/20">
                    <p className="font-medium">Explanation:</p>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}