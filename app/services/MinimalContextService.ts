// app/services/MinimalContextService.ts - UŻYWA NOWEGO ContentItemRenderer ID + DOM-first AI
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
      maxHeaderLevel: number
      preserveFormat: boolean
      allowNewSections: boolean
    }
  }
}

export class MinimalContextService {

/**
 * NEW: Extract context using frontend-prepared DOM info (no server DOM access needed)
 */
static getEditContextFromDOMInfo(
  domInfo: {
    domElementId: string,
    structuralId: string,
    elementType: string,
    content: string
  },
  parsedSections: any[],
  fullDocument: string
): EditContext {
  console.log(`🎯 Using frontend-prepared DOM info for AI:`, domInfo)
  
  // Step 1: Find in parsedSections using structural ID (same as handleContentSaved)
  const element = this.findElementById(parsedSections, domInfo.structuralId)
  if (!element) {
    throw new Error(`Structural element ${domInfo.structuralId} not found in parsed sections`)
  }
  
  console.log(`🎯 Found element:`, {
    domElementId: domInfo.domElementId,
    structuralId: domInfo.structuralId, 
    elementType: domInfo.elementType,
    elementDataType: element.data.type,
    content: element.data.content?.substring(0, 50) + '...'
  })
  
  // Step 2: Use existing logic to build context
  const section = element.type === 'section' ? element.data : element.parentSection
  if (!section) {
    throw new Error(`No containing section for element ${domInfo.structuralId}`)
  }
  
  const sectionSiblings = this.getSectionSiblings(section, parsedSections)
  const contentSiblings = element.type === 'content' 
    ? this.getContentSiblings(element.data, section)
    : { before: '', after: '', index: 0, total: 1 }
  
  // Use DOM-aware classification with frontend-prepared info
  const classification = this.classifyFromDOMInfo(element, domInfo)
  
  return this.buildEditContext(
    element,
    section,
    sectionSiblings,
    contentSiblings,
    classification,
    parsedSections,
    fullDocument
  )
}

/**
 * NEW: Classify element using frontend-prepared DOM info
 */
private static classifyFromDOMInfo(element: any, domInfo: any): {
  fragmentType: 'section_header' | 'full_section' | 'paragraph' | 'list_item' | 'definition' | 'formula' | 'sentence_fragment',
  detailLevel: 'micro' | 'focused' | 'expanded' | 'comprehensive'
} {
  
  if (element.type === 'section') {
    return {
      fragmentType: element.data.children?.length > 0 ? 'full_section' : 'section_header',
      detailLevel: 'expanded'
    }
  }
  
  const elementType = domInfo.elementType || element.data.type || 'paragraph'
  const content = element.data.content || ''
  const contentLength = content.length
  
  console.log(`🔍 Classifying from DOM info: elementType="${elementType}", contentLength=${contentLength}`)
  
  // Use ContentItemRenderer's classification as primary source (from frontend)
  switch (elementType) {
    case 'list':
    case 'list-item':
      return { 
        fragmentType: 'list_item', 
        detailLevel: contentLength < 50 ? 'micro' : 'focused' 
      }
    
    case 'code':
      return { 
        fragmentType: 'formula', 
        detailLevel: 'focused' 
      }
    
    case 'quote':
      return { 
        fragmentType: 'definition', 
        detailLevel: 'focused' 
      }
    
    default: // paragraph, other
      // Content-based heuristics for paragraphs
      if (content.includes(':') && content.split(':')[0].length < 50) {
        return { fragmentType: 'definition', detailLevel: 'focused' }
      }
      
      if (content.includes('$') || content.includes('\\') || content.match(/\b(equation|formula|theorem)\b/)) {
        return { fragmentType: 'formula', detailLevel: 'focused' }
      }
      
      if (contentLength < 100) {
        return { fragmentType: 'sentence_fragment', detailLevel: 'micro' }
      }
      
      return { 
        fragmentType: 'paragraph', 
        detailLevel: contentLength < 200 ? 'focused' : contentLength < 500 ? 'expanded' : 'comprehensive'
      }
  }
}




