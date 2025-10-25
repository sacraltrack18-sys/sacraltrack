/**
 * Утилита для управления флагами аутентификации и их автоматической очистки
 * Решает проблемы с "зависшими" состояниями аутентификации,
 * особенно на iOS устройствах
 */

/**
 * Проверяет и очищает устаревшие флаги аутентификации
 */
export const checkAndClearAuthFlags = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Проверяем, есть ли флаг аутентификации
    const authInProgress = sessionStorage.getItem('googleAuthInProgress');
    if (!authInProgress) return;
    
    // Проверяем, не истек ли срок действия флага
    const expiryTimeStr = sessionStorage.getItem('googleAuthExpiryTime');
    if (expiryTimeStr) {
      const expiryTime = parseInt(expiryTimeStr, 10);
      const now = Date.now();
      
      // Если срок истек, очищаем флаги
      if (now > expiryTime) {
        console.log('Clearing expired auth flags');
        sessionStorage.removeItem('googleAuthInProgress');
        sessionStorage.removeItem('googleAuthExpiryTime');
      }
    } else {
      // Если нет времени истечения, но есть флаг, также очищаем
      // (старый формат без времени истечения)
      sessionStorage.removeItem('googleAuthInProgress');
    }
  } catch (error) {
    console.error('Error checking auth flags:', error);
    // В случае ошибки также очищаем флаги
    try {
      sessionStorage.removeItem('googleAuthInProgress');
      sessionStorage.removeItem('googleAuthExpiryTime');
    } catch (e) {
      // Игнорируем ошибки при очистке
    }
  }
};

/**
 * Очищает все флаги аутентификации, независимо от их состояния
 */
export const clearAllAuthFlags = () => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem('googleAuthInProgress');
    sessionStorage.removeItem('googleAuthExpiryTime');
    console.log('All auth flags cleared');
  } catch (error) {
    console.error('Error clearing auth flags:', error);
  }
};

// Глобальная переменная для хранения интервала
let authCleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Устанавливает таймер для автоматической проверки и очистки флагов аутентификации
 */
export const setupAuthCleanupTimer = () => {
  if (typeof window === 'undefined') return;
  
  // Очищаем предыдущий интервал если существует
  if (authCleanupInterval) {
    clearInterval(authCleanupInterval);
  }
  
  // Сначала проверяем флаги при инициализации
  checkAndClearAuthFlags();
  
  // Настраиваем интервал для периодической проверки
  authCleanupInterval = setInterval(checkAndClearAuthFlags, 60000); // каждую минуту
  
  return authCleanupInterval;
};

/**
 * Очищает таймер аутентификации
 */
export const clearAuthCleanupTimer = () => {
  if (authCleanupInterval) {
    clearInterval(authCleanupInterval);
    authCleanupInterval = null;
  }
}; 