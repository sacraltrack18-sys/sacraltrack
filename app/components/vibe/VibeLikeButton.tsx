"use client";

import React, { useState, useEffect } from 'react';
import { useVibeStore } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useGeneralStore } from '@/app/stores/general';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface VibeLikeButtonProps {
  vibeId: string;
  initialLikeCount?: number | string;
  initialLikeState?: boolean;
  onLikeUpdated?: (count: number, isLiked: boolean) => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VibeLikeButton: React.FC<VibeLikeButtonProps> = ({
  vibeId,
  initialLikeCount = 0,
  initialLikeState = false,
  onLikeUpdated,
  showCount = true,
  size = 'md',
  className = '',
}) => {
  const { user } = useUser() || { user: null };
  const { userLikedVibes, likeVibe, unlikeVibe, checkIfUserLikedVibe, fetchUserLikedVibes } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  
  // Local state for the like button
  const [isLiked, setIsLiked] = useState(initialLikeState);
  const [likesCount, setLikesCount] = useState<number>(
    typeof initialLikeCount === 'string' ? parseInt(initialLikeCount) || 0 : initialLikeCount || 0
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasPendingOperations, setHasPendingOperations] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Function to get local storage key for this vibe
  const getVibeLocalStorageKey = (id: string) => `vibe_like_count_${id}`;
  const getVibeUserLikedLocalStorageKey = (id: string, userId: string) => `vibe_liked_by_user_${id}_${userId}`;

  // Immediately update likes count when initialLikeCount changes
  useEffect(() => {
    const newCount = typeof initialLikeCount === 'string' 
      ? parseInt(initialLikeCount) || 0 
      : initialLikeCount || 0;
      
    // Только обновляем, если значение действительно изменилось
    if (newCount !== likesCount) {
      console.log('[VibeLikeButton] Updating like count from props:', newCount);
      setLikesCount(newCount);
      
      // Сохраняем в localStorage
      try {
        localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
    }
  }, [initialLikeCount, vibeId, likesCount]);

  // Check if the like count is stored in localStorage
  useEffect(() => {
    if (!vibeId) return;
    
    try {
      // Get stored like count
      const storedCountKey = getVibeLocalStorageKey(vibeId);
      const storedCount = localStorage.getItem(storedCountKey);
      
      if (storedCount) {
        const parsedCount = parseInt(storedCount, 10);
        if (!isNaN(parsedCount) && parsedCount !== likesCount) {
          console.log(`[VibeLikeButton] Using stored like count for ${vibeId}: ${parsedCount}`);
          setLikesCount(parsedCount);
          
          // Notify parent of updated count if callback provided
          if (onLikeUpdated) {
            onLikeUpdated(parsedCount, isLiked);
          }
        }
      }
      
      // If user is logged in, check if they liked this vibe in localStorage
      if (user && user.id) {
        const userLikedKey = getVibeUserLikedLocalStorageKey(vibeId, user.id);
        const userLiked = localStorage.getItem(userLikedKey);
        
        if (userLiked === 'true' && !isLiked) {
          console.log(`[VibeLikeButton] Setting isLiked=true from localStorage for ${vibeId}`);
          setIsLiked(true);
          
          // Notify parent of updated like state if callback provided
          if (onLikeUpdated) {
            onLikeUpdated(likesCount, true);
          }
        }
      }
    } catch (error) {
      console.error('[VibeLikeButton] Error accessing localStorage:', error);
    }
  }, [vibeId, user]);

  // Check initial like state when component mounts
  useEffect(() => {
    if (!user || !user.id || !vibeId) return;
    
    const checkInitialLikeStatus = async () => {
      try {
        // First check store for faster response
        if (Array.isArray(userLikedVibes) && userLikedVibes.includes(vibeId)) {
          setIsLiked(true);
          
          // Update localStorage
          try {
            if (typeof localStorage !== 'undefined' && user && user.id) {
              localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), 'true');
            }
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
          return;
        }
        
        // If not in store, check the API
        if (user && user.id) {
          const hasLiked = await checkIfUserLikedVibe(vibeId, user.id);
          setIsLiked(hasLiked);
          
          // Update localStorage
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), hasLiked ? 'true' : 'false');
            }
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
          
          // Если статус лайка изменился, уведомляем родительский компонент
          if (hasLiked !== isLiked && onLikeUpdated) {
            onLikeUpdated(likesCount, hasLiked);
          }
        }
      } catch (error) {
        console.error('[VibeLikeButton] Error checking like status:', error);
      }
    };
    
    checkInitialLikeStatus();
  }, [vibeId, user, userLikedVibes, checkIfUserLikedVibe, isLiked, likesCount, onLikeUpdated]);
  
  // Watch for changes in userLikedVibes
  useEffect(() => {
    if (!vibeId) return;
    
    if (Array.isArray(userLikedVibes)) {
      const isLikedInStore = userLikedVibes.includes(vibeId);
      if (isLikedInStore !== isLiked) {
        setIsLiked(isLikedInStore);
        
        // Update localStorage if user is logged in
        if (user && user.id) {
          try {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), isLikedInStore ? 'true' : 'false');
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
        }
        
        // Notify parent component if like status changed
        if (onLikeUpdated) {
          onLikeUpdated(likesCount, isLikedInStore);
        }
      }
      
      // Периодически проверяем актуальность состояния лайка с сервером
      const checkServerLikeStatus = async () => {
        if (!user || !user.id) return;
        
        try {
          // Добавляем случайный параметр для предотвращения кэширования
          const serverLikeStatus = await checkIfUserLikedVibe(vibeId, user.id);
          
          if (serverLikeStatus !== isLiked) {
            console.log('[VibeLikeButton] Syncing like status with server:', serverLikeStatus);
            setIsLiked(serverLikeStatus);
            
            try {
              if (typeof localStorage !== 'undefined' && user && user.id) {
                localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), serverLikeStatus ? 'true' : 'false');
              }
            } catch (e) {
              console.error('[VibeLikeButton] Error updating localStorage:', e);
            }
            
            // Также проверяем актуальное количество лайков
            try {
              const response = await fetch(`/api/vibes/like?vibe_id=${vibeId}&_t=${Date.now()}`, {
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data && typeof data.count === 'number' && data.count !== likesCount) {
                  console.log('[VibeLikeButton] Updating like count from server:', data.count);
                  setLikesCount(data.count);
                  
                  try {
                    localStorage.setItem(getVibeLocalStorageKey(vibeId), data.count.toString());
                    localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), serverLikeStatus ? 'true' : 'false');
                    localStorage.setItem(`vibe_last_synced_${vibeId}`, new Date().getTime().toString());
                  } catch (e) {
                    console.error('[VibeLikeButton] Error updating localStorage:', e);
                  }
                  
                  // Notify parent component
                  if (onLikeUpdated) {
                    onLikeUpdated(data.count, serverLikeStatus);
                    return; // Избегаем двойного вызова onLikeUpdated
                  }
                }
              }
            } catch (countError) {
              console.error('[VibeLikeButton] Error fetching like count:', countError);
            }
            
            // Notify parent component
            if (onLikeUpdated) {
              onLikeUpdated(likesCount, serverLikeStatus);
            }
          }
          
          // Проверяем наличие отложенных операций
          syncPendingLikeOperations();
        } catch (error) {
          console.error('[VibeLikeButton] Error checking server like status:', error);
        }
      };
      
      // Функция для синхронизации отложенных операций с лайками
      const syncPendingLikeOperations = async () => {
        if (!vibeId || !user || !user.id) return;
        
        // Проверяем доступность localStorage
        if (typeof localStorage === 'undefined') return;
        
        try {
          const pendingOperationsKey = `pending_likes_${user.id}`;
          const pendingOperationsJson = localStorage.getItem(pendingOperationsKey);
          
          if (pendingOperationsJson) {
            const pendingOperations = JSON.parse(pendingOperationsJson);
            
            if (pendingOperations && Array.isArray(pendingOperations) && pendingOperations.length > 0) {
              console.log(`[VibeLikeButton] Found ${pendingOperations.length} pending like operations to sync`);
              
              // Создаем новый массив для операций, которые не удалось синхронизировать
              interface LikeOperation {
                vibeId: string;
                action: 'like' | 'unlike';
                timestamp: number;
              }
              
              const failedOperations: LikeOperation[] = [];
              
              for (const operation of pendingOperations) {
                if (operation.vibeId === vibeId) {
                  try {
                    if (operation.action === 'like' && user && user.id) {
                      await likeVibe(operation.vibeId, user.id);
                    } else if (operation.action === 'unlike' && user && user.id) {
                      await unlikeVibe(operation.vibeId, user.id);
                    }
                    console.log(`[VibeLikeButton] Successfully synced ${operation.action} operation for vibe ${operation.vibeId}`);
                  } catch (error) {
                    console.error(`[VibeLikeButton] Failed to sync ${operation.action} operation:`, error);
                    if (operation) {
                      failedOperations.push(operation);
                    }
                  }
                } else {
                  // Сохраняем операции для других vibeId
                  if (operation) {
                    failedOperations.push(operation);
                  }
                }
              }
              
              // Обновляем список отложенных операций
              try {
                if (typeof localStorage !== 'undefined') {
                  if (failedOperations.length > 0) {
                    localStorage.setItem(pendingOperationsKey, JSON.stringify(failedOperations));
                  } else {
                    localStorage.removeItem(pendingOperationsKey);
                  }
                }
              } catch (storageError) {
                console.error('[VibeLikeButton] Error updating localStorage after sync:', storageError);
              }
            }
          }
        } catch (e) {
          console.error('[VibeLikeButton] Error syncing pending like operations:', e);
        }
      };
      
      // Проверяем статус при монтировании компонента
      checkServerLikeStatus();
      
      // Устанавливаем интервал для периодической проверки статуса лайка
      // Это поможет синхронизировать состояние между разными вкладками
      const syncInterval = setInterval(checkServerLikeStatus, 30000); // Каждые 30 секунд
      
      // Функция для обработки события восстановления соединения
      const handleOnline = () => {
        console.log('[VibeLikeButton] Connection restored. Syncing pending operations...');
        toast.success('Connection restored. Syncing your likes...');
        syncPendingLikeOperations();
      };
      
      // Функция для обработки события потери соединения
      const handleOffline = () => {
        console.log('[VibeLikeButton] Connection lost. Like operations will be queued.');
        toast('You are offline. Your likes will be synced when you reconnect.');
      };
      
      // Добавляем слушатели событий для отслеживания изменений состояния сети
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        clearInterval(syncInterval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [userLikedVibes, vibeId, isLiked, likesCount, onLikeUpdated, user, checkIfUserLikedVibe]);
  
  // Update local state when initialLikeState changes from parent
  useEffect(() => {
    if (initialLikeState !== isLiked) {
      setIsLiked(initialLikeState);
      
      // Update localStorage if user is logged in
      if (user && user.id) {
        try {
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), initialLikeState ? 'true' : 'false');
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
      }
    }
  }, [initialLikeState]);

  const handleLikeToggle = async () => {
    if (!user || !user.id) {
      setIsLoginOpen(true);
      return;
    }
    
    if (isUpdating) return;
    
    // Проверяем доступность localStorage
    const isLocalStorageAvailable = typeof localStorage !== 'undefined';
    
    // Добавляем дебаунс для предотвращения множественных кликов
    const debounceKey = `vibe_like_debounce_${vibeId}`;
    let shouldThrottle = false;
    
    if (isLocalStorageAvailable) {
      const lastClickTime = localStorage.getItem(debounceKey);
      const now = Date.now();
      
      if (lastClickTime && now - parseInt(lastClickTime) < 1000) {
        console.log('[VibeLikeButton] Throttling like request to prevent spam');
        shouldThrottle = true;
      }
      
      // Сохраняем время клика
      try {
        localStorage.setItem(debounceKey, now.toString());
      } catch (e) {
        console.error('[VibeLikeButton] Error updating debounce localStorage:', e);
      }
    }
    
    if (shouldThrottle) return;
    
    setIsUpdating(true);
    
    // Store previous state for rollback
    const prevIsLiked = isLiked;
    const prevCount = likesCount;
    
    try {
      // Immediate UI update
      const newIsLiked = !isLiked;
      const newCount = newIsLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
      
      // Update UI immediately
      setIsLiked(newIsLiked);
      setLikesCount(newCount);
      
      // Update localStorage
      if (isLocalStorageAvailable) {
        try {
          localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
          if (user && user.id) {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), newIsLiked ? 'true' : 'false');
          }
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
      }
      
      // Notify parent component
      if (typeof onLikeUpdated === 'function') {
        onLikeUpdated(newCount, newIsLiked);
      }
      
      // Проверяем соединение с интернетом
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      
      // Объявляем переменную success на уровне функции
      let success = false;
      
      if (!isOnline) {
        console.log('[VibeLikeButton] User is offline. Adding like operation to pending queue.');
        // Добавляем операцию в список отложенных операций
        if (isLocalStorageAvailable && user && user.id) {
          try {
            const pendingOperationsKey = `pending_likes_${user.id}`;
            const pendingOperationsJson = localStorage.getItem(pendingOperationsKey);
            const pendingOperations = pendingOperationsJson ? JSON.parse(pendingOperationsJson) : [];
          
            pendingOperations.push({
              vibeId,
              action: newIsLiked ? 'like' : 'unlike',
              timestamp: new Date().getTime()
            });
          
            localStorage.setItem(pendingOperationsKey, JSON.stringify(pendingOperations));
            toast('You are offline. Your like will be synced when you reconnect.');
            success = true; // Считаем операцию успешной для UI
          } catch (e) {
            console.error('[VibeLikeButton] Failed to save pending operation:', e);
          }
        }
      } else {
        // Make API request with retry logic
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            success = newIsLiked 
              ? await likeVibe(vibeId, user.id)
              : await unlikeVibe(vibeId, user.id);
            
            if (success) break;
            
            // Если запрос не удался, но не вызвал исключение, ждем и повторяем
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`[VibeLikeButton] Retrying ${newIsLiked ? 'like' : 'unlike'} operation (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          } catch (apiError) {
            console.error('[VibeLikeButton] API error:', apiError);
            retryCount++;
            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            } else {
              break;
            }
          }
        }
      }
      
      if (!success) {
        // Rollback on error
      setIsLiked(prevIsLiked);
      setLikesCount(prevCount);
      
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getVibeLocalStorageKey(vibeId), prevCount.toString());
          if (user && user.id) {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), prevIsLiked ? 'true' : 'false');
          }
        }
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
        
        if (onLikeUpdated) {
          onLikeUpdated(prevCount, prevIsLiked);
        }
        
        toast.error('Failed to update like status. Please try again later.');
      } else {
        // Update global state
        if (user && user.id) {
          fetchUserLikedVibes(user.id);
        }
      }
    } catch (error) {
      console.error('[VibeLikeButton] Unexpected error:', error);
      
      // Rollback on error
      setIsLiked(prevIsLiked);
      setLikesCount(prevCount);
      
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getVibeLocalStorageKey(vibeId), prevCount.toString());
          if (user && user.id) {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), prevIsLiked ? 'true' : 'false');
          }
        }
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage during error recovery:', e);
      }
      
      if (onLikeUpdated) {
        onLikeUpdated(prevCount, prevIsLiked);
      }
      
      // Показываем более информативное сообщение об ошибке
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('auth') || error.message.includes('permission')) {
          errorMessage = 'Authentication error. Please log in again.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // Добавляем небольшую задержку перед сбросом состояния isUpdating,
      // чтобы анимация успела завершиться
      setTimeout(() => {
        setIsUpdating(false);
      }, 300);
    }
  };

  // Функция для получения количества отложенных операций с лайками
  const checkPendingOperations = () => {
    if (!user || !user.id) {
      setHasPendingOperations(false);
      return 0;
    }
    
    // Проверяем доступность localStorage
    if (typeof localStorage === 'undefined') {
      setHasPendingOperations(false);
      return 0;
    }
    
    try {
      const pendingOperationsKey = `pending_likes_${user.id}`;
      const pendingOperationsJson = localStorage.getItem(pendingOperationsKey);
      
      if (pendingOperationsJson) {
        const pendingOperations = JSON.parse(pendingOperationsJson);
        if (pendingOperations && Array.isArray(pendingOperations)) {
          // Фильтруем операции для текущего vibeId
          const count = pendingOperations.filter(op => op.vibeId === vibeId).length;
          setHasPendingOperations(count > 0);
          return count;
        }
      }
      
      setHasPendingOperations(false);
    } catch (e) {
      console.error('[VibeLikeButton] Error checking pending operations:', e);
      setHasPendingOperations(false);
    }
    
    return 0;
  };
  
  // Форматирование числа лайков
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  };

  // Функция для тактильной обратной связи на мобильных устройствах
  const provideTactileFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10); // Короткая вибрация для тактильной обратной связи
      } catch (error) {
        console.error('[VibeLikeButton] Error providing tactile feedback:', error);
      }
    }
  };
  
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Добавляем тактильную обратную связь для мобильных устройств
        provideTactileFeedback();
        handleLikeToggle();
      }}
      disabled={isUpdating}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      title={isLiked ? 'Unlike' : 'Like'}
      className={`group flex items-center gap-1.5 ${className} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full`}
    >
      <div className={`relative flex items-center justify-center transition-all duration-300 ${isUpdating ? 'scale-90' : isLiked ? 'scale-110 hover:scale-105' : 'hover:scale-110'}`}>
          {isUpdating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-2 border-t-red-500 border-r-red-300 border-b-red-200 border-l-red-300 animate-spin"></div>
            </div>
          ) : null}
          {isLiked ? (
            <HeartIconSolid 
              className={`${
                size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
              } text-red-500 ${isUpdating ? '' : 'animate-heartbeat'}`} 
            />
          ) : (
            <HeartIconOutline 
              className={`${
                size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
              } text-gray-400 group-hover:text-red-500 transition-colors duration-300`} 
            />
          )}
        </div>
      {showCount && (
        <div className="flex items-center">
          <span className={`${
            isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'
          } transition-colors ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            {formatNumber(likesCount)}
          </span>
          
          {/* Индикатор отложенных операций */}
          {typeof navigator !== 'undefined' && !navigator.onLine && checkPendingOperations() > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-3 h-3 bg-yellow-400 rounded-full" title="Pending synchronization">
              <span className="animate-pulse"></span>
            </span>
          )}
        </div>
      )}
    </button>
  );
};

export default VibeLikeButton;