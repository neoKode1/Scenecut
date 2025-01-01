import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL?.split('@')[0] + '@...',
    private_key_length: process.env.GOOGLE_PRIVATE_KEY?.length,
    private_key_start: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50),
    env_keys: Object.keys(process.env).filter(key => key.startsWith('GOOGLE_'))
  });
} 