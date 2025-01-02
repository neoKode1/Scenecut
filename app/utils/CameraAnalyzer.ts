import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import { Anthropic } from '@anthropic-ai/sdk';
import Long = require('long');

const { Feature } = protos.google.cloud.videointelligence.v1;

// Import correct types from the protos
type IAnnotateVideoResponse = protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse;
type IVideoAnnotationResults = protos.google.cloud.videointelligence.v1.IVideoAnnotationResults;
type IObjectTrackingFrame = protos.google.cloud.videointelligence.v1.IObjectTrackingFrame;
type IObjectTrackingAnnotation = protos.google.cloud.videointelligence.v1.IObjectTrackingAnnotation;
type IFaceDetectionAnnotation = protos.google.cloud.videointelligence.v1.IFaceDetectionAnnotation;
type INormalizedBoundingBox = protos.google.cloud.videointelligence.v1.INormalizedBoundingBox;
type IDuration = protos.google.protobuf.IDuration;
type IPersonDetectionAnnotation = protos.google.cloud.videointelligence.v1.IPersonDetectionAnnotation;

interface ShotInfo {
  timestamp: number;
  duration: number;
  shotType: string;
  movement: string;
  description: string;
}

export class CameraAnalyzer {
  private videoClient: VideoIntelligenceServiceClient;
  private anthropic: Anthropic;

