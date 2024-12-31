import { FC } from 'react';
import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult;
}

export const AnalysisStats: FC<Props> = ({ data }) => {
  const shots = data.shots || [];
  
  return (
    <div className="analysis-stats">
      <div className="stat-item">
        <div className="stat-label">Total Shots</div>
        <div className="text-2xl">{shots.length}</div>
      </div>
      <div className="stat-item">
        <div className="stat-label">Scene Duration</div>
        <div className="text-2xl">
          {shots.length > 0 ? 
            `${shots[shots.length - 1].end_time.toFixed(2)}s` : 
            'N/A'}
        </div>
      </div>
      {shots.length > 0 && (
        <div className="stat-item">
          <div className="stat-label">Shot Timeline</div>
          <div className="shot-timeline">
            {shots.map((shot, index) => (
              <div
                key={index}
                className="shot-segment tooltip"
                style={{
                  width: `${(shot.end_time - shot.start_time) * 100 / shots[shots.length - 1].end_time}%`
                }}
                title={`Shot ${index + 1}: ${shot.start_time.toFixed(1)}s - ${shot.end_time.toFixed(1)}s`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 