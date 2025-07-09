"use client"

import React, { useState, useRef, useEffect } from 'react'
import { usePreferences } from "@/context/preferences-context"
import { 
  Bot, 
  Send, 
  User,
  Loader2,
  RefreshCw,
  MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Source {
  id: string
  name: string
  type: string
  status: string
}

interface ChatViewerProps {
  selectedSource: Source | null
}

export default function ChatViewer({ selectedSource }: ChatViewerProps) {
  const { darkMode } = usePreferences()
  const { toast } = useToast()
  
  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || isLoading) return
    
    if (!selectedSource) {
      toast({
        title: "No source selected",
        description: "Please select a source to chat about",
        variant: "destructive"
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    // Add user message
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // TODO: Jutro - uncomment this API call
      /*
      const response = await fetch('/api/quick-study/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          sourceId: selectedSource.id,
          messages: messages // Send conversation history
        })
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const data = await response.json()
      */

      // MOCK response na dzisiaj - usunąć jutro
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay
      
      const mockResponse = generateMockResponse(userMessage.content, selectedSource)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: "Chat error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([])
    inputRef.current?.focus()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <article className="h-full flex flex-col p-8">
      {/* Header - podobny do Twojego current code */}
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
              {selectedSource 
                ? `Ask questions about ${selectedSource.name}`
                : "Ask questions about your materials"
              }
            </p>
          </div>
        </div>
        
        {/* Clear chat button */}
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="mb-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        )}
      </header>
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 mb-4">
          {messages.length === 0 ? (
            // Welcome state - podobny do Twojego current code
            <div className="h-full flex items-center justify-center">
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
                    <p className={darkMode ? 'text-muted-foreground' : 'text-slate-600'}>
                      {selectedSource 
                        ? `Ask any question about "${selectedSource.name}"`
                        : "Ask any question about your study materials"
                      }
                    </p>
                    
                    {/* Suggested questions */}
                    {selectedSource && (
                      <div className="mt-6 space-y-2">
                        <p className={`text-sm font-medium ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>
                          Suggested questions:
                        </p>
                        <div className="space-y-2">
                          {getSuggestedQuestions(selectedSource).map((question, index) => (
                            <button
                              key={index}
                              className={`w-full p-2 text-sm rounded-lg text-left transition-colors ${
                                darkMode 
                                  ? 'hover:bg-accent border border-border' 
                                  : 'hover:bg-white border border-slate-200'
                              }`}
                              onClick={() => setInputValue(question)}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Messages list
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-4 pr-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        darkMode ? 'bg-primary/10' : 'bg-primary/5'
                      }`}>
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${
                      message.role === 'user' ? 'order-1' : ''
                    }`}>
                      <div className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : darkMode 
                            ? 'bg-muted'
                            : 'bg-slate-100'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      } ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>

                    {message.role === 'user' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        darkMode ? 'bg-muted' : 'bg-slate-200'
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      darkMode ? 'bg-primary/10' : 'bg-primary/5'
                    }`}>
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className={`px-4 py-3 rounded-2xl ${
                      darkMode ? 'bg-muted' : 'bg-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {/* Input Form - podobny do Twojego current code */}
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <div className="flex-1 relative">
            <input 
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className={`w-full p-4 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                darkMode 
                  ? 'bg-background border-border text-foreground placeholder-muted-foreground' 
                  : 'bg-white border-slate-200 placeholder-slate-500'
              } ${isLoading ? 'opacity-50' : ''}`}
              placeholder={selectedSource 
                ? `Ask anything about ${selectedSource.name}...`
                : "Ask anything about your materials..."
              }
            />
            <Button 
              type="submit"
              size="icon" 
              className="absolute right-2 top-2 h-8 w-8 rounded-lg"
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </article>
  )
}

// Helper functions - TODO: jutro - usunąć mock functions

function getSuggestedQuestions(source: Source): string[] {
  const baseQuestions = [
    "Summarize the key points",
    "What are the main concepts?",
    "Explain this in simple terms"
  ]
  
  const typeSpecific = {
    pdf: [
      "What's the main argument?",
      "List the important definitions",
      "What examples are given?"
    ],
    youtube: [
      "What's the main topic discussed?",
      "What are the key takeaways?",
      "Are there any important timestamps?"
    ],
    text: [
      "What's the central theme?",
      "What evidence is presented?",
      "How does this relate to...?"
    ]
  }
  
  return [...baseQuestions, ...(typeSpecific[source.type as keyof typeof typeSpecific] || [])]
}

function generateMockResponse(userMessage: string, source: Source): string {
  // TODO: Jutro - usunąć, zastąpić prawdziwym AI
  
  const responses = {
    summary: `Based on "${source.name}", here are the key points:\n\n1. **Main Concept**: The document covers fundamental principles and core theories.\n\n2. **Key Insights**: Several important examples demonstrate practical applications.\n\n3. **Conclusions**: The material emphasizes the importance of understanding these concepts for further study.`,
    
    explain: `Let me explain this concept from "${source.name}":\n\nThis topic is about understanding the fundamental principles that govern the subject matter. The key idea is that these concepts build upon each other to create a comprehensive understanding.\n\nWould you like me to dive deeper into any specific aspect?`,
    
    questions: `Great question about "${source.name}"! \n\nBased on the content, this relates to the core principles we discussed. The important thing to understand is how these elements work together.\n\nIs there a particular aspect you'd like me to clarify further?`
  }
  
  if (userMessage.toLowerCase().includes('summar')) return responses.summary
  if (userMessage.toLowerCase().includes('explain') || userMessage.toLowerCase().includes('what')) return responses.explain
  
  return responses.questions
}