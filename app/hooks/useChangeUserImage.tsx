import { storage } from "@/libs/AppWriteClient";
import Image from "image-js";

const useChangeUserImage = async (file: File, cropper: any, currentImage: string) => {
    let audioId = Math.random().toString(36).slice(2, 22);

    try {
        const response = await fetch(URL.createObjectURL(file));
        const imageBuffer = await response.arrayBuffer();
        
        // Load the image
        const image = await Image.load(imageBuffer);
        
        // Размер для хранения - сохраняем пропорции и не обрезаем изображение
        const MAX_DIMENSION = 400; // Максимальный размер любой из сторон
        let width = image.width;
        let height = image.height;
        
        // Уменьшаем размер изображения, сохраняя пропорции
        if (width > height) {
            if (width > MAX_DIMENSION) {
                height = (height * MAX_DIMENSION) / width;
                width = MAX_DIMENSION;
            }
        } else {
            if (height > MAX_DIMENSION) {
                width = (width * MAX_DIMENSION) / height;
                height = MAX_DIMENSION;
            }
        }
        
        // Масштабируем изображение
        const resizedImage = image.resize({ width: Math.round(width), height: Math.round(height) });
        
        // Проверяем поддержку WebP браузером
        const isWebPSupported = typeof window !== 'undefined' && 
            !!(window.OffscreenCanvas || 
            (document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0));
        
        // Определяем формат вывода и MIME-тип
        const outputFormat = isWebPSupported ? 'webp' : 'jpeg';
        const mimeType = isWebPSupported ? 'image/webp' : 'image/jpeg';
        
        console.log(`Using ${outputFormat} format for profile image optimization`);
        
        // Параметры оптимизации
        const quality = 0.85; // Хорошее качество, но с компрессией
        
        // Конвертируем в blob для загрузки
        const blob = await resizedImage.toBlob(mimeType, quality);
        const arrayBuffer = await blob.arrayBuffer();
        
        // Генерируем правильное расширение файла
        const fileExt = isWebPSupported ? '.webp' : '.jpg';
        const fileName = `profile_${audioId}${fileExt}`;
        
        const finalFile = new File([arrayBuffer], fileName, { type: mimeType });

        // Загружаем файл
        const result = await storage.createFile(
            String(process.env.NEXT_PUBLIC_BUCKET_ID), 
            audioId, 
            finalFile
        );

        // Удаляем старое изображение
        if (currentImage && 
            !currentImage.includes('/images/placeholders/') &&
            currentImage !== "undefined" && 
            currentImage !== "null") {
            try {
                await storage.deleteFile(String(process.env.NEXT_PUBLIC_BUCKET_ID), currentImage);
            } catch (error) {
                console.warn('Failed to delete old image:', error);
                // Продолжаем даже если не удалось удалить старое изображение
            }
        }

        return result?.$id;
    } catch (error) {
        console.error('Error occurred in useChangeUserImage:', error);
        throw error;
    }
};

export default useChangeUserImage;
