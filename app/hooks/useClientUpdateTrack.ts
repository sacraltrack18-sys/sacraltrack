import { storage, database, ID } from '@/libs/AppWriteClient';
import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { useClientUpload } from './useClientUpload';

// Type for update parameters
interface UpdateParams {
  trackId: string;
  audio?: File;
  mp3?: File | Blob;
  m3u8?: string;
  segments?: Array<{name: string, data: Uint8Array, file: File}>;
  image?: File;
  trackname?: string;
  genre?: string;
  userId?: string;
  onProgress?: (stage: string, progress: number, estimatedTime?: string) => void;
}

// Type for update result
interface UpdateResult {
  success: boolean;
  trackId: string;
  error?: string;
}

// Function to optimize image for upload
async function optimizeImage(imageFile: File): Promise<File> {
  console.log('Starting image optimization...');
  console.log(`Original image: ${imageFile.name}, type: ${imageFile.type}, size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    // Check if browser supports WebP
    const isWebPSupported = !!(window.OffscreenCanvas || (document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0));
    
    const options = {
      maxSizeMB: 1, // maximum size in MB
      maxWidthOrHeight: 1200, // width/height limit
      useWebWorker: true, // use Web Worker for better performance
      initialQuality: 0.8, // initial quality for JPEG
      fileType: isWebPSupported ? 'image/webp' : 'image/jpeg', // prefer WebP if supported
    };
    
    const compressedFile = await imageCompression(imageFile, options);
    
    // Create a new file with the correct extension and type
    const fileExtension = options.fileType === 'image/webp' ? '.webp' : '.jpg';
    const optimizedFileName = imageFile.name.replace(/\.[^/.]+$/, "") + '_optimized' + fileExtension;
    
    // Create a new file with optimized data and correct name/type
    const optimizedFile = new File(
      [compressedFile], 
      optimizedFileName, 
      { type: options.fileType }
    );
    
    console.log(`Optimized image: ${optimizedFile.name}, type: ${optimizedFile.type}, size: ${(optimizedFile.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compression ratio: ${(imageFile.size / optimizedFile.size).toFixed(2)}x`);
    
    return optimizedFile;
  } catch (error) {
    console.error('Error during image optimization:', error);
    console.log('Falling back to original image');
    return imageFile; // return original in case of error
  }
}

// Function to ensure track statistics document exists
async function ensureTrackStatisticsExist(trackId: string) {
  if (!trackId) return;
  
  try {
    // Check if stats document already exists
    console.log(`Checking if track statistics exist for track ID: ${trackId}`);
    
    try {
      await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'track_statistics',
        trackId
      );
      console.log(`Track statistics document already exists for ID: ${trackId}`);
      return; // Document exists, nothing more to do
    } catch (error) {
      console.log(`Track statistics document not found, will create new one for ID: ${trackId}`);
      // Document doesn't exist, continue to create it
    }
    
    // Create new statistics document with track ID as document ID
    const statsData = {
      track_id: trackId,
      play_count: "0",
      likes: "0",
      shares: "0",
      last_played: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      'track_statistics',
      trackId, // Use track ID as document ID
      statsData
    );
    
    console.log(`Created track statistics document with ID: ${result.$id}`);
  } catch (error) {
    console.error('Error ensuring track statistics exist:', error);
    // Don't throw - this is non-critical functionality
  }
}

// Main hook for client-side track updates
export function useClientUpdateTrack() {
  const { uploadAudio, uploadImage, uploadSegment } = useClientUpload();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Function to clean up old audio files and segments
  const cleanupOldFiles = useCallback(async (
    currentTrack: any,
    onProgress?: (stage: string, progress: number) => void
  ) => {
    try {
      if (!currentTrack) {
        return false;
      }
      
      const updateProgress = (stage: string, progress: number) => {
        setProcessingStage(stage);
        setProcessingProgress(progress);
        if (onProgress) onProgress(stage, progress);
      };
      
      // Delete old segments if they exist
      if (currentTrack.segments) {
        try {
          updateProgress('Cleaning up old segments', 0);
          const oldSegments = JSON.parse(currentTrack.segments);
          
          for (let i = 0; i < oldSegments.length; i++) {
            try {
              await storage.deleteFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                oldSegments[i]
              );
            } catch (error) {
              console.warn(`Failed to delete old segment: ${error}`);
            }
            
            updateProgress('Cleaning up old segments', ((i + 1) / oldSegments.length) * 100);
          }
        } catch (error) {
          console.warn('Failed to parse or remove old segments:', error);
        }
      }
      
      // Delete old audio files if they exist
      if (currentTrack.audio_url) {
        try {
          updateProgress('Cleaning up old audio', 50);
          await storage.deleteFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            currentTrack.audio_url
          );
        } catch (error) {
          console.warn(`Failed to delete old audio file: ${error}`);
        }
      }
      
      if (currentTrack.mp3_url) {
        try {
          updateProgress('Cleaning up old MP3', 75);
          await storage.deleteFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            currentTrack.mp3_url
          );
        } catch (error) {
          console.warn(`Failed to delete old MP3 file: ${error}`);
        }
      }
      
      if (currentTrack.m3u8_url) {
        try {
          updateProgress('Cleaning up old playlist', 90);
          await storage.deleteFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            currentTrack.m3u8_url
          );
        } catch (error) {
          console.warn(`Failed to delete old playlist file: ${error}`);
        }
      }
      
      updateProgress('Cleanup complete', 100);
      return true;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return false;
    }
  }, []);
  
  // Main function to update a track
  const updateTrack = useCallback(async (params: UpdateParams): Promise<UpdateResult> => {
    const { 
      trackId, 
      audio, 
      mp3, 
      m3u8, 
      segments, 
      image, 
      trackname, 
      genre, 
      userId = 'anonymous', 
      onProgress 
    } = params;
    
    setIsProcessing(true);
    setProcessingStage('Preparing update');
    setProcessingProgress(0);
    
    try {
      // Validate parameters
      if (!trackId) {
        throw new Error('Track ID is required');
      }
      
      if (!trackname && !genre && !audio && !image) {
        throw new Error('At least one field must be updated');
      }
      
      // Get start time for estimating remaining time
      const startTime = Date.now();
      
      // Function to calculate remaining time
      const getEstimatedTime = (progress: number) => {
        if (progress === 0) return undefined;
        
        const elapsedTime = Date.now() - startTime;
        const estimatedTotalTime = (elapsedTime / progress) * 100;
        const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
      // Function to update progress
      const updateProgress = (stage: string, progress: number) => {
        setProcessingStage(stage);
        setProcessingProgress(progress);
        
        if (onProgress) {
          const estimatedTime = getEstimatedTime(progress);
          onProgress(stage, progress, estimatedTime);
        }
      };
      
      // Get current track data
      let currentTrack;
      try {
        updateProgress('Fetching track data', 5);
        currentTrack = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
          trackId
        );
      } catch (error) {
        console.error('Error fetching track data:', error);
        throw new Error('Failed to fetch track data');
      }
      
      // Create update data object
      const updateData: Record<string, any> = {};
      
      // Add basic fields if provided
      if (trackname) updateData.trackname = trackname;
      if (genre) updateData.genre = genre;
      
      // Process image if provided
      if (image) {
        updateProgress('Processing cover image', 10);
        const optimizedImage = await optimizeImage(image);
        
        updateProgress('Uploading cover image', 15);
        
        // Delete old image if exists
        if (currentTrack.image_url) {
          try {
            await storage.deleteFile(
              process.env.NEXT_PUBLIC_BUCKET_ID!,
              currentTrack.image_url
            );
          } catch (error) {
            console.warn('Failed to delete old image file:', error);
          }
        }
        
        // Upload new image
        const imageUploadResult = await uploadImage(optimizedImage, (stage, progress) => {
          const scaledProgress = 15 + (progress / 100) * 10;
          updateProgress(stage, scaledProgress);
        });
        
        if (!imageUploadResult.success) {
          throw new Error(`Failed to upload image: ${imageUploadResult.error}`);
        }
        
        updateData.image_url = imageUploadResult.fileId;
      }
      
      // Process audio if provided
      if (audio && mp3 && segments) {
        // Clean up old files first
        updateProgress('Cleaning up old files', 25);
        await cleanupOldFiles(currentTrack, (stage, progress) => {
          const scaledProgress = 25 + (progress / 100) * 10;
          updateProgress(stage, scaledProgress);
        });
        
        // Upload original audio
        updateProgress('Uploading original audio', 35);
        const audioUploadResult = await uploadAudio(audio, (stage, progress) => {
          const scaledProgress = 35 + (progress / 100) * 10;
          updateProgress(stage, scaledProgress);
        });
        
        if (!audioUploadResult.success) {
          throw new Error(`Failed to upload audio: ${audioUploadResult.error}`);
        }
        
        updateData.audio_url = audioUploadResult.fileId;
        
        // Upload MP3 file
        updateProgress('Uploading MP3', 45);
        const mp3UploadResult = await uploadAudio(mp3 as File, (stage, progress) => {
          const scaledProgress = 45 + (progress / 100) * 10;
          updateProgress(stage, scaledProgress);
        });
        
        if (!mp3UploadResult.success) {
          throw new Error(`Failed to upload MP3: ${mp3UploadResult.error}`);
        }
        
        updateData.mp3_url = mp3UploadResult.fileId;
        
        // Upload segments
        updateProgress('Uploading segments', 55);
        const segmentIds: string[] = [];
        
        for (let i = 0; i < segments.length; i++) {
          try {
            const segmentResult = await uploadSegment(
              segments[i].file,
              i,
              segments.length
            );
            
            if (segmentResult.success) {
              segmentIds.push(segmentResult.fileId);
              
              // Update progress
              const segmentProgress = 55 + ((i + 1) / segments.length) * 25;
              updateProgress(`Uploading segment ${i + 1}/${segments.length}`, segmentProgress);
            } else {
              console.error(`Failed to upload segment ${i + 1}:`, segmentResult.error);
            }
          } catch (error) {
            console.error(`Error uploading segment ${i + 1}:`, error);
          }
        }
        
        // Store segment IDs
        updateData.segments = JSON.stringify(segmentIds);
        
        // Create and upload M3U8 playlist
        if (m3u8) {
          updateProgress('Creating playlist', 80);
          
          // Replace placeholders with actual URLs
          let m3u8Content = m3u8;
          
          for (let i = 0; i < segmentIds.length; i++) {
            const segmentId = segmentIds[i];
            const segmentUrl = `${process.env.NEXT_PUBLIC_APPWRITE_URL}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${segmentId}/view?project=${process.env.NEXT_PUBLIC_ENDPOINT}`;
            
            // Replace placeholder with actual URL
            m3u8Content = m3u8Content.replace(`SEGMENT_PLACEHOLDER_${i}`, segmentUrl);
          }
          
          // Create M3U8 file
          const m3u8Blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
          const m3u8File = new File([m3u8Blob], `${trackId}_playlist.m3u8`, { type: 'application/vnd.apple.mpegurl' });
          
          // Upload M3U8 file
          const m3u8UploadResult = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            m3u8File
          );
          
          updateData.m3u8_url = m3u8UploadResult.$id;
        }
      }
      
      // Update database record
      updateProgress('Updating track information', 90);
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
        trackId,
        updateData
      );
      
      // Ensure track statistics document exists
      await ensureTrackStatisticsExist(trackId);
      
      updateProgress('Track updated successfully', 100);
      
      setIsProcessing(false);
      return { 
        success: true, 
        trackId 
      };
      
    } catch (error) {
      console.error('Error updating track:', error);
      setIsProcessing(false);
      return { 
        success: false, 
        trackId, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }, [uploadAudio, uploadImage, uploadSegment, cleanupOldFiles]);
  
  return {
    updateTrack,
    isProcessing,
    processingStage,
    processingProgress
  };
} 