import { storage } from "@/libs/AppWriteClient";

// Кэш для оптимизации производительности
const urlCache = new Map<string, string>();

// Флаг для включения/отключения отладочных сообщений
const DEBUG_LOGGING = false;

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

// Экспортируем функцию для очистки кэша при смене пользователя
export const clearUrlCache = () => {
  debugLog('Clearing URL cache due to user change');
  urlCache.clear();
};

// Стильные заглушки для разных типов контента
const stylishPlaceholders = {
  user: '/images/placeholders/user-placeholder.svg',
  track: '/images/placeholders/track-placeholder.svg',
  default: '/images/placeholders/user-placeholder.svg',
};

// Функция для получения соответствующего изображения-заглушки
const getPlaceholderImage = (type: string = 'default'): string => {
  const validType = Object.keys(stylishPlaceholders).includes(type) 
    ? type 
    : 'default';
  return stylishPlaceholders[validType as keyof typeof stylishPlaceholders];
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

const useCreateBucketUrl = (fileId: string, type: 'user' | 'track' | 'banner' = 'track') => {
    if (!fileId) return '/images/placeholders/user-placeholder.svg';

    // If the fileId is already a full URL or a placeholder path, return it as is
    if (fileId.startsWith('http') || fileId.startsWith('/images/')) {
        return fileId;
    }

    // Construct the storage URL using the file ID
    return `${process.env.NEXT_PUBLIC_APPWRITE_URL}/storage/buckets/${process.env.NEXT_PUBLIC_BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_ENDPOINT}`;
}

export default useCreateBucketUrl;