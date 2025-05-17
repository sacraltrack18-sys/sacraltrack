/**
 * Утилита для работы с изображениями из Appwrite
 */

// Create a cache to store failed image URLs and their retry count
const failedImageCache: Map<string, number> = new Map();
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Формирует URL для изображения из Appwrite Storage или возвращает fallback, если это внешняя ссылка
 * @param imageUrl URL изображения или ID файла в Appwrite
 * @param fallbackUrl Запасное изображение, если основное недоступно
 * @returns Полный URL для изображения
 */
export function getAppwriteImageUrl(imageUrl: string, fallbackUrl: string = '/images/placeholders/news-placeholder.svg'): string {
  if (!imageUrl) return fallbackUrl;
  
  // Если это полный URL (начинается с http или https), возвращаем его как есть
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Если это относительный путь к локальному файлу в приложении
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Check if this image ID has already failed multiple times
  const fileId = imageUrl;
  if (failedImageCache.has(fileId)) {
    const retryCount = failedImageCache.get(fileId) || 0;
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.log(`Image ${fileId} has failed ${retryCount} times, using fallback image`);
      return fallbackUrl;
    }
  }
  
  // Предполагаем, что это ID файла в Appwrite Storage
  try {
    // Проверяем, является ли строка UUID (примерная проверка)
    const isValidFileId = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageUrl);
    
    if (isValidFileId) {
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_URL;
      const projectId = process.env.NEXT_PUBLIC_ENDPOINT;
      
      if (bucketId && endpoint && projectId) {
        // Properly format the Appwrite URL without the '/vi' suffix
        // This directly uses the 'view' endpoint without any modifiers
        return `${endpoint}/storage/buckets/${bucketId}/files/${imageUrl}/view?project=${projectId}`;
      }
    }
  } catch (error) {
    console.error('Error generating Appwrite image URL:', error);
  }
  
  // Если не удалось сформировать URL, возвращаем запасное изображение
  return fallbackUrl;
}

/**
 * Fixes an Appwrite image URL that might have additional parameters causing 404s
 * @param url The Appwrite image URL to fix
 * @returns The corrected URL or fallback if it's not an Appwrite URL
 */
export function fixAppwriteImageUrl(url: string, fallbackUrl: string = '/images/placeholders/news-placeholder.svg'): string {
  if (!url) return fallbackUrl;
  
  // If it's not an Appwrite URL, return it as is
  if (!url.includes('/storage/buckets/')) return url;
  
  try {
    // Check if the URL has the problematic '/vi' suffix
    if (url.includes('/files/') && url.match(/\/files\/[^\/]+\/vi/)) {
      // Extract the important parts
      const fileIdMatch = url.match(/\/files\/([^\/]+)\/vi/);
      
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        
        // Extract bucket ID from the URL
        const bucketIdMatch = url.match(/\/buckets\/([^\/]+)\//);
        const bucketId = bucketIdMatch && bucketIdMatch[1] ? bucketIdMatch[1] : process.env.NEXT_PUBLIC_BUCKET_ID;
        
        // Extract project ID from the URL or query parameters
        let projectId = process.env.NEXT_PUBLIC_ENDPOINT;
        const projectMatch = url.match(/[?&]project=([^&]+)/);
        if (projectMatch && projectMatch[1]) {
          projectId = projectMatch[1];
        }
        
        // Extract the base endpoint
        const endpointMatch = url.match(/(https?:\/\/[^\/]+)/);
        const endpoint = endpointMatch && endpointMatch[1] 
          ? endpointMatch[1] 
          : process.env.NEXT_PUBLIC_APPWRITE_URL;
        
        if (bucketId && endpoint && projectId) {
          // Rebuild the URL correctly
          return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
        }
      }
    }
    
    return url;
  } catch (error) {
    console.error('Error fixing Appwrite image URL:', error);
    return url;
  }
}

/**
 * Проверяет, существует ли изображение по URL
 * @param url URL изображения для проверки
 * @returns Promise<boolean> - существует ли изображение
 */
export async function imageExists(url: string): Promise<boolean> {
  if (!url) return false;
  
  // Для локальных файлов всегда возвращаем true, так как проверить их существование на клиенте сложно
  if (url.startsWith('/')) return true;
  
  // Fix the URL if it's an Appwrite URL with issues
  const fixedUrl = fixAppwriteImageUrl(url);
  
  try {
    const response = await fetch(fixedUrl, { method: 'HEAD' });
    
    // If the image doesn't exist (404), record this failed attempt
    if (!response.ok && fixedUrl.includes('/files/')) {
      const fileIdMatch = fixedUrl.match(/\/files\/([^\/]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        const currentCount = failedImageCache.get(fileId) || 0;
        failedImageCache.set(fileId, currentCount + 1);
        console.log(`Image ${fileId} failed to load (attempt ${currentCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      }
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error checking image existence:', error);
    return false;
  }
}

/**
 * Records a failed image request to limit retry attempts
 * @param imageUrl The URL or ID of the image that failed to load
 * @returns boolean Whether max retry attempts has been reached
 */
export function recordFailedImageRequest(imageUrl: string): boolean {
  if (!imageUrl) return true;
  
  // First fix the URL if it's an Appwrite URL with issues
  const fixedUrl = fixAppwriteImageUrl(imageUrl);
  
  // Extract the file ID from the URL if it's an Appwrite URL
  let fileId = fixedUrl;
  if (fixedUrl.includes('/files/')) {
    const fileIdMatch = fixedUrl.match(/\/files\/([^\/]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      fileId = fileIdMatch[1];
    }
  }
  
  const currentCount = failedImageCache.get(fileId) || 0;
  const newCount = currentCount + 1;
  failedImageCache.set(fileId, newCount);
  
  console.log(`Image ${fileId} failed to load (attempt ${newCount}/${MAX_RETRY_ATTEMPTS})`);
  
  return newCount >= MAX_RETRY_ATTEMPTS;
} 