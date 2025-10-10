// app/services/QuickStudyTextService.ts
import { Source } from '../types/QuickStudyTypes'

interface TextProcessingResult {
  text: string
  source: 'optimized' | 'chunked_original' | 'original'
  stats?: {
    originalLength: number
    processedLength: number
    compressionRatio?: number
    strategy?: string
    keyTopics?: string[]
  }
}

interface TaskSettings {
  maxTokens?: number
  preferredLength?: number
  contextImportance?: 'high' | 'medium' | 'low'
  detailLevel?: 'high' | 'medium' | 'low'
}

type TaskType = 'chat' | 'quiz' | 'flashcards' | 'notes' | 'summary' | 'concepts'
type OptimizationQuality = 'excellent' | 'good' | 'acceptable' | 'poor'

export class QuickStudyTextService {
  // Task-specific configurations
  private static readonly TASK_CONFIGS: Record<TaskType, TaskSettings> = {
    chat: {
      maxTokens: 8000,
      preferredLength: 25000,
      contextImportance: 'high',
      detailLevel: 'high'
    },
    quiz: {
      maxTokens: 6000,
      preferredLength: 20000,
      contextImportance: 'medium',
      detailLevel: 'medium'
    },
    flashcards: {
      maxTokens: 5000,
      preferredLength: 15000,
      contextImportance: 'low',
      detailLevel: 'medium'
    },
    notes: {
      maxTokens: 8000,
      preferredLength: 25000,
      contextImportance: 'high',
      detailLevel: 'high'
    },
    summary: {
      maxTokens: 10000,
      preferredLength: 30000,
      contextImportance: 'high',
      detailLevel: 'medium'
    },
    concepts: {
      maxTokens: 6000,
      preferredLength: 20000,
      contextImportance: 'medium',
      detailLevel: 'high'
    }
  }

  /**
   * Main method: Get optimal text for processing based on task type
   */
  static getProcessingText(source: Source, taskType: TaskType): TextProcessingResult {
    console.log(`🔍 QuickStudyTextService: Processing ${taskType} for ${source.name}`)
    
    const config = this.TASK_CONFIGS[taskType]
    const quality = this.validateOptimization(source)
    
    console.log(`📊 Optimization quality: ${quality}`)
    
    // Strategy selection based on optimization quality and task requirements
    if (source.optimizedText && this.shouldUseOptimized(quality, taskType)) {
      return this.createOptimizedResult(source, taskType)
    }
    
    // Fallback to chunked original
    console.log(`⚠️ Using chunked original text (quality: ${quality})`)
    return this.createChunkedResult(source, taskType, config)
  }

  /**
   * Create contextual system prompt that understands the text processing context
   */
  static createContextualPrompt(source: Source, taskType: TaskType, basePrompt: string): string {
    const result = this.getProcessingText(source, taskType)
    
    let contextInfo = ''
    if (result.source === 'optimized' && result.stats) {
      contextInfo = `

📋 INFORMACJA O MATERIALE:
- Materiał został zoptymalizowany dla lepszej jakości przetwarzania
- Strategia: ${result.stats.strategy || 'unknown'}
- Kompresja: ${((result.stats.compressionRatio || 0) * 100).toFixed(1)}% oryginalnej długości
- Długość przetwarzana: ${result.text.length.toLocaleString()} znaków (z ${result.stats.originalLength.toLocaleString()})
- Kluczowe tematy: ${result.stats.keyTopics?.slice(0, 8).join(', ') || 'nie określono'}
${result.stats.keyTopics && result.stats.keyTopics.length > 8 ? `- I ${result.stats.keyTopics.length - 8} dodatkowych tematów` : ''}

💡 WAŻNE: Ten tekst zawiera najważniejsze informacje w skoncentrowanej formie - możesz ufać że zawiera kluczowe koncepcje z oryginalnego materiału.`
    } else if (result.source === 'chunked_original') {
      contextInfo = `

📋 INFORMACJA O MATERIALE:
- Używany jest fragment oryginalnego długiego dokumentu (${result.stats?.originalLength.toLocaleString()} → ${result.text.length.toLocaleString()} znaków)
- Materiał może być niekompletny - skoncentruj się na dostępnych informacjach
- Długość przetwarzana: ${result.text.length.toLocaleString()} znaków

⚠️ UWAGA: To jest fragment większego dokumentu - bazuj na dostępnych informacjach.`
    }

    return `${basePrompt}${contextInfo}`
  }

