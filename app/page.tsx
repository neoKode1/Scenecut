'use client';

import { FC, useState } from 'react';
import VideoAnalysis from './components/VideoAnalysis';
import VideoUpload from './components/VideoUpload';
import { ObjectTrack, PersonTrack, CameraMotion, DirectorInsight } from '@/types/video';

interface AnalysisData {
  shots: Array<{
    startTime: number;
    endTime: number;
    duration: number;
    confidence: number;
  }>;
  objects: ObjectTrack[];
  people: PersonTrack[];
  cameraMotions: CameraMotion[];
  directorInsights: DirectorInsight[];
}

const Home: FC = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleVideoProcessed = (data: any, videoDuration: number) => {
    console.log('Received analysis data:', data);
    if (data.analysis) {
      setAnalysisData({
        shots: data.analysis.shots,
        objects: data.analysis.objects,
        people: data.analysis.people,
        cameraMotions: data.analysis.cameraMotions,
        directorInsights: data.analysis.directorInsights
      });
      setDuration(videoDuration);
      setError('');
    } else {
      setError('Invalid analysis data received');
    }
  };

  return (
    <div className="app-container">
      <div className="instructions-panel">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">How to Use Scenecut</h2>
        <ol className="list-decimal list-inside space-y-4 mb-6 text-gray-300">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>Upload your video clip for reshoot analysis</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>AI will analyze camera movements and scene composition</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>Get detailed camera directions for recreating the shot</span>
          </li>
        </ol>
        <div className="tip">
          <span className="mr-2">💡</span>
          Tip: For best results, use clips under 1 minute and smaller than 15MB
        </div>
      </div>
      
      <div className="main-content">
        <VideoUpload 
          onVideoProcessed={handleVideoProcessed}
          onError={setError}
          onStatusUpdate={setStatus}
        />
        
        {status && <p className="message system">{status}</p>}
        {error && <p className="message error">{error}</p>}
        
        {analysisData && (
          <VideoAnalysis 
            shots={analysisData.shots}
            objects={analysisData.objects}
            people={analysisData.people}
            cameraMotions={analysisData.cameraMotions}
            directorInsights={analysisData.directorInsights}
            duration={duration}
          />
        )}
      </div>
    </div>
  );
};

export default Home; 