import { storage } from "@/libs/AppWriteClient";

// Кэш для оптимизации производительности
const urlCache = new Map<string, string>();

// Флаг для включения/отключения отладочных сообщений
const DEBUG_LOGGING = false;

// Cache expiration time in milliseconds (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// Cache structure with expiration
interface CacheEntry {
  url: string;
  timestamp: number;
}

// Cache with expiration
const optimizedUrlCache = new Map<string, CacheEntry>();

// Функция для логирования только при включенном режиме отладки
const debugLog = (message: string, data?: any) => {
  if (DEBUG_LOGGING) {
    if (data) {
      console.log(`[useCreateBucketUrl] ${message}`, data);
    } else {
      console.log(`[useCreateBucketUrl] ${message}`);
    }
  }
};

// Clean expired cache entries
const cleanCache = () => {
  const now = Date.now();
  optimizedUrlCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRATION) {
      optimizedUrlCache.delete(key);
    }
  });
};

// Schedule cache cleaning every hour
if (typeof window !== 'undefined') {
  setInterval(cleanCache, 60 * 60 * 1000);
}

// Экспортируем функцию для очистки кэша при смене пользователя
export const clearUrlCache = () => {
  debugLog('Clearing URL cache due to user change');
  urlCache.clear();
  optimizedUrlCache.clear();
};

// Стильные заглушки для разных типов контента
const stylishPlaceholders = {
  user: '/images/placeholders/music-user-placeholder-static.svg',
  track: '/images/placeholders/track-placeholder.svg',
  default: '/images/placeholders/music-user-placeholder-static.svg',
};

// Функция для получения соответствующего изображения-заглушки
const getPlaceholderImage = (type: string = 'default'): string => {
  const validType = Object.keys(stylishPlaceholders).includes(type) 
    ? type 
    : 'default';
  return stylishPlaceholders[validType as keyof typeof stylishPlaceholders];
};

// Pre-load critical placeholder images
if (typeof window !== 'undefined') {
  Object.values(stylishPlaceholders).forEach(placeholder => {
    const img = new Image();
    img.src = placeholder;
  });
}

// Helper to sanitize file IDs and prevent double slashes
const sanitizeFileId = (fileId: string): string | null => {
  if (!fileId || fileId === 'undefined' || fileId === 'null') {
    return null;
  }
  
  const trimmed = fileId.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) {
    return null;
  }
  
  return trimmed;
};

// Проверка переменных окружения теперь только во время выполнения
const checkEnvironmentVariables = () => {
  // Получаем значения переменных окружения на момент вызова функции
  const url = process.env.NEXT_PUBLIC_APPWRITE_URL;
  const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
  const endpoint = process.env.NEXT_PUBLIC_ENDPOINT;
  
  // Выводим отладочную информацию для понимания, какие переменные доступны
  debugLog('Environment check:', {
    url: url ? 'defined' : 'undefined',
    bucketId: bucketId ? 'defined' : 'undefined',
    endpoint: endpoint ? 'defined' : 'undefined'
  });
  
  return { url, bucketId, endpoint };
};

/**
 * Enhanced hook for creating optimized bucket URLs with caching
 */
const useCreateBucketUrl = (fileId: string, type: 'user' | 'track' | 'banner' = 'track') => {
    // Важная проверка на null, undefined или пустую строку
    if (!fileId || fileId === null || fileId === undefined || fileId.trim() === '') {
        debugLog('Empty fileId provided, returning placeholder');
        return getPlaceholderImage(type);
    }

    // If the fileId is already a full URL or a placeholder path, return it as is
    if (fileId.startsWith('http') || fileId.startsWith('/images/')) {
        // Дополнительно проверяем, есть ли параметр output=webp в URL
        if (fileId.startsWith('http') && !fileId.includes('output=')) {
            return `${fileId}${fileId.includes('?') ? '&' : '?'}output=webp`;
        }
        return fileId;
    }
    
    // Create a cache key that includes the type for better organization
    const cacheKey = `${type}:${fileId}`;
    
    // Check if we have a valid cached URL that hasn't expired
    if (optimizedUrlCache.has(cacheKey)) {
        const cachedEntry = optimizedUrlCache.get(cacheKey)!;
        if (Date.now() - cachedEntry.timestamp < CACHE_EXPIRATION) {
            debugLog('Returning cached URL for', cacheKey);
            return cachedEntry.url;
        } else {
            // Remove expired entry
            optimizedUrlCache.delete(cacheKey);
        }
    }

    // Generate the URL
    const { url, bucketId, endpoint } = checkEnvironmentVariables();
    
    if (!url || !bucketId || !endpoint) {
        debugLog('Missing environment variables, returning placeholder');
        return getPlaceholderImage(type);
    }
    
    try {
        // Проверка корректности fileId - не должен быть пустым
        const sanitizedFileId = sanitizeFileId(fileId);
        if (!sanitizedFileId) {
            debugLog('Invalid fileId after sanitization, returning placeholder');
            return getPlaceholderImage(type);
        }
        
        // Всегда добавляем output=webp для изображений для обеспечения правильного отображения
        const imageUrl = `${url}/storage/buckets/${bucketId}/files/${sanitizedFileId}/view?project=${endpoint}`;
        const finalUrl = `${imageUrl}&output=webp`;
        
        // Cache the URL with timestamp
        optimizedUrlCache.set(cacheKey, {
            url: finalUrl,
            timestamp: Date.now()
        });
        
        debugLog('Generated new URL for', { fileId: sanitizedFileId, cacheKey, finalUrl });
        return finalUrl;
    } catch (error) {
        debugLog('Error generating URL:', error);
        return getPlaceholderImage(type);
    }
}

export default useCreateBucketUrl;