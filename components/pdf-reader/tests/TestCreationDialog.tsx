"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TestConfig } from "../hooks/useTests";

interface TestCreationDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  testConfig: TestConfig;
  setTestConfig: (config: TestConfig) => void;
  onCreateTest: () => void;
  isGenerating: boolean;
}

export default function TestCreationDialog({
  isOpen,
  setIsOpen,
  testConfig,
  setTestConfig,
  onCreateTest,
  isGenerating
}: TestCreationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create new test</DialogTitle>
          <DialogDescription>
            Configure test parameters that will be generated based on document content and notes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-name">Test name</Label>
            <Input 
              id="test-name" 
              value={testConfig.name} 
              onChange={(e) => setTestConfig({...testConfig, name: e.target.value})}
              placeholder="e.g. Chapter 3 quiz"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Question type</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroup 
                  value={testConfig.questionType} 
                  onValueChange={(value: 'multiple_choice' | 'open_ended') => setTestConfig({...testConfig, questionType: value})}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiple_choice" id="multiple_choice" />
                    <Label htmlFor="multiple_choice">Multiple choice</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="open_ended" id="open_ended" />
                    <Label htmlFor="open_ended">Open-ended</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="question-count">Number of questions</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-6">{testConfig.questionCount}</span>
              <Slider 
                id="question-count"
                value={[testConfig.questionCount]} 
                min={3} 
                max={10}
                step={1}
                onValueChange={(value) => setTestConfig({...testConfig, questionCount: value[0]})}
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Options only for multiple choice questions */}
          {testConfig.questionType === 'multiple_choice' && (
            <div className="space-y-2">
              <Label htmlFor="options-count">Number of answer options</Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-6">{testConfig.optionsCount}</span>
                <Slider 
                  id="options-count"
                  value={[testConfig.optionsCount]} 
                  min={2} 
                  max={5}
                  step={1}
                  onValueChange={(value) => setTestConfig({...testConfig, optionsCount: value[0]})}
                  className="flex-1"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty level</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-16">
                {testConfig.difficulty === 1 ? 'Easy' : 
                 testConfig.difficulty === 2 ? 'Medium' : 'Hard'}
              </span>
              <Slider 
                id="difficulty"
                value={[testConfig.difficulty]} 
                min={1} 
                max={3}
                step={1}
                onValueChange={(value) => setTestConfig({...testConfig, difficulty: value[0]})}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="save-score" 
              checked={testConfig.saveScore}
              onCheckedChange={(checked) => setTestConfig({...testConfig, saveScore: !!checked})}
            />
            <Label htmlFor="save-score">Save results to history</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={onCreateTest} 
            disabled={!testConfig.name || isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : 'Create test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}