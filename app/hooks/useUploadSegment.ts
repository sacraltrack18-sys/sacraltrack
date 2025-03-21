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
            // Проверяем наличие конфигурации
            const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
            const appwriteUrl = process.env.NEXT_PUBLIC_APPWRITE_URL;

            if (!bucketId || !appwriteUrl) {
                throw new Error('Missing required Appwrite configuration');
            }

            // Создаем файл из блоба
            const segmentFile = new File([segmentBlob], `segment-${index}.mp3`, { type: 'audio/mp3' });
            
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
            const fileUrl = `${appwriteUrl}/storage/buckets/${bucketId}/files/${uploadResult.$id}/view`;

            return {
                id: uploadResult.$id,
                url: fileUrl,
                duration: 10 // Предполагаемая длительность или можно передавать как параметр
            };
        } catch (error) {
            console.error('Error uploading segment:', error);
            throw new Error(`Failed to upload segment ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return { uploadSegment };
}; 