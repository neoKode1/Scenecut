import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      throw new Error('Missing Google Cloud credentials');
    }

    const client = new VideoIntelligenceServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      },
      projectId: process.env.GOOGLE_PROJECT_ID
    });

    // Test with a small operation
    const testRequest = {
      inputUri: 'gs://cloud-samples-data/video/cat.mp4',
      features: [protos.google.cloud.videointelligence.v1.Feature.LABEL_DETECTION]
    };

    // Just check if we can initialize the request - don't wait for completion
    await client.annotateVideo(testRequest);

    return NextResponse.json({
      success: true,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL?.split('@')[0] + '@...',
        project_id: process.env.GOOGLE_PROJECT_ID,
        has_private_key: !!process.env.GOOGLE_PRIVATE_KEY
      }
    });

  } catch (error) {
    console.error('Google Cloud verification failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 