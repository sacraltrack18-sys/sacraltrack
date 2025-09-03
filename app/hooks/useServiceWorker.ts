"use client";

import { useEffect, useState, useCallback } from 'react';

interface CacheStats {
  caches: number;
  totalItems: number;
  version: string;
}

interface ServiceWorkerHook {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  cacheStats: CacheStats | null;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  getCacheStats: () => Promise<CacheStats | null>;
  clearCache: () => Promise<void>;
}

export const useServiceWorker = (): ServiceWorkerHook => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    // Check if service worker is supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      setIsSupported(true);
      
      // Check if already registered
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration) {
            setIsRegistered(true);
            console.log('🔄 Service Worker already registered');
          }
        });
    }
  }, []);

  const register = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      console.warn('⚠️ Service Workers not supported');
      return;
    }

    try {
      setIsInstalling(true);
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports'
      });

      console.log('🚀 Service Worker registered:', registration.scope);
      setIsRegistered(true);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('🔄 Service Worker updating...');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Service Worker updated');
              // Notify user about update
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_STATS') {
          setCacheStats(event.data.stats);
        }
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [isSupported]);

  const unregister = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        setIsRegistered(false);
        console.log('🗑️ Service Worker unregistered');
      }
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
    }
  }, [isSupported]);

  const getCacheStats = useCallback(async (): Promise<CacheStats | null> => {
    if (!isRegistered || !navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        const stats = event.data;
        setCacheStats(stats);
        resolve(stats);
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATS' },
        [channel.port2]
      );
    });
  }, [isRegistered]);

  const clearCache = useCallback(async (): Promise<void> => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🗑️ All caches cleared');
        setCacheStats(null);
      } catch (error) {
        console.error('❌ Cache clearing failed:', error);
      }
    }
  }, []);

  return {
    isSupported,
    isRegistered,
    isInstalling,
    cacheStats,
    register,
    unregister,
    getCacheStats,
    clearCache
  };
};
