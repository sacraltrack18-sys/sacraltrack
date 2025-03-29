"use client";

import React, { useState, useEffect } from 'react';
// Используем динамический импорт для отладчика
// import HydrationDebugger from './debugHydration';

/**
 * Безопасная обертка для отладки гидратации.
 * Использует lazy loading и обработку ошибок для предотвращения сбоев.
 */
export default function ClientDebugWrapper() {
  const [mounted, setMounted] = useState(false);

  // Выполняем только на клиенте и только в режиме разработки
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setMounted(true);
      console.log('[ClientDebugWrapper] Mounted in development mode');
      
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
      
      return () => observer.disconnect();
    }
  }, []);
  
  // Ничего не рендерим - это просто утилита для отладки
  return null;
} 