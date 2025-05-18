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
import { GiRank3 } from 'react-icons/gi';
import { FaUserFriends, FaHeart, FaMusic, FaShoppingCart } from 'react-icons/fa';
import { MdAlbum } from 'react-icons/md';

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
                        (item.image && item.image.trim() ? useCreateBucketUrl(item.image, item.type === 'track' ? 'track' : 'user') : 
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
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto hide-scrollbar"
        >
            <div className="space-y-4 sticky-sidebar">
                {/* Profile Stats Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="p-4 rounded-xl border border-white/5 bg-[#251A3A]/50 backdrop-blur-lg"
                >
                    {isLoading ? (
                        <ActivitySkeleton />
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold text-[#20DDBB] mb-4">Profile Stats</h3>
                            <div className="space-y-3">
                                {/* User Rank */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#20DDBB]/10 flex items-center justify-center">
                                            <GiRank3 className="text-[#20DDBB] w-4 h-4" />
                                        </div>
                                        <span className="text-white/80">Rank</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5">
                                            <div className="text-white font-semibold">{rank.name}</div>
                                            <div className="text-xs text-[#20DDBB] px-1.5 py-0.5 rounded-md bg-[#20DDBB]/10">
                                                {Math.min(100, rank.score)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* User Friends */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <FaUserFriends className="text-blue-400 w-4 h-4" />
                                        </div>
                                        <span className="text-white/80">Friends</span>
                                    </div>
                                    <div 
                                        className="text-white font-semibold cursor-pointer hover:text-blue-400 transition-colors"
                                        onClick={onShowFriends}
                                    >
                                        {friendsList.length}
                                    </div>
                                </div>
                                
                                {/* User Releases */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 flex items-center justify-center">
                                            <MdAlbum className="text-[#20DDBB] w-4 h-4" />
                                        </div>
                                        <span className="text-white/80">Tracks</span>
                                    </div>
                                    <div className="text-white font-semibold">
                                        {tracks?.length || 0}
                                    </div>
                                </div>
                                
                                {/* User Likes */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                            <FaHeart className="text-pink-400 w-4 h-4" />
                                        </div>
                                        <span className="text-white/80">Likes</span>
                                    </div>
                                    <div 
                                        className="text-white font-semibold cursor-pointer hover:text-pink-400 transition-colors"
                                        onClick={onShowLikes}
                                    >
                                        {likes?.length || 0}
                                    </div>
                                </div>
                                
                                {/* User Vibes */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <FaMusic className="text-purple-400 w-4 h-4" />
                                        </div>
                                        <span className="text-white/80">Vibes</span>
                                    </div>
                                    <div 
                                        className="text-white font-semibold cursor-pointer hover:text-purple-400 transition-colors"
                                        onClick={onShowVibes}
                                    >
                                        {vibes?.length || 0}
                                    </div>
                                </div>
                                
                                {/* User Purchases - показываем только владельцу профиля */}
                                {isOwner && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <FaShoppingCart className="text-green-400 w-4 h-4" />
                                            </div>
                                            <span className="text-white/80">Purchases</span>
                                        </div>
                                        <div 
                                            className="text-white font-semibold cursor-pointer hover:text-green-400 transition-colors"
                                            onClick={onShowPurchases}
                                        >
                                            View
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
                
                {/* Recent Activity Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="p-4 rounded-xl border border-white/5 bg-[#251A3A]/50 backdrop-blur-lg"
                >
                    <h3 className="text-lg font-semibold text-[#20DDBB] mb-4">Recent Activity</h3>
                    
                    {isLoading ? (
                        <ActivitySkeleton />
                    ) : activityItems.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="text-white/50 text-sm">No recent activity</div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activityItems.map((item, index) => (
                                <ActivityCard key={index} item={item} />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default UserActivitySidebar;

// Add this CSS at the end of the file
const styles = `
.sticky-sidebar {
  position: sticky;
  top: 20px;
  z-index: 40;
}

@media (max-width: 768px) {
  .sticky-sidebar {
    position: relative;
    top: 0;
  }
}
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
} 