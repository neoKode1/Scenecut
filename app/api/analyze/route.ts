import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

// Specify Node.js runtime instead of Edge
export const runtime = 'nodejs';

// Helper function to get video client
const getVideoClient = () => {
  // Check if we have the required environment variables
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    throw new Error('Missing Google Cloud credentials in environment variables');
  }

  // Create client with credentials from environment variables
  return new VideoIntelligenceServiceClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    },
    projectId: process.env.GOOGLE_PROJECT_ID
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.url) {
      return NextResponse.json({
        error: 'Missing URL',
        details: 'Video URL is required'
      }, { status: 400 });
    }

    // Download the video content first
    console.log('Downloading video from:', body.url);
    const videoResponse = await fetch(body.url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoContent = Buffer.from(videoBuffer).toString('base64');

    // Initialize video client
    const client = getVideoClient();

    // Start video analysis with the video content
    const [operation] = await client.annotateVideo({
      inputContent: videoContent,
      features: [
        protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION
      ],
      videoContext: {
        segments: [{
          startTimeOffset: { seconds: '0' },
          endTimeOffset: { seconds: '300' } // Analyze up to 5 minutes
        }]
      }
    });

    console.log('Analysis operation started:', operation.name);

    // Wait for the analysis to complete
    const [result] = await operation.promise();
    console.log('Analysis complete');

    // Extract shot changes
    const shots = result.annotationResults?.[0]?.shotAnnotations?.map(shot => ({
      start_time: Number(shot.startTimeOffset?.seconds) || 0,
      end_time: Number(shot.endTimeOffset?.seconds) || 0,
    })) || [];

    return NextResponse.json({
      shots,
      url: body.url,
      total_shots: shots.length,
      duration: shots.length > 0 ? shots[shots.length - 1].end_time : 0
    });

  } catch (error: any) {
    console.error('Analysis failed:', error);
    
    return NextResponse.json({
      error: 'Analysis failed',
      details: error.message || 'An unexpected error occurred',
      code: error.code
    }, { status: 500 });
  }
}