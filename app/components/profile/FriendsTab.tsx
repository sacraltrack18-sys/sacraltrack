"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useUser } from '@/app/context/user';
import { BsPeople, BsPersonPlus, BsCheckLg, BsXLg, BsPersonDash } from 'react-icons/bs';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useProfileStore } from '@/app/stores/profile';
import { database } from '@/libs/AppWriteClient';

interface User {
    id?: string;
    user_id: string;
    name: string;
    image?: string;
    username?: string;
    bio?: string;
}

interface FriendRequest {
    id: string;
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    user?: User;
}

const FriendCard: React.FC<{ 
    user: User, 
    isFriend?: boolean,
    requestId?: string,
    isPending?: boolean,
    onAccept?: (requestId: string) => void,
    onReject?: (requestId: string) => void,
    onRemove?: (userId: string) => void
}> = ({ 
    user, 
    isFriend = false, 
    requestId,
    isPending = false,
    onAccept,
    onReject,
    onRemove
}) => {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="relative overflow-hidden rounded-2xl shadow-lg group"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            {/* Фоновое изображение пользователя */}
            <div className="relative w-full h-48 overflow-hidden">
                {/* Фон с изображением */}
                <Image 
                    src={imageError ? '/images/placeholders/user-placeholder.svg' : (user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/user-placeholder.svg')}
                    alt={user.name || 'User'}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={() => setImageError(true)}
                />
                
                {/* Затемнение сверху и снизу */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2136]/90 via-transparent to-[#1E2136]/30 z-10"/>
                
                {/* Анимированный стеклянный эффект при наведении */}
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-[2px] z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.7 : 0 }}
                    transition={{ duration: 0.3 }}
                />
                
                {/* Статистика пользователя на изображении */}
                {user.username && (
                    <motion.div 
                        className="absolute top-3 left-3 z-20 bg-purple-500/20 backdrop-blur-md px-3 py-1 rounded-full"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <p className="text-xs text-white font-medium">@{user.username}</p>
                    </motion.div>
                )}
            </div>
            
            {/* Нижняя панель с информацией и кнопками */}
            <div className="absolute bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-[#1E2136]/70 p-4">
                <h3 className="text-lg font-bold text-white truncate mb-1">{user.name}</h3>
                
                {/* Действия с пользователем */}
                <div className="flex items-center mt-3 space-x-2">
                    <Link href={`/profile/${user.user_id}`} className="flex-1">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full py-2 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300 font-medium shadow-lg shadow-purple-900/10"
                        >
                            Профиль
                        </motion.button>
                    </Link>
                    
                    {isPending && requestId && (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-900/20 hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                                onClick={() => onAccept && onAccept(requestId)}
                            >
                                <BsCheckLg size={18} />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-900/20 hover:from-red-600 hover:to-pink-600 transition-all duration-300"
                                onClick={() => onReject && onReject(requestId)}
                            >
                                <BsXLg size={18} />
                            </motion.button>
                        </>
                    )}
                    
                    {isFriend && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-900/20 hover:from-red-600 hover:to-pink-600 transition-all duration-300"
                            onClick={() => onRemove && onRemove(user.user_id)}
                        >
                            <BsPersonDash size={18} />
                        </motion.button>
                    )}
                </div>
            </div>
            
            {/* Декоративный световой эффект в углу */}
            <motion.div 
                className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-xl z-5 -mr-10 -mt-10"
                animate={{ 
                    scale: isHovered ? [1, 1.2, 1] : 1,
                    opacity: isHovered ? [0.3, 0.7, 0.3] : 0.3 
                }}
                transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    repeatType: "reverse" 
                }}
            />
        </motion.div>
    );
};

// Компонент пустого состояния
const EmptyState: React.FC<{ message: string, icon: React.ReactNode }> = ({ message, icon }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 text-center"
    >
        <div className="text-gray-400 mb-4 text-5xl">
            {icon}
        </div>
        <p className="text-gray-400 text-lg">{message}</p>
    </motion.div>
);

// Компонент загрузки
const LoadingState = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gradient-to-br from-[#2A2D42] to-[#1E2136] animate-pulse"/>
        ))}
    </div>
);

