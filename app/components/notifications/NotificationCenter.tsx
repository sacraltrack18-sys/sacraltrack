"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BsBell, BsCheckCircle, BsCashStack, BsMic, BsPersonPlus, BsFileText, BsUpload, BsCart, BsGift } from 'react-icons/bs';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useUser } from '@/app/context/user';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
  const [filter, setFilter] = useState<'all' | 'sale' | 'royalty' | 'withdrawal' | 'release' | 'purchase' | 'terms'>('all');
  const { getUserNotifications, markAsRead, notifications, unreadCount } = useNotifications();
  const userContext = useUser();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userContext?.user?.id && isOpen) {
        // Просто обновляем состояние в хуке useNotifications
        await getUserNotifications(userContext.user.id);
      }
    };

    fetchNotifications();
  }, [isOpen, userContext?.user?.id, getUserNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <BsMic className="text-blue-400" />;
      case 'royalty':
        return <BsCashStack className="text-green-400" />;
      case 'withdrawal':
        return <BsCheckCircle className="text-purple-400" />;
      case 'welcome':
        return <BsPersonPlus className="text-yellow-400" />;
      case 'release':
        return <BsUpload className="text-pink-400" />;
      case 'purchase':
        return <BsCart className="text-indigo-400" />;
      case 'terms':
        return <BsFileText className="text-orange-400" />;
      case 'gift':
        return <BsGift className="text-red-400" />;
      default:
        return <BsBell className="text-gray-400" />;
    }
  };

  const filteredNotifications = notifications.filter(
    n => filter === 'all' || n.type === filter
  );

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 right-4 w-96 bg-[#272B43] rounded-xl shadow-xl border border-[#3f2d63] z-50"
    >
      <div className="p-4 border-b border-[#3f2d63]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Notifications</h2>
          <button onClick={onClose} className="text-[#818BAC] hover:text-white">
            ✕
          </button>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'sale', label: 'Sales' },
            { id: 'purchase', label: 'Purchases' },
            { id: 'royalty', label: 'Royalties' },
            { id: 'release', label: 'Releases' },
            { id: 'withdrawal', label: 'Withdrawals' },
            { id: 'welcome', label: 'System' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilter(type.id as any)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === type.id
                  ? 'bg-[#20DDBB] text-black'
                  : 'bg-[#1A2338] text-[#818BAC] hover:text-white'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <div className="p-4 text-center text-[#818BAC]">
              No notifications
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-4 border-b border-[#3f2d63] hover:bg-[#1A2338] transition-colors cursor-pointer ${
                  !notification.isRead ? 'bg-[#1A2338]/50' : ''
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-[#818BAC] text-sm mb-2">
                      {notification.message}
                    </p>
                    {notification.track_id && (
                      <Link
                        href={`/track/${notification.track_id}`}
                        className="text-[#20DDBB] text-sm hover:underline"
                      >
                        View Track
                      </Link>
                    )}
                    <p className="text-[#818BAC] text-xs mt-2">
                      {notification.createdAt ? 
                        formatDistance(new Date(notification.createdAt), new Date(), {
                          addSuffix: true
                        }) 
                        : 'Just now'}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#20DDBB]" />
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NotificationCenter; 