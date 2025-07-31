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
}

export class MinimalContextService {
  
  /**
   * Extract minimal but complete context for AI editing
   * FAST: ~5ms processing time
   */
  static getEditContext(fragment: string, fullDocument: string): EditContext {
    console.log(`🎯 Extracting minimal edit context for fragment (${fragment.length} chars)`)
    
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
      }
    }
    
    console.log(`✅ Context extracted successfully:`)
    console.log(`   - Section: "${containingSection.title}" (${containingSection.level})`)
    console.log(`   - Position in section: ${fragmentPositionInSection.percentPosition}% (${fragmentPositionInSection.paragraphIndex + 1}/${fragmentPositionInSection.totalParagraphs} paragraphs)`)
    console.log(`   - Document position: ${sectionIndex + 1}/${structure.sections.length} sections`)
    console.log(`   - Has preceding: ${!!precedingContent}, following: ${!!followingContent}`)
    
    return context
  }

  /**
   * Create AI prompt with minimal perfect context
   */
  static createContextualPrompt(
    operation: 'expand' | 'improve' | 'summarize',
    context: EditContext
  ): string {
    const instruction = this.getOperationInstruction(operation)
    const guidelines = this.getContextualGuidelines(operation, context)
    const structuralConstraints = this.getStructuralConstraints(context)
    
    return `${instruction}

${guidelines}

${structuralConstraints}

STRUKTURA DOKUMENTU:
${context.documentStructure}

POZYCJA FRAGMENTU:
- Sekcja: "${context.fragmentPosition.sectionTitle}" (poziom ${context.fragmentPosition.sectionLevel})
- Pozycja w dokumencie: ${context.fragmentPosition.indexInDocument + 1} z ${context.fragmentPosition.totalSections} sekcji
- Pozycja w sekcji: ${context.fragmentPositionInSection.percentPosition}% (element ${context.fragmentPositionInSection.paragraphIndex + 1} z ${context.fragmentPositionInSection.totalParagraphs})

OBECNA SEKCJA (pełna treść):
${context.currentSectionContent}

${context.fragmentPositionInSection.beforeFragment ? `TREŚĆ PRZED FRAGMENTEM W SEKCJI:\n${context.fragmentPositionInSection.beforeFragment}\n` : ''}

FRAGMENT DO EDYCJI:
${context.editedFragment}

${context.fragmentPositionInSection.afterFragment ? `TREŚĆ PO FRAGMENCIE W SEKCJI:\n${context.fragmentPositionInSection.afterFragment}\n` : ''}

${context.precedingSection ? `SEKCJA POWYŻEJ:\n${context.precedingSection}\n` : ''}

${context.followingSection ? `SEKCJA PONIŻEJ:\n${context.followingSection}` : ''}`
  }

  // === HELPER METHODS ===

  private static findFragmentInDocument(fragment: string, fullDocument: string): number {
    // Try exact match first
    let fragmentStart = fullDocument.indexOf(fragment)
    if (fragmentStart !== -1) return fragmentStart
    
    // Try with first 100 characters (for long fragments)
    const shortFragment = fragment.substring(0, Math.min(100, fragment.length))
    fragmentStart = fullDocument.indexOf(shortFragment)
    if (fragmentStart !== -1) return fragmentStart
    
    // Try with normalized whitespace
    const normalizedFragment = fragment.replace(/\s+/g, ' ').trim()
    const normalizedDocument = fullDocument.replace(/\s+/g, ' ')
    const normalizedStart = normalizedDocument.indexOf(normalizedFragment.substring(0, 50))
    
    if (normalizedStart !== -1) {
      // Convert back to original document position (approximate)
      const beforeNormalized = normalizedDocument.substring(0, normalizedStart)
      const beforeOriginal = fullDocument.substring(0, beforeNormalized.length * 1.2) // rough estimation
      return beforeOriginal.length
    }
    
    return -1
  }

  private static parseDocumentStructure(fullDocument: string): DocumentStructure {
    const sections: DocumentStructure['sections'] = []
    const lines = fullDocument.split('\n')
    
    let currentPosition = 0
    
    lines.forEach((line) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headerMatch) {
        // Close previous section
        if (sections.length > 0) {
          sections[sections.length - 1].endIndex = currentPosition - 1
        }
        
        // Start new section
        const level = headerMatch[1].length
        const title = headerMatch[2].trim()
        
        sections.push({
          id: `section-${sections.length}`,
          title,
          level,
          startIndex: currentPosition,
          endIndex: fullDocument.length // Will be updated when next section starts
        })
      }
      
      currentPosition += line.length + 1 // +1 for newline
    })
    
    // Close last section
    if (sections.length > 0) {
      sections[sections.length - 1].endIndex = fullDocument.length
    }
    
    return { sections }
  }

  private static getSectionContent(section: DocumentStructure['sections'][0], fullDocument: string): string {
    const content = fullDocument.substring(section.startIndex, section.endIndex)
    
    // Limit to reasonable size (max 1200 chars per section for context)
    if (content.length > 1200) {
      const truncated = content.substring(0, 1200)
      const lastNewline = truncated.lastIndexOf('\n')
      return (lastNewline > 800 ? truncated.substring(0, lastNewline) : truncated) + '\n...[truncated]'
    }
    
    return content.trim()
  }

  private static getFragmentPositionInSection(
    fragment: string, 
    sectionContent: string, 
    section: DocumentStructure['sections'][0]
  ): EditContext['fragmentPositionInSection'] {
    // Find fragment within section
    let fragmentStart = sectionContent.indexOf(fragment)
    
    if (fragmentStart === -1) {
      // Try with first part of fragment
      const shortFragment = fragment.substring(0, Math.min(50, fragment.length))
      fragmentStart = sectionContent.indexOf(shortFragment)
    }
    
    if (fragmentStart === -1) {
      // Fallback - assume at beginning
      console.warn('Could not locate fragment within section, assuming start position')
      fragmentStart = 0
    }
    
    const fragmentEnd = fragmentStart + fragment.length
    
    // Split section into paragraphs/blocks
    const paragraphs = sectionContent.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    
    // Find which paragraph contains the fragment
    let paragraphIndex = 0
    let cumulativeLength = 0
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphLength = paragraphs[i].length + (i < paragraphs.length - 1 ? 2 : 0) // +2 for \n\n
      if (cumulativeLength + paragraphLength > fragmentStart) {
        paragraphIndex = i
        break
      }
      cumulativeLength += paragraphLength
    }
    
    // Get content before and after fragment within section
    const beforeFragment = sectionContent.substring(0, fragmentStart).trim()
    const afterFragment = sectionContent.substring(fragmentEnd).trim()
    
    // Calculate percentage position
    const percentPosition = Math.round((fragmentStart / sectionContent.length) * 100)
    
    return {
      beforeFragment: beforeFragment || '',
      afterFragment: afterFragment || '',
      percentPosition: Math.min(100, Math.max(0, percentPosition)),
      paragraphIndex,
      totalParagraphs: paragraphs.length
    }
  }

  private static formatDocumentStructure(structure: DocumentStructure): string {
    return structure.sections
      .map(section => {
        const indent = '  '.repeat(Math.max(0, section.level - 1))
        const prefix = '#'.repeat(section.level)
        return `${indent}${prefix} ${section.title}`
      })
      .join('\n')
  }

  private static getOperationInstruction(operation: string): string {
    switch (operation) {
      case 'expand':
        return 'Rozwiń poniższy fragment tekstu, dodając więcej szczegółów, przykładów i wyjaśnień. Zachowaj spójność z otaczającymi sekcjami i pozycją w hierarchii dokumentu.'
      case 'improve':
        return 'Ulepsz prezentację poniższego fragmentu tekstu, skupiając się na lepszym formatowaniu i strukturze. Zachowaj poziom hierarchii i styl dokumentu, dostosuj do pozycji w sekcji.'
      case 'summarize':
        return 'Streszczaj poniższy fragment tekstu, wydobywając najważniejsze informacje. Dostosuj poziom szczegółowości do pozycji w hierarchii dokumentu i roli w sekcji.'
      default:
        return 'Przetworz poniższy fragment tekstu zgodnie z kontekstem dokumentu i pozycją w strukturze.'
    }
  }

  private static getContextualGuidelines(operation: string, context: EditContext): string {
    let guidelines = 'WYTYCZNE KONTEKSTOWE:'
    
    // Level-based guidelines
    if (context.fragmentPosition.sectionLevel === 1) {
      guidelines += '\n- To główna sekcja dokumentu - zachowaj jej status jako główny temat'
      if (operation === 'expand') {
        guidelines += '\n- Rozwijaj hierarchicznie, możesz dodać podsekcje i szczegóły'
      }
    } else if (context.fragmentPosition.sectionLevel === 2) {
      guidelines += '\n- To sekcja drugiego poziomu - rozwijaj temat w ramach nadrzędnej kategorii'
      if (operation === 'expand') {
        guidelines += '\n- Pogłębiaj szczegóły bez tworzenia nowych głównych tematów'
      }
    } else {
      guidelines += `\n- To podsekcja poziomu ${context.fragmentPosition.sectionLevel} - trzymaj się tego konkretnego aspektu`
      if (operation === 'expand') {
        guidelines += '\n- Dodawaj detale i przykłady bez rozszerzania zakresu tematu'
      }
    }
    
    // Position within section guidelines
    const { fragmentPositionInSection } = context
    if (fragmentPositionInSection.percentPosition < 25) {
      guidelines += '\n- Fragment na początku sekcji - może wprowadzać temat lub definiować kluczowe pojęcia'
    } else if (fragmentPositionInSection.percentPosition > 75) {
      guidelines += '\n- Fragment na końcu sekcji - może podsumowywać lub wieść do wniosków'
    } else {
      guidelines += '\n- Fragment w środku sekcji - prawdopodobnie rozwija główny temat'
    }
    
    // Context-based guidelines
    if (context.precedingSection) {
      guidelines += '\n- Zachowaj logiczną ciągłość z poprzednią sekcją'
    }
    
    if (context.followingSection) {
      guidelines += '\n- Przygotuj płynne przejście do następnej sekcji'
    }
    
    // Position-based guidelines
    const { indexInDocument, totalSections } = context.fragmentPosition
    
    if (indexInDocument === 0) {
      guidelines += '\n- To początek dokumentu - ustaw odpowiedni ton i wprowadź temat'
    } else if (indexInDocument === totalSections - 1) {
      guidelines += '\n- To końcowa sekcja - rozważ podsumowanie lub wnioski'
    } else {
      guidelines += '\n- To środkowa sekcja - rozwijaj temat systematycznie'
    }
    
    return guidelines
  }

  private static getStructuralConstraints(context: EditContext): string {
    let constraints = 'OGRANICZENIA STRUKTURALNE:'
    
    constraints += `\n- NIE zmieniaj poziomu hierarchii sekcji (pozostań na poziomie ${context.fragmentPosition.sectionLevel})`
    constraints += '\n- Zachowaj spójność stylistyczną z całym dokumentem'
    constraints += '\n- Utrzymaj proporcje względem innych sekcji'
    
    // Fragment-specific constraints
    const { fragmentPositionInSection } = context
    if (fragmentPositionInSection.paragraphIndex === 0) {
      constraints += '\n- To pierwszy element sekcji - zachowaj wprowadzający charakter'
    }
    
    if (fragmentPositionInSection.paragraphIndex === fragmentPositionInSection.totalParagraphs - 1) {
      constraints += '\n- To ostatni element sekcji - może zawierać podsumowanie tego aspektu'
    }
    
    // Content preservation
    if (context.fragmentPositionInSection.beforeFragment) {
      constraints += '\n- Zachowaj ciągłość z treścią przed fragmentem w tej sekcji'
    }
    
    if (context.fragmentPositionInSection.afterFragment) {
      constraints += '\n- Przygotuj logiczne przejście do treści po fragmencie w tej sekcji'
    }
    
    return constraints
  }
}