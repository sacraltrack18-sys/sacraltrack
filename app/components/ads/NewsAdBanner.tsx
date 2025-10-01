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
      try {
        const state = JSON.parse(bannerState);
        console.log('[NewsAdBanner] Loaded state from localStorage:', state);

        // Проверяем, не слишком ли старое состояние (сбрасываем через 24 часа)
        const now = Date.now();
        const stateAge = now - (state.timestamp || 0);
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа

        if (stateAge > maxAge) {
          console.log('[NewsAdBanner] State is too old, resetting to visible');
          localStorage.removeItem('newsAdBannerState');
          setIsVisible(true);
          setIsMinimized(false);
        } else {
          setIsVisible(state.isVisible);
          setIsMinimized(state.isMinimized);
        }
      } catch (error) {
        console.error('[NewsAdBanner] Error parsing localStorage state:', error);
        localStorage.removeItem('newsAdBannerState');
        setIsVisible(true);
        setIsMinimized(false);
      }
    } else {
      console.log('[NewsAdBanner] No saved state, showing banner');
    }
  }, []);

  // Загружаем AdsTerra Static Banner согласно официальной документации
  useEffect(() => {
    console.log('[NewsAdBanner] useEffect triggered:', { isVisible, isMinimized, hasContainer: !!adContainerRef.current });

    if (!isVisible || isMinimized || !adContainerRef.current) {
      console.log('[NewsAdBanner] Skipping script load due to conditions');
      return;
    }

    // Проверяем, не добавлен ли уже скрипт в этот контейнер
    if (adContainerRef.current.children.length > 0) {
      console.log('[NewsAdBanner] Script already exists, setting loaded to true');
      setAdLoaded(true);
      return;
    }

    console.log('[NewsAdBanner] Loading AdsTerra Static Banner...');

    try {
      // Очищаем контейнер
      adContainerRef.current.innerHTML = '';

      // Создаем скрипт конфигурации (новый баннер 320x50)
      const configScript = document.createElement('script');
      configScript.type = 'text/javascript';
      configScript.innerHTML = `
        atOptions = {
          'key' : '4385a5a6b91cfc53c3cdf66ea55b3291',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
      `;

      // Создаем скрипт загрузки (новый баннер)
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = '//www.highperformanceformat.com/4385a5a6b91cfc53c3cdf66ea55b3291/invoke.js';
      invokeScript.async = true;

      // Добавляем обработчики событий
      invokeScript.onload = () => {
        console.log('[NewsAdBanner] ✅ AdsTerra script loaded successfully');
        setAdLoaded(true);

        // Проверяем создание iframe через разные интервалы
        const checkForAd = (attempt = 1) => {
          setTimeout(() => {
            const iframe = adContainerRef.current?.querySelector('iframe');
            const allElements = adContainerRef.current?.querySelectorAll('*');
            const scripts = adContainerRef.current?.querySelectorAll('script');

            console.log(`[NewsAdBanner] Check ${attempt}: iframe=${!!iframe}, total elements=${allElements?.length}, scripts=${scripts?.length}`);

            if (iframe) {
              console.log('[NewsAdBanner] 🎯 AdsTerra iframe found!', {
                src: iframe.src,
                width: iframe.width,
                height: iframe.height,
                display: iframe.style.display,
                visibility: iframe.style.visibility
              });

              // Убираем fallback если iframe найден
              const fallback = adContainerRef.current?.querySelector('.fallback-ad');
              if (fallback) {
                fallback.remove();
              }

            } else if (attempt < 8) { // Увеличиваем количество попыток
              checkForAd(attempt + 1);
            } else {
              console.log('[NewsAdBanner] ⚠️ No iframe created after 8 attempts, showing fallback');

              // Показываем fallback изображение
              if (adContainerRef.current && !adContainerRef.current.querySelector('.fallback-ad')) {
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'fallback-ad absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg';
                fallbackDiv.innerHTML = `
                  <div class="text-center">
                    <div class="text-sm font-medium">Advertisement</div>
                    <div class="text-xs opacity-80">320x50 Banner Space</div>
                  </div>
                `;
                adContainerRef.current.appendChild(fallbackDiv);
              }
            }
          }, attempt * 500); // 0.5s, 1s, 1.5s, 2s, 2.5s, 3s, 3.5s, 4s
        };

        checkForAd();
      };

      invokeScript.onerror = (error) => {
        console.error('[NewsAdBanner] ❌ AdsTerra script failed to load:', error);
        setAdLoaded(false);
      };

      // Добавляем скрипты в контейнер (точно как в документации)
      adContainerRef.current.appendChild(configScript);
      adContainerRef.current.appendChild(invokeScript);

      console.log('[NewsAdBanner] AdsTerra Static Banner scripts added (following official docs)');

      // Устанавливаем загрузку через задержку
      setTimeout(() => {
        setAdLoaded(true);
        console.log('[NewsAdBanner] Banner marked as loaded');

        // Проверяем появление iframe
        setTimeout(() => {
          const iframe = adContainerRef.current?.querySelector('iframe');
          if (iframe) {
            console.log('[NewsAdBanner] ✅ AdsTerra iframe found:', iframe.src);
          } else {
            console.log('[NewsAdBanner] ⚠️ No iframe found, checking for other ad elements...');
            const allElements = adContainerRef.current?.querySelectorAll('*');
            console.log('[NewsAdBanner] Container elements:', allElements?.length || 0);
          }
        }, 2000);
      }, 1000);

    } catch (error) {
      console.error('[NewsAdBanner] Error adding AdsTerra script:', error);
      setAdLoaded(false);
    }

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
    console.log('[NewsAdBanner] Closing banner');
    setIsVisible(false);
    saveState(false, false);
  };

  const handleMinimize = () => {
    console.log('[NewsAdBanner] Toggling minimize:', !isMinimized);
    setIsMinimized(!isMinimized);
    saveState(true, !isMinimized);
  };

  // Функция для принудительного показа баннера (для отладки)
  const forceShow = () => {
    console.log('[NewsAdBanner] Force showing banner');
    localStorage.removeItem('newsAdBannerState');
    setIsVisible(true);
    setIsMinimized(false);
  };

  // Функция для перезагрузки AdsTerra скрипта
  const reloadAdScript = () => {
    console.log('[NewsAdBanner] Reloading AdsTerra script');
    if (adContainerRef.current) {
      adContainerRef.current.innerHTML = '';
      setAdLoaded(false);

      // Принудительно перезапускаем useEffect
      setTimeout(() => {
        if (adContainerRef.current && isVisible && !isMinimized) {
          const event = new Event('reload-ad');
          adContainerRef.current.dispatchEvent(event);
        }
      }, 100);
    }
  };

  // Альтернативный метод загрузки AdsTerra (для отладки)
  const loadAdAlternative = () => {
    console.log('[NewsAdBanner] 🔄 Trying alternative loading method...');
    if (!adContainerRef.current) return;

    // Очищаем контейнер
    adContainerRef.current.innerHTML = '';

    // Создаем iframe напрямую (для тестирования нового баннера)
    const testIframe = document.createElement('iframe');
    testIframe.src = `https://www.highperformanceformat.com/4385a5a6b91cfc53c3cdf66ea55b3291/invoke.js`;
    testIframe.width = '320';
    testIframe.height = '50';
    testIframe.style.border = 'none';
    testIframe.style.display = 'block';

    testIframe.onload = () => {
      console.log('[NewsAdBanner] 🎯 Test iframe loaded');
    };

    testIframe.onerror = () => {
      console.log('[NewsAdBanner] ❌ Test iframe failed');
    };

    adContainerRef.current.appendChild(testIframe);
  };

  // Добавляем глобальные функции для отладки
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showNewsAdBanner = forceShow;
      (window as any).reloadAdScript = reloadAdScript;
      (window as any).loadAdAlternative = loadAdAlternative;
      console.log('[NewsAdBanner] Added global functions: window.showNewsAdBanner(), window.reloadAdScript(), window.loadAdAlternative()');
    }
  }, []);

  // Не показываем баннер если пользователь его скрыл
  if (!isVisible) {
    console.log('[NewsAdBanner] Banner is not visible, returning null');
    return null;
  }

  console.log('[NewsAdBanner] Rendering banner, isVisible:', isVisible, 'isMinimized:', isMinimized);

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
                className="relative"
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
                    className="flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 relative overflow-hidden"
                    style={{
                      width: 320,    // Новый размер баннера
                      height: 50,    // Новый размер баннера
                      minHeight: 50  // Новый размер баннера
                    }}
                  >
                    {!adLoaded && (
                      <div className="text-center text-gray-400 z-10 flex flex-col items-center justify-center h-full">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-2"></div>
                        <div className="text-sm">Loading Advertisement...</div>
                        <div className="text-xs mt-1 opacity-70">AdsTerra Banner</div>
                        <div className="text-xs mt-1 opacity-50">320x50</div>
                      </div>
                    )}



                    {/* Отладочная информация (только в development) */}
                    {process.env.NODE_ENV === 'development' && (
                      <>
                        <div className="absolute top-1 left-1 text-xs text-green-400 bg-black/50 px-1 rounded z-20">
                          {adLoaded ? '✅ Script Loaded' : '⏳ Loading Script'}
                        </div>

                        <div className="absolute bottom-1 left-1 text-xs text-blue-400 bg-black/50 px-1 rounded z-20">
                          Container: {adContainerRef.current?.children.length || 0} children
                        </div>
                      </>
                    )}

                    {/* Кнопки для отладки (только в development) */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="absolute top-1 right-1 flex gap-1 z-30">
                        <button
                          onClick={reloadAdScript}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                          title="Reload Ad Script"
                        >
                          🔄
                        </button>
                        <button
                          onClick={loadAdAlternative}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                          title="Try Alternative Method"
                        >
                          🧪
                        </button>
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
            className="text-center relative"
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
