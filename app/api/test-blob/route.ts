import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  const storage = new Storage({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    }
  });

  const bucket = storage.bucket('scenecut');

  if (!url) {
    try {
      const [files] = await bucket.getFiles();
      return NextResponse.json({
        message: 'Listing recent files',
        debug: {
          file_count: files.length,
          recent_files: files.slice(0, 5).map(f => ({
            name: f.name,
            size: f.metadata.size,
            contentType: f.metadata.contentType,
            updated: f.metadata.updated
          }))
        }
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }

  try {
    const filename = url.split('/').pop();
    if (!filename) throw new Error('Invalid URL');

    const file = bucket.file(filename);
    const [exists] = await file.exists();
    const [metadata] = exists ? await file.getMetadata() : [null];

    return NextResponse.json({
      exists,
      metadata,
      url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      exists: false,
      error: error instanceof Error ? error.message : 'Verification failed',
      url
    }, { status: 500 });
  }
} 