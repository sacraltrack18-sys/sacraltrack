'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle } from "react-icons/fi";
import { clearUserCache } from '@/app/utils/cacheUtils';
import { toast } from 'react-hot-toast';

export default function GoogleAuthFail() {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(5);

    useEffect(() => {
        // Clear user cache data on failed authentication
        clearUserCache();
        
        // Clear any Google auth in progress flag
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('googleAuthInProgress');
        }
        
        // Show toast notification
        toast.error('Authentication failed. Please try again.', {
            duration: 5000,
            style: {
                background: '#272B43',
                color: '#fff',
                borderLeft: '4px solid #EF4444'
            }
        });
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        // Redirect to homepage after countdown
        const redirectTimer = setTimeout(() => {
            router.push('/');
        }, 5000);

        return () => {
            clearTimeout(redirectTimer);
            clearInterval(countdownInterval);
        };
    }, [router]);

    const handleTryAgain = () => {
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
                        className="absolute inset-0 bg-gradient-to-r from-red-500 via-[#8A2BE2] to-red-500 rounded-3xl opacity-20 blur-xl"
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

                    <div className="relative bg-[#14151F]/80 rounded-3xl p-8 backdrop-blur-xl border-2 border-red-500/20">
                        <motion.div
                            className="flex justify-center mb-6"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.8 }}
                        >
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-[#8A2BE2]"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-[2px] rounded-full bg-[#14151F] flex items-center justify-center">
                                    <FiAlertCircle className="text-4xl text-red-500" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-center"
                        >
                            <h2 className="text-2xl font-bold text-red-500 mb-4">
                                Authentication Failed
                            </h2>
                            <p className="text-[#818BAC] mb-6">
                                We couldn't complete the authentication process. This might be due to a temporary issue.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col gap-4"
                        >
                            <button
                                onClick={handleTryAgain}
                                className="w-full py-3 px-4 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </button>
                            
                            <div className="flex justify-center mt-2">
                                <p className="text-[#818BAC] text-sm">
                                    Redirecting to homepage in {secondsLeft} seconds...
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
} 