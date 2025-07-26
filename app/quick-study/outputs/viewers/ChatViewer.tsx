"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  sessionId: string | null
  selectedSource?: Source | null
  initialMessages?: Message[]
  onMessagesChange?: (sourceId: string, messages: Message[]) => void
}

export default function ChatViewer({ 
  sessionId, 
  selectedSource = { id: '1', name: 'Sample Document', type: 'pdf', status: 'ready' },
  initialMessages = [],
  onMessagesChange
}: ChatViewerProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Memoized function to update parent with messages
  const updateParentMessages = useCallback((newMessages: Message[]) => {
    if (onMessagesChange && selectedSource) {
      onMessagesChange(selectedSource.id, newMessages)
    }
  }, [onMessagesChange, selectedSource?.id])

  // Function to update messages and notify parent
  const updateMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages)
    updateParentMessages(newMessages)
  }, [updateParentMessages])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update local messages when source changes (not on every initialMessages change)
  useEffect(() => {
    if (selectedSource && initialMessages !== messages) {
      setMessages(initialMessages)
    }
  }, [selectedSource?.id]) // Only depend on source ID change

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !sessionId || !selectedSource) return
  
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }
  
    const newMessagesWithUser = [...messages, userMessage]
    updateMessages(newMessagesWithUser)
    setInputValue('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingMessage('')
  
    try {
      // Prepare conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
  
      const response = await fetch(`/api/quick-study/sessions/${sessionId}/generate/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: selectedSource.id,
          message: userMessage.content,
          conversationHistory: conversationHistory
        }),
      })
  
      if (!response.ok) {
        throw new Error('Failed to get chat response')
      }
  
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }
  
      let fullResponse = ''
      const assistantMessageId = (Date.now() + 1).toString()
  
      // Add initial empty assistant message
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      const messagesWithAssistant = [...newMessagesWithUser, initialAssistantMessage]
      updateMessages(messagesWithAssistant)
  
      // Read the stream
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
  
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n\n')
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk') {
                fullResponse += data.content
                setStreamingMessage(fullResponse)
                
                // Update the assistant message in real time
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: fullResponse }
                    : msg
                ))
              } else if (data.type === 'complete') {
                // Final content update
                const finalMessages = messagesWithAssistant.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: data.fullContent }
                    : msg
                )
                updateMessages(finalMessages)
                break
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError)
            }
          }
        }
      }
  
    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi. Spróbuj ponownie.',
        timestamp: new Date()
      }
      updateMessages([...messages, userMessage, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingMessage('')
      inputRef.current?.focus()
    }
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

  const handleClearConversation = () => {
    updateMessages([])
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
                onClick={handleClearConversation}
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
              </div>
            </div>
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
              {isLoading && !isStreaming && (
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
                className="flex-shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
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
      text: "Explain this concept with examples",
      description: "Get detailed explanations with real examples"
    }
  ]
}