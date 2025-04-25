import { database, ID } from '@/libs/AppWriteClient';
import { useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { useClientUpload } from './useClientUpload';

// Тип для параметров загрузки
interface UploadParams {
  audio: File;
  image: File;
  mp3?: File | Blob;
  m3u8?: File | Blob;
  segments?: File[] | string[];
  trackname: string;
  genre: string;
  userId?: string;
  onProgress?: (stage: string, progress: number, estimatedTime?: string) => void;
}

// Тип для результата загрузки
interface UploadResult {
  success: boolean;
  trackId: string;
  error?: string;
}

// Уточним имя коллекции для записей постов
const COLLECTION_ID = process.env.NEXT_PUBLIC_COLLECTION_ID_POSTS || process.env.NEXT_PUBLIC_COLLECTION_ID_POST || '';

// Функция для оптимизации изображения
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

// Функция для генерации M3U8 плейлиста
function generateM3U8Playlist(
  segmentIds: string[], 
  appwriteEndpoint: string = process.env.NEXT_PUBLIC_APPWRITE_URL || '', 
  bucketId: string = process.env.NEXT_PUBLIC_BUCKET_ID || '',
  projectId: string = process.env.NEXT_PUBLIC_ENDPOINT || ''
): string | null {
  try {
    // Если нет сегментов, возвращаем null
    if (!segmentIds || segmentIds.length === 0) {
      console.warn('No segments to generate M3U8 playlist');
      return null;
    }

    // Создаем базовый плейлист
    let m3u8Content = '#EXTM3U\n';
    m3u8Content += '#EXT-X-VERSION:3\n';
    m3u8Content += '#EXT-X-ALLOW-CACHE:YES\n';
    m3u8Content += '#EXT-X-TARGETDURATION:10\n'; // Предполагаем длительность 10 секунд
    m3u8Content += '#EXT-X-MEDIA-SEQUENCE:0\n';

    // Добавляем сегменты
    for (let i = 0; i < segmentIds.length; i++) {
      const segmentId = segmentIds[i];
      m3u8Content += '#EXTINF:10.0,\n'; // Каждый сегмент примерно 10 секунд
      
      // Формируем URL для сегмента
      m3u8Content += `${appwriteEndpoint}/storage/buckets/${bucketId}/files/${segmentId}/view?project=${projectId}\n`;
    }

    // Завершаем плейлист
    m3u8Content += '#EXT-X-ENDLIST';

    return m3u8Content;
  } catch (error) {
    console.error('Error generating M3U8 playlist:', error);
    return null;
  }
}

// Основной хук для создания поста с клиентской загрузкой
export function useClientCreatePost() {
  const { uploadAudio, uploadImage, uploadSegment } = useClientUpload();
  
  // Функция для загрузки сегмента
  const createSegmentFile = useCallback(async (segmentFile: File): Promise<string> => {
    console.log(`createSegmentFile called with file: ${segmentFile?.name}, size: ${segmentFile?.size} bytes`);
    
    try {
      const result = await uploadSegment(segmentFile, 0, 1);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload segment');
      }
      
      return result.fileId;
    } catch (error) {
      console.error('Error uploading segment file:', error);
      throw error;
    }
  }, [uploadSegment]);
  
  // Основная функция для создания поста
  const createPost = useCallback(async (params: UploadParams): Promise<UploadResult> => {
    const { audio, image, mp3, m3u8, segments, trackname, genre, userId = 'anonymous', onProgress } = params;
    
    try {
      // Валидация параметров
      if (!audio) {
        throw new Error('Audio file is required');
      }
      
      if (!image) {
        throw new Error('Image file is required');
      }
      
      if (!trackname || !genre) {
        throw new Error('Track name and genre are required');
      }
      
      // Проверяем наличие обработанных файлов
      if (!mp3) {
        throw new Error('Processed MP3 file is required for client-side upload');
      }
      
      // Генерируем ID для трека
      const trackId = ID.unique();
      const startTime = Date.now();
      
      // Функция для расчета оставшегося времени
      const getEstimatedTime = (progress: number) => {
        const elapsedTime = Date.now() - startTime;
        const estimatedTotalTime = (elapsedTime / progress) * 100;
        const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        return `Estimated time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
      // Функция для обновления прогресса
      const updateProgress = (stage: string, progress: number) => {
        if (onProgress) {
          console.log(`Progress update: ${stage} - ${progress}%`);
          onProgress(stage, progress, getEstimatedTime(progress));
        }
      };
      
      // Загрузка основного аудио файла
      updateProgress('Uploading main audio', 0);
      const audioUploadResult = await uploadAudio(audio, (stage, progress) => {
        updateProgress('Uploading main audio', progress);
      });
      
      if (!audioUploadResult.success) {
        throw new Error(`Failed to upload audio: ${audioUploadResult.error}`);
      }
      
      const audioId = audioUploadResult.fileId;
      
      // Оптимизация и загрузка обложки
      updateProgress('Processing cover image', 20);
      const optimizedImage = await optimizeImage(image);
      
      updateProgress('Uploading cover image', 25);
      const imageUploadResult = await uploadImage(optimizedImage, (stage, progress) => {
        // Масштабируем прогресс изображения от 25% до 35%
        const scaledProgress = 25 + (progress / 100) * 10;
        updateProgress('Uploading cover image', scaledProgress);
      });
      
      if (!imageUploadResult.success) {
        throw new Error(`Failed to upload image: ${imageUploadResult.error}`);
      }
      
      const imageId = imageUploadResult.fileId;
      
      // Загрузка MP3 файла
      updateProgress('Uploading MP3', 35);
      const mp3UploadResult = await uploadAudio(mp3 as File, (stage, progress) => {
        // Масштабируем прогресс MP3 от 35% до 45%
        const scaledProgress = 35 + (progress / 100) * 10;
        updateProgress('Uploading MP3', scaledProgress);
      });
      
      if (!mp3UploadResult.success) {
        throw new Error(`Failed to upload MP3: ${mp3UploadResult.error}`);
      }
      
      const mp3Id = mp3UploadResult.fileId;
      
      // Загрузка сегментов, если есть
      let segmentIds: string[] = [];
      let m3u8Id = '';
      
      if (segments && segments.length > 0) {
        updateProgress('Uploading segments', 45);
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          
          if (typeof segment === 'string') {
            // Если сегмент уже является ID, просто добавляем его
            segmentIds.push(segment);
          } else {
            // Иначе загружаем сегмент
            try {
              const segmentResult = await uploadSegment(segment as File, i, segments.length);
              
              if (segmentResult.success) {
                segmentIds.push(segmentResult.fileId);
                
                // Обновляем прогресс загрузки сегментов (от 45% до 80%)
                const segmentProgress = 45 + ((i + 1) / segments.length) * 35;
                updateProgress(`Uploading segment ${i + 1}/${segments.length}`, segmentProgress);
              } else {
                console.error(`Failed to upload segment ${i + 1}:`, segmentResult.error);
              }
            } catch (error) {
              console.error(`Error uploading segment ${i + 1}:`, error);
            }
          }
        }
        
        // Загружаем M3U8 плейлист если он есть
        if (m3u8 && segmentIds.length > 0) {
          updateProgress('Uploading playlist', 80);
          
          // Заменяем плейсхолдеры в m3u8 на реальные ID сегментов
          let m3u8Content = '';
          
          if (typeof m3u8 === 'string') {
            m3u8Content = m3u8;
          } else {
            // Читаем содержимое файла
            m3u8Content = await (m3u8 as File).text();
          }
          
          // Заменяем плейсхолдеры на ID сегментов
          for (let i = 0; i < segmentIds.length; i++) {
            const placeholder = `SEGMENT_PLACEHOLDER_${i}`;
            const segmentId = segmentIds[i];
            
            if (m3u8Content.includes(placeholder)) {
              m3u8Content = m3u8Content.replace(placeholder, segmentId);
            }
          }
          
          // Создаем новый файл с обновленным содержимым
          const updatedM3u8File = new File([m3u8Content], 'playlist.m3u8', { 
            type: 'application/vnd.apple.mpegurl' 
          });
          
          // Загружаем плейлист
          const m3u8UploadResult = await uploadAudio(updatedM3u8File, (stage, progress) => {
            // Масштабируем прогресс M3U8 от 80% до 90%
            const scaledProgress = 80 + (progress / 100) * 10;
            updateProgress('Uploading playlist', scaledProgress);
          });
          
          if (m3u8UploadResult.success) {
            m3u8Id = m3u8UploadResult.fileId;
          } else {
            console.error('Failed to upload M3U8 playlist:', m3u8UploadResult.error);
          }
        }
      }
      
      // Создание записи в базе данных
      updateProgress('Creating database record', 90);
      
      const record = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        COLLECTION_ID,
        trackId,
        {
          user_id: userId,
          audio_url: audioId,
          image_url: imageId,
          mp3_url: mp3Id,
          m3u8_url: m3u8Id,
          trackname,
          genre,
          segments: segmentIds.length > 0 ? JSON.stringify(segmentIds) : '',
          created_at: new Date().toISOString(),
          plays: '0'  // Преобразуем в строку для совместимости с Appwrite
        }
      );
      
      updateProgress('Upload complete', 100);
      
      return {
        success: true,
        trackId: record.$id
      };
      
    } catch (error) {
      console.error('Error creating post:', error);
      return {
        success: false,
        trackId: '',
        error: error instanceof Error ? error.message : 'Unknown error creating post'
      };
    }
  }, [uploadAudio, uploadImage, uploadSegment]);
  
  return {
    createPost,
    createSegmentFile
  };
} 