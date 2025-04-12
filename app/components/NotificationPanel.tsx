"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoNotificationsOutline } from 'react-icons/io5';
import { BsPersonPlus, BsPersonCheck, BsMusicNote } from 'react-icons/bs';
import { AiOutlineHeart } from 'react-icons/ai';
import { FaCoins } from 'react-icons/fa';
import useNotifications, { Notification } from '@/app/hooks/useNotifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <BsPersonPlus className="text-blue-400" />;
      case 'friend_accepted':
        return <BsPersonCheck className="text-green-400" />;
      case 'new_track':
      case 'release':
        return <BsMusicNote className="text-purple-400" />;
      case 'like':
        return <AiOutlineHeart className="text-red-400" />;
      case 'purchase':
      case 'sale':
      case 'royalty':
      case 'withdrawal':
        return <FaCoins className="text-yellow-400" />;
      default:
        return <IoNotificationsOutline className="text-gray-400" />;
    }
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 top-16 w-80 max-h-[500px] bg-[#1E2136] rounded-xl shadow-xl overflow-hidden z-50"
        >
          <div className="p-4 border-b border-[#2E2469] flex justify-between items-center">
            <h3 className="text-white font-medium">Notifications</h3>
            <button
              onClick={() => markAllAsRead(notifications[0]?.user_id || '')}
              className="text-sm text-[#818BAC] hover:text-white transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#2E2469] scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-[#818BAC]">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-4 border-b border-[#2E2469] cursor-pointer hover:bg-[#2E2469]/20 transition-colors ${
                    notification.isRead ? 'opacity-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#2E2469] rounded-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div>
                      <p className="text-white text-sm">{notification.title || notification.message}</p>
                      <p className="text-[#818BAC] text-xs mt-1">
                        {new Date(notification.createdAt || Date.now()).toLocaleDateString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel; 