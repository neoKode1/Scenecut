import { NextResponse } from 'next/server';
import { CameraAnalyzer } from '@/utils/CameraAnalyzer';

export async function POST(request: Request) {
  try {
    console.log('Starting video analysis...');
    const { videoContent } = await request.json();
    
    if (!videoContent) {
      return NextResponse.json({ error: 'No video content provided' }, { status: 400 });
    }

    console.log('Creating CameraAnalyzer instance...');
    const analyzer = new CameraAnalyzer();

    console.log('Analyzing video content...');
    const analysis = await analyzer.analyzeVideo(videoContent);

    console.log('Analysis complete');
    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    // Log the full error details
    console.error('Error analyzing camera movements:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json({ 
          success: false,
          error: 'Failed to initialize Google Cloud client. Please check your credentials.',
          details: error.message
        }, { status: 500 });
      }
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json({ 
          success: false,
          error: 'Failed to initialize Anthropic client. Please check your API key.',
          details: error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze video',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Add OPTIONS handler for CORS support
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 