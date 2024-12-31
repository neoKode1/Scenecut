import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

// New way to configure the API route
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token || typeof token !== 'string') {
      console.error('Invalid BLOB_READ_WRITE_TOKEN:', typeof token);
      return NextResponse.json(
        { error: 'Storage configuration error' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const uploadResponse = await handleUpload({
        body: await request.json(),
        request,
        token,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
          maximumSizeInBytes: 100 * 1024 * 1024,
        }),
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('Upload completed:', blob.url);
        },
      });

      // Convert handleUpload response to a proper Response object
      return NextResponse.json(uploadResponse);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: 'public',
      token,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
} 