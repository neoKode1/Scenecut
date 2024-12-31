import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if credentials exist
    const hasGoogleCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

    // Get all environment variables (excluding sensitive data)
    const safeEnvKeys = Object.keys(process.env).filter(key => 
      !key.toLowerCase().includes('key') && 
      !key.toLowerCase().includes('token') &&
      !key.toLowerCase().includes('secret')
    );

    // Try parsing Google credentials if they exist
    let googleCredsValid = false;
    let projectId = null;
    if (hasGoogleCreds) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '');
        googleCredsValid = !!(creds.project_id && creds.private_key);
        projectId = creds.project_id;
      } catch (e) {
        console.error('Failed to parse Google credentials:', e);
      }
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      vercel: {
        environment: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
      },
      credentials: {
        google: {
          exists: hasGoogleCreds,
          valid: googleCredsValid,
          projectId: projectId // Only showing project ID, not sensitive data
        },
        blob: {
          exists: hasBlobToken
        },
        anthropic: {
          exists: hasAnthropicKey
        }
      },
      availableEnvKeys: safeEnvKeys
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Failed to check environment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 