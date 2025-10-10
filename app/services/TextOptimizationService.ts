// app/services/TextOptimizationService.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface OptimizationResult {
  optimizedText: string;
  originalLength: number;
  optimizedLength: number;
  compressionRatio: number;
  processingCost: number;
  chunkCount: number;
  processedChunks: number; // NEW: actual chunks processed vs total
  keyTopics: string[];
  processingStats: ProcessingStats;
  strategy: 'raw' | 'full' | 'sampled'; // NEW: which strategy was used
}

interface ProcessingStats {
  totalRetries: number;
  failedChunks: number;
  avgCharsPerChunk: number;
  compressionEfficiency: number;
  processingTime: number; // NEW: actual processing time
  samplingRatio?: number; // NEW: for sampled strategy
}

interface CleanKnowledge {
  concepts: ConceptEntry[];
  facts: FactEntry[];
  examples: ExampleEntry[];
}

interface ConceptEntry {
  term: string;
  definition: string;
}

interface FactEntry {
  statement: string;
  source: string;
}

interface ExampleEntry {
  concept: string;
  example: string;
}

interface ContentPatterns {
  hasEquations: boolean;
  hasNumericalData: boolean;
  hasStructuredLists: boolean;
  hasQuotesRefs: boolean;
  hasTabularData: boolean;
  hasDefinitions: boolean;
  hasSequences: boolean;
  hasComparisons: boolean;
}

interface CompressedKnowledge {
  c: [string, string][];
  f: [string, string][];
  e: [string, string][];
}

interface ChunkRank {
  index: number;
  chunk: string;
  score: number;
  reasons: string[];
}

export class TextOptimizationService {
  private static readonly SMALL_THRESHOLD = 15000; // ~15k chars
  private static readonly LARGE_THRESHOLD = 100000; // ~100k chars
  private static readonly MAX_PROCESSING_TIME = 20000; // 20 seconds
  private static readonly MAX_PARALLEL_REQUESTS = 4; // OpenAI rate limit friendly
  
