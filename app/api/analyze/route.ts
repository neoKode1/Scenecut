import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

let video_client: VideoIntelligenceServiceClient | null = null;

// Initialize the client with error handling
const getVideoClient = () => {
  if (video_client) return video_client;
  
  try {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!credentials) {
      console.error('Missing Google credentials in environment');
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not configured');
    }

    let parsedCredentials;
    try {
      // First remove the outer quotes and any spaces after colons
      const cleanedCredentials = credentials
        .replace(/^"|"$/g, '')  // Remove outer quotes
        .replace(/:\s+/g, ':')  // Remove spaces after colons
        .replace(/\\n/g, '\n'); // Replace escaped newlines
      
      parsedCredentials = JSON.parse(cleanedCredentials);
      console.log('Successfully parsed credentials for project:', parsedCredentials.project_id);
    } catch (e) {
      console.error('Failed to parse credentials:', e);
      throw new Error('Failed to parse Google credentials JSON');
    }

    video_client = new VideoIntelligenceServiceClient({
      credentials: parsedCredentials,
      projectId: parsedCredentials.project_id
    });

    return video_client;
  } catch (error) {
    console.error('Failed to initialize video client:', error);
    throw new Error('Failed to initialize video analysis service');
  }
};

export async function POST(request: Request) {
  try {
    // Parse JSON request instead of form data
    const { blob_url } = await request.json();
    
    if (!blob_url) {
      console.error('Missing blob URL');
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Initialize video client
    const client = getVideoClient();

    // Fetch the video content from the blob URL
    const response = await fetch(blob_url);
    const buffer = await response.arrayBuffer();

    // Process with Google Cloud
    console.log('Starting Google Cloud analysis...');
    const [operation] = await client.annotateVideo({
      inputContent: Buffer.from(buffer).toString('base64'),
      features: [protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION],
    });

    const [analysisResponse] = await operation.promise();
    
    return NextResponse.json({
      shots: analysisResponse.annotationResults?.[0].shotAnnotations?.map(shot => ({
        start_time: Number(shot.startTimeOffset?.seconds) || 0,
        end_time: Number(shot.endTimeOffset?.seconds) || 0,
      })) || [],
      blob_url,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
} 