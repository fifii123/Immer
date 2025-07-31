// app/services/MinimalContextService.ts
export interface DocumentStructure {
  sections: Array<{
    id: string
    title: string
    level: number
    startIndex: number
    endIndex: number
  }>
}

export interface EditContext {
  documentStructure: string     // Formatted hierarchy
  editedFragment: string        // The actual fragment being edited
  currentSectionContent: string // Full content of the section containing the fragment
  fragmentPositionInSection: {
    beforeFragment: string      // Content before fragment within current section
    afterFragment: string       // Content after fragment within current section
    percentPosition: number     // 0-100% position within section
    paragraphIndex: number      // Which paragraph/element in section (0-based)
    totalParagraphs: number     // Total paragraphs in section
  }
  precedingSection?: string     // Content of section above
  followingSection?: string     // Content of section below
  fragmentPosition: {
    sectionTitle: string
    sectionLevel: number
    indexInDocument: number
    totalSections: number
  }
  // NEW: Enhanced context for intelligent editing
  editingContext: {
    fragmentType: 'section_header' | 'full_section' | 'paragraph' | 'list_item' | 'definition' | 'formula' | 'sentence_fragment'
    suggestedDetailLevel: 'micro' | 'focused' | 'expanded' | 'comprehensive'
    styleContext: {
      isMathematical: boolean
      isListBased: boolean
      isDefinitionHeavy: boolean
      toneLevel: 'academic' | 'casual' | 'technical'
    }
    structuralConstraints: {
      maxHeaderLevel: number  // Based on current section level
      preserveFormat: boolean
      allowNewSections: boolean
    }
  }
}

export class MinimalContextService {
  
  /**
   * Extract minimal but complete context for AI editing
   * ENHANCED: Now with intelligent editing context
   */
  static getEditContext(fragment: string, fullDocument: string): EditContext {
    console.log(`🎯 Extracting intelligent edit context for fragment (${fragment.length} chars)`)
    
    // 1. Parse document structure (headers only)
    const structure = this.parseDocumentStructure(fullDocument)
    console.log(`📊 Found ${structure.sections.length} sections in document`)
    
    // 2. Find which section contains the fragment
    const fragmentStart = this.findFragmentInDocument(fragment, fullDocument)
    if (fragmentStart === -1) {
      throw new Error('Could not locate fragment in document')
    }
    
    const containingSection = structure.sections.find(section =>
      fragmentStart >= section.startIndex && fragmentStart <= section.endIndex
    )
    
    if (!containingSection) {
      throw new Error('Could not locate fragment in document structure')
    }
    
    console.log(`📍 Fragment located in section: "${containingSection.title}" (level ${containingSection.level})`)
    
    // 3. Get current section content and fragment position within it
    const currentSectionContent = this.getSectionContent(containingSection, fullDocument)
    const fragmentPositionInSection = this.getFragmentPositionInSection(
      fragment, 
      currentSectionContent, 
      containingSection
    )
    
    // 4. Get neighboring sections
    const sectionIndex = structure.sections.indexOf(containingSection)
    const precedingSection = sectionIndex > 0 ? structure.sections[sectionIndex - 1] : null
    const followingSection = sectionIndex < structure.sections.length - 1 ? structure.sections[sectionIndex + 1] : null
    
    // 5. Handle edge cases (first/last section) - get two neighbors when possible
    let precedingContent: string | undefined
    let followingContent: string | undefined
    
    if (precedingSection && followingSection) {
      // Normal case: one above, one below
      precedingContent = this.getSectionContent(precedingSection, fullDocument)
      followingContent = this.getSectionContent(followingSection, fullDocument)
    } else if (!precedingSection && followingSection) {
      // First section: take next two sections
      followingContent = this.getSectionContent(followingSection, fullDocument)
      const nextSection = structure.sections[sectionIndex + 2]
      if (nextSection) {
        followingContent += '\n\n---\n\n' + this.getSectionContent(nextSection, fullDocument)
      }
    } else if (precedingSection && !followingSection) {
      // Last section: take previous two sections  
      precedingContent = this.getSectionContent(precedingSection, fullDocument)
      const prevPrevSection = structure.sections[sectionIndex - 2]
      if (prevPrevSection) {
        precedingContent = this.getSectionContent(prevPrevSection, fullDocument) + '\n\n---\n\n' + precedingContent
      }
    }
    
    // 6. Format document structure for AI
    const documentStructure = this.formatDocumentStructure(structure)
    
    // 7. NEW: Analyze editing context for intelligent behavior
    const editingContext = this.analyzeEditingContext(
      fragment, 
      currentSectionContent, 
      containingSection,
      fragmentPositionInSection,
      fullDocument
    )
    
    console.log(`🔍 DETAILED EDITING CONTEXT ANALYSIS:`)
    console.log(`   - Fragment type: ${editingContext.fragmentType}`)
    console.log(`   - Detail level: ${editingContext.suggestedDetailLevel}`)
    console.log(`   - Style context:`, editingContext.styleContext)
    console.log(`   - Structural constraints:`, editingContext.structuralConstraints)
    console.log(`   - Fragment analysis:`)
    console.log(`     * Length: ${fragment.length} chars`)
    console.log(`     * Word count: ${fragment.trim().split(/\s+/).length} words`)
    console.log(`     * Ends with colon: ${fragment.trim().endsWith(':')}`)
    console.log(`     * Ends with punctuation: ${/[,:;]\s*$/.test(fragment.trim())}`)
    console.log(`     * Is incomplete sentence: ${fragment.trim().split(/[.!?]/).length === 1}`)
    console.log(`   - Position in section:`)
    console.log(`     * Percent: ${fragmentPositionInSection.percentPosition}%`)
    console.log(`     * Paragraph: ${fragmentPositionInSection.paragraphIndex + 1}/${fragmentPositionInSection.totalParagraphs}`)
    console.log(`     * Has content after: ${!!fragmentPositionInSection.afterFragment}`)
    console.log(`     * Content after preview: "${fragmentPositionInSection.afterFragment.substring(0, 100)}${fragmentPositionInSection.afterFragment.length > 100 ? '...' : ''}"`)
    
    const context: EditContext = {
      documentStructure,
      editedFragment: fragment,
      currentSectionContent,
      fragmentPositionInSection,
      precedingSection: precedingContent,
      followingSection: followingContent,
      fragmentPosition: {
        sectionTitle: containingSection.title,
        sectionLevel: containingSection.level,
        indexInDocument: sectionIndex,
        totalSections: structure.sections.length
      },
      editingContext
    }
    
    console.log(`✅ Intelligent context extracted:`)
    console.log(`   - Fragment type: ${editingContext.fragmentType}`)
    console.log(`   - Suggested detail level: ${editingContext.suggestedDetailLevel}`)
    console.log(`   - Style: ${editingContext.styleContext.toneLevel} (math: ${editingContext.styleContext.isMathematical})`)
    console.log(`   - Constraints: max header ${editingContext.structuralConstraints.maxHeaderLevel}, preserve format: ${editingContext.structuralConstraints.preserveFormat}`)
    
    return context
  }

