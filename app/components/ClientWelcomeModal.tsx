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
    
    // Блокируем скролл если модальное окно открыто
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('welcome-modal-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('welcome-modal-open');
    };
  }, [isVisible]);
  
  // Не отображаем ничего до монтирования на клиенте
  if (!isMounted) {
    return null;
  }
  
  // После монтирования рендерим WelcomeModal внутри Suspense
  // Увеличиваем z-index, чтобы модальное окно отображалось выше топ навигации
  return (
    <div className="welcome-modal-wrapper" style={{ position: 'relative', zIndex: 100000 }}>
      <Suspense fallback={null}>
        <WelcomeModal 
          isVisible={isVisible} 
          onClose={onClose} 
          hideFirstVisitCheck={hideFirstVisitCheck}
        />
      </Suspense>
    </div>
  );
} 