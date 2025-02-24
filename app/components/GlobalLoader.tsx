'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalLoader() {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const startLoading = () => {
            setLoading(true);
            setProgress(0);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        return prev;
                    }
                    return prev + 10;
                });
            }, 100);
        };

        const stopLoading = () => {
            setProgress(100);
            clearInterval(interval);
            setTimeout(() => {
                setLoading(false);
            }, 200);
        };

        startLoading();
        stopLoading();

        return () => {
            clearInterval(interval);
        };
    }, [pathname]);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center"
                >
                    <img src="/images/T-logo.svg" alt="Loading" className="w-20 h-20 mb-4" />
                    <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-[#20DDBB]"
                            transition={{ duration: 0.2 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
} 