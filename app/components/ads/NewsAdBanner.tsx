"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Banner from './Banner';
import TestAdBanner from './TestAdBanner';
import AdsTerraDirectBanner from './AdsTerraDirectBanner';
import AdsTerraHeadBanner from './AdsTerraHeadBanner';

interface NewsAdBannerProps {
  className?: string;
  isMobile?: boolean;
  adsterraId?: string;
}

const NewsAdBanner: React.FC<NewsAdBannerProps> = ({ className = '', isMobile = false, adsterraId }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [bannerType, setBannerType] = useState<'adsterra' | 'direct' | 'head' | 'test'>('direct'); // Начинаем с прямого метода

  console.log(`[NewsAdBanner] Rendering with adsterraId: ${adsterraId}, isMobile: ${isMobile}`);

  // Проверяем localStorage для состояния баннера
  useEffect(() => {
    const bannerState = localStorage.getItem('newsAdBannerState');
    if (bannerState) {
      const state = JSON.parse(bannerState);
      setIsVisible(state.isVisible);
      setIsMinimized(state.isMinimized);
    }

    // Слушаем события ошибок AdsTerra
    const handleAdsTerraError = () => {
      console.log('[NewsAdBanner] AdsTerra error detected, switching to test banner');
      setBannerType('test');
    };

    window.addEventListener('adsterra-error', handleAdsTerraError as EventListener);

    // Автоматически переключаемся на тестовый баннер через 8 секунд, если AdsTerra не загрузился
    const fallbackTimer = setTimeout(() => {
      if (bannerType === 'direct' || bannerType === 'head' || bannerType === 'adsterra') {
        console.log('[NewsAdBanner] Switching to test banner due to AdsTerra timeout');
        setBannerType('test');
      }
    }, 8000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('adsterra-error', handleAdsTerraError as EventListener);
    };
  }, [bannerType]);

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

  // Проверяем, включена ли реклама
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
  const adsEnvironment = process.env.NEXT_PUBLIC_ADS_ENVIRONMENT || 'development';

  // Проверяем окружение
  const isProduction = adsEnvironment === 'production' ||
    (typeof window !== 'undefined' &&
     !window.location.hostname.includes('localhost') &&
     !window.location.hostname.includes('127.0.0.1'));

  // Не показываем баннер если:
  // 1. Пользователь его скрыл
  // 2. Реклама отключена и мы не в продакшене
  if (!isVisible || (!adsEnabled && !isProduction)) return null;

  // Конфигурация для разных размеров
  const adConfig = isMobile
    ? {
        adKey: adsterraId ||
               process.env.NEXT_PUBLIC_ADSTERRA_MOBILE_KEY ||
               process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY ||
               "0654df9f27dd77270cf8f1aaeed1818a",
        adWidth: 300,
        adHeight: 100,
        adFormat: "banner"
      }
    : {
        adKey: adsterraId ||
               process.env.NEXT_PUBLIC_ADSTERRA_DESKTOP_KEY ||
               process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY ||
               "0654df9f27dd77270cf8f1aaeed1818a",
        adWidth: 300,
        adHeight: 250,
        adFormat: "rectangle"
      };

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
                  {bannerType === 'test' ? (
                    <TestAdBanner
                      adWidth={adConfig.adWidth}
                      adHeight={adConfig.adHeight}
                      showAdsTerraInfo={true}
                    />
                  ) : bannerType === 'direct' ? (
                    <AdsTerraDirectBanner
                      adKey={adConfig.adKey}
                      adWidth={adConfig.adWidth}
                      adHeight={adConfig.adHeight}
                    />
                  ) : bannerType === 'head' ? (
                    <AdsTerraHeadBanner
                      adKey={adConfig.adKey}
                      adWidth={adConfig.adWidth}
                      adHeight={adConfig.adHeight}
                    />
                  ) : (
                    <Banner
                      adKey={adConfig.adKey}
                      adWidth={adConfig.adWidth}
                      adHeight={adConfig.adHeight}
                      adFormat={adConfig.adFormat}
                    />
                  )}

                  {/* Кнопки переключения для тестирования */}
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    <button
                      onClick={() => setBannerType('direct')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        bannerType === 'direct'
                          ? 'bg-green-600 text-white'
                          : 'bg-black/50 hover:bg-black/70 text-white'
                      }`}
                      title="Direct AdsTerra (Container)"
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => setBannerType('head')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        bannerType === 'head'
                          ? 'bg-orange-600 text-white'
                          : 'bg-black/50 hover:bg-black/70 text-white'
                      }`}
                      title="Head AdsTerra (Document Head)"
                    >
                      Head
                    </button>
                    <button
                      onClick={() => setBannerType('adsterra')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        bannerType === 'adsterra'
                          ? 'bg-blue-600 text-white'
                          : 'bg-black/50 hover:bg-black/70 text-white'
                      }`}
                      title="Original AdsTerra"
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setBannerType('test')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        bannerType === 'test'
                          ? 'bg-purple-600 text-white'
                          : 'bg-black/50 hover:bg-black/70 text-white'
                      }`}
                      title="Test Banner"
                    >
                      Test
                    </button>
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
