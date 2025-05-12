"use client";

import { useEffect, useRef } from 'react';
import { useUser } from '../context/user';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Global variable to track displayed authentication notifications
 * Prevents multiple notifications from appearing simultaneously
 */
const activeAuthToasts = new Set<string>();

// Track API error frequency
const API_ERROR_WINDOW_MS = 60000; // 1 minute window
const MAX_ERRORS_PER_WINDOW = 5; // Max errors allowed in window
const apiErrors: {timestamp: number}[] = [];

/**
 * Add an API error occurrence and check if we're over the limit
 * Returns true if we should show the error, false if suppressed
 */
const trackApiError = (): boolean => {
  const now = Date.now();
  
  // Remove errors outside the time window
  while (apiErrors.length > 0 && now - apiErrors[0].timestamp > API_ERROR_WINDOW_MS) {
    apiErrors.shift();
  }
  
  // Add current error
  apiErrors.push({ timestamp: now });
  
  // Return true if under limit, false if over limit
  return apiErrors.length <= MAX_ERRORS_PER_WINDOW;
};

/**
 * Component for handling authentication errors
 * 
 * This component adds a global event handler for API errors
 * and automatically checks authentication state when 401 errors occur
 */
const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const { user, checkUser } = useUser() || {};
  const router = useRouter();
  const lastErrorTime = useRef<number>(0);
  const errorThrottleDelay = 5000; // 5 seconds between repeated error messages
  const authCheckInProgressRef = useRef<boolean>(false);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const originalErrorToastRef = useRef<typeof toast.error | null>(null);

  useEffect(() => {
    // Clear all toast notifications and reset tracking on mount
    toast.dismiss();
    activeAuthToasts.clear();

    // Handler for checking authentication status
    const checkAuthStatus = () => {
      // Prevent multiple simultaneous checks
      if (authCheckInProgressRef.current) {
        console.log("Auth check already in progress, skipping");
        return;
      }
      
      authCheckInProgressRef.current = true;
      setTimeout(() => { authCheckInProgressRef.current = false }, 2000);
      
      console.log("Checking auth status from AuthErrorHandler");
      
      // Check if Google auth is in progress
      const isGoogleAuthInProgress = typeof window !== 'undefined' && 
        window.sessionStorage && 
        window.sessionStorage.getItem('googleAuthInProgress') === 'true';
      
      // If Google auth is in progress, don't take any action
      if (isGoogleAuthInProgress) {
        console.log("Google auth in progress, skipping error handling");
        return;
      }
      
      // If we're seeing too many errors in a short time, suppress them temporarily
      if (!trackApiError()) {
        console.log("Too many API errors in short time, suppressing auth checks temporarily");
        return;
      }
      
      if (checkUser) {
        checkUser().catch(console.error);
      }

      // If user is not authenticated, redirect to login page
      // but only if enough time has passed since the last message
      if (!user) {
        const now = Date.now();
        const timeSinceLastError = now - lastErrorTime.current;
        
        // Check if we're on a page that requires authentication
        if (window.location.pathname !== '/auth/login' && 
            window.location.pathname !== '/auth/register' && 
            window.location.pathname !== '/' &&
            !window.location.pathname.startsWith('/auth/')) {
          
          // Check if an authentication error notification is already displayed
          if (activeAuthToasts.has('auth-error-global')) {
            console.log("Auth error toast already displayed, skipping");
            return;
          }
          
          // Limit frequency of authentication error messages
          if (timeSinceLastError > errorThrottleDelay) {
            lastErrorTime.current = now;
            
            // Remove all current notifications to avoid screen overload
            toast.dismiss();
            
            // Add to list of active notifications
            activeAuthToasts.add('auth-error-global');
            
            // Show notification
            const toastId = toast.error('Authentication required. Please log in.', {
              id: 'auth-error-global', // Use unique ID to prevent duplicates
              duration: 5000,
            });
            
            // Create timer for automatic removal from active list
            setTimeout(() => {
              activeAuthToasts.delete('auth-error-global');
            }, 5500); // 5 seconds + 500ms buffer
          }
          
          router.push('/auth/login');
        }
      }
    };

    // Store the original fetch to restore it later
    if (typeof window !== 'undefined' && !originalFetchRef.current) {
      originalFetchRef.current = window.fetch;
    }

    // Handler for fetch requests that intercepts 401 errors
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const response = await (originalFetchRef.current || fetch).apply(window, [input, init]);
        
        // Check if Google auth is in progress
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
        
        // If 401 error and not during Google auth
        if (response.status === 401 && !isGoogleAuthInProgress) {
          // If we're seeing too many errors, suppress them temporarily
          if (trackApiError()) {
            console.log("Received 401 from API, triggering auth check");
            const event = new CustomEvent('check_auth_state', {});
            window.dispatchEvent(event);
          } else {
            console.log("Suppressing 401 error due to rate limiting");
          }
        }
        
        return response;
      } catch (error) {
        // Ignore errors during Google auth process
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
          
        if (isGoogleAuthInProgress) {
          console.log("Suppressing fetch error during Google auth process");
        } else {
          // If we're seeing too many errors, suppress some logs
          if (trackApiError()) {
            console.error("Fetch error:", error);
          } else {
            console.log("Suppressing error log due to rate limiting");
          }
        }
        throw error;
      }
    };

    // Store original toast.error to restore it later
    if (!originalErrorToastRef.current) {
      originalErrorToastRef.current = toast.error;
    }

    // Patch toast.error to track authentication notifications
    toast.error = (message, options) => {
      // If message is related to authentication, check if one is already shown
      if (typeof message === 'string' && 
          (message.includes('Authentication') || message.includes('auth'))) {
        
        // Check if Google auth is in progress - if so, suppress most error toasts
        const isGoogleAuthInProgress = typeof window !== 'undefined' && 
          window.sessionStorage && 
          window.sessionStorage.getItem('googleAuthInProgress') === 'true';
          
        if (isGoogleAuthInProgress && !message.includes('Too many authentication attempts')) {
          console.log("Suppressing auth error toast during Google auth:", message);
          return 'suppressed';
        }
        
        const toastId = options?.id || 'auth-error-' + Date.now();
        
        // If a notification with this ID is already displayed, don't show a new one
        if (activeAuthToasts.has(toastId)) {
          console.log(`Toast with ID ${toastId} already active, skipping`);
          return toastId as string;
        }
        
        // Add ID to list of active
        activeAuthToasts.add(toastId);
        
        // Use original function without additional options
        const id = originalErrorToastRef.current?.(message, options) || '';
        
        // Create timer for automatic removal from active list after 5 seconds
        setTimeout(() => {
          activeAuthToasts.delete(toastId);
        }, (options?.duration || 5000) + 500); // Add 500ms buffer
        
        return id;
      }
      
      // For normal messages use the original function
      return originalErrorToastRef.current?.(message, options) || '';
    };

    // Listen for authentication check event
    window.addEventListener('check_auth_state', checkAuthStatus);

    return () => {
      // Remove handlers when component unmounts
      window.removeEventListener('check_auth_state', checkAuthStatus);
      
      // Restore original functions
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      
      if (originalErrorToastRef.current) {
        toast.error = originalErrorToastRef.current;
      }
      
      // Clear all notifications and reset tracking
      toast.dismiss();
      activeAuthToasts.clear();
    };
  }, [user, checkUser, router]);

  return <>{children}</>;
};

export default AuthErrorHandler; 