export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { generateKnowledgeMapFromGraph } from '../../../../../../../lib/knowledgeGraph'
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
}

interface KnowledgeNode {
  id: string;
  title: string;
  level: number; // 0=main, 1=category, 2=concept
  category?: string;
  description?: string; // Generated on-demand
  connections: string[]; // IDs of related nodes
  importance: 'high' | 'medium' | 'low';
  userNote?: string; // User-added content
  x?: number; // Position for layout
  y?: number;
}

interface KnowledgeMap {
  title: string;
  description: string;
  nodes: KnowledgeNode[];
  edges: { from: string; to: string; type: 'hierarchy' | 'relation' }[];
  totalConcepts: number;
  categories: string[];
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'timeline' | 'knowledge-map';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
  content?: string;
}

interface SessionData {
  sources: Source[]
  outputs: Output[]
  createdAt: Date
}

// Global in-memory store
declare global {
  var quickStudySessions: Map<string, SessionData> | undefined
}

const sessions = globalThis.quickStudySessions ?? new Map<string, SessionData>()
globalThis.quickStudySessions = sessions

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    
    console.log(`🗺️ Knowledge Map generation request for session: ${sessionId}`)
    
    // Parse request body
    const body = await request.json()
    const { sourceId, settings } = body
    
    if (!sourceId) {
      return Response.json(
        { message: 'Missing sourceId' },
        { status: 400 }
      )
    }
    
    // Check if session exists
    const sessionData = sessions.get(sessionId)
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`)
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      )
    }
    
    // Find source
    const source = sessionData.sources.find(s => s.id === sourceId)
    if (!source) {
      console.log(`❌ Source not found: ${sourceId}`)
      return Response.json(
        { message: 'Source not found' },
        { status: 404 }
      )
    }
    
    if (source.status !== 'ready') {
      return Response.json(
        { message: 'Source is not ready for processing' },
        { status: 400 }
      )
    }
    
    console.log(`⚡ Processing ${source.name} (type: ${source.type}) for knowledge map`)
    
    // Generate content based on source type
    let generatedContent: string
    
    switch (source.type) {
      case 'pdf':
        case 'text':
        case 'youtube':
        case 'audio':
        case 'url':
          if (!source.knowledgeGraph) {
            return Response.json(
              { message: 'Knowledge graph is still being built. Please wait for processing to complete.' },
              { status: 400 }
            )
          }
          
          console.log(`📊 Using Knowledge Graph with ${source.knowledgeGraph.entities.size} entities for knowledge map`)
          
          // Enhanced settings for maximum nodes
          const enhancedSettings = {
            ...settings,
            maxNodes: 200, // Allow up to 200 nodes (vs default 50)
            showAllEntities: true
          }
          
          generatedContent = await generateKnowledgeMapFromGraph(
            source.knowledgeGraph, 
            enhancedSettings
          )
          break
        
      case 'docx':
        generatedContent = JSON.stringify({
          title: `Knowledge Map - ${source.name}`,
          description: "DOCX processing is not implemented yet. This is a placeholder for DOCX knowledge map generation.",
          nodes: [
            {
              id: "main",
              title: "DOCX Processing",
              level: 0,
              importance: "high",
              connections: ["features"],
              x: 0,
              y: 0
            },
            {
              id: "features",
              title: "Future Features",
              level: 1,
              category: "Development",
              importance: "medium", 
              connections: [],
              x: 200,
              y: 100
            }
          ],
          edges: [
            { from: "main", to: "features", type: "hierarchy" }
          ],
          totalConcepts: 2,
          categories: ["Development"]
        })
        break
        
      case 'image':
        generatedContent = JSON.stringify({
          title: `Knowledge Map - ${source.name}`,
          description: "Image OCR processing is not implemented yet. This is a placeholder for image knowledge map generation.",
          nodes: [
            {
              id: "main",
              title: "Image Analysis",
              level: 0,
              importance: "high",
              connections: ["ocr"],
              x: 0,
              y: 0
            },
            {
              id: "ocr",
              title: "OCR Technology",
              level: 1,
              category: "Technology",
              importance: "high",
              connections: [],
              x: 200,
              y: 100
            }
          ],
          edges: [
            { from: "main", to: "ocr", type: "hierarchy" }
          ],
          totalConcepts: 2,
          categories: ["Technology"]
        })
        break
        
      case 'audio':
        generatedContent = JSON.stringify({
          title: `Knowledge Map - ${source.name}`,
          description: "Audio transcription is not implemented yet. This is a placeholder for audio knowledge map generation.",
          nodes: [
            {
              id: "main",
              title: "Audio Processing",
              level: 0,
              importance: "high",
              connections: ["transcription"],
              x: 0,
              y: 0
            },
            {
              id: "transcription",
              title: "Speech to Text",
              level: 1,
              category: "Audio Processing",
              importance: "high",
              connections: [],
              x: 200,
              y: 100
            }
          ],
          edges: [
            { from: "main", to: "transcription", type: "hierarchy" }
          ],
          totalConcepts: 2,
          categories: ["Audio Processing"]
        })
        break
        
      case 'youtube':
        generatedContent = JSON.stringify({
          title: `Knowledge Map - ${source.name}`,
          description: "YouTube transcript processing is not implemented yet. This is a placeholder for video knowledge map generation.",
          nodes: [
            {
              id: "main",
              title: "Video Analysis",
              level: 0,
              importance: "high",
              connections: ["transcript"],
              x: 0,
              y: 0
            },
            {
              id: "transcript",
              title: "Video Transcripts",
              level: 1,
              category: "Video Processing",
              importance: "medium",
              connections: [],
              x: 200,
              y: 100
            }
          ],
          edges: [
            { from: "main", to: "transcript", type: "hierarchy" }
          ],
          totalConcepts: 2,
          categories: ["Video Processing"]
        })
        break
        
      case 'url':
        generatedContent = JSON.stringify({
          title: `Knowledge Map - ${source.name}`,
          description: "URL content extraction is not implemented yet. This is a placeholder for web content knowledge map generation.",
          nodes: [
            {
              id: "main",
              title: "Web Content",
              level: 0,
              importance: "high",
              connections: ["extraction"],
              x: 0,
              y: 0
            },
            {
              id: "extraction",
              title: "Content Extraction",
              level: 1,
              category: "Web Scraping",
              importance: "medium",
              connections: [],
              x: 200,
              y: 100
            }
          ],
          edges: [
            { from: "main", to: "extraction", type: "hierarchy" }
          ],
          totalConcepts: 2,
          categories: ["Web Scraping"]
        })
        break
        
      default:
        return Response.json(
          { message: `Unsupported source type: ${source.type}` },
          { status: 400 }
        )
    }
    
    // Parse the knowledge map content to get concept count
    let conceptCount = 0
    try {
      const mapData = JSON.parse(generatedContent)
      conceptCount = mapData.nodes?.length || 0
    } catch (e) {
      console.error("Cannot parse knowledge map content:", e)
    }
    
    // Create preview
    const preview = `${conceptCount} interactive concepts with connections`
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'knowledge-map',
      title: `Knowledge Map - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: conceptCount,
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated knowledge map: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating knowledge map:', error)
    
    return Response.json(
      { message: 'Failed to generate knowledge map' },
      { status: 500 }
    )
  }
}

