'use client';

import { FC } from 'react';
import { VideoAnalysis } from './components/VideoAnalysis';

const Home: FC = () => {
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
        <VideoAnalysis />
      </div>
    </div>
  );
};

export default Home; 