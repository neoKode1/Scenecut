import { handleUpload } from '@vercel/blob/client';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

interface ClientPayload {
  fileSize: number;
}

export async function POST(request: Request) {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable');
      return NextResponse.json(
        { error: 'Storage configuration error' },
        { status: 500 }
      );
    }

    // Check if it's a client-side upload request
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Handle client-side upload
      const jsonResponse = await handleUpload({
        body: await request.json(),
        request,
        token: blobToken,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          // Parse the stringified payload
          const payload: ClientPayload = clientPayload ? JSON.parse(clientPayload) : { fileSize: 0 };
          
          return {
            allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
            maximumSizeInBytes: Math.max(payload.fileSize, 100 * 1024 * 1024), // Use file size or 100MB max
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('blob upload completed', blob);
        },
      });

      return NextResponse.json(jsonResponse);
    } else {
      // Handle server-side upload (for files < 4.5MB)
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (file.size > 4.5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large for server upload. Please use client-side upload.' },
          { status: 400 }
        );
      }

      const blob = await put(file.name, file, {
        access: 'public',
        token: blobToken,
      });

      return NextResponse.json(blob);
    }
  } catch (error) {
    console.error('Blob upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
} 