  constructor() {
    this.videoClient = new VideoIntelligenceServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private getTimeFromOffset(duration: IDuration | null | undefined): number {
    if (!duration) return 0;
    const seconds = typeof duration.seconds === 'string' ? parseInt(duration.seconds) : 
                   duration.seconds instanceof Long ? duration.seconds.toNumber() :
                   Number(duration.seconds || 0);
    return seconds + (Number(duration.nanos || 0) / 1e9);
  }

  async analyzeVideo(videoContent: string) {
    try {
      console.log('Starting video analysis...');
      
      const request = {
        inputContent: videoContent,
        features: [
          Feature.SHOT_CHANGE_DETECTION,
          Feature.OBJECT_TRACKING,
          Feature.PERSON_DETECTION,
          Feature.FACE_DETECTION,
        ],
        videoContext: {
          segments: [{
            startTimeOffset: { seconds: '0' },
            endTimeOffset: { seconds: '300' }  // Analyze up to 5 minutes
          }]
        }
      };

      console.log('Sending request to Google Cloud...');
      const [operation] = await this.videoClient.annotateVideo(request);
      
      console.log('Waiting for operation to complete...');
      const [operationResult] = await operation.promise();

      if (!operationResult || !operationResult.annotationResults?.[0]) {
        throw new Error('No analysis results returned');
      }

      const annotations = operationResult.annotationResults[0];
      console.log('Analysis complete. Processing results...');
      console.log('Raw annotation results:', JSON.stringify(annotations, null, 2));

      // If no shot changes detected, treat the whole video as one shot
      let shotChanges = annotations.shotAnnotations || [];
      if (shotChanges.length === 0) {
        const videoSegment = annotations.segment;
        if (videoSegment) {
          shotChanges = [{
            startTimeOffset: videoSegment.startTimeOffset,
            endTimeOffset: videoSegment.endTimeOffset
          }];
        }
      }

      const shots: ShotInfo[] = [];
      
      for (let i = 0; i < shotChanges.length; i++) {
        const shot = shotChanges[i];
        const startTime = this.getTimeFromOffset(shot.startTimeOffset);
        const endTime = this.getTimeFromOffset(shot.endTimeOffset);
        
        // Get all object tracks that overlap with this shot's time range
        const relevantObjects = (annotations.objectAnnotations || []).filter((obj: IObjectTrackingAnnotation) => {
          const frames = obj.frames || [];
          if (frames.length === 0) return false;
          const objStart = this.getTimeFromOffset(frames[0].timeOffset);
          const objEnd = this.getTimeFromOffset(frames[frames.length - 1].timeOffset);
          return objStart <= endTime && objEnd >= startTime;
        });

        // Get all person tracks that overlap with this shot
        const relevantPersons = (annotations.personDetectionAnnotations || []).filter((person: IObjectTrackingAnnotation) => {
          const frames = person.frames || [];
          if (frames.length === 0) return false;
          const trackStart = this.getTimeFromOffset(frames[0].timeOffset);
          const trackEnd = this.getTimeFromOffset(frames[frames.length - 1].timeOffset);
          return trackStart <= endTime && trackEnd >= startTime;
        });

        const shotInfo: ShotInfo = {
          timestamp: startTime,
          duration: endTime - startTime,
          shotType: this.determineShotType(relevantObjects, relevantPersons, annotations),
          movement: this.determineMovement(relevantObjects, relevantPersons, startTime, endTime),
          description: this.generateDescription(relevantObjects, relevantPersons, annotations),
        };
        
        shots.push(shotInfo);
      }

      console.log('Processed shots:', JSON.stringify(shots, null, 2));

      const directorAnalysis = await this.getDirectorAnalysis(shots);

      return shots.map((shot, index) => ({
        ...shot,
        directorAnalysis: directorAnalysis[index] || 'Analysis unavailable',
      }));

    } catch (error) {
      console.error('Error in analyzeVideo:', error);
      throw error;
    }
  }

  private determineShotType(
    objects: IObjectTrackingAnnotation[],
    persons: IObjectTrackingAnnotation[],
    annotations: IVideoAnnotationResults
  ): string {
    const faces = annotations.faceDetectionAnnotations || [];
    const faceBoxes = faces.flatMap((face: IFaceDetectionAnnotation) => 
      (face.tracks || [])
        .flatMap(track => track.timestampedObjects || [])
        .map(obj => obj.normalizedBoundingBox)
        .filter((box): box is INormalizedBoundingBox => box !== null && box !== undefined)
    );

    // Calculate average face size from the largest faces in each frame
    if (faceBoxes.length > 0) {
      const maxFaceSizes = faceBoxes.reduce((acc: number[], box) => {
        if (!box.right || !box.left || !box.bottom || !box.top) return acc;
        const size = (box.right - box.left) * (box.bottom - box.top);
        acc.push(size);
        return acc;
      }, []).sort((a, b) => b - a).slice(0, 3); // Take top 3 largest faces

      const avgFaceSize = maxFaceSizes.reduce((a, b) => a + b, 0) / maxFaceSizes.length;
      if (avgFaceSize > 0.1) return 'close-up';
    }

    const personBoxes = persons.flatMap(person => 
      (person.frames || [])
        .map((frame: IObjectTrackingFrame) => frame.normalizedBoundingBox)
        .filter((box): box is INormalizedBoundingBox => box !== null && box !== undefined)
    );

    if (personBoxes.length > 0) {
      const maxPersonSizes = personBoxes.reduce((acc: number[], box) => {
        if (!box.right || !box.left || !box.bottom || !box.top) return acc;
        const size = (box.right - box.left) * (box.bottom - box.top);
        acc.push(size);
        return acc;
      }, []).sort((a, b) => b - a).slice(0, 3); // Take top 3 largest person detections

      const avgPersonSize = maxPersonSizes.reduce((a, b) => a + b, 0) / maxPersonSizes.length;
      if (avgPersonSize > 0.3) return 'close-up';
      if (avgPersonSize > 0.15) return 'medium';
    }

    return 'wide';
  }

  private determineMovement(
    objects: IObjectTrackingAnnotation[],
    persons: IObjectTrackingAnnotation[],
    startTime: number,
    endTime: number
  ): string {
    const allFrames = [
      ...objects.flatMap(obj => obj.frames || []),
      ...persons.flatMap(person => person.frames || []),
    ].filter((frame: IObjectTrackingFrame) => {
      const frameTime = this.getTimeFromOffset(frame.timeOffset);
      return frameTime >= startTime && frameTime <= endTime;
    }).sort((a, b) => {
      const timeA = this.getTimeFromOffset(a.timeOffset);
      const timeB = this.getTimeFromOffset(b.timeOffset);
      return timeA - timeB;
    });

    if (allFrames.length < 4) return 'static'; // Need at least 4 frames for reliable movement detection

    let totalDeltaX = 0;
    let totalDeltaY = 0;
    let totalSizeChange = 0;
    let frameCount = 0;

    // Use a sliding window to smooth out movement detection
    const windowSize = 3;
    for (let i = windowSize; i < allFrames.length; i++) {
      const prev = allFrames[i - windowSize].normalizedBoundingBox;
      const curr = allFrames[i].normalizedBoundingBox;
      if (!prev?.left || !prev?.top || !prev?.right || !prev?.bottom ||
          !curr?.left || !curr?.top || !curr?.right || !curr?.bottom) continue;

      totalDeltaX += (curr.left - prev.left) / windowSize;
      totalDeltaY += (curr.top - prev.top) / windowSize;
      
      const prevSize = (prev.right - prev.left) * (prev.bottom - prev.top);
      const currSize = (curr.right - curr.left) * (curr.bottom - curr.top);
      totalSizeChange += ((currSize - prevSize) / prevSize) / windowSize;
      
      frameCount++;
    }

    if (frameCount === 0) return 'static';

    const avgDeltaX = totalDeltaX / frameCount;
    const avgDeltaY = totalDeltaY / frameCount;
    const avgSizeChange = totalSizeChange / frameCount;

    // Less sensitive thresholds and require more consistent movement
    const movements = [];
    if (Math.abs(avgDeltaX) > 0.01) movements.push(avgDeltaX > 0 ? 'pan left' : 'pan right');
    if (Math.abs(avgDeltaY) > 0.01) movements.push(avgDeltaY > 0 ? 'tilt down' : 'tilt up');
    if (Math.abs(avgSizeChange) > 0.015) movements.push(avgSizeChange > 0 ? 'zoom in' : 'zoom out');

    return movements.length > 0 ? movements.join(' + ') : 'static';
  }

  private generateDescription(
    objects: IObjectTrackingAnnotation[], 
    persons: IObjectTrackingAnnotation[], 
    annotations: IVideoAnnotationResults
  ): string {
    const elements = [];

    // Add shot type
    const shotType = this.determineShotType(objects, persons, annotations);
    elements.push(shotType === 'wide' ? 'Wide shot' : 
                 shotType === 'medium' ? 'Medium shot' : 
                 'Close-up shot');

    // Count unique faces and people
    const faceCount = new Set(
      (annotations.faceDetectionAnnotations || [])
        .flatMap(face => face.tracks || [])
        .map(track => track.confidence)
    ).size;

    const personCount = new Set(
      (annotations.personDetectionAnnotations || [])
        .flatMap(person => person.tracks || [])
        .flatMap(track => track.timestampedObjects || [])
        .map(obj => obj.timeOffset?.seconds)
    ).size;

    if (faceCount > 0) {
      elements.push(`with ${faceCount} ${faceCount === 1 ? 'face' : 'faces'}`);
    } else if (personCount > 0) {
      elements.push(`with ${personCount} ${personCount === 1 ? 'person' : 'people'}`);
    }

    // Filter objects by confidence and get unique descriptions
    const uniqueObjects = new Set(
      objects
        .filter(obj => obj.confidence && obj.confidence > 0.5)
        .map(obj => obj.entity?.description?.toLowerCase())
        .filter(Boolean)
    );

    if (uniqueObjects.size > 0) {
      const objectList = Array.from(uniqueObjects).join(', ');
      elements.push(`showing ${objectList}`);
    }

    // Add movement description
    const movement = this.determineMovement(objects, persons, 0, 0);
    if (movement !== 'static') {
      elements.push(`with camera ${movement}`);
    }

    return elements.join(' ');
  }

  private async getDirectorAnalysis(shots: any[]) {
    try {
      const shotsDescription = shots.map((shot, index) => `
Shot ${index + 1}:
- Duration: ${shot.duration.toFixed(2)}s
- Type: ${shot.shotType}
- Movement: ${shot.movement}
- Description: ${shot.description}
      `).join('\n');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `As a film director, analyze these shots and provide insights about the cinematographic choices and their impact on storytelling. Be concise but specific:

${shotsDescription}`
        }],
      });

      // Parse the response into individual shot analyses
      const analysis = response.content.map(block => {
        if (block.type === 'text') {
          return block.text;
        }
        return 'Analysis unavailable';
      });

      return analysis;

    } catch (error) {
      console.error('Error getting director analysis:', error);
      return shots.map(() => 'Analysis unavailable');
    }
  }
} 