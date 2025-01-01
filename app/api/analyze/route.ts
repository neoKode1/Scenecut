import { NextResponse } from 'next/server';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import { analyzeCameraMovements } from '@/utils/cameraAnalysis';
import { getDirectorInsights } from '@/utils/directorInsights';
import { ObjectTrack } from '@/types/video';

const { Feature } = protos.google.cloud.videointelligence.v1;
type IAnnotateVideoResponse = protos.google.cloud.videointelligence.v1.IAnnotateVideoResponse;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const videoBytes = await file.arrayBuffer();
    
    // Initialize client with credentials from environment variables
    const client = new VideoIntelligenceServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      }
    });

    const request = {
      inputContent: Buffer.from(videoBytes).toString('base64'),
      features: [
        Feature.SHOT_CHANGE_DETECTION,
        Feature.OBJECT_TRACKING,
        Feature.PERSON_DETECTION
      ]
    };

    const [operation] = await client.annotateVideo(request);
    const [results] = await operation.promise();

    // Process shot changes
    const shots = (results as IAnnotateVideoResponse)?.annotationResults?.[0]?.shotAnnotations?.map((shot: any) => ({
      startTime: Number(shot.startTimeOffset?.seconds || 0),
      endTime: Number(shot.endTimeOffset?.seconds || 0),
      duration: Number(shot.endTimeOffset?.seconds || 0) - Number(shot.startTimeOffset?.seconds || 0),
      confidence: Number(shot.confidence || 0)
    })) || [];

    // Get object movements for camera motion analysis
    const objectMovements = (results as IAnnotateVideoResponse)?.annotationResults?.[0]?.objectAnnotations?.map((obj: any) => ({
      description: obj.entity?.description || '',
      confidence: Number(obj.confidence || 0),
      timeSegment: {
        start: Number(obj.segment?.startTimeOffset?.seconds || 0),
        end: Number(obj.segment?.endTimeOffset?.seconds || 0)
      },
      movements: obj.frames?.map((frame: any) => ({
        timeOffset: Number(frame.timeOffset?.seconds || 0),
        position: frame.normalizedBoundingBox || null,
        confidence: Number(frame.confidence || 1.0)
      })) || []
    })) || [];

    // Convert to our ObjectTrack type
    const objectTracks: ObjectTrack[] = objectMovements.map(obj => ({
      description: obj.description,
      confidence: obj.confidence,
      timeSegment: obj.timeSegment,
      movements: obj.movements
    }));

    // Get person detections
    const people = (results as IAnnotateVideoResponse)?.annotationResults?.[0]?.personDetectionAnnotations?.map((person: any) => ({
      confidence: Number(person.confidence || 0),
      tracks: person.tracks?.map((track: any) => ({
        confidence: Number(track.confidence || 0),
        timeSegment: {
          start: Number(track.segment?.startTimeOffset?.seconds || 0),
          end: Number(track.segment?.endTimeOffset?.seconds || 0)
        },
        timestamps: track.timestampedObjects?.map((obj: any) => ({
          timeOffset: Number(obj.timeOffset?.seconds || 0),
          position: obj.normalizedBoundingBox || null,
          attributes: obj.attributes || []
        })) || []
      })) || []
    })) || [];

    // Analyze camera movements
    const cameraMotions = analyzeCameraMovements(objectTracks, shots);

    // Get director insights
    const directorInsights = await getDirectorInsights({
      shots,
      objects: objectTracks,
      cameraMotions
    });

    return NextResponse.json({
      success: true,
      analysis: {
        shots,
        objects: objectTracks,
        people,
        cameraMotions,
        directorInsights
      }
    });

  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process video' 
    }, { status: 500 });
  }
}