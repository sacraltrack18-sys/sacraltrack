import { useState, useEffect, useCallback, useRef } from 'react';

interface LikeData {
  count: number;
  hasLiked: boolean;
  lastUpdated: number;
}

interface PendingRequest {
  promise: Promise<LikeData>;
  timestamp: number;
}

// Глобальный кэш для лайков
const likesCache = new Map<string, LikeData>();
const pendingRequests = new Map<string, PendingRequest>();
const subscribers = new Map<string, Set<(data: LikeData) => void>>();

// Время жизни кэша (30 секунд)
const CACHE_TTL = 30000;
// Время жизни pending запросов (10 секунд)
const PENDING_TTL = 10000;

// Очистка устаревших pending запросов
setInterval(() => {
  const now = Date.now();
  pendingRequests.forEach((request, key) => {
    if (now - request.timestamp > PENDING_TTL) {
      pendingRequests.delete(key);
    }
  });
}, 5000);

// Функция для получения данных о лайках (с дедупликацией)
async function fetchLikeData(vibeId: string, userId?: string): Promise<LikeData> {
  const cacheKey = `${vibeId}_${userId || 'anonymous'}`;
  const now = Date.now();
  
  // Проверяем кэш
  const cached = likesCache.get(cacheKey);
  if (cached && (now - cached.lastUpdated) < CACHE_TTL) {
    return cached;
  }
  
  // Проверяем, есть ли уже запрос в процессе
  const pending = pendingRequests.get(cacheKey);
  if (pending && (now - pending.timestamp) < PENDING_TTL) {
    return pending.promise;
  }
  
  // Создаем новый запрос
  const promise = (async (): Promise<LikeData> => {
    try {
      const params = new URLSearchParams({ vibe_id: vibeId });
      if (userId) {
        params.append('user_id', userId);
      }
      params.append('_t', now.toString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
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
      const result: LikeData = {
        count: data.count || 0,
        hasLiked: data.hasLiked || false,
        lastUpdated: now,
      };
      
      // Сохраняем в кэш
      likesCache.set(cacheKey, result);
      
      // Уведомляем всех подписчиков
      const subs = subscribers.get(cacheKey);
      if (subs) {
        subs.forEach(callback => callback(result));
      }
      
      return result;
    } catch (error) {
      console.error(`[LikesManager] Error fetching likes for ${vibeId}:`, error);
      // Возвращаем данные из кэша если есть, иначе дефолтные
      const fallback = cached || { count: 0, hasLiked: false, lastUpdated: now };
      return fallback;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Сохраняем pending запрос
  pendingRequests.set(cacheKey, { promise, timestamp: now });
  
  return promise;
}

// Функция для обновления лайка
async function toggleLike(vibeId: string, userId: string): Promise<LikeData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('/api/vibes/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        user_id: userId,
        vibe_id: vibeId,
        _timestamp: Date.now(),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const result: LikeData = {
      count: data.count || 0,
      hasLiked: data.hasLiked || false,
      lastUpdated: Date.now(),
    };
    
    // Обновляем кэш для всех вариантов ключей
    const cacheKey = `${vibeId}_${userId}`;
    const anonymousKey = `${vibeId}_anonymous`;
    
    likesCache.set(cacheKey, result);
    likesCache.set(anonymousKey, { ...result, hasLiked: false }); // Анонимные не видят свой лайк
    
    // Уведомляем подписчиков
    [cacheKey, anonymousKey].forEach(key => {
      const subs = subscribers.get(key);
      if (subs) {
        const dataForKey = key === anonymousKey ? { ...result, hasLiked: false } : result;
        subs.forEach(callback => callback(dataForKey));
      }
    });
    
    return result;
  } catch (error) {
    console.error(`[LikesManager] Error toggling like for ${vibeId}:`, error);
    throw error;
  }
}

// Хук для использования в компонентах
export function useLikesManager(vibeId: string, userId?: string) {
  const [data, setData] = useState<LikeData>({ count: 0, hasLiked: false, lastUpdated: 0 });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheKey = `${vibeId}_${userId || 'anonymous'}`;
  
  // Подписка на обновления
  useEffect(() => {
    const callback = (newData: LikeData) => {
      setData(newData);
      setError(null);
    };
    
    if (!subscribers.has(cacheKey)) {
      subscribers.set(cacheKey, new Set());
    }
    subscribers.get(cacheKey)!.add(callback);
    
    // Получаем начальные данные
    fetchLikeData(vibeId, userId).then(callback).catch(err => {
      console.error('[useLikesManager] Initial fetch error:', err);
      setError('Failed to load likes');
    });
    
    return () => {
      const subs = subscribers.get(cacheKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          subscribers.delete(cacheKey);
        }
      }
    };
  }, [vibeId, userId, cacheKey]);
  
  // Функция для переключения лайка
  const handleToggleLike = useCallback(async () => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    if (isUpdating) return false;
    
    setIsUpdating(true);
    setError(null);
    
    // Оптимистичное обновление
    const optimisticData: LikeData = {
      count: data.hasLiked ? Math.max(0, data.count - 1) : data.count + 1,
      hasLiked: !data.hasLiked,
      lastUpdated: Date.now(),
    };
    setData(optimisticData);
    
    try {
      await toggleLike(vibeId, userId);
      return true;
    } catch (error: any) {
      console.error('[useLikesManager] Toggle error:', error);
      setError('Failed to update like');
      // Откатываем оптимистичное обновление
      setData(data);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [vibeId, userId, data, isUpdating]);
  
  // Функция для принудительного обновления
  const refresh = useCallback(() => {
    likesCache.delete(cacheKey);
    fetchLikeData(vibeId, userId).then(newData => {
      setData(newData);
      setError(null);
    }).catch(err => {
      console.error('[useLikesManager] Refresh error:', err);
      setError('Failed to refresh likes');
    });
  }, [vibeId, userId, cacheKey]);
  
  return {
    count: data.count,
    hasLiked: data.hasLiked,
    isUpdating,
    error,
    toggleLike: handleToggleLike,
    refresh,
    lastUpdated: data.lastUpdated,
  };
}
