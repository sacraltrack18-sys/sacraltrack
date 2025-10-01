"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLikesManager } from '@/app/hooks/useLikesManager';
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
  const { setIsLoginOpen } = useGeneralStore();

  // Используем новый менеджер лайков с дедупликацией
  const {
    count: likesCount,
    hasLiked: isLiked,
    isUpdating,
    error,
    toggleLike,
  } = useLikesManager(vibeId, user?.id);

  // Состояние для анимаций
  const [animationState, setAnimationState] = useState<'idle' | 'liking' | 'unliking'>('idle');
  const [showRipple, setShowRipple] = useState(false);
  const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Уведомляем родительский компонент об изменениях
  useEffect(() => {
    if (onLikeUpdated) {
      onLikeUpdated(likesCount, isLiked);
    }
  }, [likesCount, isLiked, onLikeUpdated]);

  // Функция для обработки клика с анимациями
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    // Запускаем анимацию
    const newState = isLiked ? 'unliking' : 'liking';
    setAnimationState(newState);

    // Показываем ripple эффект
    setShowRipple(true);
    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current);
    }
    rippleTimeoutRef.current = setTimeout(() => {
      setShowRipple(false);
    }, 600);

    try {
      // Выполняем переключение лайка
      const success = await toggleLike();

      // Сбрасываем анимацию
      setTimeout(() => {
        setAnimationState('idle');
      }, success ? 400 : 300);
    } catch (error) {
      console.error('[VibeLikeButton] Toggle error:', error);
      toast.error("Please log in to like vibes");
      setTimeout(() => {
        setAnimationState('idle');
      }, 300);
    }
  };

  // Cleanup функция для таймеров
  useEffect(() => {
    return () => {
      if (rippleTimeoutRef.current) {
        clearTimeout(rippleTimeoutRef.current);
      }
    };
  }, []);

  // Функция для форматирования числа лайков
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };
  
  return (
    <button
      onClick={handleLikeClick}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      title={isLiked ? 'Unlike' : 'Like'}
      className={`group relative flex items-center gap-1.5 ${className} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-full transition-all duration-200`}
    >
      {/* Ripple effect */}
      {showRipple && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-red-500/20 rounded-full animate-ripple" />
        </div>
      )}
      
      {/* Heart icon container */}
      <div className={`relative flex items-center justify-center transition-all duration-300 ${
        animationState === 'liking'
          ? 'animate-likePopIn'
          : animationState === 'unliking'
            ? 'animate-likePopOut'
            : isLiked
              ? 'scale-110 hover:scale-105'
              : 'hover:scale-110'
      }`}>
        {/* Heart icon */}
        {isLiked ? (
          <HeartIconSolid
            className={`${
              size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
            } text-red-500 ${animationState === 'idle' ? 'animate-heartbeat' : ''}`}
          />
        ) : (
          <HeartIconOutline
            className={`${
              size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
            } text-gray-400 group-hover:text-red-500 transition-colors duration-300`}
          />
        )}
      </div>
      
      {/* Like count */}
      {showCount && (
        <div className={`flex items-center transition-all duration-300 ${
          animationState === 'liking' ? 'animate-countUp' : animationState === 'unliking' ? 'animate-countDown' : ''
        }`}>
          <span className={`${
            isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'
          } transition-colors font-medium ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            {formatNumber(likesCount)}
          </span>
          
          {/* Error indicator */}
          {error && (
            <div className="ml-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" title={error} />
          )}
        </div>
      )}
    </button>
  );
};

export default VibeLikeButton;
