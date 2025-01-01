import { NextResponse } from 'next/server';

export async function GET() {
  const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  let googleDetails = null;

  if (googleCreds) {
    try {
      const parsed = JSON.parse(googleCreds);
      googleDetails = {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        valid_json: true
      };
    } catch (e) {
      googleDetails = { error: 'Invalid JSON format' };
    }
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    credentials: {
      google: {
        exists: !!googleCreds,
        details: googleDetails
      },
      blob: {
        exists: !!process.env.SCENECUT_READ_WRITE_TOKEN,
        prefix: process.env.SCENECUT_READ_WRITE_TOKEN?.substring(0, 10) + '...'
      },
      anthropic: {
        exists: !!process.env.ANTHROPIC_API_KEY,
        prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...'
      }
    }
  });
} 