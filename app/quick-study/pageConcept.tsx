"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { ArrowLeft, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

// Import paneli - podobnie jak w PDF Reader
import SourcesPanel from "./sources/SourcesPanel"
import PlaygroundArea from "./playground/PlaygroundArea"
import OutputsPanel from "./outputs/OutputsPanel"

// Main hook - podobnie jak useNotes w PDF Reader
import { useQuickStudy } from "./hooks/useQuickStudy"

export default function QuickStudyPage() {
  const router = useRouter()
  const { darkMode } = usePreferences()
  
  // Główny hook - wszystka logika w jednym miejscu
  const {
    sources,
    selectedSource,
    outputs,
    playgroundContent,
    currentOutput,
    curtainVisible,
    isGenerating,
    uploadInProgress,
    handleSourceSelect,
    handleFileUpload,
    handleMethodSelect,
    handleShowOutputs,
    handleChatClick,
    handleOutputClick
  } = useQuickStudy()

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-background' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        darkMode ? "bg-background/95 border-border" : "bg-white/95 border-slate-200"
      }`}>
        <nav className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push("/")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-primary/10' : 'bg-primary/5'
              }`}>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h1 className={`text-lg font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                Quick Study
              </h1>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            className="hover:bg-accent"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploadInProgress}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadInProgress ? 'Uploading...' : 'Upload'}
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.txt,.docx,.doc,audio/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
          />
        </nav>
      </header>

      {/* Main Content - 3 panel layout jak w PDF Reader */}
      <main className="h-[calc(100vh-3.5rem)] p-4">
        <div className="h-full grid grid-cols-[280px_1fr_320px] gap-4">
          {/* Lewy panel - Sources */}
          <SourcesPanel 
            sources={sources}
            selectedSource={selectedSource}
            onSourceSelect={handleSourceSelect}
            uploadInProgress={uploadInProgress}
          />
          
          {/* Środkowy panel - Playground */}
          <PlaygroundArea 
            content={playgroundContent}
            currentOutput={currentOutput}
            isGenerating={isGenerating}
            curtainVisible={curtainVisible}
            selectedSource={selectedSource}
            onShowOutputs={handleShowOutputs}
            onChatClick={handleChatClick}
          />
          
          {/* Prawy panel - Outputs */}
          <OutputsPanel 
            visible={curtainVisible}
            outputs={outputs}
            selectedSource={selectedSource}
            onMethodSelect={handleMethodSelect}
            onOutputClick={handleOutputClick}
          />
        </div>
      </main>
    </div>
  )
}