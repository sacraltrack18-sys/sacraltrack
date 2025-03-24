/**
 * Хук для оптимизации изображений на клиентской стороне
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  aspectRatio?: number;
}

/**
 * Оптимизирует изображение на основе переданных параметров
 */
export const optimizeImage = async (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'jpeg',
    aspectRatio,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      // Рассчитываем новые размеры
      let width = img.width;
      let height = img.height;
      
      // Если указано соотношение сторон, применяем его
      if (aspectRatio) {
        height = width / aspectRatio;
      }
      
      // Применяем максимальные размеры, сохраняя пропорции
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      // Создаем холст для рисования оптимизированного изображения
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Рисуем изображение на холсте
      ctx.drawImage(img, 0, 0, width, height);
      
      // Конвертируем в нужный формат
      let mimeType = 'image/jpeg';
      if (format === 'png') mimeType = 'image/png';
      if (format === 'webp') mimeType = 'image/webp';
      
      // Получаем данные изображения как Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          // Создаем новый файл с оптимизированными данными
          const optimizedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, `.${format}`),
            {
              type: mimeType,
              lastModified: Date.now(),
            }
          );
          
          resolve(optimizedFile);
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
};

/**
 * Создает превью изображения
 */
export const createImagePreview = async (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<string> => {
  const optimizedFile = await optimizeImage(file, options);
  return URL.createObjectURL(optimizedFile);
};

/**
 * Хук для работы с оптимизацией изображений
 */
const useImageOptimizer = () => {
  return {
    optimizeImage,
    createImagePreview,
  };
};

export default useImageOptimizer; 