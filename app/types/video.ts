import { protos } from '@google-cloud/video-intelligence';

export interface Movement {
  timeOffset: number;
  position: protos.google.cloud.videointelligence.v1.INormalizedBoundingBox | null;
  confidence: number;
}

export interface ObjectTrack {
  description: string;
  confidence: number;
  timeSegment: {
    start: number;
    end: number;
  };
  movements: Movement[];
}

export interface PersonTrack {
  confidence: number;
  tracks: {
    confidence: number;
    timestamps: {
      time: number;
      position: any;
      attributes: {
        name: string;
        confidence: number;
      }[];
    }[];
  }[];
}

export interface CameraMotion {
  shotStart: number;
  shotEnd: number;
  primaryMotion: string;
  intensity: number;
  dominantObjects: Array<{
    type: string;
    confidence: number;
    screenPosition: { x: number; y: number };
  }>;
}

export interface DirectorInsight {
  intent: string;
  technical: string;
  context: string;
  suggestions: string[];
} 