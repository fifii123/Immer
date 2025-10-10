export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'

// Types
interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  metadata?: {
    originalUrl?: string;
    domain?: string;
    title?: string;
    author?: string;
    publishDate?: string;
    videoId?: string;
    channelName?: string;
  };
}

interface SessionData {
  sources: Source[]
  outputs: any[]
  createdAt: Date
}

// Global in-memory store
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

// Add text or URL content to session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`📝 Add content request for session: ${sessionId}`)
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { type, content, title } = body
    
    if (!type || !content) {
      return Response.json(
        { message: 'Missing type or content' },
        { status: 400 }
      )
    }
    
    console.log(`📄 Processing ${type} content: ${content.substring(0, 100)}...`)
    
    let source: Source
    
    if (type === 'text') {
      source = await processTextContent(content, title)
    } else if (type === 'url') {
      source = await processUrlContent(content, title)
    } else {
      return Response.json(
        { message: 'Invalid content type. Supported: text, url' },
        { status: 400 }
      )
    }
    
    // Add source to session
    sessionData.sources.push(source)
    
    console.log(`✅ Added ${type} source: ${source.id} (${source.name})`)
    console.log(`📊 Session now has ${sessionData.sources.length} total sources`)
    
    return Response.json(source)
    
  } catch (error) {
    console.error('❌ Error adding content:', error)
    
    return Response.json(
      { message: 'Failed to add content' },
      { status: 500 }
    )
  }
}

// Process text content
async function processTextContent(text: string, title?: string): Promise<Source> {
  console.log(`🔍 Processing text content (${text.length} characters)`)
  
  // Basic validation
  if (text.length < 10) {
    throw new Error('Text content too short (minimum 10 characters)')
  }
  
  if (text.length > 100000) {
    throw new Error('Text content too long (maximum 100,000 characters)')
  }
  
  // Clean text
  const cleanedText = cleanExtractedText(text)
  
  // Generate title if not provided
  const generatedTitle = title || generateTitleFromText(cleanedText)
  
  // Create source object
  const source: Source = {
    id: `text-${Date.now()}`,
    name: generatedTitle,
    type: 'text',
    status: 'ready',
    size: `${(text.length / 1024).toFixed(1)} KB`,
    extractedText: cleanedText,
    wordCount: countWords(cleanedText),
    subtype: 'pasted'
  }
  
  console.log(`✅ Created text source: ${source.name} (${source.wordCount} words)`)
  return source
}

// Process URL content
async function processUrlContent(url: string, title?: string): Promise<Source> {
  console.log(`🔍 Processing URL: ${url}`)
  
  // Basic URL validation
  try {
    new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }
  
  // Detect URL type
  const urlType = detectUrlType(url)
  console.log(`🎯 Detected URL type: ${urlType}`)
  
  if (urlType === 'youtube') {
    return await processYouTubeUrl(url, title)
  } else {
    return await processWebUrl(url, title)
  }
}

