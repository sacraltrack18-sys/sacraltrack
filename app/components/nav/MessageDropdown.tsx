"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  BellIcon,
  EnvelopeIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import MessagesPopup from './MessagesPopup';
import { useUser } from '@/app/context/user';
import { useRouter } from 'next/navigation';

// Интерфейс для уведомлений сообщений
interface MessageNotification {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
}

// Моки для демонстрации
const MOCK_NOTIFICATIONS: MessageNotification[] = [
  {
    id: 'msg1',
    userId: 'user1',
    userName: 'Alex Smith',
    avatar: '/images/avatars/avatar1.svg',
    preview: 'Hey, I really liked your latest track!',
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 минут назад
    isRead: false
  },
  {
    id: 'msg2',
    userId: 'user2',
    userName: 'Sophie Chen',
    avatar: '/images/avatars/avatar2.svg',
    preview: 'Would love to collaborate on your next project',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    isRead: false
  },
  {
    id: 'msg3',
    userId: 'user3',
    userName: 'Michael Johnson',
    avatar: '/images/avatars/avatar3.svg',
    preview: 'Thanks for the feedback on my new EP!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 день назад
    isRead: true
  }
];

const MessageDropdown: React.FC<{isInProfileMenu?: boolean}> = ({ isInProfileMenu = false }) => {
  const { user } = useUser() || { user: null };
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<MessageNotification[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Обновляем счетчик непрочитанных сообщений
  useEffect(() => {
    const count = notifications.filter(notification => !notification.isRead).length;
    setUnreadCount(count);
  }, [notifications]);
  
  // Добавляем обработчик клика за пределами выпадающего меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Функция переключения выпадающего меню
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Функция обработки клика по сообщению
  const handleMessageClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowPopup(true);
    setIsOpen(false);
    
    // Отмечаем сообщение как прочитанное
    setNotifications(prev => 
      prev.map(notification => 
        notification.userId === userId 
          ? { ...notification, isRead: true } 
          : notification
      )
    );
  };
  
  // Закрытие попапа
  const handleClosePopup = () => {
    setShowPopup(false);
  };
  
  // Функция отметки всех сообщений как прочитанных
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };
  
  // Форматируем время для отображения
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString();
  };
  
  // Handle direct navigation to messages page if in profile menu
  const handleViewAllMessages = () => {
    if (isInProfileMenu) {
      router.push('/messages');
    } else {
      setSelectedUserId(null);
      setShowPopup(true);
      setIsOpen(false);
    }
  };
  
  // If component is used inside profile menu, display a simplified version
  if (isInProfileMenu) {
    return (
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="py-2 text-center">
            <p className="text-white/60 text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="max-h-[180px] overflow-y-auto">
            {notifications.map(notification => (
              <button
                key={notification.id}
                className={`w-full px-3 py-2 flex items-start hover:bg-white/5 transition-colors rounded-lg ${
                  !notification.isRead ? 'bg-white/5' : ''
                }`}
                onClick={() => handleMessageClick(notification.userId)}
              >
                <div className="relative flex-shrink-0 mr-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium overflow-hidden">
                    {notification.avatar ? (
                      <img 
                        src={notification.avatar} 
                        alt={notification.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      notification.userName.charAt(0)
                    )}
                  </div>
                  
                  {!notification.isRead && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-[#151928]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-white text-xs font-medium truncate pr-2">
                      {notification.userName}
                    </h4>
                    <span className="text-white/40 text-[10px]">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${notification.isRead ? 'text-white/60' : 'text-white/90'}`}>
                    {notification.preview}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
        
        <button
          onClick={handleViewAllMessages}
          className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          View All Messages
        </button>
      </div>
    );
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Icon with unread indicator - only shown when not in profile menu */}
      <button
        onClick={toggleDropdown}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="Messages"
      >
        {isOpen ? (
          <ChatBubbleLeftRightIconSolid className="w-6 h-6 text-white" />
        ) : (
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-500 text-white text-xs font-medium rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-[#1A1E2E] to-[#151928] rounded-xl shadow-xl z-50 border border-white/10 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-medium">Messages</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto py-2">
              {notifications.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-white/30" />
                  </div>
                  <p className="text-white/60 text-sm">No messages yet</p>
                </div>
              ) : (
                <div>
                  {notifications.map(notification => (
                    <button
                      key={notification.id}
                      className={`w-full px-4 py-3 flex items-start hover:bg-white/5 transition-colors ${
                        !notification.isRead ? 'bg-white/5' : ''
                      }`}
                      onClick={() => handleMessageClick(notification.userId)}
                    >
                      <div className="relative flex-shrink-0 mr-3 mt-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium overflow-hidden">
                          {notification.avatar ? (
                            <img 
                              src={notification.avatar} 
                              alt={notification.userName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            notification.userName.charAt(0)
                          )}
                        </div>
                        
                        {!notification.isRead && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#151928]" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-white text-sm font-medium truncate pr-2">
                            {notification.userName}
                          </h4>
                          <span className="text-white/40 text-xs">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${notification.isRead ? 'text-white/60' : 'text-white/90'}`}>
                          {notification.preview}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={handleViewAllMessages}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                View All Messages
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Message popup component */}
      <MessagesPopup
        isOpen={showPopup}
        onClose={handleClosePopup}
        selectedUserId={selectedUserId}
      />
    </div>
  );
};

export default MessageDropdown; 