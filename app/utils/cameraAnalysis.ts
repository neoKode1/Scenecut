import { ObjectTrack, Movement, CameraMotion } from '@/types/video';
import { protos } from '@google-cloud/video-intelligence';

type BoundingBox = protos.google.cloud.videointelligence.v1.INormalizedBoundingBox;

interface CameraMotionAnalysis {
  primary: string;
  secondary: string[];
  intensity: number;
}

function getAveragePosition(movements: Movement[]): { x: number; y: number } {
  if (!movements?.length) {
    return { x: 0, y: 0 };
  }

  const validMovements = movements.filter(m => {
    const pos = m.position;
    return pos && 
      typeof pos.left === 'number' && 
      typeof pos.right === 'number' &&
      typeof pos.top === 'number' &&
      typeof pos.bottom === 'number';
  });

  if (!validMovements.length) {
    return { x: 0, y: 0 };
  }

  const sum = validMovements.reduce((acc, m) => {
    // We know these values exist and are numbers due to our filter
    const pos = m.position!;
    const left = pos.left!;
    const right = pos.right!;
    const top = pos.top!;
    const bottom = pos.bottom!;
    
    const centerX = left + (right - left) / 2;
    const centerY = top + (bottom - top) / 2;
    return {
      x: acc.x + centerX,
      y: acc.y + centerY
    };
  }, { x: 0, y: 0 });

  return {
    x: sum.x / validMovements.length,
    y: sum.y / validMovements.length
  };
}

function detectCameraMotion(movements: Movement[]): CameraMotionAnalysis {
  if (movements.length < 2) {
    return { primary: 'static', secondary: [], intensity: 0 };
  }

  const vectors = [];
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1].position;
    const curr = movements[i].position;
    
    if (!prev || !curr || 
        typeof prev.left !== 'number' || 
        typeof prev.right !== 'number' ||
        typeof prev.top !== 'number' ||
        typeof prev.bottom !== 'number' ||
        typeof curr.left !== 'number' ||
        typeof curr.right !== 'number' ||
        typeof curr.top !== 'number' ||
        typeof curr.bottom !== 'number') {
      continue;
    }

    const prevCenter = {
      x: prev.left + (prev.right - prev.left) / 2,
      y: prev.top + (prev.bottom - prev.top) / 2
    };
    
    const currCenter = {
      x: curr.left + (curr.right - curr.left) / 2,
      y: curr.top + (curr.bottom - curr.top) / 2
    };

    const scale = (curr.right - curr.left) / (prev.right - prev.left);
    
    vectors.push({
      dx: currCenter.x - prevCenter.x,
      dy: currCenter.y - prevCenter.y,
      scale
    });
  }

  // Analyze vectors to determine camera motion
  const avgVector = vectors.reduce((acc, v) => ({
    dx: acc.dx + v.dx,
    dy: acc.dy + v.dy,
    scale: acc.scale + v.scale
  }), { dx: 0, dy: 0, scale: 0 });

  avgVector.dx /= vectors.length;
  avgVector.dy /= vectors.length;
  avgVector.scale /= vectors.length;

  // Determine primary motion
  const motions: string[] = [];
  const threshold = 0.05;

  if (Math.abs(avgVector.dx) > threshold) {
    motions.push(avgVector.dx > 0 ? 'pan-right' : 'pan-left');
  }
  if (Math.abs(avgVector.dy) > threshold) {
    motions.push(avgVector.dy > 0 ? 'tilt-down' : 'tilt-up');
  }
  if (Math.abs(avgVector.scale - 1) > threshold) {
    motions.push(avgVector.scale > 1 ? 'zoom-out' : 'zoom-in');
  }

  // Calculate motion intensity
  const intensity = Math.sqrt(
    avgVector.dx * avgVector.dx + 
    avgVector.dy * avgVector.dy + 
    (avgVector.scale - 1) * (avgVector.scale - 1)
  );

  return {
    primary: motions[0] || 'static',
    secondary: motions.slice(1),
    intensity: Math.min(intensity * 5, 1) // Normalize to 0-1
  };
}

export function analyzeCameraMovements(objects: ObjectTrack[], shots: any[]): CameraMotion[] {
  return shots.map(shot => {
    const shotObjects = objects.filter(obj => 
      obj.timeSegment.start >= shot.startTime && 
      obj.timeSegment.end <= shot.endTime
    );

    const movements = shotObjects.flatMap(obj => obj.movements || []);
    const cameraMotion = detectCameraMotion(movements);
    
    return {
      shotStart: shot.startTime,
      shotEnd: shot.endTime,
      primaryMotion: cameraMotion.primary,
      intensity: cameraMotion.intensity,
      dominantObjects: shotObjects.map(obj => ({
        type: obj.description,
        confidence: obj.confidence,
        screenPosition: getAveragePosition(obj.movements)
      }))
    };
  });
} 