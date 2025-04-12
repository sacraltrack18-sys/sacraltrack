import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline, StarIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCrown, FaHeadphones } from 'react-icons/fa';

interface UserProps {
  user_id: string;
  name: string;
  avatar?: string;
  location?: string;
  followers?: number;
  rating?: number;
  rating_count?: number;
  rank?: number;
}

interface UserCardProps {
    user: UserProps;
    isFriend: boolean;
    onAddFriend?: (userId: string) => void;
    onRemoveFriend?: (userId: string) => void;
    onRateUser?: (userId: string, rating: number) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ 
    user, 
    isFriend, 
    onAddFriend, 
    onRemoveFriend,
    onRateUser
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [currentRating, setCurrentRating] = useState<number>(user.rating || 0);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [showRatingPanel, setShowRatingPanel] = useState(false);

    // Форматирование числа подписчиков
    const formatFollowers = (count: number) => {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    };

    // Обработка добавления/удаления друга
    const handleFriendAction = () => {
        if (isFriend && onRemoveFriend) {
            onRemoveFriend(user.user_id);
        } else if (onAddFriend) {
            onAddFriend(user.user_id);
        }
    };

    // Обработка рейтинга
    const handleRating = (rating: number) => {
        setCurrentRating(rating);
        setRatingSubmitted(true);
        if (onRateUser) {
            onRateUser(user.user_id, rating);
        }
        
        // Скрыть панель рейтинга через 2 секунды
        setTimeout(() => {
            setShowRatingPanel(false);
            setRatingSubmitted(false);
        }, 2000);
    };

    // Генерация заднего фона в зависимости от rank пользователя
    const getRankBackground = () => {
        if (user.rank === 1) return 'bg-gradient-to-r from-[#F9D923] to-[#F8A01E]';
        if (user.rank === 2) return 'bg-gradient-to-r from-[#E0E0E0] to-[#B8B8B8]';
        if (user.rank === 3) return 'bg-gradient-to-r from-[#CD7F32] to-[#A05215]';
        return 'bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20';
    };

