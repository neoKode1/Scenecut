import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyPrefix: process.env.ANTHROPIC_API_KEY ? 
      `${process.env.ANTHROPIC_API_KEY.substring(0, 5)}...` : 
      null,
    allEnvKeys: Object.keys(process.env),
    nodeEnv: process.env.NODE_ENV,
    // Add raw key value for debugging (we'll remove this after testing)
    rawKey: process.env.ANTHROPIC_API_KEY
  });
} 