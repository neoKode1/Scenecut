import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import Anthropic from '@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Shot {
  start_time: number;
  end_time: number;
}

interface LabelSegment {
  start_time: number;
  end_time: number;
  confidence: number;
}

interface Label {
  description: string;
  confidence: number;
  segments: LabelSegment[];
}

interface VideoAnnotationResults {
  shotAnnotations?: {
    startTimeOffset?: { seconds?: number };
    endTimeOffset?: { seconds?: number };
  }[];
  labelAnnotations?: {
    entity?: { description?: string };
    frames?: { confidence?: number }[];
    segments?: {
      segment?: {
        startTimeOffset?: { seconds?: number };
        endTimeOffset?: { seconds?: number };
      };
      confidence?: number;
    }[];
  }[];
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  return new Anthropic({ apiKey });
}

export async function POST(req: Request) {
  try {
    const { videoUrl } = await req.json();
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'No video URL provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for required environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      throw new Error('Missing required Google Cloud credentials');
    }

    // Initialize the client with environment variables
    const client = new VideoIntelligenceServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    // Fetch video content
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }
    const videoBuffer = await videoResponse.arrayBuffer();
    const videoContent = Buffer.from(videoBuffer).toString('base64');

    // Configure the request
    const videoRequest = {
      inputContent: videoContent,
      features: [
        protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION,
        protos.google.cloud.videointelligence.v1.Feature.LABEL_DETECTION
      ],
    };

    // Execute the video analysis
    const [operation] = await client.annotateVideo(videoRequest);
    const [operationResult] = await operation.promise();
    const results = operationResult as unknown as VideoAnnotationResults;

    // Process shot change annotations
    const shotAnnotations = results.shotAnnotations || [];
    const shots: Shot[] = shotAnnotations.map((shot) => ({
      start_time: shot.startTimeOffset?.seconds || 0,
      end_time: shot.endTimeOffset?.seconds || 0,
    }));

    // Process label annotations
    const labelAnnotations = results.labelAnnotations || [];
    const labels: Label[] = labelAnnotations.map((label) => ({
      description: label.entity?.description || '',
      confidence: label.frames?.[0]?.confidence || 0,
      segments: label.segments?.map((segment) => ({
        start_time: segment.segment?.startTimeOffset?.seconds || 0,
        end_time: segment.segment?.endTimeOffset?.seconds || 0,
        confidence: segment.confidence || 0,
      })) || [],
    }));

    // Get Anthropic analysis
    const anthropic = getAnthropicClient();
    const prompt = `You are an expert video analyst. Please analyze the following video content and provide a detailed description of the scenes and their significance. Here are the detected shots and labels:

Shots:
${shots.map((shot) => `- From ${shot.start_time}s to ${shot.end_time}s`).join('\n')}

Labels:
${labels.map((label) => `- ${label.description} (confidence: ${label.confidence})`).join('\n')}

Please provide:
1. A brief overview of the video content
2. Analysis of each major scene
3. Notable elements and their timing
4. Overall mood and style of the video`;

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const analysis = message.content[0]?.type === 'text' ? message.content[0].text : '';

    return NextResponse.json(
      { shots, labels, analysis },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
} 