import { storage, database } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useCallback } from 'react';
import { useCreatePost } from './useCreatePost';

// Create a type for the update parameters 
interface UpdateParams {
  trackId: string;
  audio?: File | Blob;  // New audio file if updating
  image?: File;  // New image file if updating
  trackname?: string;  // New track name if updating
  genre?: string;  // New genre if updating
  onProgress?: (stage: string, progress: number) => void;
}

// Create a type for the response
interface UpdateResult {
  success: boolean;
  error?: string;
}

export function useUpdateTrack() {
  const { createSegmentFile } = useCreatePost();

  const updateTrack = useCallback(async (params: UpdateParams): Promise<UpdateResult> => {
    const { trackId, audio, image, trackname, genre, onProgress } = params;
    
    try {
      // Validate minimum requirements
      if (!trackId) {
        throw new Error('Track ID is required');
      }

      if (!trackname && !genre && !audio && !image) {
        throw new Error('At least one field must be updated');
      }

      // Create the update object
      const updateData: Record<string, any> = {};
      
      // Add text fields if provided
      if (trackname) updateData.trackname = trackname;
      if (genre) updateData.genre = genre;

      // Report progress
      const updateProgress = (stage: string, progress: number) => {
        if (onProgress) {
          console.log(`Progress update: ${stage} - ${progress}%`);
          onProgress(stage, progress);
        }
      };

      // Handle image upload if provided
      if (image) {
        updateProgress('Uploading image', 0);
        const imageId = ID.unique();
        const imageUploadResult = await storage.createFile(
          process.env.NEXT_PUBLIC_BUCKET_ID!,
          imageId,
          image
        );
        // Use the ID returned from Appwrite
        const finalImageId = imageUploadResult.$id || imageId;
        updateData.image_url = finalImageId;
        updateProgress('Uploading image', 100);
      }

      // Handle audio upload and segmentation if provided
      if (audio) {
        // Audio processing is handled separately via API
        // The API will process, segment, and provide an M3U8 playlist
        // We'll need to upload each segment, create the playlist file, and update database
        
        // Get current track data to replace specific fields only
        const currentTrack = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
          trackId
        );
        
        // If segments existed, remove old segment files
        if (currentTrack.segments) {
          try {
            const oldSegmentIds = JSON.parse(currentTrack.segments);
            updateProgress('Removing old segments', 0);
            
            for (let i = 0; i < oldSegmentIds.length; i++) {
              const segmentId = oldSegmentIds[i];
              try {
                await storage.deleteFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  segmentId
                );
              } catch (error) {
                console.warn(`Failed to delete old segment ${segmentId}:`, error);
                // Continue with other segments even if one fails
              }
              
              updateProgress('Removing old segments', (i + 1) / oldSegmentIds.length * 100);
            }
          } catch (error) {
            console.warn('Failed to parse or remove old segments:', error);
            // Continue with update anyway
          }
        }
        
        // Prepare to upload new segments and audio files
        updateProgress('Processing audio', 0);
        
        // Once audio processing is complete, update the database record
        updateProgress('Updating database', 90);
      }

      // Update the database record
      updateProgress('Updating database', 90);
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
        trackId,
        updateData
      );

      updateProgress('Update complete', 100);
      return {
        success: true
      };

    } catch (error) {
      console.error('Error in updateTrack:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }, [createSegmentFile]);

  return { updateTrack };
} 