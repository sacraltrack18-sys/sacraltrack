import { storage } from "@/libs/AppWriteClient";
import Image from "image-js";

// Кэш для проверки поддержки WebP
let webPSupportCache: boolean | null = null;

// Функция для проверки поддержки WebP (с кэшированием)
const checkWebPSupport = (): boolean => {
    if (webPSupportCache !== null) return webPSupportCache;
    
    if (typeof window === 'undefined') {
        webPSupportCache = false;
        return false;
    }
    
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        webPSupportCache = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
        webPSupportCache = false;
    }
    
    return webPSupportCache;
};

const useChangeUserImage = async (file: File, cropper: any, currentImage: string) => {
    let audioId = Math.random().toString(36).slice(2, 22);

    try {
        // Оптимизация: используем FileReader вместо fetch для лучшей производительности
        const imageBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
        
        // Load the image
        const image = await Image.load(imageBuffer);
        
        // Оптимизированные размеры для разных устройств
        const MAX_DIMENSION = 300; // Уменьшили для лучшей производительности
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
        
        // Проверяем поддержку WebP браузером (с кэшированием)
        const isWebPSupported = checkWebPSupport();
        
        // Определяем формат вывода и MIME-тип
        const outputFormat = isWebPSupported ? 'webp' : 'jpeg';
        const mimeType = isWebPSupported ? 'image/webp' : 'image/jpeg';
        
        // Оптимизированные параметры качества
        const quality = isWebPSupported ? 0.8 : 0.85; // WebP может быть более агрессивным
        
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

        // Асинхронно удаляем старое изображение (не блокируем основной поток)
        if (currentImage && 
            !currentImage.includes('/images/placeholders/') &&
            currentImage !== "undefined" && 
            currentImage !== "null") {
            // Удаляем в фоне, не ждем завершения
            storage.deleteFile(String(process.env.NEXT_PUBLIC_BUCKET_ID), currentImage)
                .catch(error => console.warn('Failed to delete old image:', error));
        }

        return result?.$id;
    } catch (error) {
        console.error('Error occurred in useChangeUserImage:', error);
        throw error;
    }
};

export default useChangeUserImage;