    // Определяем цвет для имени пользователя на основе его ранга
    const getNameGradient = () => {
        if (user.rank === 1) return 'bg-gradient-to-r from-[#F9D923] to-[#F8A01E] bg-clip-text text-transparent';
        if (user.rank === 2) return 'bg-gradient-to-r from-[#E0E0E0] to-[#B8B8B8] bg-clip-text text-transparent';
        if (user.rank === 3) return 'bg-gradient-to-r from-[#CD7F32] to-[#A05215] bg-clip-text text-transparent';
        return 'text-white hover:bg-gradient-to-r hover:from-[#20DDBB] hover:to-[#5D59FF] hover:bg-clip-text hover:text-transparent';
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5, boxShadow: '0 15px 30px -5px rgba(32, 221, 187, 0.1)' }}
            className="relative p-0.5 rounded-2xl overflow-hidden transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Фоновый градиент карточки */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/20 via-purple-500/10 to-[#5D59FF]/20 rounded-2xl backdrop-blur-sm z-0"></div>
            
            {/* Декоративные элементы */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-[#20DDBB]/10 rounded-full blur-xl"></div>
            <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-[#5D59FF]/10 rounded-full blur-xl"></div>
            
            {/* Содержимое карточки */}
            <div className="relative bg-[#1E2136]/80 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden z-10">
                {/* Рейтинг пользователя в правом верхнем углу */}
                <div className="absolute top-3 right-3 z-20">
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowRatingPanel(true)}
                        className="px-3 py-1 bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 backdrop-blur-md rounded-lg flex items-center border border-white/10 shadow-lg"
                    >
                        <StarIcon className="h-4 w-4 mr-1 text-[#20DDBB]" />
                        <span className="text-white text-sm font-semibold">{user.rating?.toFixed(1) || "0.0"}</span>
                    </motion.div>
                </div>
                
                {/* Ранг пользователя */}
                {user.rank && user.rank <= 3 && (
                    <div className="absolute top-3 left-3 z-20">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-lg ${getRankBackground()}`}>
                            <FaCrown className={`${user.rank === 1 ? 'text-yellow-900' : user.rank === 2 ? 'text-gray-700' : 'text-amber-900'}`} />
                        </div>
                    </div>
                )}
                
                {/* Шапка карточки */}
                <div className={`h-28 bg-gradient-to-r from-[#172339] to-[#0F172A] opacity-80`}></div>
                
                <div className="px-5 pt-0 pb-5 -mt-14">
                    {/* Аватар с наушниками */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] blur-sm opacity-70"></div>
                        <div className="relative w-24 h-24 rounded-xl border-2 border-white/10 overflow-hidden bg-gradient-to-b from-[#20DDBB]/30 to-[#5D59FF]/30">
                            {user.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt={`${user.name} avatar`}
                                    width={96}
                                    height={96}
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="relative">
                                        {/* Музыкальный персонаж с наушниками */}
                                        <div className="w-16 h-16 rounded-full bg-[#20DDBB] flex items-center justify-center">
                                            <div className="w-8 h-4 bg-[#172339] rounded-full absolute top-3"></div> {/* Глаз */}
                                            <div className="w-12 h-3 bg-[#172339] rounded-full absolute bottom-4 transform rotate-[10deg]"></div> {/* Улыбка */}
                                        </div>
                                        {/* Наушники */}
                                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-8">
                                            <div className="absolute top-0 left-0 w-3 h-8 bg-[#5D59FF] rounded-l-full"></div>
                                            <div className="absolute top-0 right-0 w-3 h-8 bg-[#5D59FF] rounded-r-full"></div>
                                            <div className="absolute top-0 left-3 right-3 h-2 bg-[#5D59FF] rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Информация о пользователе */}
                    <div className="mt-4">
                        <Link href={`/profile/${user.user_id}`}>
                            <h3 className={`text-lg font-semibold ${getNameGradient()} transition-colors`}>
                                {user.name}
                            </h3>
                        </Link>
                        {user.location && (
                            <p className="text-[#A6B1D0] text-sm mb-2">
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-[#20DDBB] rounded-full inline-block"></span>
                                    {user.location}
                                </span>
                            </p>
                        )}
                        
                        {/* Рейтинг пользователя */}
                        <div className="flex items-center mb-4 mt-2">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span 
                                        key={star} 
                                        className="cursor-pointer"
                                        onClick={() => setShowRatingPanel(true)}
                                    >
                                        <motion.span 
                                            whileHover={{ scale: 1.2 }} 
                                            whileTap={{ scale: 0.9 }}
                                            className={`inline-block ${star <= currentRating ? 'text-[#20DDBB]' : 'text-gray-600'}`}
                                        >
                                            ★
                                        </motion.span>
                                    </span>
                                ))}
                            </div>
                            <span className="ml-2 text-[#A6B1D0] text-sm">
                                ({user.rating_count || 0})
                            </span>
                        </div>
                        
                        {/* Панель оценки */}
                        <AnimatePresence>
                            {showRatingPanel && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mb-4 p-3 bg-black/30 backdrop-blur-md rounded-xl"
                                >
                                    {!ratingSubmitted ? (
                                        <>
                                            <p className="text-xs text-gray-300 mb-2">Оцените пользователя:</p>
                                            <div className="flex space-x-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <motion.button 
                                                        key={star}
                                                        whileHover={{ scale: 1.2 }} 
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleRating(star)}
                                                        className={`text-xl ${star <= currentRating ? 'text-[#20DDBB]' : 'text-gray-500'}`}
                                                    >
                                                        ★
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center justify-center text-[#20DDBB]"
                                        >
                                            <span>Спасибо за оценку!</span>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Нижняя часть карточки с метриками */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="text-sm">
                                    <span className="text-[#20DDBB] font-medium">
                                        {formatFollowers(user.followers || 0)}
                                    </span>
                                    <span className="text-[#A6B1D0] ml-1">подписчиков</span>
                                </div>
                            </div>
                            
                            {/* Кнопка добавления в друзья - теперь прямоугольная с закругленными углами */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleFriendAction}
                                className={`px-4 py-2 rounded-lg transition-colors duration-300 flex items-center justify-center ${
                                    isFriend 
                                        ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30' 
                                        : 'bg-[#20DDBB]/20 text-[#20DDBB] hover:bg-[#20DDBB]/30 border border-[#20DDBB]/30'
                                }`}
                            >
                                {isFriend ? (
                                    <>
                                        <HeartSolid className="h-4 w-4 mr-1" />
                                        <span className="text-sm">Друг</span>
                                    </>
                                ) : (
                                    <>
                                        <HeartOutline className="h-4 w-4 mr-1" />
                                        <span className="text-sm">Добавить</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}; 