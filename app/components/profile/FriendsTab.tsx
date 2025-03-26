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
import SearchFriendsModal from './SearchFriendsModal';
import { UserPlusIcon } from '@heroicons/react/24/solid';

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
            {/* User background image */}
            <div className="relative w-full h-48 overflow-hidden">
                {/* Background with image */}
                <Image 
                    src={imageError ? '/images/placeholders/user-placeholder.svg' : (user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/user-placeholder.svg')}
                    alt={user.name || 'User'}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={() => setImageError(true)}
                />
                
                {/* Top and bottom darkening */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2136]/90 via-transparent to-[#1E2136]/30 z-10"/>
                
                {/* Animated glass effect on hover */}
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-[2px] z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.7 : 0 }}
                    transition={{ duration: 0.3 }}
                />
                
                {/* User stats on image */}
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
            
            {/* Bottom panel with information and buttons */}
            <div className="absolute bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-[#1E2136]/70 p-4">
                <h3 className="text-lg font-bold text-white truncate mb-1">{user.name}</h3>
                
                {/* User actions */}
                <div className="flex items-center mt-3 space-x-2">
                    <Link href={`/profile/${user.user_id}`} className="flex-1">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full py-2 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300 font-medium shadow-lg shadow-purple-900/10"
                        >
                            Profile
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
            
            {/* Decorative light effect in the corner */}
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

// Empty state component
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

// Loading state component
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
        sentRequests,
        loading, 
        loadFriends, 
        loadPendingRequests,
        loadSentRequests,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend
    } = useFriendsStore();
    
    const { getProfileById, currentProfile } = useProfileStore();
    
    const [users, setUsers] = useState<{ [key: string]: User }>({});
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');
    const [isLoading, setIsLoading] = useState(true);
    const [showSearchModal, setShowSearchModal] = useState(false);
    
    const contextUser = useUser();
    
    // Determine if the current user is the profile owner
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
                // Загружаем друзей и запросы только если текущий пользователь владелец профиля
                if (isOwner) {
                    await Promise.all([
                        loadFriends(),
                        loadPendingRequests(),
                        loadSentRequests()
                    ]);
                    
                    // Формируем массив ID пользователей для загрузки профилей
                    const friendIds = friends.map(friend => friend.friendId);
                    const pendingIds = pendingRequests.map(request => request.userId);
                    const sentIds = sentRequests.map(request => request.friendId);
                    
                    // Загружаем профили пользователей
                    const profiles = await loadUserProfiles([...friendIds, ...pendingIds, ...sentIds]);
                    setUsers(profiles);
                } else {
                    // Для просмотра чужого профиля загружаем только друзей этого пользователя
                    await loadFriends();
                    const friendIds = friends.map(friend => friend.friendId);
                    const profiles = await loadUserProfiles(friendIds);
                    setUsers(profiles);
                }
            } catch (error) {
                console.error("Failed to fetch friends data:", error);
                toast.error("Failed to load friends");
            } finally {
                setIsLoading(false);
            }
        };
        
        if (profileId) {
        fetchData();
        }
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
    
    return (
        <div className="w-full rounded-3xl bg-gradient-to-br from-[#1E2136]/80 to-[#15162C]/80 backdrop-blur-md shadow-xl overflow-hidden">
            {/* Header with tab buttons */}
            <div className="p-4 border-b border-purple-900/20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Friends</h2>
                    
                    {isOwner && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSearchModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium shadow-lg shadow-purple-900/20 transition-all duration-300"
                        >
                            <UserPlusIcon className="w-5 h-5" />
                            Find Friends
                        </motion.button>
                    )}
                </div>
                
                {/* Tab navigation */}
                <div className="flex flex-wrap gap-2">
                    <motion.button
                        onClick={() => setActiveTab('friends')}
                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === 'friends' 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-[#252742] text-gray-400 hover:bg-[#2A2D42]'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <BsPeople className="mr-2" /> All Friends
                    </motion.button>
                    
                    {isOwner && (
                        <>
                            <motion.button
                                onClick={() => setActiveTab('requests')}
                                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium ml-2 transition-all ${
                                    activeTab === 'requests' 
                                    ? 'bg-purple-500 text-white' 
                                    : 'bg-[#252742] text-gray-400 hover:bg-[#2A2D42]'
                                } relative`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <BsPersonPlus className="mr-2" /> Requests
                                {pendingRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </motion.button>
                            
                            <motion.button
                                onClick={() => setActiveTab('sent')}
                                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium ml-2 transition-all ${
                                    activeTab === 'sent' 
                                    ? 'bg-purple-500 text-white' 
                                    : 'bg-[#252742] text-gray-400 hover:bg-[#2A2D42]'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="mr-2">➡️</span> Sent
                            </motion.button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Content area */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <LoadingState />
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'friends' && (
                            <motion.div
                                key="friends"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
                            >
                                {friends.length > 0 ? (
                                    friends.map(friend => {
                                        const user = users[friend.friendId];
                                        if (!user) return null;
                                        
                                        return (
                                            <FriendCard
                                                key={friend.id}
                                                user={user}
                                                isFriend={true}
                                                onRemove={handleRemoveFriend}
                                            />
                                        );
                                    })
                                ) : (
                                    <EmptyState
                                        message={isOwner ? "You don't have any friends yet" : "This user doesn't have any friends yet"}
                                        icon={<BsPeople />}
                                    />
                                )}
                            </motion.div>
                        )}
                        
                        {activeTab === 'requests' && isOwner && (
                            <motion.div
                                key="requests"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
                            >
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map(request => {
                                        const user = users[request.userId];
                                        if (!user) return null;
                                        
                                        return (
                                            <FriendCard
                                                key={request.id}
                                                user={user}
                                                isPending={true}
                                                requestId={request.id}
                                                onAccept={handleAcceptRequest}
                                                onReject={handleRejectRequest}
                                            />
                                        );
                                    })
                                ) : (
                                    <EmptyState
                                        message="You don't have any friend requests" 
                                        icon={<BsPersonPlus />}
                                    />
                                )}
                            </motion.div>
                        )}
                        
                        {activeTab === 'sent' && isOwner && (
                            <motion.div
                                key="sent"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
                            >
                                {sentRequests.length > 0 ? (
                                    sentRequests.map(request => {
                                        const user = users[request.friendId];
                                        if (!user) return null;
                                        
                                        return (
                                            <FriendCard
                                                key={request.id}
                                                user={user}
                                                isPending={true}
                                                requestId={request.id}
                                            />
                                        );
                                    })
                                ) : (
                                    <EmptyState 
                                        message="You haven't sent any friend requests" 
                                        icon={<span className="text-4xl">➡️</span>} 
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
            
            {/* Search friends modal */}
            {showSearchModal && (
                <SearchFriendsModal 
                    isOpen={showSearchModal} 
                    onClose={() => setShowSearchModal(false)} 
                />
            )}
        </div>
    );
} 