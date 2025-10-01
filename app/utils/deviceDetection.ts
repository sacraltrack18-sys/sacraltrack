/**
 * Утилиты для обнаружения типа устройства и настройки оптимальных параметров
 * в зависимости от платформы
 */

/**
 * Проверяет, является ли устройство iOS (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Проверяет, является ли устройство мобильным
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined' || !window.navigator) return false;
  
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
  return mobileRegex.test(navigator.userAgent) || window.innerWidth < 768;
};

/**
 * Настраивает параметры localStorage и sessionStorage для оптимальной работы на iOS
 * Решает проблемы с потерей состояния при переключении между приложениями
 */
export const optimizeStorageForIOS = (): void => {
  if (!isIOS() || typeof window === 'undefined') return;
  
  try {
    // Создаем событие для обнаружения выхода из приложения
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Запоминаем время, когда приложение ушло в фон
        localStorage.setItem('app_background_time', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // Проверяем, был ли перерыв в использовании
        const backgroundTime = localStorage.getItem('app_background_time');
        if (backgroundTime) {
          const timeAway = Date.now() - parseInt(backgroundTime, 10);
          // Если прошло больше 5 минут, проверяем аутентификацию
          if (timeAway > 5 * 60 * 1000) {
            // Очищаем устаревшие флаги аутентификации
            try {
              if (sessionStorage.getItem('googleAuthInProgress')) {
                console.log('Clearing stale auth flag after app return');
                sessionStorage.removeItem('googleAuthInProgress');
                sessionStorage.removeItem('googleAuthExpiryTime');
              }
            } catch (e) {
              console.error('Error clearing auth flags:', e);
            }
            
            // Генерируем событие для проверки аутентификации
            window.dispatchEvent(new CustomEvent('check_auth_state'));
          }
        }
      }
    });
    
    // Устанавливаем особые параметры для iOS Safari
    if (/Safari/.test(navigator.userAgent) && !/(Chrome|Android|EdgiOS|FxiOS)/.test(navigator.userAgent)) {
      // Метаданные для предотвращения масштабирования при фокусе на полях ввода
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }
      
      // Safari на iOS имеет проблемы с sessionStorage при перезагрузке страницы
      // Дублируем важные данные в localStorage
      window.addEventListener('beforeunload', () => {
        try {
          const authInProgress = sessionStorage.getItem('googleAuthInProgress');
          if (authInProgress) {
            localStorage.setItem('googleAuthInProgress_backup', authInProgress);
            const expiryTime = sessionStorage.getItem('googleAuthExpiryTime');
            if (expiryTime) {
              localStorage.setItem('googleAuthExpiryTime_backup', expiryTime);
            }
          }
        } catch (e) {
          console.error('Error backing up auth state:', e);
        }
      });
      
      // Восстанавливаем данные из localStorage при загрузке
      window.addEventListener('load', () => {
        try {
          const authInProgressBackup = localStorage.getItem('googleAuthInProgress_backup');
          if (authInProgressBackup) {
            sessionStorage.setItem('googleAuthInProgress', authInProgressBackup);
            localStorage.removeItem('googleAuthInProgress_backup');
            
            const expiryTimeBackup = localStorage.getItem('googleAuthExpiryTime_backup');
            if (expiryTimeBackup) {
              sessionStorage.setItem('googleAuthExpiryTime', expiryTimeBackup);
              localStorage.removeItem('googleAuthExpiryTime_backup');
            }
          }
        } catch (e) {
          console.error('Error restoring auth state:', e);
        }
      });
    }
    
    console.log('iOS optimizations applied');
  } catch (error) {
    console.error('Error setting up iOS optimizations:', error);
  }
}; 