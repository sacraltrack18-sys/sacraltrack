/**
 * App Initialization Utility
 * 
 * This utility handles various initialization tasks for the application,
 * including disabling console logs.
 */

import disableConsoleLogs from './disableConsoleLog';
import { setupAuthCleanupTimer, checkAndClearAuthFlags, clearAuthCleanupTimer } from './authCleanup';
import { isIOS, optimizeStorageForIOS } from './deviceDetection';
import { setupMemoryManagement, stopMemoryManagement, cleanupLocalStorage } from './memoryManager';

/**
 * Initialize the application with various configurations
 */
export const initializeApp = () => {
  // Only run on the client-side
  if (typeof window !== 'undefined') {
    // Disable console logs
    disableConsoleLogs();
    
    // Setup auth cleanup mechanism to prevent "stuck" authentication states
    setupAuthCleanupTimer();
    
    // Immediately check for and clear any stale auth flags
    checkAndClearAuthFlags();
    
    // Apply optimizations for iOS devices
    if (isIOS()) {
      console.log('iOS device detected, applying special optimizations');
      optimizeStorageForIOS();
    }
    
    // Инициализируем систему управления памятью
    setupMemoryManagement();
    
    // Очищаем старые записи localStorage при запуске
    cleanupLocalStorage();
    
    // Add any other initialization logic here
    // For example:
    // - Setting up global error handlers
    // - Initializing analytics
    // - Loading preferences
    
    // Очищаем интервалы при выгрузке страницы для предотвращения утечек памяти
    window.addEventListener('beforeunload', () => {
      clearAuthCleanupTimer();
      stopMemoryManagement();
    });
  }
};

// Auto-initialize when imported
initializeApp();

export default initializeApp; 