import { storage } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';

interface SegmentUploadResult {
    id: string;
    url: string;
    duration: number;
}

export const useUploadSegment = () => {
    const uploadSegment = async (segmentBlob: Blob, index: number): Promise<SegmentUploadResult> => {
        try {
            // Get bucket ID from environment variables
            const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
            const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL;
            const projectId = process.env.NEXT_PUBLIC_ENDPOINT;

            // Log environment configuration for debugging
            console.log('Upload environment config:', {
                bucketId,
                appwriteUrl,
                projectId
            });

            if (!bucketId || !appwriteUrl || !projectId) {
                throw new Error(`Missing required Appwrite configuration: ${!bucketId ? 'bucketId' : ''} ${!appwriteUrl ? 'appwriteUrl' : ''} ${!projectId ? 'projectId' : ''}`);
            }

            // Создаем файл из блоба
            const segmentFile = new File([segmentBlob], `segment-${index}.mp3`, { type: 'audio/mp3' });
            
            // Log upload attempt
            console.log(`Attempting to upload segment ${index} to Appwrite bucket ${bucketId}`);
            
            // Загружаем в Appwrite storage, позволяя Appwrite сгенерировать ID
            const uploadResult = await storage.createFile(
                bucketId,
                ID.unique(),  // Использовать ID.unique() вместо 'unique()'
                segmentFile
            );

            if (!uploadResult) {
                throw new Error(`Failed to upload segment ${index} to storage`);
            }

            // Формируем URL для сегмента
            const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${uploadResult.$id}/view?project=${projectId}`;

            // Log successful upload
            console.log(`Successfully uploaded segment ${index}:`, {
                id: uploadResult.$id,
                fileSize: segmentFile.size,
                timestamp: new Date().toISOString()
            });

            return {
                id: uploadResult.$id,
                url: fileUrl,
                duration: 10 // Предполагаемая длительность или можно передавать как параметр
            };
        } catch (error) {
            console.error('Error uploading segment:', error);
            // Provide more details about the error
            const errorMessage = error instanceof Error 
                ? error.message
                : 'Unknown error';
                
            throw new Error(`Failed to upload segment ${index}: ${errorMessage}`);
        }
    };

    return { uploadSegment };
}; 