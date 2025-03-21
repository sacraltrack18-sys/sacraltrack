import { storage, database } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useCallback } from 'react';
import { saveUploadProgress, getUploadProgress } from '@/app/utils/audioUtils';

// Create a type for the upload parameters 
interface UploadParams {
  audio?: string | File | Blob;  // Может быть строкой (путь) или файлом
  image: File;
  mp3?: File | Blob;  // Может быть null для прямой загрузки без предобработки
  m3u8?: File | Blob;  // Может быть null для прямой загрузки без предобработки
  segments?: File[] | string[];  // Может быть null для прямой загрузки без предобработки
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

// Функция для проверки, является ли значение файлом
function isFile(value: any): value is File {
  return value && typeof value === 'object' && 'size' in value && 'type' in value && 'name' in value;
}

// Функция для загрузки файла с повторными попытками
async function uploadWithRetry(file: File, fileId: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Логируем информацию о переменной окружения и загрузке
      console.log(`Uploading file to bucket ID: ${process.env.NEXT_PUBLIC_BUCKET_ID}`);
      
      const response = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
        fileId,
        file
      );
      return response;
    } catch (error) {
      console.error(`Попытка ${attempt}/${retries} загрузки не удалась:`, error);
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
  // Функция для загрузки отдельного сегмента и получения его ID
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

    // Генерируем уникальный ID для сегмента
    const segmentId = ID.unique();
    console.log(`Generated segment ID: ${segmentId}`);

    try {
      // Проверяем доступность хранилища
      if (!storage) {
        console.error('Storage client is undefined!');
        throw new Error('Storage client is not available');
      }
      
      if (typeof storage.createFile !== 'function') {
        console.error('storage.createFile is not a function!', storage);
        throw new Error('Storage client API is not available');
      }
      
      console.log(`Uploading segment to Appwrite, bucket: ${process.env.NEXT_PUBLIC_BUCKET_ID}...`);
      
      // Загружаем сегмент в Appwrite Storage с повторными попытками
      const result = await uploadWithRetry(segmentFile, segmentId);
      
      console.log(`Segment uploaded successfully, Appwrite ID: ${result?.$id}`);

      // Возвращаем ID загруженного сегмента - это важно для М3U8 плейлиста
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
      // Проверяем корректность параметров
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

      // Проверка доступности API клиентов
      if (!storage || typeof storage.createFile !== 'function') {
        console.error('Storage client is not properly initialized');
        throw new Error('Storage client is not available');
      }

      if (!database || typeof database.createDocument !== 'function') {
        console.error('Database client is not properly initialized');
        throw new Error('Database client is not available');
      }

      // Генерируем уникальный ID для трека
      const trackId = ID.unique();
      const startTime = Date.now();

      // Логируем информацию о базе данных и коллекции
      console.log(`Database ID: ${process.env.NEXT_PUBLIC_DATABASE_ID}`);
      console.log(`Collection ID: ${process.env.NEXT_PUBLIC_COLLECTION_ID_POST}`);

      // Функция для расчета оставшегося времени
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

      // Upload cover image
      updateProgress('Uploading cover image', 33);
        const imageId = ID.unique();
      const imageUploadResult = await uploadWithRetry(image, imageId);
      // Use the ID returned from Appwrite
      const finalImageId = imageUploadResult && imageUploadResult.$id ? imageUploadResult.$id : imageId;
      console.log(`Image file uploaded with ID: ${finalImageId}`);

      // Upload MP3 version if provided
      updateProgress('Uploading MP3 version', 66);
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
      updateProgress('Processing segments', 75);
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
          updateProgress(`Processing segment ${i+1}/${segments.length}`, 75 + (i / segments.length * 5));
        }
        console.log(`Final segment IDs for M3U8 and DB:`, segmentIds);
      }

      // Generate M3U8 playlist if segments are available and no m3u8 file provided
      updateProgress('Generating playlist', 80);
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
        // Create M3U8 playlist from segment IDs
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
          console.error('Missing required environment variables for M3U8 generation');
        }
        
        // Generate M3U8 content using the verified environment variables
        const m3u8Content = generateM3U8Playlist(segmentIds, appwriteEndpoint, bucketId, projectId);
        console.log(`Generated M3U8 content (first 200 chars):`, m3u8Content?.substring(0, 200) + '...');
        
        if (m3u8Content) {
          m3u8Id = ID.unique();
          const m3u8File = new File([m3u8Content], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' });
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

      // Create database record
      updateProgress('Creating database record', 90);
      
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
          price: 2, // Default price from the schema
          segments: segmentIds.length > 0 ? JSON.stringify(segmentIds) : '',
                created_at: new Date().toISOString(),
            }
        );

      console.log('Document created successfully, details:', {
        id: post.$id,
        m3u8_url: post.m3u8_url,
        segments: post.segments
      });

      updateProgress('Upload complete', 100);
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

  return { createPost, createSegmentFile };
} 