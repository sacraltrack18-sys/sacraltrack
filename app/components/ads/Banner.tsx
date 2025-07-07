"use client";

import { useEffect, useRef } from 'react';

interface BannerProps {
  className?: string;
  isMobile?: boolean;
}

export default function Banner({ className = '', isMobile = false }: BannerProps) {
  const banner = useRef<HTMLDivElement>(null);

  const atOptions = {
    key: '0654df9f27dd77270cf8f1aaeed1818a',
    format: 'iframe',
    height: isMobile ? 100 : 250,
    width: 300,
    params: {},
  };

  useEffect(() => {
    if (banner.current && banner.current.children.length === 0) {
      console.log('[Banner] Loading AdsTerra Static Banner...');

      try {
        // Создаем скрипт конфигурации (точно как в документации AdsTerra)
        const configScript = document.createElement('script');
        configScript.type = 'text/javascript';
        configScript.innerHTML = `
          atOptions = {
            'key' : '${atOptions.key}',
            'format' : 'iframe',
            'height' : ${atOptions.height},
            'width' : ${atOptions.width},
            'params' : {}
          };
        `;

        // Создаем скрипт загрузки (точно как в документации AdsTerra)
        const invokeScript = document.createElement('script');
        invokeScript.type = 'text/javascript';
        invokeScript.src = `//www.highperformanceformat.com/${atOptions.key}/invoke.js`;

        // Добавляем скрипты в правильном порядке
        banner.current.appendChild(configScript);
        banner.current.appendChild(invokeScript);

        console.log('[Banner] AdsTerra scripts added successfully (following official docs)');

      } catch (error) {
        console.error('[Banner] Error loading AdsTerra script:', error);
      }
    }
  }, [banner, atOptions.key, atOptions.height, atOptions.width]);

  return (
    <div 
      className={`mx-2 my-5 border border-gray-200 justify-center items-center text-white text-center ${className}`}
      ref={banner}
      style={{
        minHeight: atOptions.height,
        minWidth: atOptions.width
      }}
    />
  );
}