  /**
   * NEW: Extract context using element ID and parsed document structure
   * MUCH MORE RELIABLE than text search!
   */
  static getEditContextByElementId(
    elementId: string,
    parsedSections: any[], // ParsedSection[] from NotesViewer
    fullDocument: string
  ): EditContext {
    console.log(`🎯 Extracting context by elementId: ${elementId}`)
    
    // 1. Find element in parsed structure using existing findElementById logic
    const foundElement = this.findElementInParsedSections(parsedSections, elementId)
    if (!foundElement) {
      throw new Error(`Could not locate element with ID: ${elementId}`)
    }
    
    console.log(`📍 Element found: type=${foundElement.type}, content="${foundElement.content.substring(0, 100)}..."`)
    
    // 2. Get section information
    const containingSection = foundElement.parentSection || foundElement.section
    if (!containingSection) {
      throw new Error('Could not determine containing section')
    }
    
    console.log(`📍 Containing section: "${containingSection.title}" (level ${containingSection.level})`)
    
    // 3. Build context from parsed structure
    const { beforeFragment, afterFragment } = this.getFragmentContext(foundElement, containingSection)
    const { precedingSection, followingSection } = this.getNeighboringSections(containingSection, parsedSections)
    
    // 4. Analyze editing context
    const editingContext = this.analyzeEditingContext(
      foundElement.content,
      this.sectionToMarkdown(containingSection),
      { title: containingSection.title, level: containingSection.level } as any,
      { 
        beforeFragment, 
        afterFragment, 
        percentPosition: this.calculatePercentPosition(foundElement, containingSection),
        paragraphIndex: this.calculateParagraphIndex(foundElement, containingSection),
        totalParagraphs: containingSection.content.length
      },
      fullDocument
    )
    
    console.log(`🔍 ELEMENT-BASED CONTEXT ANALYSIS:`)
    console.log(`   - Element type: ${foundElement.type}`)
    console.log(`   - Fragment type: ${editingContext.fragmentType}`)
    console.log(`   - Detail level: ${editingContext.suggestedDetailLevel}`)
    console.log(`   - Section: "${containingSection.title}" (${containingSection.level})`)
    console.log(`   - Has content before: ${!!beforeFragment}`)
    console.log(`   - Has content after: ${!!afterFragment}`)
    
    return {
      documentStructure: this.formatParsedSectionsStructure(parsedSections),
      editedFragment: foundElement.content,
      currentSectionContent: this.sectionToMarkdown(containingSection),
      fragmentPositionInSection: {
        beforeFragment: beforeFragment || '',
        afterFragment: afterFragment || '',
        percentPosition: this.calculatePercentPosition(foundElement, containingSection),
        paragraphIndex: this.calculateParagraphIndex(foundElement, containingSection),
        totalParagraphs: containingSection.content.length
      },
      precedingSection: precedingSection ? this.sectionToMarkdown(precedingSection) : undefined,
      followingSection: followingSection ? this.sectionToMarkdown(followingSection) : undefined,
      fragmentPosition: {
        sectionTitle: containingSection.title,
        sectionLevel: containingSection.level,
        indexInDocument: this.getSectionIndex(containingSection, parsedSections),
        totalSections: this.countTotalSections(parsedSections)
      },
      editingContext
    }
  }

