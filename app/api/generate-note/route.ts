// File: /app/api/generate-note/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: NextResponse) {
  try {
    const body = await request.json();
    const { fileId, fileName } = body;
    
    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId and fileName are required' },
        { status: 400 }
      );
    }
    
    // Generate sample sections with title, description, and content
    const sectionTypes = [
      { 
        title: "Introduction", 
        description: "Overview of the document's purpose and scope",
        content: "This section provides a comprehensive introduction to the document, establishing its context, purpose, and relevance. It outlines the key themes that will be explored throughout and sets the stage for the detailed analysis that follows."
      },
      { 
        title: "Background", 
        description: "Historical and contextual information",
        content: "This section explores the historical context and relevant background information needed to fully understand the main topics. It provides essential facts, definitions, and prior research that form the foundation for the current work. This background creates a framework for interpreting the findings presented later."
      },
      { 
        title: "Methodology", 
        description: "Approaches and techniques used",
        content: "This section details the specific methods, procedures, and analytical techniques employed in the research or analysis. It covers data collection processes, experimental designs, and analytical frameworks. The methodology provides transparency about how conclusions were reached and enables evaluation of the work's rigor."
      },
      { 
        title: "Results", 
        description: "Key findings and outcomes",
        content: "This section presents the primary findings, data, and outcomes discovered through the research or analysis. It includes relevant statistics, measurements, observations, and other empirical evidence. The results are presented objectively without interpretation, focusing on what was found rather than what it means."
      },
      { 
        title: "Discussion", 
        description: "Analysis and interpretation of results",
        content: "This section analyzes and interprets the results, exploring their implications and significance. It connects findings to the broader context established earlier and examines how they relate to existing knowledge. The discussion addresses unexpected outcomes, limitations, and alternative explanations for the results."
      },
      { 
        title: "Conclusion", 
        description: "Summary and final thoughts",
        content: "This section summarizes the key points and main takeaways from the document. It synthesizes the findings into cohesive conclusions and may suggest practical applications or recommendations. The conclusion often identifies areas for future research or exploration and reinforces the document's overall contribution."
      }
    ];
    
    // Create the note structure
    const generatedNote = {
      id: `note_${Date.now()}`,
      title: `Note for ${fileName}`,
      sections: sectionTypes.map((section, index) => ({
        id: index + 1,
        title: section.title,
        description: section.description,
        content: section.content,
        expanded: false // Default state is collapsed
      }))
    };
    
    return NextResponse.json(generatedNote);
  } catch (error) {
    console.error("Error generating note:", error);
    return NextResponse.json(
      { error: 'Failed to generate note' },
      { status: 500 }
    );
  }
}