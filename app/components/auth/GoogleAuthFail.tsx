'use client';

import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle } from "react-icons/fi";
import { clearUserCache } from '@/app/utils/cacheUtils';

export default function GoogleAuthFail() {
    const router = useRouter();

    useEffect(() => {
        // Очистка кэша данных в случае неудачной аутентификации
        clearUserCache();
        
        // Перенаправление на главную через 3 секунды
        const timer = setTimeout(() => {
            router.push('/');
        }, 3000);

        return () => clearTimeout(timer);
    }, [router]);

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
                                We couldn't complete the authentication process. Please try again later.
                            </p>
                        </motion.div>

                        <motion.div
                            className="flex justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <div className="flex items-center gap-2 text-red-500">
                                <motion.span
                                    animate={{
                                        opacity: [1, 0.5, 1],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                    }}
                                >
                                    Redirecting to homepage...
                                </motion.span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
} 