"use client";

import React from "react";
import { useTests } from "../hooks/useTests";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import TestItem from "./TestItem";
import TestCreationDialog from "./TestCreationDialog";
import TestTakingDialog from "./TestTakingDialog";

interface TestsPanelProps {
  fileId: number;
  fileName: string;
  projectId?: number;
}

export default function TestsPanel({ fileId, fileName, projectId }: TestsPanelProps) {
  const {
    tests,
    selectedTest,
    isTestGenerationDialogOpen,
    isGeneratingTest,
    isStartingTest,
    takingTest,
    testConfig,
    currentMultipleChoiceQuestions,
    currentOpenEndedQuestions,
    userAnswers,
    answerFeedback,
    testSubmitted,
    testScore,
    testHasResults,
    testInProgress,
    isCheckingAnswers,
    expandedQuestions,
    setIsTestGenerationDialogOpen,
    setTestConfig,
    setIsStartingTest,
    setTakingTest,
    handleToggleTest,
    generateTest,
    handleSelectTest,
    startTest,
    handleAnswerChange,
    toggleQuestionExpand,
    handleSubmitTest,
    handleRestartTest,
    handleViewTestResults,
    handleFinishTest,
    getTestQuestionCount,
  } = useTests({ fileId, projectId });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Test generator header */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Tests for: {fileName}</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => setIsTestGenerationDialogOpen(true)}
          disabled={isGeneratingTest}
        >
          <GraduationCap className="h-4 w-4" />
          {isGeneratingTest ? 'Generating...' : 'Create test'}
        </Button>
      </div>
      
      {/* List of tests */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {tests.length > 0 ? (
          tests.map((test) => (
            <TestItem
              key={test.test_id}
              test={test}
              isSelected={selectedTest?.test_id === test.test_id}
              hasResults={testHasResults && selectedTest?.test_id === test.test_id}
              isInProgress={testInProgress && selectedTest?.test_id === test.test_id}
              testScore={testScore}
              onToggle={() => handleToggleTest(test)}
              onStartTest={() => {
                handleSelectTest(test);
                startTest();
                setIsStartingTest(true);
              }}
              onViewResults={() => handleViewTestResults()}
              onRestartTest={() => handleRestartTest()}
              getQuestionCount={() => getTestQuestionCount(test)}
            />
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <GraduationCap className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {isGeneratingTest 
                ? 'Generating test...'
                : 'No tests yet. Click "Create test" to generate your first test.'}
            </p>
          </div>
        )}
      </div>

      {/* Test creation dialog */}
      <TestCreationDialog
        isOpen={isTestGenerationDialogOpen}
        setIsOpen={setIsTestGenerationDialogOpen}
        testConfig={testConfig}
        setTestConfig={setTestConfig}
        onCreateTest={generateTest}
        isGenerating={isGeneratingTest}
      />

      {/* Test taking dialog */}
      <TestTakingDialog
        isOpen={isStartingTest}
        setIsOpen={setIsStartingTest}
        test={selectedTest}
        takingTest={takingTest}
        setTakingTest={setTakingTest}
        multipleChoiceQuestions={currentMultipleChoiceQuestions}
        openEndedQuestions={currentOpenEndedQuestions}
        userAnswers={userAnswers}
        answerFeedback={answerFeedback}
        testSubmitted={testSubmitted}
        testScore={testScore}
        isCheckingAnswers={isCheckingAnswers}
        testHasResults={testHasResults}
        testInProgress={testInProgress}
        expandedQuestions={expandedQuestions}
        onToggleQuestion={toggleQuestionExpand}
        onChangeAnswer={handleAnswerChange}
        onSubmitTest={handleSubmitTest}
        onViewResults={handleViewTestResults}
        onRestartTest={handleRestartTest}
        onFinishTest={handleFinishTest}
        onStartTest={startTest}
      />
    </div>
  );
}