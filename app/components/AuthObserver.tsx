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
      const timestamp = Date.now();
      window.localStorage.setItem('cache_timestamp', timestamp.toString());
      // Additional event for Safari and other browsers that need explicit cache invalidation
      const event = new CustomEvent('cache-timestamp-updated', { 
        detail: { timestamp }
      });
      window.dispatchEvent(event);
      console.log('Cache timestamp updated:', timestamp);
    }
  };

  // Throttled router refresh function to prevent excessive updates
  const throttledRefresh = () => {
    // If already refreshing or it's been less than 2 seconds since last refresh, skip
    if (refreshingRef.current || Date.now() - lastUpdateTimeRef.current < 2000) {
      return;
    }
    
    refreshingRef.current = true;
    lastUpdateTimeRef.current = Date.now();
    
    // Use setTimeout to ensure we don't call router.refresh() too frequently
    setTimeout(() => {
      router.refresh();
      refreshingRef.current = false;
      console.log('Router refreshed');
    }, 100);
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
          console.log('Ignoring duplicate auth event');
          return;
        }
        
        // Store this event signature
        lastAuthChangeRef.current = authEventSignature;
        
        console.log('Auth state change detected:', userData ? 'Logged in' : 'Logged out');
        
        // Clear all user caches when auth state changes
        clearUserCache();
        
        // Only update profile if user data changed
        if (userData && (!currentProfile || currentProfile.user_id !== userData.id)) {
          console.log('Setting current profile from auth change');
          setCurrentProfile(userData.id);
        }
        
        // Throttled router refresh
        throttledRefresh();
        
        // Show stylish toast notification
        if (userData) {
          toast.custom((t) => (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, y: 20 }}
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-gradient-to-br from-[#24183D] to-[#1A2338] backdrop-blur-xl shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black/5 p-4`}
            >
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-10 h-10 rounded-full bg-[#20DDBB]/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white">Welcome back!</p>
                    <p className="mt-1 text-sm text-[#A4ADC6]">
                      Signed in as <span className="text-[#20DDBB]">{userData.name || 'User'}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex border-l border-white/10 pl-4 ml-4 items-center justify-center"
              >
                <svg className="w-5 h-5 text-white/60 hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          ), { id: 'auth-toast', duration: 3000 });
        } else {
          toast.custom((t) => (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, y: 20 }}
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-gradient-to-br from-[#24183D] to-[#1A2338] backdrop-blur-xl shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black/5 p-4`}
            >
              <div className="flex-1 w-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-white">Signed out</p>
                    <p className="mt-1 text-sm text-[#A4ADC6]">You've been safely logged out</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex border-l border-white/10 pl-4 ml-4 items-center justify-center"
              >
                <svg className="w-5 h-5 text-white/60 hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          ), { id: 'auth-toast', duration: 3000 });
        }
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