// OLD CODE - usuń całą funkcję generateKnowledgeMapFromText

// NEW CODE - dodaj nową funkcję:
async function generateKnowledgeMapFromStructuredChunks(
  chunks: any[], 
  sourceName: string, 
  settings: any
): Promise<string> {
  console.log(`🗺️ Generating knowledge map from ${chunks.length} structured chunks`)
  
  try {
    const maxNodes = settings?.maxNodes || 15
    const includeConnections = settings?.includeConnections !== false
    
    // Step 1: Select most relevant chunks for knowledge mapping
    const selectedChunks = selectChunksForKnowledgeMap(chunks, maxNodes)
    console.log(`📊 Selected ${selectedChunks.length} chunks for knowledge mapping`)
    
    // Step 2: Create rich context from selected chunks
    const contextForAI = createKnowledgeMapContext(selectedChunks, sourceName)
    
    // Step 3: Generate knowledge map with full document context
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu interaktywnych map wiedzy. Masz dostęp do strukturalnych danych z całego dokumentu.

ZADANIE: Stwórz comprehensive knowledge map który reprezentuje CAŁY dokument, nie tylko fragmenty.

DANE WEJŚCIOWE:
- Masz dostęp do kluczowych idei z całego dokumentu
- Każdy chunk reprezentuje inną część/sekcję
- Twoja mapa powinna łączyć koncepty z różnych części

Format odpowiedzi - MUSI być poprawny JSON:
{
  "title": "Główny temat dokumentu",
  "description": "Krótki opis całej mapy (1 zdanie)",
  "nodes": [
    {
      "id": "unique_id",
      "title": "Nazwa konceptu (krótka, konkretna)",
      "level": 0, // 0=główny temat, 1=kategoria, 2=szczegółowy koncept
      "category": "Kategoria tematyczna",
      "importance": "high|medium|low",
      "connections": ["id1", "id2"], // powiązane koncepty
      "x": 0, // pozycja X
      "y": 0  // pozycja Y
    }
  ],
  "edges": [
    {
      "from": "parent_id",
      "to": "child_id", 
      "type": "hierarchy" // lub "relation"
    }
  ],
  "totalConcepts": ${maxNodes},
  "categories": ["Kategoria 1", "Kategoria 2"]
}

ZASADY:
- Level 0: 1 główny temat całego dokumentu
- Level 1: 3-5 kategorii głównych z różnych części dokumentu
- Level 2: 8-12 szczegółowych konceptów z całego materiału
- Połącz koncepty z różnych sekcji dokumentu
- Pokaż jak różne części dokumentu się uzupełniają`
        },
        {
          role: "user",
          content: contextForAI
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    // Validate and enhance the response
    const parsed = JSON.parse(content)
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Invalid knowledge map format generated by AI')
    }
    
    // Add unique IDs and validate structure
    parsed.nodes = parsed.nodes.map((node: any, index: number) => ({
      id: node.id || `node${index + 1}`,
      title: node.title || `Concept ${index + 1}`,
      level: Math.max(0, Math.min(2, node.level || 0)),
      category: node.category || 'General',
      importance: ['high', 'medium', 'low'].includes(node.importance) ? node.importance : 'medium',
      connections: Array.isArray(node.connections) ? node.connections : [],
      x: node.x || 0,
      y: node.y || 0
    }))
    
    // Ensure edges are valid
    if (!parsed.edges || !Array.isArray(parsed.edges)) {
      parsed.edges = []
    }
    
    const nodeIds = new Set(parsed.nodes.map((n: any) => n.id))
    parsed.edges = parsed.edges.filter((edge: any) => 
      nodeIds.has(edge.from) && nodeIds.has(edge.to)
    )
    
    // Update metadata
    parsed.totalConcepts = parsed.nodes.length
    parsed.categories = [...new Set(parsed.nodes.map((node: any) => node.category))]
    
    console.log(`✅ Knowledge map generated: ${parsed.nodes.length} nodes, ${parsed.edges.length} edges`)
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('Error generating knowledge map:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// OLD CODE - znajdź tę funkcję i zastąp:

// NEW CODE:
function selectChunksForKnowledgeMap(chunks: any[], maxNodes: number) {
  // Reduce to max 8 chunks for context to avoid JSON parsing issues
  const maxChunksForProcessing = Math.min(8, chunks.length)
  
  // Prioritize chunks with high importance and rich concepts
  const priorityChunks = chunks
    .map(chunk => ({
      ...chunk,
      score: calculateKnowledgeMapScore(chunk)
    }))
    .sort((a, b) => b.score - a.score)
  
  const selected = []
  const totalChunks = chunks.length
  
  // Always include first chunk (introduction)
  if (chunks.length > 0) {
    selected.push(priorityChunks[0])
  }
  
  // Always include last chunk (conclusion) 
  if (chunks.length > 1) {
    const lastChunk = priorityChunks.find(c => c.order === totalChunks - 1)
    if (lastChunk && !selected.find(s => s.id === lastChunk.id)) {
      selected.push(lastChunk)
    }
  }
  
  // Add high-scoring chunks from middle sections
  const remainingSlots = Math.min(maxChunksForProcessing - selected.length, priorityChunks.length - selected.length)
  const remaining = priorityChunks.filter(c => !selected.find(s => s.id === c.id))
  
  // Select chunks evenly distributed across document
  for (let i = 0; i < remainingSlots && i < remaining.length; i++) {
    // Try to get chunks from different parts of document
    const chunkIndex = Math.floor(i * remaining.length / remainingSlots)
    if (remaining[chunkIndex] && !selected.find(s => s.id === remaining[chunkIndex].id)) {
      selected.push(remaining[chunkIndex])
    }
  }
  
  const finalSelection = selected.sort((a, b) => a.order - b.order) // Restore document order
  console.log(`📊 Selected chunks from positions: ${finalSelection.map(c => c.order).join(', ')} (out of ${totalChunks - 1})`)
  
  return finalSelection
}

function calculateKnowledgeMapScore(chunk: any): number {
  let score = 0
  
  // Importance weight
  if (chunk.metadata?.importance === 'high') score += 10
  else if (chunk.metadata?.importance === 'medium') score += 5
  
  // Chunk type weight
  const chunkType = chunk.metadata?.chunkType
  if (chunkType === 'definition') score += 8
  else if (chunkType === 'introduction') score += 6
  else if (chunkType === 'conclusion') score += 6
  else if (chunkType === 'analysis') score += 4
  
  // Content richness
  score += Math.min(chunk.keyIdeas?.length || 0, 5) // Max 5 points
  score += Math.min(chunk.detailedConcepts?.length || 0, 3) // Max 3 points
  
  // Position bonus for intro and conclusion
  if (chunk.order === 0) score += 5 // Introduction bonus
  
  return score
}

// OLD CODE - usuń całą funkcję createKnowledgeMapContext

// NEW CODE:
function createKnowledgeMapContext(chunks: any[], sourceName: string): string {
  // Limit context size to avoid JSON errors
  const maxChunksForContext = Math.min(chunks.length, 8) // Reduce from 15 to 8
  const limitedChunks = chunks.slice(0, maxChunksForContext)
  
  const context = `Stwórz mapę wiedzy dla dokumentu "${sourceName}".

KLUCZOWE SEKCJE DOKUMENTU (${chunks.length} total, pokazuję ${limitedChunks.length} najważniejszych):

${limitedChunks.map((chunk, index) => {
  // Limit each chunk description to avoid overly long context
  const keyIdeas = chunk.keyIdeas?.slice(0, 3) || [] // Max 3 ideas per chunk
  const concepts = chunk.detailedConcepts?.slice(0, 2) || [] // Max 2 concepts per chunk
  
  return `
SEKCJA ${chunk.order + 1}: ${chunk.title || `Część ${chunk.order + 1}`}
Typ: ${chunk.metadata?.chunkType || 'analiza'} | Ważność: ${chunk.metadata?.importance || 'średnia'}
${chunk.metadata?.pageRange ? `Strony: ${chunk.metadata.pageRange}` : ''}

Kluczowe idee: ${keyIdeas.map((idea: string) => idea.substring(0, 100)).join(' • ')}

${concepts.length > 0 ? `Koncepty: ${concepts.map((c: any) => `${c.concept} (${c.explanation?.substring(0, 80)})`).join(' • ')}` : ''}

Streszczenie: ${chunk.summary?.substring(0, 150) || 'Brak streszczenia'}`
}).join('\n')}

${chunks.length > limitedChunks.length ? `\n[...oraz ${chunks.length - limitedChunks.length} dodatkowych sekcji]` : ''}

ZADANIE: Stwórz mapę z 12-15 węzłami reprezentującymi CAŁOŚĆ dokumentu.`

  console.log(`📏 Context size: ${context.length} chars, ~${Math.ceil(context.length / 4)} tokens`)
  
  return context
}