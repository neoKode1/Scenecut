'use client';

import { FC, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { upload } from '@vercel/blob/client';

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB - Vercel Edge Runtime limit

interface UploadResponse {
  url: string;
  pathname: string;
}

interface Shot {
  start_time: number;
  end_time: number;
}

interface AnalysisResult {
  shots: Shot[];
  blob_url: string;
}

interface ChatMessage {
  text: string;
  type: 'system' | 'error';
}

export const VideoAnalysis: FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [promptResult, setPromptResult] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addMessage = (text: string, type: ChatMessage['type']) => {
    setMessages(prev => [...prev, { text, type }]);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let blobUrl: string;
      
      // For files larger than 4.5MB, use client-side upload
      if (file.size > 4.5 * 1024 * 1024) {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload-blob',
          clientPayload: JSON.stringify({
            fileSize: file.size,
          })
        });
        blobUrl = blob.url;
      } else {
        // For smaller files, use the existing server-side upload
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/upload-blob', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        blobUrl = data.url;
      }

      // Send analysis request with proper headers
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blob_url: blobUrl }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed');
      }

      const data = await analysisResponse.json();
      setAnalysisResult(data);
      
      // Add analysis summary
      const totalShots = data.shots.length;
      const duration = data.shots[totalShots - 1]?.end_time || 0;
      addMessage(`Analysis complete! Found ${totalShots} shots over ${duration.toFixed(1)} seconds.`, 'system');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi']
    },
    maxSize: 4.5 * 1024 * 1024,
    multiple: false
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generatePrompt = async () => {
    if (!analysisResult) return;

    setIsGeneratingPrompt(true);
    addMessage('Generating detailed shot analysis...', 'system');

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisResult),
      });

      if (!response.ok) {
        throw new Error('Failed to generate prompt');
      }

      const data = await response.json();
      setPromptResult(data.analysis);
      addMessage('Analysis complete!', 'system');
    } catch (error) {
      addMessage('Error generating prompt', 'error');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <div className="video-analysis">
      <div {...getRootProps()} className={`upload-area ${isUploading ? 'uploading' : ''}`}>
        <input {...getInputProps()} />
        <p>{isUploading ? 'Uploading and analyzing...' : 'Drop video here or click to upload'}</p>
      </div>
      {uploadError && (
        <div className="message error">
          {uploadError}
        </div>
      )}

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
      </div>

      {analysisResult && (
        <div className="analysis-results">
          <div className="stats">
            <div className="stat">
              <h3>Total Shots</h3>
              <div className="value">{analysisResult.shots.length}</div>
            </div>
            <div className="stat">
              <h3>Scene Duration</h3>
              <div className="value">
                {formatTime(analysisResult.shots[analysisResult.shots.length - 1]?.end_time || 0)}
              </div>
            </div>
          </div>

          <div className="shot-list">
            <h3>Shot Details</h3>
            {analysisResult.shots.map((shot, index) => (
              <div key={index} className="shot-item">
                <span className="shot-number">Shot {index + 1}</span>
                <span className="shot-time">
                  {formatTime(shot.start_time)} - {formatTime(shot.end_time)}
                </span>
                <span className="shot-duration">
                  ({((shot.end_time - shot.start_time)).toFixed(1)}s)
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={generatePrompt}
            disabled={isGeneratingPrompt}
            className="generate-prompt-btn"
          >
            {isGeneratingPrompt ? 'Generating...' : 'Generate Camera Movement Prompt'}
          </button>

          {promptResult && (
            <div className="prompt-result">
              <h3>Shot Analysis</h3>
              <pre className="whitespace-pre-wrap">{promptResult}</pre>
              <button
                onClick={() => navigator.clipboard.writeText(promptResult)}
                className="copy-btn"
              >
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 