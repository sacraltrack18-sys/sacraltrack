"use client";

import { useEffect } from 'react';
import { useServiceWorker } from '@/app/hooks/useServiceWorker';

export default function ServiceWorkerManager() {
  const { isSupported, register } = useServiceWorker();

  useEffect(() => {
    // Auto-register service worker on app start
    if (isSupported && typeof window !== 'undefined') {
      // Wait for the page to be fully loaded before registering
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    }
  }, [isSupported, register]);

  // This component doesn't render anything
  return null;
}
