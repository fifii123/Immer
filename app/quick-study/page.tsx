"use client"

import React from 'react'
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { useToast } from "@/components/ui/use-toast"
import { 
  ArrowLeft, 
  Upload,
  Sparkles,
  RefreshCw,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Import komponentów
import SourcesPanel from './sources/SourcesPanel'
import PlaygroundArea from './playground/PlaygroundArea'
import OutputsPanel from './outputs/OutputsPanel'
import { useQuickStudy } from './hooks/useQuickStudy'

export default function QuickStudyPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Główny hook z session management
  const {
    sessionId,
    initializing,
    sources,
    selectedSource,
    curtainVisible,
    playgroundContent,
    outputs,
    currentOutput,
    isGenerating,
    uploadInProgress,
    fetchingSources,
    error,
    handleSourceSelect,
    handleTileClick,
    handleOutputClick,
    handleShowCurtain,
    handleChatClick,
    handleFileUpload,
    handleTextSubmit,
    handleUrlSubmit,
    handleStartNewSession,
    refreshSession,
    clearError
  } = useQuickStudy()

  // Error handling with toast notifications
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
      clearError()
    }
  }, [error, toast, clearError])

  // Show loading screen while initializing session
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">
            Initializing Quick Study
          </h2>
          <p className="text-muted-foreground">
            Setting up your study session...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl bg-background/95 border-border">
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
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Quick Study
                </h1>
                {sessionId && (
                  <p className="text-xs text-muted-foreground">
                    Session: {sessionId.slice(0, 8)}...
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-accent"
              onClick={refreshSession}
              disabled={fetchingSources}
            >
              <RefreshCw className={`h-4 w-4 ${fetchingSources ? 'animate-spin' : ''}`} />
            </Button>
            

            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-accent"
              onClick={handleStartNewSession}
            >
              New Session
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-3.5rem)] p-4">
        <div className="h-full grid grid-cols-[280px_1fr_320px] gap-4">
          
          {/* Left Panel - Sources */}
          <SourcesPanel 
            sources={sources}
            selectedSource={selectedSource}
            onSourceSelect={handleSourceSelect}
            uploadInProgress={uploadInProgress}
            onFileUpload={handleFileUpload}
            onTextSubmit={handleTextSubmit}
            onUrlSubmit={handleUrlSubmit}
            fetchingSources={fetchingSources}
            onRefresh={refreshSession}
          />
          
          {/* Middle Panel - Playground + Sliding Curtain */}
          <PlaygroundArea 
  sessionId={sessionId}
  curtainVisible={curtainVisible}
  playgroundContent={playgroundContent}
  selectedSource={selectedSource}
  isGenerating={isGenerating}
  currentOutput={currentOutput} 
  onShowCurtain={handleShowCurtain}
  onTileClick={handleTileClick}
  onChatClick={handleChatClick}
/>
          
          {/* Right Panel - Generated Content */}
          <OutputsPanel 
            outputs={outputs}
            curtainVisible={curtainVisible}
            selectedSource={selectedSource}
            onShowCurtain={handleShowCurtain}
            onOutputClick={handleOutputClick}
          />
        </div>
      </main>
    </div>
  )
}