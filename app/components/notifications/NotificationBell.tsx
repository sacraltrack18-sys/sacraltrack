"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNotifications from '@/app/hooks/useNotifications';
import { useUser } from '@/app/context/user';
import NotificationCenter from './NotificationCenter';
import { BellIcon } from '@heroicons/react/24/outline';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { getUserNotifications } = useNotifications();
  const userContext = useUser();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (userContext?.user?.id) {
        const notifications = await getUserNotifications(userContext.user.id);
        const newUnreadCount = notifications.filter(n => !n.isRead).length;
        if (newUnreadCount > unreadCount) {
          setHasNewNotification(true);
          // Reset the new notification state after 5 seconds
          setTimeout(() => setHasNewNotification(false), 5000);
        }
        setUnreadCount(newUnreadCount);
      }
    };

    fetchUnreadCount();
    
    // Update counter every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userContext?.user?.id]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#818BAC] hover:text-white transition-colors"
      >
        <motion.div
          animate={hasNewNotification ? {
            scale: [1, 1.2, 1],
            rotate: [0, 15, -15, 0]
          } : {}}
          transition={{
            duration: 0.5,
            repeat: 2
          }}
        >
          <BellIcon className="w-[24px] h-[24px] text-amber-400" />
        </motion.div>
        
        <AnimatePresence>
          {unreadCount > 0 && (
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
              className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-[#20DDBB] rounded-full flex items-center justify-center px-1"
            >
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-black text-xs font-bold"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ripple effect for new notifications */}
        <AnimatePresence>
          {hasNewNotification && (
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
        {isOpen && (
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