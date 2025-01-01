export interface ChatMessage {
  text: string;
  type: 'system' | 'error' | 'technical';
}

export interface AnalysisResult {
  shots: {
    start_time: number;
    end_time: number;
  }[];
  blob_url: string;
}

export interface VideoAnalysis {
  shotChanges: {
    startTime: number;
    endTime: number;
    description?: string;
  }[];
  cameraMovements: string[];
  timeline: string[];
  recreationSteps: string[];
}

export interface UploadResponse {
  blobUrl: string;
  success: boolean;
  error?: string;
} 