  static async optimizeText(text: string, fileName: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalLength = text.length;
    
    console.log(`🔄 Starting size-aware optimization for: ${fileName}`);
    console.log(`📊 Original text length: ${originalLength} characters`);
    
    try {
      // Determine strategy based on size
      const strategy = this.determineStrategy(originalLength);
      console.log(`🎯 Selected strategy: ${strategy}`);
      
      let result: OptimizationResult;
      
      switch (strategy) {
        case 'raw':
          result = await this.processRawText(text, fileName, startTime);
          break;
        case 'full':
          result = await this.processFullText(text, fileName, startTime);
          break;
        case 'sampled':
          result = await this.processSampledText(text, fileName, startTime);
          break;
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      throw error;
    }
  }
  
  private static determineStrategy(textLength: number): 'raw' | 'full' | 'sampled' {
    if (textLength <= this.SMALL_THRESHOLD) {
      return 'raw';
    } else if (textLength <= this.LARGE_THRESHOLD) {
      return 'full';
    } else {
      return 'sampled';
    }
  }
  
  // Strategy 1: Raw Text (No AI Processing)
  private static async processRawText(text: string, fileName: string, startTime: number): Promise<OptimizationResult> {
    console.log(`📄 Processing as raw text - no AI optimization needed`);
    
    const processingTime = Date.now() - startTime;
    
    return {
      optimizedText: text, // Return original text
      originalLength: text.length,
      optimizedLength: text.length,
      compressionRatio: 1.0, // No compression
      processingCost: 0, // No API cost
      chunkCount: 0,
      processedChunks: 0,
      keyTopics: [], // Could extract simple keywords if needed
      strategy: 'raw',
      processingStats: {
        totalRetries: 0,
        failedChunks: 0,
        avgCharsPerChunk: 0,
        compressionEfficiency: 0,
        processingTime
      }
    };
  }
  
  // Strategy 2: Full Processing (Current Approach)
  private static async processFullText(text: string, fileName: string, startTime: number): Promise<OptimizationResult> {
    console.log(`🔄 Processing with full optimization`);
    
    // Current implementation - process all chunks
    const contentPatterns = this.analyzeContentPatterns(text);
    const chunks = this.chunkTextWithContext(text, 15000);
    
    const { knowledgeChunks, stats } = await this.processChunksWithAdaptivePrompts(chunks, contentPatterns);
    const mergedKnowledge = this.mergeAndDeduplicateKnowledge(knowledgeChunks);
    const enhancedKnowledge = this.enhanceWithPatternDetection(mergedKnowledge, text, contentPatterns);
    
    const compressedText = this.compressKnowledge(enhancedKnowledge);
    const keyTopics = this.extractKeyTopics(enhancedKnowledge);
    
    const processingTime = Date.now() - startTime;
    const processingCost = this.calculateProcessingCost(text.length, chunks.length, stats.totalRetries);
    
    return {
      optimizedText: compressedText,
      originalLength: text.length,
      optimizedLength: compressedText.length,
      compressionRatio: compressedText.length / text.length,
      processingCost,
      chunkCount: chunks.length,
      processedChunks: chunks.length,
      keyTopics,
      strategy: 'full',
      processingStats: {
        ...stats,
        avgCharsPerChunk: chunks.reduce((sum, chunk) => sum + chunk.length, 0) / chunks.length,
        compressionEfficiency: (1 - (compressedText.length / text.length)) * 100,
        processingTime
      }
    };
  }
  
  // Strategy 3: Sampled Processing (NEW)
  private static async processSampledText(text: string, fileName: string, startTime: number): Promise<OptimizationResult> {
    console.log(`🎯 Processing with intelligent sampling`);
    
    const contentPatterns = this.analyzeContentPatterns(text);
    
    // Create smaller chunks for better coverage
    const chunks = this.chunkTextWithContext(text, 8000); // Smaller chunks for large files
    console.log(`📦 Created ${chunks.length} smaller chunks for sampling`);
    
    // Rank chunks by importance
    const rankedChunks = this.rankChunks(chunks, contentPatterns);
    
    // Calculate how many chunks we can process in time budget
    const maxChunksInBudget = this.calculateMaxChunks(chunks.length);
    const selectedChunks = rankedChunks.slice(0, maxChunksInBudget);
    
    console.log(`🔍 Selected ${selectedChunks.length}/${chunks.length} chunks (${(selectedChunks.length/chunks.length*100).toFixed(1)}%)`);
    console.log(`📊 Selection reasons: ${this.summarizeSelectionReasons(selectedChunks)}`);
    
    // Process selected chunks in parallel
    const { knowledgeChunks, stats } = await this.processChunksInParallel(
      selectedChunks.map(rc => rc.chunk), 
      contentPatterns,
      startTime
    );
    
    // Backend merging (no AI cost)
    const mergedKnowledge = this.mergeAndDeduplicateKnowledge(knowledgeChunks);
    const enhancedKnowledge = this.enhanceWithPatternDetection(mergedKnowledge, text, contentPatterns);
    
    const compressedText = this.compressKnowledge(enhancedKnowledge);
    const keyTopics = this.extractKeyTopics(enhancedKnowledge);
    
    const processingTime = Date.now() - startTime;
    const processingCost = this.calculateProcessingCost(
      selectedChunks.reduce((sum, rc) => sum + rc.chunk.length, 0), 
      selectedChunks.length, 
      stats.totalRetries
    );
    
    return {
      optimizedText: compressedText,
      originalLength: text.length,
      optimizedLength: compressedText.length,
      compressionRatio: compressedText.length / text.length,
      processingCost,
      chunkCount: chunks.length,
      processedChunks: selectedChunks.length,
      keyTopics,
      strategy: 'sampled',
      processingStats: {
        ...stats,
        avgCharsPerChunk: selectedChunks.reduce((sum, rc) => sum + rc.chunk.length, 0) / selectedChunks.length,
        compressionEfficiency: (1 - (compressedText.length / text.length)) * 100,
        processingTime,
        samplingRatio: selectedChunks.length / chunks.length
      }
    };
  }
  
  // NEW: Intelligent Chunk Ranking
  private static rankChunks(chunks: string[], patterns: ContentPatterns): ChunkRank[] {
    return chunks.map((chunk, index) => {
      let score = 0;
      const reasons: string[] = [];
      
      // Position-based scoring (beginning and end are important)
      if (index === 0) {
        score += 15;
        reasons.push('introduction');
      }
      if (index === chunks.length - 1) {
        score += 10;
        reasons.push('conclusion');
      }
      
      // Content pattern scoring
      if (patterns.hasEquations && /[a-zA-Z]\s*[=:]\s*/.test(chunk)) {
        score += 12;
        reasons.push('equations');
      }
      
      if (patterns.hasDefinitions && /(?:definicj[aąę]|definition|oznacza|means)/i.test(chunk)) {
        score += 10;
        reasons.push('definitions');
      }
      
      if (patterns.hasNumericalData && /\d+[%°]|\d+\.\d+/.test(chunk)) {
        score += 8;
        reasons.push('numerical-data');
      }
      
      if (patterns.hasStructuredLists && /^\s*[\d]+[\.\)]\s/m.test(chunk)) {
        score += 6;
        reasons.push('structured-lists');
      }
      
      if (patterns.hasQuotesRefs && /["„"''][^"„"'']*["„"'']/.test(chunk)) {
        score += 5;
        reasons.push('quotes-refs');
      }
      
      // Content density scoring
      const uniqueWords = new Set(chunk.toLowerCase().match(/\b\w+\b/g) || []);
      const density = uniqueWords.size / (chunk.length / 100); // unique words per 100 chars
      score += Math.min(density * 2, 10); // Cap at 10 points
      
      if (density > 8) reasons.push('high-density');
      
      // Length scoring (prefer medium-length chunks)
      const idealLength = 8000;
      const lengthScore = 5 - Math.abs(chunk.length - idealLength) / 2000;
      score += Math.max(lengthScore, 0);
      
      return {
        index,
        chunk,
        score: Math.round(score * 10) / 10,
        reasons
      };
    }).sort((a, b) => b.score - a.score);
  }
  
