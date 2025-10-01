"use client";

import React, { useState, useEffect } from 'react';
// Используем динамический импорт для отладчика
// import HydrationDebugger from './debugHydration';

/**
 * Безопасная обертка для отладки гидратации.
 * Использует lazy loading и обработку ошибок для предотвращения сбоев.
 */
const ClientDebugWrapper = () => {
  // Флаг для отслеживания, монтирован ли компонент
  const [mounted, setMounted] = useState(false);

  // Выполняем только на клиенте и только в режиме разработки
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      setMounted(true);
      console.log('[ClientDebugWrapper] Mounted in development mode');
      
      try {
        // Базовый отладчик мутаций DOM для выявления проблем гидратации
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
              console.log('[HydrationDebug] DOM mutation detected', { 
                addedNodes: mutation.addedNodes.length,
                removedNodes: mutation.removedNodes.length,
                target: mutation.target
              });
            }
          }
        });
        
        // Наблюдаем за изменениями DOM
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false
        });
        
        return () => {
          try {
            observer.disconnect();
          } catch (e) {
            console.error('[ClientDebugWrapper] Error disconnecting observer:', e);
          }
        };
      } catch (error) {
        console.error('[ClientDebugWrapper] Error setting up debug tools:', error);
      }
    }
    
    return () => {
      // Пустая функция очистки для случаев, когда не удалось настроить observer
    }
  }, []);
  
  // Ничего не рендерим - это просто утилита для отладки
  return null;
}

export default ClientDebugWrapper; 