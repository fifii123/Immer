"use client"

import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { 
  ArrowLeft, 
  Upload,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Import komponentów
import SourcesPanel from './sources/SourcesPanel'
import PlaygroundArea from './playground/PlaygroundArea'
import OutputsPanel from './outputs/OutputsPanel'
import { useQuickStudy } from './hooks/useQuickStudy'

export default function QuickStudyPage() {
  const router = useRouter()
  const { darkMode } = usePreferences()
  
  // Główny hook z całą logiką
  const {
    sources,
    selectedSource,
    curtainVisible,
    playgroundContent,
    outputs,
    isGenerating,
    handleSourceSelect,
    handleTileClick,
    handleOutputClick,
    handleShowCurtain,
    handleChatClick
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
              <div>
                <h1 className={`text-lg font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                  Quick Study
                </h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="hover:bg-accent"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content - dokładnie jak w oryginalnym */}
      <main className="h-[calc(100vh-3.5rem)] p-4">
        <div className="h-full grid grid-cols-[280px_1fr_320px] gap-4">
          
          {/* Left Panel - Sources */}
          <SourcesPanel 
            sources={sources}
            selectedSource={selectedSource}
            onSourceSelect={handleSourceSelect}
          />
          
          {/* Middle Panel - Playground + Sliding Curtain */}
          <PlaygroundArea 
            curtainVisible={curtainVisible}
            playgroundContent={playgroundContent}
            selectedSource={selectedSource}
            isGenerating={isGenerating}
            onShowCurtain={handleShowCurtain}
            onTileClick={handleTileClick}
            onChatClick={handleChatClick}
          />
          
          {/* Right Panel - Generated Content */}
          <OutputsPanel 
            outputs={outputs}
            curtainVisible={curtainVisible}
            onShowCurtain={handleShowCurtain}
            onOutputClick={handleOutputClick}
          />
        </div>
      </main>
    </div>
  )
}