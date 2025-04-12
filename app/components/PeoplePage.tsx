"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { useUser } from '@/app/context/user';
import { checkAppwriteConfig } from '@/libs/AppWriteClient';
import Image from 'next/image';
import Link from 'next/link';
import TopRankingUsers from '@/app/components/profile/TopRankingUsers';
import { 
  StarIcon, 
  UserPlusIcon, 
  UserMinusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon, 
  ArrowDownIcon,
  XMarkIcon,
  ChevronDownIcon,
  UsersIcon,
  HeartIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { database, Query } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useRouter, usePathname } from 'next/navigation';
import { FaTrophy } from 'react-icons/fa';

interface UserCardProps {
    user: {
        $id: string;
        user_id: string;
        name: string;
        username?: string;
        image: string;
        bio: string;
        stats: {
            totalLikes: number;
            totalFollowers: number;
            averageRating: number;
            totalRatings: number;
        };
    };
    isFriend: boolean;
    onAddFriend: (userId: string) => void;
    onRemoveFriend: (userId: string) => void;
    onRateUser: (userId: string, rating: number) => void;
}

// Компонент скелетона для карточек пользователей
const UserCardSkeleton = () => {
  // Генерация разной высоты и задержки для аудио-волн
  const audioWaves = Array.from({ length: 12 }).map(() => ({
    height: Math.max(5, Math.floor(Math.random() * 20)),
    delay: Math.random() * 0.8
  }));
  
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-2xl overflow-hidden shadow-xl h-[380px] relative"
  >
    {/* Градиентный фон с музыкальной тематикой */}
    <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900 animate-pulse">
      {/* Декоративные наушники */}
      <div className="absolute top-3 right-3 opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-10 h-10 text-cyan-400">
          <path fill="currentColor" d="M12,1A9,9 0 0,1 21,10V17A3,3 0 0,1 18,20H15V12H19V10A7,7 0 0,0 12,3A7,7 0 0,0 5,10V12H9V20H6A3,3 0 0,1 3,17V10A9,9 0 0,1 12,1Z" />
        </svg>
      </div>
      
      {/* Музыкальные круги */}
      <div className="absolute top-[40%] left-[15%] w-16 h-16 rounded-full border-2 border-purple-400/30 opacity-20"></div>
      <div className="absolute top-[20%] right-[20%] w-20 h-20 rounded-full border-2 border-blue-400/30 opacity-20"></div>
      <div className="absolute bottom-[50%] left-[30%] w-28 h-28 rounded-full border-2 border-cyan-400/20 opacity-10"></div>
      
      {/* Музыкальные ноты */}
      <div className="absolute top-[20%] left-[25%] text-white/20 text-2xl">♪</div>
      <div className="absolute top-[30%] right-[25%] text-white/20 text-2xl">♫</div>
      <div className="absolute top-[50%] right-[15%] text-white/10 text-3xl">♬</div>
      
      {/* Анимированные волны (имитация звуковых волн) */}
      <div className="absolute top-[40%] left-0 right-0 flex justify-center space-x-1">
        {audioWaves.map((wave, i) => (
          <div 
            key={i} 
            className="w-1 bg-gradient-to-t from-cyan-400/40 to-purple-500/40 rounded-full audio-wave-bar" 
            style={{ 
              height: `${wave.height}px`,
              animationDelay: `${wave.delay}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Центральный эквалайзер */}
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-end justify-center space-x-1 h-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-gradient-to-t from-purple-500/50 to-cyan-400/50 rounded-full audio-eq-bar"
              style={{
                height: `${8 + Math.sin(i * 0.8) * 5}px`,
                animationDelay: `${i * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      </div>
      
      {/* Музыкальная иконка */}
      <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 opacity-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    </div>
    
    {/* Стильная стеклянная область внизу */}
    <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-black/30 border-t border-white/10 p-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40">
      <div className="flex justify-between items-center">
        <div className="h-6 w-32 bg-white/10 rounded-lg animate-pulse mb-2 bg-gradient-to-r from-purple-400/20 to-blue-400/20"></div>
        <div className="flex items-center space-x-1">
          <div className="text-cyan-400/40 text-xl">🎧</div>
          <div className="h-6 w-10 bg-white/10 rounded-full animate-pulse bg-gradient-to-r from-pink-400/20 to-purple-400/20"></div>
        </div>
      </div>
      
      <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse mb-4 bg-gradient-to-r from-indigo-400/20 to-purple-400/20"></div>
      
      {/* Стильная анимированная статистика */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div className="h-3 w-10 bg-white/10 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-pink-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <div className="h-3 w-10 bg-white/10 rounded-lg animate-pulse"></div>
        </div>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-yellow-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <div className="h-3 w-10 bg-white/10 rounded-lg animate-pulse"></div>
        </div>
      </div>
      
      {/* Стилизованное био */}
      <div className="mt-3 h-10">
        <div className="h-3 w-full bg-white/10 rounded-lg animate-pulse mb-2 bg-gradient-to-r from-violet-400/20 to-indigo-400/20"></div>
        <div className="h-3 w-4/5 bg-white/10 rounded-lg animate-pulse bg-gradient-to-r from-indigo-400/20 to-blue-400/20"></div>
      </div>
    </div>
    
    {/* Стильные музыкальные кнопки */}
    <div className="absolute bottom-4 right-4 flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/30" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
    </div>
    
    {/* Внедрение CSS для анимации */}
    <style jsx>{`
      @keyframes audioWave {
        0% {
            height: 5px;
            opacity: 0.4;
        }
        50% {
            height: 16px;
            opacity: 0.8;
        }
        100% {
            height: 5px;
            opacity: 0.4;
        }
      }
      
      @keyframes audioEq {
        0% {
            height: 5px;
            opacity: 0.5;
        }
        50% {
            height: 20px;
            opacity: 0.9;
        }
        100% {
            height: 5px;
            opacity: 0.5;
        }
      }
      
      .audio-wave-bar {
        animation: audioWave 1.5s ease-in-out infinite;
      }
      
      .audio-eq-bar {
        animation: audioEq 1.2s ease-in-out infinite;
      }
    `}</style>
  </motion.div>
  );
};

const UserCard: React.FC<UserCardProps> = ({ user, isFriend, onAddFriend, onRemoveFriend, onRateUser }) => {
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const router = useRouter();
    
    // Add fallback for username
    const displayUsername = user.username || user.name;
    
    const handleRateSubmit = () => {
        onRateUser(user.user_id, rating);
        setShowRatingModal(false);
        toast.success('Rating submitted successfully!');
    };
    
    // Улучшенная функция для получения цвета на основе рейтинга
    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'from-yellow-400 to-yellow-600';
        if (rating >= 3.5) return 'from-green-400 to-green-600';
        if (rating >= 2.5) return 'from-blue-400 to-blue-600';
        if (rating >= 1.5) return 'from-orange-400 to-orange-600';
        return 'from-red-400 to-red-600';
    };
    
    return (
        <motion.div
            className="rounded-2xl overflow-hidden shadow-xl h-[380px] relative group"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            {/* Фото на весь размер карточки с затемнением */}
            <div className="absolute inset-0 w-full h-full">
                <Image
                    src={imageError ? '/images/placeholders/user-placeholder.svg' : (user.image || '/images/placeholders/user-placeholder.svg')}
                    alt={user.name}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60" />
            </div>
            
            {/* Стильный стеклянный эффект для контентной части */}
            <div 
                className="absolute bottom-0 left-0 right-0 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/profile/${user.user_id}`);
                }}
            >
                <div className="backdrop-blur-md bg-black/30 border-t border-white/10 p-4 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-colors">
                            {user.name}
                        </h3>
                        
                        {/* Рейтинг */}
                        <div className="flex items-center">
                            <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRatingColor(user.stats.averageRating)} text-white`}>
                                <StarIcon className="w-3 h-3 mr-1" />
                                {user.stats.averageRating.toFixed(1)}
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-purple-400 font-medium">@{displayUsername}</p>
                    
                    {/* Компактная статистика */}
                    <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
                        <div className="flex items-center">
                            <UsersIcon className="w-4 h-4 mr-1 text-purple-400" />
                            {user.stats.totalFollowers}
                        </div>
                        <div className="flex items-center">
                            <HeartIcon className="w-4 h-4 mr-1 text-pink-400" />
                            {user.stats.totalLikes}
                        </div>
                        <div className="flex items-center">
                            <StarIcon className="w-4 h-4 mr-1 text-yellow-400" />
                            {user.stats.totalRatings}
                        </div>
                    </div>
                    
                    {/* Био с ограничением по высоте */}
                    <div className="mt-2 text-white/90 text-sm line-clamp-2 h-10 overflow-hidden">
                        {user.bio || "No bio available."}
                    </div>
                </div>
            </div>

            {/* Прозрачные кнопки действий внизу */}
            <div className="absolute bottom-4 right-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowRatingModal(true);
                    }}
                    className="backdrop-blur-lg bg-white/10 hover:bg-white/20 border border-white/20 rounded-full p-2.5 transition-colors duration-200"
                >
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                </motion.button>
                
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        try {
                            isFriend ? onRemoveFriend(user.user_id) : onAddFriend(user.user_id);
                        } catch (error) {
                            console.error('Friend action error:', error);
                        }
                    }}
                    className={`backdrop-blur-lg border border-white/20 rounded-full p-2.5 transition-colors duration-200 ${
                        isFriend 
                            ? 'bg-red-600/40 hover:bg-red-600/60 text-white' 
                            : 'bg-purple-600/40 hover:bg-purple-600/60 text-white'
                    }`}
                >
                    {isFriend ? <UserMinusIcon className="w-5 h-5" /> : <UserPlusIcon className="w-5 h-5" />}
                </motion.button>
            </div>

            {/* Modal для рейтинга (оставляем тот же код) */}
            <AnimatePresence>
                {showRatingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowRatingModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1E2136] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-purple-500/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-bold text-white mb-4">Rate {user.name}</h3>
                            <p className="text-gray-400 mb-6">What do you think about this user?</p>
                            
                            <div className="flex justify-center mb-8">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <motion.button
                                        key={value}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-1"
                                        onMouseEnter={() => setHoverRating(value)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(value)}
                                    >
                                        <StarIcon
                                            className={`w-8 h-8 ${
                                                (hoverRating > 0 ? value <= hoverRating : value <= rating)
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-600'
                                            }`}
                                        />
                                    </motion.button>
                                ))}
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                                    onClick={() => setShowRatingModal(false)}
                                >
                                    Cancel
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleRateSubmit}
                                    disabled={rating === 0}
                                >
                                    Submit Rating
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Filter dropdown component
const FilterDropdown = ({ 
    options, 
    value, 
    onChange, 
    label 
}: { 
    options: {value: string, label: string}[], 
    value: string, 
    onChange: (val: string) => void,
    label: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button 
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2.5 rounded-lg text-sm text-white/90 border border-white/10 transition-all duration-200 shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-purple-300">{label}:</span>
                <span className="font-medium">{options.find(opt => opt.value === value)?.label}</span>
                <ChevronDownIcon className="w-4 h-4 text-purple-300" />
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 backdrop-blur-md bg-black/40 rounded-lg shadow-xl z-10 min-w-[160px] overflow-hidden border border-white/10"
                    >
                        {options.map(option => (
                            <button
                                key={option.value}
                                className={`block w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors ${option.value === value ? 'bg-purple-600/60 text-white' : 'text-white/80'}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Компонент скелетона для карточек топ-пользователей
const TopUserSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white/5 to-purple-500/5 animate-pulse">
      {/* Аватар скелетон */}
      <div className="relative">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 opacity-50 blur-sm"></div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-purple-900/30 to-blue-900/30 border border-white/10 relative"></div>
      </div>
      
      {/* Контентная часть */}
      <div className="flex-1">
          <div className="h-4 w-24 bg-gradient-to-r from-white/10 to-purple-500/10 rounded-md mb-2"></div>
          <div className="h-3 w-16 bg-gradient-to-r from-white/5 to-purple-500/5 rounded-md"></div>
      </div>
      
      {/* Значок ранга */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-white/10"></div>
  </div>
);

// Функция для получения музыкального инструмента
const getMusicInstrument = () => {
    // Возвращаем пустую строку
    return '';
};

// Стильная музыкальная панель рейтинга топ-пользователей
const TopRankingUsersPanel = ({ users }: { users: any[] }) => {
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const router = useRouter();
    
    const handleImageError = (userId: string) => {
        setImageErrors(prev => ({ ...prev, [userId]: true }));
    };
    
    // Функция для получения градиента цвета в зависимости от позиции в рейтинге
    const getRankGradient = (index: number) => {
        if (index === 0) return 'from-yellow-400 to-amber-600';      // 1-е место - золото
        if (index === 1) return 'from-slate-300 to-slate-400';       // 2-е место - серебро
        if (index === 2) return 'from-amber-700 to-amber-800';       // 3-е место - бронза
        return 'from-purple-600 to-indigo-700';                      // Остальные места
    };
    
    // Функция для получения иконки в зависимости от позиции в рейтинге
    const getRankIcon = (index: number) => {
        return (index + 1).toString();      // Номер для всех позиций
    };
    
    // Функция для получения рейтинга в виде звезд
    const getRatingStars = (rating: number) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return (
            <div className="flex items-center">
                {[...Array(fullStars)].map((_, i) => (
                    <svg key={`full-${i}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-yellow-400">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                ))}
                
                {hasHalfStar && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-yellow-400">
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        <path fill="#1A1C2E" d="M12 18.354l4.627 2.826c.996.608 2.231-.29 1.96-1.425l-1.257-5.273 4.117-3.527c.887-.76.415-2.212-.749-2.305l-5.404-.433-2.082-5.007c-.448-1.077-1.976-1.077-2.424 0l-2.082 5.007-5.404.433c-1.164.093-1.636 1.545-.749 2.305l4.117 3.527-1.257 5.273c-.271 1.136.964 2.033 1.96 1.425L12 18.354z" clipRule="evenodd" />
                    </svg>
                )}
                
                {[...Array(emptyStars)].map((_, i) => (
                    <svg key={`empty-${i}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-gray-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                ))}
            </div>
        );
    };
    
    return (
        <div className="space-y-3 relative">
            {/* Удалены декоративные музыкальные волны на фоне */}
            
            {/* Удалены музыкальные ноты на фоне */}
            
            {/* Удалены анимированные звуковые волны внизу */}
            
            {users.length > 0 ? (
                <>
                    {users.map((user, index) => (
                        <motion.div 
                            key={user.id || user.$id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => router.push(`/profile/${user.user_id}`)}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group relative"
                            whileHover={{ 
                                scale: 1.02,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {/* Позиционный индикатор на фоне */}
                            {index < 3 && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-white/5 -z-10"></div>
                            )}
                            
                            {/* Аватар с бордером в зависимости от рейтинга */}
                            <div className="relative">
                                <div className={`absolute -inset-0.5 rounded-full bg-gradient-to-r ${getRankGradient(index)} opacity-50 blur-sm transition-opacity group-hover:opacity-80`}></div>
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-gradient-to-b from-purple-900/50 to-blue-900/50">
                                    <Image 
                                        src={imageErrors[user.user_id] ? '/images/placeholders/user-placeholder.svg' : (user.image || '/images/placeholders/user-placeholder.svg')}
                                        alt={user.name} 
                                        width={48} 
                                        height={48}
                                        className="object-cover"
                                        onError={() => handleImageError(user.user_id)}
                                    />
                                    
                                    {/* Стилизованный оверлей для аватара */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                </div>
                                
                                {/* Музыкальная иконка для пользователей в топ-3 */}
                                {index < 3 && (
                                    <div className="absolute -bottom-1 -left-1 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full w-5 h-5 flex items-center justify-center border border-white/20 text-[8px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-white font-medium truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-colors">
                                        {user.name}
                                    </p>
                                    
                                    {/* Звездный рейтинг */}
                                    {user.stats?.averageRating > 0 && getRatingStars(user.stats.averageRating)}
                                </div>
                                
                                <div className="flex items-center text-xs text-gray-400 mt-0.5">
                                    {/* Имя пользователя */}
                                    <span className="truncate">
                                        {user.username ? `@${user.username}` : `User`}
                                    </span>
                                    
                                    {/* Статистика */}
                                    <span className="mx-1.5 text-gray-600">•</span>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {user.stats?.totalFollowers || 0}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Ранговый значок */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${getRankGradient(index)} text-white shadow-md group-hover:scale-110 transition-transform border border-white/20`}>
                                {getRankIcon(index)}
                            </div>
                        </motion.div>
                    ))}
                </>
            ) : (
                <div className="text-center py-8">
                    <p className="text-white/60">No ranked users yet</p>
                    <p className="text-white/40 text-sm mt-2">Users will appear here once they receive ratings</p>
                    
                    {/* Примеры скелетонов для статического отображения */}
                    <div className="mt-6 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <TopUserSkeleton key={`example-${i}`} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Музыкальные стили для анимации */}
            <style jsx>{`
                @keyframes pulse {
                    0% {
                        transform: scale(0.95);
                        opacity: 0.7;
                    }
                    50% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0.95);
                        opacity: 0.7;
                    }
                }
                
                .animate-slow-pulse {
                    animation: pulse 4s infinite;
                }
            `}</style>
        </div>
    );
};

export default function PeoplePage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
    const [topRankedUsers, setTopRankedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterBy, setFilterBy] = useState('all');
    const [error, setError] = useState<string | null>(null);
    
    const { friends, loadFriends, addFriend, removeFriend, sentRequests, loadSentRequests } = useFriendsStore();
    const user = useUser();
    const router = useRouter();
    const pathname = usePathname();
    
    // Очистка состояния при изменении маршрута
    useEffect(() => {
        // Только логируем отладочную информацию
        const logDebugInfo = () => {
            console.log('Route changed, pathname:', pathname);
        };
        
        logDebugInfo();
        
        // Очистка при размонтировании компонента без блокировки навигации
        return () => {
            console.log('PeoplePage component unmounted');
        };
    }, [pathname]);
    
    // Toggle sort direction
    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };
    
    // Загрузка пользователей
    const loadUsers = async () => {
        try {
            setIsLoading(true);
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.limit(20)]
            );
            
            const loadedProfiles = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name || 'Unknown User',
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: typeof doc.stats?.totalLikes === 'string' ? parseInt(doc.stats.totalLikes, 10) : (doc.stats?.totalLikes || 0),
                    totalFollowers: typeof doc.stats?.totalFollowers === 'string' ? parseInt(doc.stats.totalFollowers, 10) : (doc.stats?.totalFollowers || 0),
                    averageRating: typeof doc.stats?.averageRating === 'string' ? parseFloat(doc.stats.averageRating) : (doc.stats?.averageRating || 0),
                    totalRatings: typeof doc.stats?.totalRatings === 'string' ? parseInt(doc.stats.totalRatings, 10) : (doc.stats?.totalRatings || 0)
                }
            }));
            
            setProfiles(loadedProfiles);
            setFilteredProfiles(loadedProfiles);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Failed to load users. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Обработка поиска
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchQuery.trim()) {
            setFilteredProfiles(profiles);
            return;
        }
        
        const filtered = profiles.filter(profile => 
            profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.username && profile.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (profile.bio && profile.bio.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        setFilteredProfiles(filtered);
    };
    
    // Проверяем, является ли пользователь другом или есть ли отправленный запрос
    const isFriend = (userId: string) => {
        return friends.some(friend => friend.friendId === userId) || 
               sentRequests.some(request => request.friendId === userId);
    };
    
    // Рейтинг пользователя
    const handleRateUser = async (userId: string, rating: number) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to rate users');
            return;
        }
        
        try {
            // Сначала проверяем, не оценивал ли уже пользователь
            const existingRating = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                [
                    Query.equal('userId', userId),
                    Query.equal('raterId', user.user.id)
                ]
            );

            if (existingRating.documents.length > 0) {
                // Обновляем существующий рейтинг
                await database.updateDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                    existingRating.documents[0].$id,
                    {
                        rating: rating.toString(), // Явное преобразование в строку
                        updatedAt: new Date().toISOString()
                    }
                );
                toast.success('Rating updated successfully!');
            } else {
                // Создаем новый рейтинг
                await database.createDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                    ID.unique(),
                    {
                        userId: userId,
                        raterId: user.user.id,
                        rating: rating.toString(), // Явное преобразование в строку
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                );
                toast.success('Rating submitted successfully!');
            }
            
            // Обновляем статистику пользователя
            await updateUserStats(userId);
            
            // Перезагружаем данные
            await loadUsers();
            await loadTopUsers();
        } catch (error) {
            console.error('Error rating user:', error);
            toast.error('Failed to submit rating. Please try again.');
        }
    };
    
    // Функция для обновления статистики пользователя
    const updateUserStats = async (userId: string) => {
        try {
            // Получаем все рейтинги пользователя
            const ratings = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                [Query.equal('userId', userId)]
            );

            // Вычисляем средний рейтинг, учитывая, что рейтинг теперь строкового типа
            const totalRatings = ratings.documents.length;
            const averageRating = totalRatings > 0
                ? ratings.documents.reduce((sum, doc) => sum + parseFloat(doc.rating), 0) / totalRatings
                : 0;

            // Получаем текущую статистику пользователя
            const userStats = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
                [Query.equal('userId', userId)]
            );

            if (userStats.documents.length > 0) {
                // Обновляем существующую статистику
                await database.updateDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
                    userStats.documents[0].$id,
                    {
                        totalRatings: totalRatings.toString(), // Преобразуем число в строку
                        averageRating: averageRating.toString(), // Преобразуем число в строку
                        lastUpdated: new Date().toISOString()
                    }
                );
            } else {
                // Создаем новую статистику
                await database.createDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
                    ID.unique(),
                    {
                        userId,
                        totalRatings: totalRatings.toString(), // Преобразуем число в строку
                        averageRating: averageRating.toString(), // Преобразуем число в строку
                        totalLikes: "0", // Преобразуем в строку
                        totalFollowers: "0", // Преобразуем в строку
                        createdAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    }
                );
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
            throw error;
        }
    };
    
    // Загрузка дополнительных профилей
    const loadMoreProfiles = async () => {
        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [
                    Query.limit(20),
                    Query.offset((nextPage - 1) * 20)
                ]
            );
            
            const newProfiles = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name || 'Unknown User',
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: typeof doc.stats?.totalLikes === 'string' ? parseInt(doc.stats.totalLikes, 10) : (doc.stats?.totalLikes || 0),
                    totalFollowers: typeof doc.stats?.totalFollowers === 'string' ? parseInt(doc.stats.totalFollowers, 10) : (doc.stats?.totalFollowers || 0),
                    averageRating: typeof doc.stats?.averageRating === 'string' ? parseFloat(doc.stats.averageRating) : (doc.stats?.averageRating || 0),
                    totalRatings: typeof doc.stats?.totalRatings === 'string' ? parseInt(doc.stats.totalRatings, 10) : (doc.stats?.totalRatings || 0)
                }
            }));
            
            if (newProfiles.length === 0) {
                setHasMoreProfiles(false);
            } else {
                setPage(nextPage);
                setProfiles(prevProfiles => [...prevProfiles, ...newProfiles]);
                sortAndFilterProfiles([...profiles, ...newProfiles]);
            }
        } catch (error) {
            console.error('Error loading more profiles:', error);
            toast.error('Failed to load more profiles');
        } finally {
            setIsLoadingMore(false);
        }
    };
    
    // Сортировка и фильтрация профилей
    const sortAndFilterProfiles = useMemo(() => {
        return (profilesToFilter = profiles) => {
            let result = [...profilesToFilter];
            
            // Фильтрация
            if (filterBy === 'friends') {
                result = result.filter(profile => isFriend(profile.user_id));
            } else if (filterBy === 'new') {
                // Предполагаем, что в профиле есть поле createdAt
                result = result.sort((a, b) => 
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                );
            }
            
            // Сортировка
            if (sortBy === 'name') {
                result.sort((a, b) => {
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    return sortDirection === 'asc' 
                        ? nameA.localeCompare(nameB) 
                        : nameB.localeCompare(nameA);
                });
            } else if (sortBy === 'rating') {
                result.sort((a, b) => {
                    const ratingA = a.stats.averageRating;
                    const ratingB = b.stats.averageRating;
                    return sortDirection === 'asc' 
                        ? ratingA - ratingB 
                        : ratingB - ratingA;
                });
            } else if (sortBy === 'followers') {
                result.sort((a, b) => {
                    const followersA = a.stats.totalFollowers;
                    const followersB = b.stats.totalFollowers;
                    return sortDirection === 'asc' 
                        ? followersA - followersB 
                        : followersB - followersA;
                });
            }
            
            setFilteredProfiles(result);
        };
    }, [profiles, sortBy, sortDirection, filterBy, isFriend]);
    
    // Обновление отображаемых профилей при изменении фильтров
    useEffect(() => {
        sortAndFilterProfiles();
    }, [sortAndFilterProfiles]);
    
    // Загрузка рейтинга топ-пользователей с использованием реальных данных
    const loadTopUsers = async () => {
        try {
            // Здесь мы делаем запрос на получение топ-пользователей с сортировкой по рейтингу
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [
                    Query.orderDesc('stats.averageRating'),
                    Query.limit(10)
                ]
            );
            
            // Преобразуем данные для отображения
            const topUsers = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name,
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: typeof doc.stats?.totalLikes === 'string' ? parseInt(doc.stats.totalLikes, 10) : (doc.stats?.totalLikes || 0),
                    totalFollowers: typeof doc.stats?.totalFollowers === 'string' ? parseInt(doc.stats.totalFollowers, 10) : (doc.stats?.totalFollowers || 0),
                    averageRating: typeof doc.stats?.averageRating === 'string' ? parseFloat(doc.stats.averageRating) : (doc.stats?.averageRating || 0),
                    totalRatings: typeof doc.stats?.totalRatings === 'string' ? parseInt(doc.stats.totalRatings, 10) : (doc.stats?.totalRatings || 0)
                }
            }));
            
            setTopRankedUsers(topUsers);
        } catch (error) {
            console.error('Error loading top users:', error);
        }
    };
    
    // Обработка добавления друга с корректной обработкой запросов
    const handleAddFriend = async (userId: string) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to add friends');
            return;
        }
        
        try {
            console.log('Calling addFriend with friendId:', userId, 'currentUserId:', user.user.id);
            await addFriend(userId, user.user.id);
            
            // Обновляем состояние, чтобы отобразить изменения в UI
            await loadFriends();
        } catch (error) {
            console.error('Error adding friend:', error);
            toast.error('Failed to send friend request');
        }
    };
    
    // Обработка удаления друга
    const handleRemoveFriend = async (userId: string) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to remove friends');
            return;
        }
        
        try {
            await removeFriend(userId);
            toast.success('Friend removed!');
            
            // Обновляем состояние, чтобы отобразить изменения в UI
            await loadFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };
    
    // Функция для инициализации данных
    useEffect(() => {
        const initializeData = async () => {
            setIsLoading(true);
            try {
                // Проверяем конфигурацию Appwrite
                const configResult = checkAppwriteConfig();
                if (!configResult.isValid) {
                    console.error("Invalid Appwrite configuration:", configResult.missingVars);
                    setError("Configuration error. Please contact support.");
                    return;
                }
                
                // Загружаем профили пользователей, друзей и топ пользователей
                await Promise.all([
                    loadUsers(),
                    loadFriends(),       // Загружаем друзей
                    loadSentRequests(),  // Загружаем отправленные запросы
                    loadTopUsers()
                ]);
                
                setIsLoading(false);
            } catch (error) {
                console.error("Error initializing data:", error);
                setError("Failed to load data. Please try again later.");
                setIsLoading(false);
            }
        };
        
        initializeData();
    }, [sortBy, filterBy]); // Убираем зависимости функций, оставляем только необходимые переменные
    
    // Handle click on search result - с обработкой ошибок
    const handleSearchResultClick = useCallback((result: any) => {
        try {
            if (result.type === 'profile') {
                router.push(`/profile/${result.user_id}`);
            } else {
                router.push(`/post/${result.user_id}/${result.id}`);
            }
            setSearchQuery("");
            setFilteredProfiles([]);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [router]);
    
    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl bg-gradient-to-b from-[#1A1C2E]/80 to-[#252840]/80 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6 relative">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300 flex items-center">
                        Music People
                    </h1>
                    <p className="text-[#A6B1D0] flex items-center">
                        Connect with musical people all over the planet
                        <span className="ml-2 text-lg">🎵</span>
                    </p>
                </div>
                
                {/* Убраны декоративные музыкальные элементы */}
                
                {/* Убраны музыкальные звуковые волны возле заголовка */}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    {/* Фильтры с глассэффектом и поисковой строкой */}
                    <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl mb-6 border border-white/10 shadow-md">
                        <div className="flex items-center gap-4">
                            {/* Поисковая строка */}
                            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search people..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 backdrop-blur-md text-white border border-purple-500/20 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent shadow-md"
                                    />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    type="submit"
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium py-2.5 px-6 rounded-xl hover:shadow-lg hover:shadow-purple-600/20 transition-all duration-300"
                                >
                                    Search
                                </motion.button>
                            </form>
                            
                            <div className="flex items-center gap-2">
                                <FilterDropdown 
                                    options={[
                                        { value: 'name', label: 'Name' },
                                        { value: 'rating', label: 'Rating' },
                                        { value: 'followers', label: 'Followers' }
                                    ]}
                                    value={sortBy}
                                    onChange={setSortBy}
                                    label="Sort by"
                                />
                                
                                <FilterDropdown 
                                    options={[
                                        { value: 'all', label: 'All' },
                                        { value: 'friends', label: 'Friends' },
                                        { value: 'new', label: 'New users' }
                                    ]}
                                    value={filterBy}
                                    onChange={setFilterBy}
                                    label="Show"
                                />
                                
                                <button
                                    onClick={toggleSortDirection}
                                    className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-lg transition-colors border border-white/10"
                                >
                                    {sortDirection === 'asc' ? (
                                        <ArrowUpIcon className="w-5 h-5" />
                                    ) : (
                                        <ArrowDownIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Сетка пользователей */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <UserCardSkeleton key={index} />
                            ))
                        ) : filteredProfiles.length > 0 ? (
                            filteredProfiles.map(profile => (
                                <UserCard
                                    key={profile.$id}
                                    user={profile}
                                    isFriend={isFriend(profile.user_id)}
                                    onAddFriend={handleAddFriend}
                                    onRemoveFriend={handleRemoveFriend}
                                    onRateUser={handleRateUser}
                                />
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                                <div className="text-gray-400 mb-4 text-6xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-white text-xl mb-4">No users found</p>
                                <p className="text-gray-400 max-w-md">Try changing your search or filters to find people to connect with.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Кнопка "Загрузить еще" с глассэффектом */}
                    {hasMoreProfiles && !isLoading && filteredProfiles.length > 0 && (
                        <div className="mt-8 flex justify-center">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={loadMoreProfiles}
                                disabled={isLoadingMore}
                                className="py-2.5 px-6 rounded-xl backdrop-blur-sm bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all duration-300 shadow-md flex items-center space-x-2"
                            >
                                {isLoadingMore ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Load More</span>
                                        <ArrowDownIcon className="h-4 w-4" />
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
                </div>
                
                {/* Боковая панель с топ пользователями */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl p-4 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaTrophy className="text-[#20DDBB]" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20DDBB] to-[#5D59FF]">
                                    Top Rated Artists
                                </span>
                            </h2>
                            
                            {/* Убрана ссылка View Full Rankings */}
                        </div>
                        
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white/5 to-purple-500/5 animate-pulse">
                                        {/* Аватар скелетон */}
                                        <div className="relative">
                                            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 opacity-50 blur-sm"></div>
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-purple-900/30 to-blue-900/30 border border-white/10 relative"></div>
                                        </div>
                                        
                                        {/* Контентная часть */}
                                        <div className="flex-1">
                                            <div className="h-4 w-24 bg-gradient-to-r from-white/10 to-purple-500/10 rounded-md mb-2"></div>
                                            <div className="h-3 w-16 bg-gradient-to-r from-white/5 to-purple-500/5 rounded-md"></div>
                                        </div>
                                        
                                        {/* Значок ранга */}
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-white/10"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <TopRankingUsersPanel users={topRankedUsers} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}