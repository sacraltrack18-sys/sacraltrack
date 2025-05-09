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

export default function GoogleAuthSuccess() {
    const router = useRouter();
    const userContext = useUser();
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(3);
    const maxRetries = 5;
    const errorShownRef = useRef(false);
    const successShownRef = useRef(false);
    const toastIdRef = useRef<string | null>(null);
    const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        toast.dismiss();
        
        return () => {
            toast.dismiss();
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('googleAuthInProgress');
            }
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Clear user cache data for previous user
        clearUserCache();
        
        // Clear the authentication in progress flag
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('googleAuthInProgress');
        }
        
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
                try {
                    const currentSession = await account.getSession('current');
                    if (!currentSession) {
                        throw new Error('No active session found');
                    }
                    console.log('Valid session found:', currentSession.$id);
                } catch (sessionError) {
                    console.error('Session error:', sessionError);
                    // If no valid session and we've already retried, go to error state
                    if (retryCount >= maxRetries) {
                        throw new Error('Failed to authenticate after multiple retries');
                    }
                    // Otherwise retry
                    setRetryCount(prev => prev + 1);
                    setTimeout(updateUserState, 1000);
                    return;
                }
                
                // Check user authentication state using the context
                if (userContext && userContext.checkUser) {
                    console.log('Checking user authentication after Google OAuth');
                    const userData = await userContext.checkUser();
                    
                    if (userData !== null && userData !== undefined) {
                        const user = userData as User;
                        console.log('User authenticated successfully:', user);
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
                        
                        // Redirect to homepage after successful auth - using a shorter delay
                        redirectTimeoutRef.current = setTimeout(() => {
                            router.push('/');
                        }, 1500);
                    } else {
                        console.log('No user data returned, retrying...', retryCount + 1, 'of', maxRetries);
                        // If no userData returned but no error thrown, retry auth check
                        if (retryCount < maxRetries) {
                            setRetryCount(prev => prev + 1);
                            // Silent retry
                            setTimeout(updateUserState, 1000); // Retry after 1 second
                        } else {
                            setCheckingAuth(false);
                            console.error('Failed to authenticate after multiple retries');
                            
                            if (!errorShownRef.current) {
                                errorShownRef.current = true;
                                
                                toast.dismiss();
                                
                                toastIdRef.current = toast.error('Authentication issue, please try again', {
                                    id: 'auth-error',
                                    duration: 5000,
                                });
                            }
                            
                            // Still redirect to homepage after delay
                            redirectTimeoutRef.current = setTimeout(() => {
                                router.push('/');
                            }, 3000);
                        }
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