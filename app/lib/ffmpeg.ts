import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function initFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Load FFmpeg
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.3/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export async function processVideo(videoFile: File): Promise<Uint8Array> {
  try {
    const ffmpeg = await initFFmpeg();
    
    // Write file to FFmpeg's virtual filesystem
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    // Process video with optimal settings for analysis
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-maxrate', '2M',
      '-bufsize', '4M',
      '-movflags', '+faststart',
      '-y', 'output.mp4'
    ]);
    
    // Read the processed file
    const data = await ffmpeg.readFile('output.mp4');
    
    // Cleanup
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');
    
    return data as Uint8Array;
  } catch (error) {
    console.error('FFmpeg processing error:', error);
    throw new Error('Video processing failed');
  }
} 