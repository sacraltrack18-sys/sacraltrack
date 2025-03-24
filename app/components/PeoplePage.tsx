"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { useUser } from '@/app/context/user';
import { checkAppwriteConfig } from '@/libs/AppWriteClient';
import Image from 'next/image';
import Link from 'next/link';
import TopRankingUsers from '@/app/components/profile/TopRankingUsers';
import { 
  StarIcon, 
  UserPlusIcon, 
  UserMinusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon, 
  ArrowDownIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { database, Query } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';

interface UserCardProps {
    user: {
        $id: string;
        user_id: string;
        name: string;
        username?: string;
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

// Shimmering skeleton loader for user cards
const UserCardSkeleton = () => (
  <motion.div
    className="bg-gradient-to-br from-[#1E2136] to-[#252742] h-full rounded-2xl overflow-hidden shadow-lg border border-purple-900/10"
    initial={{ opacity: 0.7 }}
    animate={{ 
      opacity: [0.7, 0.9, 0.7],
      boxShadow: ['0 10px 15px -3px rgba(88, 28, 135, 0.05)', '0 10px 15px -3px rgba(88, 28, 135, 0.1)', '0 10px 15px -3px rgba(88, 28, 135, 0.05)']
    }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
  >
    <div className="p-6">
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-sm opacity-50"></div>
          <div className="relative w-20 h-20 rounded-full bg-[#252742] animate-pulse overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#252742] to-[#323652] animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="h-6 w-32 bg-[#252742] rounded-lg mb-2 animate-pulse"></div>
          <div className="h-4 w-24 bg-[#252742] rounded-lg animate-pulse"></div>
          <div className="flex mt-2 gap-2">
            <div className="h-5 w-20 bg-[#252742] rounded-full animate-pulse"></div>
            <div className="h-5 w-16 bg-[#252742] rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 h-10 bg-[#252742] rounded-lg animate-pulse"></div>
      
      <div className="mt-4 grid grid-cols-3 gap-3 p-3 bg-[#1A1C2E] rounded-lg">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-5 w-10 mx-auto bg-[#252742] rounded-lg mb-1 animate-pulse"></div>
            <div className="h-3 w-14 mx-auto bg-[#252742] rounded-lg animate-pulse"></div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex space-x-3">
        <div className="flex-1 h-10 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-xl animate-pulse"></div>
        <div className="flex-1 h-10 bg-[#252742] rounded-xl animate-pulse"></div>
      </div>
    </div>
  </motion.div>
);

const UserCard: React.FC<UserCardProps> = ({ user, isFriend, onAddFriend, onRemoveFriend, onRateUser }) => {
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Add fallback for username
    const displayUsername = user.username || user.name;
    
    const handleRateSubmit = () => {
        onRateUser(user.user_id, rating);
        setShowRatingModal(false);
        toast.success('Rating submitted successfully!');
    };
    
    // Улучшенная функция для получения цвета на основе рейтинга
    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'from-yellow-400 to-yellow-600';
        if (rating >= 3.5) return 'from-green-400 to-green-600';
        if (rating >= 2.5) return 'from-blue-400 to-blue-600';
        if (rating >= 1.5) return 'from-orange-400 to-orange-600';
        return 'from-red-400 to-red-600';
    };
    
    const getRatingStarColor = (rating: number) => {
        if (rating >= 4.5) return 'text-yellow-400';
        if (rating >= 3.5) return 'text-green-500';
        if (rating >= 2.5) return 'text-blue-500';
        if (rating >= 1.5) return 'text-orange-500';
        return 'text-red-500';
    };
    
    return (
        <motion.div
            className="bg-gradient-to-br from-[#1E2136] to-[#252742] h-full rounded-2xl overflow-hidden shadow-lg group border border-transparent hover:border-purple-500/20 transition-all duration-300"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <div className="p-6 relative">
                {/* Улучшенный эффект свечения при наведении */}
                <motion.div 
                    className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{ 
                        opacity: isHovered ? [0, 0.5, 0.3] : 0, 
                        scale: isHovered ? [0.9, 1.05, 1] : 1 
                    }}
                    transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0, repeatType: 'reverse' }}
                />
                
                <div className="relative">
                    {/* Область для навигации по профилю */}
                    <Link href={`/profile/${user.user_id}`}>
                        <div className="cursor-pointer group-hover:scale-[1.01] transition-transform">
                            <div className="flex items-center gap-5">
                                <motion.div 
                                    className="relative w-20 h-20 flex-shrink-0"
                                    animate={{ 
                                        scale: isHovered ? 1.05 : 1,
                                        rotateZ: isHovered ? 5 : 0
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Анимированное градиентное кольцо */}
                                    <motion.div 
                                        className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-sm opacity-50"
                                        animate={{ 
                                            rotate: 360,
                                            opacity: isHovered ? [0.5, 0.8, 0.5] : 0.5
                                        }}
                                        transition={{ 
                                            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                                            opacity: { duration: 2, repeat: isHovered ? Infinity : 0, repeatType: "reverse" }
                                        }}
                                    />
                                    
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <Image
                                            src={imageError ? '/images/placeholders/user-placeholder.svg' : (user.image || '/images/placeholders/user-placeholder.svg')}
                                            alt={user.name}
                                            fill
                                            className="rounded-full object-cover ring-2 ring-purple-500/50 shadow-lg"
                                            onError={() => setImageError(true)}
                                        />
                                        
                                        {/* Наложение при наведении */}
                                        <motion.div 
                                            className="absolute inset-0 bg-gradient-to-t from-purple-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: isHovered ? 1 : 0 }}
                                        />
                                    </div>
                                </motion.div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                        <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-colors truncate">
                                            {user.name}
                                        </h3>
                                        
                                        {/* Улучшенный рейтинг - градиентные звезды */}
                                        <div className="ml-2 flex items-center">
                                            <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getRatingColor(user.stats.averageRating)} text-white`}>
                                                <StarIcon className="w-3 h-3 mr-1" />
                                                {user.stats.averageRating.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-purple-400 font-medium truncate">@{displayUsername}</p>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                                            {user.stats.totalFollowers} followers
                                        </span>
                                        <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                                            {user.stats.totalRatings} ratings
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-gray-300 text-sm line-clamp-2 h-10 overflow-hidden">
                                {user.bio || "No bio available."}
                            </div>

                            {/* Улучшенная статистика с анимацией при наведении */}
                            <div className="mt-4 grid grid-cols-3 gap-3 text-center bg-[#1A1C2E] p-3 rounded-lg transition-colors group-hover:bg-[#1A1C2E]/80">
                                <motion.div 
                                    className="flex flex-col"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <p className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#20DDBB] group-hover:to-[#0A947B]">
                                        {user.stats.totalLikes}
                                    </p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Likes</p>
                                </motion.div>
                                <motion.div 
                                    className="flex flex-col border-x border-gray-800"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <p className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400">
                                        {user.stats.totalFollowers}
                                    </p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Followers</p>
                                </motion.div>
                                <motion.div 
                                    className="flex flex-col"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <p className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-orange-400">
                                        {user.stats.totalRatings}
                                    </p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Ratings</p>
                                </motion.div>
                            </div>
                        </div>
                    </Link>

                    {/* Кнопки действий отделены, чтобы не активировать ссылку */}
                    <div className="mt-6 flex space-x-3" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => isFriend ? onRemoveFriend(user.user_id) : onAddFriend(user.user_id)}
                            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl transition-colors ${
                                isFriend 
                                    ? 'bg-red-600/80 text-white hover:bg-red-700' 
                                    : 'bg-gradient-to-r from-[#20DDBB] to-[#0A947B] text-white hover:from-[#1CC9A8] hover:to-[#097E68]'
                            }`}
                        >
                            {isFriend ? (
                                <>
                                    <UserMinusIcon className="w-5 h-5 mr-2" />
                                    Unfriend
                                </>
                            ) : (
                                <>
                                    <UserPlusIcon className="w-5 h-5 mr-2" />
                                    Add Friend
                                </>
                            )}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowRatingModal(true)}
                            className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1A1C2E] text-white hover:bg-[#2A2D42] transition-colors"
                        >
                            <StarIcon className="w-5 h-5 mr-2 text-yellow-500" />
                            Rate
                        </motion.button>
                    </div>
                </div>
            </div>
            
            {/* Улучшенный модал для оценки */}
            <AnimatePresence>
                {showRatingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                        onClick={() => setShowRatingModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#252742] to-[#1E2136] rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-purple-500/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-white mb-6">Rate {user.name}</h3>
                            
                            <div className="flex justify-center mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        className={`text-4xl mx-1 transition-all duration-200 ${
                                            star <= (hoverRating || rating) 
                                                ? 'text-yellow-500 drop-shadow-lg' 
                                                : 'text-gray-600'
                                        }`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    >
                                        ★
                                    </motion.button>
                                ))}
                            </div>
                            
                            <div className="text-center mb-6">
                                <p className="text-[#A6B1D0]">
                                    {rating === 0 ? 'Select your rating' : `You've selected ${rating} star${rating !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            
                            <div className="flex space-x-4">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex-1 py-3 rounded-xl bg-[#1A1C2E] text-white hover:bg-[#2A2D42] transition-colors"
                                    onClick={() => setShowRatingModal(false)}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`flex-1 py-3 rounded-xl transition-colors ${
                                        rating > 0 
                                            ? 'bg-gradient-to-r from-[#20DDBB] to-[#0A947B] text-white' 
                                            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                    }`}
                                    onClick={rating > 0 ? handleRateSubmit : undefined}
                                    disabled={rating === 0}
                                >
                                    Submit
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Filter dropdown component
const FilterDropdown = ({ 
    options, 
    value, 
    onChange, 
    label 
}: { 
    options: {value: string, label: string}[], 
    value: string, 
    onChange: (val: string) => void,
    label: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button 
                className="flex items-center space-x-1 bg-[#252742] hover:bg-[#323652] px-3 py-2 rounded-lg text-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{label}:</span>
                <span className="font-medium">{options.find(opt => opt.value === value)?.label}</span>
                <ChevronDownIcon className="w-4 h-4 ml-1" />
            </button>
            
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-1 bg-[#2A2D45] rounded-lg shadow-xl z-10 min-w-[160px] overflow-hidden"
                >
                    {options.map(option => (
                        <button
                            key={option.value}
                            className={`block w-full text-left px-4 py-2 hover:bg-[#323652] transition-colors ${option.value === value ? 'bg-purple-600 text-white' : 'text-gray-300'}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

// Улучшенная панель рейтинга топ-пользователей
const TopRankingUsersPanel = ({ users }: { users: any[] }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-[#1E2136] to-[#252742] rounded-2xl overflow-hidden shadow-lg border border-purple-900/10"
        >
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="text-[#20DDBB]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Top Users</h2>
                </div>
                
                <div className="space-y-4">
                    {users.map((user, index) => (
                        <Link key={user.user_id} href={`/profile/${user.user_id}`}>
                            <motion.div 
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                                whileHover={{ x: 5 }}
                            >
                                <div className="w-6 flex justify-center">
                                    {index < 3 ? (
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                            index === 0 ? 'bg-yellow-500' : 
                                            index === 1 ? 'bg-gray-300' : 
                                            'bg-amber-700'
                                        }`}>
                                            <span className="text-xs font-bold text-[#1E2136]">{index + 1}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 font-bold">{index + 1}</span>
                                    )}
                                </div>
                                
                                <div className="relative w-10 h-10">
                                    <Image 
                                        src={user.image || '/images/placeholders/user-placeholder.svg'} 
                                        alt={user.name}
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{user.name}</p>
                                    <p className="text-[#A6B1D0] text-xs truncate">@{user.username || `user_${user.user_id.slice(-5)}`}</p>
                                </div>
                                
                                <div className="flex items-center gap-1 bg-[#1A1C2E] px-2 py-1 rounded-lg">
                                    <StarIcon className="w-4 h-4 text-yellow-500" />
                                    <span className="text-white text-sm font-medium">{user.stats.averageRating.toFixed(1)}</span>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default function PeoplePage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
    const [topRankedUsers, setTopRankedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterBy, setFilterBy] = useState('all');
    const [error, setError] = useState<string | null>(null);
    
    const { friends, loadFriends, addFriend, removeFriend } = useFriendsStore();
    const user = useUser();
    
    // Toggle sort direction
    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };
    
    // Загрузка пользователей
    const loadUsers = async () => {
        try {
            setIsLoading(true);
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.limit(20)]
            );
            
            const loadedProfiles = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name || 'Unknown User',
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: doc.stats?.totalLikes || 0,
                    totalFollowers: doc.stats?.totalFollowers || 0,
                    averageRating: doc.stats?.averageRating || 0,
                    totalRatings: doc.stats?.totalRatings || 0
                }
            }));
            
            setProfiles(loadedProfiles);
            setFilteredProfiles(loadedProfiles);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Failed to load users. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Обработка поиска
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchQuery.trim()) {
            setFilteredProfiles(profiles);
            return;
        }
        
        const filtered = profiles.filter(profile => 
            profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.username && profile.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (profile.bio && profile.bio.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        setFilteredProfiles(filtered);
    };
    
    // Проверка, является ли пользователь другом
    const isFriend = (userId: string) => {
        return friends.some(friend => 
            (friend.userId === userId && friend.status === 'accepted') || 
            (friend.friendId === userId && friend.status === 'accepted')
        );
    };
    
    // Рейтинг пользователя
    const handleRateUser = async (userId: string, rating: number) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to rate users');
            return;
        }
        
        try {
            // Здесь должна быть логика для сохранения рейтинга
            await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_RATINGS!,
                ID.unique(),
                {
                    user_id: user.user.id,
                    rated_user_id: userId,
                    rating: rating,
                    created_at: new Date().toISOString()
                }
            );
            
            toast.success('Rating submitted successfully!');
            
            // Перезагружаем данные
            await loadUsers();
            await loadTopUsers();
        } catch (error) {
            console.error('Error rating user:', error);
            toast.error('Failed to submit rating');
        }
    };
    
    // Загрузка дополнительных профилей
    const loadMoreProfiles = async () => {
        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [
                    Query.limit(20),
                    Query.offset((nextPage - 1) * 20)
                ]
            );
            
            const newProfiles = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name || 'Unknown User',
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: doc.stats?.totalLikes || 0,
                    totalFollowers: doc.stats?.totalFollowers || 0,
                    averageRating: doc.stats?.averageRating || 0,
                    totalRatings: doc.stats?.totalRatings || 0
                }
            }));
            
            if (newProfiles.length === 0) {
                setHasMoreProfiles(false);
            } else {
                setPage(nextPage);
                setProfiles(prevProfiles => [...prevProfiles, ...newProfiles]);
                sortAndFilterProfiles([...profiles, ...newProfiles]);
            }
        } catch (error) {
            console.error('Error loading more profiles:', error);
            toast.error('Failed to load more profiles');
        } finally {
            setIsLoadingMore(false);
        }
    };
    
    // Сортировка и фильтрация профилей
    const sortAndFilterProfiles = (profilesToFilter = profiles) => {
        let result = [...profilesToFilter];
        
        // Фильтрация
        if (filterBy === 'friends') {
            result = result.filter(profile => isFriend(profile.user_id));
        } else if (filterBy === 'new') {
            // Предполагаем, что в профиле есть поле createdAt
            result = result.sort((a, b) => 
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
        }
        
        // Сортировка
        if (sortBy === 'name') {
            result.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                return sortDirection === 'asc' 
                    ? nameA.localeCompare(nameB) 
                    : nameB.localeCompare(nameA);
            });
        } else if (sortBy === 'rating') {
            result.sort((a, b) => {
                const ratingA = a.stats.averageRating;
                const ratingB = b.stats.averageRating;
                return sortDirection === 'asc' 
                    ? ratingA - ratingB 
                    : ratingB - ratingA;
            });
        } else if (sortBy === 'followers') {
            result.sort((a, b) => {
                const followersA = a.stats.totalFollowers;
                const followersB = b.stats.totalFollowers;
                return sortDirection === 'asc' 
                    ? followersA - followersB 
                    : followersB - followersA;
            });
        }
        
        setFilteredProfiles(result);
    };
    
    // Загрузка рейтинга топ-пользователей с использованием реальных данных
    const loadTopUsers = async () => {
        try {
            // Здесь мы делаем запрос на получение топ-пользователей с сортировкой по рейтингу
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [
                    Query.orderDesc('stats.averageRating'),
                    Query.limit(10)
                ]
            );
            
            // Преобразуем данные для отображения
            const topUsers = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name,
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                stats: {
                    totalLikes: doc.stats?.totalLikes || 0,
                    totalFollowers: doc.stats?.totalFollowers || 0,
                    averageRating: doc.stats?.averageRating || 0,
                    totalRatings: doc.stats?.totalRatings || 0
                }
            }));
            
            setTopRankedUsers(topUsers);
        } catch (error) {
            console.error('Error loading top users:', error);
        }
    };
    
    // Обработка добавления друга с корректной обработкой запросов
    const handleAddFriend = async (userId: string) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to add friends');
            return;
        }
        
        try {
            await addFriend(userId);
            toast.success('Friend request sent!');
            
            // Обновляем состояние, чтобы отобразить изменения в UI
            await loadFriends();
        } catch (error) {
            console.error('Error adding friend:', error);
            toast.error('Failed to send friend request');
        }
    };
    
    // Обработка удаления друга
    const handleRemoveFriend = async (userId: string) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to remove friends');
            return;
        }
        
        try {
            await removeFriend(userId);
            toast.success('Friend removed!');
            
            // Обновляем состояние, чтобы отобразить изменения в UI
            await loadFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend');
        }
    };
    
    // Инициализация данных
    useEffect(() => {
        const initializeData = async () => {
            setIsLoading(true);
            try {
                await loadFriends();
                await loadUsers();
                await loadTopUsers();
            } catch (error) {
                console.error('Error initializing data:', error);
                setError('Failed to load data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        
        if (user?.user?.id) {
            initializeData();
        }
    }, [user?.user?.id]);
    
    // Обновление отображаемых профилей при изменении фильтров
    useEffect(() => {
        sortAndFilterProfiles();
    }, [profiles, sortBy, sortDirection, filterBy, friends]);
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">People</h1>
                    <p className="text-[#A6B1D0]">Connect with users from all around the world</p>
                </div>
                
                <form onSubmit={handleSearch} className="w-full md:w-auto flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1A1C2E] text-white border border-purple-900/20 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="bg-gradient-to-r from-[#20DDBB] to-[#0A947B] text-white font-medium py-2 px-6 rounded-xl hover:from-[#1CC9A8] hover:to-[#097E68] transition-all duration-300"
                    >
                        Search
                    </motion.button>
                </form>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    {/* Фильтры и результаты поиска */}
                    <div className="bg-[#1A1C2E]/50 p-4 rounded-xl mb-6 flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                            <AdjustmentsHorizontalIcon className="h-5 w-5 text-[#A6B1D0] mr-2" />
                            <span className="text-[#A6B1D0] hidden sm:inline">Filters:</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            <FilterDropdown 
                                options={[
                                    { value: 'name', label: 'Name' },
                                    { value: 'rating', label: 'Rating' },
                                    { value: 'followers', label: 'Followers' }
                                ]}
                                value={sortBy}
                                onChange={setSortBy}
                                label="Sort by"
                            />
                            
                            <FilterDropdown 
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'friends', label: 'Friends' },
                                    { value: 'new', label: 'New users' }
                                ]}
                                value={filterBy}
                                onChange={setFilterBy}
                                label="Show"
                            />
                            
                            <button
                                onClick={toggleSortDirection}
                                className="flex items-center justify-center bg-[#252742] hover:bg-[#323652] text-white p-2 rounded-lg transition-colors"
                            >
                                {sortDirection === 'asc' ? (
                                    <ArrowUpIcon className="w-5 h-5" />
                                ) : (
                                    <ArrowDownIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Сетка пользователей */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <UserCardSkeleton key={index} />
                            ))
                        ) : filteredProfiles.length > 0 ? (
                            filteredProfiles.map(profile => (
                                <UserCard
                                    key={profile.$id}
                                    user={profile}
                                    isFriend={isFriend(profile.user_id)}
                                    onAddFriend={handleAddFriend}
                                    onRemoveFriend={handleRemoveFriend}
                                    onRateUser={handleRateUser}
                                />
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                                <div className="text-gray-400 mb-4 text-6xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-400 text-xl mb-4">No users found</p>
                                <p className="text-gray-500 max-w-md">Try changing your search or filters to find people to connect with.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Кнопка "Загрузить еще" */}
                    {!isLoading && filteredProfiles.length > 0 && hasMoreProfiles && (
                        <div className="mt-8 text-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={loadMoreProfiles}
                                className="bg-[#1A1C2E] hover:bg-[#252742] text-white font-medium py-3 px-8 rounded-xl transition-colors inline-flex items-center"
                            >
                                {isLoadingMore ? (
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null}
                                Load more
                            </motion.button>
                        </div>
                    )}
                </div>
                
                {/* Боковая панель с топ-пользователями */}
                <div className="lg:col-span-1">
                    {isLoading ? (
                        <div className="bg-gradient-to-br from-[#1E2136] to-[#252742] rounded-2xl overflow-hidden shadow-lg border border-purple-900/10 animate-pulse h-96"></div>
                    ) : (
                        <TopRankingUsersPanel users={topRankedUsers} />
                    )}
                </div>
            </div>
        </div>
    );
}