  // NEW: Calculate max chunks within time budget
  private static calculateMaxChunks(totalChunks: number): number {
    // Estimate: ~3-4 seconds per chunk with parallel processing
    const timePerChunk = 3500; // milliseconds
    const availableTime = this.MAX_PROCESSING_TIME - 2000; // Reserve 2s for overhead
    
    const maxByTime = Math.floor(availableTime / timePerChunk * this.MAX_PARALLEL_REQUESTS);
    const maxByRatio = Math.ceil(totalChunks * 0.3); // Max 30% of chunks
    const minChunks = Math.min(5, totalChunks); // At least 5 chunks if available
    
    return Math.max(minChunks, Math.min(maxByTime, maxByRatio));
  }
  
  // NEW: Parallel Processing with Time Budget
  private static async processChunksInParallel(
    chunks: string[], 
    patterns: ContentPatterns,
    startTime: number
  ): Promise<{
    knowledgeChunks: CleanKnowledge[],
    stats: { totalRetries: number, failedChunks: number }
  }> {
    const results: CleanKnowledge[] = [];
    let totalRetries = 0;
    let failedChunks = 0;
    
    const dynamicPrompt = this.buildAdaptivePrompt(patterns);
    
    // Process chunks in parallel batches
    const batchSize = this.MAX_PARALLEL_REQUESTS;
    const batches: string[][] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }
    
    console.log(`🔄 Processing ${chunks.length} chunks in ${batches.length} parallel batches`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Check time budget
      const elapsed = Date.now() - startTime;
      if (elapsed > this.MAX_PROCESSING_TIME - 5000) { // Leave 5s buffer
        console.log(`⏰ Time budget exceeded, stopping at batch ${batchIndex + 1}/${batches.length}`);
        break;
      }
      
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (chunk, indexInBatch) => {
        const globalIndex = batchIndex * batchSize + indexInBatch;
        return this.processChunkWithRetry(chunk, globalIndex, dynamicPrompt);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results
      batchResults.forEach((result, indexInBatch) => {
        const globalIndex = batchIndex * batchSize + indexInBatch;
        
        if (result.status === 'fulfilled') {
          results.push(result.value.knowledge);
          totalRetries += result.value.retries;
        } else {
          console.error(`❌ Chunk ${globalIndex + 1} failed:`, result.reason);
          failedChunks++;
          results.push(this.createEnhancedFallback(batch[indexInBatch], globalIndex));
        }
      });
      
      // Small delay between batches to be nice to API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return {
      knowledgeChunks: results,
      stats: { totalRetries, failedChunks }
    };
  }
  
