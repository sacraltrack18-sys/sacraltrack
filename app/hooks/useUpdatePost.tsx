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
            const mp3Result = await convertWavToMp3(fileAudio);
            if (!mp3Result.success) {
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
            const mp3Blob = new Blob([mp3Result.data], { type: 'audio/mp3' });
            const mp3FileUpload = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                mp3File
            );
            mp3Url = mp3FileUpload.$id;

            onProgress?.({
                stage: 'Creating segments',
                progress: 50,
                details: 'Processing audio segments...'
            });

            // Создаем сегменты и M3U8
            const segments = await createM3U8File(mp3File);
            
            onProgress?.({
                stage: 'Uploading segments',
                progress: 70,
                details: 'Uploading audio segments...'
            });

            // Загружаем сегменты
            for (let i = 0; i < segments.length; i++) {
                const segmentFile = new File([segments[i].data], segments[i].name, { type: 'audio/mp4' });
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

            // Создаем M3U8 файл
            const m3u8Content = segments.map((seg, idx) => `#EXTINF:10.0,\nsegment_${idx}.ts`).join('\n');
            const m3u8Blob = new Blob([m3u8Content], { type: 'application/x-mpegURL' });
            const m3u8File = new File([m3u8Blob], 'playlist.m3u8', { type: 'application/x-mpegURL' });
            
            const m3u8Upload = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                ID.unique(),
                m3u8File
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
