"use client";

import React, { useEffect, useRef, useState } from 'react';

interface AdsTerraDirectBannerProps {
  adKey: string;
  adWidth: number;
  adHeight: number;
  className?: string;
}

const AdsTerraDirectBanner: React.FC<AdsTerraDirectBannerProps> = ({ 
  adKey, 
  adWidth, 
  adHeight, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!adKey || !containerRef.current) return;

    console.log(`[AdsTerraDirectBanner] Loading ad with key: ${adKey}`);
    setIsLoading(true);
    setHasError(false);

    // Очищаем контейнер
    containerRef.current.innerHTML = '';

    try {
      // Создаем первый скрипт с atOptions (точно как в твоем примере)
      const optionsScript = document.createElement('script');
      optionsScript.type = 'text/javascript';
      optionsScript.innerHTML = `
	atOptions = {
		'key' : '${adKey}',
		'format' : 'iframe',
		'height' : ${adHeight},
		'width' : ${adWidth},
		'params' : {}
	};`;

      // Создаем второй скрипт для загрузки AdsTerra
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;

      console.log('[AdsTerraDirectBanner] Adding scripts to container');

      // Добавляем оба скрипта в контейнер (именно в том порядке, как в твоем примере)
      if (containerRef.current) {
        containerRef.current.appendChild(optionsScript);
        containerRef.current.appendChild(invokeScript);
      }

      invokeScript.onload = () => {
        console.log('[AdsTerraDirectBanner] Script loaded successfully');
        setIsLoading(false);

        // Проверяем через 3 секунды, появился ли iframe
        setTimeout(() => {
          if (containerRef.current) {
            const iframes = containerRef.current.querySelectorAll('iframe');
            const allElements = containerRef.current.querySelectorAll('*');
            console.log(`[AdsTerraDirectBanner] Found ${iframes.length} iframes, ${allElements.length} total elements`);

            if (iframes.length === 0 && allElements.length <= 2) {
              console.log('[AdsTerraDirectBanner] No ad content found, showing error');
              setHasError(true);
            } else {
              console.log('[AdsTerraDirectBanner] Ad content found successfully');
            }
          }
        }, 3000);
      };

      invokeScript.onerror = (error) => {
        console.error('[AdsTerraDirectBanner] Script failed to load:', error);
        console.error('[AdsTerraDirectBanner] This is likely because:');
        console.error('- Domain localhost:3001 is not authorized in AdsTerra');
        console.error('- Ad key may be inactive or invalid');
        console.error('- AdBlocker is blocking the request');
        setIsLoading(false);
        setHasError(true);

        // Уведомляем родительский компонент об ошибке
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adsterra-error', {
            detail: { adKey, error: 'Script failed to load' }
          }));
        }
      };

    } catch (error) {
      console.error('[AdsTerraDirectBanner] Error:', error);
      setIsLoading(false);
      setHasError(true);
    }

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if ((window as any).atOptions) {
        delete (window as any).atOptions;
      }
    };
  }, [adKey, adWidth, adHeight]);

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-800/50 rounded-lg border border-gray-600 ${className}`}
        style={{ width: adWidth, height: adHeight }}
      >
        <div className="text-center p-4">
          <div className="text-red-400 text-sm font-medium mb-2">Ad Failed to Load</div>
          <div className="text-gray-400 text-xs">
            Key: {adKey.substring(0, 8)}...
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: adWidth, height: adHeight, minWidth: adWidth, minHeight: adHeight }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/30 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto mb-2"></div>
            <div className="text-white/60 text-xs">Loading AdsTerra...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsTerraDirectBanner;
