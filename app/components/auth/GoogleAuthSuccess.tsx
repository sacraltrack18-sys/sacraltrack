'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { clearUserCache } from '@/app/utils/cacheUtils';
import { useUser, dispatchAuthStateChange } from '@/app/context/user';
import { account } from '@/libs/AppWriteClient';
import toast from 'react-hot-toast';
import { User } from '@/app/types';
import { clearAllAuthFlags } from '@/app/utils/authCleanup';

// Global limit for auth attempts across page refreshes
const AUTH_ATTEMPT_STORAGE_KEY = 'googleAuthAttempts';
const MAX_GLOBAL_ATTEMPTS = 8; // Maximum attempts allowed in a time window
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

// Track and limit authentication attempts globally
const trackAuthAttempt = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  try {
    // Get current attempts data
    const attemptsData = localStorage.getItem(AUTH_ATTEMPT_STORAGE_KEY);
    let attempts: {timestamp: number, count: number} = attemptsData ? 
      JSON.parse(attemptsData) : 
      { timestamp: Date.now(), count: 0 };
    
    // If data is old (outside window), reset it
    if (Date.now() - attempts.timestamp > ATTEMPT_WINDOW_MS) {
      attempts = { timestamp: Date.now(), count: 0 };
    }
    
    // Increment attempt count
    attempts.count++;
    
    // Store updated attempts
    localStorage.setItem(AUTH_ATTEMPT_STORAGE_KEY, JSON.stringify(attempts));
    
    // Return true if under limit, false if over limit
    return attempts.count <= MAX_GLOBAL_ATTEMPTS;
  } catch (e) {
    console.error('Error tracking auth attempts:', e);
    return true; // Default to allowing on error
  }
};

// Reset the attempt counter on successful login
const resetAuthAttempts = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(AUTH_ATTEMPT_STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      count: 0
    }));
  } catch (e) {
    console.error('Error resetting auth attempts:', e);
  }
};

