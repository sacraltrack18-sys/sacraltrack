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

const createBucketUrl = (fileId: string, type: string = 'default'): string => {
  try {
    // Проверка входных параметров
    if (!fileId || fileId.trim() === '') {
      const placeholder = getPlaceholderImage(type);
      debugLog(`Empty fileId, using placeholder: ${placeholder}`);
      return placeholder;
    }

    // Если файл уже начинается с / или http, значит это локальный путь или внешний URL
    if (fileId.startsWith('/') || fileId.startsWith('http')) {
      return fileId;
    }

    // Проверяем, есть ли URL уже в кэше
    if (urlCache.has(fileId)) {
      return urlCache.get(fileId) as string;
    }

    // Получаем переменные окружения в рантайме
    const { url, bucketId, endpoint } = checkEnvironmentVariables();
    
    // Если какая-то из переменных отсутствует, используем заглушку
    if (!url || !bucketId || !endpoint) {
      console.error('[useCreateBucketUrl] Environment variables are missing. Check your .env file.');
      return getPlaceholderImage(type);
    }
    
    try {
      // Формируем URL напрямую
      const fileUrl = `${url}/storage/buckets/${bucketId}/files/${fileId}/view?project=${endpoint}`;
      debugLog(`Created URL for file ${fileId}`);
      
      // Кэшируем результат
      urlCache.set(fileId, fileUrl);
      return fileUrl;
    } catch (err) {
      console.error(`[useCreateBucketUrl] Error creating URL for file ${fileId}:`, err);
      return getPlaceholderImage(type);
    }
  } catch (error) {
    console.error(`[useCreateBucketUrl] Unexpected error:`, error);
    return getPlaceholderImage(type);
  }
};

export default createBucketUrl;