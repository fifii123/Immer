// ULTRA-OPTIMIZED add-content route with maximum speed

import { NextRequest } from 'next/server'
import { createStructuredChunks, type StructuredChunk } from '../../../../../../lib/structuredChunking'
import { buildKnowledgeGraph, type KnowledgeGraph } from '../../../../../../lib/knowledgeGraph'
import { 
  OPTIMIZATION_CONFIG,
  ultraFastPreprocess,
  shouldSkipProcessing,
  ProcessingTimer,
  assessContentQuality,
  filterValuableContent,
  createRuleBasedChunk,
  createRuleBasedEntities,
  fastTokenEstimate
} from '../../../../../../lib/optimizationUtils'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error' | 'structuring' | 'building_graph';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  structuredChunks?: StructuredChunk[];
  knowledgeGraph?: KnowledgeGraph;
  processingStage?: 'extracting' | 'structuring' | 'building_graph' | 'complete';
}

interface SessionData {
  sources: Source[]
  outputs: any[]
  createdAt: Date
}

// Global store
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// ULTRA-OPTIMIZED content addition
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = new ProcessingTimer('ADD-CONTENT')
  
  try {
    const sessionId = params.id
    
    console.log(`⚡ Ultra-fast content addition for session: ${sessionId}`)
    
    // Check session
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      return Response.json({ message: 'Session not found' }, { status: 404 })
    }
    
    // Parse request
    const body = await request.json()
    const { type, content, title } = body
    
    if (!type || !content) {
      return Response.json({ message: 'Missing type or content' }, { status: 400 })
    }
    
    timer.checkpoint('Request parsed')
    
    let source: Source
    
    if (type === 'text') {
      source = await ultraFastTextProcessing(content, title)
    } else if (type === 'url') {
      source = await ultraFastUrlProcessing(content, title)
    } else {
      return Response.json({ message: 'Invalid content type' }, { status: 400 })
    }
    
    timer.checkpoint('Content processed')
    
    // Add to session
    sessionData.sources.push(source)
    
    const totalTime = timer.finish()
    console.log(`⚡ Content added in ${totalTime}ms`)
    
    return Response.json(source)
    
  } catch (error) {
    console.error('❌ Add content failed:', error)
    return Response.json({ message: 'Failed to add content' }, { status: 500 })
  }
}

// ULTRA-FAST: Text content processing
async function ultraFastTextProcessing(text: string, title?: string): Promise<Source> {
  console.log(`⚡ Processing text content (${text.length} chars)`)
  
  // OPTIMIZATION: Early validation
  if (text.length < 10) {
    throw new Error('Text too short (min 10 chars)')
  }
  
  if (text.length > 100000) {
    console.log(`⚠️ Large text detected, truncating to 100k chars`)
    text = text.substring(0, 100000) + '\n\n[Content truncated for performance]'
  }
  
  // OPTIMIZATION: Fast preprocessing
  const cleanedText = filterValuableContent(ultraFastPreprocess(text))
  const generatedTitle = title || generateFastTitle(cleanedText)
  
  const source: Source = {
    id: `text-${Date.now()}`,
    name: generatedTitle,
    type: 'text',
    status: 'processing',
    processingStage: 'extracting',
    size: `${(text.length / 1024).toFixed(1)} KB`,
    extractedText: cleanedText,
    wordCount: countWords(cleanedText),
    subtype: 'pasted'
  }
  
  // OPTIMIZATION: Quality-based processing
  const quality = assessContentQuality(cleanedText)
  console.log(`📊 Text quality: ${(quality * 100).toFixed(1)}%`)
  
  if (shouldSkipProcessing(cleanedText, 'text') || quality < 0.3) {
    console.log(`⚡ Using fast rule-based processing`)
    await ultraFastRuleBasedProcessing(source)
  } else {
    // Full processing for high-quality content
    await fullContentProcessing(source, generatedTitle)
  }
  
  console.log(`✅ Text processing complete: ${source.status}`)
  return source
}