  // NEW: Single chunk processing with retry logic
  private static async processChunkWithRetry(
    chunk: string, 
    chunkIndex: number, 
    dynamicPrompt: string
  ): Promise<{ knowledge: CleanKnowledge, retries: number }> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const knowledge = await this.extractAdaptiveKnowledge(chunk, chunkIndex, dynamicPrompt);
        return { knowledge, retries };
      } catch (error: any) {
        retries++;
        console.warn(`⚠️ Chunk ${chunkIndex + 1} failed attempt ${retries}:`, error.message);
        
        if (retries < maxRetries) {
          // Progressive backoff
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }
    }
    
    throw new Error(`Chunk ${chunkIndex + 1} failed after ${maxRetries} retries`);
  }
  
  // NEW: Summarize selection reasons for logging
  private static summarizeSelectionReasons(selectedChunks: ChunkRank[]): string {
    const reasonCounts = new Map<string, number>();
    
    selectedChunks.forEach(chunk => {
      chunk.reasons.forEach(reason => {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      });
    });
    
    return Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => `${reason}(${count})`)
      .join(', ');
  }
  
  // === EXISTING METHODS (keeping them as they are) ===
  
  private static chunkTextWithContext(text: string, maxCharEstimate: number): string[] {
    const chunks: string[] = [];
    
    // Smart paragraph detection with multiple patterns
    const paragraphs = text.split(/(\n\s*\n|\n(?=[A-Z][^a-z]*[A-Z])\s*|\n(?=\d+\.)\s*)/)
      .filter(p => p.trim().length > 10);
    
    let currentChunk = '';
    let currentCharCount = 0;
    
    for (const para of paragraphs) {
      const paraCharCount = para.length;
      
      // Check if adding this paragraph exceeds limit
      if (currentCharCount + paraCharCount > maxCharEstimate && currentChunk) {
        // Add context overlap from previous chunk
        const overlap = this.extractContextOverlap(currentChunk);
        chunks.push(currentChunk);
        currentChunk = overlap + '\n\n' + para;
        currentCharCount = currentChunk.length;
      } else {
        const separator = currentChunk ? '\n\n' : '';
        currentChunk += separator + para;
        currentCharCount += paraCharCount;
      }
      
      // Emergency split for oversized paragraphs
      if (currentCharCount > maxCharEstimate * 1.2) {
        const sentences = currentChunk.split(/(?<=[.!?])\s+/);
        let tempChunk = '';
        let tempChars = 0;
        
        for (const sentence of sentences) {
          const sentenceChars = sentence.length;
          if (tempChars + sentenceChars > maxCharEstimate && tempChunk) {
            chunks.push(tempChunk.trim());
            tempChunk = sentence;
            tempChars = sentenceChars;
          } else {
            tempChunk += (tempChunk ? ' ' : '') + sentence;
            tempChars += sentenceChars;
          }
        }
        
        currentChunk = tempChunk;
        currentCharCount = tempChars;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    console.log(`✅ Created ${chunks.length} character-aware chunks with context overlap`);
    return chunks;
  }
  
  private static extractContextOverlap(chunk: string): string {
    // Extract last 2-3 sentences as context for next chunk
    const sentences = chunk.split(/(?<=[.!?])\s+/);
    const contextSentences = sentences.slice(-2);
    return contextSentences.join(' ').substring(0, 200);
  }
  
  private static analyzeContentPatterns(text: string): ContentPatterns {
    return {
      // Equations/Formulas: any "X = Y" or "X oznacza Y" structures
      hasEquations: /[a-zA-Z]\s*[=:]\s*[^=\n]{3,}|[a-zA-Z]+\s+(?:oznacza|means|is|equals|to)\s+/i.test(text),
      
      // Numerical data: percentages, measurements, calculations
      hasNumericalData: /\d+[%°]|\d+\s*[+\-*/=]\s*\d+|\d+\.\d+|\d+\s*(?:kg|cm|m|l|€|$|zł)/i.test(text),
      
      // Structured lists: numbered or bulleted items
      hasStructuredLists: /^\s*[\d]+[\.\)]\s|^\s*[•\-\*]\s|^\s*[a-zA-Z][\.\)]\s/m.test(text),
      
      // Quotes and references: citations, quoted material
      hasQuotesRefs: /["„"''][^"„"'']*["„"'']|\[[0-9]+\]|\([0-9]{4}\)|(?:według|according|źródło|source|cytuje)/i.test(text),
      
      // Tabular data: table-like structures
      hasTabularData: /\|[^|]*\|[^|]*\||^\s*\w+\s+\w+\s+\w+\s*$/m.test(text) || /\n\s*\d+\s+\d+\s+\d+/.test(text),
      
      // Formal definitions: definition markers
      hasDefinitions: /(?:definicj[aąę]|definition|definiuje|oznacza|to znaczy|jest to|means)\s/i.test(text),
      
      // Sequential content: step-by-step procedures
      hasSequences: /(?:krok|step|etap|faza|następnie|then|dalej|next|po czym|after)\s/i.test(text),
      
      // Comparisons: comparative structures  
      hasComparisons: /(?:w porównaniu|compared to|versus|vs|różnica|difference|podobnie|similarly)\s/i.test(text)
    };
  }
  
  private static async processChunksWithAdaptivePrompts(
    chunks: string[], 
    patterns: ContentPatterns
  ): Promise<{
    knowledgeChunks: CleanKnowledge[],
    stats: { totalRetries: number, failedChunks: number }
  }> {
    const results: CleanKnowledge[] = [];
    let totalRetries = 0;
    let failedChunks = 0;
    
    // Generate dynamic prompt based on detected patterns
    const dynamicPrompt = this.buildAdaptivePrompt(patterns);
    
    for (let i = 0; i < chunks.length; i++) {
      let retries = 0;
      let success = false;
      const maxRetries = 3;
      
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
      
      while (retries < maxRetries && !success) {
        try {
          const result = await this.extractAdaptiveKnowledge(chunks[i], i, dynamicPrompt);
          results.push(result);
          success = true;
          
          if (retries > 0) {
            console.log(`✅ Chunk ${i + 1} succeeded on retry ${retries}`);
          }
        } catch (error: any) {
          retries++;
          totalRetries++;
          
          console.warn(`⚠️ Chunk ${i + 1} failed attempt ${retries}:`, error.message);
          
          if (retries >= maxRetries) {
            console.error(`❌ Chunk ${i + 1} failed after ${maxRetries} retries`);
            failedChunks++;
            results.push(this.createEnhancedFallback(chunks[i], i));
          } else {
            // Progressive backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }
      
      // Rate limiting between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return {
      knowledgeChunks: results,
      stats: { totalRetries, failedChunks }
    };
  }
  
  private static buildAdaptivePrompt(patterns: ContentPatterns): string {
    let prompt = `Extract knowledge in JSON format. Base rules:

CONCEPTS - Extract key terms with exact definitions:
- Important terms, specialized vocabulary, key entities
- Definitions must be verbatim from text (no interpretation)

FACTS - Extract specific factual statements:
- Concrete claims, assertions, important information
- Source must be exact quote from text (5-9 words)

EXAMPLES - Extract concrete instances:
- Specific cases, applications, illustrations
- Must include actual details from text

OUTPUT: {"concepts": [{"term": "...", "definition": "..."}], "facts": [{"statement": "...", "source": "..."}], "examples": [{"concept": "...", "example": "..."}]}`;

    // Add pattern-specific instructions dynamically
    const activePatterns: string[] = [];
    
    if (patterns.hasEquations) {
      activePatterns.push("PRESERVE all equations, formulas, and mathematical expressions exactly as written");
    }
    
    if (patterns.hasNumericalData) {
      activePatterns.push("INCLUDE all numerical values, percentages, measurements, and calculations with exact numbers");
    }
    
    if (patterns.hasTabularData) {
      activePatterns.push("EXTRACT table data with complete numerical information and structure");
    }
    
    if (patterns.hasDefinitions) {
      activePatterns.push("CAPTURE all formal definitions with complete technical language");
    }
    
    if (patterns.hasSequences) {
      activePatterns.push("PRESERVE step-by-step procedures and sequential information in order");
    }
    
    if (patterns.hasQuotesRefs) {
      activePatterns.push("MAINTAIN exact quotes and reference information");
    }
    
    if (patterns.hasComparisons) {
      activePatterns.push("INCLUDE comparative information and differences between entities");
    }
    
    if (activePatterns.length > 0) {
      prompt += `\n\nSPECIAL FOCUS for this content:\n- ${activePatterns.join('\n- ')}`;
    }
    
    prompt += `\n\nCRITICAL: Preserve exact wording, maintain technical precision, include all important details.`;
    
    return prompt;
  }
  
  private static async extractAdaptiveKnowledge(chunk: string, chunkIndex: number, dynamicPrompt: string): Promise<CleanKnowledge> {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: dynamicPrompt },
        { role: "user", content: `Extract knowledge from:\n\n${chunk}` }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content generated');

    try {
      const parsed = JSON.parse(content);
      const validated = this.validateKnowledgeStructure(parsed);
      
      console.log(`✅ Chunk ${chunkIndex + 1}: extracted ${validated.concepts.length}c, ${validated.facts.length}f, ${validated.examples.length}e`);
      return validated;
      
    } catch (error) {
      throw new Error(`JSON parsing failed for chunk ${chunkIndex + 1}: ${error}`);
    }
  }
  
  private static enhanceWithPatternDetection(
    knowledge: CleanKnowledge, 
    originalText: string, 
    patterns: ContentPatterns
  ): CleanKnowledge {
    const enhanced = { ...knowledge };
    
    // Only enhance if AI missed obvious patterns
    if (patterns.hasEquations && enhanced.facts.length < 3) {
      const equations = this.extractEquations(originalText);
      equations.forEach(eq => {
        enhanced.facts.push({
          statement: `Formula: ${eq}`,
          source: eq.substring(0, 40)
        });
      });
    }
    
    if (patterns.hasNumericalData && enhanced.examples.length < 2) {
      const numericalExamples = this.extractNumericalExamples(originalText);
      numericalExamples.forEach(ex => {
        enhanced.examples.push({
          concept: "Numerical data",
          example: ex
        });
      });
    }
    
    if (patterns.hasDefinitions && enhanced.concepts.length < 3) {
      const definitions = this.extractDefinitions(originalText);
      definitions.forEach(def => {
        enhanced.concepts.push(def);
      });
    }
    
    return enhanced;
  }
  
  private static extractEquations(text: string): string[] {
    const equations = text.match(/[a-zA-Z]\s*[=:]\s*[^=\n]{3,50}/g) || [];
    return equations.slice(0, 3);
  }
  
  private static extractNumericalExamples(text: string): string[] {
    const examples = text.match(/\d+[%°]|\d+\s*[+\-*/=]\s*\d+[\d\s=+\-*/]*|\d+\.\d+\s*[a-zA-Z]{1,4}/g) || [];
    return examples.slice(0, 5);
  }
  
  private static extractDefinitions(text: string): ConceptEntry[] {
    const defPattern = /([A-Z][a-zA-Z\s]{2,25})\s+(?:oznacza|means|is|jest to|to)\s+([^.!?]{10,100})[.!?]/gi;
    const definitions: ConceptEntry[] = [];
    
    let match;
    while ((match = defPattern.exec(text)) !== null && definitions.length < 3) {
      definitions.push({
        term: match[1].trim(),
        definition: match[2].trim()
      });
    }
    
    return definitions;
  }
  
  private static validateKnowledgeStructure(parsed: any): CleanKnowledge {
    return {
      concepts: (parsed.concepts || [])
        .filter((c: any) => c.term && c.definition && typeof c.term === 'string' && typeof c.definition === 'string')
        .slice(0, 20),
      facts: (parsed.facts || [])
        .filter((f: any) => f.statement && f.source && typeof f.statement === 'string' && typeof f.source === 'string')
        .slice(0, 25),
      examples: (parsed.examples || [])
        .filter((e: any) => e.concept && e.example && typeof e.concept === 'string' && typeof e.example === 'string')
        .slice(0, 15)
    };
  }
  
  private static createEnhancedFallback(chunk: string, chunkIndex: number): CleanKnowledge {
    console.log(`🔧 Creating enhanced fallback for chunk ${chunkIndex + 1}`);
    
    const sentences = chunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    const conceptMatches = [
      ...chunk.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [],
      ...chunk.match(/["„"'']([^"„"'']+)["„"'']/g) || []
    ];
    const uniqueConcepts = [...new Set(conceptMatches)].slice(0, 5);
    
    const factualSentences = sentences.filter(s => 
      /\d+|(?:według|according|research|study|analysis)/i.test(s)
    ).slice(0, 3);
    
    const exampleSentences = sentences.filter(s =>
      /(?:przykład|example|np\.|e\.g\.|for instance|such as)/i.test(s)
    ).slice(0, 3);
    
    return {
      concepts: uniqueConcepts.map((term, i) => ({
        term: term.replace(/["„"'']/g, ''),
        definition: sentences[i] || `Context definition for ${term}`
      })),
      facts: factualSentences.map((fact, i) => ({
        statement: fact.trim(),
        source: fact.substring(0, 40).trim()
      })),
      examples: exampleSentences.map((example, i) => ({
        concept: uniqueConcepts[i] || `Topic ${i + 1}`,
        example: example.trim()
      }))
    };
  }
  
  private static mergeAndDeduplicateKnowledge(chunks: CleanKnowledge[]): CleanKnowledge {
    console.log(`🔗 Merging ${chunks.length} knowledge chunks`);
    
    const allConcepts = chunks.flatMap(c => c.concepts);
    const allFacts = chunks.flatMap(c => c.facts);
    const allExamples = chunks.flatMap(c => c.examples);
    
    const conceptMap = new Map<string, ConceptEntry>();
    allConcepts.forEach(concept => {
      const key = concept.term.toLowerCase().trim();
      const existing = conceptMap.get(key);
      
      if (!existing || concept.definition.length > existing.definition.length) {
        conceptMap.set(key, concept);
      }
    });
    
    const factMap = new Map<string, FactEntry>();
    allFacts.forEach(fact => {
      const key = fact.statement.toLowerCase().replace(/\d+/g, 'NUM').substring(0, 50);
      const existing = factMap.get(key);
      
      if (!existing || fact.source.length > existing.source.length) {
        factMap.set(key, fact);
      }
    });
    
    const exampleMap = new Map<string, ExampleEntry>();
    allExamples.forEach(example => {
      const key = `${example.concept.toLowerCase()}-${example.example.substring(0, 30).toLowerCase()}`;
      if (!exampleMap.has(key)) {
        exampleMap.set(key, example);
      }
    });
    
    const merged = {
      concepts: Array.from(conceptMap.values()).slice(0, 100),
      facts: Array.from(factMap.values()).slice(0, 150),
      examples: Array.from(exampleMap.values()).slice(0, 75)
    };
    
    console.log(`🔗 Merged and deduplicated: ${merged.concepts.length}c, ${merged.facts.length}f, ${merged.examples.length}e`);
    return merged;
  }
  
  private static compressKnowledge(knowledge: CleanKnowledge): string {
    const readable = {
      concepts: knowledge.concepts,
      facts: knowledge.facts,
      examples: knowledge.examples,
      meta: {
        totalConcepts: knowledge.concepts.length,
        totalFacts: knowledge.facts.length,
        totalExamples: knowledge.examples.length,
        extractedAt: new Date().toISOString()
      }
    };
    
    return JSON.stringify(readable, null, 2);
  }
  
  private static extractKeyTopics(knowledge: CleanKnowledge): string[] {
    const topics = new Set<string>();
    
    knowledge.concepts.forEach(c => {
      if (c.term.length < 50) topics.add(c.term);
    });
    
    knowledge.facts.forEach(f => {
      const words = f.statement.split(' ').filter(w => 
        w.length > 3 && 
        /^[A-Z]/.test(w) && 
        !['The', 'This', 'That', 'When', 'Where'].includes(w)
      );
      words.slice(0, 2).forEach(w => topics.add(w));
    });
    
    return Array.from(topics).slice(0, 20);
  }
  
  private static calculateProcessingCost(originalLength: number, chunkCount: number, retries: number): number {
    const estimatedInputTokens = Math.ceil(originalLength / 4);
    const outputTokensPerChunk = 400;
    const totalOutputTokens = (chunkCount + retries) * outputTokensPerChunk;
    
    const inputCost = (estimatedInputTokens / 1000) * 0.001;
    const outputCost = (totalOutputTokens / 1000) * 0.002;
    
    return inputCost + outputCost;
  }
  
  static decompressKnowledge(compressedText: string): CleanKnowledge {
    try {
      const parsed = JSON.parse(compressedText);
      
      if (parsed.c && parsed.f && parsed.e) {
        return {
          concepts: parsed.c.map(([term, definition]: [string, string]) => ({ term, definition })),
          facts: parsed.f.map(([statement, source]: [string, string]) => ({ statement, source })),
          examples: parsed.e.map(([concept, example]: [string, string]) => ({ concept, example }))
        };
      } else if (parsed.concepts && parsed.facts && parsed.examples) {
        return {
          concepts: parsed.concepts,
          facts: parsed.facts,
          examples: parsed.examples
        };
      } else {
        throw new Error('Invalid compressed knowledge format');
      }
    } catch (error) {
      throw new Error(`Failed to decompress knowledge: ${error}`);
    }
  }
}