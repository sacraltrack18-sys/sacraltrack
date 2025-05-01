"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, AUTH_STATE_CHANGE_EVENT } from '@/app/context/user';
import { useProfileStore } from '@/app/stores/profile';
import { useVibeStore } from '@/app/stores/vibeStore';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { clearUserCache } from '@/app/utils/cacheUtils';
import { User } from '@/app/types';

/**
 * AuthObserver component
 * 
 * This component monitors authentication state changes and updates
 * the application state accordingly. It ensures data stays fresh
 * without requiring manual page refreshes.
 */
const AuthObserver = () => {
  const router = useRouter();
  const { user, checkUser } = useUser() || {};
  const { setCurrentProfile, currentProfile } = useProfileStore();
  const { fetchUserLikedVibes } = useVibeStore();
  const lastAuthChangeRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const refreshingRef = useRef<boolean>(false);
  const hasInitCheckedRef = useRef<boolean>(false);
  const userLikesLoadedRef = useRef<boolean>(false);

  // Function to update cache timestamp
  const updateCacheTimestamp = () => {
    if (typeof window !== 'undefined') {
      // Снижаем частоту обновления кеша, проверяя, прошло ли не менее 5 минут с последнего обновления
      const lastUpdate = parseInt(window.localStorage.getItem('cache_timestamp') || '0');
      const now = Date.now();
      const timeDiff = now - lastUpdate;
      
      // Пропускаем обновление, если прошло менее 5 минут (300000 мс)
      if (lastUpdate && timeDiff < 300000) {
        return;
      }
      
      const timestamp = Date.now();
      window.localStorage.setItem('cache_timestamp', timestamp.toString());
      // Additional event for Safari and other browsers that need explicit cache invalidation
      const event = new CustomEvent('cache-timestamp-updated', { 
        detail: { timestamp }
      });
      window.dispatchEvent(event);
      
      // В production только важные логи
      if (process.env.NODE_ENV === 'development') {
        console.log('Cache timestamp updated:', timestamp);
      }
    }
  };

  // Load user likes - обернуто в useCallback
  const loadUserLikes = useCallback(async () => {
    if (user && user.id && typeof fetchUserLikedVibes === 'function') {
      console.log('[AUTH-OBSERVER] Loading user liked vibes');
      
      const loadId = Math.random().toString(36).substring(7);
      console.log(`[AUTH-OBSERVER] Load operation ${loadId} started for user ${user.id}`);
      
      // Максимальное количество попыток
      const maxRetries = 3;
      let currentRetry = 0;
      let success = false;
      
      // Добавляем небольшую задержку, чтобы другие компоненты успели инициализироваться
      await new Promise(resolve => setTimeout(resolve, 300));
      
      while (currentRetry < maxRetries && !success) {
        try {
          // Если это повторная попытка, добавляем экспоненциальную задержку
          if (currentRetry > 0) {
            const delay = Math.pow(2, currentRetry) * 500; // 1000, 2000, 4000 ms и т.д.
            console.log(`[AUTH-OBSERVER] Retry ${currentRetry}/${maxRetries} after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          await fetchUserLikedVibes(user.id);
          userLikesLoadedRef.current = true;
          console.log(`[AUTH-OBSERVER] User liked vibes loaded successfully in operation ${loadId}`);
          
          success = true;
        } catch (error) {
          currentRetry++;
          console.error(`[AUTH-OBSERVER] Error loading user liked vibes (attempt ${currentRetry}/${maxRetries}):`, error);
          
          // Если исчерпаны все попытки, устанавливаем специальный флаг для повторной попытки при следующей активности пользователя
          if (currentRetry >= maxRetries) {
            console.error(`[AUTH-OBSERVER] All ${maxRetries} attempts to load user likes failed`);
            
            // Сбрасываем флаг, чтобы при следующем изменении user можно было попробовать снова
            userLikesLoadedRef.current = false;
            
            // Сохраняем информацию о необходимости повторной загрузки
            try {
              localStorage.setItem('likes_load_failed', 'true');
              localStorage.setItem('likes_load_timestamp', Date.now().toString());
            } catch (storageError) {
              console.error('[AUTH-OBSERVER] Error saving likes load state:', storageError);
            }
          }
        }
      }
    }
  }, [user, fetchUserLikedVibes]);

  const throttledRefresh = () => {
    // Проверяем, не обновлялся ли роутер недавно
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 5000 || refreshingRef.current) {
      return;
    }
    
    // Устанавливаем флаг обновления
    refreshingRef.current = true;
    lastUpdateTimeRef.current = now;
    
    // В production только важные логи
    if (process.env.NODE_ENV === 'development') {
      console.log('Refreshing router...');
    }
    
    // Обновляем роутер
    router.refresh();
    
    // Сбрасываем флаг через 1 секунду
    setTimeout(() => {
      refreshingRef.current = false;
    }, 1000);
  };

  // Listen for authentication state changes
  useEffect(() => {
    // Set up listener for auth state changes
    if (typeof window !== 'undefined') {
      const handleAuthChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        const userData = customEvent.detail?.user;
        
        // Create a signature of this auth event to prevent duplicate processing
        const authEventSignature = userData ? `login-${userData.id}-${Math.floor(Date.now()/1000)}` : `logout-${Math.floor(Date.now()/1000)}`;
        
        // Check if this is a duplicate event within the same second
        if (lastAuthChangeRef.current && 
            ((authEventSignature.startsWith('login-') && lastAuthChangeRef.current.startsWith('login-')) ||
            (authEventSignature.startsWith('logout-') && lastAuthChangeRef.current.startsWith('logout-')))) {
          return;
        }
        
        // Store this event signature
        lastAuthChangeRef.current = authEventSignature;
        
        // Clear all user caches when auth state changes
        clearUserCache();
        
        // Only update profile if user data changed
        if (userData && (!currentProfile || currentProfile.user_id !== userData.id)) {
          setCurrentProfile(userData.id);
          
          // Load user likes after profile is set
          if (userData.id) {
            // Reset userLikesLoaded flag when user changes
            userLikesLoadedRef.current = false;
            // Load user likes with a small delay to ensure everything is initialized
            setTimeout(() => {
              loadUserLikes();
            }, 500);
          }
        }
        
        // Throttled router refresh
        throttledRefresh();
      };
      
      // Обработчик события для проверки состояния авторизации
      // Это событие вызывается из компонентов, когда они получают ошибку 401
      const handleAuthCheck = () => {
        if (checkUser && !refreshingRef.current) {
          console.log('Checking auth state due to auth check event');
          refreshingRef.current = true;
          
          // Проверяем текущего пользователя
          if (!user) {
            console.log('User not authorized, need to login');
            
            // Перенаправляем на страницу логина, если пользователь не авторизован
            if (window.location.pathname !== '/auth/login' && 
                window.location.pathname !== '/auth/register') {
              router.push('/auth/login');
            }
          }
          
          // Делаем запрос на обновление состояния пользователя
          checkUser();
          
          // Сбрасываем флаг обновления через некоторое время
          setTimeout(() => {
            refreshingRef.current = false;
          }, 1000);
        }
      };
      
      // Add listeners
      window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
      window.addEventListener('check_auth_state', handleAuthCheck);
      
      // Force update cache on component mount
      updateCacheTimestamp();
      
      return () => {
        // Remove listeners on unmount
        window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
        window.removeEventListener('check_auth_state', handleAuthCheck);
      };
    }
  }, [router, currentProfile, setCurrentProfile, checkUser, fetchUserLikedVibes]);

  // Automatically check for user session on initial render
  useEffect(() => {
    // Check session on component mount only once
    if (checkUser && !hasInitCheckedRef.current) {
      hasInitCheckedRef.current = true;
      console.log('Initial auth check on component mount');
      
      // Run immediate check - no promise chaining, just call the function
      checkUser();
      
      // Additional check after a short delay to catch OAuth redirects
      setTimeout(() => {
        console.log('Running delayed auth check to catch OAuth redirects');
        if (checkUser && !refreshingRef.current) {
          refreshingRef.current = true;
          
          // Call checkUser without promise chaining
          checkUser();
          
          // Force router refresh to update all components
          throttledRefresh();
          
          // Reset refreshing flag
          setTimeout(() => {
            refreshingRef.current = false;
          }, 500);
        }
      }, 1000);
    }
    
    // Set up interval for periodic session checks, but with less frequency
    const interval = setInterval(() => {
      // Only check if we're not currently refreshing
      if (checkUser && !refreshingRef.current) {
        // Call checkUser directly, no promise chaining
        checkUser();
      }
    }, 120000); // Check every 2 minutes
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to ensure this only runs once
  
  // Separate effect to respond to user changes
  useEffect(() => {
    if (user && user.id && !userLikesLoadedRef.current && typeof fetchUserLikedVibes === 'function') {
      console.log('User detected in effect, loading likes');
      loadUserLikes();
    }
  }, [user, fetchUserLikedVibes]); // Убираем loadUserLikes из зависимостей

  // No UI to render
  return null;
};

export default AuthObserver; 