  /**
   * EXISTING: Find element by ID - works with any ID format
   */
  private static findElementById(sections: any[], elementId: string): {
    type: 'section' | 'content',
    data: any,
    parentSection?: any
  } | null {
    
    for (const section of sections) {
      // Check if section matches
      if (section.id === elementId) {
        return { type: 'section', data: section }
      }
      
      // Check content items in section
      for (const contentItem of section.content || []) {
        if (contentItem.id === elementId) {
          return { type: 'content', data: contentItem, parentSection: section }
        }
      }
      
      // Check children recursively
      if (section.children && section.children.length > 0) {
        const found = this.findElementById(section.children, elementId)
        if (found) return found
      }
    }
    
    return null
  }


  
  /**
   * EXISTING: Get section siblings (previous/next at same level)
   */
  private static getSectionSiblings(targetSection: any, allSections: any[]): {
    previous?: any,
    next?: any
  } {
    
    const findInLevel = (sections: any[], targetId: string): { previous?: any, next?: any, found: boolean } => {
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        
        if (section.id === targetId) {
          return {
            previous: i > 0 ? sections[i - 1] : undefined,
            next: i < sections.length - 1 ? sections[i + 1] : undefined,
            found: true
          }
        }
      }
      return { found: false }
    }
    
    // Try root level first
    const rootResult = findInLevel(allSections, targetSection.id)
    if (rootResult.found) {
      return { previous: rootResult.previous, next: rootResult.next }
    }
    
    // Search in children levels
    for (const section of allSections) {
      if (section.children && section.children.length > 0) {
        const childResult = findInLevel(section.children, targetSection.id)
        if (childResult.found) {
          return { previous: childResult.previous, next: childResult.next }
        }
        
        // Recursive search in deeper levels
        const deepResult = this.getSectionSiblings(targetSection, section.children)
        if (deepResult.previous || deepResult.next) {
          return deepResult
        }
      }
    }
    
