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