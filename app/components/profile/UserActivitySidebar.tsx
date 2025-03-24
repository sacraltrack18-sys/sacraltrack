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

interface User {
    id?: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
}

interface ActivityItem {
    id: string;
    type: 'track' | 'friend' | 'visitor';
    title: string;
    subtitle: string;
    timestamp: Date;
    image?: string;
    link: string;
    user?: User;
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

const UserActivitySidebar: React.FC<{ userId: string, isOwner: boolean }> = ({ userId, isOwner }) => {
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const { friends, pendingRequests, loadFriends } = useFriendsStore();
    const { likedPosts, fetchLikedPosts } = useLikedStore();
    const { postsByUser, setPostsByUser } = usePostStore();
    
    useEffect(() => {
        const loadActivity = async () => {
            setIsLoading(true);
            
            try {
                // Загружаем нужные данные
                if (isOwner) {
                    await Promise.all([
                        loadFriends(),
                        fetchLikedPosts(userId),
                        setPostsByUser(userId)
                    ]);
                } else {
                    await Promise.all([
                        loadFriends(),
                        setPostsByUser(userId)
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
    }, [userId, isOwner]);
    
    // Получение статистики для рейтинг-карточки
    const { friends: friendsList } = useFriendsStore();
    const { postsByUser: tracks } = usePostStore();
    const { likedPosts: likes } = useLikedStore();
    
    // Расчет рейтинга
    const [rank, setRank] = useState({ name: 'Novice', color: 'from-gray-400 to-gray-500', score: 0 });
    
    useEffect(() => {
        // Расчет простого рейтинга на основе количества друзей, треков и лайков
        const friendsScore = friendsList.length * 10;
        const tracksScore = tracks?.length * 15 || 0;
        const likesScore = likes?.length * 5 || 0;
        
        const totalScore = friendsScore + tracksScore + likesScore;
        
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
    }, [friendsList.length, tracks, likes]);
    
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
        <div className="sticky top-24 space-y-6">
            {/* Rating Card */}
            <motion.div 
                className="glass-card rounded-xl p-5 bg-gradient-to-br from-[#24183D]/70 to-[#1A1E36]/80 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h3 className="text-lg font-medium text-white mb-3">Rating</h3>
                <div className="flex justify-between items-center">
                    <div>
                        <p className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${rank.color}`}>
                            {rank.name}
                        </p>
                        <p className="text-sm text-gray-400">Score: {rank.score}</p>
                    </div>
                    <div className="flex gap-6 mt-2">
                    <div className="text-center">
                            <p className="text-lg font-bold text-white">{friendsList.length || '0'}</p>
                            <p className="text-xs text-gray-400">Friends</p>
                    </div>
                    <div className="text-center">
                            <p className="text-lg font-bold text-white">{tracks?.length || '0'}</p>
                            <p className="text-xs text-gray-400">Tracks</p>
                    </div>
                    <div className="text-center">
                            <p className="text-lg font-bold text-white">{likes?.length || '0'}</p>
                            <p className="text-xs text-gray-400">Likes</p>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            {/* Activity History */}
            <motion.div
                className="glass-card rounded-xl p-5 bg-gradient-to-br from-[#24183D]/70 to-[#1A1E36]/80 border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Recent Activity</h3>
                    <button className="text-sm text-[#20DDBB] hover:text-[#20DDBB]/80 transition">
                        History
                    </button>
            </div>
            
                <div className="space-y-3">
                    {isLoading ? (
                        <ActivitySkeleton />
                    ) : activityItems.length > 0 ? (
                        activityItems.map((item) => (
                            <ActivityCard key={item.id} item={item} />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-6 text-center"
                        >
                            <div className="text-[#A6B1D0] text-sm">
                                <p>No recent activity</p>
                                <p className="mt-2 text-xs">Activity will appear here</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
            
            <style jsx global>{`
                .glass-card {
                    backdrop-filter: blur(8px);
                    box-shadow: 0 0 15px rgba(32, 221, 187, 0.1);
                }
            `}</style>
        </div>
    );
};

export default UserActivitySidebar; 