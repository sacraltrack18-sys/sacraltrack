"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  MicrophoneIcon,
  FaceSmileIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useUser } from '@/app/context/user';
import Image from 'next/image';

interface MessagesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserId: string | null;
}

// Моки данных для примера
const MOCK_USERS = [
  { id: 'user1', name: 'Alex Smith', avatar: '/images/avatars/avatar1.svg' },
  { id: 'user2', name: 'Sophie Chen', avatar: '/images/avatars/avatar2.svg' },
  { id: 'user3', name: 'Michael Johnson', avatar: '/images/avatars/avatar3.svg' },
  { id: 'user4', name: 'Emma Wilson', avatar: '/images/avatars/avatar4.svg' },
  { id: 'user5', name: 'David Kim', avatar: '/images/avatars/avatar5.svg' },
];

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  isRead: boolean;
}

// Моки сообщений
const generateMockMessages = (userId: string): Message[] => {
  const currentUserId = 'currentUser';
  const otherUserId = userId;
  
  const baseDate = new Date();
  
  return [
    {
      id: '1',
      text: 'Hey there! How are you doing?',
      senderId: otherUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      isRead: true
    },
    {
      id: '2',
      text: 'I really liked your latest track!',
      senderId: otherUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5), // 5 minutes later
      isRead: true
    },
    {
      id: '3',
      text: 'Thanks! I appreciate that. Been working on it for a while.',
      senderId: currentUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
      isRead: true
    },
    {
      id: '4',
      text: 'Would you be interested in a collaboration sometime?',
      senderId: currentUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 10), // 10 minutes later
      isRead: true
    },
    {
      id: '5',
      text: 'Absolutely! I\'d love to work together on something.',
      senderId: otherUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 60 * 3), // 3 hours ago
      isRead: true
    },
    {
      id: '6',
      text: 'Great! Let me send you some ideas I\'ve been working on.',
      senderId: currentUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 30), // 30 minutes ago
      isRead: true
    },
    {
      id: '7',
      text: 'Sounds good! Looking forward to hearing them.',
      senderId: otherUserId,
      timestamp: new Date(baseDate.getTime() - 1000 * 60 * 15), // 15 minutes ago
      isRead: true
    }
  ];
};

const MessagesPopup: React.FC<MessagesPopupProps> = ({ isOpen, onClose, selectedUserId }) => {
  const { user } = useUser() || { user: null };
  const [activeUser, setActiveUser] = useState<string | null>(selectedUserId);
  const [conversations, setConversations] = useState(MOCK_USERS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Устанавливаем активного пользователя при изменении выбранного
  useEffect(() => {
    if (selectedUserId) {
      setActiveUser(selectedUserId);
    }
  }, [selectedUserId]);

  // Загружаем сообщения при смене активного пользователя
  useEffect(() => {
    if (activeUser) {
      // В реальном приложении здесь был бы API запрос
      setMessages(generateMockMessages(activeUser));
    }
  }, [activeUser]);

  // Прокручиваем к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Фокус на поле ввода сообщения при открытии чата
  useEffect(() => {
    if (isOpen && activeUser) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, activeUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeUser) return;
    
    // Создаем новое сообщение
    const newMsg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      senderId: 'currentUser', // В реальном приложении здесь был бы ID текущего пользователя
      timestamp: new Date(),
      isRead: false
    };
    
    // Добавляем сообщение в список
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
  };

  // Фильтруем пользователей по поисковому запросу
  const filteredUsers = conversations.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Находим информацию о активном пользователе
  const activeUserInfo = conversations.find(u => u.id === activeUser);

  // Если модальное окно закрыто, не рендерим содержимое
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-5xl h-[80vh] bg-gradient-to-br from-[#1A1E2E] to-[#151928] rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Заголовок попапа */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-[#151928]/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-10">
              <h2 className="text-white text-lg font-semibold">Messages</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="flex h-full pt-16">
              {/* Боковая панель со списком чатов */}
              <div className="w-72 h-full border-r border-white/10 flex flex-col">
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-white/50">
                      No conversations found
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => setActiveUser(user.id)}
                          className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                            activeUser === user.id
                              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-white/10'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="relative flex-shrink-0 mr-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium overflow-hidden">
                              {user.avatar ? (
                                <Image 
                                  src={user.avatar} 
                                  alt={user.name}
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                />
                              ) : (
                                user.name.charAt(0)
                              )}
                            </div>
                            
                            {/* Online indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1E2E]" />
                          </div>
                          
                          <div className="text-left">
                            <h4 className="text-white text-sm font-medium">{user.name}</h4>
                            <p className="text-white/60 text-xs">Active now</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Основная область чата */}
              <div className="flex-1 flex flex-col h-full">
                {activeUser ? (
                  <>
                    {/* Заголовок чата */}
                    <div className="p-4 border-b border-white/10 flex items-center">
                      <div className="relative mr-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium overflow-hidden">
                          {activeUserInfo?.avatar ? (
                            <Image 
                              src={activeUserInfo.avatar} 
                              alt={activeUserInfo.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            activeUserInfo?.name.charAt(0) || '?'
                          )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1E2E]" />
                      </div>
                      
                      <div>
                        <h3 className="text-white font-medium">{activeUserInfo?.name}</h3>
                        <p className="text-white/60 text-xs">Online • Typing...</p>
                      </div>
                    </div>
                    
                    {/* Область сообщений */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.senderId === 'currentUser' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${
                              message.senderId === 'currentUser' 
                                ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-br-none' 
                                : 'bg-white/10 text-white rounded-bl-none'
                            }`}
                          >
                            <p>{message.text}</p>
                            <p className={`text-xs mt-1 ${message.senderId === 'currentUser' ? 'text-white/70' : 'text-white/50'}`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {message.isRead && message.senderId === 'currentUser' && (
                                <span className="ml-2">✓</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Форма отправки сообщения */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                      <div className="flex items-center">
                        <div className="flex space-x-2 mr-2">
                          <button 
                            type="button"
                            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                          >
                            <PaperClipIcon className="w-5 h-5" />
                          </button>
                          <button 
                            type="button"
                            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                          >
                            <PhotoIcon className="w-5 h-5" />
                          </button>
                          <button 
                            type="button"
                            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                          >
                            <MicrophoneIcon className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <input
                          type="text"
                          ref={messageInputRef}
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        
                        <button 
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="w-10 h-10 ml-2 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-white/5">
                      <ChatBubbleLeftRightIcon className="w-10 h-10 text-white/30" />
                    </div>
                    <h3 className="text-xl text-white font-semibold mb-2">Your Messages</h3>
                    <p className="text-white/60 text-center max-w-md">
                      Select a chat to start messaging or create a new conversation with your music community
                    </p>
                    <button className="mt-6 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg">
                      Start New Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MessagesPopup; 