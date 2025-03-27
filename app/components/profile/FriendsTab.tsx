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
        removeFriend,
        addFriend
    } = useFriendsStore();
    
    const { getProfileById, currentProfile } = useProfileStore();
    
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');
    const [isLoading, setIsLoading] = useState(true);
    const [showSearchModal, setShowSearchModal] = useState(false);
    
    const contextUser = useUser();
    
    // Determine if the current user is the profile owner
    const isOwner = contextUser?.user?.id === profileId;
    
    const fetchData = async () => {
        try {
            setIsLoading(true);
            
            // Если мы просматриваем свой профиль, загружаем все списки
                if (isOwner) {
                    await Promise.all([
                        loadFriends(),
                        loadPendingRequests(),
                        loadSentRequests()
                    ]);
                } else {
                // Если просматриваем чужой профиль, загружаем только список друзей
                    await loadFriends();
                }
            } catch (error) {
            console.error('Error fetching friends data:', error);
            toast.error('Failed to load friends data');
            } finally {
                setIsLoading(false);
            }
        };
        
    useEffect(() => {
        fetchData();
    }, [isOwner, profileId]);
    
    // Обработчики действий с друзьями
    const handleAcceptRequest = async (requestId: string) => {
        try {
            await acceptFriendRequest(requestId);
            toast.success('Friend request accepted');
            fetchData(); // Обновляем данные после действия
        } catch (error) {
            console.error('Error accepting friend request:', error);
            toast.error('Failed to accept friend request');
        }
    };
    
    const handleRejectRequest = async (requestId: string) => {
        try {
            await rejectFriendRequest(requestId);
            toast.success('Friend request rejected');
            fetchData(); // Обновляем данные после действия
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            toast.error('Failed to reject friend request');
        }
    };
    
    const handleRemoveFriend = async (friendId: string) => {
        try {
            await removeFriend(friendId);
            toast.success('Friend removed');
            fetchData(); // Обновляем данные после действия
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };
    
    const handleAddFriend = async (userId: string) => {
        try {
            await addFriend(userId, contextUser?.user?.id);
            toast.success('Friend request sent');
            fetchData(); // Обновляем данные после действия
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        }
    };
    
    // Визуализация и рендеринг
    return (
        <div className="w-full">
            {/* Заголовок и поиск друзей */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                <div className="mb-4 md:mb-0">
                    <h2 className="text-2xl font-bold text-white">
                        {isOwner ? 'Your Friends' : `${currentProfile?.name}'s Friends`}
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {isOwner 
                            ? 'Manage your connections and friend requests' 
                            : `Explore ${currentProfile?.name}'s connections`}
                    </p>
                </div>
                    
                    {isOwner && (
                        <motion.button
                        onClick={() => setShowSearchModal(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl text-white shadow-lg shadow-purple-900/20"
                        >
                            <UserPlusIcon className="w-5 h-5" />
                        <span>Find Friends</span>
                        </motion.button>
                    )}
                </div>
                
            {/* Вкладки (только для владельца профиля) */}
            {isOwner && (
                <div className="flex border-b border-gray-800 mb-6">
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`px-4 py-3 text-sm font-medium ${
                            activeTab === 'friends' 
                                ? 'text-[#20DDBB] border-b-2 border-[#20DDBB]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Friends {friends.length > 0 && `(${friends.length})`}
                    </button>
                    <button
                                onClick={() => setActiveTab('requests')}
                        className={`px-4 py-3 text-sm font-medium ${
                                    activeTab === 'requests' 
                                ? 'text-[#20DDBB] border-b-2 border-[#20DDBB]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Friend Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    </button>
                    <button
                                onClick={() => setActiveTab('sent')}
                        className={`px-4 py-3 text-sm font-medium ${
                                    activeTab === 'sent' 
                                ? 'text-[#20DDBB] border-b-2 border-[#20DDBB]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Sent Requests {sentRequests.length > 0 && `(${sentRequests.length})`}
                    </button>
                </div>
            )}
            
            {/* Содержимое вкладок */}
                {isLoading ? (
                    <LoadingState />
                ) : (
                    <AnimatePresence mode="wait">
                    {activeTab === 'friends' || !isOwner ? (
                            <motion.div
                                key="friends"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {friends.length === 0 ? (
                                <EmptyState 
                                    message={
                                        isOwner 
                                            ? "You don't have any friends yet. Start connecting with other users!" 
                                            : `${currentProfile?.name} doesn't have any friends yet.`
                                    } 
                                    icon={<BsPeople />} 
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {friends.map((friend) => (
                                            <FriendCard
                                                key={friend.id}
                                            user={{
                                                user_id: friend.friendId,
                                                name: friend.profile?.name || 'User',
                                                image: friend.profile?.image,
                                                username: friend.profile?.username
                                            }}
                                                isFriend={true}
                                            onRemove={isOwner ? handleRemoveFriend : undefined}
                                        />
                                    ))}
                                </div>
                                )}
                            </motion.div>
                    ) : activeTab === 'requests' ? (
                            <motion.div
                                key="requests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {pendingRequests.length === 0 ? (
                                <EmptyState 
                                    message="You don't have any pending friend requests" 
                                    icon={<BsPersonPlus />} 
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingRequests.map((request) => (
                                            <FriendCard
                                                key={request.id}
                                            user={{
                                                user_id: request.userId,
                                                name: request.profile?.name || 'User',
                                                image: request.profile?.image,
                                                username: request.profile?.username
                                            }}
                                                isPending={true}
                                                requestId={request.id}
                                                onAccept={handleAcceptRequest}
                                                onReject={handleRejectRequest}
                                            />
                                    ))}
                                </div>
                                )}
                            </motion.div>
                    ) : (
                            <motion.div
                                key="sent"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {sentRequests.length === 0 ? (
                                <EmptyState 
                                    message="You haven't sent any friend requests yet" 
                                    icon={<BsPersonPlus />} 
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sentRequests.map((request) => (
                                            <FriendCard
                                                key={request.id}
                                            user={{
                                                user_id: request.friendId,
                                                name: request.profile?.name || 'User',
                                                image: request.profile?.image,
                                                username: request.profile?.username
                                            }}
                                        />
                                    ))}
                                </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            
            {/* Модальное окно поиска друзей */}
            {showSearchModal && (
                <SearchFriendsModal 
                    onClose={() => setShowSearchModal(false)} 
                    onAddFriend={handleAddFriend}
                    currentUserId={contextUser?.user?.id || ''}
                />
            )}
        </div>
    );
} 