"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import { BsHeart, BsPeople, BsHeadphones, BsMusicNoteBeamed, BsCalendarCheck } from 'react-icons/bs';
import { IoTimeOutline } from 'react-icons/io5';
import Link from 'next/link';
import Image from 'next/image';
import { useFriendsStore } from '@/app/stores/friends';
import { useLikedStore } from '@/app/stores/likedStore';
import { usePostStore } from '@/app/stores/post';
import { useVibeStore } from '@/app/stores/vibeStore';

interface User {
    id?: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
}

interface ActivityItem {
    id: string;
    type: 'track' | 'friend' | 'visitor' | 'vibe';
    title: string;
    subtitle: string;
    timestamp: Date;
    image?: string;
    link: string;
    user?: User;
}

interface UserActivitySidebarProps {
    userId: string;
    isOwner: boolean;
    onShowFriends?: () => void;
    onShowLikes?: () => void;
    onShowPurchases?: () => void;
    onShowVibes?: () => void;
    activeTab?: 'friends' | 'likes' | 'purchases' | 'vibes' | 'main';
}

const ActivityCard: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const [imageError, setImageError] = useState(false);
    
    // Получаем иконку в зависимости от типа активности
    const getIcon = () => {
        switch (item.type) {
            case 'track':
                return <BsMusicNoteBeamed className="text-pink-400" />;
            case 'friend':
                return <BsPeople className="text-blue-400" />;
            case 'visitor':
                return <BsCalendarCheck className="text-green-400" />;
            case 'vibe':
                return <BsHeadphones className="text-purple-400" />;
            default:
                return <BsHeart className="text-purple-400" />;
        }
    };
    
    // Форматирование времени
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
        
        return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short'
        });
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1C2E]/50 hover:bg-[#1A1C2E] transition-all duration-300 group"
        >
            <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                    src={imageError ? '/images/placeholders/user-placeholder.svg' : 
                        (item.image ? useCreateBucketUrl(item.image, item.type === 'track' ? 'track' : 'user') : 
                        '/images/placeholders/user-placeholder.svg')}
                    alt={item.title}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                    onError={() => setImageError(true)}
                />
                <div className="absolute -bottom-1 -right-1 bg-[#1E2136] p-1 rounded-full">
                    {getIcon()}
                </div>
            </div>
            
            <div className="flex-1 min-w-0">
                <Link href={item.link} className="hover:text-[#20DDBB] transition-colors">
                    <h4 className="font-semibold text-white truncate">{item.title}</h4>
                </Link>
                <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
            </div>
            
            <div className="text-xs text-gray-500 flex items-center">
                <IoTimeOutline className="mr-1" />
                {formatTime(item.timestamp)}
            </div>
        </motion.div>
    );
};

