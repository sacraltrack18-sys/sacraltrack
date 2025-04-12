"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Безопасный динамический импорт WelcomeModal с отключенным SSR
const WelcomeModal = dynamic(() => import('./WelcomeModal'), { 
  ssr: false,
  loading: () => null 
});

export default function ClientWelcomeModal() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Используем useEffect для проверки, что компонент смонтирован на клиенте
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Не отображаем ничего до монтирования на клиенте
  if (!isMounted) {
    return null;
  }
  
  // После монтирования рендерим WelcomeModal внутри Suspense
  return (
    <Suspense fallback={null}>
      <WelcomeModal />
    </Suspense>
  );
} 