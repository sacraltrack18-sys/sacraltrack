/**
 * Хук для оптимизации изображений на клиентской стороне
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  aspectRatio?: number;
  preserveOriginalSize?: boolean;
}

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  aspectRatio?: number;
  preserveOriginalSize?: boolean;
}

/**
 * Оптимизирует изображение на основе переданных параметров
 */
export const optimizeImage = async (
  file: File,
  options: ImageOptimizationOptions
): Promise<File> => {
  return new Promise((resolve, reject) => {
    console.log(`Starting image optimization for: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Could not get canvas context');
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        console.log(`Original image dimensions: ${img.width}x${img.height}`);
        
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        // Если указан preserveOriginalSize=true, сохраняем исходный размер
        if (options.preserveOriginalSize) {
          console.log('Preserving original image size and proportions');
        } else {
          // Обработка пропорций, если нужно
          if (options.aspectRatio) {
            const currentRatio = width / height;
            console.log(`Current aspect ratio: ${currentRatio}, Target: ${options.aspectRatio}`);
            
            if (currentRatio > options.aspectRatio) {
              width = height * options.aspectRatio;
            } else {
              height = width / options.aspectRatio;
            }
            console.log(`After aspect ratio adjustment: ${width}x${height}`);
          }

          // Ограничиваем размер только если не указано сохранение оригинала
          if (options.maxWidth && width > options.maxWidth) {
            const oldHeight = height;
            height = (options.maxWidth * height) / width;
            width = options.maxWidth;
            console.log(`Scaled down width from ${img.width} to ${width}, height from ${oldHeight} to ${height}`);
          }

          if (options.maxHeight && height > options.maxHeight) {
            const oldWidth = width;
            width = (options.maxHeight * width) / height;
            height = options.maxHeight;
            console.log(`Scaled down height from ${img.height} to ${height}, width from ${oldWidth} to ${width}`);
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        console.log(`Canvas dimensions set to: ${width}x${height}`);

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Determine appropriate format
        const format = options.format || 'webp';
        const mimeType = format === 'webp' ? 'image/webp' : 
                        format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = options.quality || 0.85;
        
        // Generate appropriate file extension
        const fileExt = format === 'webp' ? '.webp' : 
                        format === 'png' ? '.png' : '.jpg';
        
        // Generate unique filename with timestamp to avoid caching issues
        const timestamp = Date.now();
        const newFileName = file.name.replace(/\.[^/.]+$/, '') + '_' + timestamp + fileExt;
        
        console.log(`Optimizing image: ${file.name} to ${newFileName} (${mimeType}), dimensions: ${width}x${height}, quality: ${quality}`);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('Failed to create blob from canvas');
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create new file with optimized image
            const optimizedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now()
            });
            
            // Log successful optimization
            console.log(`Image optimized successfully: ${optimizedFile.name}, size: ${optimizedFile.size} bytes (${(optimizedFile.size / file.size * 100).toFixed(2)}% of original), type: ${optimizedFile.type}`);

            resolve(optimizedFile);
          },
          mimeType,
          quality
        );
      } catch (error) {
        console.error('Error optimizing image:', error);
        reject(error);
      }
    };

    img.onerror = (error) => {
      console.error('Failed to load image for optimization:', error);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
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