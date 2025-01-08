import { database, storage } from "@/libs/AppWriteClient";
import toast from 'react-hot-toast';

const useUpdatePost = async (
    postId: string,
    userId: string,
    trackname: string | null,
    caption: string | null,
    file: File | null,
    mp3File: File | null,
    imageFile: File | null
) => {
    try {
        const audioId = file ? Math.random().toString(36).slice(2, 22) : undefined;
        const mp3Id = mp3File ? Math.random().toString(36).slice(2, 22) : undefined;
        const imageId = imageFile ? Math.random().toString(36).slice(2, 22) : undefined;

        const existingPost = await database.getDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST),
            postId
        );

        if (!existingPost) {
            toast.error("Документ не найден с указанным ID.", { duration: 30000 });
            return;
        }

        const updateData: Record<string, any> = {};

        if (trackname) {
            updateData.trackname = trackname; // Убедитесь, что это соответствует модели
        }

        if (caption) {
            updateData.text = caption;  // Здесь caption записывается в атрибут text
        }

        console.log("Обновляемые данные:", updateData); // Добавьте лог для отладки

        // Обновление документа
        await database.updateDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID), 
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_POST), 
            postId, 
            updateData
        );

        // Загрузка файлов
        if (file && audioId) {
            await storage.createFile(String(process.env.NEXT_PUBLIC_BUCKET_ID), audioId, file);
        }

        if (mp3File && mp3Id) {
            await storage.createFile(String(process.env.NEXT_PUBLIC_BUCKET_ID), mp3Id, mp3File);
        }

        if (imageFile && imageId) {
            await storage.createFile(String(process.env.NEXT_PUBLIC_BUCKET_ID), imageId, imageFile);
        }

        console.log("Пост успешно обновлен:", postId);
    } catch (error) {
        console.error("Ошибка при обновлении поста:", error);
        toast.error('Произошла ошибка при обновлении поста.', { duration: 30000 });
        throw error; // Возможно, вам нужно обработать ошибку
    }
};

export default useUpdatePost;
