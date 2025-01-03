import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('Starting upload process...');

    // Check credentials and bucket name
    if (!process.env.GOOGLE_CLIENT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY || 
        !process.env.GOOGLE_PROJECT_ID ||
        !process.env.GOOGLE_STORAGE_BUCKET) {
      throw new Error('Missing Google Cloud configuration');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const storage = new Storage({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET);
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const blob = bucket.file(uniqueFilename);

    console.log('Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Starting file upload to GCS...');
    await blob.save(buffer, {
      metadata: {
        contentType: file.type
      }
    });

    const [url] = await blob.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

    console.log('Upload successful:', url);

    return NextResponse.json({
      success: true,
      url,
      size: file.size,
      filename: uniqueFilename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 