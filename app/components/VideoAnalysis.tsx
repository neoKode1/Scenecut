'use client';

import React from 'react';
import { ObjectTrack, PersonTrack, CameraMotion, DirectorInsight } from '@/types/video';

interface VideoAnalysisProps {
  shots: {
    startTime: number;
    endTime: number;
    duration: number;
    confidence: number;
  }[];
  objects: ObjectTrack[];
  people: PersonTrack[];
  cameraMotions: CameraMotion[];
  directorInsights: DirectorInsight[];
  duration: number;
}

export default function VideoAnalysis({ 
  shots, 
  objects, 
  people,
  cameraMotions, 
  directorInsights, 
  duration 
}: VideoAnalysisProps) {
  return (
    <div className="analysis-container mt-8">
      <h3 className="text-xl font-bold mb-4 text-cyan-400">Scene Analysis</h3>
      
      {/* Camera Movements */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-2 text-cyan-300">Camera Movements</h4>
        {cameraMotions?.map((motion, i) => (
          <div key={i} className="bg-gray-800 rounded p-3 mb-2">
            <p className="font-medium">Shot {i + 1}: {motion.shotStart}s - {motion.shotEnd}s</p>
            <p className="text-sm text-gray-400">
              Primary Motion: {motion.primaryMotion}
              {motion.intensity > 0.5 && ' (Fast)'}
            </p>
            <p className="text-sm text-gray-400">
              Dominant Objects: {motion.dominantObjects.map(obj => obj.type).join(', ')}
            </p>
            {directorInsights[i] && (
              <p className="text-sm text-cyan-300 mt-2">
                {directorInsights[i].intent} - {directorInsights[i].technical}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Objects */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-2 text-cyan-300">Objects & Elements</h4>
        {objects && objects.length > 0 ? (
          objects.map((obj, i) => (
            <div key={i} className="bg-gray-800 rounded p-3 mb-2">
              <p className="font-medium">{obj.description}</p>
              <p className="text-sm text-gray-400">
                Confidence: {(obj.confidence * 100).toFixed(1)}%
                <br />
                Duration: {obj.timeSegment.start}s - {obj.timeSegment.end}s
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No objects detected</p>
        )}
      </div>

      {/* People */}
      {people && people.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-2 text-cyan-300">People</h4>
          {people.map((person, i) => (
            <div key={i} className="bg-gray-800 rounded p-3 mb-2">
              <p>Person {i + 1}</p>
              <p className="text-sm text-gray-400">Confidence: {(person.confidence * 100).toFixed(1)}%</p>
              {person.tracks?.map((track, j) => (
                <div key={j} className="text-sm text-gray-400 mt-1">
                  <p>Track {j + 1}</p>
                  <p>Confidence: {(track.confidence * 100).toFixed(1)}%</p>
                  {track.timestamps?.map((timestamp, k) => (
                    <div key={k} className="ml-2">
                      <p>Time: {timestamp.time}s</p>
                      {timestamp.attributes?.map((attr, l) => (
                        <p key={l}>{attr.name}: {(attr.confidence * 100).toFixed(1)}%</p>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Director's Analysis */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-2 text-cyan-300">Director's Analysis</h4>
        {directorInsights?.map((insight, i) => (
          <div 
            key={i}
            className="bg-gray-800 rounded p-4 mb-3"
          >
            <h5 className="font-medium text-cyan-400 mb-2">Shot {i + 1}</h5>
            <div className="space-y-2 text-sm">
              <p><span className="text-cyan-300">Intent:</span> {insight.intent}</p>
              <p><span className="text-cyan-300">Technical:</span> {insight.technical}</p>
              <p><span className="text-cyan-300">Context:</span> {insight.context}</p>
              {insight.suggestions.length > 0 && (
                <div>
                  <span className="text-cyan-300">Suggestions:</span>
                  <ul className="list-disc list-inside pl-4 text-gray-300">
                    {insight.suggestions.map((suggestion: string, j: number) => (
                      <li key={j}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 