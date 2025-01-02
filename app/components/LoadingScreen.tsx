'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
  onLoadingComplete: () => void;
  progress?: number;
  children: React.ReactNode;
}

const LOADING_VIDEOS = [
  '/videos/loading.mp4',
  '/videos/a82277d7-5e03-4dbc-8a68-225ec5b9b849.mp4',
  '/videos/Professional_Mode_Intent_Transition_to_an_environm (1).mp4'
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isLoading, 
  onLoadingComplete, 
  progress: externalProgress, 
  children 
}) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const [videoSrc, setVideoSrc] = useState('');
  const progress = typeof externalProgress === 'number' ? externalProgress : internalProgress;

  useEffect(() => {
    if (isLoading) {
      // Select a random video when loading starts
      const randomIndex = Math.floor(Math.random() * LOADING_VIDEOS.length);
      setVideoSrc(LOADING_VIDEOS[randomIndex]);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading && typeof externalProgress !== 'number') {
      const interval = setInterval(() => {
        setInternalProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(interval);
            onLoadingComplete();
            return 100;
          }
          return prevProgress + 1;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isLoading, onLoadingComplete, externalProgress]);

  if (!isLoading) {
    return children;
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        {videoSrc && (
          <video 
            key={videoSrc} // Key prop ensures video changes when src changes
            className="w-full h-full object-cover opacity-50"
            autoPlay 
            muted 
            loop
            playsInline
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Loading Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        {/* Logo or Title */}
        <h1 className="text-4xl font-bold text-white mb-8">Analyzing Video</h1>

        {/* Spinner */}
        <div className="rounded-full bg-black bg-opacity-50 p-8">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
        
        {/* Progress Circle */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-gray-600 stroke-current"
              strokeWidth="8"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
            />
            <circle
              className="text-white stroke-current transition-all duration-300 ease-in-out"
              strokeWidth="8"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * progress) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-xl font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-white text-lg">
          {progress < 33 && "Detecting shots and movements..."}
          {progress >= 33 && progress < 66 && "Analyzing camera techniques..."}
          {progress >= 66 && progress < 100 && "Generating insights..."}
          {progress === 100 && "Analysis complete!"}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 