    return {}
  }
  
  /**
   * EXISTING: Get content siblings (previous/next content items in same section)
   */
  private static getContentSiblings(targetContent: any, containingSection: any): {
    before: string,
    after: string,
    index: number,
    total: number
  } {
    const contentItems = containingSection.content || []
    const targetIndex = contentItems.findIndex((item: any) => item.id === targetContent.id)
    
    if (targetIndex === -1) {
      return { before: '', after: '', index: 0, total: contentItems.length }
    }
    
    const beforeItems = contentItems.slice(0, targetIndex)
    const afterItems = contentItems.slice(targetIndex + 1)
    
    return {
      before: beforeItems.map((item: any) => item.content).join('\n\n'),
      after: afterItems.map((item: any) => item.content).join('\n\n'),
      index: targetIndex,
      total: contentItems.length
    }
  }
  
  /**
   * EXISTING: Classify element type from parsed structure (NO REGEX!)
   */
  private static classifyElementFromStructure(element: {
    type: 'section' | 'content',
    data: any
  }): {
    fragmentType: EditContext['editingContext']['fragmentType'],
    detailLevel: EditContext['editingContext']['suggestedDetailLevel']
  } {
    
    if (element.type === 'section') {
      return {
        fragmentType: 'section_header',
        detailLevel: 'comprehensive'
      }
    }
    
    // Content item - use parsed type
    const contentType = element.data.type || 'paragraph'
    const contentLength = (element.data.content || '').trim().length
    const wordCount = (element.data.content || '').trim().split(/\s+/).length
    
    let fragmentType: EditContext['editingContext']['fragmentType']
    let detailLevel: EditContext['editingContext']['suggestedDetailLevel']
    
    // Map content type to fragment type
    switch (contentType) {
      case 'list':
        fragmentType = 'list_item'
        detailLevel = wordCount < 10 ? 'micro' : 'focused'
        break
      case 'code':
        fragmentType = 'formula'
        detailLevel = 'focused'
        break
      case 'quote':
        fragmentType = 'definition'
        detailLevel = 'focused'
        break
      default: // paragraph, other
        // Simple heuristics for paragraphs
        if (element.data.content.includes(':') && contentLength < 200) {
          fragmentType = 'definition'
          detailLevel = 'focused'
        } else if (element.data.content.match(/\$.*\$/) || element.data.content.match(/[∑∫∂∇αβγδε]/)) {
          fragmentType = 'formula'
          detailLevel = 'focused'
        } else {
          fragmentType = 'paragraph'
          if (wordCount < 30) {
            detailLevel = 'focused'
          } else if (wordCount < 100) {
            detailLevel = 'expanded'
          } else {
            detailLevel = 'comprehensive'
          }
        }
        break
    }
    
    return { fragmentType, detailLevel }
  }
  
  /**
   * EXISTING: Build complete EditContext
   */
  private static buildEditContext(
    element: any,
    section: any,
    sectionSiblings: any,
    contentSiblings: any,
    classification: any,
    allSections: any[],
    fullDocument: string
  ): EditContext {
    
    // Style analysis (simplified)
    const sectionContent = this.sectionToMarkdown(section)
    const styleContext = {
      isMathematical: /\$.*\$|[∑∫∂∇αβγδε]/.test(sectionContent),
      isListBased: (sectionContent.match(/^\s*[-*+]\s+/gm) || []).length > 3,
      isDefinitionHeavy: (sectionContent.match(/.*:\s*.{20,}/gm) || []).length > 2,
      toneLevel: (/\b(określa|definiuje|teoria|metodologia)\b/gi.test(sectionContent) ? 'academic' : 
                 /\b(funkcja|algorytm|system)\b/gi.test(sectionContent) ? 'technical' : 'casual') as any
    }
    
    // Structural constraints
    const structuralConstraints = {
      maxHeaderLevel: Math.min(6, section.level + 2),
      preserveFormat: ['list_item', 'definition', 'formula'].includes(classification.fragmentType),
      allowNewSections: classification.fragmentType === 'section_header'
    }
    
    return {
      documentStructure: this.formatSectionsStructure(allSections),
      editedFragment: element.type === 'section' ? section.title : element.data.content,
      currentSectionContent: sectionContent,
      fragmentPositionInSection: {
        beforeFragment: contentSiblings.before,
        afterFragment: contentSiblings.after,
        percentPosition: contentSiblings.total > 0 ? Math.round((contentSiblings.index / contentSiblings.total) * 100) : 0,
        paragraphIndex: contentSiblings.index,
        totalParagraphs: contentSiblings.total
      },
      precedingSection: sectionSiblings.previous ? this.sectionToMarkdown(sectionSiblings.previous) : undefined,
      followingSection: sectionSiblings.next ? this.sectionToMarkdown(sectionSiblings.next) : undefined,
      fragmentPosition: {
        sectionTitle: section.title,
        sectionLevel: section.level,
        indexInDocument: this.getSectionIndex(section, allSections),
        totalSections: this.countAllSections(allSections)
      },
      editingContext: {
        fragmentType: classification.fragmentType,
        suggestedDetailLevel: classification.detailLevel || classification.suggestedDetailLevel,
        styleContext,
        structuralConstraints
      }
    }
  }
  
  /**
   * EXISTING: Log only essential context information
   */
  private static logContextInfo(
    element: any,
    section: any,
    sectionSiblings: any,
    contentSiblings: any
  ): void {
    console.log(`📍 CONTEXT SUMMARY:`)
    console.log(`   - Previous section: ${sectionSiblings.previous ? `"${sectionSiblings.previous.title}"` : 'none'}`)
    console.log(`   - Next section: ${sectionSiblings.next ? `"${sectionSiblings.next.title}"` : 'none'}`)
    console.log(`   - Content before: ${contentSiblings.before ? 'YES' : 'none'}`)
    console.log(`   - Element: "${(element.type === 'section' ? section.title : element.data.content).substring(0, 50)}..."`)
    console.log(`   - Content after: ${contentSiblings.after ? 'YES' : 'none'}`)
  }
  
  // EXISTING HELPER FUNCTIONS (simple and focused)
  
  private static sectionToMarkdown(section: any): string {
    let markdown = `${'#'.repeat(section.level)} ${section.title}\n\n`
    for (const contentItem of section.content || []) {
      if (contentItem.content.trim()) {
        markdown += contentItem.content + '\n\n'
      }
    }
    return markdown.trim()
  }
  
  private static formatSectionsStructure(sections: any[]): string {
    const formatSection = (section: any, indent: string = ''): string => {
      let result = `${indent}${section.level}. ${section.title}\n`
      for (const child of section.children || []) {
        result += formatSection(child, indent + '  ')
      }
      return result
    }
    return sections.map(section => formatSection(section)).join('')
  }
  
  private static getSectionIndex(targetSection: any, allSections: any[]): number {
    let index = 0
    const findIndex = (sections: any[]): boolean => {
      for (const section of sections) {
        if (section.id === targetSection.id) {
          return true
        }
        index++
        if (section.children && findIndex(section.children)) {
          return true
        }
      }
      return false
    }
    findIndex(allSections)
    return index
  }
  
  private static countAllSections(sections: any[]): number {
    let count = 0
    const countSections = (sectionList: any[]) => {
      for (const section of sectionList) {
        count++
        if (section.children) {
          countSections(section.children)
        }
      }
    }
    countSections(sections)
    return count
  }

  /**
   * EXISTING: Create AI prompt with intelligent context awareness
   * UNCHANGED - keeps existing prompt logic that works perfectly
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

  // ALL EXISTING PROMPT GENERATION METHODS - UNCHANGED (they work perfectly)
  
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
🚫 ZAKAZ: Tworzenia nowych akapitów, wyjaśnień, przykładów`
        } else if (detailLevel === 'focused') {
          return `OPERACJA: Focused Expansion  
🎯 ZADANIE: Rozwiń fragment o 1-2 zdania, które gładko łączą PRZED z POTEM
📏 ROZMIAR: 20-60 słów
🎪 FLOW: PRZED → [Twoja kontynuacja] → POTEM (musi być płynne)`
        } else if (detailLevel === 'expanded') {
          return `OPERACJA: Expanded Continuation
🎯 ZADANIE: Znacząco rozwiń ale zachowaj rolę "przejścia" do tego co POTEM
📏 ROZMIAR: 100-200 słów  
🔗 CONNECT: Musi jasno prowadzić do treści która jest POTEM`
        } else {
          return `OPERACJA: Comprehensive Section Development
🎯 ZADANIE: Pełna wolność - tworzysz całą sekcję od nowa
📏 ROZMIAR: 200+ słów
🏗️ STRUKTURA: Możesz reorganizować, dodać podsekcje`
        }
        
      case 'improve':
        return `OPERACJA: Seamless Improvement
🎯 ZADANIE: Popraw fragment zachowując jego długość i rolę w dokumencie
🔧 FOCUS: Lepsza czytelność, precyzja, flow
📏 ROZMIAR: Taki sam jak oryginał (+/- 20%)
🎪 FLOW: Musi nadal płynnie łączyć PRZED z POTEM`
        
      case 'summarize':
        return `OPERACJA: Fragment Condensation  
🎯 ZADANIE: Skróć fragment ale zachowaj jego funkcję łączącą
📏 ROZMIAR: 50-70% oryginału
🎪 FLOW: Nadal musi gładko łączyć PRZED z POTEM`
        
      default:
        return ''
    }
  }

  private static getStructuralConstraints(editingContext: EditContext['editingContext']): string {
    const constraints = editingContext.structuralConstraints
    const fragmentType = editingContext.fragmentType
    
    let constraintText = `OGRANICZENIA STRUKTURALNE I FORBIDDEN ZONES:\n\n`
    
    constraintText += `📏 POZIOM NAGŁÓWKÓW:\n`
    constraintText += `- Maksymalny dozwolony: ${'#'.repeat(constraints.maxHeaderLevel)} (poziom ${constraints.maxHeaderLevel})\n`
    constraintText += `- UWAGA: Jeśli nie edytujesz całej sekcji, prawdopodobnie w ogóle nie potrzebujesz nagłówków!\n\n`
    
    if (constraints.preserveFormat) {
      constraintText += `🔒 ZACHOWANIE FORMATU:\n`
      if (fragmentType === 'list_item') {
        constraintText += `- Fragment jest częścią listy → wynik MUSI pozostać elementem listy\n`
      } else if (fragmentType === 'definition') {
        constraintText += `- Fragment to definicja → wynik MUSI pozostać definicją\n`
      } else if (fragmentType === 'formula') {
        constraintText += `- Fragment zawiera wzory → matematyczny charakter MUSI zostać\n`
      }
      constraintText += `\n`
    }
    
    if (!constraints.allowNewSections) {
      constraintText += `🚫 ZAKAZ TWORZENIA NOWYCH SEKCJI:\n`
      constraintText += `- Nie twórz głównych nagłówków (# ## ###)\n`
      constraintText += `- Pracuj WEWNĄTRZ istniejącej struktury\n\n`
    }
    
    constraintText += `⛔ FORBIDDEN ZONES - STREFY ZAKAZU:\n`
    constraintText += `- Wszystko co jest w TREŚCI PO FRAGMENCIE = już napisane → ZAKAZ duplikowania\n`
    constraintText += `- Wszystko co jest w NASTĘPNYCH SEKCJACH = już opisane → ZAKAZ powtarzania\n`
    
    return constraintText
  }

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


  static parseDocumentStructure(content: string): DocumentStructure {
    // Legacy method - kept for compatibility but simplified
    const lines = content.split('\n')
    const sections: DocumentStructure['sections'] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        const id = `legacy_section_${sections.length}`
        
        let endIndex = content.length
        for (let j = i + 1; j < lines.length; j++) {
          const nextMatch = lines[j].match(/^(#{1,6})\s+/)
          if (nextMatch && nextMatch[1].length <= level) {
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
}