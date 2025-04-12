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
import { useRouter } from 'next/navigation';

interface RankedUser {
    id: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
    score: number;
    rank: string;
    color: string;
}

const TopRankingUsers: React.FC = () => {
    const [users, setUsers] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const { getAllProfiles } = useProfileStore();
    const { friends, loadFriends } = useFriendsStore();
    const router = useRouter();
    
    const handleImageError = (userId: string) => {
        setImageErrors(prev => ({ ...prev, [userId]: true }));
    };
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Load friends first
                await loadFriends();
                
                // Get all profiles
                const allUsers = await getAllProfiles(1); // Passing 1 as the page parameter
                
                // Create an object to count friends for each user
                const friendsCount: Record<string, number> = {};
                friends.forEach(friendship => {
                    // Count both participants in the friendship
                    friendsCount[friendship.userId] = (friendsCount[friendship.userId] || 0) + 1;
                    friendsCount[friendship.friendId] = (friendsCount[friendship.friendId] || 0) + 1;
                });
                
                // Calculate score based on friends and stats
                const rankedUsers = allUsers.map(user => {
                    // Calculate score based on friends and stats
                    const friendsScore = (friendsCount[user.user_id] || 0) * 10;
                    const likesScore = (user.stats?.totalLikes || 0) * 5;
                    const followersScore = (user.stats?.totalFollowers || 0) * 15;
                    
                    const totalScore = friendsScore + likesScore + followersScore;
                    
                    // Determine rank based on score
                    let rank: string;
                    let color: string;
                    
                    if (totalScore >= 500) {
                        rank = 'Diamond';
                        color = 'text-blue-400';
                    } else if (totalScore >= 300) {
                        rank = 'Platinum';
                        color = 'text-purple-400';
                    } else if (totalScore >= 150) {
                        rank = 'Gold';
                        color = 'text-yellow-500';
                    } else if (totalScore >= 50) {
                        rank = 'Silver';
                        color = 'text-gray-400';
                    } else {
                        rank = 'Bronze';
                        color = 'text-amber-700';
                    }
                    
                    return {
                        id: user.$id,
                        user_id: user.user_id,
                        name: user.name,
                        image: user.image,
                        username: user.name, // Use name as username if not available
                        score: totalScore,
                        rank,
                        color
                    };
                });
                
                // Сортируем по убыванию рейтинга и берем топ-10
                const topUsers = rankedUsers
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10);
                
                setUsers(topUsers);
            } catch (error) {
                console.error('Failed to fetch top users:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, []);
    
    // Функция для получения иконки в зависимости от позиции в рейтинге
    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <FaCrown className="text-yellow-500" />;
            case 1:
                return <FaStar className="text-gray-300" />;
            case 2:
                return <FaMedal className="text-amber-600" />;
            default:
                return <span className="text-gray-400">{index + 1}</span>;
        }
    };
    
    // Функция для получения градиента цвета в зависимости от позиции в рейтинге
    const getRankGradient = (index: number) => {
        if (index === 0) return 'from-yellow-400 to-amber-600';      // 1-е место - золото
        if (index === 1) return 'from-slate-300 to-slate-400';       // 2-е место - серебро
        if (index === 2) return 'from-amber-700 to-amber-800';       // 3-е место - бронза
        return 'from-purple-600 to-indigo-700';                      // Остальные места
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
    
    // Компонент скелетона для карточек пользователей
    const UserRankingSkeleton = () => (
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
    
    return (
        <div className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MdLeaderboard className="text-[#20DDBB]" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20DDBB] to-[#5D59FF]">
                        Top Users
                    </span>
                </h2>
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <UserRankingSkeleton key={i} />
                    ))}
                </div>
            ) : users.length > 0 ? (
                <div className="space-y-3">
                    {users.map((user, index) => (
                        <motion.div 
                            key={user.id}
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
                                    {/* Имя пользователя */}
                                    <span className="truncate">
                                        {user.username ? `@${user.username}` : `Music Artist`}
                                    </span>
                                    
                                    {/* Ранг */}
                                    <span className="mx-1.5 text-gray-600">•</span>
                                    <span className={`${user.color}`}>{user.rank}</span>
                                </div>
                            </div>
                            
                            {/* Ранговый значок */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${getRankGradient(index)} text-white shadow-md group-hover:scale-110 transition-transform border border-white/20`}>
                                {getRankIcon(index)}
                            </div>
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