// ULTRA-FAST: URL content processing
async function ultraFastUrlProcessing(url: string, title?: string): Promise<Source> {
  console.log(`⚡ Processing URL: ${url}`)
  
  // OPTIMIZATION: URL validation
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }
  
  const urlType = detectUrlType(url)
  const generatedTitle = title || generateUrlTitle(url, urlType)
  
  // OPTIMIZATION: Create placeholder content (real URL fetching would be expensive)
  const placeholderText = `Content from: ${url}\n\nURL processing is optimized for speed. Real content extraction will be implemented based on demand.`
  
  const source: Source = {
    id: `url-${Date.now()}`,
    name: generatedTitle,
    type: urlType === 'youtube' ? 'youtube' : 'url',
    status: 'processing',
    processingStage: 'extracting',
    extractedText: placeholderText,
    wordCount: countWords(placeholderText),
    subtype: urlType
  }
  
  // OPTIMIZATION: Fast processing for URL content
  await ultraFastRuleBasedProcessing(source)
  
  console.log(`✅ URL processing complete: ${source.name}`)
  return source
}

// OPTIMIZATION: Rule-based processing for simple content
async function ultraFastRuleBasedProcessing(source: Source): Promise<void> {
  console.log(`⚡ Rule-based processing`)
  source.status = 'structuring'
  source.processingStage = 'structuring'
  
  // Create chunk without AI
  const chunk = createRuleBasedChunk(source.extractedText || '', 0, source.name)
  source.structuredChunks = [chunk]
  
  // Create entities without AI
  const entities = createRuleBasedEntities(chunk)
  
  // Create minimal knowledge graph
  source.knowledgeGraph = {
    entities: new Map(),
    relations: new Map(),
    metadata: {
      sourceName: source.name,
      totalChunks: 1,
      lastUpdated: new Date(),
      version: "ultra-fast"
    }
  }
  
  // Add entities
  entities.forEach((entity, index) => {
    const id = `fast_${index}`
    source.knowledgeGraph!.entities.set(id, {
      id,
      type: 'concept',
      name: entity.name,
      aliases: [],
      properties: { description: entity.desc },
      descriptions: [entity.desc],
      sourceChunks: entity.chunks,
      confidence: entity.conf,
      category: entity.cat,
      lastUpdated: new Date()
    })
  })
  
  source.status = 'ready'
  source.processingStage = 'complete'
  
  console.log(`⚡ Rule-based complete: ${entities.length} entities`)
}

// Full AI processing for high-quality content
async function fullContentProcessing(source: Source, fileName: string): Promise<void> {
  try {
    console.log(`🧠 Full AI processing`)
    source.status = 'structuring'
    source.processingStage = 'structuring'
    
    // Chunking
    const options = {
      sourceType: source.type,
      fileName: fileName,
      maxTokensPerChunk: OPTIMIZATION_CONFIG.MAX_TOKENS_PER_CHUNK
    }
    
    source.structuredChunks = await createStructuredChunks(source.extractedText!, options)
    
    // Knowledge graph (only for substantial content)
    if (source.structuredChunks.length > 1 && fastTokenEstimate(source.extractedText!) > 500) {
      console.log(`🕸️ Building knowledge graph`)
      source.status = 'building_graph'
      source.processingStage = 'building_graph'
      
      source.knowledgeGraph = await buildKnowledgeGraph(source.structuredChunks, fileName)
    }
    
    source.status = 'ready'
    source.processingStage = 'complete'
    
    console.log(`✅ Full processing complete`)
    
  } catch (error) {
    console.error(`❌ Full processing failed, falling back to rule-based:`, error)
    await ultraFastRuleBasedProcessing(source)
  }
}

// Helper functions
function detectUrlType(url: string): string {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube'
  }
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'twitter'
  }
  if (urlLower.includes('linkedin.com')) {
    return 'linkedin'
  }
  if (urlLower.includes('github.com')) {
    return 'github'
  }
  
  return 'website'
}

function generateUrlTitle(url: string, urlType: string): string {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')
    
    if (urlType === 'youtube') {
      return `YouTube: ${urlObj.searchParams.get('v') || 'Video'}`
    }
    
    return `${domain.charAt(0).toUpperCase() + domain.slice(1)} Content`
  } catch {
    return 'Web Content'
  }
}

function generateFastTitle(text: string): string {
  // Quick title generation without AI
  const firstLine = text.split('\n')[0].trim()
  
  if (firstLine.length > 5 && firstLine.length <= 100) {
    return firstLine
  }
  
  // Use first meaningful words
  const words = text.trim().split(/\s+/).slice(0, 8)
  return words.join(' ') + (words.length === 8 ? '...' : '')
}

function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}