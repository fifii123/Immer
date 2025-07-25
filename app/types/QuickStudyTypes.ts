// app/types/QuickStudyTypes.ts

export interface Source {
  id: string;
  name: string;
  type: 'pdf' | 'youtube' | 'text' | 'docx' | 'image' | 'audio' | 'url';
  status: 'ready' | 'processing' | 'error';
  size?: string;
  duration?: string;
  pages?: number;
  extractedText?: string;
  optimizedText?: string;
  wordCount?: number;
  processingError?: string;
  subtype?: string;
  metadata?: {
    processingMethod?: string;
    confidence?: number;
    language?: string;
    apiCost?: number;
  };
  optimizationStats?: {
    originalLength: number;
    optimizedLength: number;
    compressionRatio: number;
    processingCost: number;
    chunkCount: number;
    processedChunks: number;
    keyTopics: string[];
    strategy: 'raw' | 'full' | 'sampled';
    processingStats: {
      totalRetries: number;
      failedChunks: number;
      avgCharsPerChunk: number;
      compressionEfficiency: number;
      processingTime: number;
      samplingRatio?: number;
    };
    optimizedAt: Date;
    processingTimeMs: number;
  };
}

export interface Output {
  id: string;
  type: 'flashcards' | 'quiz' | 'notes' | 'summary' | 'concepts' | 'mindmap';
  title: string;
  preview: string;
  status: 'ready' | 'generating' | 'error';
  sourceId: string;
  createdAt: Date;
  count?: number;
  content?: string;
}

export interface SessionData {
  sources: Source[]
  outputs: Output[]
  createdAt: Date
}