export default function GoogleAuthSuccess() {
    const router = useRouter();
    const userContext = useUser();
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(3);
    const maxRetries = 5; // Cap per-page retries at 5
    const errorShownRef = useRef(false);
    const successShownRef = useRef(false);
    const toastIdRef = useRef<string | null>(null);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const attemptLimitReached = useRef<boolean>(false);

    useEffect(() => {
        toast.dismiss();
        
        // Всегда очищаем флаги аутентификации при любом сценарии завершения
        clearAllAuthFlags();
        
        // Check if we've hit the global attempt limit
        if (!trackAuthAttempt()) {
          console.error('Global authentication attempt limit reached');
          attemptLimitReached.current = true;
          
          toast.error('Too many authentication attempts. Please try again later.', {
            id: 'auth-limit-reached',
            duration: 5000
          });
          
          // Redirect to homepage after a short delay
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/');
          }, 3000);
        }
        
        return () => {
            toast.dismiss();
            clearAllAuthFlags(); // Очищаем при размонтировании
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Don't proceed if attempt limit reached
        if (attemptLimitReached.current) return;
    
        // Clear user cache data for previous user
        clearUserCache();
        
        // Clear the authentication in progress flag only at the end of the process
        // We'll keep it set during our checks to prevent errors from being shown
        
        // Countdown timer for UI feedback
        const countdownInterval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        // Get the current user authentication state
        const updateUserState = async () => {
            try {
                setCheckingAuth(true);
                
                // First check if we have a valid session directly with Appwrite
                let sessionValid = false;
                try {
                    // Add delay on each retry attempt to spread out the requests
                    if (retryCount > 0) {
                        // Exponential backoff with jitter
                        const baseDelay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
                        const jitter = Math.random() * 500; // Add up to 500ms of random jitter
                        const delay = baseDelay + jitter;
                        console.log(`Retry attempt ${retryCount}: Waiting ${delay.toFixed(0)}ms before checking`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    const currentSession = await account.getSession('current');
                    if (currentSession) {
                        sessionValid = true;
                        console.log('Valid session found:', currentSession.$id);
                    }
                } catch (sessionError) {
                    console.log('Session verification attempt:', retryCount + 1);
                    // If no valid session and we've already retried, go to error state
                    if (retryCount >= maxRetries) {
                        throw new Error('Failed to authenticate after multiple retries');
                    }
                    // Otherwise retry with exponential backoff (already built into the next attempt)
                    setRetryCount(prev => prev + 1);
                    setTimeout(updateUserState, 500); // Schedule next attempt soon
                    return;
                }
                
                // Check user authentication state using the context
                if (userContext && userContext.checkUser) {
                    console.log('Checking user authentication after Google OAuth');
                    
                    // Add a small delay before checking user to ensure session is fully established
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const userData = await userContext.checkUser();
                    
                    if (userData !== null && userData !== undefined) {
                        const user = userData as User;
                        console.log('User authenticated successfully:', user);
                        
                        // Reset auth attempts counter on successful login
                        resetAuthAttempts();
                        
                        // Manually trigger auth state change event to ensure UI updates
                        dispatchAuthStateChange(user);
                        
                        // Update localStorage with userId for features that depend on it
                        if (typeof window !== 'undefined' && user.id) {
                            localStorage.setItem('userId', user.id);
                        }
                        
                        if (!successShownRef.current) {
                            successShownRef.current = true;
                            
                            toast.dismiss();
                            
                            toastIdRef.current = toast.success('Successfully logged in!', {
                                id: 'auth-success',
                                icon: '✅',
                                duration: 3000,
                            });
                        }
                        
                        setCheckingAuth(false);
                        errorShownRef.current = false;
                        
                        // Clear the authentication in progress flag now that we're successful
                        clearAllAuthFlags();
                        
                        // Redirect to homepage after successful auth - using a shorter delay
                        redirectTimeoutRef.current = setTimeout(() => {
                            router.push('/');
                        }, 1500);
                    } else {
                        // If user data is null but session is valid, retry a few times
                        if (sessionValid && retryCount < maxRetries) {
                            console.log('Session valid but user data not found, retrying...');
                            setRetryCount(prev => prev + 1);
                            setTimeout(updateUserState, 1000);
                            return;
                        }
                        
                        throw new Error('Failed to get user data after authentication');
                    }
                } else {
                    console.error('User context or checkUser function is unavailable');
                    setCheckingAuth(false);
                    
                    if (!errorShownRef.current) {
                        errorShownRef.current = true;
                        
                        toast.dismiss();
                        
                        toastIdRef.current = toast.error('Authentication service unavailable', {
                            id: 'auth-context-error',
                            duration: 5000,
                        });
                    }
                    
                    // Redirect to homepage even if context is unavailable
                    redirectTimeoutRef.current = setTimeout(() => {
                        router.push('/');
                    }, 3000);
                }
            } catch (error) {
                console.error('Error updating user state after Google OAuth:', error);
                
                // If we still have retries left, try again silently without showing error
                if (retryCount < maxRetries) {
                    setRetryCount(prev => prev + 1);
                    console.log('Retrying authentication after error...', retryCount + 1, 'of', maxRetries);
                    setTimeout(updateUserState, 1000);
                    return;
                }
                
                setCheckingAuth(false);
                
                if (!errorShownRef.current) {
                    errorShownRef.current = true;
                    
                    toast.dismiss();
                    
                    toastIdRef.current = toast.error('Authentication error, please try again', {
                        id: 'auth-error-catch',
                        duration: 5000,
                    });
                }
                
                // Still redirect even if there's an error
                redirectTimeoutRef.current = setTimeout(() => {
                    router.push('/');
                }, 3000);
            }
        };
        
        // Start authentication process
        updateUserState();
        
        return () => {
            clearInterval(countdownInterval);
            clearAllAuthFlags(); // Ensure flags are cleared
        };
        
    }, [router, userContext, retryCount]);

    const handleContinue = () => {
        router.push('/');
    };

    return (
        <div className="fixed inset-0 bg-[#1E1F2E] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <div className="relative">
                    {/* Animated background gradient */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[#20DDBB] via-[#8A2BE2] to-[#20DDBB] rounded-3xl opacity-20 blur-xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.3, 0.2]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatType: "reverse"
                        }}
                    />

                    <div className="relative bg-[#14151F]/80 rounded-3xl p-8 backdrop-blur-xl border-2 border-[#20DDBB]/20">
                        <motion.div
                            className="flex justify-center mb-6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.8 }}
                        >
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2]"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-[2px] rounded-full bg-[#14151F] flex items-center justify-center">
                                    <FcGoogle className="text-4xl" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-center"
                        >
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] mb-4">
                                Welcome to Sacral Track!
                            </h2>
                            <p className="text-[#818BAC] mb-6">
                                {checkingAuth 
                                    ? "Completing your authentication..." 
                                    : "You've successfully signed in. Get ready to explore!"}
                            </p>
                        </motion.div>

                        {checkingAuth ? (
                            <motion.div
                                className="flex justify-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div className="flex items-center gap-2 text-[#20DDBB]">
                                    <BsMusicNoteBeamed className="text-xl" />
                                    <motion.span
                                        animate={{
                                            opacity: [1, 0.5, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                        }}
                                    >
                                        {`Verifying your account${".".repeat((retryCount % 3) + 1)}`}
                                    </motion.span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col gap-4"
                            >
                                <button
                                    onClick={handleContinue}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                                >
                                    Continue to Homepage
                                </button>
                                
                                <div className="flex justify-center mt-2">
                                    <p className="text-[#818BAC] text-sm">
                                        Redirecting automatically in {secondsLeft} seconds...
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
} 