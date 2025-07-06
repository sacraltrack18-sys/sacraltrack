"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface NewsAdBannerProps {
  className?: string;
  isMobile?: boolean;
}

const NewsAdBanner: React.FC<NewsAdBannerProps> = ({ className = '', isMobile = false }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  // Проверяем localStorage для состояния баннера
  useEffect(() => {
    const bannerState = localStorage.getItem('newsAdBannerState');
    if (bannerState) {
      const state = JSON.parse(bannerState);
      setIsVisible(state.isVisible);
      setIsMinimized(state.isMinimized);
    }
  }, []);

  // Загружаем AdsTerra скрипт
  useEffect(() => {
    if (!isVisible || isMinimized || !adContainerRef.current) return;

    // Проверяем, не добавлен ли уже скрипт в этот контейнер
    if (adContainerRef.current.firstChild) {
      setAdLoaded(true);
      return;
    }

    const atOptions = {
      key: '0654df9f27dd77270cf8f1aaeed1818a',
      format: 'iframe',
      height: isMobile ? 100 : 250,
      width: 300,
      params: {}
    };

    // Создаем скрипт конфигурации
    const conf = document.createElement('script');
    conf.innerHTML = `atOptions = ${JSON.stringify(atOptions)}`;

    // Создаем скрипт загрузки
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `//www.highperformanceformat.com/${atOptions.key}/invoke.js`;

    script.onload = () => {
      setAdLoaded(true);
    };

    script.onerror = () => {
      console.log('[NewsAdBanner] AdsTerra script failed to load');
      setAdLoaded(false);
    };

    // Добавляем скрипты в контейнер
    adContainerRef.current.appendChild(conf);
    adContainerRef.current.appendChild(script);

  }, [isVisible, isMinimized, isMobile]);

  // Сохраняем состояние в localStorage
  const saveState = (visible: boolean, minimized: boolean) => {
    localStorage.setItem('newsAdBannerState', JSON.stringify({
      isVisible: visible,
      isMinimized: minimized,
      timestamp: Date.now()
    }));
  };

  const handleClose = () => {
    setIsVisible(false);
    saveState(false, false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    saveState(true, !isMinimized);
  };

  // Не показываем баннер если пользователь его скрыл
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: isMobile ? -20 : 0,
        x: isMobile ? 0 : -30,
        scale: 0.95
      }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1
      }}
      exit={{
        opacity: 0,
        y: isMobile ? -20 : 0,
        x: isMobile ? 0 : -30,
        scale: 0.95
      }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={`relative bg-gradient-to-br from-[#1A1D2E]/90 to-[#16213E]/80 backdrop-blur-md rounded-xl border border-purple-500/20 overflow-hidden shadow-2xl hover:shadow-purple-500/10 ${className}`}
    >
        {/* Header с кнопками управления */}
        <div className="flex items-center justify-between p-3 border-b border-gradient-to-r from-purple-500/20 to-blue-500/20">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            ></motion.div>
            <span className="text-white/70 text-xs font-medium bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Sponsored
            </span>
          </div>

          <div className="flex items-center gap-1">
            {!isMobile && (
              <motion.button
                onClick={handleMinimize}
                className="p-2 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-blue-500/20 rounded-lg transition-all duration-300 group"
                whileHover={{
                  scale: 1.1,
                  rotate: isMinimized ? 180 : 0
                }}
                whileTap={{ scale: 0.9 }}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                <svg
                  className="w-4 h-4 text-white/60 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </motion.button>
            )}

            {/* Close button - доступна на всех устройствах */}
            <motion.button
              onClick={handleClose}
              className="p-2 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 rounded-lg transition-all duration-300 group"
              whileHover={{
                scale: 1.1,
                rotate: 90
              }}
              whileTap={{ scale: 0.9 }}
              title="Close Ad"
            >
              <XMarkIcon className="w-4 h-4 text-white/60 group-hover:text-red-400 transition-colors" />
            </motion.button>
          </div>
        </div>

        {/* Контент баннера */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
                y: -20
              }}
              animate={{
                height: "auto",
                opacity: 1,
                y: 0
              }}
              exit={{
                height: 0,
                opacity: 0,
                y: -20
              }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="overflow-hidden"
            >
              <motion.div
                className="p-4 relative"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Декоративный градиент */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-lg"></div>

                <div className="relative">
                  {/* AdsTerra Banner Container */}
                  <div
                    ref={adContainerRef}
                    className="flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700"
                    style={{
                      width: 300,
                      height: isMobile ? 100 : 250,
                      minHeight: isMobile ? 100 : 250
                    }}
                  >
                    {!adLoaded && (
                      <div className="text-center text-gray-400">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2"></div>
                        <div className="text-sm">Loading ad...</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Минимизированное состояние */}
        {isMinimized && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 text-center relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-b-xl"></div>
            <motion.span
              className="text-white/50 text-xs font-medium relative"
              animate={{
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              Ad minimized - Click to expand
            </motion.span>
          </motion.div>
        )}
    </motion.div>
  );
};

export default NewsAdBanner;
