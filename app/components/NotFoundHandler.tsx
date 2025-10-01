"use client";

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { notFound } from 'next/navigation';
import { infoToast } from '@/app/utils/toast'

interface NotFoundHandlerProps {
  children: React.ReactNode;
}

/**
 * Component for handling 404 errors and redirecting
 * to the stylized not-found page
 */
const NotFoundHandler: React.FC<NotFoundHandlerProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const lastErrorTime = useRef<number>(0);
  const errorThrottleDelay = 2000; // 2 seconds between repeated error captures
  const notFoundInProgressRef = useRef<boolean>(false);
  const activeNotFoundToasts = new Set<string>();

  // Whitelist of allowed paths
  const validPaths = [
    '/',
    '/auth',
    '/auth/login',
    '/auth/register',
    '/profile',
    '/upload',
    '/terms',
    '/news',
    '/landing',
    '/royalty',
    '/vibe',
    '/friends',
    '/post',
    '/404',
    '/manager',
  ];

  // Extended list of allowed path prefixes
  const validPathPrefixes = [
    '/auth/',
    '/profile/',
    '/post/',
    '/vibe/',
    '/friends/',
    '/royalty/',
    '/news/',
    '/upload/',
    '/manager/',
    '/terms/',
  ];

  useEffect(() => {
    // Function to check if the path is valid
    const isValidPath = (path: string): boolean => {
      // Check exact matches
      if (validPaths.includes(path)) {
        return true;
      }
      
      // Check path prefixes
      return validPathPrefixes.some(prefix => path.startsWith(prefix));
    };

    // Handler for intercepting navigation errors
    const handleFetchErrors = async () => {
      // Prevent multiple simultaneous checks
      if (notFoundInProgressRef.current || !pathname) {
        return;
      }
      
      // Check if the current path is valid
      if (!isValidPath(pathname)) {
        const now = Date.now();
        const timeSinceLastError = now - lastErrorTime.current;
        
        // Limit error frequency
        if (timeSinceLastError > errorThrottleDelay) {
          lastErrorTime.current = now;
          notFoundInProgressRef.current = true;
          
          // If we're already on the 404 page, skip processing
          if (pathname === '/404') {
            notFoundInProgressRef.current = false;
            return;
          }
          
          console.log(`Path ${pathname} is not valid, redirecting to 404`);
          
          // Remove previous notifications if any
          if (activeNotFoundToasts.size > 0) {
            // Use toast.dismiss here since we need to clear all existing toasts first
            const { toast } = await import('react-hot-toast');
            toast.dismiss();
            activeNotFoundToasts.clear();
          }
          
          // Show a redirect notification using unified style
          const toastId = 'not-found-redirect';
          activeNotFoundToasts.add(toastId);
          
          infoToast('Page not found. Redirecting...', { id: toastId });
          
          // Clear active notification after 3.5 seconds
          setTimeout(() => {
            activeNotFoundToasts.delete(toastId);
          }, 3500);
          
          // Set a timer to reset the redirect flag
          setTimeout(() => {
            notFoundInProgressRef.current = false;
          }, 5000);
          
          // Use Next.js built-in mechanism to go to the not-found page
          notFound();
        }
      }
    };

    // Run the check immediately when the component mounts
    handleFetchErrors();

    return () => {
      // Clear if there are active notifications
      if (activeNotFoundToasts.size > 0) {
        // Use dynamic import to avoid issues with server-side rendering
        import('react-hot-toast').then(({ toast }) => {
          toast.dismiss();
        });
        activeNotFoundToasts.clear();
      }
    };
  }, [pathname, router]);

  return <>{children}</>;
};

export default NotFoundHandler; 