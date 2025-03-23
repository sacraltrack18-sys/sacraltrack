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
        
        if (diff < 60) return 'только что';
        if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} д. назад`;
        
        return date.toLocaleDateString('ru-RU', { 
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
                        subtitle: 'Вы лайкнули этот трек',
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
                        subtitle: isOwner ? 'Ваш новый друг' : 'Новый друг пользователя',
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
                        subtitle: 'Добавил(а) новый трек',
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
                
                // Добавляем демо-данные, если реальных активностей мало
                if (activities.length < 3) {
                    const demoActivities = generateDemoActivities(3 - activities.length, isOwner);
                    activities.push(...demoActivities);
                }
                
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
    
    // Генерация демо-данных для предпросмотра
    const generateDemoActivities = (count: number, isOwner: boolean): ActivityItem[] => {
        const now = new Date();
        const activities: ActivityItem[] = [];
        
        const types = ['track', 'friend', 'visitor'] as const;
        const names = ['Alex Smith', 'Maria Garcia', 'John Doe', 'Emma Wilson'];
        const trackNames = ['Summer Vibes', 'Night City', 'Chill Mix', 'Deep House'];
        
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const time = new Date(now.getTime() - Math.random() * 604800000); // Случайное время за последнюю неделю
            
            if (type === 'track') {
                const trackName = trackNames[Math.floor(Math.random() * trackNames.length)];
                activities.push({
                    id: `demo_track_${i}`,
                    type: 'track',
                    title: trackName,
                    subtitle: isOwner ? 'Вы лайкнули этот трек' : 'Пользователь лайкнул этот трек',
                    timestamp: time,
                    link: '#',
                });
            } else if (type === 'friend') {
                const name = names[Math.floor(Math.random() * names.length)];
                activities.push({
                    id: `demo_friend_${i}`,
                    type: 'friend',
                    title: name,
                    subtitle: isOwner ? 'Ваш новый друг' : 'Новый друг пользователя',
                    timestamp: time,
                    link: '#',
                });
            } else {
                const name = names[Math.floor(Math.random() * names.length)];
                activities.push({
                    id: `demo_visitor_${i}`,
                    type: 'visitor',
                    title: name,
                    subtitle: isOwner ? 'Посетил ваш профиль' : 'Посетил профиль пользователя',
                    timestamp: time,
                    link: '#',
                });
            }
        }
        
        return activities;
    };
    
    const RankingInfo = () => {
        // Расчет простого рейтинга на основе количества друзей, треков и лайков
        const friendsScore = friends.length * 10;
        const tracksScore = postsByUser?.length * 15 || 0;
        const likesScore = likedPosts?.length * 5 || 0;
        
        const totalScore = friendsScore + tracksScore + likesScore;
        
        // Определение ранга на основе общего счета
        let rank = 'Новичок';
        let color = 'from-gray-400 to-gray-500';
        
        if (totalScore >= 500) {
            rank = 'Легенда';
            color = 'from-purple-400 to-pink-500';
        } else if (totalScore >= 300) {
            rank = 'Мастер';
            color = 'from-blue-400 to-purple-500';
        } else if (totalScore >= 150) {
            rank = 'Продвинутый';
            color = 'from-cyan-400 to-blue-500';
        } else if (totalScore >= 50) {
            rank = 'Опытный';
            color = 'from-green-400 to-teal-500';
        }
        
        return (
            <div className="bg-[#1A1C2E]/50 rounded-xl p-4 mb-4">
                <h3 className="text-white font-bold mb-2">Рейтинг</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-transparent bg-clip-text bg-gradient-to-r ${color} font-bold text-lg`}>
                            {rank}
                        </p>
                        <p className="text-gray-400 text-xs">Счет: {totalScore}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20">
                        <span className="text-white font-bold">{totalScore}</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                        <p className="text-xs text-gray-400">Друзья</p>
                        <p className="text-white">{friends.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400">Треки</p>
                        <p className="text-white">{postsByUser?.length || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400">Лайки</p>
                        <p className="text-white">{likedPosts?.length || 0}</p>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <div className="w-full h-full">
            {/* Блок с рейтингом пользователя */}
            <RankingInfo />
            
            {/* Заголовок раздела активности */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Последняя активность</h3>
                {isOwner && (
                    <Link href="#" className="text-xs text-[#20DDBB] hover:underline">
                        История
                    </Link>
                )}
            </div>
            
            {/* Список активностей */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl bg-[#1A1C2E]/30 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {activityItems.map(item => (
                            <ActivityCard key={item.id} item={item} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default UserActivitySidebar; 