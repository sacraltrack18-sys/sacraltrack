import { storage, ID } from '@/libs/AppWriteClient';
import { useState, useCallback } from 'react';

interface UploadProgress {
  stage: string;
  progress: number;
  estimatedTime?: string;
}

interface UploadResult {
  success: boolean;
  fileId: string;
  fileUrl?: string;
  error?: string;
}

// Хук для прямой загрузки файлов с клиента в Appwrite
export function useClientUpload() {
  const [progress, setProgress] = useState<UploadProgress>({ stage: '', progress: 0 });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  // Функция для вычисления оставшегося времени
  const calculateEstimatedTime = (elapsedTime: number, progress: number): string => {
    if (progress === 0) return '...';
    
    const estimatedTotalTime = (elapsedTime / progress) * 100;
    const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Функция для загрузки аудио файла
  const uploadAudio = useCallback(async (
    file: File,
    onProgress?: (stage: string, progress: number, estimatedTime?: string) => void
  ): Promise<UploadResult> => {
    if (!file) {
      return { success: false, fileId: '', error: 'No file provided' };
    }
    
    setIsUploading(true);
    setProgress({ stage: 'Preparing upload', progress: 0 });
    
    const startTime = Date.now();
    const fileId = ID.unique();
    
    try {
      // Проверяем доступность storage API
      if (!storage || typeof storage.createFile !== 'function') {
        throw new Error('Storage client is not properly initialized');
      }
      
      const updateProgress = (stage: string, progress: number) => {
        const elapsedTime = Date.now() - startTime;
        const estimatedTime = calculateEstimatedTime(elapsedTime, progress);
        
        setProgress({ stage, progress, estimatedTime });
        
        if (onProgress) {
          onProgress(stage, progress, estimatedTime);
        }
      };
      
      // Сообщаем о начале загрузки
      updateProgress('Uploading audio', 0);
      
      // Создаем XHR для отслеживания прогресса
      const xhr = new XMLHttpRequest();
      const promise = new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            updateProgress('Uploading audio', percentage);
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error while uploading file'));
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              updateProgress('Upload complete', 100);
              
              const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || '';
              const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
              const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
              
              // Формируем URL файла
              const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${response.$id}/view?project=${projectId}`;
              
              resolve({
                success: true,
                fileId: response.$id,
                fileUrl
              });
            } catch (error) {
              reject(new Error(`Failed to parse upload response: ${error}`));
            }
          } else {
            reject(new Error(`Server returned error status: ${xhr.status} ${xhr.statusText}`));
          }
        };
      });
      
      // Выполняем загрузку через Appwrite SDK
      const result = await storage.createFile(
        process.env.NEXT_PUBLIC_BUCKET_ID!,
        fileId,
        file
      );
      
      // Формируем URL для файла
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || '';
      const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
      const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
      const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${result.$id}/view?project=${projectId}`;
      
      setIsUploading(false);
      return {
        success: true,
        fileId: result.$id,
        fileUrl
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      setIsUploading(false);
      return {
        success: false,
        fileId: '',
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }, []);
  
  // Функция для загрузки изображения
  const uploadImage = useCallback(async (
    file: File,
    onProgress?: (stage: string, progress: number, estimatedTime?: string) => void
  ): Promise<UploadResult> => {
    if (!file) {
      return { success: false, fileId: '', error: 'No image file provided' };
    }
    
    setIsUploading(true);
    setProgress({ stage: 'Preparing image upload', progress: 0 });
    
    const startTime = Date.now();
    const fileId = ID.unique();
    
    try {
      // Обновление прогресса
      const updateProgress = (stage: string, progress: number) => {
        const elapsedTime = Date.now() - startTime;
        const estimatedTime = calculateEstimatedTime(elapsedTime, progress);
        
        setProgress({ stage, progress, estimatedTime });
        
        if (onProgress) {
          onProgress(stage, progress, estimatedTime);
        }
      };
      
      // Сообщаем о начале загрузки
      updateProgress('Uploading image', 0);
      
      // Загружаем изображение
      const result = await storage.createFile(
        process.env.NEXT_PUBLIC_BUCKET_ID!,
        fileId,
        file
      );
      
      // Формируем URL для файла
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || '';
      const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
      const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
      const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${result.$id}/view?project=${projectId}`;
      
      updateProgress('Upload complete', 100);
      setIsUploading(false);
      
      return {
        success: true,
        fileId: result.$id,
        fileUrl
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
      return {
        success: false,
        fileId: '',
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }, []);
  
  // Функция для загрузки сегмента
  const uploadSegment = useCallback(async (
    segmentFile: File,
    segmentIndex: number,
    totalSegments: number
  ): Promise<UploadResult> => {
    if (!segmentFile) {
      return { success: false, fileId: '', error: 'No segment file provided' };
    }
    
    const segmentId = ID.unique();
    
    try {
      // Загружаем сегмент
      const result = await storage.createFile(
        process.env.NEXT_PUBLIC_BUCKET_ID!,
        segmentId,
        segmentFile
      );
      
      // Формируем URL для файла
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID || '';
      const projectId = process.env.NEXT_PUBLIC_ENDPOINT || '';
      const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1';
      const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${result.$id}/view?project=${projectId}`;
      
      return {
        success: true,
        fileId: result.$id,
        fileUrl
      };
    } catch (error) {
      console.error(`Error uploading segment ${segmentIndex}/${totalSegments}:`, error);
      return {
        success: false,
        fileId: '',
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }, []);
  
  return {
    uploadAudio,
    uploadImage,
    uploadSegment,
    progress,
    isUploading
  };
} 