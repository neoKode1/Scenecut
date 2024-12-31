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
      parsedCredentials = JSON.parse(credentials);
      console.log('Initializing video client for project:', parsedCredentials.project_id);
    } catch (e) {
      console.error('Failed to parse credentials:', e);
      throw new Error(`Failed to parse Google credentials JSON: ${e.message}`);
    }

    // Create client with explicit credentials
    video_client = new VideoIntelligenceServiceClient({
      credentials: parsedCredentials,
      projectId: parsedCredentials.project_id
    });

    return video_client;
  } catch (error) {
    console.error('Failed to initialize video client:', error);
    throw error; // Preserve the original error
  }
};

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json();
    console.log('Received analysis request for URL:', body.url);

    // Initialize video client
    const client = getVideoClient();
    console.log('Video client initialized successfully');

    // Start the video analysis
    const [operation] = await client.annotateVideo({
      inputUri: body.url,
      features: ['SHOT_CHANGE_DETECTION'],
    });

    console.log('Analysis operation started:', operation.name);

    // Wait for operation to complete
    const [response] = await operation.promise();
    console.log('Analysis completed successfully');

    return NextResponse.json({
      shots: response.annotationResults?.[0]?.shotAnnotations || [],
      blob_url: body.url
    });

  } catch (error: any) {
    console.error('Analysis failed:', error);
    
    // Return a detailed error response
    return NextResponse.json({
      error: 'Analysis failed',
      details: {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'Present' : 'Missing'
      }
    }, { status: 500 });
  }
} 