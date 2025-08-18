'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalLoader() {
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [audioVisualization, setAudioVisualization] = useState<number[]>([]);
    const pathname = usePathname();

    // Генерирует случайные значения для визуализации аудио
    const generateRandomAudioBars = () => {
        return Array.from({ length: 11 }, () => Math.floor(Math.random() * 60) + 40);
    };

    useEffect(() => {
        const startLoading = () => {
            setLoading(true);
            setProgress(0);
            
            // Создаем интервал для обновления визуализации аудио
            const audioInterval = setInterval(() => {
                setAudioVisualization(generateRandomAudioBars());
            }, 180);
            
            // Использовать CSS-переход для более плавного прогресса
            const duration = 1600; // 1.6 секунды
            const steps = 15;
            const stepDuration = duration / steps;
            
            let currentStep = 0;
            const progressInterval = setInterval(() => {
                currentStep++;
                
                // Нелинейный прогресс для более естественного ощущения
                const progressValue = Math.min(95, Math.pow(currentStep / steps, 0.7) * 100);
                setProgress(progressValue);
                
                if (currentStep >= steps) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        setProgress(100);
                        setTimeout(() => {
                            setLoading(false);
                            clearInterval(audioInterval);
                        }, 300);
                    }, 150);
                }
            }, stepDuration);

            return () => {
                clearInterval(progressInterval);
                clearInterval(audioInterval);
            };
        };

        startLoading();
    }, [pathname]);

    // Определяем анимации для музыкальных нот
    const noteVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1
        },
        exit: { 
            opacity: 0,
            y: -20,
            scale: 0.8
        }
    };

    // Музыкальные эмодзи для разнообразия
    const musicEmojis = ["🎵", "🎸", "🎹", "🎼", "🎧", "🎷", "🎺", "🎻"];

    // Получаем два случайных эмодзи для текущей загрузки
    const getRandomEmojis = () => {
        const shuffled = [...musicEmojis].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);
    };
    
    // Запоминаем выбранные эмодзи при каждой загрузке
    const [currentEmojis] = useState(getRandomEmojis());

    return (
        <AnimatePresence>
            {loading && (
                <>
                    {/* Фон-оверлей с размытием для фокусировки внимания на лоадере */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#1A1A2E]/70 backdrop-blur-sm z-40"
                    />

                    {/* Основной прогресс-бар вверху */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50"
                    >
                        <div className="h-1.5 bg-[#1A1A2E]">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#20DDBB] via-[#8A2BE2] to-[#20DDBB] relative"
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="absolute -right-1.5 -top-[3px] h-3 w-3 rounded-full bg-[#20DDBB] shadow-[0_0_10px_rgba(32,221,187,0.7)]"></div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Центральный лоадер с музыкальной визуализацией */}
                    {progress < 100 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 flex items-center justify-center z-50"
                        >
                            {/* Музыкальный визуализатор */}
                            <div className="backdrop-blur-lg px-6 sm:px-10 py-8 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(42,33,81,0.5)] flex flex-col items-center justify-center gap-5 max-w-sm mx-auto transform scale-[0.95] sm:scale-100 relative overflow-hidden">
                                {/* Эффект свечения */}
                                <div className="absolute -top-[150px] -left-[150px] w-[300px] h-[300px] bg-[#20DDBB]/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute -bottom-[180px] -right-[100px] w-[280px] h-[280px] bg-[#8A2BE2]/5 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <div className="flex items-end justify-center gap-[3px] h-16 mb-3">
                                    {audioVisualization.map((height, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            transition={{
                                                duration: 0.28,
                                                ease: "easeInOut"
                                            }}
                                            className={`w-[3px] sm:w-2 rounded-t-full ${
                                                index % 3 === 0 ? 'bg-[#20DDBB]' : 
                                                index % 3 === 1 ? 'bg-[#8A2BE2]' : 'bg-[#6A5ACD]'
                                            }`}
                                        />
                                    ))}
                                </div>
                                
                                <div className="flex items-center justify-center text-center">
                                    <p className="text-white font-medium text-sm sm:text-base text-center">Sacral Track is preparing the platform for you</p>
                                </div>
                                
                                <motion.div 
                                    className="mt-1 px-6 py-1.5 rounded-full text-white/80 text-xs border border-white/10 text-center bg-[#24183D]/50"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    {Math.round(progress)}% complete
                                </motion.div>
                            </div>
                            
                            {/* Плавающие музыкальные ноты - отцентрированны относительно контейнера */}
                            <AnimatePresence>
                                {loading && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <motion.div
                                            className="absolute top-[-80px] left-[-60px] text-[#20DDBB] text-2xl hidden sm:block"
                                            variants={noteVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            transition={{ 
                                                delay: 0.1,
                                                duration: 0.5,
                                                ease: "easeOut"
                                            }}
                                        >
                                            ♪
                                        </motion.div>
                                        <motion.div
                                            className="absolute bottom-[-60px] left-[-40px] text-[#8A2BE2] text-3xl hidden sm:block"
                                            variants={noteVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            transition={{ 
                                                delay: 0.3,
                                                duration: 0.5,
                                                ease: "easeOut"
                                            }}
                                        >
                                            ♫
                                        </motion.div>
                                        <motion.div
                                            className="absolute top-[-60px] right-[-40px] text-[#6A5ACD] text-xl hidden sm:block"
                                            variants={noteVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            transition={{ 
                                                delay: 0.5,
                                                duration: 0.5,
                                                ease: "easeOut"
                                            }}
                                        >
                                            ♪
                                        </motion.div>
                                        <motion.div
                                            className="absolute bottom-[-40px] right-[-60px] text-[#20DDBB] text-2xl hidden sm:block"
                                            variants={noteVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            transition={{ 
                                                delay: 0.7,
                                                duration: 0.5,
                                                ease: "easeOut"
                                            }}
                                        >
                                            ♫
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
} 