  /**
   * Helper: Find element in parsed sections (similar to NotesViewer logic)
   */
  private static findElementInParsedSections(sections: any[], elementId: string): {
    type: 'section' | 'content',
    content: string,
    section?: any,
    parentSection?: any,
    contentItem?: any
  } | null {
    
    const searchInSection = (section: any, parentSection?: any): any => {
      // Check if this section matches
      if (section.id === elementId) {
        return {
          type: 'section',
          content: `# ${section.title}`,
          section: section,
          parentSection: parentSection
        }
      }
      
      // Check content items in this section
      for (const contentItem of section.content || []) {
        if (contentItem.id === elementId) {
          return {
            type: 'content',
            content: contentItem.content,
            contentItem: contentItem,
            parentSection: section
          }
        }
      }
      
      // Check children sections
      for (const childSection of section.children || []) {
        const result = searchInSection(childSection, section)
        if (result) return result
      }
      
      return null
    }
    
    for (const section of sections) {
      const result = searchInSection(section)
      if (result) return result
    }
    
    return null
  }

  /**
   * Helper: Get content before and after the fragment within its section
   */
  private static getFragmentContext(foundElement: any, containingSection: any): {
    beforeFragment: string,
    afterFragment: string
  } {
    if (foundElement.type === 'section') {
      // For sections, there's no before/after within the section itself
      return { beforeFragment: '', afterFragment: '' }
    }
    
    // For content items, find position within section's content array
    const contentItems = containingSection.content || []
    const elementIndex = contentItems.findIndex((item: any) => item.id === foundElement.contentItem.id)
    
    if (elementIndex === -1) {
      return { beforeFragment: '', afterFragment: '' }
    }
    
    const beforeItems = contentItems.slice(0, elementIndex)
    const afterItems = contentItems.slice(elementIndex + 1)
    
    const beforeFragment = beforeItems.map((item: any) => item.content).join('\n\n')
    const afterFragment = afterItems.map((item: any) => item.content).join('\n\n')
    
    return { beforeFragment, afterFragment }
  }

  /**
   * Helper: Get neighboring sections  
   */
  private static getNeighboringSections(targetSection: any, allSections: any[]): {
    precedingSection?: any,
    followingSection?: any
  } {
    const flatSections = this.flattenSections(allSections)
    const sectionIndex = flatSections.findIndex(section => section.id === targetSection.id)
    
    if (sectionIndex === -1) {
      return {}
    }
    
    return {
      precedingSection: sectionIndex > 0 ? flatSections[sectionIndex - 1] : undefined,
      followingSection: sectionIndex < flatSections.length - 1 ? flatSections[sectionIndex + 1] : undefined
    }
  }

  /**
   * Helper: Flatten nested sections into array
   */
  private static flattenSections(sections: any[]): any[] {
    const flattened: any[] = []
    
    const addSection = (section: any) => {
      flattened.push(section)
      for (const child of section.children || []) {
        addSection(child)
      }
    }
    
    for (const section of sections) {
      addSection(section)
    }
    
    return flattened
  }

  /**
   * Helper: Convert section to markdown
   */
  private static sectionToMarkdown(section: any): string {
    let markdown = `${'#'.repeat(section.level)} ${section.title}\n\n`
    
    for (const contentItem of section.content || []) {
      if (contentItem.content.trim()) {
        markdown += contentItem.content + '\n\n'
      }
    }
    
    return markdown.trim()
  }

  /**
   * Helper: Calculate element position within section
   */
  private static calculatePercentPosition(foundElement: any, containingSection: any): number {
    if (foundElement.type === 'section') return 0
    
    const contentItems = containingSection.content || []
    const elementIndex = contentItems.findIndex((item: any) => item.id === foundElement.contentItem.id)
    
    if (elementIndex === -1 || contentItems.length === 0) return 0
    
    return Math.round((elementIndex / contentItems.length) * 100)
  }

  /**
   * Helper: Calculate paragraph index
   */
  private static calculateParagraphIndex(foundElement: any, containingSection: any): number {
    if (foundElement.type === 'section') return 0
    
    const contentItems = containingSection.content || []
    const elementIndex = contentItems.findIndex((item: any) => item.id === foundElement.contentItem.id)
    
    return Math.max(0, elementIndex)
  }

  /**
   * Helper: Get section index in document
   */
  private static getSectionIndex(targetSection: any, allSections: any[]): number {
    const flatSections = this.flattenSections(allSections)
    return flatSections.findIndex(section => section.id === targetSection.id)
  }

  /**
   * Helper: Count total sections
   */
  private static countTotalSections(allSections: any[]): number {
    return this.flattenSections(allSections).length
  }

  /**
   * Helper: Format document structure from parsed sections
   */
  private static formatParsedSectionsStructure(sections: any[]): string {
    const formatSection = (section: any, indent: string = ''): string => {
      let result = `${indent}${section.level}. ${section.title}\n`
      for (const child of section.children || []) {
        result += formatSection(child, indent + '  ')
      }
      return result
    }
    
    return sections.map(section => formatSection(section)).join('')
  }

