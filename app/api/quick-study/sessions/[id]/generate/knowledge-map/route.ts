// app/api/quick-study/sessions/[id]/generate/knowledge-map/route.ts
export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { OpenAI } from 'openai'
import { QuickStudyTextService } from '@/app/services/QuickStudyTextService'
import { Source, SessionData } from '@/app/types/QuickStudyTypes'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface KnowledgeNode {
  id: string;
  title: string; // ← Frontend oczekuje 'title' nie 'label'
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
  edges: { from: string; to: string; type: 'hierarchy' | 'relation' }[]; // ← Frontend oczekuje 'edges' nie 'connections'
  totalConcepts: number;
  categories: string[];
}

interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap' | 'knowledge-map';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
  content?: string;
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
    
    console.log(`🗺️ Enhanced Knowledge Map generation request for session: ${sessionId}`)
    
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
    
    console.log(`🤖 Processing enhanced knowledge map generation for source: ${source.name}`)
    
    // 🚀 NEW: Get processing statistics for monitoring
    const processingStats = QuickStudyTextService.getProcessingStats(source, 'concepts') // Using concepts config for knowledge maps
    console.log(`📊 Processing Stats:`, {
      textSource: processingStats.textSource,
      originalLength: processingStats.originalLength,
      processedLength: processingStats.processedLength,
      optimizationQuality: processingStats.optimizationQuality,
      recommended: processingStats.recommendedForTask
    })
    
    if (!source.extractedText) {
      return Response.json(
        { message: 'No text content available for processing' },
        { status: 400 }
      )
    }

    // 🚀 NEW: Generate enhanced knowledge map using QuickStudyTextService
    const generatedContent = await generateEnhancedKnowledgeMapFromText(source, settings)
    
    // Parse the knowledge map content to get node count
    let nodeCount = 0
    try {
      const mapData = JSON.parse(generatedContent)
      nodeCount = mapData.nodes?.length || 0
    } catch (e) {
      console.error("Cannot parse knowledge map content:", e)
      console.error("Generated content:", generatedContent.substring(0, 500) + "...")
    }
    
    // Create preview
    const preview = `${nodeCount} interactive concepts with connections`
    
    // Create output
    const output: Output = {
      id: `output-${Date.now()}`,
      type: 'knowledge-map',
      title: `Knowledge Map - ${source.name.replace(/\.[^/.]+$/, "")}`,
      preview: preview,
      status: 'ready',
      sourceId: sourceId,
      createdAt: new Date(),
      count: nodeCount,
      content: generatedContent
    }
    
    // Add to session
    sessionData.outputs.push(output)
    
    console.log(`✅ Generated enhanced knowledge map: ${output.id}`)
    console.log(`📊 Session now has ${sessionData.outputs.length} total outputs`)
    
    return Response.json(output)
    
  } catch (error) {
    console.error('❌ Error generating enhanced knowledge map:', error)
    
    return Response.json(
      { message: 'Failed to generate knowledge map' },
      { status: 500 }
    )
  }
}

