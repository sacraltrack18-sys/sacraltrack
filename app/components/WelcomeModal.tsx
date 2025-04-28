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
      className="bg-[#252742]/50 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full will-change-transform"
    >
      <div className="flex items-center h-full">
        <div className="w-12 h-12 bg-gradient-to-br from-[#20DDBB]/20 to-[#8B5CF6]/20 backdrop-blur-xl rounded-full flex items-center justify-center mr-4 text-2xl">
          {feature.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-xl font-semibold text-white mb-1">{feature.title}</h3>
          <p className="text-white/70 text-sm">{feature.description}</p>
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
        ? 'w-12 h-3.5 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] rounded-full shadow-md shadow-[#8B5CF6]/30' 
        : 'w-3.5 h-3.5 bg-white/20 hover:bg-white/40 hover:scale-110 rounded-full'
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
      description: "Enjoy high-quality audio streaming (192-256 kbps) and premium downloads (WAV & 320 kbps) from emerging and established artists",
      icon: "🎵"
    },
    {
      title: "Music Marketplace",
      description: "Buy and sell music directly with transparent pricing and fair artist royalties, supporting creators directly",
      icon: "💽"
    },
    {
      title: "Social Network",
      description: "Connect with music artists and fans, share vibes, follow creators, and participate in a vibrant music community",
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
    
    // Очистка интервала
    if (intervalId) clearInterval(intervalId);
  }, [intervalId, onClose]);

  // Мемоизированный обработчик для переключения слайдов
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
    
    // Рестарт таймера при ручном переключении
    if (intervalId) clearInterval(intervalId);
    startCarousel();
  }, [intervalId, startCarousel]);

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999990] flex items-center justify-center bg-black/70 backdrop-blur-xl modal-overlay"
          onClick={handleOutsideClick}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-11/12 max-w-4xl overflow-y-auto max-h-[90vh] rounded-2xl bg-[#1A2338]/70 backdrop-blur-xl shadow-2xl border border-white/10 will-change-transform z-[1000000] modal-content"
          >
            {/* Упрощенные статические элементы фона */}
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/5 blur-3xl"
              />
              <div 
                className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/5 blur-3xl"
              />
            </div>

            {/* Audio wave visualization - оптимизированная статическая версия */}
            <div className="absolute bottom-0 left-0 right-0 opacity-20">
              <Image 
                src="/images/wave-visualizer.svg" 
                alt="Audio Wave" 
                width={800} 
                height={200}
                className="w-full transform scale-y-50"
                priority
                unoptimized // для SVG лучше использовать unoptimized
                loading="eager"
              />
            </div>

            {/* Logo and header - оптимизировано */}
            <div className="relative z-10 p-6 md:p-10 flex flex-col">
              {/* Лого и заголовок */}
              <div className="mb-5 md:mb-8 flex flex-col items-center">
                <div className="w-24 h-24 relative mb-4">
                  <Image
                    src="/images/T-logo.svg"
                    alt="Sacral Track Logo"
                    width={100}
                    height={100}
                    className="mx-auto drop-shadow-glow"
                    priority
                  />
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white text-center">
                  Welcome to <span className="bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] text-transparent bg-clip-text">Sacral Track</span>
                </h2>
                <p className="mt-3 text-white/70 text-sm md:text-base text-center max-w-xl mx-auto">
                  The premier music platform for artists and listeners with high-quality audio and fair royalty distribution
                </p>
              </div>

              {/* Beta warning banner - оптимизировано */}
              <div className="mb-8 py-3 px-6 bg-[#1A2338]/80 backdrop-blur-sm rounded-lg border border-yellow-500/30 max-w-2xl mx-auto">
                <p className="text-yellow-400 font-medium flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>BETA VERSION</span>
                </p>
                <p className="text-white/70 text-sm mt-1">
                  We're constantly improving the platform. Explore features and help us make it better!
                </p>
              </div>

              {/* Features carousel - оптимизировано */}
              <div className="max-w-2xl mx-auto mb-8 h-36">
                <AnimatePresence mode="wait">
                  {features.map((feature, index) => (
                    <FeatureSlide key={index} feature={feature} isActive={index === currentSlide} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Навигационные контролы - улучшение для мобильных */}
              <div className="flex justify-center gap-2.5 mt-6 md:mt-10">
                {features.map((_, index) => (
                  <CarouselDot
                    key={index}
                    isActive={currentSlide === index}
                    index={index}
                    onClick={() => handleSlideChange(index)}
                  />
                ))}
              </div>

              {/* Кнопка "Get Started" - более заметная */}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 md:mt-10 mx-auto px-8 py-3 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] text-white font-medium shadow-glow text-base md:text-lg"
              >
                Get Started
              </motion.button>

              {/* Call to action buttons - оптимизировано */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-xl mx-auto">
                <Link href="/terms" className="px-8 py-3 bg-white/10 backdrop-blur-md rounded-xl font-medium hover:bg-white/20 transition-all will-change-transform">
                  Read Terms of Service
                </Link>
              </div>

              {/* Copyright - оптимизировано */}
              <Copyright />
            </div>

            {/* Кнопка закрытия - более заметная на мобильных */}
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-4 right-4 z-20 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white backdrop-blur-sm border border-white/10 transition-all duration-300"
              aria-label="Close welcome modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Экспортируем мемоизированную версию компонента
export default memo(WelcomeModal); 