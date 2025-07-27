"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// Custom CSS for KaTeX to prevent layout shifts
const katexStyles = `
  .katex-display {
    margin: 1rem 0 !important;
    min-height: 2.5rem;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .katex {
    font-size: 1em !important;
    line-height: 1.2 !important;
  }
  
  .katex-display .katex {
    font-size: 1.1em !important;
  }
  
  .markdown-content .katex-display {
    overflow-x: auto;
    overflow-y: hidden;
    contain: layout style paint;
  }
  
  .markdown-content .katex-html {
    min-height: 1.2em;
    contain: layout style;
  }
  
  /* Force consistent heights for math elements */
  .math-display {
    min-height: 3rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    contain: layout style paint size;
  }
  
  .math-inline {
    min-height: 1.2rem !important;
    display: inline-flex !important;
    align-items: center !important;
    vertical-align: middle !important;
    contain: layout style;
  }
  
  /* Prevent reflow during KaTeX rendering */
  .katex .katex-mathml {
    position: absolute !important;
    clip: rect(1px, 1px, 1px, 1px) !important;
    padding: 0 !important;
    border: 0 !important;
    height: 1px !important;
    width: 1px !important;
    overflow: hidden !important;
  }
  
  /* Stabilize message container during streaming */
  .streaming-message {
    min-height: 2rem;
    will-change: contents;
  }
  
  /* GPU acceleration for smooth scrolling */
  .messages-container {
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
  }
`

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = katexStyles
  if (!document.head.querySelector('style[data-katex-custom]')) {
    styleElement.setAttribute('data-katex-custom', 'true')
    document.head.appendChild(styleElement)
  }
}

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
  const [shouldShowAutoScrollIndicator, setShouldShowAutoScrollIndicator] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

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

  // Simple auto-scroll: enabled until user scrolls manually
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !shouldAutoScrollRef.current) return

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [])

  // Disable auto-scroll when user scrolls manually, enable when back at bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10
      
      if (isAtBottom) {
        // User scrolled back to bottom - re-enable auto-scroll
        shouldAutoScrollRef.current = true
      } else {
        // User scrolled away from bottom - disable auto-scroll
        shouldAutoScrollRef.current = false
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Force re-render when shouldAutoScrollRef changes for the indicator
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScrollForIndicator = () => {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10
      
      shouldAutoScrollRef.current = isAtBottom
      setShouldShowAutoScrollIndicator(isAtBottom)
    }

    container.addEventListener('scroll', handleScrollForIndicator, { passive: true })
    return () => container.removeEventListener('scroll', handleScrollForIndicator)
  }, [])

  // Auto-scroll for new messages and during streaming
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-scroll during streaming content updates
  useEffect(() => {
    if (!isStreaming) return

    const container = scrollContainerRef.current
    if (!container) return

    // Handle content changes during streaming
    const handleContentChange = () => {
      if (shouldAutoScrollRef.current) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight
        }, 20)
      }
    }

    const mutationObserver = new MutationObserver(handleContentChange)
    const resizeObserver = new ResizeObserver(handleContentChange)

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    })
    resizeObserver.observe(container)

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [isStreaming])

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
    // Re-enable auto-scroll for new conversation
    shouldAutoScrollRef.current = true
    setShouldShowAutoScrollIndicator(true)
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
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
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
            <div className="py-4 space-y-4 messages-container">
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
                      } ${isStreaming && message.role === 'assistant' && message.id === messages[messages.length - 1]?.id ? 'streaming-message' : ''}`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="markdown-content text-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[
                              rehypeRaw,
                              rehypeSanitize,
                              rehypeHighlight,
                              [rehypeKatex, {
                                strict: false,
                                trust: true,
                                fleqn: false,
                                throwOnError: false,
                                errorColor: '#cc0000',
                                macros: {
                                  "\\f": "#1f(#2)"
                                }
                              }]
                            ]}
                            components={{
                              h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-md font-semibold text-blue-500 dark:text-blue-300 mt-3 mb-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                              li: ({node, ...props}) => <li className="my-1" {...props} />,
                              blockquote: ({node, ...props}) => (
                                <blockquote className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-1 my-2 bg-blue-50 dark:bg-blue-900/20 rounded" {...props} />
                              ),
                              code: ({node, inline, className, children, ...props}) => {
                                if (inline) {
                                  return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                                }
                                return (
                                  <div className="my-3">
                                    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                      <code {...props}>{children}</code>
                                    </pre>
                                  </div>
                                )
                              },
                              table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-4">
                                  <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                                </div>
                              ),
                              th: ({node, ...props}) => <th className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-left font-semibold" {...props} />,
                              td: ({node, ...props}) => <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />,
                              // Custom handling for math elements to prevent layout shifts
                              div: ({node, className, ...props}) => {
                                if (className?.includes('math-display')) {
                                  return <div className={`${className} min-h-[2rem] flex items-center justify-center my-4`} {...props} />
                                }
                                return <div className={className} {...props} />
                              },
                              span: ({node, className, ...props}) => {
                                if (className?.includes('math-inline')) {
                                  return <span className={`${className} inline-block min-h-[1.2rem] align-middle`} {...props} />
                                }
                                return <span className={className} {...props} />
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
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
              <div className="flex items-center gap-3">
                {shouldShowAutoScrollIndicator && (
                  <div className="flex items-center gap-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Auto-scroll</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Command className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">AI-powered responses</span>
                </div>
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