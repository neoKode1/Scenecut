import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Define interfaces for our data structures
interface TimeSegment {
  start: number;
  end: number;
  duration: number;
}

interface Shot {
  startTime: number;
  endTime: number;
  duration: number;
}

interface Label {
  description: string;
  confidence: number;
  timeSegments: TimeSegment[];
}

interface Object {
  description: string;
  confidence: number;
  timeSegment: TimeSegment;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { shots, labels, objects } = await request.json();
    
    console.log('Received raw data:', JSON.stringify({ shots, labels, objects }, null, 2));

    // Keep the data structure but ensure all nested arrays are properly expanded
    const formattedData = {
      shots,
      labels: labels.map((label: any) => ({
        description: label.description,
        confidence: label.confidence,
        timeSegments: label.timeSegments.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          duration: seg.duration
        }))
      })),
      objects: objects.map((obj: any) => ({
        description: obj.description,
        confidence: obj.confidence,
        timeSegment: {
          start: obj.timeSegment.start,
          end: obj.timeSegment.end,
          duration: obj.timeSegment.duration
        }
      }))
    };

    console.log('Formatted data:', JSON.stringify(formattedData, null, 2));

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing Anthropic API key');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Construct a detailed prompt
    const prompt = `Analyze this video sequence and provide detailed camera movement descriptions and recreation steps. Here's the data:

Shots: ${JSON.stringify(formattedData.shots, null, 2)}
Labels: ${JSON.stringify(formattedData.labels, null, 2)}
Objects: ${JSON.stringify(formattedData.objects, null, 2)}

Based on this data:
1. For each shot (${formattedData.shots.map((s: Shot) => `${s.startTime}s-${s.endTime}s`).join(', ')}):
   - Describe the timing and what appears in the frame
   - Analyze likely camera movements based on object positions
   - Note any transitions between objects (${formattedData.objects.map((o: Object) => o.description).join(', ')})

2. Provide step-by-step recreation instructions, including:
   - Camera setup and position
   - Key framing elements
   - Any movement or transitions
   - Approximate timing

Please format your response with clear sections for Camera Movements and Recreation Steps.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    const responseText = 'text' in content ? content.text : 'Failed to get analysis';

    return NextResponse.json({
      success: true,
      analysis: responseText,
      debug: formattedData
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Analysis failed',
      details: error instanceof Error ? error.stack : undefined
    });
  }
} 