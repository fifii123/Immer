"use client"

import React, { useState, useRef, useEffect } from 'react'
import { 
  Sparkles, 
  Send, 
  User,
  Loader2,
  Command,
  ArrowRight,
  Zap,
  FileText,
  Brain,
  Lightbulb,
  BookOpen
} from "lucide-react"

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
  selectedSource?: Source | null
}

export default function ChatViewer({ selectedSource = { id: '1', name: 'Sample Document', type: 'pdf', status: 'ready' } }: ChatViewerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const mockResponse = generateMockResponse(userMessage.content, selectedSource!)
    
    // Simulate typing effect
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: mockResponse,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsTyping(false)
    setIsLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleSuggestionClick = (question: string) => {
    setInputValue(question)
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  AI Assistant
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ask anything about your document
                </p>
              </div>
            </div>
            
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                New conversation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6">
          {messages.length === 0 ? (
            // Welcome State
            <div className="flex items-center justify-center py-8">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/25">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-3">
                    Ask anything about your document
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    I'll help you understand complex topics, summarize key points, and answer your questions intelligently.
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                  {['Instant answers', 'Deep analysis', 'Smart summaries', 'Study companion'].map((feature) => (
                    <span key={feature} className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Suggested Questions */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground text-center mb-4">
                    Try asking
                  </p>
                  <div className="grid gap-3">
                    {getSuggestedQuestions(selectedSource!).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(question.text)}
                        className="group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="absolute inset-0 bg-card opacity-90"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                            <question.icon className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                              {question.text}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {question.description}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div></div>
          ) : (
            // Messages List
            <div className="py-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    <div
                      className={`rounded-2xl px-5 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'bg-card border border-border shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    } text-muted-foreground`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-4 justify-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="relative">
            <div className="relative flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm placeholder-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="Ask me anything..."
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                }}
              />
              
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="flex-shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
                style={{ height: '44px', width: '44px' }}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-xs font-medium bg-muted rounded">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 text-xs font-medium bg-muted rounded">Shift + Enter</kbd> for new line
              </p>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">AI-powered responses</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSuggestedQuestions(source: Source) {
  return [
    {
      icon: Lightbulb,
      text: "Summarize the main concepts in simple terms",
      description: "Get a clear overview of key ideas"
    },
    {
      icon: Zap,
      text: "What are the most important takeaways?",
      description: "Focus on actionable insights"
    },
    {
      icon: BookOpen,
      text: "Create study notes with examples",
      description: "Perfect for exam preparation"
    }
  ]
}

function generateMockResponse(userMessage: string, source: Source): string {
  const responses = {
    summary: `I'll break down the key concepts from "${source.name}" for you:\n\n**Core Principles:**\n• Foundation concepts that establish the theoretical framework\n• Practical applications demonstrated through real-world examples\n• Critical connections between different topics\n\n**Key Insights:**\nThe document emphasizes how these principles work together to create a comprehensive understanding. Each concept builds upon the previous, creating a logical progression of knowledge.\n\n**Practical Applications:**\nThese concepts can be applied in various contexts, particularly in problem-solving scenarios where systematic thinking is required.\n\nWould you like me to dive deeper into any specific area?`,
    
    explain: `Let me explain this concept from "${source.name}" in simple terms:\n\n**The Basic Idea:**\nThink of it like building blocks - each concept is a foundation piece that supports more complex ideas. The document presents these in a structured way to help you understand the progression.\n\n**Why It Matters:**\nUnderstanding these fundamentals is crucial because they appear repeatedly in advanced applications. Once you grasp the basics, everything else becomes much clearer.\n\n**Real-World Connection:**\nThese principles aren't just theoretical - they have practical applications in everyday scenarios, from problem-solving to decision-making.\n\nWhat specific aspect would you like me to clarify further?`,
    
    questions: `Based on "${source.name}", I can see you're exploring some interesting concepts!\n\n**Here's My Understanding:**\nThe document covers fundamental principles that are essential for building a strong knowledge base. These concepts interconnect in meaningful ways.\n\n**Key Areas to Focus On:**\n• The relationship between different concepts\n• Practical applications and examples\n• How to apply these principles in various contexts\n\n**Next Steps:**\nI'd recommend focusing on understanding the core principles first, then exploring how they apply to specific scenarios.\n\nIs there a particular section or concept you'd like to explore in more detail?`
  }
  
  if (userMessage.toLowerCase().includes('summar')) return responses.summary
  if (userMessage.toLowerCase().includes('explain') || userMessage.toLowerCase().includes('what')) return responses.explain
  
  return responses.questions
}