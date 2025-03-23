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
    
    const { getProfileById } = useProfileStore();
    
    const [users, setUsers] = useState<{ [key: string]: User }>({});
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [isLoading, setIsLoading] = useState(true);
    
    const contextUser = useUser();
    
    // Определяем, является ли текущий пользователь владельцем профиля
    const isOwner = contextUser?.user?.id === profileId;
    
    // Временные данные для демонстрации UI
    const demoUsers: User[] = [
        { user_id: 'demo1', name: 'John Doe', username: 'johndoe', image: '' },
        { user_id: 'demo2', name: 'Jane Smith', username: 'janesmith', image: '' },
        { user_id: 'demo3', name: 'Alex Johnson', username: 'alexj', image: '' },
    ];
    
    const demoRequests: { id: string, userId: string, user?: User }[] = [
        { id: 'req1', userId: 'demo4', user: { user_id: 'demo4', name: 'Mike Wilson', username: 'mikew', image: '' } },
        { id: 'req2', userId: 'demo5', user: { user_id: 'demo5', name: 'Sarah Brown', username: 'sarahb', image: '' } },
    ];
    
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
            
            console.log("Loaded user profiles:", profiles);
            return profiles;
            
        } catch (error) {
            console.error("Error loading user profiles:", error);
            return {};
        }
    };
    
    // Загрузка списка друзей и запросов
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            
            try {
                if (isOwner) {
                    await Promise.all([loadFriends(), loadPendingRequests()]);
                    console.log("Loaded friends:", friends);
                    console.log("Loaded pending requests:", pendingRequests);
                } else {
                    await loadFriends();
                    console.log("Loaded friends (non-owner):", friends);
                }
                
                // Получаем список всех ID пользователей для загрузки их профилей
                const friendIds = friends.map(friend => friend.friendId);
                const requestUserIds = pendingRequests.map(request => request.userId);
                const allUserIds = [...friendIds, ...requestUserIds];
                
                // Загружаем профили пользователей, если есть ID
                if (allUserIds.length > 0) {
                    const loadedUsers = await loadUserProfiles(allUserIds);
                    setUsers(loadedUsers);
                }
                
                // После загрузки данных
                if (friends.length === 0 && pendingRequests.length === 0) {
                    console.log("No friends or requests found, using demo data for UI presentation");
                }
                
            } catch (error) {
                console.error('Failed to load friends data:', error);
                toast.error('Не удалось загрузить данные о друзьях');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, [profileId, isOwner, loadFriends, loadPendingRequests]);
    
    // Создаем массивы для отображения, используя реальные данные или демо данные
    const displayUsers = friends.length > 0
        ? friends.map(friend => {
            const userData = users[friend.friendId];
            return {
                id: friend.id,
                user_id: friend.friendId,
                name: userData?.name || `Friend ${friend.friendId}`,
                image: userData?.image || '',
                username: userData?.username || `user_${friend.friendId}`
            };
        })
        : demoUsers;
        
    const displayRequests = pendingRequests.length > 0
        ? pendingRequests.map(request => {
            const userData = users[request.userId];
            return {
                ...request,
                user: {
                    id: userData?.id || request.userId,
                    user_id: request.userId,
                    name: userData?.name || `User ${request.userId}`,
                    image: userData?.image || '',
                    username: userData?.username
                }
            };
        })
        : demoRequests;
    
    // Обработчики действий с запросами
    const handleAcceptRequest = async (requestId: string) => {
        try {
            console.log(`Accepting friend request with ID: ${requestId}`);
            await acceptFriendRequest(requestId);
            console.log(`Successfully accepted friend request: ${requestId}`);
            toast.success('Запрос в друзья принят');
            
            // Перезагружаем списки друзей и запросов
            loadFriends();
            loadPendingRequests();
        } catch (error) {
            console.error('Failed to accept friend request:', error);
            toast.error('Не удалось принять запрос');
        }
    };
    
    const handleRejectRequest = async (requestId: string) => {
        try {
            console.log(`Rejecting friend request with ID: ${requestId}`);
            await rejectFriendRequest(requestId);
            console.log(`Successfully rejected friend request: ${requestId}`);
            toast.success('Запрос в друзья отклонен');
            
            // Перезагружаем список запросов
            loadPendingRequests();
        } catch (error) {
            console.error('Failed to reject friend request:', error);
            toast.error('Не удалось отклонить запрос');
        }
    };
    
    const handleRemoveFriend = async (friendId: string) => {
        try {
            console.log(`Removing friend with ID: ${friendId}`);
            await removeFriend(friendId);
            console.log(`Successfully removed friend: ${friendId}`);
            toast.success('Друг удален');
            
            // Перезагружаем список друзей
            loadFriends();
        } catch (error) {
            console.error('Failed to remove friend:', error);
            toast.error('Не удалось удалить друга');
        }
    };
    
    return (
        <div className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl p-4 shadow-lg">
            {/* Заголовок и переключатель вкладок */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                        {isOwner ? 'Мои друзья' : 'Друзья пользователя'}
                    </span>
                </h2>
                
                {isOwner && (
                    <div className="flex gap-2 p-1 bg-[#1A1C2E] rounded-xl">
                        <button
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'friends' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setActiveTab('friends')}
                        >
                            Друзья
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'requests' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setActiveTab('requests')}
                        >
                            Запросы
                            {pendingRequests.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
            
            {/* Контент вкладок */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <LoadingState />
                ) : activeTab === 'friends' ? (
                    <motion.div
                        key="friends"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Для демонстрации используем тестовые данные */}
                        {displayUsers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {displayUsers.map(user => (
                                    <FriendCard
                                        key={user.id}
                                        user={user}
                                        isFriend={true}
                                        onRemove={handleRemoveFriend}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState 
                                message={isOwner ? "У вас пока нет друзей" : "У пользователя пока нет друзей"} 
                                icon={<BsPeople />} 
                            />
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="requests"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Для демонстрации используем тестовые данные */}
                        {displayRequests.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {displayRequests.map(request => (
                                    <FriendCard
                                        key={request.id}
                                        user={{ 
                                            id: request.user?.id || request.userId, 
                                            user_id: request.userId, 
                                            name: request.user?.name || `User ${request.userId}`, 
                                            image: request.user?.image || '' 
                                        }}
                                        requestId={request.id}
                                        isPending={true}
                                        onAccept={handleAcceptRequest}
                                        onReject={handleRejectRequest}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState 
                                message="У вас нет входящих запросов в друзья" 
                                icon={<BsPersonPlus />} 
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 