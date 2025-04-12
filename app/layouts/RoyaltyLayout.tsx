"use client";

import React, { useEffect } from 'react';
import TopNav from "@/app/layouts/includes/TopNav";
import { useUser } from "@/app/context/user";
import { PlayerProvider } from '@/app/context/playerContext';
import AuthObserver from "@/app/components/AuthObserver";
import UserProfileSidebar from "@/app/components/profile/UserProfileSidebar";
import { useProfileStore } from "@/app/stores/profile";
import { motion } from 'framer-motion';

// Custom optimized RoyaltyLayout that completely eliminates unnecessary spacing
const RoyaltyLayout = ({ children }: { children: React.ReactNode }) => {
  const userContext = useUser();
  const { currentProfile, setCurrentProfile } = useProfileStore();
  
  // Load profile if user is authenticated
  useEffect(() => {
    if (userContext?.user?.id && !currentProfile) {
      setCurrentProfile(userContext.user.id);
    }
  }, [userContext?.user?.id, currentProfile, setCurrentProfile]);

  // Анимация плавающего фона
  useEffect(() => {
    const interBubble = document.querySelector('.interactive') as HTMLElement;
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;

    const move = () => {
      if (interBubble) {
        const bubbleRect = interBubble.getBoundingClientRect();
        curX += (tgX - bubbleRect.width / 2 - curX) / 20;
        curY += (tgY - bubbleRect.height / 2 - curY) / 20;

        interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      }
      requestAnimationFrame(move);
    };

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    move();

    const dynamicBubbles = document.querySelectorAll('.dynamic-bubble') as NodeListOf<HTMLElement>;
    dynamicBubbles.forEach((bubble) => {
      const speedX = 0.5 + Math.random() * 1.5; // рандомная скорость по X
      const speedY = 0.5 + Math.random() * 1.5; // рандомная скорость по Y
      let dirX = Math.random() < 0.5 ? -1 : 1; // случайное направление по X
      let dirY = Math.random() < 0.5 ? -1 : 1; // случайное направление по Y
      let posX = Math.random() * window.innerWidth; // случайное начальное положение по X
      let posY = Math.random() * window.innerHeight; // случайное начальное положение по Y

      const updateBubble = () => {
        posX += speedX * dirX;
        posY += speedY * dirY;

        // Проверка на пределы экрана, чтобы изменить направление
        if (posX <= 0 || posX >= window.innerWidth) dirX *= -1;
        if (posY <= 0 || posY >= window.innerHeight) dirY *= -1;

        bubble.style.transform = `translate(${posX}px, ${posY}px)`;
        requestAnimationFrame(updateBubble);
      };
      updateBubble();
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="royalty-layout">
      {/* Плавающий фон */}
      <div className="gradient-bg">
        <div className="gradients-container">
          <div className="g1"></div>
          <div className="g2"></div>
          <div className="g3"></div>
          <div className="g4"></div>
          <div className="g5"></div>
          <div className="interactive"></div>
          <div className="dynamic-bubble pink"></div>
          <div className="dynamic-bubble purple"></div>
        </div>
      </div>
      
      <TopNav params={{ id: userContext?.user?.id as string }} />
      <AuthObserver />
      
      <div className="flex mx-auto w-full pt-5 px-4 md:px-6 lg:px-8">
        {/* Боковая панель с профилем пользователя */}
        <div className="hidden md:flex w-[300px] px-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full sticky top-20"
          >
            {userContext?.user && currentProfile && (
              <UserProfileSidebar profile={currentProfile} />
            )}
          </motion.div>
        </div>
        
        <PlayerProvider>
          <div className="flex justify-center w-full px-0 md:px-5">
            {children}
          </div>
        </PlayerProvider>
      </div>

      <style jsx global>{`
        /* Thoroughly optimize the layout by eliminating all unnecessary spacing */
        
        /* Полностью скрываем правую боковую панель */
        .flex.mx-auto.w-full.px-0 > .hidden.md\\:flex.w-\\[300px\\] {
          display: none !important;
          width: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Give full width to the main content container */
        .flex.mx-auto.w-full > .flex.justify-center.w-full {
          padding: 0 !important;
          max-width: 100% !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        
        /* Make content area use more screen space */
        .flex.mx-auto.w-full > .flex.justify-center.w-full > div {
          max-width: 100% !important;
        }
        
        /* Mobile header style with subtle border */
        .mobile-header {
          border: 1px solid rgba(63, 45, 99, 0.3);
          transition: all 0.3s ease;
        }
        
        .mobile-header:hover {
          box-shadow: 0 0 15px rgba(77, 99, 181, 0.3);
          border-color: rgba(77, 99, 181, 0.5);
        }
        
        /* Full width layout */
        .royalty-layout {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: transparent;
          position: relative;
          z-index: 0;
        }
        
        /* Плавающий фон */
        .gradient-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: -1;
        }
        
        .gradients-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .interactive {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          opacity: 0.2;
          filter: blur(50px);
          top: 0;
          left: 0;
          background-color: rgba(32, 221, 187, 0.4);
          mix-blend-mode: screen;
        }
        
        .dynamic-bubble {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(50px);
          opacity: 0.3;
        }
        
        .dynamic-bubble.pink {
          background-color: rgba(255, 105, 180, 0.4);
        }
        
        .dynamic-bubble.purple {
          background-color: rgba(46, 36, 105, 0.4);
        }
        
        /* Убираем размытие при наведении */
        .mobile-header:hover {
          backdrop-filter: none !important;
        }
        
        /* Убираем эффект blur при наведении на компоненты */
        .glass-profile-card:hover,
        .glass-card:hover,
        .glass-effect:hover {
          backdrop-filter: none !important;
        }
        
        /* Добавляем прозрачность карточкам */
        .glass-profile-card,
        .glass-card,
        .glass-effect {
          background-color: rgba(36, 24, 61, 0.4) !important;
        }
        
        /* Стили для карточек в дашборде роялти - более нейтральные */
        [class*="royalty-dashboard"] [class*="card"],
        [class*="royalty-card"],
        [class*="dashboard-card"],
        [class*="stat-card"],
        [class*="transaction-card"] {
          background-color: rgba(26, 35, 56, 0.5) !important;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.3s ease;
        }
        
        [class*="royalty-dashboard"] [class*="card"]:hover,
        [class*="royalty-card"]:hover,
        [class*="dashboard-card"]:hover,
        [class*="stat-card"]:hover,
        [class*="transaction-card"]:hover {
          background-color: rgba(36, 24, 61, 0.6) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        /* Стили для всех карточек на roylalty странице */
        .gradient-border,
        .gradient-card,
        [class*="gradient-"] {
          border: 1px solid rgba(255, 255, 255, 0.03) !important;
        }
        
        .gradient-border:hover,
        .gradient-card:hover,
        [class*="gradient-"]:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        
        /* Специальные стили для карточки верификации */
        [class*="verification-card"] {
          background-color: rgba(36, 24, 61, 0.4) !important;
          backdrop-filter: blur(5px);
        }
        
        [class*="verification-card"]:hover {
          background-color: rgba(36, 24, 61, 0.5) !important;
        }
        
        /* Мобильные отступы */
        @media (max-width: 768px) {
          .w-full.max-w-\\[1400px\\].mx-auto.pb-10.pt-20 {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          
          .grid.grid-cols-1.lg\\:grid-cols-8.gap-4.lg\\:gap-6 {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RoyaltyLayout; 