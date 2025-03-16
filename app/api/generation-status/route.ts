// File: /app/api/generation-status/route.ts
import { NextResponse } from 'next/server';

// This needs to be accessible from the POST route
export const generationJobs = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      );
    }
    
    const job = generationJobs.get(id);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Generation job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: job.status,
      percentage: job.percentage,
      noteId: job.noteId,
      error: job.error,
      currentStep: job.currentStep
    });
  } catch (error) {
    console.error("Error checking generation status:", error);
    return NextResponse.json(
      { error: 'Failed to check generation status' },
      { status: 500 }
    );
  }
}