  /**
   * Get processing statistics for monitoring and debugging
   */
  static getProcessingStats(source: Source, taskType: TaskType): {
    textSource: string
    originalLength: number
    processedLength: number
    compressionRatio?: number
    optimizationQuality: OptimizationQuality
    recommendedForTask: boolean
  } {
    const result = this.getProcessingText(source, taskType)
    const quality = this.validateOptimization(source)
    
    return {
      textSource: result.source,
      originalLength: source.extractedText?.length || 0,
      processedLength: result.text.length,
      compressionRatio: result.stats?.compressionRatio,
      optimizationQuality: quality,
      recommendedForTask: this.shouldUseOptimized(quality, taskType)
    }
  }

  // ============= PRIVATE METHODS =============

  /**
   * Validate optimization quality
   */
  private static validateOptimization(source: Source): OptimizationQuality {
    const stats = source.optimizationStats
    const optimizedText = source.optimizedText
    const extractedText = source.extractedText

    console.log(`🔍 DEBUGGING validateOptimization:`, {
      hasStats: !!stats,
      hasOptimizedText: !!optimizedText,
      hasExtractedText: !!extractedText,
      strategy: stats?.strategy,
      extractedLength: extractedText?.length,
      optimizedLength: optimizedText?.length
    })

    if (!stats || !optimizedText || !extractedText) {
      console.log(`❌ Missing required data for optimization validation`)
      return 'poor'
    }

    // 🚀 SPECIAL CASE: Raw strategy = small text = excellent quality
    if (stats.strategy === 'raw') {
      console.log(`✅ Raw strategy detected - small text, using full content (excellent quality)`)
      return 'excellent'
    }

    let score = 0

    // Check compression ratio (should be reasonable)
    const compressionRatio = stats.compressionRatio || (optimizedText.length / extractedText.length)
    if (compressionRatio >= 0.1 && compressionRatio <= 0.8) score += 25
    else if (compressionRatio > 0.8) score += 15 // under-compressed
    else score += 5 // over-compressed

    // Check key topics coverage
    const topicsCount = stats.keyTopics?.length || 0
    if (topicsCount >= 5 && topicsCount <= 15) score += 25
    else if (topicsCount > 15) score += 20
    else if (topicsCount >= 3) score += 15
    else score += 5

    // Check strategy effectiveness  
    if (stats.strategy === 'full') score += 20
    else if (stats.strategy === 'sampled' && stats.processingStats?.samplingRatio && stats.processingStats.samplingRatio >= 0.3) score += 20
    else if (stats.strategy === 'sampled') score += 10
    else score += 5

    // Check processing success rate
    if (stats.processedChunks === stats.chunkCount) score += 15
    else if (stats.processedChunks / stats.chunkCount >= 0.8) score += 10
    else score += 5

    // Check text quality (basic validation)
    if (optimizedText.length > 100 && optimizedText.includes('.')) score += 15
    else score += 5

    console.log(`📊 Validation score: ${score}/100`)

    // Determine quality level
    if (score >= 85) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 50) return 'acceptable'
    return 'poor'
  }

  /**
   * Determine if optimized text should be used for specific task
   */
  private static shouldUseOptimized(quality: OptimizationQuality, taskType: TaskType): boolean {
    const config = this.TASK_CONFIGS[taskType]

    // High context importance tasks are more selective
    if (config.contextImportance === 'high') {
      return quality === 'excellent' || quality === 'good'
    }

    // Medium context importance tasks accept more
    if (config.contextImportance === 'medium') {
      return quality !== 'poor'
    }

    // Low context importance tasks accept almost everything
    return quality !== 'poor'
  }

  /**
   * Create result using optimized text
   */
  private static createOptimizedResult(source: Source, taskType: TaskType): TextProcessingResult {
    const stats = source.optimizationStats
    
    console.log(`✅ Using optimized text: ${source.optimizedText?.length} chars`)
    console.log(`📊 Compression: ${((stats?.compressionRatio || 0) * 100).toFixed(1)}%`)
    console.log(`🏷️ Key topics: ${stats?.keyTopics?.length || 0}`)

    return {
      text: source.optimizedText!,
      source: 'optimized',
      stats: {
        originalLength: source.extractedText?.length || 0,
        processedLength: source.optimizedText?.length || 0,
        compressionRatio: stats?.compressionRatio,
        strategy: stats?.strategy,
        keyTopics: stats?.keyTopics
      }
    }
  }

  /**
   * Create result using chunked original text
   */
  private static createChunkedResult(source: Source, taskType: TaskType, config: TaskSettings): TextProcessingResult {
    const originalText = source.extractedText || ''
    const targetLength = config.preferredLength || 20000

    let processedText = originalText

    if (originalText.length > targetLength) {
      console.log(`✂️ Chunking text: ${originalText.length} → ~${targetLength} chars`)
      processedText = this.intelligentChunk(originalText, targetLength, taskType)
    }

    console.log(`📄 Using chunked original: ${processedText.length} chars`)

    return {
      text: processedText,
      source: originalText.length > targetLength ? 'chunked_original' : 'original',
      stats: {
        originalLength: originalText.length,
        processedLength: processedText.length
      }
    }
  }

  /**
   * Intelligent chunking that preserves important content
   */
  private static intelligentChunk(text: string, targetLength: number, taskType: TaskType): string {
    if (text.length <= targetLength) return text

    // Different chunking strategies based on task
    switch (taskType) {
      case 'chat':
        // Chat needs good context - take beginning + some middle + end
        return this.contextualChunk(text, targetLength)
      
      case 'quiz':
      case 'flashcards':
        // Quiz/flashcards need facts - take beginning + scattered samples
        return this.factBasedChunk(text, targetLength)
      
      case 'notes':
      case 'summary':
        // Notes/summary need comprehensive coverage
        return this.comprehensiveChunk(text, targetLength)
      
      default:
        return this.contextualChunk(text, targetLength)
    }
  }

  /**
   * Contextual chunking - preserves flow and context
   */
  private static contextualChunk(text: string, targetLength: number): string {
    const sections = Math.min(3, Math.floor(targetLength / 8000))
    const sectionSize = Math.floor(targetLength / sections)

    if (sections === 1) {
      return text.substring(0, targetLength)
    }

    const chunks: string[] = []
    
    // Beginning (40%)
    chunks.push(text.substring(0, Math.floor(sectionSize * 1.4)))
    
    // Middle (30%)
    const middleStart = Math.floor(text.length * 0.4)
    chunks.push(text.substring(middleStart, middleStart + sectionSize))
    
    // End (30%)
    const endStart = Math.max(text.length - sectionSize, middleStart + sectionSize + 1000)
    chunks.push(text.substring(endStart))

    return chunks.join('\n\n[...content omitted...]\n\n')
  }

  /**
   * Fact-based chunking - focuses on definitions, lists, important facts
   */
  private static factBasedChunk(text: string, targetLength: number): string {
    // Take beginning + look for structured content
    const beginning = text.substring(0, Math.floor(targetLength * 0.6))
    
    // Look for definitions, lists, numbered items in remaining text
    const remaining = text.substring(Math.floor(targetLength * 0.6))
    const structuredPattern = /(?:^\s*[\d]+[\.\)]\s|^\s*[•\-\*]\s|(?:definicj[aąę]|oznacza|jest to|means|definition))/gim
    
    const matches = remaining.match(structuredPattern)
    if (matches && matches.length > 0) {
      // Find structured content and include it
      const structuredStart = remaining.search(structuredPattern)
      const structuredContent = remaining.substring(structuredStart, structuredStart + Math.floor(targetLength * 0.4))
      return `${beginning}\n\n[...content omitted...]\n\n${structuredContent}`
    }

    return beginning
  }

  /**
   * Comprehensive chunking - tries to cover whole document scope
   */
  private static comprehensiveChunk(text: string, targetLength: number): string {
    const sections = Math.min(5, Math.floor(targetLength / 5000))
    const sectionSize = Math.floor(targetLength / sections)
    const chunks: string[] = []

    for (let i = 0; i < sections; i++) {
      const start = Math.floor((text.length / sections) * i)
      const chunk = text.substring(start, start + sectionSize)
      chunks.push(chunk)
    }

    return chunks.join('\n\n[...section omitted...]\n\n')
  }
}