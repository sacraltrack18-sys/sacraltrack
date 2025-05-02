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

/**
 * Очищает все состояния, связанные с аутентификацией
 * Вызывается при регистрации, входе или выходе пользователя
 * для обеспечения чистого состояния аутентификации
 */
export const clearAllAuthState = () => {
  console.log('[cacheUtils] Clearing all authentication related state');
  
  // Очистить кэш пользователя
  clearUserCache();
  
  // Очищаем сессионное хранилище
  if (typeof window !== 'undefined') {
    // Очищаем состояние OAuth процесса
    sessionStorage.removeItem('googleAuthInProgress');
    
    // Очищаем временные данные аутентификации
    sessionStorage.removeItem('tempAuthData');
    sessionStorage.removeItem('authRedirect');
    
    // Инвалидируем все связанные с аутентификацией кэши
    localStorage.setItem('auth_cache_timestamp', Date.now().toString());
  }
}; 