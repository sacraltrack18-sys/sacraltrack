"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { useUser } from '@/app/context/user';
import { checkAppwriteConfig } from '@/libs/AppWriteClient';
import Image from 'next/image';
import { StarIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface UserCardProps {
    user: {
        $id: string;
        user_id: string;
        name: string;
        username: string;
        image: string;
        bio: string;
        stats: {
            totalLikes: number;
            totalFollowers: number;
            averageRating: number;
            totalRatings: number;
        };
    };
    isFriend: boolean;
    onAddFriend: (userId: string) => void;
    onRemoveFriend: (userId: string) => void;
    onRateUser: (userId: string, rating: number) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, isFriend, onAddFriend, onRemoveFriend, onRateUser }) => {
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);

    const handleRateSubmit = () => {
        onRateUser(user.user_id, rating);
        setShowRatingModal(false);
        toast.success('Rating submitted successfully!');
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#1E2136] rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
            <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16">
                    <Image
                        src={user.image || '/images/default-avatar.png'}
                        alt={user.name}
                        fill
                        className="rounded-full object-cover"
                    />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                    <p className="text-gray-400">@{user.username}</p>
                </div>
            </div>

            <p className="mt-4 text-gray-300">{user.bio}</p>

            <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">{user.stats.totalLikes}</p>
                    <p className="text-sm text-gray-400">Likes</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">{user.stats.totalFollowers}</p>
                    <p className="text-sm text-gray-400">Followers</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">{user.stats.averageRating.toFixed(1)}</p>
                    <p className="text-sm text-gray-400">Rating</p>
                </div>
            </div>

            <div className="mt-6 flex space-x-3">
                <button
                    onClick={() => isFriend ? onRemoveFriend(user.user_id) : onAddFriend(user.user_id)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    {isFriend ? (
                        <>
                            <UserMinusIcon className="w-5 h-5 mr-2" />
                            Remove Friend
                        </>
                    ) : (
                        <>
                            <UserPlusIcon className="w-5 h-5 mr-2" />
                            Add Friend
                        </>
                    )}
                </button>
                <button
                    onClick={() => setShowRatingModal(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-[#272B43] text-white rounded-lg hover:bg-[#323652] transition-colors"
                >
                    <StarIcon className="w-5 h-5 mr-2" />
                    Rate
                </button>
            </div>

            <AnimatePresence>
                {showRatingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-[#1E2136] p-6 rounded-xl w-96"
                        >
                            <h3 className="text-xl font-semibold mb-4">Rate {user.name}</h3>
                            <div className="flex justify-center space-x-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-400'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRateSubmit}
                                    disabled={rating === 0}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const RankingCard: React.FC<{ users: any[] }> = ({ users }) => {
    // Убедимся, что у нас есть массив перед сортировкой
    const userArray = Array.isArray(users) ? users : [];
    
    // Сортируем пользователей по рейтингу
    const topUsers = [...userArray]
        .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
        .slice(0, 5);

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#1E2136] rounded-xl p-6 shadow-lg"
        >
            <h2 className="text-xl font-semibold mb-4">Top Users</h2>
            <div className="space-y-4">
                {topUsers.map((user, index) => (
                    <div key={user.user_id || index} className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-purple-500">#{index + 1}</span>
                        <div className="relative w-10 h-10">
                            <Image
                                src={user.image || '/images/default-avatar.png'}
                                alt={user.name || 'User'}
                                fill
                                className="rounded-full object-cover"
                            />
                        </div>
                        <div>
                            <p className="font-medium">{user.name || 'User'}</p>
                            <p className="text-sm text-gray-400">{user.stats?.totalFollowers || 0} followers</p>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default function PeoplePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const  user  = useUser();
    const { addFriend, removeFriend, friends, loadFriends } = useFriendsStore();
    const { profiles, loading, getAllProfiles, searchProfiles } = useProfileStore();

    useEffect(() => {
        // Проверяем конфигурацию Appwrite
        const appwriteConfig = checkAppwriteConfig();
        console.log('Результат проверки конфигурации Appwrite:', appwriteConfig);
        
        if (!appwriteConfig.isValid) {
            const errorMsg = `Appwrite configuration error: Missing ${appwriteConfig.missingVars.join(', ')}`;
            console.error(errorMsg);
            setConfigError(errorMsg);
            toast.error('Configuration error detected. Check console for details.');
            return;
        }
        
        const initializeData = async () => {
            try {
                console.log('Инициализация данных в PeoplePage');
                await Promise.all([loadUsers(), loadFriends()]);
            } catch (error) {
                console.error('Ошибка при инициализации данных:', error);
                setError('Failed to initialize data. Please try refreshing the page.');
            }
        };

        initializeData();
    }, []);

    useEffect(() => {
        if (page > 1 && !configError) {
            loadUsers();
        }
    }, [page, configError]);

    const loadUsers = async () => {
        if (configError) return;
        
        try {
            console.log('Загрузка пользователей, страница:', page);
            
            if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                console.error('Отсутствуют необходимые переменные окружения для загрузки профилей');
                toast.error('Configuration error: Missing environment variables');
                return;
            }
            
            const profiles = await getAllProfiles(page);
            console.log(`Загружено ${profiles.length} профилей пользователей`);
            
            if (profiles.length === 0 && page === 1) {
                toast.error('No users found. Please check database connection.');
            }
        } catch (error) {
            console.error('Ошибка при загрузке пользователей:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to load users: ${errorMessage}`);
        }
    };

    const handleSearch = async (query: string) => {
        if (configError) return;
        
        setSearchQuery(query);
        if (query.trim()) {
            try {
                console.log('Поиск пользователей по запросу:', query);
                const results = await searchProfiles(query);
                console.log(`Найдено ${results.length} пользователей по запросу "${query}"`);
            } catch (error) {
                console.error('Ошибка при поиске пользователей:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                toast.error(`Search failed: ${errorMessage}`);
            }
        } else {
            setPage(1);
            loadUsers();
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await addFriend(userId);
            toast.success('Friend request sent!');
        } catch (error) {
            toast.error('Failed to send friend request');
        }
    };

    const handleRemoveFriend = async (userId: string) => {
        try {
            await removeFriend(userId);
            toast.success('Friend removed successfully!');
        } catch (error) {
            toast.error('Failed to remove friend');
        }
    };

    const handleRateUser = async (userId: string, rating: number) => {
        try {
            // Здесь будет логика обновления рейтинга пользователя
            toast.success('Rating added successfully!');
        } catch (error) {
            toast.error('Failed to add rating');
        }
    };

    const isFriend = (userId: string) => {
        return friends.some(friend => friend.friendId === userId);
    };

    // Убедимся, что profiles является массивом
    const profilesArray = Array.isArray(profiles) ? profiles : [];

    return (
        <div className="space-y-8">
            {(error || configError) && (
                <div className="bg-red-500 text-white p-4 rounded-lg">
                    {configError ? (
                        <>
                            <h3 className="font-bold text-lg mb-2">Configuration Error</h3>
                            <p>{configError}</p>
                            <p className="mt-2 text-sm">Please check your environment variables and reload the page.</p>
                        </>
                    ) : (
                        error
                    )}
                </div>
            )}
            
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">People</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="bg-[#272B43] text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={!!configError}
                    />
                    <svg
                        className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            </div>

            {configError ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="mt-4 text-xl font-semibold text-white">Configuration Error</h2>
                    <p className="mt-2 text-gray-400 text-center max-w-md">
                        The application is not properly configured. Please check your environment variables and reload the page.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {profilesArray.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <p className="text-gray-400 text-lg">No users found. {searchQuery ? 'Try a different search term.' : 'Users will appear here once they are available.'}</p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AnimatePresence>
                                {profilesArray.map((user) => (
                                    <UserCard
                                        key={user.user_id}
                                        user={user}
                                        isFriend={isFriend(user.user_id)}
                                        onAddFriend={handleAddFriend}
                                        onRemoveFriend={handleRemoveFriend}
                                        onRateUser={handleRateUser}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        
                        {loading && (
                            <div className="flex justify-center mt-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                            </div>
                        )}
                        
                        {!loading && !searchQuery && profilesArray.length > 0 && (
                            <button
                                onClick={() => setPage(prev => prev + 1)}
                                className="mt-8 w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Load More
                            </button>
                        )}
                    </div>
                    
                    <div className="lg:col-span-1">
                        <RankingCard users={profilesArray} />
                    </div>
                </div>
            )}
        </div>
    );
} 