import { database, storage, ID } from '@/libs/AppWriteClient';
import { createM3U8File, optimizeImage } from '@/app/utils/streaming';
import { ProcessingStats } from '@/app/types';
import toast from 'react-hot-toast';
import { convertWavToMp3 } from '@/app/utils/streaming';

export const useUpdatePost = async (
    postId: string,
    userId: string,
    trackname: string,
    fileAudio: File | null,
    mp3File: File | null,
    imageFile: File | null,
    m3u8Url: string | null,
    onProgress?: (stats: ProcessingStats) => void
) => {
    try {
        onProgress?.({
            stage: 'Starting update process',
            progress: 0,
            details: 'Initializing...'
        });

        let audioUrl = null;
        let mp3Url = null;
        let m3u8Url = null;
        let imageUrl = null;

        // Если есть новый аудио файл
        if (fileAudio) {
            onProgress?.({
                stage: 'Processing audio',
                progress: 10,
                details: 'Converting audio format...'
            });

            // Конвертируем WAV в MP3
            const mp3Result = await convertWavToMp3(fileAudio, (progress: any) => {
                onProgress?.({
                    stage: 'Converting WAV to MP3',
                    progress: 20 + progress * 0.2,
                    details: `Converting: ${Math.round(progress)}%`
                });
            });
            if (!(mp3Result as any).success) {
                throw new Error('Failed to convert audio');
            }

            // Загружаем оригинальный файл
            const audioFile = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                fileAudio
            );
            audioUrl = audioFile.$id;

            // Загружаем MP3
            
            const mp3Blob = new Blob([mp3Result as any], { type: 'audio/mp3' });
            const mp3FileUpload = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                new File([mp3Blob], 'audio.mp3', { type: 'audio/mp3' })
            );
            mp3Url = mp3FileUpload.$id;
            onProgress?.({
                stage: 'Creating segments',
                progress: 50,
                details: 'Processing audio segments...'
            });
            // Создаем сегменты и M3U8
            const segments = await createM3U8File(mp3Blob as any);

            // Ensure segments is an array before accessing length
            if (Array.isArray(segments)) {
                onProgress?.({
                    stage: 'Uploading segments',
                    progress: 70,
                    details: 'Uploading audio segments...'
                });

                // Upload segments
                for (let i = 0; i < segments.length; i++) {
                    const segmentData = segments[i].data; // Ensure segment data is correctly accessed
                    const segmentName = segments[i].name; // Ensure segment name is correctly accessed
                    const segmentFile = new File([segmentData], segmentName, { type: 'audio/mp4' });
                    await storage.createFile(
                        process.env.NEXT_PUBLIC_BUCKET_ID!,
                        ID.unique(),
                        segmentFile
                    );

                    onProgress?.({
                        stage: 'Uploading segments',
                        progress: 70 + (i / segments.length) * 20,
                        details: `Uploading segment ${i + 1}/${segments.length}`
                    });
                }
            } else {
                throw new Error('Segments creation failed, expected an array.');
            }

            // Создаем M3U8 файл
            const m3u8Data = await createM3U8File(segments as any, 
            );
            
            const m3u8Upload = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                m3u8Data
            );
            m3u8Url = m3u8Upload.$id;
        }

        // Если есть новое изображение
        if (imageFile) {
            onProgress?.({
                stage: 'Processing image',
                progress: 90,
                details: 'Uploading artwork...'
            });

            const image = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                imageFile
            );
            imageUrl = image.$id;
        }

        onProgress?.({
            stage: 'Finalizing',
            progress: 95,
            details: 'Updating database...'
        });

        // Обновляем документ в базе данных
        const updatedPost = await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
            postId, 
            {
                ...(trackname && { trackname }),
                ...(audioUrl && { audio_url: audioUrl }),
                ...(mp3Url && { mp3_url: mp3Url }),
                ...(m3u8Url && { m3u8_url: m3u8Url }),
                ...(imageUrl && { image_url: imageUrl })
            }
        );

        onProgress?.({
            stage: 'Complete',
            progress: 100,
            details: 'Track updated successfully!'
        });

        return updatedPost;

    } catch (error) {
        console.error("Error updating post:", error);
        onProgress?.({
            stage: 'Error',
            progress: 0,
            details: 'Failed to update track. Please try again.'
        });
        toast.error('Произошла ошибка при обновлении поста.', { duration: 30000 });
        throw error;
    }
};

export default useUpdatePost;
