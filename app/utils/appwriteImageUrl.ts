/**
 * Утилита для работы с изображениями из Appwrite
 */

// Create a cache to store failed image URLs and their retry count
const failedImageCache: Map<string, number> = new Map();
// Create a cache for successful image URLs to avoid repeated requests
const successfulImageCache: Set<string> = new Set();
// Cache to map original URLs to their fixed versions
const urlFixCache: Map<string, string> = new Map();
const MAX_RETRY_ATTEMPTS = 3;

// Строгий блэклист для файлов, которые точно не существуют
const BLACKLISTED_FILES = new Set([
  '6828535c00307e6dd701', // Файл из ошибок
]);

// Track file ids that have already been replaced with fallbacks
const replacedWithFallback: Set<string> = new Set();

/**
 * Формирует URL для изображения из Appwrite Storage или возвращает fallback, если это внешняя ссылка
 * @param imageUrl URL изображения или ID файла в Appwrite
 * @param fallbackUrl Запасное изображение, если основное недоступно
 * @returns Полный URL для изображения
 */
export function getAppwriteImageUrl(imageUrl: string, fallbackUrl: string = '/images/placeholders/news-placeholder.svg'): string {
  if (!imageUrl) return fallbackUrl;
  
  // Если это полный URL (начинается с http или https)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Проверяем, не содержит ли URL ID файла из блэклиста
    if (imageUrl.includes('6828535c00307e6dd701')) {
      return fallbackUrl;
    }
    
    return fixAppwriteImageUrl(imageUrl, fallbackUrl);
  }
  
  // Если это относительный путь к локальному файлу в приложении
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Проверяем, не находится ли ID в блэклисте
  if (BLACKLISTED_FILES.has(imageUrl)) {
    return fallbackUrl;
  }
  
  // Check if this image ID has already failed multiple times
  const fileId = imageUrl;
  if (failedImageCache.has(fileId)) {
    const retryCount = failedImageCache.get(fileId) || 0;
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      if (!replacedWithFallback.has(fileId)) {
        console.log(`Image ${fileId} has failed ${retryCount} times, using fallback image`);
        replacedWithFallback.add(fileId);
      }
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
        // Use v1 API path format for Appwrite
        let formattedEndpoint = endpoint;
        if (!formattedEndpoint.includes('/v1')) {
          // Make sure to properly add /v1 after the domain but before the rest of the path
          formattedEndpoint = formattedEndpoint.replace(/\/+$/, '');
          if (formattedEndpoint.includes('/storage')) {
            formattedEndpoint = formattedEndpoint.replace('/storage', '/v1/storage');
          } else {
            formattedEndpoint += '/v1';
          }
        }
        
        // Ensure the endpoint starts with https:// or http://
        if (!formattedEndpoint.startsWith('http')) {
          formattedEndpoint = 'https://' + formattedEndpoint;
        }
        
        const url = `${formattedEndpoint}/storage/buckets/${bucketId}/files/${imageUrl}/view?project=${projectId}`;
        return url;
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
  
  // Проверяем, не содержит ли URL ID файла из блэклиста
  if (url.includes('6828535c00307e6dd701')) {
    return fallbackUrl;
  }
  
  // If it's not an Appwrite URL, return it as is
  if (!url.includes('/storage/buckets/') && !url.includes('/buckets/')) return url;
  
  // Check cache first to avoid duplicate processing
  if (urlFixCache.has(url)) {
    return urlFixCache.get(url)!;
  }
  
  // If we've seen this URL and it was successful, return it directly
  if (successfulImageCache.has(url)) {
    return url;
  }
  
  try {
    // Extract important components from the URL
    let fixedUrl = url;
    
    // Extract file ID for checking against failure cache
    const fileIdMatch = url.match(/\/files\/([^\/]+)/);
    let fileId = '';
    if (fileIdMatch && fileIdMatch[1]) {
      fileId = fileIdMatch[1];
      
      // If this file is in blacklist, return fallback immediately
      if (BLACKLISTED_FILES.has(fileId)) {
        urlFixCache.set(url, fallbackUrl);
        return fallbackUrl;
      }
      
      // Check if this file ID has already failed too many times
      if (failedImageCache.has(fileId)) {
        const retryCount = failedImageCache.get(fileId) || 0;
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          if (!replacedWithFallback.has(fileId)) {
            console.log(`File ID ${fileId} has failed ${retryCount} times, using fallback image`);
            replacedWithFallback.add(fileId);
          }
          urlFixCache.set(url, fallbackUrl);
          return fallbackUrl;
        }
      }
    }
    
    // Force fix for specific problematic case first
    if (url.includes('fra.cloud.appwrite.io/storage/buckets/') && !url.includes('/v1/')) {
      fixedUrl = url.replace(
        /(https?:\/\/fra\.cloud\.appwrite\.io)\/(storage\/buckets\/.+)/,
        '$1/v1/$2'
      );
      urlFixCache.set(url, fixedUrl);
      return fixedUrl;
    }
    
    // 1. Make sure the domain is correct and has /v1
    // This fixes URLs that have fra.cloud.appwrite.io/storage/... format
    if (fixedUrl.includes('appwrite.io/') && !fixedUrl.includes('/v1/')) {
      const domainMatch = fixedUrl.match(/(https?:\/\/[^\/]+)\/(.+)/);
      if (domainMatch) {
        const [_, domain, path] = domainMatch;
        
        // Make sure the path starts with v1/
        if (path.startsWith('storage/')) {
          fixedUrl = `${domain}/v1/${path}`;
        } else if (!path.startsWith('v1/')) {
          fixedUrl = `${domain}/v1/${path}`;
        }
      }
    }
    
    // 2. Specific fix for the pattern in the example URL
    // Handle the specific URL format in the question
    if (fixedUrl.includes('fra.cloud.appwrite.io') && fixedUrl.includes('/view?project=')) {
      if (!fixedUrl.includes('/v1/')) {
        fixedUrl = fixedUrl.replace(
          /(https?:\/\/fra\.cloud\.appwrite\.io)\/(storage\/buckets\/[^\/]+\/files\/[^\/]+\/view)/,
          '$1/v1/$2'
        );
      }
    }
    
    // 3. Check if the URL has the problematic '/vi' suffix and fix it
    if (fixedUrl.includes('/files/') && fixedUrl.match(/\/files\/[^\/]+\/vi/)) {
      fixedUrl = fixedUrl.replace(/\/files\/([^\/]+)\/vi/, '/files/$1/view');
    } 
    
    // 4. If URL has no path suffix after the file ID, ensure it has /view
    if (fixedUrl.includes('/files/') && !fixedUrl.match(/\/files\/[^\/]+\/[a-z]+/)) {
      fixedUrl = fixedUrl.replace(/\/files\/([^\/]+)([\/\?]|$)/, '/files/$1/view$2');
    }
    
    // 5. Replace non-v1 URL if it's still missing after our fixes
    if (fixedUrl.includes('appwrite.io/storage/') && !fixedUrl.includes('/v1/')) {
      fixedUrl = fixedUrl.replace(
        /(https?:\/\/[^\/]+)\/storage\//,
        '$1/v1/storage/'
      );
    }
    
    // Double check the final URL
    if (fixedUrl.includes('appwrite.io') && !fixedUrl.includes('/v1/')) {
      console.log('Warning: URL still doesn\'t have /v1/ path after all fixes:', fixedUrl);
      // Last resort fix
      fixedUrl = fixedUrl.replace(
        /(https?:\/\/[^\/]+)\/(?!v1)(.*)/,
        '$1/v1/$2'
      );
    }
    
    // Store the fixed URL in cache for future reference
    urlFixCache.set(url, fixedUrl);
    return fixedUrl;
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
  
  // Проверяем, не содержит ли URL ID файла из блэклиста
  if (url.includes('6828535c00307e6dd701')) {
    return false;
  }
  
  // Для локальных файлов всегда возвращаем true, так как проверить их существование на клиенте сложно
  if (url.startsWith('/')) return true;
  
  // If we've already successfully loaded this image before, return true without checking
  if (successfulImageCache.has(url)) {
    return true;
  }
  
  // Check if the URL is associated with a file ID that has already failed too many times
  const fileIdMatch = url.match(/\/files\/([^\/]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    
    // Check blacklist first
    if (BLACKLISTED_FILES.has(fileId)) {
      return false;
    }
    
    if (failedImageCache.has(fileId)) {
      const retryCount = failedImageCache.get(fileId) || 0;
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        return false;
      }
    }
  }
  
  // Fix the URL if it's an Appwrite URL with issues
  const fixedUrl = fixAppwriteImageUrl(url);
  
  try {
    const response = await fetch(fixedUrl, { method: 'HEAD' });
    
    // If the image exists, add it to our success cache
    if (response.ok) {
      successfulImageCache.add(url);
      successfulImageCache.add(fixedUrl);
      return true;
    }
    
    // If the image doesn't exist (404), record this failed attempt
    if (!response.ok && fixedUrl.includes('/files/')) {
      const innerFileIdMatch = fixedUrl.match(/\/files\/([^\/]+)/);
      if (innerFileIdMatch && innerFileIdMatch[1]) {
        const fileId = innerFileIdMatch[1];
        
        // Check if this is a known bad file
        if (BLACKLISTED_FILES.has(fileId)) {
          return false;
        }
        
        const currentCount = failedImageCache.get(fileId) || 0;
        const newCount = currentCount + 1;
        failedImageCache.set(fileId, newCount);
        
        // Only log the first few failures to avoid console spam
        if (newCount <= 3) {
          console.log(`Image ${fileId} failed to load (attempt ${newCount}/${MAX_RETRY_ATTEMPTS})`);
        }
        
        // If we've reached max retries, mark it for replacement
        if (newCount >= MAX_RETRY_ATTEMPTS && !replacedWithFallback.has(fileId)) {
          console.log(`Image ${fileId} reached max retry attempts, will use fallback from now on`);
          replacedWithFallback.add(fileId);
        }
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
  
  // Проверяем, не содержит ли URL ID файла из блэклиста
  if (imageUrl.includes('6828535c00307e6dd701')) {
    return true; // Immediately return true to prevent further requests
  }
  
  // First fix the URL if it's an Appwrite URL with issues
  const fixedUrl = fixAppwriteImageUrl(imageUrl);
  
  // Extract the file ID from the URL if it's an Appwrite URL
  let fileId = fixedUrl;
  if (fixedUrl.includes('/files/')) {
    const fileIdMatch = fixedUrl.match(/\/files\/([^\/]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      fileId = fileIdMatch[1];
      
      // Check blacklist first
      if (BLACKLISTED_FILES.has(fileId)) {
        return true; // Immediately return true for blacklisted files
      }
    }
  } else {
    // Use the whole URL as the key for non-Appwrite URLs
    fileId = fixedUrl;
  }
  
  // Check if we've already reached max retries for this file
  if (replacedWithFallback.has(fileId)) {
    return true;
  }
  
  const currentCount = failedImageCache.get(fileId) || 0;
  const newCount = currentCount + 1;
  failedImageCache.set(fileId, newCount);
  
  // Only log the first few failures to avoid console spam
  if (newCount <= 3) {
    console.log(`Image ${fileId} failed to load (attempt ${newCount}/${MAX_RETRY_ATTEMPTS})`);
  }
  
  // If we've reached max retries, mark this file ID as needing replacement
  if (newCount >= MAX_RETRY_ATTEMPTS) {
    replacedWithFallback.add(fileId);
  }
  
  return newCount >= MAX_RETRY_ATTEMPTS;
} 