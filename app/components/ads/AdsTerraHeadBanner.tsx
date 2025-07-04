"use client";

import React, { useEffect, useRef, useState } from 'react';

interface AdsTerraHeadBannerProps {
  adKey: string;
  adWidth: number;
  adHeight: number;
  className?: string;
}

const AdsTerraHeadBanner: React.FC<AdsTerraHeadBannerProps> = ({ 
  adKey, 
  adWidth, 
  adHeight, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const scriptIdRef = useRef<string>(`adsterra-${adKey}-${Date.now()}`);

  useEffect(() => {
    if (!adKey) return;

    console.log(`[AdsTerraHeadBanner] Loading ad with key: ${adKey}`);
    setIsLoading(true);
    setHasError(false);

    try {
      // Создаем уникальный ID для скриптов
      const scriptId = scriptIdRef.current;
      
      // Удаляем существующие скрипты с таким же ID
      const existingOptions = document.getElementById(`${scriptId}-options`);
      const existingInvoke = document.getElementById(`${scriptId}-invoke`);
      if (existingOptions) existingOptions.remove();
      if (existingInvoke) existingInvoke.remove();

      // Создаем первый скрипт с atOptions (точно как в твоем примере)
      const optionsScript = document.createElement('script');
      optionsScript.id = `${scriptId}-options`;
      optionsScript.type = 'text/javascript';
      optionsScript.innerHTML = `
	atOptions = {
		'key' : '${adKey}',
		'format' : 'iframe',
		'height' : ${adHeight},
		'width' : ${adWidth},
		'params' : {}
	};
	console.log('[AdsTerraHeadBanner] atOptions set in head:', atOptions);`;

      // Создаем второй скрипт для загрузки AdsTerra
      const invokeScript = document.createElement('script');
      invokeScript.id = `${scriptId}-invoke`;
      invokeScript.type = 'text/javascript';
      invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;

      // Добавляем скрипты в head документа
      document.head.appendChild(optionsScript);
      document.head.appendChild(invokeScript);

      console.log('[AdsTerraHeadBanner] Scripts added to document head');

      invokeScript.onload = () => {
        console.log('[AdsTerraHeadBanner] Script loaded successfully');
        setIsLoading(false);
        
        // Проверяем через 3 секунды, появился ли контент
        setTimeout(() => {
          // AdsTerra должен автоматически найти место для вставки рекламы
          // Проверяем, есть ли iframe где-то на странице
          const allIframes = document.querySelectorAll('iframe[src*="highperformanceformat"]');
          console.log(`[AdsTerraHeadBanner] Found ${allIframes.length} AdsTerra iframes on page`);
          
          if (allIframes.length === 0) {
            console.log('[AdsTerraHeadBanner] No AdsTerra iframes found, showing error');
            setHasError(true);
          } else {
            console.log('[AdsTerraHeadBanner] AdsTerra iframes found successfully');
          }
        }, 3000);
      };

      invokeScript.onerror = (error) => {
        console.error('[AdsTerraHeadBanner] Script failed to load:', error);
        console.error('[AdsTerraHeadBanner] URL:', invokeScript.src);
        setIsLoading(false);
        setHasError(true);
        
        // Уведомляем родительский компонент об ошибке
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adsterra-error', { 
            detail: { adKey, error: 'Script failed to load from head' } 
          }));
        }
      };

    } catch (error) {
      console.error('[AdsTerraHeadBanner] Error:', error);
      setIsLoading(false);
      setHasError(true);
    }

    // Cleanup function
    return () => {
      const scriptId = scriptIdRef.current;
      const optionsScript = document.getElementById(`${scriptId}-options`);
      const invokeScript = document.getElementById(`${scriptId}-invoke`);
      if (optionsScript) optionsScript.remove();
      if (invokeScript) invokeScript.remove();
      
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
          <div className="text-red-400 text-sm font-medium mb-2">Head Script Failed</div>
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <div className="text-white/60 text-xs">Loading from Head...</div>
          </div>
        </div>
      )}
      
      {/* Placeholder для AdsTerra контента */}
      <div className="w-full h-full bg-transparent"></div>
    </div>
  );
};

export default AdsTerraHeadBanner;
