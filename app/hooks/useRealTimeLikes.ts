import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/app/context/user';
import toast from 'react-hot-toast';

interface LikeState {
  isLiked: boolean;
  likesCount: number;
  isUpdating: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UseRealTimeLikesOptions {
  vibeId: string;
  initialLikeCount?: number;
  initialLikeState?: boolean;
  onLikeUpdated?: (count: number, isLiked: boolean) => void;
  refreshInterval?: number; // Интервал обновления в миллисекундах
  debounceMs?: number;
}

// Кэш для предотвращения дублирования запросов
const requestCache = new Map<string, Promise<any>>();
const stateCache = new Map<string, LikeState>();

// Утилиты для localStorage с fallback
const STORAGE_KEYS = {
  LIKE_STATE: (vibeId: string, userId: string) => `vibe_like_${vibeId}_${userId}`,
  LIKE_COUNT: (vibeId: string) => `vibe_count_${vibeId}`,
  LAST_SYNC: (vibeId: string) => `vibe_sync_${vibeId}`,
} as const;

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('[useRealTimeLikes] localStorage error:', error);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('[useRealTimeLikes] localStorage error:', error);
    }
  }
};

// Дебаунс функция
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useRealTimeLikes = ({
  vibeId,
  initialLikeCount = 0,
  initialLikeState = false,
  onLikeUpdated,
  refreshInterval = 30000, // 30 секунд по умолчанию
  debounceMs = 300,
}: UseRealTimeLikesOptions) => {
  const { user } = useUser() || { user: null };
  const userId = user?.id;
  
  // Инициализация состояния
  const [state, setState] = useState<LikeState>(() => {
    const cacheKey = `${vibeId}_${userId}`;
    
    // Проверяем кэш в памяти
    if (stateCache.has(cacheKey)) {
      return stateCache.get(cacheKey)!;
    }
    
    // Пытаемся восстановить из localStorage как fallback
    let cachedLikeState = initialLikeState;
    let cachedLikeCount = initialLikeCount;
    
    if (userId) {
      const storedLikeState = safeLocalStorage.getItem(STORAGE_KEYS.LIKE_STATE(vibeId, userId));
      const storedLikeCount = safeLocalStorage.getItem(STORAGE_KEYS.LIKE_COUNT(vibeId));
      
      if (storedLikeState !== null) {
        cachedLikeState = storedLikeState === 'true';
      }
      if (storedLikeCount !== null) {
        const parsed = parseInt(storedLikeCount, 10);
        if (!isNaN(parsed)) {
          cachedLikeCount = parsed;
        }
      }
    }
    
    const initialState: LikeState = {
      isLiked: cachedLikeState,
      likesCount: cachedLikeCount,
      isUpdating: false,
      error: null,
      lastUpdated: 0,
    };
    
    if (userId) {
      stateCache.set(cacheKey, initialState);
    }
    
    return initialState;
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationRef = useRef<'like' | 'unlike' | null>(null);

  // Функция для получения актуальных данных из базы
  const fetchRealTimeData = useCallback(async (force = false): Promise<{ count: number; hasLiked: boolean } | null> => {
    if (!vibeId || (!force && pendingOperationRef.current)) return null;

    const cacheKey = `fetch_${vibeId}_${userId}`;

    // Проверяем, есть ли уже запрос в процессе
    if (!force && requestCache.has(cacheKey)) {
      try {
        return await requestCache.get(cacheKey);
      } catch {
        requestCache.delete(cacheKey);
      }
    }

    const fetchPromise = (async (): Promise<{ count: number; hasLiked: boolean }> => {
      const maxRetries = 2;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          const params = new URLSearchParams({ vibe_id: vibeId });
          if (userId) {
            params.append('user_id', userId);
          }
          params.append('_t', Date.now().toString()); // Предотвращаем кэширование

          // Создаем контроллер для таймаута
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

          const response = await fetch(`/api/vibes/like?${params}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
            cache: 'no-store',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          return {
            count: data.count || 0,
            hasLiked: data.hasLiked || false,
          };
        } catch (error: any) {
          retryCount++;
          console.error(`[useRealTimeLikes] Fetch error (attempt ${retryCount}/${maxRetries}):`, error);

          // Проверяем, стоит ли повторять запрос
          const isRetryableError = error.name === 'AbortError' ||
                                  error.message?.includes('timeout') ||
                                  error.message?.includes('network') ||
                                  error.message?.includes('ETIMEDOUT');

          if (retryCount >= maxRetries || !isRetryableError) {
            throw error;
          }

          // Небольшая задержка перед повтором
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Если дошли сюда, значит все попытки исчерпаны
      throw new Error('All retry attempts failed');
    })();

    fetchPromise.finally(() => {
      requestCache.delete(cacheKey);
    });

    requestCache.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } catch (error) {
      console.error('[useRealTimeLikes] Final fetch error:', error);
      return null;
    }
  }, [vibeId, userId]);

  // Функция для обновления состояния
  const updateState = useCallback((newState: Partial<LikeState>) => {
    setState(prevState => {
      const updatedState = { ...prevState, ...newState, lastUpdated: Date.now() };
      
      // Обновляем кэш
      const cacheKey = `${vibeId}_${userId}`;
      if (userId) {
        stateCache.set(cacheKey, updatedState);
        
        // Сохраняем в localStorage как fallback
        if (newState.isLiked !== undefined) {
          safeLocalStorage.setItem(STORAGE_KEYS.LIKE_STATE(vibeId, userId), newState.isLiked.toString());
        }
        if (newState.likesCount !== undefined) {
          safeLocalStorage.setItem(STORAGE_KEYS.LIKE_COUNT(vibeId), newState.likesCount.toString());
        }
        safeLocalStorage.setItem(STORAGE_KEYS.LAST_SYNC(vibeId), Date.now().toString());
      }
      
      // Уведомляем родительский компонент
      if (onLikeUpdated && (newState.isLiked !== undefined || newState.likesCount !== undefined)) {
        onLikeUpdated(
          newState.likesCount ?? updatedState.likesCount,
          newState.isLiked ?? updatedState.isLiked
        );
      }
      
      return updatedState;
    });
  }, [vibeId, userId, onLikeUpdated]);

  // Функция для синхронизации с сервером
  const syncWithServer = useCallback(async () => {
    try {
      const data = await fetchRealTimeData(true);
      if (data) {
        updateState({
          likesCount: data.count,
          isLiked: data.hasLiked,
          error: null,
        });
      }
    } catch (error) {
      console.error('[useRealTimeLikes] Sync error:', error);
      updateState({ error: 'Failed to sync with server' });
    }
  }, [fetchRealTimeData, updateState]);

  // Дебаунсированная синхронизация
  const debouncedSync = useCallback(
    debounce(() => {
      syncWithServer();
    }, debounceMs),
    [syncWithServer, debounceMs]
  );

  // Функция для переключения лайка с оптимистичным обновлением
  const toggleLike = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to like vibes");
      return false;
    }

    if (state.isUpdating) {
      return false; // Предотвращаем множественные клики
    }

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const wasLiked = state.isLiked;
    const newLikedState = !wasLiked;
    const newCount = wasLiked ? Math.max(0, state.likesCount - 1) : state.likesCount + 1;

    // Оптимистичное обновление UI
    updateState({
      isLiked: newLikedState,
      likesCount: newCount,
      isUpdating: true,
      error: null,
    });

    pendingOperationRef.current = newLikedState ? 'like' : 'unlike';

    try {
      // Создаем таймаут для запроса
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 15000); // 15 секунд таймаут

      const response = await fetch('/api/vibes/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({
          user_id: user.id,
          vibe_id: vibeId,
          _timestamp: Date.now(),
        }),
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Обновляем состояние на основе ответа сервера
      updateState({
        isLiked: data.hasLiked,
        likesCount: data.count,
        isUpdating: false,
        error: null,
      });

      // Показываем уведомление только при успехе
      // if (data.hasLiked) {
      //   toast.success("Liked!", { duration: 1000 });
      // } else {
      //   toast.success("Unliked!", { duration: 1000 });
      // }

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Не показываем ошибку для отмененных запросов
        updateState({
          isUpdating: false,
          error: null,
        });
        return false;
      }

      console.error('[useRealTimeLikes] Toggle like error:', error);

      // Откатываем оптимистичное обновление только при реальных ошибках
      updateState({
        isLiked: wasLiked,
        likesCount: state.likesCount,
        isUpdating: false,
        error: 'Network error',
      });

      // Показываем ошибку только при серьезных проблемах
      if (!error.message?.includes('timeout')) {
        toast.error("Network error. Like will sync when connection is restored.", { duration: 2000 });
      }

      return false;
    } finally {
      pendingOperationRef.current = null;
    }
  }, [user, vibeId, state.isLiked, state.likesCount, state.isUpdating, updateState]);

  // Инициализация и периодическое обновление
  useEffect(() => {
    if (!vibeId) return;

    // Получаем актуальные данные при монтировании
    const initializeData = async () => {
      try {
        const data = await fetchRealTimeData();
        if (data) {
          updateState({
            likesCount: data.count,
            isLiked: data.hasLiked,
            error: null,
          });
        }
      } catch (error) {
        console.error('[useRealTimeLikes] Initialization error:', error);
      }
    };

    initializeData();

    // Устанавливаем интервал для периодического обновления
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!pendingOperationRef.current) {
          debouncedSync();
        }
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [vibeId, fetchRealTimeData, updateState, refreshInterval, debouncedSync]);

  // Обновление при изменении пользователя
  useEffect(() => {
    if (userId) {
      debouncedSync();
    }
  }, [userId, debouncedSync]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    isLiked: state.isLiked,
    likesCount: state.likesCount,
    isUpdating: state.isUpdating,
    error: state.error,
    lastUpdated: state.lastUpdated,
    toggleLike,
    refresh: syncWithServer,
  };
};