// Process YouTube URL
async function processYouTubeUrl(url: string, title?: string): Promise<Source> {
  console.log(`🎬 Processing YouTube URL: ${url}`)
  
  try {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      throw new Error('Could not extract YouTube video ID from URL')
    }
    
    // Extract video metadata
    const metadata = await extractYouTubeMetadata(url, videoId)
    
    // Generate title
    const generatedTitle = title || metadata.title || `YouTube Video (${videoId})`
    
    // Try to extract transcript if possible
    let extractedText = ''
    let isTranscriptAvailable = false
    
    try {
      // Attempt to get transcript using youtube-transcript library
      extractedText = await extractYouTubeTranscript(videoId)
      if (extractedText && extractedText.length > 100) {
        isTranscriptAvailable = true
        console.log(`✅ YouTube transcript extracted: ${countWords(extractedText)} words`)
      }
    } catch (error) {
      console.log(`⚠️ Could not extract YouTube transcript: ${error}`)
    }
    
    // If no transcript, create comprehensive placeholder
    if (!isTranscriptAvailable) {
      extractedText = `YouTube Video: ${generatedTitle}

URL: ${url}
Video ID: ${videoId}
${metadata.channelName ? `Channel: ${metadata.channelName}` : ''}
${metadata.duration ? `Duration: ${metadata.duration}` : ''}
${metadata.publishDate ? `Published: ${new Date(metadata.publishDate).toLocaleDateString()}` : ''}
${metadata.viewCount ? `Views: ${parseInt(metadata.viewCount).toLocaleString()}` : ''}

${metadata.description ? `Description:\n${metadata.description.substring(0, 500)}${metadata.description.length > 500 ? '...' : ''}` : ''}

This YouTube video transcript could not be automatically extracted. To use this content for studying:

1. Enable captions on YouTube (CC button) if available
2. Use YouTube transcript features:
   - Click "..." menu → "Show transcript"
   - Copy the transcript text
3. Watch the video and take notes on key points
4. Use "Add Text" option to paste transcript or notes
5. Generate study materials from the transcribed content

Alternative methods:
- Use browser extensions like "YouTube Transcript" for Chrome
- Try online tools like DownSub.com or YouTubeTranscript.com
- Use AI transcription services if you download the audio

${metadata.tags && metadata.tags.length > 0 ? `\nTags: ${metadata.tags.join(', ')}` : ''}

Automatic YouTube transcript extraction will be improved in future updates.`
    }
    
    // Create source object
    const source: Source = {
      id: `youtube-${Date.now()}`,
      name: generatedTitle,
      type: 'youtube',
      status: 'ready',
      extractedText: extractedText,
      wordCount: countWords(extractedText),
      subtype: isTranscriptAvailable ? 'transcript' : 'placeholder',
      duration: metadata.duration,
      metadata: {
        originalUrl: url,
        videoId: videoId,
        channelName: metadata.channelName,
        title: metadata.title,
        publishDate: metadata.publishDate
      }
    }
    
    console.log(`✅ Created YouTube source: ${source.name} ${isTranscriptAvailable ? '(with transcript)' : '(placeholder)'}`)
    return source
    
  } catch (error) {
    console.error(`❌ YouTube processing failed:`, error)
    throw new Error(`Failed to process YouTube URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Extract YouTube transcript (placeholder for youtube-transcript library)
async function extractYouTubeTranscript(videoId: string): Promise<string> {
  // TODO: Implement youtube-transcript library or similar
  // For now, this will throw an error to fall back to placeholder
  
  // Example implementation when youtube-transcript is added:
  // const { YoutubeTranscript } = require('youtube-transcript')
  // const transcript = await YoutubeTranscript.fetchTranscript(videoId)
  // return transcript.map(entry => entry.text).join(' ')
  
  throw new Error('YouTube transcript extraction not implemented yet')
}

// Process regular web URL with basic scraping
async function processWebUrl(url: string, title?: string): Promise<Source> {
  console.log(`🌐 Processing Web URL: ${url}`)
  
  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuickStudy/1.0; Educational content extraction)'
      },
      timeout: 10000 // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Extract metadata
    const pageTitle = $('title').text().trim() || 
                     $('meta[property="og:title"]').attr('content') || 
                     'Web Article'
    
    const pageDescription = $('meta[name="description"]').attr('content') ||
                           $('meta[property="og:description"]').attr('content') ||
                           ''
    
    // Extract main content using common selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main',
      '.main-content'
    ]
    
    let extractedText = ''
    
    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const content = $(selector).first()
      if (content.length > 0) {
        // Remove unwanted elements
        content.find('script, style, nav, header, footer, .advertisement, .ads, .social-share').remove()
        
        extractedText = content.text()
        break
      }
    }
    
    // Fallback: extract from body if no main content found
    if (!extractedText || extractedText.length < 200) {
      $('script, style, nav, header, footer, .advertisement, .ads, .social-share').remove()
      extractedText = $('body').text()
    }
    
    // Clean extracted text
    extractedText = cleanExtractedText(extractedText)
    
    if (!extractedText || extractedText.length < 100) {
      throw new Error('Could not extract meaningful content from this webpage')
    }
    
    // Generate title
    const generatedTitle = title || pageTitle
    const domain = extractDomainName(url)
    
    // Create source object
    const source: Source = {
      id: `url-${Date.now()}`,
      name: generatedTitle,
      type: 'url',
      status: 'ready',
      extractedText: extractedText,
      wordCount: countWords(extractedText),
      subtype: 'article',
      metadata: {
        originalUrl: url,
        domain: domain,
        title: pageTitle
      }
    }
    
    console.log(`✅ Created URL source: ${source.name} (${source.wordCount} words from ${domain})`)
    return source
    
  } catch (error) {
    console.error(`❌ Web scraping failed for ${url}:`, error)
    
    // If scraping fails, create a placeholder
    const domain = extractDomainName(url)
    const generatedTitle = title || `Article from ${domain}`
    
    const placeholderText = `Web Article: ${generatedTitle}

URL: ${url}
Domain: ${domain}

This webpage could not be automatically processed. This might be due to:
- JavaScript-heavy content that requires a browser
- Access restrictions or paywalls  
- Server blocking automated requests
- Complex page structure

To use this content for studying:
1. Visit the URL in your browser
2. Copy the main article content manually
3. Use "Add Text" option to paste the content
4. Generate study materials from the pasted text

Error details: ${error instanceof Error ? error.message : 'Unknown error'}`
    
    const source: Source = {
      id: `url-${Date.now()}`,
      name: generatedTitle,
      type: 'url',
      status: 'ready',
      extractedText: placeholderText,
      wordCount: countWords(placeholderText),
      subtype: 'failed',
      processingError: error instanceof Error ? error.message : 'Scraping failed',
      metadata: {
        originalUrl: url,
        domain: domain
      }
    }
    
    console.log(`⚠️ Created URL placeholder due to scraping failure: ${source.name}`)
    return source
  }
}

// Helper function to detect URL type
function detectUrlType(url: string): string {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube'
  }
  
  return 'website'
}

// Extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

// Extract YouTube metadata using YouTube Data API v3
async function extractYouTubeMetadata(url: string, videoId: string): Promise<any> {
  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    
    if (youtubeApiKey) {
      console.log(`📡 Fetching YouTube metadata via API for video: ${videoId}`)
      
      // Call YouTube Data API v3
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet,contentDetails,statistics`
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0]
        const snippet = video.snippet
        const contentDetails = video.contentDetails
        const statistics = video.statistics
        
        // Parse duration from ISO 8601 format (PT4M13S)
        const duration = parseDuration(contentDetails.duration)
        
        console.log(`✅ YouTube API metadata retrieved: ${snippet.title}`)
        
        return {
          title: snippet.title,
          channelName: snippet.channelTitle,
          description: snippet.description,
          publishDate: snippet.publishedAt,
          duration: formatDuration(duration),
          tags: snippet.tags || [],
          viewCount: statistics.viewCount,
          likeCount: statistics.likeCount,
          videoId: videoId
        }
      }
    }
    
    // Fallback to web scraping if no API key or API fails
    console.log(`⚠️ Falling back to web scraping for YouTube metadata`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuickStudy/1.0)'
      },
      timeout: 10000
    })
    
    if (response.ok) {
      const html = await response.text()
      const $ = cheerio.load(html)
      
      const title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="title"]').attr('content') ||
                   $('title').text() ||
                   null
      
      const channelName = $('meta[property="og:site_name"]').attr('content') ||
                         $('link[itemprop="name"]').attr('content') ||
                         null
      
      return {
        title: title ? title.replace(' - YouTube', '') : null,
        channelName: channelName,
        videoId: videoId,
        description: null,
        publishDate: null,
        duration: null,
        tags: [],
        viewCount: null,
        likeCount: null
      }
    }
  } catch (error) {
    console.log(`Could not fetch YouTube metadata: ${error}`)
  }
  
  // Return minimal info if everything fails
  return {
    title: null,
    channelName: null,
    videoId: videoId,
    description: null,
    publishDate: null,
    duration: null,
    tags: [],
    viewCount: null,
    likeCount: null
  }
}

// Parse ISO 8601 duration format (PT4M13S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0') 
  const seconds = parseInt(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

// Format duration from seconds to readable string
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

// Helper function to extract domain name
function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return 'unknown-domain'
  }
}

// Helper function to generate title from text
function generateTitleFromText(text: string): string {
  const firstLine = text.split('\n')[0].trim()
  
  if (firstLine.length > 3 && firstLine.length <= 100) {
    return firstLine
  }
  
  const truncated = text.trim().substring(0, 50)
  return truncated.length < text.trim().length ? `${truncated}...` : truncated
}

// Clean and normalize extracted text
function cleanExtractedText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,;:!?()[\]{}'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Count words in text
function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(word => word.length > 0).length
}