import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

export const runtime = 'nodejs';

const getVideoClient = () => {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
    throw new Error('Missing Google Cloud credentials in environment variables');
  }

  return new VideoIntelligenceServiceClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    },
    projectId: process.env.GOOGLE_PROJECT_ID
  });
};

export async function GET() {
  try {
    // Try to initialize the client
    const client = getVideoClient();
    
    // Get the client configuration to verify credentials
    const auth = await client.getProjectId();
    
    return NextResponse.json({
      success: true,
      projectId: auth,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL?.split('@')[0] + '@...',
        project_id: process.env.GOOGLE_PROJECT_ID,
        has_private_key: !!process.env.GOOGLE_PRIVATE_KEY
      }
    });
  } catch (error: any) {
    console.error('Credentials test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 