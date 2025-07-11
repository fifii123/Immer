"use client"

import React, { useState, useEffect, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
  MarkerType,
  Handle,
  Position
} from 'reactflow'
import 'reactflow/dist/style.css'

import { 
  Network, 
  Eye,
  Lightbulb,
  Edit3,
  Target,
  Star,
  TrendingUp,
  Calendar,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  BookOpen,
  RotateCcw,
  Maximize2,
  Minimize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"


// Types
interface KnowledgeNode {
  id: string;
  title: string;
  level: number;
  category?: string;
  description?: string;
  connections: string[];
  importance: 'high' | 'medium' | 'low';
  userNote?: string;
  x?: number;
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
  type: string;
  title: string;
  content?: string;
  sourceId: string;
  createdAt: Date;
}

interface KnowledgeMapViewerProps {
  output: Output | null;
  selectedSource: any;
}

// System pozycjonowania z wykrywaniem kolizji
interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Sprawdź czy dwa prostokąty kolidują
function checkCollision(bounds1: NodeBounds, bounds2: NodeBounds, margin = 20): boolean {
  return !(bounds1.x + bounds1.width + margin < bounds2.x || 
           bounds2.x + bounds2.width + margin < bounds1.x || 
           bounds1.y + bounds1.height + margin < bounds2.y || 
           bounds2.y + bounds2.height + margin < bounds1.y);
}

// Uzyskaj rozmiary węzła na podstawie poziomu
function getNodeDimensions(level: number): { width: number; height: number } {
  switch (level) {
    case 0: return { width: 220, height: 90 }  // Root node
    case 1: return { width: 180, height: 70 }  // Category
    case 2: return { width: 160, height: 60 }  // Concept
    default: return { width: 140, height: 50 } // Leaf
  }
}

// Ulepszona funkcja pozycjonowania z wykrywaniem kolizji
function calculateChildPositions(
  parentPos: { x: number; y: number }, 
  childCount: number, 
  level: number,
  occupiedPositions: Map<string, NodeBounds>
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const horizontalSpacing = 500 // Zmniejszone dla playground
  const verticalSpacing = 120   // Zmniejszone dla playground
  const childDimensions = getNodeDimensions(level)

  
  // Początkowae pozycje (bez kolizji)
  let initialPositions: { x: number; y: number }[] = []
  
  if (childCount === 1) {
    initialPositions = [{
      x: parentPos.x + horizontalSpacing,
      y: parentPos.y
    }]
  } else {
    // Rozmieść dzieci wokół pozycji rodzica
    const totalHeight = Math.max(0, (childCount - 1) * verticalSpacing)
    const startY = parentPos.y - totalHeight / 2
    
    for (let i = 0; i < childCount; i++) {
      initialPositions.push({
        x: parentPos.x + horizontalSpacing,
        y: startY + i * verticalSpacing
      })
    }
  }
  
  // Sprawdź kolizje i dostosuj pozycje
  for (let i = 0; i < initialPositions.length; i++) {
    let candidatePos = initialPositions[i]
    let adjusted = false
    
    // Sprawdź kolizje z istniejącymi węzłami
    for (const [nodeId, bounds] of occupiedPositions) {
      const candidateBounds: NodeBounds = {
        x: candidatePos.x,
        y: candidatePos.y,
        width: childDimensions.width,
        height: childDimensions.height
      }
      
      if (checkCollision(candidateBounds, bounds)) {
        // Kolizja! Przesuń w dół
        candidatePos.y = bounds.y + bounds.height + 40
        adjusted = true
      }
    }
    
    // Sprawdź kolizje z już umieszczonymi dziećmi w tej iteracji
    for (let j = 0; j < i; j++) {
      const siblingBounds: NodeBounds = {
        x: positions[j].x,
        y: positions[j].y,
        width: childDimensions.width,
        height: childDimensions.height
      }
      
      const candidateBounds: NodeBounds = {
        x: candidatePos.x,
        y: candidatePos.y,
        width: childDimensions.width,
        height: childDimensions.height
      }
      
      if (checkCollision(candidateBounds, siblingBounds)) {
        candidatePos.y = siblingBounds.y + siblingBounds.height + 40
        adjusted = true
      }
    }
    
    positions.push(candidatePos)
  }
  
  return positions
}

// Custom Node Component
const KnowledgeNodeComponent = ({ data, selected }: { data: any; selected: boolean }) => {
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
      case 'medium': return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
      case 'low': return 'border-gray-400 bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100'
      default: return 'border-gray-300'
    }
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return <Star className="h-3 w-3" />
      case 'medium': return <TrendingUp className="h-3 w-3" />
      case 'low': return <Calendar className="h-3 w-3" />
      default: return null
    }
  }

  const getLevelStyle = (level: number) => {
    switch (level) {
      case 0: return 'text-lg font-bold min-w-[220px] min-h-[90px] text-center'
      case 1: return 'text-base font-semibold min-w-[180px] min-h-[70px] text-center'
      case 2: return 'text-sm font-medium min-w-[160px] min-h-[60px] text-center'
      default: return 'text-sm min-w-[140px] min-h-[50px] text-center'
    }
  }

  const hasChildren = data.hasChildren
  const isExpanded = data.isExpanded

  return (
    <div 
      className={`
        px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl
        ${getImportanceColor(data.importance)}
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${getLevelStyle(data.level)}
        flex flex-col items-center justify-center relative
      `}
      onClick={data.onNodeClick}
    >
      {/* Connection handles for ReactFlow */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      
      <div className="flex items-center gap-2 mb-1">
        {getImportanceIcon(data.importance)}
        <span className="font-medium">{data.title}</span>
        {hasChildren && (
          <div className="ml-1">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      {data.category && data.level > 0 && (
        <Badge variant="secondary" className="text-xs">
          {data.category}
        </Badge>
      )}
      
      {/* Expand indicator */}
      {hasChildren && !isExpanded && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-md">
          <span className="text-xs text-white font-bold">+</span>
        </div>
      )}
      
      {/* Expanded indicator */}
      {hasChildren && isExpanded && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
          <span className="text-xs text-white font-bold">−</span>
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  'knowledge-node': KnowledgeNodeComponent,
}

// Main Component
function KnowledgeMapViewerInner({ output, selectedSource }: KnowledgeMapViewerProps) {
  const { toast } = useToast()
  const { fitView } = useReactFlow()
  
  // Map data
  const [mapData, setMapData] = useState<KnowledgeMap | null>(null)
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  
  // Expansion state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [generatingDescription, setGeneratingDescription] = useState<string | null>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  // Parse map content on mount and create initial view
  useEffect(() => {
    if (!output?.content) return
    
    try {
      const parsed = JSON.parse(output.content)
      setMapData(parsed)
      
      // Find root node (level 0)
      const rootNode = parsed.nodes.find((node: KnowledgeNode) => node.level === 0)
      if (!rootNode) {
        toast({
          title: "Error",
          description: "No root node found in knowledge map",
          variant: "destructive"
        })
        return
      }
      
      // Start with just the root node positioned to the left
      const initialNodes: Node[] = [{
        id: rootNode.id,
        type: 'knowledge-node',
        position: { x: -200, y: 0 }, // Start more to the left for expansion space
        data: {
          ...rootNode,
          hasChildren: getChildren(rootNode.id, parsed.nodes, parsed.edges).length > 0,
          isExpanded: false,
          onNodeClick: () => handleNodeClick(rootNode)
        },
        draggable: false,
      }]
      
      setNodes(initialNodes)
      setEdges([])
      
      // Auto-fit view
      setTimeout(() => fitView({ padding: 0.2 }))
      
    } catch (error) {
      console.error('Failed to parse knowledge map content:', error)
      toast({
        title: "Error",
        description: "Failed to load knowledge map content",
        variant: "destructive"
      })
    }
  }, [output, fitView, toast])

  // Get children of a node
  const getChildren = (nodeId: string, allNodes: KnowledgeNode[], allEdges: any[]) => {
    const childIds = allEdges
      .filter(edge => edge.from === nodeId && edge.type === 'hierarchy')
      .map(edge => edge.to)
    
    return allNodes.filter(node => childIds.includes(node.id))
  }

  // Handle node click - expand/collapse or select
  const handleNodeClick = useCallback((node: KnowledgeNode) => {
    if (!mapData) return
    
    const children = getChildren(node.id, mapData.nodes, mapData.edges)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    
    if (hasChildren) {
      // Toggle expansion
      const newExpandedNodes = new Set(expandedNodes)
      
      if (isExpanded) {
        // Collapse: remove this node and all its descendants from expanded set
        const collapseRecursively = (nodeId: string) => {
          newExpandedNodes.delete(nodeId)
          const nodeChildren = getChildren(nodeId, mapData.nodes, mapData.edges)
          nodeChildren.forEach(child => collapseRecursively(child.id))
        }
        collapseRecursively(node.id)
      } else {
        // Expand: add to expanded set
        newExpandedNodes.add(node.id)
      }
      
      setExpandedNodes(newExpandedNodes)
      updateNodesAndEdges(newExpandedNodes)
    }
    
    // Always set as selected to show info in top panel
    setSelectedNode(node)
  }, [mapData, expandedNodes])

  // Update visible nodes and edges based on expansion state
  const updateNodesAndEdges = useCallback((newExpandedNodes: Set<string>) => {
    if (!mapData) return
    
    const visibleNodes = new Set<string>()
    const visibleEdges: Edge[] = []
    
    // Start with root node
    const rootNode = mapData.nodes.find(node => node.level === 0)
    if (!rootNode) return
    
    visibleNodes.add(rootNode.id)
    
    // BFS to find all visible nodes
    const queue: { nodeId: string; position: { x: number; y: number } }[] = [
      { nodeId: rootNode.id, position: { x: -200, y: 0 } } // Start position consistent with initial
    ]
    const processedNodes = new Map<string, NodeBounds>()
    const rootDimensions = getNodeDimensions(0)
    processedNodes.set(rootNode.id, { 
      x: -200, 
      y: 0, 
      width: rootDimensions.width, 
      height: rootDimensions.height 
    })
    
    while (queue.length > 0) {
      const { nodeId, position } = queue.shift()!
      
      if (newExpandedNodes.has(nodeId)) {
        const children = getChildren(nodeId, mapData.nodes, mapData.edges)
        const childPositions = calculateChildPositions(
          position, 
          children.length, 
          children[0]?.level || 1, 
          processedNodes
        )
        
        children.forEach((child, index) => {
          if (!visibleNodes.has(child.id)) {
            visibleNodes.add(child.id)
            const childPos = childPositions[index]
            const childDimensions = getNodeDimensions(child.level)
            processedNodes.set(child.id, {
              x: childPos.x,
              y: childPos.y,
              width: childDimensions.width,
              height: childDimensions.height
            })
            queue.push({ nodeId: child.id, position: childPos })
            
            // Add edge from parent to child
            visibleEdges.push({
              id: `edge-${nodeId}-${child.id}`,
              source: nodeId,
              target: child.id,
              type: 'straight',
              style: { 
                stroke: '#3b82f6', 
                strokeWidth: 2,
                strokeDasharray: 'none'
              },
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#3b82f6',
              }
            })
          }
        })
      }
    }
    
    // Create ReactFlow nodes
    const flowNodes: Node[] = Array.from(visibleNodes).map(nodeId => {
      const node = mapData.nodes.find(n => n.id === nodeId)!
      const bounds = processedNodes.get(nodeId)!
      const position = { x: bounds.x, y: bounds.y }
      const children = getChildren(nodeId, mapData.nodes, mapData.edges)
      
      return {
        id: nodeId,
        type: 'knowledge-node',
        position,
        data: {
          ...node,
          hasChildren: children.length > 0,
          isExpanded: newExpandedNodes.has(nodeId),
          onNodeClick: () => handleNodeClick(node)
        },
        draggable: false,
      }
    })
    
    setNodes(flowNodes)
    setEdges(visibleEdges)
    
    // Auto-fit view after update
    setTimeout(() => fitView({ padding: 0.2 }))
  }, [mapData, handleNodeClick, fitView])

  // Update when expanded nodes change
  useEffect(() => {
    updateNodesAndEdges(expandedNodes)
  }, [expandedNodes, updateNodesAndEdges])

  // Generate description for node
  const generateDescription = async (nodeId: string) => {
    setGeneratingDescription(nodeId)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const descriptions = [
        "A fundamental concept that forms the foundation of understanding in this domain.",
        "An important element that connects to multiple other concepts in the knowledge structure.",
        "A specific implementation or example that demonstrates the practical application of broader principles.",
        "A key milestone or event that significantly influenced the development of this field."
      ]
      
      const mockDescription = descriptions[Math.floor(Math.random() * descriptions.length)]
      
      // Update mapData with description
      if (mapData) {
        const updatedNodes = mapData.nodes.map(node => 
          node.id === nodeId ? { ...node, description: mockDescription } : node
        )
        setMapData({ ...mapData, nodes: updatedNodes })
      }
      
      if (selectedNode?.id === nodeId) {
        setSelectedNode(prev => prev ? { ...prev, description: mockDescription } : null)
      }
      
      toast({
        title: "Description generated!",
        description: "AI has analyzed this concept and provided an explanation."
      })
      
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Unable to generate description. Please try again.",
        variant: "destructive"
      })
    } finally {
      setGeneratingDescription(null)
    }
  }

  // Reset to initial view
  const resetView = useCallback(() => {
    setExpandedNodes(new Set())
    setSelectedNode(null)
    updateNodesAndEdges(new Set())
  }, [updateNodesAndEdges])

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!mapData) return
    
    const allNodeIds = new Set(mapData.nodes.map(node => node.id))
    setExpandedNodes(allNodeIds)
  }, [mapData])

  if (!output || !mapData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <Network className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            Knowledge Map not available
          </h3>
          <p className="text-sm text-muted-foreground">
            Unable to load knowledge map content
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950"
      >
        <Background color="#94a3b8" size={1} />
        <Controls className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />

{/* Top Panel with Controls and Selected Node Info - Collapsible */}
<Panel position="top-left" className="m-2">
  <div className="relative">
    {/* Collapsed state - tylko przycisk */}
    {panelCollapsed && (
      <div className="flex items-center justify-center">
        <Button
          variant="default"
          size="sm"
          onClick={() => setPanelCollapsed(false)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg rounded-xl px-3 py-2 flex items-center gap-2"
          title="Expand panel"
        >
          <Network className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    )}

    {/* Expanded state - pełny panel */}
    {!panelCollapsed && (
      <Card className="shadow-lg max-w-2xl relative">
        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPanelCollapsed(true)}
          className="absolute top-2 right-2 z-10 hover:bg-accent rounded-lg p-1.5"
          title="Collapse panel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>

        <CardHeader className="pb-2 px-3 py-2 pr-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">{mapData.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetView}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Selected Node Info */}
          {selectedNode ? (
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center gap-2 mb-2">
                {selectedNode.importance === 'high' && <Star className="h-3 w-3 text-amber-500" />}
                {selectedNode.importance === 'medium' && <TrendingUp className="h-3 w-3 text-blue-500" />}
                {selectedNode.importance === 'low' && <Calendar className="h-3 w-3 text-gray-500" />}
                <span className="text-sm font-medium">{selectedNode.title}</span>
                {selectedNode.category && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {selectedNode.category}
                  </Badge>
                )}
              </div>
              
              {selectedNode.description ? (
                <p className="text-xs text-muted-foreground mb-2">
                  {selectedNode.description}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateDescription(selectedNode.id)}
                    disabled={generatingDescription === selectedNode.id}
                    className="h-6 text-xs px-2"
                  >
                    {generatingDescription === selectedNode.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Generate Description
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click on nodes to expand and see details</p>
          )}
        </CardHeader>
      </Card>
    )}
  </div>
</Panel>

{/* Legend - przeniesiona na prawy dolny róg */}
<Panel position="bottom-right" className="m-2 mr-20">
  <Card className="shadow-lg">
    <CardContent className="p-2">
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-blue-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span>Low</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">+</span>
          </div>
          <span>Expandable</span>
        </div>
      </div>
    </CardContent>
  </Card>
</Panel>
      </ReactFlow>
    </div>
  )
}

// Main wrapper component with ReactFlowProvider
export default function KnowledgeMapViewer(props: KnowledgeMapViewerProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeMapViewerInner {...props} />
    </ReactFlowProvider>
  )
}