export default function FriendsTab({ profileId }: { profileId: string }) {
    const { 
        friends, 
        pendingRequests, 
        loading, 
        loadFriends, 
        loadPendingRequests,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend
    } = useFriendsStore();
    
    const { getProfileById, currentProfile } = useProfileStore();
    
    const [users, setUsers] = useState<{ [key: string]: User }>({});
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [isLoading, setIsLoading] = useState(true);
    
    const contextUser = useUser();
    
    // Определяем, является ли текущий пользователь владельцем профиля
    const isOwner = contextUser?.user?.id === profileId;
    
    // Функция для загрузки профилей пользователей по ID
    const loadUserProfiles = async (userIds: string[]): Promise<Record<string, User>> => {
        try {
            console.log("Loading profiles for userIds:", userIds);
            // Преобразуем в массив уникальных ID
            const uniqueUserIds = Array.from(new Set(userIds));
            const profiles: Record<string, User> = {};
            
            await Promise.all(
                uniqueUserIds.map(async (userId) => {
                    try {
                        const profile = await getProfileById(userId);
                        if (profile) {
                            profiles[userId] = {
                                id: profile.$id,
                                user_id: profile.user_id,
                                name: profile.name || `User ${profile.user_id}`,
                                image: profile.image || '',
                                // Безопасно получаем username, если он есть
                                username: (profile as any).username || `user_${profile.user_id}`
                            };
                        }
                    } catch (error) {
                        console.error(`Failed to load profile for user ${userId}:`, error);
                    }
                })
            );
            
            return profiles;
        } catch (error) {
            console.error("Failed to load user profiles:", error);
            return {};
        }
    };
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            
            try {
                // Загружаем список друзей и запросов в друзья
                await loadFriends();
                
                if (isOwner) {
                    await loadPendingRequests();
                }
                
                // Собираем все user IDs для загрузки профилей
                const friendIds = friends.map(friend => 
                    friend.userId === profileId ? friend.friendId : friend.userId
                );
                
                const requestIds = isOwner 
                    ? pendingRequests.map(req => req.userId)
                    : [];
                
                const allUserIds = [...friendIds, ...requestIds];
                
                if (allUserIds.length > 0) {
                    const userProfiles = await loadUserProfiles(allUserIds);
                    setUsers(userProfiles);
                }
            } catch (error) {
                console.error("Error fetching friends data:", error);
                toast.error("Failed to load friends");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, [profileId, isOwner]);
    
    const handleAcceptRequest = async (requestId: string) => {
        try {
            await acceptFriendRequest(requestId);
            // Обновляем данные после принятия запроса
            await loadFriends();
            await loadPendingRequests();
        } catch (error) {
            console.error("Error accepting friend request:", error);
        }
    };
    
    const handleRejectRequest = async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId);
            // Обновляем список запросов
            await loadPendingRequests();
        } catch (error) {
            console.error("Error rejecting friend request:", error);
        }
    };
    
    const handleRemoveFriend = async (friendId: string) => {
        try {
            await removeFriend(friendId);
            // Обновляем список друзей
            await loadFriends();
        } catch (error) {
            console.error("Error removing friend:", error);
        }
    };
    
    // Преобразуем друзей для отображения
    const friendsToDisplay = friends
        .filter(friend => friend.status === 'accepted')
        .map(friend => {
            const friendId = friend.userId === profileId ? friend.friendId : friend.userId;
            const user = users[friendId];
            return { 
                ...friend, 
                user: user || { 
                    user_id: friendId,
                    name: `User ${friendId}`,
                    image: ''
                }
            };
        });
    
    // Преобразуем запросы в друзья для отображения
    const requestsToDisplay = pendingRequests.map(request => {
        const user = users[request.userId];
        return {
            ...request,
            user: user || {
                user_id: request.userId,
                name: `User ${request.userId}`,
                image: ''
            }
        };
    });
    
    return (
        <div className="w-full">
            {/* Заголовок и вкладки */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        {isOwner ? 'Your Connections' : `${currentProfile?.name || 'User'}'s Connections`}
                    </h2>
                    <p className="text-[#A6B1D0] text-sm">
                        {isOwner 
                            ? `You have ${friendsToDisplay.length} friend${friendsToDisplay.length !== 1 ? 's' : ''} and ${requestsToDisplay.length} pending request${requestsToDisplay.length !== 1 ? 's' : ''}`
                            : `Has ${friendsToDisplay.length} friend${friendsToDisplay.length !== 1 ? 's' : ''}`
                        }
                    </p>
                </div>
                
                {isOwner && (
                    <div className="flex bg-[#1E2136] p-1 rounded-xl shadow-md self-start sm:self-auto">
                        <button
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                activeTab === 'friends' 
                                ? 'bg-gradient-to-r from-[#20DDBB] to-[#0A947B] text-white shadow-lg' 
                                : 'text-[#A6B1D0] hover:text-white'
                            }`}
                            onClick={() => setActiveTab('friends')}
                        >
                            Friends
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                activeTab === 'requests' 
                                ? 'bg-gradient-to-r from-[#20DDBB] to-[#0A947B] text-white shadow-lg' 
                                : 'text-[#A6B1D0] hover:text-white'
                            }`}
                            onClick={() => setActiveTab('requests')}
                        >
                            Requests {requestsToDisplay.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#20DDBB] text-[#1E2136] rounded-full">{requestsToDisplay.length}</span>}
                        </button>
                    </div>
                )}
            </div>
            
            {/* Содержимое вкладок */}
            <AnimatePresence mode="wait">
                {activeTab === 'friends' ? (
                    <motion.div
                        key="friends"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isLoading ? (
                            <LoadingState />
                        ) : (
                            <div>
                                {friendsToDisplay.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                        {friendsToDisplay.map(friend => (
                                            <FriendCard
                                                key={friend.id}
                                                user={friend.user}
                                                isFriend={true}
                                                onRemove={handleRemoveFriend}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        message={isOwner ? "You don't have any friends yet. Start connecting!" : "This user doesn't have any friends yet."}
                                        icon={<BsPeople />}
                                    />
                                )}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="requests"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isLoading ? (
                            <LoadingState />
                        ) : (
                            <div>
                                {requestsToDisplay.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                        {requestsToDisplay.map(request => (
                                            <FriendCard
                                                key={request.id}
                                                user={request.user}
                                                isPending={true}
                                                requestId={request.id}
                                                onAccept={handleAcceptRequest}
                                                onReject={handleRejectRequest}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        message="You don't have any pending friend requests."
                                        icon={<BsPersonPlus />}
                                    />
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 