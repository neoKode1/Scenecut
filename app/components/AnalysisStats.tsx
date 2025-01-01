import { FC } from 'react';
import { VideoAnalysis } from '@/types';

interface AnalysisStatsProps {
  data: {
    shotChanges: Array<{
      startTime: number;
      endTime: number;
      description?: string;
    }>;
    cameraMovements: string[];
    timeline: string[];
    recreationSteps: string[];
  };
}

export const AnalysisStats: FC<AnalysisStatsProps> = ({ data }) => {
  if (!data?.shotChanges?.length) {
    return null;
  }

  const totalDuration = data.shotChanges[data.shotChanges.length - 1]?.endTime || 0;

  return (
    <div className="stats-container">
      <div className="stat-item">
        <div className="stat-label">Scene Duration</div>
        <div className="text-2xl">
          {typeof totalDuration === 'number' ? totalDuration.toFixed(1) : '0.0'}s
        </div>
      </div>

      <div className="stat-item">
        <div className="stat-label">Shot Count</div>
        <div className="text-2xl">{data.shotChanges.length}</div>
      </div>

      {data.shotChanges.length > 0 && (
        <div className="stat-item">
          <div className="stat-label">Shot Timeline</div>
          <div className="shot-timeline">
            {data.shotChanges.map((shot, index) => {
              const width = typeof shot.startTime === 'number' && 
                          typeof shot.endTime === 'number' && 
                          typeof totalDuration === 'number' && 
                          totalDuration > 0
                ? ((shot.endTime - shot.startTime) / totalDuration) * 100
                : 0;

              return (
                <div
                  key={index}
                  className="shot-segment tooltip"
                  style={{
                    width: `${width}%`
                  }}
                  title={`Shot ${index + 1}: ${
                    typeof shot.startTime === 'number' ? shot.startTime.toFixed(1) : '0.0'
                  }s - ${
                    typeof shot.endTime === 'number' ? shot.endTime.toFixed(1) : '0.0'
                  }s`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="shots-breakdown mt-6">
        <h3 className="text-cyan-400 text-lg font-bold mb-2">Shot Breakdown</h3>
        {data.shotChanges.map((shot, index) => (
          <div key={index} className="shot-item">
            <span className="shot-number">Shot {index + 1}:</span>
            <span className="shot-time">
              {typeof shot.startTime === 'number' ? shot.startTime.toFixed(1) : '0.0'}s - 
              {typeof shot.endTime === 'number' ? shot.endTime.toFixed(1) : '0.0'}s
            </span>
            <span className="shot-duration">
              ({typeof shot.startTime === 'number' && typeof shot.endTime === 'number' 
                ? (shot.endTime - shot.startTime).toFixed(1) 
                : '0.0'}s)
            </span>
            {shot.description && (
              <span className="shot-description ml-2 text-gray-400">
                {shot.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 