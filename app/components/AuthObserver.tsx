"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, AUTH_STATE_CHANGE_EVENT } from '@/app/context/user';
import { useProfileStore } from '@/app/stores/profile';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { clearUserCache } from '@/app/utils/cacheUtils';

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
  const lastAuthChangeRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const refreshingRef = useRef<boolean>(false);
  const hasInitCheckedRef = useRef<boolean>(false);

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
        }
        
        // Throttled router refresh
        throttledRefresh();
      };
      
      // Add listener
      window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
      
      // Force update cache on component mount
      updateCacheTimestamp();
      
      return () => {
        // Remove listener on unmount
        window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
      };
    }
  }, [router, currentProfile, setCurrentProfile]);

  // Automatically check for user session on initial render
  useEffect(() => {
    // Check session on component mount only once
    if (checkUser && !hasInitCheckedRef.current) {
      hasInitCheckedRef.current = true;
      checkUser().catch(console.error);
    }
    
    // Set up interval for periodic session checks, but with less frequency
    const interval = setInterval(() => {
      // Only check if we're not currently refreshing
      if (checkUser && !refreshingRef.current) {
        checkUser().catch(console.error);
      }
    }, 120000); // Check every 2 minutes instead of every minute
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to ensure this only runs once

  // No UI to render
  return null;
};

export default AuthObserver; 