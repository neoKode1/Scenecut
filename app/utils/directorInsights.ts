import { Anthropic } from '@anthropic-ai/sdk';
import { CameraMotion } from '@/types/video';

interface ShotAnalysis {
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

export async function getDirectorInsights(analysisData: {
  shots: any[];
  objects: any[];
  cameraMotions: ShotAnalysis[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing Anthropic API key. Please ensure ANTHROPIC_API_KEY is set in your environment variables.');
  }

  const anthropic = new Anthropic({
    apiKey,
    defaultHeaders: {}
  });

  const shotDescriptions = analysisData.cameraMotions.map((motion, i) => `
Shot ${i + 1} (${motion.shotStart}s - ${motion.shotEnd}s):
- Camera Motion: ${motion.primaryMotion} (Intensity: ${Math.round(motion.intensity * 100)}%)
- Key Objects: ${motion.dominantObjects.map(obj => obj.type).join(', ')}
`).join('\n');

  const prompt = `As an experienced film director, analyze this sequence of shots and provide cinematic insights:

${shotDescriptions}

For each shot, provide:
1. The likely directorial intent
2. Technical execution details
3. How this shot might connect to the overall scene
4. Suggestions for improving or varying the shot

Format your response as a JSON array with one analysis per shot.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  try {
    const content = message.content[0];
    const textContent = 'text' in content ? content.text : content;
    const insights = JSON.parse(typeof textContent === 'string' ? textContent : '[]');
    
    return insights.map((insight: any) => ({
      intent: insight.intent || 'Analysis unavailable',
      technical: insight.technical || '',
      context: insight.context || '',
      suggestions: Array.isArray(insight.suggestions) ? insight.suggestions : []
    }));
  } catch (error) {
    console.error('Failed to parse director insights:', error);
    return analysisData.cameraMotions.map(() => ({
      intent: 'Analysis unavailable',
      technical: '',
      context: '',
      suggestions: []
    }));
  }
} 