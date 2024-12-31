'use client';

import { FC, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { upload } from '@vercel/blob/client';
import { AnalysisStats } from './AnalysisStats';

interface Message {
  text: string;
  type: 'system' | 'error';
  timestamp: number;
}

interface Shot {
  start_time: number;
  end_time: number;
}

interface AnalysisResult {
  shots: Shot[];
  url: string;
  total_shots: number;
  duration: number;
  cameraDirections?: string;
}

export const VideoAnalysis: FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopyDirections = useCallback(() => {
    if (analysisResult?.cameraDirections) {
      navigator.clipboard.writeText(analysisResult.cameraDirections);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [analysisResult]);

  const addMessage = useCallback((text: string, type: 'system' | 'error') => {
    setMessages(prev => [...prev, {
      text,
      type,
      timestamp: Date.now()
    }]);
  }, []);

  const checkVideoPlayability = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.onloadeddata = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      
      video.src = url;
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    addMessage('Starting upload...', 'system');

    try {
      // Upload to blob storage
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-blob'
      });

      if (!blob?.url) {
        throw new Error('Upload failed - no URL returned');
      }

      addMessage('Upload complete, starting analysis...', 'system');

      // Call analyze endpoint with explicit no-cache
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ 
          url: blob.url,
          metadata: {
            type: file.type,
            size: file.size,
            name: file.name
          }
        }),
      });

      // Log the response headers for debugging
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn('Unexpected content type:', contentType);
        // Try to parse as JSON anyway
      }

      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response:', text);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        throw new Error(data.details || 'Analysis failed');
      }

      console.log('Analysis result:', data);
      setAnalysisResult(data);
      addMessage('Analysis complete, generating shot breakdown...', 'system');

      // Call Anthropic API with the analysis results
      const promptResponse = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shots: data.shots,
          blob_url: blob.url
        }),
      });

      const promptData = await promptResponse.json();
      if (!promptResponse.ok) {
        throw new Error(promptData.error || 'Failed to generate shot breakdown');
      }

      // Add the analysis to the UI
      setAnalysisResult({
        ...data,
        cameraDirections: promptData.analysis
      });
      addMessage('Shot breakdown complete!', 'system');

    } catch (error) {
      console.error('Upload/Analysis error:', error);
      setUploadError(
        error instanceof Error 
          ? error.message 
          : 'Upload or analysis failed'
      );
      addMessage(
        error instanceof Error 
          ? error.message 
          : 'Upload or analysis failed',
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  }, [addMessage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    disabled: isUploading,
    maxSize: 15 * 1024 * 1024 // 15MB limit
  });

  return (
    <div className="analysis-container">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Uploading and analyzing video...</p>
        ) : (
          <p>
            Drag & drop a video file here, or click to select one<br/>
            <small>Supported format: MP4 (H.264)</small>
          </p>
        )}
      </div>
      {uploadError && (
        <div className="error-message">
          {uploadError}
        </div>
      )}
      <div className="messages">
        {messages.map((message, index) => (
          <div key={message.timestamp} className={`message ${message.type}`}>
            {message.text}
          </div>
        ))}
      </div>
      {analysisResult && (
        <div className="analysis-results">
          <div className="stats">
            <div className="stat">
              <h3>Total Shots</h3>
              <div className="value">{analysisResult.total_shots}</div>
            </div>
            <div className="stat">
              <h3>Scene Duration</h3>
              <div className="value">{analysisResult.duration.toFixed(1)}s</div>
            </div>
          </div>

          <div className="shot-timeline-section">
            <h3 className="text-cyan-400 text-lg font-bold mb-2">Shot Timeline</h3>
            <div className="shot-timeline">
              {analysisResult.shots.map((shot, index) => (
                <div
                  key={index}
                  className="shot-segment"
                  style={{
                    width: `${((shot.end_time - shot.start_time) / analysisResult.duration) * 100}%`
                  }}
                  title={`Shot ${index + 1}: ${shot.start_time.toFixed(1)}s - ${shot.end_time.toFixed(1)}s`}
                />
              ))}
            </div>
          </div>

          <div className="shots-breakdown mt-6">
            <h3 className="text-cyan-400 text-lg font-bold mb-2">Shot Breakdown</h3>
            {analysisResult.shots.map((shot, index) => (
              <div key={index} className="shot-item">
                <span className="shot-number">Shot {index + 1}:</span>
                <span className="shot-time">
                  {shot.start_time.toFixed(1)}s - {shot.end_time.toFixed(1)}s
                </span>
                <span className="shot-duration">
                  ({(shot.end_time - shot.start_time).toFixed(1)}s)
                </span>
              </div>
            ))}
          </div>

          {analysisResult.cameraDirections && (
            <div className="camera-directions mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-cyan-400 text-lg font-bold">Camera Directions</h3>
                <button
                  onClick={handleCopyDirections}
                  className="copy-button"
                  title="Copy camera directions"
                >
                  {copied ? '✓ Copied!' : 'Copy Instructions'}
                </button>
              </div>
              <div className="directions-content bg-gray-900/50 p-4 rounded-lg">
                {analysisResult.cameraDirections.split('\n').map((line, index) => (
                  <p key={index} className="mb-2">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add some styles to make the dropzone visible
const styles = `
.dropzone {
  border: 2px dashed #cccccc;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.dropzone.active {
  border-color: #2196f3;
  background-color: rgba(33, 150, 243, 0.1);
}

.dropzone.uploading {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin-top: 10px;
}

.messages {
  margin-top: 1rem;
}

.message {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.message.system {
  background-color: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.message.error {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}
`; 