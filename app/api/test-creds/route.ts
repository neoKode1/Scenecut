import { NextResponse } from 'next/server';
import 'dotenv/config';

export async function GET() {
  console.log('Testing credentials...');
  
  // Check Google credentials
  const hasGoogleCreds = !!(
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_PROJECT_ID
  );

  // Check Anthropic key
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    success: true,
    google: {
      hasCredentials: hasGoogleCreds,
      projectId: process.env.GOOGLE_PROJECT_ID ? 'set' : 'missing',
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL ? 'set' : 'missing',
      privateKey: process.env.GOOGLE_PRIVATE_KEY ? 'set' : 'missing'
    },
    anthropic: {
      hasKey: hasAnthropicKey
    }
  });
} 