  /**
   * NEW: Analyze editing context to determine intelligent behavior
   */
  private static analyzeEditingContext(
    fragment: string,
    sectionContent: string,
    section: DocumentStructure['sections'][0],
    positionInSection: EditContext['fragmentPositionInSection'],
    fullDocument: string
  ): EditContext['editingContext'] {
    
    // Detect fragment type
    const fragmentType = this.detectFragmentType(fragment, sectionContent, positionInSection)
    
    // Suggest detail level based on fragment size and context
    const suggestedDetailLevel = this.suggestDetailLevel(fragment, fragmentType, sectionContent)
    
    // Analyze style context
    const styleContext = this.analyzeStyleContext(sectionContent, fullDocument)
    
    // Determine structural constraints
    const structuralConstraints = this.determineStructuralConstraints(fragmentType, section)
    
    return {
      fragmentType,
      suggestedDetailLevel,
      styleContext,
      structuralConstraints
    }
  }

  /**
   * NEW: Detect what type of content fragment we're editing
   */
  private static detectFragmentType(
    fragment: string,
    sectionContent: string,
    position: EditContext['fragmentPositionInSection']
  ): EditContext['editingContext']['fragmentType'] {
    
    const trimmedFragment = fragment.trim()
    console.log(`🔍 Fragment detection for: "${trimmedFragment}" (${trimmedFragment.length} chars)`)
    
    // Check if it's a section header
    if (trimmedFragment.match(/^#{1,6}\s+/)) {
      console.log(`   → Detected: section_header`)
      return 'section_header'
    }
    
    // Check if it's the entire section (fragment is 80%+ of section)
    const fragmentRatio = fragment.length / sectionContent.length
    if (fragmentRatio > 0.8) {
      console.log(`   → Detected: full_section (${Math.round(fragmentRatio * 100)}% of section)`)
      return 'full_section'
    }
    
    // Check if it's a list item
    if (trimmedFragment.match(/^[-*+]\s+/) || trimmedFragment.match(/^\d+\.\s+/)) {
      console.log(`   → Detected: list_item`)
      return 'list_item'
    }
    
    // Check if it's a definition (contains colon, followed by explanation)
    if (trimmedFragment.match(/.*:\s*\$?.*\$?\s*$/)) {
      console.log(`   → Detected: definition (contains colon)`)
      return 'definition'
    }
    
    // Check if it's a formula (contains LaTeX or mathematical notation)
    if (trimmedFragment.match(/\$.*\$/) || trimmedFragment.match(/\\[a-zA-Z]+/) || trimmedFragment.match(/[∑∫∂∇αβγδε]/)) {
      console.log(`   → Detected: formula (mathematical content)`)
      return 'formula'
    }
    
    // Check if it's a sentence fragment (incomplete sentence, ends with colon, comma, etc.)
    if (trimmedFragment.match(/[,:;]\s*$/) || trimmedFragment.split(/[.!?]/).length === 1) {
      console.log(`   → Detected: sentence_fragment (ends with punctuation or incomplete)`)
      return 'sentence_fragment'
    }
    
    // Default to paragraph
    console.log(`   → Detected: paragraph (default)`)
    return 'paragraph'
  }

  /**
   * NEW: Suggest appropriate detail level based on fragment characteristics
   */
  private static suggestDetailLevel(
    fragment: string,
    fragmentType: EditContext['editingContext']['fragmentType'],
    sectionContent: string
  ): EditContext['editingContext']['suggestedDetailLevel'] {
    
    const fragmentLength = fragment.trim().length
    const wordCount = fragment.trim().split(/\s+/).length
    
    console.log(`📏 Detail level analysis: ${wordCount} words, ${fragmentLength} chars, type: ${fragmentType}`)
    
    // Micro editing for small fragments
    if (fragmentType === 'sentence_fragment' || (fragmentType === 'list_item' && wordCount < 10)) {
      console.log(`   → Suggested: MICRO (sentence_fragment or short list_item)`)
      return 'micro'
    }
    
    // Focused editing for single elements
    if (fragmentType === 'definition' || fragmentType === 'formula' || 
        (fragmentType === 'paragraph' && wordCount < 50)) {
      console.log(`   → Suggested: FOCUSED (definition, formula, or short paragraph)`)
      return 'focused'
    }
    
    // Expanded editing for larger content
    if (fragmentType === 'paragraph' && wordCount < 200) {
      console.log(`   → Suggested: EXPANDED (medium paragraph)`)
      return 'expanded'
    }
    
    // Comprehensive for full sections
    if (fragmentType === 'full_section' || fragmentType === 'section_header') {
      console.log(`   → Suggested: COMPREHENSIVE (full section or header)`)
      return 'comprehensive'
    }
    
    console.log(`   → Suggested: FOCUSED (default fallback)`)
    return 'focused' // Safe default
  }

  /**
   * NEW: Analyze style context of the document
   */
  private static analyzeStyleContext(
    sectionContent: string,
    fullDocument: string
  ): EditContext['editingContext']['styleContext'] {
    
    // Check for mathematical content
    const mathIndicators = [
      /\$.*\$/, // LaTeX inline math
      /\\\[[\s\S]*?\\\]/, // LaTeX display math  
      /\\[a-zA-Z]+/, // LaTeX commands
      /[∑∫∂∇αβγδε]/, // Mathematical symbols
      /\b(function|theorem|proof|lemma|definition|equation)\b/i
    ]
    const isMathematical = mathIndicators.some(pattern => 
      pattern.test(sectionContent) || pattern.test(fullDocument.slice(0, 2000))
    )
    
    // Check for list-based structure
    const listLines = sectionContent.split('\n').filter(line => 
      line.match(/^\s*[-*+]\s+/) || line.match(/^\s*\d+\.\s+/)
    )
    const isListBased = listLines.length > 3
    
    // Check for definition-heavy content
    const definitionLines = sectionContent.split('\n').filter(line =>
      line.match(/.*:\s*/) && line.length > 20
    )
    const isDefinitionHeavy = definitionLines.length > 2
    
    // Determine tone level based on vocabulary and structure
    const academicWords = (sectionContent.match(/\b(określa|oznacza|definiuje|przedstawia|analizy|koncepcja|teoria|metodologia)\b/gi) || []).length
    const technicalWords = (sectionContent.match(/\b(funkcja|algorytm|parametr|struktura|implementacja|system)\b/gi) || []).length
    
    let toneLevel: EditContext['editingContext']['styleContext']['toneLevel'] = 'casual'
    if (academicWords > 3 || isMathematical) {
      toneLevel = 'academic'
    } else if (technicalWords > 2) {
      toneLevel = 'technical'
    }
    
    return {
      isMathematical,
      isListBased,
      isDefinitionHeavy,
      toneLevel
    }
  }

  /**
   * NEW: Determine structural constraints for editing
   */
  private static determineStructuralConstraints(
    fragmentType: EditContext['editingContext']['fragmentType'],
    section: DocumentStructure['sections'][0]
  ): EditContext['editingContext']['structuralConstraints'] {
    
    // Calculate max allowed header level (always deeper than current section)
    const maxHeaderLevel = Math.min(6, section.level + 2)
    
    // Determine if we should preserve format strictly
    const preserveFormat = ['list_item', 'definition', 'formula', 'sentence_fragment'].includes(fragmentType)
    
    // Determine if new sections are allowed
    const allowNewSections = fragmentType === 'full_section'
    
    return {
      maxHeaderLevel,
      preserveFormat,
      allowNewSections
    }
  }

  /**
   * Create AI prompt with intelligent context awareness
   * ENHANCED: Now creates context-aware, constraint-based prompts
   */
  static createIntelligentPrompt(
    operation: 'expand' | 'improve' | 'summarize',
    context: EditContext
  ): string {
    
    const coreInstructions = this.getCoreEditingPrinciples()
    const operationGuidance = this.getOperationGuidance(operation, context.editingContext)
    const structuralConstraints = this.getStructuralConstraints(context.editingContext)
    const styleGuidance = this.getStyleGuidance(context.editingContext.styleContext)
    
    return `${coreInstructions}

${operationGuidance}

${structuralConstraints}

${styleGuidance}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 POZYCYJNA ŚWIADOMOŚĆ - TO JEST TWOJE MIEJSCE W DOKUMENCIE:

🎯 EDYTUJESZ: ${context.editingContext.fragmentType} w sekcji "${context.fragmentPosition.sectionTitle}" (poziom ${context.fragmentPosition.sectionLevel})

📊 STRUKTURA CAŁEGO DOKUMENTU:
${context.documentStructure}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⬆️ TREŚĆ PRZED TWOIM FRAGMENTEM (w tej samej sekcji):
${context.fragmentPositionInSection.beforeFragment || '[POCZĄTEK SEKCJI]'}

🎯 TWÓJ FRAGMENT DO EDYCJI:
"""
${context.editedFragment}
"""

⬇️ TREŚĆ PO TWOIM FRAGMENCIE (w tej samej sekcji):
${context.fragmentPositionInSection.afterFragment || '[KONIEC SEKCJI]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 KONTEKST OTACZAJĄCY (tylko dla zrozumienia gdzie jesteś - NIE DUPLIKUJ):

${context.precedingSection ? `⬆️ POPRZEDNIA SEKCJA (forbidden zone):
${context.precedingSection}

` : ''}${context.followingSection ? `⬇️ NASTĘPNA SEKCJA (forbidden zone):
${context.followingSection}

` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TWOJE ZADANIE:
Przepisz/rozwiń/popraw TYLKO fragment między """ """ tak żeby:
1. Płynnie łączył TREŚĆ PRZED z TREŚCIĄ POTEM  
2. Nie duplikował niczego z forbidden zones
3. Zachował swoją funkcję w strukturze dokumentu
4. Brzmiał jakby był oryginalną częścią tekstu

WYNIK: Zwróć TYLKO przepracowany fragment, bez komentarzy meta.`
  }

  /**
   * NEW: Core editing principles that apply to all operations
   */
  private static getCoreEditingPrinciples(): string {
    return `SEAMLESS CONTINUATION ENGINE - CORE PRINCIPLES:

🎯 TWOJA ROLA: Jesz inteligentnym autocomplete dla dokumentów. Myślisz TYLKO o tym co jest bezpośrednio przed i po Twoim fragmencie.

🧠 MINDSET SHIFT:
BŁĘDNE MYŚLENIE: "Dostałem tekst o X → opowiem o X"
POPRAWNE MYŚLENIE: "Jestem w luce między A a B → zrobię gładkie przejście A→B"

📍 POZYCYJNA ŚWIADOMOŚĆ:
- PRZED: Co było bezpośrednio przed moim fragmentem?
- JA: Jaka jest minimalna kontynuacja żeby przejść do POTEM?  
- POTEM: Co jest bezpośrednio po moim fragmencie?
- DALEJ: To już było napisane - ZAKAZ duplikowania

🚫 ABSOLUTNE ZAKAZY:
- Tytuły/nagłówki (chyba że edytujesz nagłówek)
- Meta-komentarze: "W tej sekcji", "Oto wyjaśnienie", "Podsumowując"
- Duplikowanie informacji z kontekstu (jeśli coś jest w POTEM/DALEJ - nie powtarzaj)
- Pisanie "od zera" zamiast kontynuacji
- Ignorowanie tego co jest bezpośrednio po fragmencie

✅ PRZYKŁADY DOBRYCH KONTYNUACJI:

PRZED: "Najważniejsze funkcje aktywacji to:"
POTEM: "- Funkcja sigmoidalna..."
GOOD: "sigmoid, ReLU i tanh, które transformują sygnał wejściowy:" 
BAD: "## Funkcje Aktywacji\nFunkcje aktywacji to..."

PRZED: "Algorithm działa następująco"  
POTEM: "1. Initialize variables"
GOOD: "w trzech głównych krokach:"
BAD: "Algorytm to zestaw instrukcji..."

PRZED: "Definicja teorii:"
POTEM: "Przykłady zastosowań:"  
GOOD: "mówi że proces zachodzi gdy spełnione są określone warunki."
BAD: "## Definicja\nTeoria definiuje..."`
  }

  /**
   * NEW: Get operation-specific guidance based on context
   */
  private static getOperationGuidance(
    operation: 'expand' | 'improve' | 'summarize',
    editingContext: EditContext['editingContext']
  ): string {
    
    const detailLevel = editingContext.suggestedDetailLevel
    const fragmentType = editingContext.fragmentType
    
    switch (operation) {
      case 'expand':
        if (detailLevel === 'micro') {
          return `OPERACJA: Micro-Continuation
🎯 ZADANIE: Dodaj MINIMALNĄ ilość słów żeby fragment płynnie przeszedł do tego co jest POTEM
📏 ROZMIAR: 5-15 słów maximum
🚫 ZAKAZ: Tworzenia nowych akapitów, wyjaśnień, przykładów

PRZYKŁAD:
PRZED: "Główne metody to:"
POTEM: "1. Linear regression"  
GOOD: "statystyczne i machine learning:"
BAD: "różnorodne, każda z własnymi zastosowaniami. Należą do nich:"`

        } else if (detailLevel === 'focused') {
          return `OPERACJA: Focused Expansion  
🎯 ZADANIE: Rozwiń fragment o 1-2 zdania, które gładko łączą PRZED z POTEM
📏 ROZMIAR: 20-60 słów
🎪 FLOW: PRZED → [Twoja kontynuacja] → POTEM (musi być płynne)

PRZYKŁAD:
PRZED: "Neural networks use activation functions"
POTEM: "- Sigmoid function: σ(x) = 1/(1+e^(-x))"
GOOD: "to introduce non-linearity and determine neuron output. The most common ones include:"
BAD: "## Activation Functions\nActivation functions are mathematical..."`

        } else if (detailLevel === 'expanded') {
          return `OPERACJA: Expanded Continuation
🎯 ZADANIE: Znacząco rozwiń ale zachowaj rolę "przejścia" do tego co POTEM
📏 ROZMIAR: 100-200 słów  
🔗 CONNECT: Musi jasno prowadzić do treści która jest POTEM
⚠️ UWAGA: Nadal jesteś kontynuacją, nie samodzielną sekcją`

        } else {
          return `OPERACJA: Comprehensive Section Development
🎯 ZADANIE: Pełna wolność - tworzysz całą sekcję od nowa
📏 ROZMIAR: 200+ słów
🏗️ STRUKTURA: Możesz reorganizować, dodać podsekcje, pełny markdown
💡 SVOBODA: Jedyny tryb gdzie możesz ignorować ścisłe ograniczenia PRZED/POTEM`
        }
        
      case 'improve':
        return `OPERACJA: Seamless Improvement
🎯 ZADANIE: Popraw fragment zachowując jego długość i rolę w dokumencie
🔧 FOCUS: Lepsza czytelność, precyzja, flow
📏 ROZMIAR: Taki sam jak oryginał (+/- 20%)
🎪 FLOW: Musi nadal płynnie łączyć PRZED z POTEM

PRZYKŁAD:
ORIGINAL: "Methods are good and useful for solving problems"
IMPROVED: "These methods effectively address complex computational challenges"`
        
      case 'summarize':
        if (fragmentType === 'full_section') {
          return `OPERACJA: Section Condensation
🎯 ZADANIE: Skondensuj sekcję do kluczowych informacji
📏 ROZMIAR: 30-50% oryginału
✅ ZACHOWAJ: Wszystkie kluczowe fakty, definicje, wzory
❌ USUŃ: Przykłady, rozwlekłe wyjaśnienia, redundancję`
        } else {
          return `OPERACJA: Fragment Condensation  
🎯 ZADANIE: Skróć fragment ale zachowaj jego funkcję łączącą
📏 ROZMIAR: 50-70% oryginału
🎪 FLOW: Nadal musi gładko łączyć PRZED z POTEM
💡 TRICK: Usuń słowa-wypełniacze, zostaw esencję`
        }
        
      default:
        return ''
    }
  }

  /**
   * NEW: Get structural constraints based on context
   */
  private static getStructuralConstraints(editingContext: EditContext['editingContext']): string {
    const constraints = editingContext.structuralConstraints
    const fragmentType = editingContext.fragmentType
    
    let constraintText = `OGRANICZENIA STRUKTURALNE I FORBIDDEN ZONES:\n\n`
    
    // Header constraints
    constraintText += `📏 POZIOM NAGŁÓWKÓW:\n`
    constraintText += `- Maksymalny dozwolony: ${'#'.repeat(constraints.maxHeaderLevel)} (poziom ${constraints.maxHeaderLevel})\n`
    constraintText += `- UWAGA: Jeśli nie edytujesz całej sekcji, prawdopodobnie w ogóle nie potrzebujesz nagłówków!\n\n`
    
    // Format preservation
    if (constraints.preserveFormat) {
      constraintText += `🔒 ZACHOWANIE FORMATU:\n`
      if (fragmentType === 'list_item') {
        constraintText += `- Fragment jest częścią listy → wynik MUSI pozostać elementem listy\n`
        constraintText += `- ZABRONIONE: Tworzenie akapitów, sekcji, innych formatów\n`
      } else if (fragmentType === 'definition') {
        constraintText += `- Fragment to definicja → wynik MUSI pozostać definicją\n`
        constraintText += `- Format: "Termin: wyjaśnienie" lub podobny\n`
      } else if (fragmentType === 'formula') {
        constraintText += `- Fragment zawiera wzory → matematyczny charakter MUSI zostać\n`
        constraintText += `- Zachowaj LaTeX notation ($...$)\n`
      } else if (fragmentType === 'sentence_fragment') {
        constraintText += `- Fragment to część zdania → MUSI zostać częścią zdania\n`
        constraintText += `- ZABRONIONE: Nowe akapity, listy, sekcje\n`
      }
      constraintText += `\n`
    }
    
    // Section creation rules
    if (!constraints.allowNewSections) {
      constraintText += `🚫 ZAKAZ TWORZENIA NOWYCH SEKCJI:\n`
      constraintText += `- Nie twórz głównych nagłówków (# ## ###)\n`
      constraintText += `- Pracuj WEWNĄTRZ istniejącej struktury\n`
      constraintText += `- Jesteś kontynuacją, nie nową sekcją\n\n`
    }
    
    // Forbidden zones
    constraintText += `⛔ FORBIDDEN ZONES - STREFY ZAKAZU:\n`
    constraintText += `- Wszystko co jest w TREŚCI PO FRAGMENCIE = już napisane → ZAKAZ duplikowania\n`
    constraintText += `- Wszystko co jest w NASTĘPNYCH SEKCJACH = już opisane → ZAKAZ powtarzania\n`
    constraintText += `- Jeśli widzisz listę funkcji w POTEM → nie twórz własnej listy funkcji\n`
    constraintText += `- Jeśli widzisz definicję w DALEJ → nie definiuj tego ponownie\n`
    constraintText += `- Jeśli widzisz przykłady w KONTEKŚCIE → nie dodawaj tych samych przykładów\n`
    
    return constraintText
  }

  /**
   * NEW: Get style guidance based on document context
   */
  private static getStyleGuidance(styleContext: EditContext['editingContext']['styleContext']): string {
    let guidance = `WYTYCZNE STYLISTYCZNE:\n`
    
    if (styleContext.isMathematical) {
      guidance += `- Dokument zawiera matematykę - używaj LaTeX ($...$), zachowuj notację matematyczną\n`
      guidance += `- Precyzja terminologii matematycznej jest krytyczna\n`
    }
    
    if (styleContext.isListBased) {
      guidance += `- Dokument ma strukturę listową - preferuj punkty nad długimi paragrafami\n`
    }
    
    if (styleContext.isDefinitionHeavy) {
      guidance += `- Dokument zawiera dużo definicji - zachowaj format "Termin: wyjaśnienie"\n`
    }
    
    switch (styleContext.toneLevel) {
      case 'academic':
        guidance += `- Ton akademicki: precyzyjny, formalny, używaj terminologii naukowej\n`
        break
      case 'technical':
        guidance += `- Ton techniczny: konkretny, praktyczny, zorientowany na implementację\n`
        break
      case 'casual':
        guidance += `- Ton casual: przystępny, zrozumiały, ale merytoryczny\n`
        break
    }
    
    return guidance
  }

  // EXISTING METHODS (unchanged) - keeping all original functionality
  
  static parseDocumentStructure(content: string): DocumentStructure {
    const lines = content.split('\n')
    const sections: DocumentStructure['sections'] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        const id = `section_${sections.length + 1}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        
        // Find end of section
        let endIndex = content.length
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j]
          const nextMatch = nextLine.match(/^(#{1,6})\s+/)
          if (nextMatch && nextMatch[1].length <= level) {
            // Calculate character position of start of this line
            endIndex = lines.slice(0, j).join('\n').length
            break
          }
        }
        
        sections.push({
          id,
          title,
          level,
          startIndex: lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0),
          endIndex
        })
      }
    }
    
    return { sections }
  }

  static findFragmentInDocument(fragment: string, document: string): number {
    console.log(`🔍 Searching for fragment in document:`)
    console.log(`   Fragment (${fragment.length} chars): "${fragment.substring(0, 100)}${fragment.length > 100 ? '...' : ''}"`)
    console.log(`   Document (${document.length} chars): "${document.substring(0, 100)}${document.length > 100 ? '...' : ''}"`)
    
    // Try exact match first
    let index = document.indexOf(fragment)
    if (index !== -1) {
      console.log(`   ✅ Found exact match at position ${index}`)
      return index
    }
    
    // Try with first 80 characters of fragment (helps with long fragments)
    const shortFragment = fragment.substring(0, Math.min(80, fragment.length))
    index = document.indexOf(shortFragment)
    if (index !== -1) {
      console.log(`   ✅ Found partial match (first 80 chars) at position ${index}`)
      return index
    }
    
    // Try with normalized whitespace and special characters
    const normalizeText = (text: string) => {
      return text
        .replace(/\s+/g, ' ')           // normalize whitespace
        .replace(/['']/g, "'")          // normalize quotes
        .replace(/[""]/g, '"')          // normalize quotes
        .replace(/…/g, '...')           // normalize ellipsis
        .replace(/–/g, '-')             // normalize dashes
        .replace(/—/g, '-')             // normalize em-dashes
        .trim()
    }
    
    const normalizedFragment = normalizeText(fragment)
    const normalizedDocument = normalizeText(document)
    
    console.log(`   🔄 Trying normalized search:`)
    console.log(`   Normalized fragment: "${normalizedFragment.substring(0, 100)}${normalizedFragment.length > 100 ? '...' : ''}"`)
    
    index = normalizedDocument.indexOf(normalizedFragment)
    if (index !== -1) {
      console.log(`   ✅ Found normalized match at position ${index}`)
      // Convert back to original document position (approximate)
      const beforeNormalized = normalizedDocument.substring(0, index)
      // Rough estimation - normalized text is usually shorter
      const estimatedPosition = Math.floor(beforeNormalized.length * 1.1)
      return Math.min(estimatedPosition, document.length - fragment.length)
    }
    
    // Try fuzzy matching with first 50 characters
    const veryShortFragment = normalizeText(fragment.substring(0, 50))
    index = normalizedDocument.indexOf(veryShortFragment)
    if (index !== -1) {
      console.log(`   ✅ Found fuzzy match (first 50 chars) at position ${index}`)
      const beforeNormalized = normalizedDocument.substring(0, index)
      const estimatedPosition = Math.floor(beforeNormalized.length * 1.1)
      return Math.min(estimatedPosition, document.length - 50)
    }
    
    // Try matching just the first sentence or until first punctuation
    const firstSentence = fragment.split(/[.!?:;]/)[0].trim()
    if (firstSentence.length > 10) {
      const normalizedFirstSentence = normalizeText(firstSentence)
      index = normalizedDocument.indexOf(normalizedFirstSentence)
      if (index !== -1) {
        console.log(`   ✅ Found first sentence match at position ${index}`)
        const beforeNormalized = normalizedDocument.substring(0, index)
        const estimatedPosition = Math.floor(beforeNormalized.length * 1.1)
        return Math.min(estimatedPosition, document.length - firstSentence.length)
      }
    }
    
    console.log(`   ❌ Fragment not found in document`)
    console.log(`   🔍 Debug info:`)
    console.log(`   - Fragment starts with: "${fragment.substring(0, 30)}"`)
    console.log(`   - Fragment ends with: "${fragment.substring(-30)}"`)
    console.log(`   - Document starts with: "${document.substring(0, 100)}"`)
    
    return -1
  }

  static getSectionContent(section: DocumentStructure['sections'][0], fullDocument: string): string {
    return fullDocument.substring(section.startIndex, section.endIndex).trim()
  }

  static getFragmentPositionInSection(
    fragment: string,
    sectionContent: string,
    section: DocumentStructure['sections'][0]
  ): EditContext['fragmentPositionInSection'] {
    const fragmentStart = sectionContent.indexOf(fragment)
    const fragmentEnd = fragmentStart + fragment.length
    
    const beforeFragment = sectionContent.substring(0, fragmentStart).trim()
    const afterFragment = sectionContent.substring(fragmentEnd).trim()
    
    // Calculate percentage position
    const percentPosition = Math.round((fragmentStart / sectionContent.length) * 100)
    
    // Split into paragraphs to find position
    const paragraphs = sectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    let paragraphIndex = 0
    let currentPosition = 0
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphEnd = currentPosition + paragraphs[i].length
      if (fragmentStart <= paragraphEnd) {
        paragraphIndex = i
        break
      }
      currentPosition = paragraphEnd + 2 // Account for double newline
    }
    
    return {
      beforeFragment: beforeFragment || '',
      afterFragment: afterFragment || '',
      percentPosition,
      paragraphIndex,
      totalParagraphs: paragraphs.length
    }
  }

  static formatDocumentStructure(structure: DocumentStructure): string {
    return structure.sections
      .map(section => `${'  '.repeat(section.level - 1)}${section.level}. ${section.title}`)
      .join('\n')
  }

  // LEGACY METHOD - kept for backward compatibility
  static createContextualPrompt(
    operation: 'expand' | 'improve' | 'summarize',
    context: EditContext
  ): string {
    console.log('⚠️  Using legacy createContextualPrompt - consider upgrading to createIntelligentPrompt')
    return this.createIntelligentPrompt(operation, context)
  }
}