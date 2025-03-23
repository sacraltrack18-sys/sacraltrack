/**
 * Утилиты для работы с кэшем в приложении
 */

import { clearUrlCache } from '@/app/hooks/useCreateBucketUrl';

/**
 * Очищает весь кэш, связанный с пользователем
 * Вызывается при выходе/входе пользователя для обеспечения
 * корректной загрузки медиа файлов разных пользователей
 */
export const clearUserCache = () => {
  console.log('[cacheUtils] Clearing all user-related caches');
  
  // Очистка кэша URL изображений и медиа
  clearUrlCache();
  
  // Генерируем новую метку времени для инвалидации кэшей
  const timestamp = Date.now();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cache_timestamp', timestamp.toString());
  }
  
  // Здесь можно добавить очистку других кэшей
}; 