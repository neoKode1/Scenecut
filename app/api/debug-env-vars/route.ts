import { NextResponse } from 'next/server';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export async function GET() {
  try {
    // Get all environment variables
    const envKeys = Object.keys(process.env).filter(key => 
      key.startsWith('GOOGLE_') || key.startsWith('ANTHROPIC_')
    );

    return NextResponse.json({
      success: true,
      env: {
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Not set',
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Not set',
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Not set',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set',
        NODE_ENV: process.env.NODE_ENV,
        PWD: process.env.PWD,
        ENV_KEYS: envKeys
      }
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check environment variables'
    }, { status: 500 });
  }
}
