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

  // Function to get local storage key for this vibe
  const getVibeLocalStorageKey = (id: string) => `vibe_like_count_${id}`;
  const getVibeUserLikedLocalStorageKey = (id: string, userId: string) => `vibe_liked_by_user_${id}_${userId}`;

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
    if (!user || !vibeId) return;
    
    const checkInitialLikeStatus = async () => {
      try {
        // First check store for faster response
        if (Array.isArray(userLikedVibes) && userLikedVibes.includes(vibeId)) {
          setIsLiked(true);
          
          // Update localStorage
          try {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), 'true');
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
          return;
        }
        
        // If not in store, check the API
        const hasLiked = await checkIfUserLikedVibe(vibeId, user.id);
        setIsLiked(hasLiked);
        
        // Update localStorage
        try {
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), hasLiked ? 'true' : 'false');
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
      } catch (error) {
        console.error('[VibeLikeButton] Error checking like status:', error);
      }
    };
    
    checkInitialLikeStatus();
  }, [vibeId, user, userLikedVibes, checkIfUserLikedVibe]);
  
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
      }
    }
  }, [userLikedVibes, vibeId, isLiked]);
  
  // Update local state when initialLikeCount changes from parent
  useEffect(() => {
    const newCount = typeof initialLikeCount === 'string' 
      ? parseInt(initialLikeCount) || 0 
      : initialLikeCount || 0;
      
    if (newCount !== likesCount) {
      setLikesCount(newCount);
      
      // Store in localStorage
      try {
        localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
    }
  }, [initialLikeCount]);
  
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

  const handleLikeToggle = async (e?: React.MouseEvent) => {
    // Остановим всплытие события, если клик был по кнопке
    if (e) {
      e.stopPropagation();
    }

    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    
    // Предотвращаем множественные запросы, но не блокируем UI обновление
    if (isUpdating) {
      console.log(`[VibeLikeButton] Operation already in progress, showing optimistic update`);
      // Немедленно обновим UI даже если запрос в процессе
      setIsLiked(!isLiked);
      const newCount = !isLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
      setLikesCount(newCount);
      return;
    }
    
    // Генерируем уникальный ID операции для логирования
    const operationId = Math.random().toString(36).substring(7);
    console.log(`[VibeLikeButton ${operationId}] Toggle like for vibe ${vibeId}`);
    
    // Сохраняем предыдущее состояние для отката при ошибке
    const wasLiked = isLiked;
    const prevLikesCount = likesCount;
    
    // Немедленно обновляем UI оптимистично
    setIsLiked(!isLiked);
    const newCount = !isLiked ? prevLikesCount + 1 : Math.max(0, prevLikesCount - 1);
    setLikesCount(newCount);

    // Уведомляем родительский компонент о немедленном обновлении, если есть callback
    if (onLikeUpdated) {
      onLikeUpdated(newCount, !isLiked);
    }
    
    // Сохраняем в localStorage (оптимистичное обновление)
    try {
      localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
      localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), !isLiked ? 'true' : 'false');
    } catch (e) {
      console.error('[VibeLikeButton] Error updating localStorage:', e);
    }
    
    // Отмечаем начало асинхронной операции
    setIsUpdating(true);
    
    try {
      // Вызываем соответствующий метод в зависимости от текущего состояния лайка
      let success;
      if (!isLiked) {
        console.log(`[VibeLikeButton ${operationId}] Adding like`);
        success = await likeVibe(vibeId, user.id);
      } else {
        console.log(`[VibeLikeButton ${operationId}] Removing like`);
        success = await unlikeVibe(vibeId, user.id);
      }
      
      // Если операция не удалась, откатываем состояние
      if (!success) {
        console.error(`[VibeLikeButton ${operationId}] Failed to ${!isLiked ? 'add' : 'remove'} like`);
        setIsLiked(wasLiked);
        setLikesCount(prevLikesCount);
        
        // Откатываем localStorage
        try {
          localStorage.setItem(getVibeLocalStorageKey(vibeId), prevLikesCount.toString());
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), wasLiked ? 'true' : 'false');
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
        
        toast.error(`Failed to ${!isLiked ? 'like' : 'unlike'}. Please try again.`);
      } else {
        // Обновляем userLikedVibes для других компонентов
        if (user && user.id) {
          fetchUserLikedVibes(user.id);
        }
      }
    } catch (error) {
      console.error(`[VibeLikeButton ${operationId}] Error in like operation:`, error);
      
      // Восстанавливаем предыдущее состояние при ошибке
      setIsLiked(wasLiked);
      setLikesCount(prevLikesCount);
      
      // Откатываем localStorage
      try {
        localStorage.setItem(getVibeLocalStorageKey(vibeId), prevLikesCount.toString());
        localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), wasLiked ? 'true' : 'false');
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
      
      // Показываем ошибку пользователю
      toast.error('Failed to update like. Please try again.', {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
      
      // Если ошибка аутентификации, предлагаем логин
      if (error.toString().includes('401') || 
          error.toString().includes('unauthorized') || 
          error.toString().includes('unauthenticated')) {
        setIsLoginOpen(true);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine size classes based on size prop
  const iconSizeClass = {
    'sm': 'w-4 h-4',
    'md': 'w-6 h-6',
    'lg': 'w-8 h-8'
  }[size];
  
  const textSizeClass = {
    'sm': 'text-xs',
    'md': 'text-sm',
    'lg': 'text-base'
  }[size];

  return (
    <div 
      className={`flex items-center cursor-pointer ${className}`}
      onClick={handleLikeToggle}
    >
      {isLiked ? (
        <HeartIconSolid className={`${iconSizeClass} text-pink-500`} />
      ) : (
        <HeartIconOutline className={`${iconSizeClass} text-white hover:text-pink-400 transition-colors`} />
      )}
      
      {showCount && (
        <span className={`${textSizeClass} font-semibold ml-2 ${isLiked ? 'text-pink-500' : 'text-white'}`}>
          {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
        </span>
      )}
    </div>
  );
};

export default VibeLikeButton; 