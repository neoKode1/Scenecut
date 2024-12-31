import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Initialize Anthropic client with API key validation
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  
  return new Anthropic({
    apiKey: apiKey,
  });
}

interface Shot {
  start_time: number;
  end_time: number;
}

interface AnalysisRequest {
  shots: Shot[];
  blob_url: string;
}

export async function POST(request: Request) {
  try {
    let anthropic;
    try {
      anthropic = getAnthropicClient();
    } catch (error) {
      console.error('Anthropic client initialization error:', error);
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const data: AnalysisRequest = await request.json();
    
    // Format the shots data for Claude
    const shotsDescription = data.shots.map((shot, index) => {
      const duration = shot.end_time - shot.start_time;
      return `Shot ${index + 1}: ${duration.toFixed(1)}s (${shot.start_time.toFixed(1)}s - ${shot.end_time.toFixed(1)}s)`;
    }).join('\n');

    // Create the prompt for Claude
    const prompt = `As a cinematography expert, analyze this shot sequence and provide detailed camera movement and composition instructions for recreating these shots:

Shot Breakdown:
${shotsDescription}

Video URL: ${data.blob_url}

Please provide:
1. Detailed camera movements for each shot
2. Composition guidelines
3. Timing suggestions
4. Any transitions between shots
5. A concise prompt that could be used for AI video generation

Format your response in clear sections.`;

    console.log('Sending request to Anthropic with prompt:', prompt);

    // Create message using the latest SDK syntax
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.7,
      system: "You are a cinematography expert who analyzes shot sequences and provides detailed camera movement instructions.",
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
    });

    console.log('Received response from Anthropic');

    if (!response.content || response.content.length === 0) {
      throw new Error('No response content from Claude');
    }

    // Extract text from the first content block
    const analysis = response.content[0].type === 'text' 
      ? response.content[0].text
      : 'Error: Unexpected response format';

    return NextResponse.json({
      analysis,
    });

  } catch (error: any) {
    console.error('Prompt generation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate prompt',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        } : undefined
      },
      { status: 500 }
    );
  }
} 