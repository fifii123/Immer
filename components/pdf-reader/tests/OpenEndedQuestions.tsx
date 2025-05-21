"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/context/preferences-context";
import { OpenEndedQuestion, AnswerFeedback } from "../hooks/useTests";

interface OpenEndedQuestionsProps {
  questions: OpenEndedQuestion[];
  userAnswers: string[];
  answerFeedback: (AnswerFeedback | null)[];
  testSubmitted: boolean;
  expandedQuestions: boolean[];
  onToggleQuestion: (index: number) => void;
  onChangeAnswer: (index: number, value: string) => void;
}

function getGradeVariant(grade: string | undefined) {
  switch (grade) {
    case "correct":
      return "success";
    case "partial":
      return "warning";
    case "incorrect":
      return "destructive";
    default:
      return "default";
  }
}

function getGradeText(grade: string | undefined) {
  switch (grade) {
    case "correct":
      return "Correct";
    case "partial":
      return "Incomplete";
    case "incorrect":
      return "Incorrect";
    default:
      return "";
  }
}

export default function OpenEndedQuestions({
  questions,
  userAnswers,
  answerFeedback,
  testSubmitted,
  expandedQuestions,
  onToggleQuestion,
  onChangeAnswer,
}: OpenEndedQuestionsProps) {
  const { darkMode } = usePreferences();

  return (
    <>
      {questions.map((question, index) => (
        <div key={index} className="mb-6 border rounded-md overflow-hidden">
          <div
            className={`p-3 border-b cursor-pointer flex justify-between items-center ${
              darkMode ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"
            }`}
            onClick={() => onToggleQuestion(index)}
          >
            <div className="flex items-center">
              <span className="font-medium mr-2">{index + 1}.</span>
              <span className="font-medium truncate">
                {question.question.length > 50
                  ? `${question.question.substring(0, 50)}...`
                  : question.question}
              </span>
            </div>
            <div className="flex items-center">
              {testSubmitted && answerFeedback[index] && (
                <Badge variant={getGradeVariant(answerFeedback[index]?.grade)} className="mr-2">
                  {getGradeText(answerFeedback[index]?.grade)}
                </Badge>
              )}
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  expandedQuestions[index] ? "transform rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {expandedQuestions[index] && (
            <div className="p-3">
              <div className="mb-3">
                <p className="font-medium">{question.question}</p>

                {testSubmitted && question.context && (
                  <p className="text-sm text-muted-foreground mt-1 mb-2 italic">
                    Context: {question.context}
                  </p>
                )}
              </div>

              <Textarea
                placeholder="Your answer..."
                value={userAnswers[index] || ""}
                onChange={(e) => onChangeAnswer(index, e.target.value)}
                rows={4}
                className="w-full"
                disabled={testSubmitted}
              />

              {testSubmitted && answerFeedback[index] && (
                <div
                  className={`p-2 mt-2 rounded-md text-sm ${
                    answerFeedback[index]?.grade === "correct"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                      : answerFeedback[index]?.grade === "partial"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  }`}
                >
                  <p className="font-medium mb-1">
                    {answerFeedback[index]?.grade === "correct"
                      ? "Good job!"
                      : answerFeedback[index]?.grade === "partial"
                      ? "Incomplete answer"
                      : "Incorrect answer"}
                  </p>
                  <p>{answerFeedback[index]?.feedback}</p>

                  {answerFeedback[index]?.correctAnswer && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                      <p className="font-medium">Sample correct answer:</p>
                      <p>{answerFeedback[index]?.correctAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
