'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * HeadersManager компонент отвечает за управление заголовками 
 * и решение проблемы с заголовками безопасности при переходе между страницами.
 * 
 * Это особенно важно при переходе со страницы /upload на другие страницы,
 * так как заголовки COOP и COEP, необходимые для SharedArrayBuffer, могут
 * конфликтовать с загрузкой изображений на других страницах.
 */
export default function HeadersManager() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Проверка флага перехода со страницы /upload
    const comingFromUpload = sessionStorage.getItem('coming_from_upload');
    
    if (comingFromUpload === 'true' && !pathname.startsWith('/upload')) {
      console.log('Detected navigation from /upload page, cleaning up session storage flag');
      
      // Удаляем флаг из sessionStorage
      sessionStorage.removeItem('coming_from_upload');
      
      // Если текущий URL содержит служебные параметры навигации, очищаем их
      if (window.location.search.includes('from_upload=true')) {
        const cleanUrl = window.location.href.replace(/(\?|&)from_upload=true/, '');
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [pathname]);
  
  // Компонент не рендерит никакой UI
  return null;
} 