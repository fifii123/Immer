// app/api/quick-study/sessions/[id]/optimize-text/route.ts
import { NextRequest } from 'next/server';
import { TextOptimizationService } from '@/app/services/TextOptimizationService';

interface SessionData {
  sources: Source[]
  outputs: any[]
  createdAt: Date
}

interface Source {
  id: string;
  name: string;
  type: string;
  status: string;
  extractedText?: string;
  optimizedText?: string;
  optimizationStats?: {
    originalLength: number;
    optimizedLength: number;
    compressionRatio: number;
    processingCost: number;
    chunkCount: number;
    keyTopics: string[];
  };
}

// Global in-memory store (używamy tego samego co w upload)
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
    const sessionId = params.id;
    console.log(`🔄 Text optimization request for session: ${sessionId}`);
    
    // Sprawdź czy sesja istnieje
    const sessionData = sessions.get(sessionId);
    if (!sessionData) {
      console.log(`❌ Session not found: ${sessionId}`);
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      );
    }
    
    const { sourceId, forceReoptimize } = await request.json();
    
    // Znajdź source
    const source = sessionData.sources.find(s => s.id === sourceId);
    if (!source) {
      return Response.json(
        { message: 'Source not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź czy source ma extractedText
    if (!source.extractedText) {
      return Response.json(
        { message: 'Source has no extracted text to optimize' },
        { status: 400 }
      );
    }
    
    // Sprawdź czy już ma optymalizację (chyba że force)
    if (source.optimizedText && !forceReoptimize) {
      console.log(`✅ Source already optimized: ${source.id}`);
      return Response.json({
        message: 'Source already optimized',
        optimizedText: source.optimizedText,
        stats: source.optimizationStats
      });
    }
    
    console.log(`🔄 Starting optimization for source: ${source.name}`);
    console.log(`📊 Original text length: ${source.extractedText.length} characters`);
    
    // Rozpocznij optymalizację
    const optimizationResult = await TextOptimizationService.optimizeText(
      source.extractedText,
      source.name
    );
    
    // Zaktualizuj source
    source.optimizedText = optimizationResult.optimizedText;
    source.optimizationStats = {
      originalLength: optimizationResult.originalLength,
      optimizedLength: optimizationResult.optimizedLength,
      compressionRatio: optimizationResult.compressionRatio,
      processingCost: optimizationResult.processingCost,
      chunkCount: optimizationResult.chunkCount,
      keyTopics: optimizationResult.keyTopics
    };
    
    // Loguj rezultaty
    console.log(`✅ Optimization complete for: ${source.name}`);
    console.log(`📉 Text compressed from ${optimizationResult.originalLength} to ${optimizationResult.optimizedLength} chars`);
    console.log(`📊 Compression ratio: ${(optimizationResult.compressionRatio * 100).toFixed(1)}%`);
    console.log(`💰 Processing cost: $${optimizationResult.processingCost.toFixed(4)}`);
    console.log(`🎯 Key topics: ${optimizationResult.keyTopics.join(', ')}`);
    
    return Response.json({
      message: 'Text optimization completed successfully',
      optimizedText: optimizationResult.optimizedText,
      stats: {
        originalLength: optimizationResult.originalLength,
        optimizedLength: optimizationResult.optimizedLength,
        compressionRatio: optimizationResult.compressionRatio,
        processingCost: optimizationResult.processingCost,
        chunkCount: optimizationResult.chunkCount,
        keyTopics: optimizationResult.keyTopics,
        savingsEstimate: this.calculateSavingsEstimate(optimizationResult)
      }
    });
    
  } catch (error) {
    console.error('❌ Error optimizing text:', error);
    return Response.json(
      { message: 'Failed to optimize text', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint do sprawdzenia statusu optymalizacji
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const sessionData = sessions.get(sessionId);
    
    if (!sessionData) {
      return Response.json(
        { message: 'Session not found' },
        { status: 404 }
      );
    }
    
    const optimizationStatus = sessionData.sources.map(source => ({
      id: source.id,
      name: source.name,
      hasOriginalText: !!source.extractedText,
      hasOptimizedText: !!source.optimizedText,
      originalLength: source.extractedText?.length || 0,
      optimizedLength: source.optimizedText?.length || 0,
      compressionRatio: source.optimizationStats?.compressionRatio,
      processingCost: source.optimizationStats?.processingCost,
      keyTopics: source.optimizationStats?.keyTopics
    }));
    
    const totalStats = {
      totalSources: sessionData.sources.length,
      optimizedSources: optimizationStatus.filter(s => s.hasOptimizedText).length,
      totalOriginalLength: optimizationStatus.reduce((sum, s) => sum + s.originalLength, 0),
      totalOptimizedLength: optimizationStatus.reduce((sum, s) => sum + s.optimizedLength, 0),
      totalProcessingCost: optimizationStatus.reduce((sum, s) => sum + (s.processingCost || 0), 0)
    };
    
    return Response.json({
      sessionId,
      totalStats,
      sources: optimizationStatus
    });
    
  } catch (error) {
    console.error('❌ Error getting optimization status:', error);
    return Response.json(
      { message: 'Failed to get optimization status' },
      { status: 500 }
    );
  }
}

// Funkcja pomocnicza do kalkulacji oszczędności
function calculateSavingsEstimate(optimizationResult: any): any {
  const originalTokens = Math.ceil(optimizationResult.originalLength / 4);
  const optimizedTokens = Math.ceil(optimizationResult.optimizedLength / 4);
  
  // Oszacuj oszczędności dla typowych operacji
  const operations = {
    'Summary Generation': { inputCost: 0.001, outputCost: 0.002, avgOutputTokens: 500 },
    'Quiz Generation': { inputCost: 0.001, outputCost: 0.002, avgOutputTokens: 800 },
    'Note Generation': { inputCost: 0.001, outputCost: 0.002, avgOutputTokens: 1200 }
  };
  
  const savings = Object.entries(operations).map(([operation, costs]) => {
    const originalCost = (originalTokens / 1000) * costs.inputCost + (costs.avgOutputTokens / 1000) * costs.outputCost;
    const optimizedCost = (optimizedTokens / 1000) * costs.inputCost + (costs.avgOutputTokens / 1000) * costs.outputCost;
    const savings = originalCost - optimizedCost;
    const savingsPercentage = (savings / originalCost) * 100;
    
    return {
      operation,
      originalCost: parseFloat(originalCost.toFixed(6)),
      optimizedCost: parseFloat(optimizedCost.toFixed(6)),
      savings: parseFloat(savings.toFixed(6)),
      savingsPercentage: parseFloat(savingsPercentage.toFixed(1))
    };
  });
  
  return {
    perOperation: savings,
    totalPotentialSavings: savings.reduce((sum, s) => sum + s.savings, 0)
  };
}