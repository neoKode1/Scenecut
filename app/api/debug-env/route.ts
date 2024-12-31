import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    return NextResponse.json({
      blob: {
        exists: !!blobToken,
        tokenPrefix: blobToken ? blobToken.substring(0, 10) : null,
        length: blobToken ? blobToken.length : 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 