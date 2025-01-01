import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  
  return NextResponse.json({
    hasToken: !!token,
    tokenPrefix: token ? `${token.substring(0, 10)}...` : null,
    tokenLength: token?.length || 0
  });
} 