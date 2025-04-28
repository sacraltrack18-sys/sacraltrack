/**
 * Утилита для работы с изображениями из Appwrite
 */

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
  
  // Предполагаем, что это ID файла в Appwrite Storage
  try {
    // Проверяем, является ли строка UUID (примерная проверка)
    const isValidFileId = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageUrl);
    
    if (isValidFileId) {
      const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_URL;
      const projectId = process.env.NEXT_PUBLIC_ENDPOINT;
      
      if (bucketId && endpoint && projectId) {
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
 * Проверяет, существует ли изображение по URL
 * @param url URL изображения для проверки
 * @returns Promise<boolean> - существует ли изображение
 */
export async function imageExists(url: string): Promise<boolean> {
  if (!url) return false;
  
  // Для локальных файлов всегда возвращаем true, так как проверить их существование на клиенте сложно
  if (url.startsWith('/')) return true;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image existence:', error);
    return false;
  }
} 