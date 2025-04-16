import { storage, database } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useCallback } from 'react';
import { saveUploadProgress, getUploadProgress } from '@/app/utils/audioUtils';
import imageCompression from 'browser-image-compression';

// Create a type for the upload parameters 
interface UploadParams {
  audio?: string | File | Blob;  // Can be a string (path) or a file
  image: File;
  mp3?: File | Blob;  // Can be null for direct upload without preprocessing
  m3u8?: File | Blob;  // Can be null for direct upload without preprocessing
  segments?: File[] | string[];  // Can be null for direct upload without preprocessing
  trackname: string;
  genre: string;
  userId?: string;
  onProgress?: (stage: string, progress: number, estimatedTime?: string) => void;
}

// Create a type for the response
interface UploadResult {
  success: boolean;
  trackId: string;
  postId?: string;
  $id?: string;
  error?: string;
}

/**
 * Function for image optimization before upload
 * Performs the following steps:
 * 1. Compresses the image to a maximum size of 1MB
 * 2. Limits the width/height to 1200px for quality balance
 * 3. Converts to WebP if the browser supports (better compression) or JPEG
 * 4. Uses Web Worker for better performance
 * 5. Returns the optimized image with a new name and type
 * @param imageFile Original image file
 * @returns Optimized image file
 */
