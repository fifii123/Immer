export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'

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
        if (!source.extractedText) {
          return Response.json(
            { message: 'No text content available for processing' },
            { status: 400 }
          )
        }
        generatedContent = await generateKnowledgeMapFromText(source.extractedText, source.name, settings)
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

// Generate knowledge map from text using AI
async function generateKnowledgeMapFromText(extractedText: string, sourceName: string, settings: any): Promise<string> {
  console.log(`🤖 Generating AI knowledge map for: ${sourceName}`)
  
  try {
    const maxNodes = settings?.maxNodes || 15
    const includeConnections = settings?.includeConnections !== false // default true
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `Jesteś ekspertem w tworzeniu interaktywnych map wiedzy. Twoim zadaniem jest stworzenie strukturalnej mapy konceptów, która:

1. Identyfikuje główne tematy i ich hierarchię (3 poziomy max)
2. Tworzy logiczne połączenia między konceptami  
3. Skupia się na STRUKTURZE nie na szczegółowych opisach
4. Nadaje każdemu konceptowi odpowiednią wagę (importance)
5. Grupuje powiązane koncepty w kategorie

WAŻNE: To jest mapa STRUKTURALNA - nie generuj opisów, tylko tytuły i relacje!

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
      "x": 0, // pozycja X (opcjonalna)
      "y": 0  // pozycja Y (opcjonalna)
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

Zasady:
- Maksymalnie ${maxNodes} węzłów
- Level 0: 1 główny temat
- Level 1: 3-5 kategorii głównych  
- Level 2: 8-12 szczegółowych konceptów
- Importance: high = kluczowe koncepty, medium = ważne detale, low = dodatkowe info
- Connections: max 3 połączenia per węzeł
- Tytuły: krótkie, jednoznaczne, przyjazne studentom`
        },
        {
          role: "user",
          content: `Stwórz strukturalną mapę wiedzy na podstawie poniższego tekstu. Skup się na hierarchii konceptów i ich relacjach.

${includeConnections ? 'Uwzględnij połączenia między powiązanymi konceptami.' : 'Skup się głównie na hierarchii.'}

Materiał z "${sourceName}":
${extractedText.slice(0, 12000)}`
        }
      ],
      temperature: 0.3, // Lower for more structured output
      max_tokens: 2500,
      response_format: { type: "json_object" }
    })
    
    const content = response.choices[0].message.content
    
    if (!content) {
      throw new Error('No content generated by AI')
    }
    
    // Validate JSON structure
    const parsed = JSON.parse(content)
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Invalid knowledge map format generated by AI')
    }
    
    // Ensure nodes have proper IDs and structure
    parsed.nodes = parsed.nodes.map((node: any, index: number) => ({
      id: node.id || `node${index + 1}`,
      title: node.title || `Concept ${index + 1}`,
      level: Math.max(0, Math.min(2, node.level || 0)), // Clamp to 0-2
      category: node.category || 'General',
      importance: ['high', 'medium', 'low'].includes(node.importance) ? node.importance : 'medium',
      connections: Array.isArray(node.connections) ? node.connections : [],
      x: node.x || 0,
      y: node.y || 0
    }))
    
    // Ensure edges exist and are valid
    if (!parsed.edges || !Array.isArray(parsed.edges)) {
      parsed.edges = []
    }
    
    // Validate edges reference existing nodes
    const nodeIds = new Set(parsed.nodes.map((n: any) => n.id))
    parsed.edges = parsed.edges.filter((edge: any) => 
      nodeIds.has(edge.from) && nodeIds.has(edge.to)
    )
    
    // Update counts and categories
    parsed.totalConcepts = parsed.nodes.length
    parsed.categories = [...new Set(parsed.nodes.map((node: any) => node.category))]
    
    console.log(`✅ AI knowledge map generated successfully with ${parsed.nodes.length} nodes and ${parsed.edges.length} edges`)
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('Error generating knowledge map with AI:', error)
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}