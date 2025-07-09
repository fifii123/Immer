"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { 
  ArrowLeft, 
  Plus, 
  Upload, 
  Youtube, 
  FileText, 
  Image, 
  Mic, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Zap,
  Target,
  PenTool,
  FileCheck,
  Key,
  Brain,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Bot,
  Send,
  LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
}

type PlaygroundContent = 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap' | 'chat' | null;

const getSourceIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="h-4 w-4" />
    case 'youtube': return <Youtube className="h-4 w-4" />
    case 'image': return <Image className="h-4 w-4" />
    case 'audio': return <Mic className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ready': return <CheckCircle className="h-3 w-3" />
    case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />
    case 'error': return <AlertCircle className="h-3 w-3" />
    default: return null
  }
}

export default function QuickStudyPage() {
  const router = useRouter()
  const { darkMode, t } = usePreferences()
  
  // State management
  const [sources, setSources] = useState<Source[]>([
    { 
      id: '1', 
      name: 'Machine Learning Fundamentals', 
      type: 'pdf', 
      status: 'ready',
      size: '2.4 MB',
      pages: 42
    },
    { 
      id: '2', 
      name: 'Neural Networks Explained', 
      type: 'youtube', 
      status: 'ready',
      duration: '25 min'
    },
    { 
      id: '3', 
      name: 'Deep Learning Research Notes', 
      type: 'text', 
      status: 'processing',
      size: '156 KB'
    },
    { 
      id: '4', 
      name: 'Computer Vision Basics', 
      type: 'pdf', 
      status: 'ready',
      size: '1.8 MB',
      pages: 28
    },
    { 
      id: '5', 
      name: 'AI Ethics Lecture', 
      type: 'youtube', 
      status: 'ready',
      duration: '45 min'
    }
  ])
  
  const [selectedSource, setSelectedSource] = useState<Source | null>(sources[0])
  const [curtainVisible, setCurtainVisible] = useState(true)
  const [playgroundContent, setPlaygroundContent] = useState<PlaygroundContent>(null)
  const [outputs, setOutputs] = useState<Output[]>([
    {
      id: '1',
      type: 'flashcards',
      title: 'ML Fundamentals Cards',
      preview: '24 cards covering key concepts',
      status: 'ready',
      sourceId: '1',
      createdAt: new Date(),
      count: 24
    },
    {
      id: '2',
      type: 'quiz',
      title: 'Neural Networks Quiz',
      preview: '12 questions on deep learning',
      status: 'ready',
      sourceId: '2',
      createdAt: new Date(),
      count: 12
    },
    {
      id: '3',
      type: 'notes',
      title: 'AI Research Summary',
      preview: '5 sections with key insights',
      status: 'ready',
      sourceId: '3',
      createdAt: new Date(),
      count: 5
    },
    {
      id: '4',
      type: 'summary',
      title: 'Core Concepts Overview',
      preview: 'Essential points extracted',
      status: 'ready',
      sourceId: '1',
      createdAt: new Date(),
      count: 1
    },
    {
      id: '5',
      type: 'concepts',
      title: 'Key Definitions Map',
      preview: '18 important terms defined',
      status: 'ready',
      sourceId: '2',
      createdAt: new Date(),
      count: 18
    },
    {
      id: '6',
      type: 'mindmap',
      title: 'Learning Pathways',
      preview: 'Visual connection map',
      status: 'generating',
      sourceId: '3',
      createdAt: new Date(),
      count: 1
    },
    {
      id: '7',
      type: 'flashcards',
      title: 'Computer Vision Cards',
      preview: '16 cards on image processing',
      status: 'ready',
      sourceId: '4',
      createdAt: new Date(),
      count: 16
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  // Handlers
  const handleSourceSelect = (source: Source) => {
    setSelectedSource(source)
  }

  const handleTileClick = (type: string) => {
    setCurtainVisible(false)
    setPlaygroundContent(type as PlaygroundContent)
    setIsGenerating(true)
    
    setTimeout(() => {
      setIsGenerating(false)
      const counts = {
        flashcards: Math.floor(Math.random() * 20) + 15,
        quiz: Math.floor(Math.random() * 10) + 8,
        notes: Math.floor(Math.random() * 5) + 3,
        summary: 1,
        concepts: Math.floor(Math.random() * 15) + 10,
        mindmap: 1
      }
      
      const newOutput: Output = {
        id: Date.now().toString(),
        type: type as any,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} from ${selectedSource?.name}`,
        preview: `${counts[type as keyof typeof counts]} ${type === 'summary' || type === 'mindmap' ? 'section' : 'items'} generated`,
        status: 'ready',
        sourceId: selectedSource?.id || '1',
        createdAt: new Date(),
        count: counts[type as keyof typeof counts]
      }
      setOutputs(prev => [...prev, newOutput])
    }, 3000)
  }

  const handleOutputClick = (output: Output) => {
    setCurtainVisible(false)
    setPlaygroundContent(output.type)
  }

  const handleShowCurtain = () => {
    setCurtainVisible(true)
    setPlaygroundContent(null)
  }

  const handleChatClick = () => {
    setCurtainVisible(false)
    setPlaygroundContent('chat')
  }

  const tiles = [
    { 
      id: 'flashcards', 
      icon: <Zap className="h-5 w-5" />, 
      title: 'Flashcards', 
      desc: 'Spaced repetition cards'
    },
    { 
      id: 'quiz', 
      icon: <Target className="h-5 w-5" />, 
      title: 'Interactive Quiz', 
      desc: 'Adaptive testing'
    },
    { 
      id: 'notes', 
      icon: <PenTool className="h-5 w-5" />, 
      title: 'Smart Notes', 
      desc: 'Structured summaries'
    },
    { 
      id: 'summary', 
      icon: <FileCheck className="h-5 w-5" />, 
      title: 'Key Summary', 
      desc: 'Essential points'
    },
    { 
      id: 'concepts', 
      icon: <Key className="h-5 w-5" />, 
      title: 'Concepts Map', 
      desc: 'Key definitions'
    },
    { 
      id: 'mindmap', 
      icon: <Brain className="h-5 w-5" />, 
      title: 'Visual Map', 
      desc: 'Connected ideas'
    }
  ]

  const getTileIcon = (type: string) => {
    const tile = tiles.find(t => t.id === type)
    return tile?.icon || <LayoutGrid className="h-5 w-5" />
  }

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

      {/* Main Content */}
      <main className="h-[calc(100vh-3.5rem)] p-4">
        <div className="h-full grid grid-cols-[280px_1fr_320px] gap-4">
          
          {/* Left Panel - Sources */}
          <aside className={`h-full overflow-hidden flex flex-col rounded-2xl ${
            darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
          } border`}>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-xs font-semibold tracking-wide uppercase ${
                  darkMode ? 'text-muted-foreground' : 'text-slate-500'
                }`}>
                  Sources
                </h3>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Sources list */}
              <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                {sources.map((source) => (
                  <li key={source.id}>
                    <button
                      className={`w-full group relative p-3.5 rounded-xl text-left transition-all duration-200 ${
                        selectedSource?.id === source.id
                          ? darkMode
                            ? "bg-accent border-primary/20"
                            : "bg-primary/5 border-primary/20"
                          : darkMode
                            ? "hover:bg-accent/50 border-transparent"
                            : "hover:bg-slate-50 border-transparent"
                      } border`}
                      onClick={() => handleSourceSelect(source)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-lg ${
                          darkMode ? 'bg-background' : 'bg-slate-100'
                        }`}>
                          {getSourceIcon(source.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${
                            darkMode ? 'text-foreground' : 'text-slate-900'
                          }`}>
                            {source.name}
                          </p>
                          <p className={`text-xs mt-1 ${
                            darkMode ? 'text-muted-foreground' : 'text-slate-500'
                          }`}>
                            {source.pages && `${source.pages} pages • `}
                            {source.size || source.duration}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {getStatusIcon(source.status)}
                            <span className={`text-xs ${
                              source.status === 'ready'
                                ? darkMode ? 'text-green-400' : 'text-green-600'
                                : source.status === 'processing'
                                  ? darkMode ? 'text-amber-400' : 'text-amber-600'
                                  : darkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {source.status === 'ready' ? 'Ready' : 
                               source.status === 'processing' ? 'Processing' : 'Error'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Study Actions */}
              <div className="space-y-2 pt-5 mt-5 border-t border-border">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Target className="mr-2 h-4 w-4" />
                  Start Study Session
                </Button>
                <Button variant="outline" size="sm" className="w-full hover:bg-accent">
                  <Clock className="mr-2 h-3.5 w-3.5" />
                  Quick Study (15 min)
                </Button>
              </div>
            </div>
          </aside>

          {/* Middle Panel - Playground + Sliding Curtain */}
          <section className={`relative h-full overflow-hidden rounded-2xl ${
            darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
          } border`}>
            
            {/* Playground Content */}
            <div className={`absolute inset-0 ${!curtainVisible && playgroundContent === 'chat' ? 'pr-12' : ''}`}>
              {playgroundContent === 'flashcards' && (
                <article className="h-full flex flex-col p-8">
                  <header className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        darkMode ? 'bg-primary/10' : 'bg-primary/5'
                      }`}>
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                          Interactive Flashcards
                        </h2>
                        <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                          Spaced repetition for optimal retention
                        </p>
                      </div>
                    </div>
                  </header>
                  
                  {isGenerating ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                        <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                          Analyzing content
                        </h3>
                        <p className={`${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                          Creating flashcards from {selectedSource?.name}...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <ul className="w-full max-w-2xl space-y-4">
                        {[
                          { front: "What is the primary goal of machine learning?", difficulty: "Easy" },
                          { front: "Explain the difference between supervised and unsupervised learning", difficulty: "Medium" },
                          { front: "How does gradient descent optimization work?", difficulty: "Hard" }
                        ].map((card, index) => (
                          <li key={index}>
                            <Card 
                              className={`group cursor-pointer transition-all duration-300 hover:shadow-lg rounded-xl ${
                                darkMode 
                                  ? 'bg-card hover:bg-accent/50' 
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                    card.difficulty === 'Easy' 
                                      ? darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                                      : card.difficulty === 'Medium' 
                                        ? darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
                                        : darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'
                                  }`}>
                                    {card.difficulty}
                                  </span>
                                  <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                                    Card {index + 1} of 24
                                  </span>
                                </div>
                                <p className={`text-lg leading-relaxed ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                                  {card.front}
                                </p>
                                <div className={`text-sm mt-4 flex items-center gap-2 ${
                                  darkMode ? 'text-muted-foreground' : 'text-slate-500'
                                }`}>
                                  <ChevronRight className="h-4 w-4" />
                                  Click to reveal answer
                                </div>
                              </CardContent>
                            </Card>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              )}
              
              {playgroundContent === 'chat' && (
                <article className="h-full flex flex-col p-8">
                  <header className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        darkMode ? 'bg-primary/10' : 'bg-primary/5'
                      }`}>
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                          AI Study Assistant
                        </h2>
                        <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                          Ask questions about your materials
                        </p>
                      </div>
                    </div>
                  </header>
                  
                  <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                    <div className="flex-1 flex items-center justify-center pb-4">
                      <Card className={`w-full rounded-xl ${
                        darkMode ? 'bg-background' : 'bg-slate-50'
                      }`}>
                        <CardContent className="p-6">
                          <div className="text-center">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                              darkMode ? 'bg-primary/10' : 'bg-primary/5'
                            }`}>
                              <Bot className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                              Ready to help you learn
                            </h3>
                            <p className={`${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                              Ask any question about your study materials
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <form className="flex gap-3 mt-auto">
                      <div className="flex-1 relative">
                        <input 
                          type="text"
                          className={`w-full p-4 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                            darkMode 
                              ? 'bg-background border-border text-foreground placeholder-muted-foreground' 
                              : 'bg-white border-slate-200 placeholder-slate-500'
                          }`}
                          placeholder="Ask anything about machine learning..."
                        />
                        <Button 
                          size="icon" 
                          className="absolute right-2 top-2 h-8 w-8 rounded-lg"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </article>
              )}
              
              {!playgroundContent && (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                      darkMode ? 'bg-primary/10' : 'bg-primary/5'
                    }`}>
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                      Ready to transform your learning
                    </h2>
                    <p className={`text-lg leading-relaxed ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                      Select a source and choose how you'd like to study it
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sliding Curtain */}
            <div className={`absolute top-0 bottom-0 transition-all duration-500 ease-out overflow-hidden z-10 ${
              curtainVisible ? 'left-0 right-0' : 'left-[calc(100%-48px)] right-0'
            } ${darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'} border-l`}>
              
              {/* Full curtain content */}
              <div className={`h-full transition-all duration-300 ${
                curtainVisible ? 'opacity-100 p-6' : 'opacity-0 p-0 overflow-hidden'
              }`}>
                <header className="text-center mb-6">
                  <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                    Choose your study method
                  </h3>
                  {selectedSource && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>From:</span>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(selectedSource.type)}
                        <span className={`font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                          {selectedSource.name}
                        </span>
                      </div>
                    </div>
                  )}
                </header>
                
                {/* Study Method Tiles */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {tiles.map((tile) => (
                    <button
                      key={tile.id}
                      className={`group relative p-4 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                        darkMode 
                          ? 'bg-background hover:bg-accent/50 border-border' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      } border`}
                      onClick={() => handleTileClick(tile.id)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          darkMode ? 'bg-primary/10' : 'bg-primary/5'
                        }`}>
                          {tile.icon}
                        </div>
                        <div>
                          <div className={`text-sm font-semibold ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                            {tile.title}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                            {tile.desc}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Ask Questions Button */}
                <Card 
                  className={`w-full cursor-pointer transition-all duration-200 rounded-xl ${
                    darkMode 
                      ? 'hover:bg-accent/50' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={handleChatClick}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <MessageCircle className={`h-5 w-5 ${darkMode ? 'text-muted-foreground' : 'text-slate-400'}`} />
                      <span className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                        Ask Questions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Collapsed handle */}
              {!curtainVisible && (
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                  <button
                    className={`w-8 h-16 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      darkMode 
                        ? 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    onClick={handleShowCurtain}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Right Panel - Generated Content */}
          <aside className={`h-full overflow-hidden flex flex-col rounded-2xl ${
            darkMode ? 'bg-card border-border' : 'bg-white border-slate-200'
          } border`}>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-xs font-semibold tracking-wide uppercase ${
                  darkMode ? 'text-muted-foreground' : 'text-slate-500'
                }`}>
                  Generated
                </h3>
                {!curtainVisible && (
                  <button
                    className={`p-1.5 rounded-lg transition-all duration-200 ${
                      darkMode 
                        ? 'text-muted-foreground hover:text-foreground hover:bg-accent' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    onClick={handleShowCurtain}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Outputs list */}
              <ul className="space-y-2 max-h-[600px] overflow-y-auto">
                {outputs.map((output) => (
                  <li key={output.id}>
                    <button
                      className={`w-full group p-3.5 rounded-xl text-left transition-all duration-200 ${
                        darkMode 
                          ? 'bg-background hover:bg-accent/50 border-border' 
                          : 'bg-slate-50 hover:bg-white hover:shadow-sm border-slate-200'
                      } border`}
                      onClick={() => handleOutputClick(output)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          darkMode ? 'bg-card' : 'bg-white'
                        }`}>
                          {getTileIcon(output.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${
                            darkMode ? 'text-foreground' : 'text-slate-900'
                          }`}>
                            {output.title}
                          </p>
                          <p className={`text-xs mt-1 ${
                            darkMode ? 'text-muted-foreground' : 'text-slate-600'
                          }`}>
                            {output.preview}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {getStatusIcon(output.status)}
                            <span className={`text-xs ${
                              output.status === 'ready'
                                ? darkMode ? 'text-green-400' : 'text-green-600'
                                : darkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {output.status === 'ready' ? 'Ready' : 'Generating...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Item counter */}
              {outputs.length > 0 && (
                <p className={`mt-4 text-center text-xs ${
                  darkMode ? 'text-muted-foreground' : 'text-slate-400'
                }`}>
                  {outputs.length} item{outputs.length !== 1 ? 's' : ''} generated
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}