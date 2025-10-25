/**
 * Система управления памятью для предотвращения утечек и контроля потребления ресурсов
 */

import { usePostStore } from '../stores/post';

// Глобальная переменная для интервала очистки памяти
let memoryCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Мониторинг использования памяти браузером
 */
export const getMemoryUsage = (): { used: number; total: number; percentage: number } | null => {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
    const totalMB = Math.round(memory.jsHeapSizeLimit / 1048576);
    const percentage = Math.round((usedMB / totalMB) * 100);
    
    return {
      used: usedMB,
      total: totalMB,
      percentage
    };
  }
  return null;
};

/**
 * Принудительная очистка кешей и данных из всех stores
 */
export const clearAllStoresCache = () => {
  try {
    // Очищаем кеш постов
    const postStore = usePostStore.getState();
    if (postStore.clearMemoryCache) {
      postStore.clearMemoryCache();
    }

    // Очищаем localStorage если он слишком большой
    const storageSize = new Blob(Object.values(localStorage)).size;
    const storageSizeMB = storageSize / 1048576;
    
    if (storageSizeMB > 10) { // Если localStorage больше 10MB
      console.log(`[MemoryManager] LocalStorage size: ${storageSizeMB.toFixed(2)}MB - cleaning up`);
      
      // Очищаем старые записи кешей
      for (const key in localStorage) {
        if (key.includes('cache') || key.includes('temp')) {
          localStorage.removeItem(key);
        }
      }
    }

    console.log('[MemoryManager] All stores cache cleared');
  } catch (error) {
    console.error('[MemoryManager] Error clearing stores cache:', error);
  }
};

/**
 * Принудительная сборка мусора (если доступна)
 */
export const triggerGarbageCollection = () => {
  if (typeof window !== 'undefined' && (window as any).gc) {
    try {
      (window as any).gc();
      console.log('[MemoryManager] Garbage collection triggered');
    } catch (error) {
      console.warn('[MemoryManager] Could not trigger garbage collection:', error);
    }
  }
};

/**
 * Автоматическое управление памятью
 */
export const setupMemoryManagement = () => {
  if (typeof window === 'undefined') return;

  // Очищаем предыдущий интервал если есть
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
  }

  // Проверяем память каждые 2 минуты
  memoryCleanupInterval = setInterval(() => {
    const memoryUsage = getMemoryUsage();
    
    if (memoryUsage) {
      console.log(`[MemoryManager] Memory usage: ${memoryUsage.used}MB / ${memoryUsage.total}MB (${memoryUsage.percentage}%)`);
      
      // Если использование памяти больше 70%, начинаем очистку
      if (memoryUsage.percentage > 70) {
        console.warn('[MemoryManager] High memory usage detected, starting cleanup...');
        clearAllStoresCache();
        
        // Если критически высокое использование (>85%), принудительно вызываем GC
        if (memoryUsage.percentage > 85) {
          triggerGarbageCollection();
        }
      }
    }
  }, 120000); // Каждые 2 минуты

  console.log('[MemoryManager] Memory management system initialized');
  return memoryCleanupInterval;
};

/**
 * Остановка системы управления памятью
 */
export const stopMemoryManagement = () => {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
    memoryCleanupInterval = null;
    console.log('[MemoryManager] Memory management system stopped');
  }
};

/**
 * Получение информации о размере localStorage
 */
export const getLocalStorageSize = (): number => {
  if (typeof window === 'undefined') return 0;
  
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  
  return total / 1024; // Возвращаем в KB
};

/**
 * Очистка старых записей localStorage
 */
export const cleanupLocalStorage = () => {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
  const now = Date.now();

  for (const key in localStorage) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.timestamp && (now - parsed.timestamp) > maxAge) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {
      // Если не можем парсить, оставляем как есть
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[MemoryManager] Removed expired localStorage item: ${key}`);
  });

  if (keysToRemove.length > 0) {
    console.log(`[MemoryManager] Cleaned up ${keysToRemove.length} expired localStorage items`);
  }
};
