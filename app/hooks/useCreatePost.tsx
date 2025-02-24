import { database, storage, ID } from '@/libs/AppWriteClient';
import { generateM3u8 } from '@/app/utils/generateM3u8';
import { createM3U8File } from '@/app/utils/streaming';

export const useCreatePost = async (
    fileAudio: File,
    imageFile: File,
    user_id: string,
    trackname: string,
    mp3File: File,
    genre: string,
    segmentFiles: File[],
    m3u8File: File,
    onProgress?: (uploadedSize: number, stage: string, estimatedTime?: string) => void
) => {
    let uploadedSize = 0;
    const totalSize = fileAudio.size + imageFile.size + mp3File.size + 
                     segmentFiles.reduce((acc, seg) => acc + seg.size, 0) + 
                     m3u8File.size;
    const startTime = Date.now();

    const getEstimatedTime = (progress: number) => {
        const elapsedTime = Date.now() - startTime;
        const estimatedTotalTime = (elapsedTime / progress) * 100;
        const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        return `Estimated time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    console.log("Создание поста для трека:", trackname);

    try {
        // Загружаем изображение
        onProgress?.(0, 'Preparing cover image...', getEstimatedTime(1));
        const imageResponse = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            imageFile
        );
        const imageId = imageResponse.$id;
        uploadedSize += imageFile.size;
        const progressImage = (uploadedSize / totalSize) * 100;

        // Загружаем WAV файл
        onProgress?.(progressImage, 'Uploading WAV file...', getEstimatedTime(progressImage));
        const wavResponse = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            fileAudio
        );
        uploadedSize += fileAudio.size;
        const progressWav = (uploadedSize / totalSize) * 100;

        // Загружаем сегменты
        onProgress?.(progressWav, 'Creating track segments...', getEstimatedTime(progressWav));
        const segmentIds: string[] = [];
        const segmentResponses = [];

        for (let i = 0; i < segmentFiles.length; i++) {
            const segmentId = ID.unique();
            const segmentResponse = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                segmentId,
                segmentFiles[i]
            );
            
            segmentResponses.push(segmentResponse);
            segmentIds.push(segmentResponse.$id);

                uploadedSize += segmentFiles[i].size;
            const progress = (uploadedSize / totalSize) * 100;
            onProgress?.(
                progress, 
                `Creating track segments (${i + 1}/${segmentFiles.length})`,
                getEstimatedTime(progress)
            );
        }
        console.log("Идентификаторы загруженных сегментов:", segmentIds);

        // Создаем M3U8 файл
        onProgress?.(90, 'Creating playlist...', getEstimatedTime(90));
        const m3u8File = createM3U8File(segmentIds);
        const m3u8Response = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            m3u8File
        );

        // Загружаем MP3 файл
        onProgress?.(95, 'Uploading MP3 file...', getEstimatedTime(95));
        const mp3Response = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            mp3File
        );

        // Создаем документ со всеми ID
        onProgress?.(98, 'Finalizing release...', getEstimatedTime(98));
        const documentId = await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
            ID.unique(),
            {
                user_id,
                trackname,
                genre,
                created_at: new Date().toISOString(),
                image_url: imageId,
                audio_url: wavResponse.$id,  // WAV файл
                mp3_url: mp3Response.$id,    // MP3 файл
                streaming_urls: segmentIds,   // Сегменты
                m3u8_url: m3u8Response.$id   // Плейлист
            }
        );
        console.log("Документ создан с ID:", documentId.$id);

        onProgress?.(100, 'Release complete! Redirecting to your profile...', '');
        return documentId;
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
};