async function optimizeImage(imageFile: File): Promise<File> {
  console.log('Starting image optimization...');
  console.log(`Original image: ${imageFile.name}, type: ${imageFile.type}, size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
  
  try {
    // Check if browser supports WebP
    const isWebPSupported = !!(window.OffscreenCanvas || (document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0));
    
    const options = {
      maxSizeMB: 1, // maximum size in MB (average optimal size)
      maxWidthOrHeight: 1200, // width/height limit for quality balance
      useWebWorker: true, // use Web Worker for better performance
      initialQuality: 0.8, // initial quality for JPEG (80% - good balance)
      fileType: isWebPSupported ? 'image/webp' : 'image/jpeg', // prefer WebP if supported
    };
    
    const compressedFile = await imageCompression(imageFile, options);
    
    // Create a new file with the correct extension and type for better compatibility
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

// Function to check if a value is a file
function isFile(value: any): value is File {
  return value && typeof value === 'object' && 'size' in value && 'type' in value && 'name' in value;
}

// Function to upload a file with retries
async function uploadWithRetry(file: File, fileId: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Log information about the environment variable and upload
      console.log(`Uploading file to bucket ID: ${process.env.NEXT_PUBLIC_BUCKET_ID}`);
      
      const response = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
        fileId,
        file
      );
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Export a utility function to create a valid file URL from an ID
export function createFileUrl(fileId: string): string {
  if (!fileId) return '';
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
}

// Define the hook with named export instead of default export
export function useCreatePost() {
  // Function to upload an individual segment and get its ID
  const createSegmentFile = useCallback(async (segmentFile: File): Promise<string> => {
    console.log(`createSegmentFile called with file: ${segmentFile?.name}, size: ${segmentFile?.size} bytes`);
    
    if (!segmentFile) {
      console.error('Segment file is null or undefined!');
      throw new Error('Segment file is required');
    }

    if (!isFile(segmentFile)) {
      console.error('Provided segment is not a valid file!', segmentFile);
      throw new Error('Segment must be a valid file');
    }

    // Generate a unique ID for the segment
    const segmentId = ID.unique();
    console.log(`Generated segment ID: ${segmentId}`);

    try {
      // Check storage availability
      if (!storage) {
        console.error('Storage client is undefined!');
        throw new Error('Storage client is not available');
      }
      
      if (typeof storage.createFile !== 'function') {
        console.error('storage.createFile is not a function!', storage);
        throw new Error('Storage client API is not available');
      }
      
      console.log(`Uploading segment to Appwrite, bucket: ${process.env.NEXT_PUBLIC_BUCKET_ID}...`);
      
      // Upload segment to Appwrite Storage with retries
      const result = await uploadWithRetry(segmentFile, segmentId);
      
      console.log(`Segment uploaded successfully, Appwrite ID: ${result?.$id}`);

      // Return the ID of the uploaded segment - important for M3U8 playlist
      return result?.$id || segmentId;
    } catch (error) {
      console.error('Error uploading segment file to Appwrite:', error);
      const errorMessage = error instanceof Error 
        ? `Upload failed: ${error.message}` 
        : 'Unknown error during upload';
      throw new Error(errorMessage);
    }
  }, []);

  const createPost = useCallback(async (params: UploadParams): Promise<UploadResult> => {
    const { audio, image, mp3, m3u8, segments, trackname, genre, userId = 'anonymous', onProgress } = params;
                                
    try {
      // Check parameter correctness
      if (!image) {
        throw new Error('Image file is required');
      }

      if (!isFile(image)) {
        throw new Error('Image must be a valid file');
      }

      if (!trackname || !genre) {
        throw new Error('Track name and genre are required');
      }

      // Validate file parameters
      if (audio && !isFile(audio)) {
        throw new Error('Audio must be a valid file');
      }

      if (mp3 && !isFile(mp3)) {
        throw new Error('MP3 must be a valid file');
      }

      if (m3u8 && !isFile(m3u8)) {
        throw new Error('M3U8 must be a valid file');
      }

      if (segments) {
        for (const segment of segments) {
          if (typeof segment !== 'string' && !isFile(segment)) {
            throw new Error('Each segment must be a valid file or ID string');
          }
        }
      }

      // Check API client availability
      if (!storage || typeof storage.createFile !== 'function') {
        console.error('Storage client is not properly initialized');
        throw new Error('Storage client is not available');
      }

      if (!database || typeof database.createDocument !== 'function') {
        console.error('Database client is not properly initialized');
        throw new Error('Database client is not available');
      }

      // Generate a unique ID for the track
      const trackId = ID.unique();
      const startTime = Date.now();

      // Log database ID and collection ID
      console.log(`Database ID: ${process.env.NEXT_PUBLIC_DATABASE_ID}`);
      console.log(`Collection ID: ${process.env.NEXT_PUBLIC_COLLECTION_ID_POST}`);

      // Function to calculate remaining time
      const getEstimatedTime = (progress: number) => {
        const elapsedTime = Date.now() - startTime;
        const estimatedTotalTime = (elapsedTime / progress) * 100;
        const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        return `Estimated time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      // Report progress
      const updateProgress = (stage: string, progress: number) => {
        if (onProgress) {
          console.log(`Progress update: ${stage} - ${progress}%`);
          onProgress(stage, progress, getEstimatedTime(progress));
        }
      };

      // Upload main audio file if provided
      updateProgress('Uploading main audio', 0);
      let audioId = '';
      if (audio && isFile(audio)) {
        audioId = ID.unique();
        const audioUploadResult = await uploadWithRetry(audio, audioId);
        // Use the ID returned from Appwrite instead of the generated one
        if (audioUploadResult && audioUploadResult.$id) {
          audioId = audioUploadResult.$id;
          console.log(`Audio file uploaded with ID: ${audioId}`);
        } else {
          console.log(`Using generated audio ID: ${audioId}`);
        }
      }

      // Cover optimization and upload
      updateProgress('Preparing cover image', 25);
      console.log('Original image size:', Math.round(image.size / 1024), 'KB');
      
      // Optimize image before upload
      updateProgress('Optimizing image...', 27);
      const optimizedImage = await optimizeImage(image);
      console.log('Optimized image size:', Math.round(optimizedImage.size / 1024), 'KB');
      updateProgress('Image optimized', 30);
      
      // Upload optimized image
      updateProgress('Uploading cover image', 33);
        const imageId = ID.unique();
      const imageUploadResult = await uploadWithRetry(optimizedImage, imageId);
      // Use the ID returned from Appwrite
      const finalImageId = imageUploadResult && imageUploadResult.$id ? imageUploadResult.$id : imageId;
      console.log(`Optimized image uploaded with ID: ${finalImageId}`);
      
      // Show compression level
      const compressionRatio = (image.size / optimizedImage.size).toFixed(1);
      updateProgress(`Cover image uploaded (compression in ${compressionRatio}x times)`, 40);

      // Upload MP3 version if provided
      updateProgress('Uploading MP3 version', 45);
      let mp3Id = '';
      if (mp3 && isFile(mp3)) {
        mp3Id = ID.unique();
        const mp3UploadResult = await uploadWithRetry(mp3, mp3Id);
        // Use the ID returned from Appwrite
        if (mp3UploadResult && mp3UploadResult.$id) {
          mp3Id = mp3UploadResult.$id;
          console.log(`MP3 file uploaded with ID: ${mp3Id}`);
        } else {
          console.log(`Using generated MP3 ID: ${mp3Id}`);
        }
      }

      // Handle segments upload if provided
      updateProgress('Processing segments', 60);
      let segmentIds: string[] = [];
      if (segments && segments.length > 0) {
        console.log(`Processing ${segments.length} segments:`, segments);
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (isFile(segment)) {
            // If it's a file, upload it and get the actual ID from Appwrite
            const segmentFile = segment as File;
            try {
              const uploadResult = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                segmentFile
              );
              const segmentId = uploadResult.$id;
              console.log(`Uploaded segment file ${segmentFile.name}, got Appwrite ID: ${segmentId}`);
              segmentIds.push(segmentId);
            } catch (error) {
              console.error(`Error uploading segment ${i}:`, error);
              throw new Error(`Failed to upload segment ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else if (typeof segment === 'string') {
            // If it's already an ID string, just use it
            console.log(`Using provided segment ID: ${segment}`);
            segmentIds.push(segment);
          }
          // Update progress for each segment
          updateProgress(`Processing segment ${i+1}/${segments.length}`, 60 + (i / segments.length * 10));
        }
        console.log(`Final segment IDs for M3U8 and DB:`, segmentIds);
      }

      // Generate M3U8 playlist from segment IDs
        console.log(`Generating M3U8 playlist from segments IDs:`, segmentIds);
        
        // Log environment variables to debug
        console.log('Environment variables check:');
        console.log('NEXT_PUBLIC_APPWRITE_ENDPOINT:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'undefined');
        console.log('NEXT_PUBLIC_BUCKET_ID:', process.env.NEXT_PUBLIC_BUCKET_ID || 'undefined');
        console.log('NEXT_PUBLIC_APPWRITE_PROJECT_ID:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'undefined');
        
        // Ensure we have proper environment variables with fallbacks
        const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
        const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || '';
        const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
        
        if (!bucketId || !projectId) {
          console.warn('Missing or empty environment variables for M3U8 generation. Streaming might not work correctly.');
          // Continue with the process anyway - we'll handle missing values in the playlist generation
        }
        
      // Generate M3U8 playlist if segments are available and no m3u8 file provided
      updateProgress('Generating playlist', 70);
      let m3u8Id = '';
      if (m3u8 && isFile(m3u8)) {
        m3u8Id = ID.unique();
        const m3u8UploadResult = await uploadWithRetry(m3u8, m3u8Id);
        // Use the ID returned from Appwrite
        if (m3u8UploadResult && m3u8UploadResult.$id) {
          m3u8Id = m3u8UploadResult.$id;
          console.log(`M3U8 playlist uploaded with ID: ${m3u8Id}`);
        } else {
          console.log(`Using generated M3U8 ID: ${m3u8Id}`);
        }
      } else if (segmentIds.length > 0) {
        // Generate M3U8 content using the verified environment variables
        const m3u8Content = generateM3U8Playlist(segmentIds, appwriteEndpoint, bucketId, projectId);
        console.log(`Generated M3U8 content (first 200 chars):`, m3u8Content?.substring(0, 200) + '...');
        
        if (m3u8Content) {
          m3u8Id = ID.unique();
          const m3u8File = new File([m3u8Content], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' });
          updateProgress('Uploading playlist', 75);
          const m3u8UploadResult = await uploadWithRetry(m3u8File, m3u8Id);
          // Use the ID returned from Appwrite
          if (m3u8UploadResult && m3u8UploadResult.$id) {
            m3u8Id = m3u8UploadResult.$id;
            console.log(`Uploaded M3U8 playlist with ID: ${m3u8Id}`);
          } else {
            console.log(`Using generated M3U8 ID: ${m3u8Id}`);
          }
        }
      }

      // Create record in the database
      updateProgress('Creating database record', 85);
      
      // Debug: Log database data before creating the document
      console.log('Creating document with data:', {
        user_id: userId,
        audio_url: audioId,
        image_url: finalImageId,
        mp3_url: mp3Id,
        m3u8_url: m3u8Id,
        trackname,
        genre,
        segments: segmentIds.length > 0 ? JSON.stringify(segmentIds) : '',
      });

      // Ensure all fields are in the correct format for Appwrite
      // Appwrite expects strings for most fields
      const documentData = {
        user_id: String(userId),
        audio_url: String(audioId),
        image_url: String(finalImageId),
        mp3_url: String(mp3Id || ''),
        m3u8_url: String(m3u8Id || ''),
        trackname: String(trackname),
        genre: String(genre),
        price: "2", // Always use string for price as required by Appwrite schema
        segments: segmentIds.length > 0 ? JSON.stringify(segmentIds) : '',
        created_at: new Date().toISOString(),
      };
      
      console.log('Formatted document data:', documentData);

      const post = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
        trackId,
        documentData
      );

      console.log('Document created successfully, details:', {
        id: post.$id,
        m3u8_url: post.m3u8_url,
        segments: post.segments
      });

      updateProgress('Upload completed', 100);
      return {
        success: true,
        trackId: post.$id,
        postId: post.$id,
        $id: post.$id
      };

    } catch (error) {
      console.error('Error in createPost:', error);
      return {
        success: false,
        trackId: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }, []);

  // Helper function to generate a valid M3U8 playlist with explicit params
  const generateM3U8Playlist = (
    segmentIds: string[], 
    appwriteEndpoint: string = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '', 
    bucketId: string = process.env.NEXT_PUBLIC_BUCKET_ID || '',
    projectId: string = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
  ): string | null => {
    if (!segmentIds || segmentIds.length === 0) {
      console.error('No segment IDs provided for M3U8 generation');
      return null;
    }
    
    console.log(`generateM3U8Playlist processing ${segmentIds.length} IDs:`, segmentIds);
    
    // Check for required environment variables
    if (!bucketId || !projectId) {
      console.warn('Missing required environment variables. Creating a basic M3U8 playlist without storage URLs.');
      // We'll create a basic playlist without proper URLs
    }
    
    // Ensure we're using actual IDs, not placeholder values
    const validSegmentIds = segmentIds.filter(id => id !== 'unique()' && !!id);
    if (validSegmentIds.length === 0) {
      console.error('No valid segment IDs found for M3U8 generation');
      return null;
    }
    
    if (validSegmentIds.length < segmentIds.length) {
      console.warn(`Filtered out ${segmentIds.length - validSegmentIds.length} invalid segment IDs`);
    }
    
    // Create the standard HLS playlist with just segment IDs
    let playlist = "#EXTM3U\n";
    playlist += "#EXT-X-VERSION:3\n";
    playlist += "#EXT-X-MEDIA-SEQUENCE:0\n";
    playlist += "#EXT-X-ALLOW-CACHE:YES\n";
    playlist += "#EXT-X-TARGETDURATION:10\n";
    playlist += "#EXT-X-PLAYLIST-TYPE:VOD\n";
    
    // Add each segment with its ID directly
    for (const segmentId of validSegmentIds) {
      playlist += "#EXTINF:10,\n";
      
      // If we have all environment variables, create proper URLs
      if (bucketId && projectId && appwriteEndpoint) {
        const fileUrl = `${appwriteEndpoint}/storage/buckets/${bucketId}/files/${segmentId}/view?project=${projectId}`;
        console.log(`Adding segment with URL: ${fileUrl}`);
        playlist += `${fileUrl}\n`;
      } else {
        // Otherwise, just use the segment ID as a placeholder
        console.log(`Adding segment with ID only: ${segmentId}`);
        playlist += `${segmentId}\n`;
      }
    }
    
    // End the playlist
    playlist += "#EXT-X-ENDLIST\n";
    
    return playlist;
  };

  return { createPost, createSegmentFile };
} 