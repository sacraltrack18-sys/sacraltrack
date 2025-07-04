import React, { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  adKey: string;
  adHeight: number;
  adWidth: number;
  adFormat: string;
}

const Banner: React.FC<AdBannerProps> = ({ adKey, adHeight, adWidth }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [adError, setAdError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, что код выполняется на клиенте (в браузере)
    if (typeof window === 'undefined' || !adKey || !containerRef.current) return;

    try {
      // Reset error state when attempting to load a new ad
      setAdError(false);
      setIsLoading(true);

      // Очищаем контейнер перед добавлением новых скриптов
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      console.log(`[AdsTerra] Loading ad with key: ${adKey}, size: ${adWidth}x${adHeight}`);

      // Проверяем, является ли ключ валидным AdsTerra ключом
      if (!adKey || adKey.length < 20) {
        console.error('[AdsTerra] Invalid ad key provided:', adKey);
        setAdError(true);
        setIsLoading(false);
        return;
      }

      const scriptOptions = document.createElement('script');
      scriptOptions.type = 'text/javascript';
      scriptOptions.innerHTML = `
	atOptions = {
		'key' : '${adKey}',
		'format' : 'iframe',
		'height' : ${adHeight},
		'width' : ${adWidth},
		'params' : {}
	};
      `;

      const scriptSrc = document.createElement('script');
      scriptSrc.type = 'text/javascript';
      scriptSrc.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;

      if (containerRef.current) {
        containerRef.current.appendChild(scriptOptions);
        containerRef.current.appendChild(scriptSrc);
      }

      // Добавляем обработку успешной загрузки
      scriptSrc.onload = () => {
        console.log('[AdsTerra] Script loaded successfully');
        setIsLoading(false);
        // Даем время на загрузку рекламы
        setTimeout(() => {
          if (containerRef.current) {
            const iframes = containerRef.current.querySelectorAll('iframe');
            const hasAdContent = iframes.length > 0;

            console.log(`[AdsTerra] Found ${iframes.length} iframes`);
            console.log(`[AdsTerra] Container children count: ${containerRef.current.children.length}`);

            if (!hasAdContent) {
              console.log('[AdsTerra] No ad iframe found after 3 seconds, showing fallback');
              setAdError(true);
            } else {
              console.log('[AdsTerra] Ad iframe found successfully');
            }
          }
        }, 3000);
      };

      // Добавляем обработку ошибок
      scriptSrc.onerror = (error) => {
        console.error('[AdsTerra] Failed to load ad script:', error);
        console.error('[AdsTerra] URL:', scriptSrc.src);
        console.error('[AdsTerra] This might be due to:');
        console.error('- Invalid ad key');
        console.error('- Domain not authorized for this ad key');
        console.error('- AdBlocker blocking the request');
        console.error('- Network issues');
        setAdError(true);
        setIsLoading(false);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    } catch (error) {
      console.error('[AdsTerra] Error setting up banner:', error);
      setAdError(true);
      setIsLoading(false);
    }

    // Cleanup function to remove scripts on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adKey, adHeight, adWidth]);

  // Show fallback content if there's an ad error
  if (adError) {
    return (
      <div
        className="w-full h-full min-h-[90px] flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/40 relative overflow-hidden"
        style={{
          minWidth: `${adWidth}px`,
          minHeight: `${adHeight}px`,
          maxWidth: '100%'
        }}
      >
        {/* Декоративный фон */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10"></div>
        <div className="absolute top-2 right-2 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-2 left-2 w-12 h-12 bg-blue-500/20 rounded-full blur-lg"></div>

        {/* Контент */}
        <div className="relative z-10 text-center px-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-white font-semibold text-sm mb-2">Ad Space Available</div>
          <div className="text-white/70 text-xs mb-3 leading-relaxed">
            Support SacralTrack by allowing ads<br/>
            or upgrade to Premium for ad-free experience
          </div>
          <div className="flex gap-2 justify-center">
            <button
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs rounded-full transition-all duration-300 transform hover:scale-105"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full transition-all duration-300"
              onClick={() => console.log('Premium upgrade clicked')}
            >
              Go Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[90px] flex items-center justify-center bg-gradient-to-br from-purple-900/10 to-indigo-900/10 rounded-lg overflow-hidden border border-purple-500/20"
      style={{
        minWidth: `${adWidth}px`,
        minHeight: `${adHeight}px`,
        maxWidth: '100%'
      }}
    >
      {isLoading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mb-2"></div>
          <div className="text-white/40 text-sm">Loading AdsTerra...</div>
          <div className="text-white/30 text-xs mt-1">ID: {adKey}</div>
        </div>
      ) : (
        <div className="text-white/40 text-sm">Ad content loading...</div>
      )}
    </div>
  );
};

export default Banner;
