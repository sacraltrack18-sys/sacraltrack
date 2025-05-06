"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import Link from 'next/link';
import Image from 'next/image';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { MdLeaderboard } from 'react-icons/md';
import { FaCrown, FaStar, FaMedal } from 'react-icons/fa6';
import { database, Query } from '@/libs/AppWriteClient';

// Определение типов для табов
const TabTypes = {
    USERS: 'users',
    ARTISTS: 'artists'
} as const;

type TabType = typeof TabTypes[keyof typeof TabTypes];

// Компонент кнопки таба для рейтинга
const RatingTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
}> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs font-medium transition-all ${
            active
                ? 'text-white bg-gradient-to-r from-purple-500/30 to-indigo-500/30 rounded-full border border-purple-500/30 shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5 rounded-full'
        }`}
    >
        {label}
    </button>
);

// Определение интерфейса для пользователя в рейтинге
interface RankedUser {
    id: string;  // ID профиля
    user_id: string;  // ID пользователя (auth)
    name: string;
    username?: string;
    image: string;
    score: number;
    rank: string;
    color: string;
}

interface TopRankingUsersProps {
    users?: any[];
    onUserClick?: (userId: string) => void;
}

const TopRankingUsers: React.FC<TopRankingUsersProps> = ({ users: externalUsers, onUserClick }) => {
    const [users, setUsers] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
    const [activeTab, setActiveTab] = useState<TabType>(TabTypes.USERS);
    const { currentProfile } = useProfileStore();
    const { friends } = useFriendsStore();

    const handleImageError = (userId: string) => {
        setImageErrors(prev => ({
            ...prev,
            [userId]: true
        }));
    };

    useEffect(() => {
        // Если пользователи переданы через пропсы, используем их
        if (externalUsers && externalUsers.length > 0) {
            try {
                // Сначала фильтруем пользователей с необходимыми полями
                const validUsers = externalUsers.filter(user => user && user.user_id);
                
                // Затем преобразуем их в нужный формат
                const processedUsers: RankedUser[] = validUsers.map((user: any) => {
                    const score = calculateUserScore(user);
                    const { rank, color } = determineRank(score);
                    
                    return {
                        id: user.$id || user.id || '',
                        user_id: user.user_id,
                        name: user.name || 'Unknown Artist',
                        username: user.username,
                        image: user.image || '/images/placeholders/user-placeholder.svg',
                        score,
                        rank,
                        color
                    };
                });
                
                // Сортировка по убыванию счёта
                const sortedUsers = processedUsers
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);
                
                setUsers(sortedUsers);
                setIsLoading(false);
            } catch (error) {
                console.error('Error processing external users:', error);
                setIsLoading(false);
            }
            return;
        }
        
        // Если пропсы не переданы, загружаем пользователей из базы
        const fetchUsers = async () => {
            try {
                // Получаем друзей
                const userFriendsResponses = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                    [
                        Query.limit(100),
                    ]
                );
                
                // Получаем все профили
                const userProfiles = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [
                        Query.limit(100),
                    ]
                );
                
                if (userProfiles && userProfiles.documents) {
                    // Сначала отфильтруем наш профиль
                    const filteredProfiles = userProfiles.documents.filter(profile => 
                        !currentProfile || profile.user_id !== currentProfile.user_id
                    );
                    
                    // Затем обработаем оставшиеся профили
                    const rankedUsers: RankedUser[] = filteredProfiles.map((profile: any) => {
                        // Расчет счета
                        const score = calculateUserScore(profile, userFriendsResponses?.documents);
                        
                        // Определение ранга и цвета
                        const { rank, color } = determineRank(score);
                        
                        return {
                            id: profile.$id,
                            user_id: profile.user_id,
                            name: profile.name || 'Unknown Artist',
                            username: profile.username,
                            image: profile.image || '/images/placeholders/user-placeholder.svg',
                            score, // Добавляем рассчитанный счет
                            rank, // Добавляем ранг
                            color // Добавляем цвет для ранга
                        };
                    });
                    
                    // Сортируем пользователей по счету и берем топ-10
                    const topUsers = rankedUsers
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10);
                    
                    setUsers(topUsers);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchUsers();
    }, [externalUsers, currentProfile, friends, activeTab]); // Добавлен activeTab в зависимости
    
    // Расчет счета пользователя на основе различных метрик
    const calculateUserScore = (profile: any, userFriends: any[] = []) => {
        let score = 0;
        
        // Проверяем наличие статистики
        const stats = profile.stats || {};
        
        // Учитываем лайки, подписчиков и рейтинги, если они есть
        if (stats.totalLikes) score += parseInt(stats.totalLikes, 10) * 0.5;
        if (stats.totalFollowers) score += parseInt(stats.totalFollowers, 10) * 2;
        if (stats.averageRating) score += parseFloat(stats.averageRating) * 20;
        if (stats.totalRatings) score += parseInt(stats.totalRatings, 10) * 5;
        
        // Для обратной совместимости
        if (profile.totalLikes) score += parseInt(profile.totalLikes, 10) * 0.5;
        if (profile.totalFollowers) score += parseInt(profile.totalFollowers, 10) * 2;
        if (profile.averageRating) score += parseFloat(profile.averageRating) * 20;
        if (profile.totalRatings) score += parseInt(profile.totalRatings, 10) * 5;
        
        // Дополнительные очки если пользователь в друзьях
        if (userFriends && userFriends.length > 0) {
            const isFriend = userFriends.some((friend: any) => friend.friend_id === profile.user_id);
            if (isFriend) score += 50;
        }
        
        return Math.round(score) || 10; // Минимальный счет 10
    };
    
    // Определение ранга и цвета на основе счета
    const determineRank = (score: number) => {
        if (score >= 500) return { rank: 'Diamond', color: 'text-blue-400' };
        if (score >= 300) return { rank: 'Platinum', color: 'text-purple-400' };
        if (score >= 150) return { rank: 'Gold', color: 'text-yellow-500' };
        if (score >= 50) return { rank: 'Silver', color: 'text-gray-400' };
        return { rank: 'Bronze', color: 'text-amber-700' };
    };
    
    // Функция для получения иконки в зависимости от позиции в рейтинге
    const getRankIcon = (index: number) => {
        if (index === 0) return <FaCrown className="text-yellow-400" />;
        if (index === 1) return <FaStar className="text-gray-300" />;
        if (index === 2) return <FaMedal className="text-amber-700" />;
        return `${index + 1}`;
    };
    
    // Функция для получения градиента цвета в зависимости от позиции в рейтинге
    const getRankGradient = (index: number) => {
        if (index === 0) return 'from-yellow-500 to-amber-500';      // 1-е место - золото
        if (index === 1) return 'from-slate-300 to-gray-400';       // 2-е место - серебро
        if (index === 2) return 'from-amber-700 to-yellow-800';       // 3-е место - бронза
        return 'from-indigo-600 to-purple-600';                      // Остальные места
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
    
    // Функция для создания скелетонов загрузки
    const renderSkeletonLoaders = () => {
        return Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-900/30 to-indigo-900/30"></div>
                <div className="flex-1">
                    <div className="h-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded w-1/2"></div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-900/30 to-indigo-900/30"></div>
            </div>
        ));
    };
    
    return (
        <div className="bg-gradient-to-br from-[#212746]/50 to-[#171c36]/50 rounded-xl p-4 border border-indigo-500/10 shadow-inner">
            {/* Заголовок и переключатель */}
            <div className="mb-4">
                {/* Стильный переключатель */}
                <div className="flex justify-center">
                    <div className="inline-flex bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-1 rounded-full">
                        <RatingTabButton 
                            active={activeTab === TabTypes.USERS} 
                            onClick={() => setActiveTab(TabTypes.USERS)}
                            label="Users"
                        />
                        <RatingTabButton 
                            active={activeTab === TabTypes.ARTISTS} 
                            onClick={() => setActiveTab(TabTypes.ARTISTS)}
                            label="Artists"
                        />
                    </div>
                </div>
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    {renderSkeletonLoaders()}
                </div>
            ) : users.length > 0 ? (
                <div className="space-y-3">
                    {users.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                                duration: 0.3, 
                                delay: index * 0.05,
                                ease: "easeOut"
                            }}
                            className="cursor-pointer"
                            onClick={() => onUserClick ? onUserClick(user.user_id) : null}
                        >
                            <Link 
                                href={`/profile/${user.user_id}`}
                                onClick={(e) => {
                                    // Если есть функция onUserClick, предотвращаем стандартную навигацию
                                    // и используем переданную функцию
                                    if (onUserClick) {
                                        e.preventDefault();
                                        onUserClick(user.user_id);
                                    }
                                }}
                                className="relative flex items-center space-x-3 p-2.5 rounded-xl bg-gradient-to-r hover:from-indigo-900/30 hover:to-purple-900/30 transition-all"
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
                                            src={imageErrors[user.user_id] ? '/images/placeholders/user-placeholder.svg' : (user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/user-placeholder.svg')}
                                            alt={user.name} 
                                            width={48} 
                                            height={48}
                                            className="object-cover"
                                            onError={() => handleImageError(user.user_id)}
                                        />
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
                                        
                                        {/* Рейтинг в виде звезд */}
                                        {user.score > 0 && getRatingStars(Math.min(5, user.score / 100))}
                                    </div>
                                    
                                    <div className="flex items-center text-xs text-gray-400 mt-0.5">
                                        {/* Ранг */}
                                        <span className={`${user.color}`}>{user.rank}</span>
                                    </div>
                                </div>
                                
                                {/* Ранговый значок */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${getRankGradient(index)} text-white shadow-md group-hover:scale-110 transition-transform border border-white/20`}>
                                    {getRankIcon(index)}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className="text-white/60">No ranked users yet</p>
                    <p className="text-white/40 text-sm mt-2">Users will appear here once they receive ratings</p>
                </div>
            )}
            
            <Link href="/rankings" passHref>
                <motion.button 
                    whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-2.5 mt-4 rounded-lg bg-gradient-to-r from-purple-900/20 to-indigo-900/20 text-white/90 hover:text-white transition-all text-sm font-medium border border-white/10 backdrop-blur-sm flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View Full Rankings
                </motion.button>
            </Link>
        </div>
    );
};

export default TopRankingUsers; 