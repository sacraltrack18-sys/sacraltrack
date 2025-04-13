import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adKey: string;
  adHeight: number;
  adWidth: number;
  adFormat: string;
}

const Banner: React.FC<AdBannerProps> = ({ adKey, adHeight, adWidth }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Проверяем, что код выполняется на клиенте (в браузере)
    if (typeof window === 'undefined' || !adKey || !containerRef.current) return;

    try {
      // Очищаем контейнер перед добавлением новых скриптов
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const scriptOptions = document.createElement('script');
      scriptOptions.type = 'text/javascript';
      scriptOptions.innerHTML = `
        atOptions = {
          key: '${adKey}',
          format: 'iframe',
          height: ${adHeight},
          width: ${adWidth},
          params: {}
        };
      `;

      const scriptSrc = document.createElement('script');
      scriptSrc.type = 'text/javascript';
      scriptSrc.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
      scriptSrc.async = true;

      if (containerRef.current) {
        containerRef.current.appendChild(scriptOptions);
        containerRef.current.appendChild(scriptSrc);
      }

      // Добавляем обработку ошибок
      scriptSrc.onerror = () => {
        console.error('Failed to load ad script');
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-900/20 to-indigo-900/20 text-white/40 text-sm">Ad content unavailable</div>';
        }
      };
    } catch (error) {
      console.error('Error setting up banner:', error);
    }

    // Cleanup function to remove scripts on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adKey, adHeight, adWidth]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[90px] flex items-center justify-center bg-gradient-to-r from-purple-900/10 to-indigo-900/10 rounded-xl overflow-hidden"
      style={{ 
        minWidth: `${adWidth}px`, 
        minHeight: `${adHeight}px`,
        maxWidth: '100%'
      }}
    >
      <div className="text-white/40 text-sm">Loading ad content...</div>
    </div>
  );
};

export default Banner;
