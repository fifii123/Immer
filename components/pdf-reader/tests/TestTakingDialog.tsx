"use client";

import React from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Test, MultipleChoiceQuestion, OpenEndedQuestion, AnswerFeedback } from "../hooks/useTests";
import MultipleChoiceQuestions from "./MultipleChoiceQuestions";
import OpenEndedQuestions from "./OpenEndedQuestions";

interface TestTakingDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  test: Test | null;
  takingTest: boolean;
  setTakingTest: (taking: boolean) => void;
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  openEndedQuestions: OpenEndedQuestion[];
  userAnswers: string[];
  answerFeedback: (AnswerFeedback | null)[];
  testSubmitted: boolean;
  testScore: number;
  isCheckingAnswers: boolean;
  testHasResults: boolean;
  testInProgress: boolean;
  expandedQuestions: boolean[];
  onToggleQuestion: (index: number) => void;
  onChangeAnswer: (index: number, value: string) => void;
  onSubmitTest: () => void;
  onViewResults: () => void;
  onRestartTest: () => void;
  onFinishTest: () => void;
  onStartTest: () => void;
}

export default function TestTakingDialog({
  isOpen,
  setIsOpen,
  test,
  takingTest,
  setTakingTest,
  multipleChoiceQuestions,
  openEndedQuestions,
  userAnswers,
  answerFeedback,
  testSubmitted,
  testScore,
  isCheckingAnswers,
  testHasResults,
  testInProgress,
  expandedQuestions,
  onToggleQuestion,
  onChangeAnswer,
  onSubmitTest,
  onViewResults,
  onRestartTest,
  onFinishTest,
  onStartTest,
}: TestTakingDialogProps) {
  if (!test) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{test.test_name}</span>
            {takingTest && testSubmitted && (
              <Badge variant={testScore >= 70 ? 'success' : testScore >= 50 ? 'warning' : 'destructive'} className="ml-2">
                {testScore}%
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {takingTest ? 
              `Test ${testSubmitted ? 'completed' : 'in progress'} - ${test.question_type === 'open_ended' ? 'open-ended questions' : 'multiple choice questions'}` : 
              `Prepare to answer ${test.question_type === 'open_ended' ? 'open-ended questions' : 'multiple choice questions'}. You can refer to the document during the test.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {takingTest ? (
          <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-1">
            {/* Render multiple choice questions */}
            {test.question_type === 'multiple_choice' && (
              <MultipleChoiceQuestions
                questions={multipleChoiceQuestions}
                userAnswers={userAnswers}
                answerFeedback={answerFeedback}
                testSubmitted={testSubmitted}
                expandedQuestions={expandedQuestions}
                onToggleQuestion={onToggleQuestion}
                onChangeAnswer={onChangeAnswer}
              />
            )}
            
            {/* Render open-ended questions */}
            {test.question_type === 'open_ended' && (
              <OpenEndedQuestions
                questions={openEndedQuestions}
                userAnswers={userAnswers}
                answerFeedback={answerFeedback}
                testSubmitted={testSubmitted}
                expandedQuestions={expandedQuestions}
                onToggleQuestion={onToggleQuestion}
                onChangeAnswer={onChangeAnswer}
              />
            )}
          </div>
        ) : (
          <div className="py-4 overflow-y-auto">
            <p className="mb-4">This test contains {test.question_type === 'multiple_choice' ? multipleChoiceQuestions.length : openEndedQuestions.length} {test.question_type === 'open_ended' ? 'open-ended' : 'multiple choice'} questions.</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Test type:</span>
                <Badge variant="outline">
                  {test.question_type === 'open_ended' ? 'Open-ended questions' : 'Multiple choice questions'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Time limit:</span>
                <span>Unlimited</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Save results:</span>
                <Badge variant={test.save_score ? 'default' : 'secondary'}>
                  {test.save_score ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              {/* Test status information */}
              {testHasResults && (
                <div className="mt-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">This test has been completed.</p>
                    <Badge variant="success">Score: {testScore}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can review your answers and results or take the test again.
                  </p>
                </div>
              )}
              
              {testInProgress && !testHasResults && (
                <div className="mt-4 p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20">
                  <p className="font-medium">This test is in progress.</p>
                  <p className="text-sm text-muted-foreground">
                    You can continue from where you left off.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-4 pt-4 border-t flex-wrap gap-2">
          {takingTest ? (
            !testSubmitted ? (
              <>
                <Button variant="outline" onClick={() => {
                  // Save state and close dialog
                  setTakingTest(false);
                }}>
                  Save and return later
                </Button>
                <Button 
                  onClick={onSubmitTest}
                  disabled={isCheckingAnswers}
                >
                  {test.question_type === 'open_ended' && isCheckingAnswers ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check answers'
                  )}
                </Button>
              </>
            ) : (
              <div className="flex w-full justify-between">
                <Button variant="outline" onClick={onFinishTest}>
                  Close preview
                </Button>
                <Button onClick={onRestartTest}>
                  Take again
                </Button>
              </div>
            )
          ) : (
            <>
              <div className="flex w-full justify-between">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                
                {/* Additional buttons based on test state */}
                {testHasResults ? (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={onViewResults}>
                      View results
                    </Button>
                    <Button onClick={onRestartTest}>
                      Take again
                    </Button>
                  </div>
                ) : testInProgress ? (
                  <Button onClick={onStartTest}>
                    Continue test
                  </Button>
                ) : (
                  <Button onClick={onStartTest}>
                    Start test
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}