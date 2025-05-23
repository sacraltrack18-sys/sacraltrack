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
    const [browserInfo, setBrowserInfo] = useState<any>(null);
    const isMobileRef = useRef<boolean>(false);
    const [isFirefox, setIsFirefox] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    useEffect(() => {
        toast.dismiss();
        
        // Retrieve browser info if available
        if (typeof window !== 'undefined') {
            try {
                const storedBrowserInfo = sessionStorage.getItem('authBrowserInfo');
                if (storedBrowserInfo) {
                    const parsedInfo = JSON.parse(storedBrowserInfo);
                    setBrowserInfo(parsedInfo);
                    
                    // Check if this is a mobile browser that needs special handling
                    isMobileRef.current = parsedInfo.isIOS || parsedInfo.isMobileSafari || parsedInfo.isMobileFirefox || parsedInfo.isDesktopSafari;
                    console.log('[GoogleAuthSuccess] Retrieved browser info:', parsedInfo);
                    console.log('[GoogleAuthSuccess] Is browser requiring special handling:', isMobileRef.current);
                }
            } catch (error) {
                console.error('[GoogleAuthSuccess] Error parsing stored browser info:', error);
            }
        }
        
        // Всегда очищаем флаги аутентификации при любом сценарии завершения
        clearAllAuthFlags();
        
        // Check if we've hit the global attempt limit
        if (!trackAuthAttempt()) {
          console.error('[GoogleAuthSuccess] Global authentication attempt limit reached');
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
        
        // Detect Firefox
        if (typeof window !== 'undefined') {
            const ua = navigator.userAgent.toLowerCase();
            setIsFirefox(ua.includes('firefox'));
            // Try to detect Private Browsing (best effort)
            if ((window as any).mozInnerScreenX !== undefined) {
                // Firefox-specific API
                try {
                    window.indexedDB.open('test').onerror = function(e: any) {
                        setIsPrivate(true);
                    };
                } catch {
                    setIsPrivate(true);
                }
            }
            // Log cookies for diagnostics
            setTimeout(() => {
                console.log('[GoogleAuthSuccess] document.cookie:', document.cookie);
            }, 1000);
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
                        console.log(`[GoogleAuthSuccess] Retry attempt ${retryCount}: Waiting ${delay.toFixed(0)}ms before checking`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    // For mobile browsers, add additional delay to ensure cookies are properly set
                    if (isMobileRef.current && retryCount === 0) {
                        console.log('[GoogleAuthSuccess] Mobile browser detected, adding additional initial delay');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                    
                    // Add special Safari handling with additional delay
                    if (browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)) {
                        console.log('[GoogleAuthSuccess] Safari browser detected, adding extended delay for cookie processing');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // For Safari, check if we have a redirect attempt in localStorage
                        const authRedirectAttempt = localStorage.getItem('authRedirectAttempt');
                        if (authRedirectAttempt) {
                            console.log('[GoogleAuthSuccess] Safari auth redirect attempt found from:', new Date(parseInt(authRedirectAttempt)));
                            localStorage.removeItem('authRedirectAttempt'); // Clear it after using
                        }
                    }
                    
                    let currentSession;
                    try {
                        // For Firefox specifically, add additional parameters to getSession call
                        if (browserInfo && browserInfo.isMobileFirefox) {
                            console.log('[GoogleAuthSuccess] Firefox browser detected, using alternative session approach');
                            
                            // Try to get account info first since Firefox might have issues with session cookies
                            try {
                                const accountData = await account.get();
                                if (accountData && accountData.$id) {
                                    console.log('[GoogleAuthSuccess] Account found for Firefox via account.get():', accountData.$id);
                                    sessionValid = true;
                                }
                            } catch (accountError) {
                                console.log('[GoogleAuthSuccess] Firefox account get failed, trying session:', accountError);
                            }
                        }
                        
                        // Always try the standard session approach as a backup
                        if (!sessionValid) {
                            currentSession = await account.getSession('current');
                            if (currentSession) {
                                sessionValid = true;
                                console.log('[GoogleAuthSuccess] Valid session found:', currentSession.$id);
                            }
                        }
                    } catch (getSessionError) {
                        console.log('[GoogleAuthSuccess] Initial session check failed:', getSessionError);
                        
                        // For Safari browsers, try an alternative approach by getting account first
                        if (browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)) {
                            try {
                                console.log('[GoogleAuthSuccess] Safari detected, trying alternative account approach first');
                                const accountData = await account.get();
                                if (accountData && accountData.$id) {
                                    console.log('[GoogleAuthSuccess] Account found for Safari:', accountData.$id);
                                    sessionValid = true;
                                    
                                    // Since we found an account, let's try to create a fresh session if needed
                                    try {
                                        // Try to recreate a session just to ensure it's valid
                                        const currentSessions = await account.listSessions();
                                        if (currentSessions.total === 0) {
                                            console.log('[GoogleAuthSuccess] No sessions found for Safari, although account exists');
                                        } else {
                                            console.log('[GoogleAuthSuccess] Sessions found for Safari:', currentSessions.total);
                                            currentSession = currentSessions.sessions[0];
                                        }
                                    } catch (sessionsError) {
                                        console.log('[GoogleAuthSuccess] Error listing sessions:', sessionsError);
                                    }
                                }
                            } catch (accountError) {
                                console.log('[GoogleAuthSuccess] Safari account approach failed:', accountError);
                            }
                        }
                    }
                    
                    // If we still don't have a valid session and we're using Safari, try a workaround
                    if (!sessionValid && browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)) {
                        console.log('[GoogleAuthSuccess] Session still not valid for Safari, attempting advanced workaround');
                        
                        // For Safari, we'll consider a special fallback where we proceed even without
                        // direct verification of the session if we're on retry 2 or higher
                        if (retryCount >= 2) {
                            console.log('[GoogleAuthSuccess] Safari special fallback: proceeding with authentication attempt regardless of session');
                            sessionValid = true; // Force session valid to proceed with user check
                        }
                    }
                } catch (sessionError) {
                    console.log('[GoogleAuthSuccess] Session verification attempt:', retryCount + 1);
                    console.log('[GoogleAuthSuccess] Session error:', sessionError);
                    
                    // For mobile browsers, try alternative approach to get session if needed
                    if (isMobileRef.current && retryCount >= 1) {
                        try {
                            console.log('[GoogleAuthSuccess] Trying alternative session approach for mobile browser');
                            // Try getting the current account instead
                            const currentAccount = await account.get();
                            if (currentAccount && currentAccount.$id) {
                                console.log('[GoogleAuthSuccess] Account found through alternative method:', currentAccount.$id);
                                sessionValid = true;
                            }
                        } catch (altError) {
                            console.log('[GoogleAuthSuccess] Alternative session check also failed:', altError);
                        }
                    }
                    
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
                    console.log('[GoogleAuthSuccess] Checking user authentication after Google OAuth');
                    
                    // Add a small delay before checking user to ensure session is fully established
                    // Use a longer delay for mobile browsers
                    const userCheckDelay = isMobileRef.current ? 1500 : 500;
                    await new Promise(resolve => setTimeout(resolve, userCheckDelay));
                    
                    // Special Safari handling for user data retrieval
                    if (browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari) && retryCount >= 1) {
                        console.log('[GoogleAuthSuccess] Using extended delay for Safari user retrieval');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    const userData = await userContext.checkUser();
                    
                    if (userData !== null && userData !== undefined) {
                        const user = userData as User;
                        console.log('[GoogleAuthSuccess] User authenticated successfully:', user);
                        
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
                        
                        // Clear browser info from session storage
                        if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('authBrowserInfo');
                        }
                        
                        // Redirect to homepage after successful auth - using a shorter delay
                        redirectTimeoutRef.current = setTimeout(() => {
                            router.push('/');
                        }, 1500);
                    } else {
                        // If user data is null but session is valid, retry a few times
                        if (sessionValid && retryCount < maxRetries) {
                            console.log('[GoogleAuthSuccess] Session valid but user data not found, retrying...');
                            setRetryCount(prev => prev + 1);
                            setTimeout(updateUserState, 1000);
                            return;
                        }
                        
                        throw new Error('Failed to get user data after authentication');
                    }
                } else {
                    console.error('[GoogleAuthSuccess] User context or checkUser function is unavailable');
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
                console.error('[GoogleAuthSuccess] Error updating user state after Google OAuth:', error);
                
                // For Safari, we might need to try a more direct approach as a last resort
                if (browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari) && retryCount >= maxRetries - 1) {
                    console.log('[GoogleAuthSuccess] Safari final attempt: trying direct approach');
                    try {
                        // Try a direct API call to verify authentication
                        const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_URL}/account`, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Appwrite-Project': process.env.NEXT_PUBLIC_ENDPOINT || '',
                            }
                        });
                        
                        if (fallbackResponse.ok) {
                            const accountData = await fallbackResponse.json();
                            console.log('[GoogleAuthSuccess] Safari fallback API call succeeded:', accountData);
                            
                            // If we got a successful response, we're likely authenticated
                            // Save a flag indicating authentication was successful
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('safariAuthSuccessful', 'true');
                                localStorage.setItem('safariAuthTimestamp', Date.now().toString());
                            }
                            
                            // Try to refresh the page as a last resort - this sometimes helps with Safari
                            toast.success('Almost there! Finalizing your login...', {
                                duration: 2000
                            });
                            
                            // Redirect to homepage with a special parameter
                            setTimeout(() => {
                                window.location.href = '/?auth=safari-success';
                            }, 1500);
                            return;
                        } else {
                            console.error('[GoogleAuthSuccess] Safari fallback API call failed');
                        }
                    } catch (directError) {
                        console.error('[GoogleAuthSuccess] Safari direct API call failed:', directError);
                    }
                }
                
                // If we still have retries left, try again silently without showing error
                if (retryCount < maxRetries) {
                    setRetryCount(prev => prev + 1);
                    console.log('[GoogleAuthSuccess] Retrying authentication after error...', retryCount + 1, 'of', maxRetries);
                    setTimeout(updateUserState, 1000);
                    return;
                }
                
                setCheckingAuth(false);
                
                if (!errorShownRef.current) {
                    errorShownRef.current = true;
                    
                    toast.dismiss();
                    
                    // Customize error message for Safari
                    const errorMessage = browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)
                        ? 'Safari authentication error. Try using Chrome or Firefox instead.'
                        : 'Authentication error, please try again';
                    
                    toastIdRef.current = toast.error(errorMessage, {
                        id: 'auth-error-catch',
                        duration: 5000,
                    });
                    
                    // For Safari, show additional help toast
                    if (browserInfo && (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)) {
                        setTimeout(() => {
                            toast((t) => (
                                <div className="flex flex-col gap-2">
                                    <span>Safari has stricter cookie settings that may affect login.</span>
                                    <button
                                        onClick={() => {
                                            window.location.href = '/';
                                            toast.dismiss(t.id);
                                        }}
                                        className="px-4 py-2 bg-[#20DDBB] rounded-lg text-white"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ), {
                                duration: 8000,
                                style: {
                                    background: '#272B43',
                                    color: '#fff',
                                    borderLeft: '4px solid #20DDBB'
                                }
                            });
                        }, 1000);
                    }
                }
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

    const handleTryAgain = () => {
        clearAllAuthFlags();
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('authBrowserInfo');
        }
        router.push('/auth/login');
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
                        {/* Firefox warning */}
                        {isFirefox && (
                            <div className="mb-4 p-3 bg-yellow-900/60 border-l-4 border-yellow-400 rounded text-yellow-200 text-sm">
                                <b>Notice for Firefox users:</b><br/>
                                Google login may not work in Firefox Private Browsing or with strict privacy settings.<br/>
                                {isPrivate ? (
                                    <span><b>It looks like you are in Private Browsing mode.</b><br/>Please try normal mode or use Chrome/Safari for best results.</span>
                                ) : (
                                    <span>If you experience issues, try normal mode or another browser.</span>
                                )}
                            </div>
                        )}
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

                        {errorShownRef.current && !checkingAuth && (
                            <div className="mt-8 text-center">
                                <div className="text-red-500 font-bold mb-2">Не удалось завершить вход через Google</div>
                                <div className="text-[#818BAC] mb-4">
                                    Мы не смогли подтвердить вашу авторизацию. Это может быть связано с особенностями браузера или настройками cookie.<br/>
                                    Попробуйте снова или используйте другой браузер.
                                </div>
                                <button
                                    onClick={handleTryAgain}
                                    className="py-2 px-6 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
} 