const UserActivitySidebar: React.FC<UserActivitySidebarProps> = ({ 
    userId, 
    isOwner, 
    onShowFriends, 
    onShowLikes, 
    onShowPurchases,
    onShowVibes,
    activeTab = 'main'
}) => {
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const { friends, pendingRequests, loadFriends } = useFriendsStore();
    const { likedPosts, fetchLikedPosts } = useLikedStore();
    const { postsByUser, setPostsByUser } = usePostStore();
    const { vibePostsByUser, fetchVibesByUser } = useVibeStore();
    
    useEffect(() => {
        const loadActivity = async () => {
            setIsLoading(true);
            
            try {
                // Загружаем нужные данные
                if (isOwner) {
                    await Promise.all([
                        loadFriends(),
                        fetchLikedPosts(userId),
                        setPostsByUser(userId),
                        fetchVibesByUser(userId)
                    ]);
                } else {
                    await Promise.all([
                        loadFriends(),
                        setPostsByUser(userId),
                        fetchVibesByUser(userId)
                    ]);
                }
                
                const activities: ActivityItem[] = [];
                
                // Добавляем последний лайкнутый трек (только для владельца)
                if (isOwner && likedPosts && likedPosts.length > 0) {
                    const lastLiked = likedPosts[0];
                    activities.push({
                        id: `like_${lastLiked.$id}`,
                        type: 'track',
                        title: lastLiked.title || 'Unnamed Track',
                        subtitle: 'You liked this track',
                        timestamp: new Date(lastLiked.$createdAt || Date.now()),
                        image: lastLiked.image || '',
                        link: `/post/${lastLiked.$id}`
                    });
                }
                
                // Добавляем последний добавленный друг
                if (friends && friends.length > 0) {
                    const lastFriend = friends[0];
                    
                    // We need to fetch the friend's name and image
                    let friendProfile;
                    try {
                        friendProfile = await fetch(`/api/user/profile/${lastFriend.friendId}`).then(res => res.json());
                    } catch (error) {
                        console.error('Error fetching friend profile:', error);
                    }
                    
                        activities.push({
                            id: `friend_${lastFriend.id}`,
                            type: 'friend',
                        title: friendProfile?.name || `Friend ${lastFriend.friendId}`,
                        subtitle: isOwner ? 'Your new friend' : 'User\'s new friend',
                            timestamp: new Date(lastFriend.createdAt),
                        image: friendProfile?.image || '',
                        link: `/profile/${lastFriend.friendId}`,
                        user: {
                            user_id: lastFriend.friendId,
                            name: friendProfile?.name || `Friend ${lastFriend.friendId}`,
                            image: friendProfile?.image || ''
                        }
                    });
                }
                
                // Добавляем последний опубликованный трек
                if (postsByUser && postsByUser.length > 0) {
                    const lastPost = postsByUser[0];
                    
                    activities.push({
                        id: `track_${lastPost.id}`,
                        type: 'track',
                        title: lastPost.trackname || 'Unnamed Track',
                        subtitle: 'Added new track',
                        timestamp: new Date(lastPost.created_at || Date.now()),
                        image: lastPost.image_url || lastPost.image || '',
                        link: `/track/${lastPost.id}`,
                        user: {
                            user_id: lastPost.user_id,
                            name: lastPost.name || 'Unknown',
                            image: lastPost.image || lastPost.profile?.image || ''
                        }
                    });
                }
                
                // Добавляем последний опубликованный вайб
                if (vibePostsByUser && vibePostsByUser.length > 0) {
                    const lastVibe = vibePostsByUser[0];
                    
                    activities.push({
                        id: `vibe_${lastVibe.id}`,
                        type: 'vibe',
                        title: lastVibe.caption || 'Musical Vibe',
                        subtitle: isOwner ? 'You shared a vibe' : 'Shared a musical vibe',
                        timestamp: new Date(lastVibe.created_at || Date.now()),
                        image: lastVibe.media_url || '',
                        link: `/vibe/${lastVibe.id}`,
                        user: {
                            user_id: lastVibe.user_id,
                            name: lastVibe.profile?.name || 'Unknown',
                            image: lastVibe.profile?.image || ''
                        }
                    });
                }
                
                // Если реальных активностей нет, оставляем пустой массив вместо демо-данных
                
                // Сортируем активности по дате, новые сверху
                const sortedActivities = activities.sort((a, b) => 
                    b.timestamp.getTime() - a.timestamp.getTime()
                );
                
                setActivityItems(sortedActivities);
            } catch (error) {
                console.error('Failed to load activity data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadActivity();
    }, [userId, isOwner, loadFriends, fetchLikedPosts, setPostsByUser, fetchVibesByUser]);
    
    // Получение статистики для рейтинг-карточки
    const { friends: friendsList } = useFriendsStore();
    const { postsByUser: tracks } = usePostStore();
    const { likedPosts: likes } = useLikedStore();
    const { vibePostsByUser: vibes } = useVibeStore();
    
    // Расчет рейтинга
    const [rank, setRank] = useState({ name: 'Novice', color: 'from-gray-400 to-gray-500', score: 0 });
    
    useEffect(() => {
        // Расчет простого рейтинга на основе количества друзей, треков, лайков и вайбов
        const friendsScore = friendsList.length * 10;
        const tracksScore = tracks?.length * 15 || 0;
        const likesScore = likes?.length * 5 || 0;
        const vibesScore = vibes?.length * 8 || 0;
        
        const totalScore = friendsScore + tracksScore + likesScore + vibesScore;
        
        // Определение ранга на основе общего счета
        let rankName = 'Novice';
        let color = 'from-gray-400 to-gray-500';
        
        if (totalScore >= 500) {
            rankName = 'Legend';
            color = 'from-purple-400 to-pink-500';
        } else if (totalScore >= 300) {
            rankName = 'Master';
            color = 'from-blue-400 to-purple-500';
        } else if (totalScore >= 150) {
            rankName = 'Advanced';
            color = 'from-cyan-400 to-blue-500';
        } else if (totalScore >= 50) {
            rankName = 'Experienced';
            color = 'from-green-400 to-teal-500';
        }
        
        setRank({ name: rankName, color, score: totalScore });
    }, [friendsList.length, tracks, likes, vibes]);
    
    // Форматирование времени
    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
        
        return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short'
        });
    };
    
    // Skeleton loader for activities
    const ActivitySkeleton = () => (
        <>
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1C2E]/50 animate-pulse">
                    <div className="h-12 w-12 rounded-lg bg-[#1E2136]"></div>
                    <div className="flex-1">
                        <div className="h-4 w-2/3 bg-[#1E2136] rounded"></div>
                        <div className="h-3 w-1/2 bg-[#1E2136] rounded mt-2"></div>
                    </div>
                    <div className="h-3 w-16 bg-[#1E2136] rounded"></div>
                </div>
            ))}
        </>
    );
        
        return (
        <div className="space-y-6">
            {/* Таб переключатели для быстрого доступа */}
            <div className="bg-[#1A1C2E]/70 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-[#3f2d63]/30">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Access</h3>
                <div className="grid grid-cols-2 gap-3">
                    <motion.button
                        onClick={onShowFriends}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                            ${activeTab === 'friends' 
                                ? 'bg-gradient-to-br from-purple-600 to-violet-700 text-white' 
                                : 'bg-[#252742]/50 hover:bg-[#252742] text-white/70'}`}
                    >
                        <BsPeople className="text-2xl mb-2" />
                        <span className="text-xs">Friends</span>
                        {pendingRequests.length > 0 && isOwner && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                {pendingRequests.length}
                            </span>
                        )}
                    </motion.button>

                    <motion.button
                        onClick={onShowLikes}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                            ${activeTab === 'likes' 
                                ? 'bg-gradient-to-br from-pink-600 to-red-500 text-white' 
                                : 'bg-[#252742]/50 hover:bg-[#252742] text-white/70'}`}
                    >
                        <BsHeart className="text-2xl mb-2" />
                        <span className="text-xs">Liked</span>
                    </motion.button>

                    {isOwner && (
                        <motion.button
                            onClick={onShowPurchases}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                                ${activeTab === 'purchases' 
                                    ? 'bg-gradient-to-br from-green-600 to-teal-500 text-white' 
                                    : 'bg-[#252742]/50 hover:bg-[#252742] text-white/70'}`}
                        >
                            <BsHeadphones className="text-2xl mb-2" />
                            <span className="text-xs">Purchases</span>
                        </motion.button>
                    )}

                    <motion.button
                        onClick={onShowVibes}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                            ${activeTab === 'vibes' 
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' 
                                : 'bg-[#252742]/50 hover:bg-[#252742] text-white/70'}`}
                    >
                        <BsMusicNoteBeamed className="text-2xl mb-2" />
                        <span className="text-xs">Vibes</span>
                    </motion.button>
                </div>
                    </div>

            {/* Статистика профиля */}
            <div className="bg-[#1A1C2E]/70 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-[#3f2d63]/30">
                <h3 className="text-lg font-semibold text-white mb-4">Profile Stats</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BsPeople className="text-purple-400 mr-2" />
                            <span className="text-white/80">Friends</span>
                        </div>
                        <span className="font-semibold text-white">{friendsList.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BsMusicNoteBeamed className="text-blue-400 mr-2" />
                            <span className="text-white/80">Tracks</span>
                        </div>
                        <span className="font-semibold text-white">{tracks?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BsHeart className="text-pink-400 mr-2" />
                            <span className="text-white/80">Liked</span>
                        </div>
                        <span className="font-semibold text-white">{likes?.length || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <BsHeadphones className="text-teal-400 mr-2" />
                            <span className="text-white/80">Vibes</span>
                        </div>
                        <span className="font-semibold text-white">{vibes?.length || 0}</span>
                    </div>
                </div>
                
                <div className="mt-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-white/60">Profile Level</span>
                        <span className="text-xs text-white/60">{Math.min(100, rank.score)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded overflow-hidden">
            <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, rank.score)}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r ${rank.color}`}
                        />
                    </div>
                    <p className="text-xs mt-1 text-center font-medium bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        {rank.name}
                    </p>
                </div>
            </div>
            
            {/* Последняя активность */}
            <div className="bg-[#1A1C2E]/70 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-[#3f2d63]/30">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                
                    {isLoading ? (
                        <ActivitySkeleton />
                ) : activityItems.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-gray-400">No recent activity</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activityItems.map(item => (
                            <ActivityCard key={item.id} item={item} />
                        ))}
                            </div>
                    )}
                </div>
        </div>
    );
};

export default UserActivitySidebar; 