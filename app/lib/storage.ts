import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID
  },
  projectId: process.env.GOOGLE_PROJECT_ID
});

const bucket = storage.bucket('scenecut');

export async function uploadFile(file: File, filename: string) {
  const blob = bucket.file(filename);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.type,
    },
  });

  const buffer = await file.arrayBuffer();
  
  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => reject(err));
    blobStream.on('finish', async () => {
      // Make the file public
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/scenecut/${filename}`;
      resolve({
        url: publicUrl,
        size: file.size,
        pathname: filename
      });
    });
    
    blobStream.end(Buffer.from(buffer));
  });
} 