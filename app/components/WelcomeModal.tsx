"use client";

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

// Предзагрузка критических изображений
const preloadedImages = [
  "/images/T-logo.svg",
  "/images/wave-visualizer.svg"
];

// Предзагрузка изображений при монтировании компонента
const ImagePreloader = memo(() => {
  useEffect(() => {
    // Используем Image API для предзагрузки
    preloadedImages.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);
  
  return null;
});

ImagePreloader.displayName = 'ImagePreloader';

// Мемоизированные компоненты для предотвращения ненужных ре-рендеров
const FeatureSlide = memo(({ feature, isActive }: { feature: any, isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#252742]/50 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10 h-full will-change-transform z-1000"
    >
      <div className="flex items-center h-full">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#20DDBB]/20 to-[#8B5CF6]/20 backdrop-blur-xl rounded-full flex items-center justify-center mr-3 sm:mr-4 text-xl sm:text-2xl">
          {feature.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">{feature.title}</h3>
          <p className="text-white/70 text-xs sm:text-sm">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  );
});

FeatureSlide.displayName = 'FeatureSlide';

// Оптимизированная индикаторная точка
const CarouselDot = memo(({ isActive, index, onClick }: { isActive: boolean, index: number, onClick: () => void }) => (
  <button
    className={`transition-all duration-300 ${
      isActive 
        ? 'w-8 sm:w-12 h-3 sm:h-3.5 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] rounded-full shadow-md shadow-[#8B5CF6]/30' 
        : 'w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white/20 hover:bg-white/40 hover:scale-110 rounded-full'
    }`}
    onClick={onClick}
    aria-label={`Go to slide ${index + 1}`}
  />
));

CarouselDot.displayName = 'CarouselDot';

// Мемоизированный компонент копирайта
const Copyright = memo(() => (
  <p className="mt-8 text-white/40 text-sm">
    Copyright © {new Date().getFullYear()} Sacral Track. All rights reserved.
  </p>
));

Copyright.displayName = 'Copyright';

interface WelcomeModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  hideFirstVisitCheck?: boolean;
}

const WelcomeModal = ({ isVisible: propIsVisible, onClose, hideFirstVisitCheck = false }: WelcomeModalProps) => {
  const [isVisible, setIsVisible] = useState(propIsVisible || false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Синхронизируем внутреннее состояние с пропсами
  useEffect(() => {
    if (propIsVisible !== undefined) {
      setIsVisible(propIsVisible);
    }
  }, [propIsVisible]);
  
  // Оптимизированный и мемоизированный массив особенностей
  const features = useMemo(() => [
    {
      title: "Music Streaming Platform",
      description: "Enjoy high-quality audio streaming (192-256 kbps) and premium downloads (WAV & 320 kbps) from emerging and established artists. All music is available for free streaming.",
      icon: "🎵"
    },
    {
      title: "Music Marketplace",
      description: "Release your own tracks! Buy and sell music directly with transparent pricing and artist royalties, supporting creators directly.",
      icon: "💽"
    },
    {
      title: "Social Network",
      description: "Connect with music artists and fans, share vibes (photos, videos, stickers) to express your creativity and musical journey, follow creators, and participate in a vibrant music community. Vibes are your visual way to share moments and emotions related to music.",
      icon: "👥"
    },
    {
      title: "Artist Recognition",
      description: "Discover and gain visibility with Top 100 charts, user ratings, and trending content features",
      icon: "🏆"
    }
  ], []);

  // Эффективная инициализация с использованием requestIdleCallback
  useEffect(() => {
    if (hideFirstVisitCheck) {
      setIsInitialized(true);
      return;
    }
    
    const initializeModal = () => {
      try {
        // Check if this is the first visit
        const hasVisited = localStorage.getItem('sacraltrack_welcomed');
        
        if (!hasVisited) {
          setIsVisible(true);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
      }
    };
    
    // Используем requestIdleCallback или setTimeout
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        // @ts-ignore - TypeScript не всегда распознает requestIdleCallback
        window.requestIdleCallback(initializeModal, { timeout: 1000 });
      } else {
        // Fallback для браузеров, не поддерживающих requestIdleCallback
        const timeoutId = setTimeout(initializeModal, 800);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [hideFirstVisitCheck]);

  // Запуск карусели после инициализации
  useEffect(() => {
    if (isInitialized && isVisible) {
      startCarousel();
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isInitialized, isVisible]);

  // Управление каруселью
  const startCarousel = useCallback(() => {
    if (intervalId) clearInterval(intervalId);
    
    const timer = setTimeout(() => {
      const id = setInterval(() => {
        setCurrentSlide(prev => (prev < features.length - 1 ? prev + 1 : 0));
      }, 5000);
      
      setIntervalId(id);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [features.length, intervalId]);

  // Мемоизированный обработчик для переключения слайдов
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
    
    // Рестарт таймера при ручном переключении
    if (intervalId) clearInterval(intervalId);
    startCarousel();
  }, [intervalId, startCarousel]);

  // Оптимизированное закрытие
  const handleClose = useCallback(() => {
    // Плавная анимация закрытия
    setIsVisible(false);
    
    // Вызываем внешний обработчик если он передан
    if (onClose) {
      onClose();
    } else {
      // Отложим запись в localStorage до завершения анимации
      setTimeout(() => {
        try {
          localStorage.setItem('sacraltrack_welcomed', 'true');
        } catch (error) {
          console.error('Could not set localStorage item', error);
        }
      }, 300);
    }
    
    // Очистка интервалов
    if (intervalId) clearInterval(intervalId);
  }, [intervalId, onClose]);

  // Прерываем рендеринг, если модальное окно не видимо
  if (!isVisible) return <ImagePreloader />;

  // Функция для обработки клика вне модального окна
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был именно по внешнему контейнеру, а не по содержимому
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[999999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOutsideClick}
          style={{ transform: 'translateY(0)' }}
        >
          <motion.div
            className="relative max-w-4xl w-full max-h-[85vh] mx-2 sm:mx-4 bg-gradient-to-b from-[#1A1A2E]/95 to-[#16213E]/95 rounded-xl border border-white/10 shadow-xl overflow-y-auto custom-scrollbar"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 40 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Плавающий градиентный фон */}
            <div className="absolute inset-0 overflow-hidden rounded-xl z-0">
              <div className="absolute -inset-[100px] opacity-30">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-600/40 via-transparent to-transparent animate-pulse-slow absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#20DDBB]/40 via-transparent to-transparent animate-pulse-slower absolute top-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            </div>

            {/* Top nav with dark background */}
            <div className="sticky top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/T-logo.svg"
                  alt="Sacral Track Logo"
                  width={24}
                  height={24}
                  className="drop-shadow-glow"
                  priority
                />
                <span className="text-white font-semibold">Sacral Track</span>
              </div>
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-sm border border-white/10 transition-all duration-300"
                aria-label="Close welcome modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </motion.button>
            </div>

            <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col">
              {/* Лого и заголовок */}
              <div className="mb-4 sm:mb-5 md:mb-8 flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 relative mb-3 sm:mb-4">
                  <Image
                    src="/images/T-logo.svg"
                    alt="Sacral Track Logo"
                    width={80}
                    height={80}
                    className="mx-auto drop-shadow-glow"
                    priority
                  />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center">
                  Welcome to <span className="bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] text-transparent bg-clip-text">Sacral Track</span>
                </h2>
                <p className="mt-2 sm:mt-3 text-white/70 text-xs sm:text-sm md:text-base text-center max-w-xl mx-auto">
                  Music Platform / Social Network for artists and music listeners with high-quality audio and royalty distribution.
                </p>
              </div>

              {/* Test Mode Notice */}
              <div className="mb-5 sm:mb-8 max-w-2xl mx-auto bg-blue-900/20 backdrop-blur-lg rounded-xl border border-blue-500/30 p-3 sm:p-5">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="min-w-8 h-8 sm:min-w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-blue-400 font-medium text-base sm:text-lg mb-0.5 sm:mb-1">Now platform in Test Mode</h4>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                      Sacral Track is currently in test mode. If you notice any bugs or have suggestions for improvements, 
                      please help our team enhance the service by contacting our manager on Telegram: 
                      <a href="https://t.me/sashaplayra" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1 font-medium underline">
                        @sashaplayra
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Features carousel - оптимизировано */}
              <div className="max-w-2xl mx-auto mb-4 sm:mb-6 h-auto min-h-24 sm:min-h-32 md:min-h-36">
                <AnimatePresence mode="wait">
                  {features.map((feature, index) => (
                    <FeatureSlide key={index} feature={feature} isActive={index === currentSlide} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Навигационные контролы - улучшение для мобильных */}
              <div className="flex justify-center gap-2 sm:gap-2.5 mt-3 sm:mt-4 md:mt-6">
                {features.map((_, index) => (
                  <CarouselDot
                    key={index}
                    isActive={currentSlide === index}
                    index={index}
                    onClick={() => handleSlideChange(index)}
                  />
                ))}
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-5 sm:mt-6 md:mt-8">
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] text-white font-medium shadow-glow text-sm sm:text-base md:text-lg"
                >
                  Get Started
                </motion.button>
                
                <Link href="/terms" className="w-full sm:w-auto text-center px-6 sm:px-8 py-2.5 sm:py-3 bg-[#1A2338]/80 text-white border border-white/20 rounded-full font-medium hover:bg-[#1A2338] transition-all will-change-transform text-sm sm:text-base">
                  Read Terms of Service
                </Link>
              </div>

              {/* Copyright - оптимизировано */}
              <p className="mt-5 sm:mt-8 text-white/40 text-xs sm:text-sm text-center">
                Copyright © {new Date().getFullYear()} Sacral Track. All rights reserved.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Экспортируем мемоизированную версию компонента
export default memo(WelcomeModal); 