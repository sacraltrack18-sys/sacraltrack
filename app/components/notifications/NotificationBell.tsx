"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useUser } from '@/app/context/user';
import NotificationCenter from './NotificationCenter';
import { BellIcon } from '@heroicons/react/24/outline';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { getUserNotifications, unreadCount } = useNotifications();
  const userContext = useUser();
  const isLoggedIn = !!userContext?.user;

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (userContext?.user?.id) {
        // Просто вызываем функцию для обновления состояния в хуке
        await getUserNotifications(userContext.user.id);
      }
    };

    fetchUnreadCount();
    
    // Update counter every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userContext?.user?.id, getUserNotifications]);

  // Эффект для отслеживания изменений в количестве непрочитанных уведомлений
  useEffect(() => {
    // Если есть непрочитанные уведомления, устанавливаем флаг новых уведомлений
    if (unreadCount > 0) {
      setHasNewNotification(true);
      // Reset the new notification state after 5 seconds
      setTimeout(() => setHasNewNotification(false), 5000);
    }
  }, [unreadCount]);

  const handleBellClick = () => {
    if (!isLoggedIn) return; // Do nothing if not logged in
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className={`relative p-1 md:p-2 ${isLoggedIn ? 'text-[#818BAC] hover:text-white' : 'text-gray-400 cursor-default'} transition-colors`}
      >
        <motion.div
          animate={isLoggedIn && hasNewNotification ? {
            scale: [1, 1.2, 1],
            rotate: [0, 15, -15, 0]
          } : {}}
          transition={{
            duration: 0.5,
            repeat: 2
          }}
        >
          <BellIcon className={`w-[20px] h-[20px] md:w-[24px] md:h-[24px] ${isLoggedIn ? 'text-amber-400' : 'text-gray-500'}`} />
        </motion.div>
        
        <AnimatePresence>
          {isLoggedIn && unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                boxShadow: hasNewNotification ? [
                  "0 0 0 0 rgba(32, 221, 187, 0.4)",
                  "0 0 0 10px rgba(32, 221, 187, 0)",
                ] : "none"
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                boxShadow: {
                  duration: 1.5,
                  repeat: Infinity
                }
              }}
              className="absolute -top-1 -right-1 min-w-[18px] md:min-w-[20px] h-4 md:h-5 bg-[#20DDBB] rounded-full flex items-center justify-center px-1"
            >
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-black text-[10px] md:text-xs font-bold"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ripple effect for new notifications */}
        <AnimatePresence>
          {isLoggedIn && hasNewNotification && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-[#20DDBB]"
              style={{ zIndex: -1 }}
            />
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isLoggedIn && isOpen && (
          <NotificationCenter
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell; 