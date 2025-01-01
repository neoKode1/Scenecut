import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    console.log('Starting upload process...');

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      throw new Error('Missing Google Cloud credentials');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    const storage = new Storage({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    const bucket = storage.bucket('scenecut');
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const gcsFile = bucket.file(uniqueFilename);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload without ACL settings
    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type
      }
    });

    // Generate signed URL for 1 hour access
    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

    console.log('Upload successful:', signedUrl);

    return NextResponse.json({
      success: true,
      url: signedUrl,
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