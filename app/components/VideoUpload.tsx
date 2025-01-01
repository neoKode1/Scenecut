import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

interface VideoUploadProps {
  onVideoProcessed: (analysisData: any, duration: number) => void;
  onError: (error: string) => void;
  onStatusUpdate: (status: string) => void;
}

export default function VideoUpload({ onVideoProcessed, onError, onStatusUpdate }: VideoUploadProps) {
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function verifyCredentials() {
      try {
        setIsVerifying(true);
        console.log('Verifying credentials...');
        const response = await fetch('/api/test-creds');
        const data = await response.json();
        
        console.log('Credential response:', data);
        
        const hasAllCreds = data.google.hasCredentials && data.anthropic.hasKey;
        if (!hasAllCreds) {
          const missing = [];
          if (!data.google.hasCredentials) missing.push('Google Cloud');
          if (!data.anthropic.hasKey) missing.push('Anthropic');
          throw new Error(`Missing credentials for: ${missing.join(', ')}`);
        }
        
        console.log('All credentials verified');
        setCredentialsVerified(true);
      } catch (error) {
        console.error('Credential verification failed:', error);
        onError(error instanceof Error ? error.message : 'Failed to verify credentials');
        setCredentialsVerified(false);
      } finally {
        setIsVerifying(false);
      }
    }

    verifyCredentials();
  }, [onError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Drop event triggered', {
      files: acceptedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
      credentialsVerified
    });
    
    if (!credentialsVerified) {
      onError('Please wait for credentials verification.');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) {
      console.log('No file provided');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      onStatusUpdate('Processing video...');
      console.log('Starting video analysis for file:', file.name);

      // Get video duration first
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      
      const duration = await new Promise<number>((resolve, reject) => {
        video.onloadedmetadata = () => {
          resolve(video.duration);
        };
        video.onerror = () => {
          reject(new Error('Failed to load video metadata'));
        };
      });

      console.log('Video duration:', duration);

      // Analyze the video
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      console.log('Analysis response status:', analysisResponse.status);
      const analysisData = await analysisResponse.json();
      console.log('Analysis response data:', analysisData);
      
      if (!analysisResponse.ok || !analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      if (!analysisData.analysis) {
        throw new Error('Invalid analysis data format');
      }

      onVideoProcessed(analysisData, duration);
      onStatusUpdate('Analysis complete!');

    } catch (error) {
      console.error('Processing error:', error);
      onError(error instanceof Error ? error.message : 'Processing failed');
    }
  }, [onVideoProcessed, onError, onStatusUpdate, credentialsVerified]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 1,
    disabled: !credentialsVerified || isVerifying
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (credentialsVerified && inputRef.current && !isVerifying) {
      console.log('Triggering file input click');
      inputRef.current.click();
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`upload-area ${!credentialsVerified || isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-cyan-400'}`}
      onClick={handleClick}
    >
      <input {...getInputProps()} ref={inputRef} />
      {isVerifying ? (
        <p className="text-lg mb-2">Verifying credentials...</p>
      ) : !credentialsVerified ? (
        <p className="text-lg mb-2 text-red-400">Missing required credentials</p>
      ) : isDragActive ? (
        <p className="text-lg mb-2">Drop your video here</p>
      ) : (
        <>
          <p className="text-lg mb-2">Drop your video here or click to select</p>
          <p className="text-sm text-gray-400">MP4, MOV, or AVI (max 100MB)</p>
        </>
      )}
    </div>
  );
} 