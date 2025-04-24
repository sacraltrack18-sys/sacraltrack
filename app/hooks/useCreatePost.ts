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
  wavSegments?: File[] | string[];  // For WAV segments
  wavManifest?: File;  // Manifest file for WAV reconstruction
  trackname: string;
  genre: string;
  userId?: string;
  onProgress?: (stage: string, progress: number, estimatedTime?: string) => void;
}

// Create a type for the response
interface UploadResult {
  success: boolean;
  trackId: string;
  error?: string;
}

// Configure image compression options
const imageOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1500,
  useWebWorker: true,
  fileType: 'image/jpeg'
};

// Utility function for retrying uploads with exponential backoff
const uploadWithRetry = async (file: File | Blob, fileId: string, maxRetries = 3): Promise<any> => {
  console.log(`Starting upload with retry for file: size=${file.size} bytes, ID=${fileId}`);
  let retries = 0;

  // Get bucket ID from env (or default)
  const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
  if (!bucketId) {
    console.error('NEXT_PUBLIC_BUCKET_ID is not defined in environment variables');
    throw new Error('Storage bucket ID not configured');
  }

  // Convert Blob to File if needed
  let fileToUpload: File;
  if (file instanceof File) {
    fileToUpload = file;
  } else {
    // Create a File from the Blob with a generated name based on the ID
    const fileName = `blob_${fileId}.bin`;
    fileToUpload = new File([file], fileName, { 
      type: file.type || 'application/octet-stream',
      lastModified: Date.now()
    });
    console.log(`Converted Blob to File with name: ${fileName}`);
  }

  while (retries <= maxRetries) {
    try {
      console.log(`Upload attempt ${retries + 1} for file ID ${fileId}...`);
      const result = await storage.createFile(
        bucketId,
        fileId,
        fileToUpload
      );
      console.log(`Upload successful for file ID ${fileId}`);
      return result;
    } catch (error) {
      retries++;
      
      // If we've exhausted retries, rethrow the error
      if (retries > maxRetries) {
        console.error(`Upload failed after ${maxRetries} retries for file ID ${fileId}:`, error);
        throw error;
      }
      
      // Otherwise wait with exponential backoff before retrying
      const delay = Math.pow(2, retries) * 1000; // 2s, 4s, 8s, ...
      console.log(`Upload attempt ${retries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw inside the loop
  return null;
};

// Function to check if a value is a file
function isFile(value: any): value is File {
  return value && typeof value === 'object' && 'size' in value && 'type' in value && 'name' in value;
}

// Helper function to format a file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  // Function to upload an individual WAV segment
  const createWavSegmentFile = useCallback(async (wavSegmentFile: File): Promise<string> => {
    console.log(`createWavSegmentFile called with file: ${wavSegmentFile?.name}, size: ${wavSegmentFile?.size} bytes`);
    
    if (!wavSegmentFile) {
      console.error('WAV segment file is null or undefined!');
      throw new Error('WAV segment file is required');
    }

    if (!isFile(wavSegmentFile)) {
      console.error('Provided WAV segment is not a valid file!', wavSegmentFile);
      throw new Error('WAV segment must be a valid file');
    }

    // Generate a unique ID for the WAV segment
    const wavSegmentId = ID.unique();
    console.log(`Generated WAV segment ID: ${wavSegmentId}`);

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
      
      // Get bucket ID from env (or default) - Use the same bucket ID for WAV segments as requested
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
      if (!bucketId) {
        console.error('NEXT_PUBLIC_BUCKET_ID is not defined in environment variables');
        throw new Error('Storage bucket ID not configured');
      }
      
      console.log(`Uploading WAV segment to Appwrite, bucket: ${bucketId}...`);
      
      // Upload WAV segment to Appwrite Storage with retries
      const result = await storage.createFile(
        bucketId,
        wavSegmentId,
        wavSegmentFile
      );
      
      console.log(`WAV segment uploaded successfully, Appwrite ID: ${result?.$id}`);

      // Return the ID of the uploaded WAV segment
      return result?.$id || wavSegmentId;
    } catch (error) {
      console.error('Error uploading WAV segment file to Appwrite:', error);
      const errorMessage = error instanceof Error 
        ? `Upload failed: ${error.message}` 
        : 'Unknown error during upload';
      throw new Error(errorMessage);
    }
  }, []);

  // Function to upload a WAV manifest file and get its ID
  const createWavManifestFile = useCallback(async (manifestFile: File): Promise<string> => {
    console.log(`createWavManifestFile called with file: ${manifestFile?.name}, size: ${manifestFile?.size} bytes`);
    
    if (!manifestFile) {
      console.error('WAV manifest file is null or undefined!');
      throw new Error('WAV manifest file is required');
    }

    if (!isFile(manifestFile)) {
      console.error('Provided WAV manifest is not a valid file!', manifestFile);
      throw new Error('WAV manifest must be a valid file');
    }

    // Generate a unique ID for the manifest
    const manifestId = ID.unique();
    console.log(`Generated WAV manifest ID: ${manifestId}`);

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
      
      // Get bucket ID from env (or default)
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
      if (!bucketId) {
        console.error('NEXT_PUBLIC_BUCKET_ID is not defined in environment variables');
        throw new Error('Storage bucket ID not configured');
      }
      
      console.log(`Uploading WAV manifest to Appwrite, bucket: ${bucketId}...`);
      
      // Upload WAV manifest to Appwrite Storage with retries
      const result = await uploadWithRetry(manifestFile, manifestId);
      
      console.log(`WAV manifest uploaded successfully, Appwrite ID: ${result?.$id}`);

      // Return the ID of the uploaded manifest
      return result?.$id || manifestId;
    } catch (error) {
      console.error('Error uploading WAV manifest file to Appwrite:', error);
      const errorMessage = error instanceof Error 
        ? `Upload failed: ${error.message}` 
        : 'Unknown error during upload';
      throw new Error(errorMessage);
    }
  }, []);

  const createPost = useCallback(async (params: UploadParams): Promise<UploadResult> => {
    const { audio, image, mp3, m3u8, segments, wavSegments, wavManifest, trackname, genre, userId = 'anonymous', onProgress } = params;
                                
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

      if (wavSegments) {
        for (const wavSegment of wavSegments) {
          if (typeof wavSegment !== 'string' && !isFile(wavSegment)) {
            throw new Error('Each WAV segment must be a valid file or ID string');
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

      // Helper function to update progress with consistent formatting
      const updateProgress = (stage: string, progress: number) => {
        if (onProgress) {
          // Calculate time spent so far in seconds
          const timeSpentSec = Math.round((Date.now() - startTime) / 1000);
          const minutes = Math.floor(timeSpentSec / 60);
          const seconds = timeSpentSec % 60;
          
          // Create time spent string
          const timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          // Estimate remaining time based on progress
          let estimatedTimeLeft = '';
          if (progress > 5) { // Only start estimating after 5% to avoid wild initial estimates
            const totalEstimatedSec = (timeSpentSec / progress) * 100;
            const remainingSec = Math.max(0, Math.round(totalEstimatedSec - timeSpentSec));
            const remainingMin = Math.floor(remainingSec / 60);
            const remainingSecs = remainingSec % 60;
            estimatedTimeLeft = `${remainingMin}:${remainingSecs.toString().padStart(2, '0')}`;
          }
          
          console.log(`Progress update: ${stage} - ${Math.round(progress)}% (${timeSpent} elapsed, ~${estimatedTimeLeft} remaining)`);
          onProgress(stage, progress, estimatedTimeLeft);
        }
      };

      // First, upload original audio (WAV) only if there are no WAV segments
      let audioId = '';
      if (audio && isFile(audio) && (!wavSegments || wavSegments.length === 0)) {
        updateProgress('Uploading original audio', 5);
        audioId = ID.unique();
        const audioUploadResult = await uploadWithRetry(audio, audioId);
        if (audioUploadResult && audioUploadResult.$id) {
          audioId = audioUploadResult.$id;
          console.log(`Original audio uploaded with ID: ${audioId}`);
        } else {
          console.log(`Using generated audio ID: ${audioId}`);
        }
      } else if (wavSegments && wavSegments.length > 0) {
        console.log('Using WAV segments instead of original WAV file');
      }

      // Upload image with compression
      updateProgress('Compressing and uploading cover image', 15);
      const imageId = ID.unique();
      console.log(`Compressing image: original size ${formatFileSize(image.size)}`);
      
      // Explicitly cast the result of imageCompression to any to avoid type error
      // The library actually returns a Blob that is compatible with storage.createFile
      const optimizedImage = await imageCompression(image, imageOptions) as any;
      
      console.log(`Image compressed: new size ${formatFileSize(optimizedImage.size)}`);
      
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
      updateProgress('Processing MP3 segments', 60);
      let segmentIds: string[] = [];
      if (segments && segments.length > 0) {
        console.log(`Processing ${segments.length} MP3 segments:`, segments);
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
              console.log(`Uploaded MP3 segment file ${segmentFile.name}, got Appwrite ID: ${segmentId}`);
              segmentIds.push(segmentId);
            } catch (error) {
              console.error(`Error uploading MP3 segment ${i}:`, error);
              throw new Error(`Failed to upload MP3 segment ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else if (typeof segment === 'string') {
            // If it's already an ID string, just use it
            console.log(`Using provided MP3 segment ID: ${segment}`);
            segmentIds.push(segment);
          }
          // Update progress for each segment
          updateProgress(`Processing MP3 segment ${i+1}/${segments.length}`, 60 + (i / segments.length * 10));
        }
        console.log(`Final MP3 segment IDs for M3U8 and DB:`, segmentIds);
      }

      // Handle WAV segments upload if provided
      updateProgress('Processing WAV segments', 50);
      let wavSegmentIds: string[] = [];
      if (wavSegments && wavSegments.length > 0) {
        console.log(`Processing ${wavSegments.length} WAV segments:`, wavSegments);
        for (let i = 0; i < wavSegments.length; i++) {
          const wavSegment = wavSegments[i];
          if (isFile(wavSegment)) {
            // If it's a file, upload it to the same bucket
            const wavSegmentFile = wavSegment as File;
            try {
              const uploadResult = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                wavSegmentFile
              );
              const wavSegmentId = uploadResult.$id;
              console.log(`Uploaded WAV segment file ${wavSegmentFile.name}, got Appwrite ID: ${wavSegmentId}`);
              wavSegmentIds.push(wavSegmentId);
            } catch (error) {
              console.error(`Error uploading WAV segment ${i}:`, error);
              throw new Error(`Failed to upload WAV segment ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else if (typeof wavSegment === 'string') {
            // If it's already an ID string, just use it
            console.log(`Using provided WAV segment ID: ${wavSegment}`);
            wavSegmentIds.push(wavSegment);
          }
          // Update progress for each WAV segment
          updateProgress(`Processing WAV segment ${i+1}/${wavSegments.length}`, 50 + (i / wavSegments.length * 10));
        }
        console.log(`Final WAV segment IDs for DB:`, wavSegmentIds);
      }

      // Upload WAV manifest if provided
      updateProgress('Processing WAV manifest', 30);
      let wavManifestId = '';
      if (wavManifest && isFile(wavManifest)) {
        console.log(`Processing WAV manifest: ${wavManifest.name}, size: ${formatFileSize(wavManifest.size)}`);
        try {
          wavManifestId = ID.unique();
          const manifestUploadResult = await uploadWithRetry(wavManifest, wavManifestId);
          // Use the ID returned from Appwrite
          if (manifestUploadResult && manifestUploadResult.$id) {
            wavManifestId = manifestUploadResult.$id;
            console.log(`WAV manifest uploaded with ID: ${wavManifestId}`);
          } else {
            console.log(`Using generated WAV manifest ID: ${wavManifestId}`);
          }
        } catch (error) {
          console.error('Error uploading WAV manifest:', error);
          // Continue with the process even if manifest upload fails
        }
      }
        
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
          console.error('Missing required environment variables for M3U8 generation');
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
        wav_segments: wavSegmentIds.length > 0 ? JSON.stringify(wavSegmentIds) : '',
        wav_manifest_id: wavManifestId,
      });

      const post = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
        trackId,
        {
          user_id: userId,
          audio_url: audioId,
          image_url: finalImageId,
          mp3_url: mp3Id,
          m3u8_url: m3u8Id,
          trackname: trackname,
          genre: genre,
          price: "2",
          segments: segmentIds.length > 0 ? JSON.stringify(segmentIds) : '',
          wav_segments: wavSegmentIds.length > 0 ? JSON.stringify(wavSegmentIds) : '',
          wav_manifest_id: wavManifestId,
          created_at: new Date().toISOString(),
        }
      );

      console.log('Document created successfully, details:', {
        id: post.$id,
        m3u8_url: post.m3u8_url,
        segments: post.segments,
        wav_segments: post.wav_segments
      });

      updateProgress('Upload completed', 100);
      return {
        success: true,
        trackId: post.$id
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
    
    // Ensure we're using actual IDs, not placeholder values
    if (segmentIds.some(id => id === 'unique()' || !id)) {
      console.error('Invalid segment IDs detected:', segmentIds.filter(id => id === 'unique()' || !id));
      return null;
    }
    
    // Create the standard HLS playlist with just segment IDs
    let playlist = "#EXTM3U\n";
    playlist += "#EXT-X-VERSION:3\n";
    playlist += "#EXT-X-MEDIA-SEQUENCE:0\n";
    playlist += "#EXT-X-ALLOW-CACHE:YES\n";
    playlist += "#EXT-X-TARGETDURATION:10\n";
    playlist += "#EXT-X-PLAYLIST-TYPE:VOD\n";
    
    // Add each segment with its ID directly
    for (const segmentId of segmentIds) {
      // Check that we have a valid ID
      if (!segmentId || segmentId === 'unique()') {
        console.error(`Invalid segment ID detected: "${segmentId}"`);
        continue;
      }
      
      playlist += "#EXTINF:10,\n";
      console.log(`Adding segment ${segmentId} to playlist`);
      playlist += `${segmentId}\n`;
    }
    
    // End the playlist
    playlist += "#EXT-X-ENDLIST\n";
    
    return playlist;
  };

  return { createPost, createSegmentFile, createWavSegmentFile, createWavManifestFile };
} 
