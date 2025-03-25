'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalLoader() {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const startLoading = () => {
            setLoading(true);
            setProgress(0);
            
            // Use CSS transition for smoother progress
            const duration = 1000; // 1 second
            const steps = 10;
            const stepDuration = duration / steps;
            
            let currentStep = 0;
            const progressInterval = setInterval(() => {
                currentStep++;
                setProgress(Math.min(90, currentStep * 10));
                
                if (currentStep >= steps) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        setProgress(100);
                        setTimeout(() => {
                            setLoading(false);
                        }, 200);
                    }, 100);
                }
            }, stepDuration);

            return () => clearInterval(progressInterval);
        };

        startLoading();
    }, [pathname]);

    return (
        <AnimatePresence>
            {loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-50"
                >
                    <div className="h-1 bg-gray-200">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2]"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
} 