// Enhanced knowledge map generation using QuickStudyTextService
async function generateEnhancedKnowledgeMapFromText(source: Source, settings: any): Promise<string> {
  console.log(`🤖 Generating enhanced AI knowledge map for: ${source.name}`)
  
  try {
    // 🚀 NEW: Create contextual system prompt using QuickStudyTextService
    const baseSystemPrompt = createKnowledgeMapSystemPrompt(source, settings)
    const enhancedSystemPrompt = QuickStudyTextService.createContextualPrompt(
      source, 
      'concepts', // Using concepts task type for knowledge maps
      baseSystemPrompt
    )
    
    // 🚀 NEW: Get optimal text for processing
    const textResult = QuickStudyTextService.getProcessingText(source, 'concepts')
    
    // Enhanced logging
    console.log(`📝 Using ${textResult.source} text for knowledge map generation:`)
    console.log(`   - Length: ${textResult.text.length.toLocaleString()} characters`)
    if (textResult.stats?.compressionRatio) {
      console.log(`   - Compression: ${(textResult.stats.compressionRatio * 100).toFixed(1)}%`)
    }
    if (textResult.stats?.keyTopics?.length) {
      console.log(`   - Key topics: ${textResult.stats.keyTopics.slice(0, 5).join(', ')}${textResult.stats.keyTopics.length > 5 ? ` (+${textResult.stats.keyTopics.length - 5} more)` : ''}`)
    }

    const complexity = settings?.complexity || 'medium' // simple, medium, detailed
    const includeConnections = settings?.includeConnections !== false // default true
    const maxNodes = settings?.maxNodes || 20

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Przeanalizuj poniższy materiał i stwórz mapę wiedzy pokazującą kluczowe pojęcia i ich powiązania.

${textResult.text}

WYMAGANIA:
- Kompleksowość: ${complexity}
- Maksymalna liczba węzłów: ${maxNodes}
- ${includeConnections ? 'Szczegółowe połączenia między pojęciami' : 'Skupienie na hierarchii pojęć'}
- Wizualna reprezentacja struktury wiedzy
- Różne poziomy ważności węzłów
- Kategorie tematyczne dla organizacji`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    let content = response.choices[0]?.message?.content || '{}'
    
    // 🔧 Clean markdown code blocks if present
    content = content.replace(/```json\s*|\s*```/g, '').trim()
    
    // Validate and enhance JSON structure
    let parsed = JSON.parse(content)
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Invalid knowledge map format generated by AI')
    }
    
    // Ensure nodes have proper structure that frontend expects
    parsed.nodes = parsed.nodes.map((node: any, index: number) => ({
      id: node.id || `node${index + 1}`,
      title: node.title || `Concept ${index + 1}`, // Frontend oczekuje 'title'
      level: Math.max(0, Math.min(2, node.level || 0)), // Clamp to 0-2
      category: node.category || 'General',
      importance: ['high', 'medium', 'low'].includes(node.importance) ? node.importance : 'medium',
      connections: Array.isArray(node.connections) ? node.connections : [],
      x: node.x || 0,
      y: node.y || 0
      // description will be generated on-demand by frontend
    }))
    
    // Ensure edges exist and are valid (frontend oczekuje 'edges' nie 'connections')
    if (!parsed.edges || !Array.isArray(parsed.edges)) {
      parsed.edges = []
    }
    
    // Validate edges reference existing nodes
    const nodeIds = new Set(parsed.nodes.map((n: any) => n.id))
    parsed.edges = parsed.edges.filter((edge: any) => 
      nodeIds.has(edge.from) && nodeIds.has(edge.to)
    ).map((edge: any) => ({
      from: edge.from,
      to: edge.to,
      type: ['hierarchy', 'relation'].includes(edge.type) ? edge.type : 'hierarchy'
    }))
    
    // Update counts and categories
    parsed.totalConcepts = parsed.nodes.length
    parsed.categories = [...new Set(parsed.nodes.map((node: any) => node.category))]
    
    console.log(`✅ Enhanced knowledge map generated successfully`)
    console.log(`   - Map created from ${textResult.source} text`)
    console.log(`   - Processing length: ${textResult.text.length} characters`)
    console.log(`   - Nodes: ${parsed.nodes.length}, Edges: ${parsed.edges.length}`)
    
    return JSON.stringify(parsed)
    
  } catch (error) {
    console.error('❌ Error generating enhanced knowledge map:', error)
    throw error
  }
}

// Create knowledge map-specific system prompt
function createKnowledgeMapSystemPrompt(source: Source, settings: any): string {
  const complexity = settings?.complexity || 'medium'
  const includeConnections = settings?.includeConnections !== false
  const maxNodes = settings?.maxNodes || 20

  return `Jesteś ekspertem w tworzeniu interaktywnych map wiedzy. Twoim zadaniem jest stworzenie strukturalnej mapy konceptów, która:

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

ZASADY TWORZENIA:
- Maksymalnie ${maxNodes} węzłów
- Level 0: 1 główny temat
- Level 1: 3-5 kategorii głównych  
- Level 2: 8-15 szczegółowych konceptów
- Importance: high = kluczowe koncepty, medium = ważne detale, low = dodatkowe info
- ${includeConnections ? 'Connections: max 3 połączenia per węzeł' : 'Minimalne connections, focus na hierarchii'}
- Tytuły: krótkie, jednoznaczne, przyjazne studentom
- Edges: hierarchy dla relacji rodzic-dziecko, relation dla powiązań tematycznych

MATERIAŁ ŹRÓDŁOWY: "${source.name}" (${source.type})
Typ pliku: ${source.type}
${source.wordCount ? `Liczba słów: ${source.wordCount.toLocaleString()}` : ''}
${source.pages ? `Liczba stron: ${source.pages}` : ''}

WAŻNE: Bazuj TYLKO na pojęciach i relacjach obecnych w dostarczonym materiale źródłowym.`
}