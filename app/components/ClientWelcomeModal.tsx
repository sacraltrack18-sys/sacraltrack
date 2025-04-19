"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Безопасный динамический импорт WelcomeModal с отключенным SSR
const WelcomeModal = dynamic(() => import('./WelcomeModal'), { 
  ssr: false,
  loading: () => null 
});

interface ClientWelcomeModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  hideFirstVisitCheck?: boolean;
}

export default function ClientWelcomeModal({ isVisible, onClose, hideFirstVisitCheck }: ClientWelcomeModalProps) {
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
      <WelcomeModal 
        isVisible={isVisible} 
        onClose={onClose} 
        hideFirstVisitCheck={hideFirstVisitCheck}
      />
    </Suspense>
  );
} 