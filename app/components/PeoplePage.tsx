"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { useUser } from '@/app/context/user';
import { checkAppwriteConfig } from '@/libs/AppWriteClient';
import Image from 'next/image';
import Link from 'next/link';
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
import { database } from '@/libs/AppWriteClient';

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
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleRateSubmit = () => {
        onRateUser(user.user_id, rating);
        setShowRatingModal(false);
        toast.success('Rating submitted successfully!');
    };

    // Get rating color based on value
    const getRatingColor = (rating: number) => {
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
                {/* Glowing effect on hover */}
                <motion.div 
                    className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{ 
                        opacity: isHovered ? [0, 0.5, 0.3] : 0, 
                        scale: isHovered ? [0.9, 1.05, 1] : 1 
                    }}
                    transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0, repeatType: 'reverse' }}
                />
                
                <div className="relative">
                    {/* Clickable area for profile navigation */}
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
                                    {/* Animated gradient ring */}
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
                                            src={imageError ? '/images/placeholder-user.jpg' : (user.image || '/images/placeholder-avatar.svg')}
                                            alt={user.name}
                                            fill
                                            className="rounded-full object-cover ring-2 ring-purple-500/50 shadow-lg"
                                            onError={() => setImageError(true)}
                                        />
                                        
                                        {/* Overlay on hover */}
                                        <motion.div 
                                            className="absolute inset-0 bg-gradient-to-t from-purple-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: isHovered ? 1 : 0 }}
                                        />
                                    </div>
                                </motion.div>
                                
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-colors truncate">
                                        {user.name}
                                        <span className={`ml-2 text-base ${getRatingColor(user.stats.averageRating)}`}>
                                            ★{user.stats.averageRating.toFixed(1)}
                                        </span>
                                    </h3>
                                    <p className="text-purple-400 font-medium truncate">@{user.username}</p>
                                    
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

                            <div className="mt-4 grid grid-cols-3 gap-3 text-center bg-[#1A1C2E] p-3 rounded-lg transition-colors">
                                <div className="flex flex-col">
                                    <p className="text-xl font-bold text-white">{user.stats.totalLikes}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Likes</p>
                                </div>
                                <div className="flex flex-col border-x border-gray-800">
                                    <p className="text-xl font-bold text-white">{user.stats.totalFollowers}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Followers</p>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-xl font-bold text-white">{user.stats.totalRatings}</p>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">Ratings</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Button actions are separate to avoid triggering the link */}
                    <div className="mt-6 flex space-x-3" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => isFriend ? onRemoveFriend(user.user_id) : onAddFriend(user.user_id)}
                            className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl transition-colors ${
                                isFriend 
                                    ? 'bg-red-600/80 text-white hover:bg-red-700' 
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
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
                            className="flex-1 flex items-center justify-center px-4 py-2.5 bg-[#1A1C2E] text-white rounded-xl hover:bg-[#24263A] transition-colors"
                        >
                            <StarIcon className="w-5 h-5 mr-2 text-yellow-400" />
                            Rate
                        </motion.button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showRatingModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowRatingModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#1E2136] to-[#2A2D45] p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl border border-purple-500/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Rate {user.name}</h3>
                                <button 
                                    onClick={() => setShowRatingModal(false)}
                                    className="text-gray-400 hover:text-white p-1"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex justify-center space-x-3 mb-8">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setRating(star)}
                                        className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-500'}`}
                                    >
                                        ★
                                    </motion.button>
                                ))}
                            </div>
                            
                            <p className="text-center text-gray-300 mb-6">
                                {rating === 0 && "Select a rating"}
                                {rating === 1 && "Poor - Needs significant improvement"}
                                {rating === 2 && "Fair - Below average"}
                                {rating === 3 && "Good - Average quality"}
                                {rating === 4 && "Great - Above average"}
                                {rating === 5 && "Excellent - Outstanding quality"}
                            </p>
                            
                            <div className="flex justify-end">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleRateSubmit}
                                    disabled={rating === 0}
                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    Submit Rating
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const RankingCard: React.FC<{ users: any[] }> = ({ users }) => {
    // Make sure we have an array before sorting
    const userArray = Array.isArray(users) ? users : [];
    
    // Sort users by rating
    const topUsers = [...userArray]
        .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
        .slice(0, 5);
    
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const handleImageError = (userId: string) => {
        setImageErrors(prev => ({
            ...prev,
            [userId]: true
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1E2136] to-[#2A2D45] rounded-xl p-6 shadow-xl border border-purple-900/20"
        >
            <h2 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center">
                <StarIcon className="w-5 h-5 mr-2 text-yellow-400" />
                Top Rated Users
            </h2>
            
            <div className="space-y-3">
                {topUsers.length > 0 ? (
                    topUsers.map((user, index) => (
                        <Link href={`/profile/${user.user_id}`} key={user.user_id || index}>
                            <motion.div 
                                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-[#252742] transition-all duration-300 cursor-pointer"
                                whileHover={{ 
                                    x: 5, 
                                    backgroundColor: "rgba(94, 84, 158, 0.1)",
                                    transition: { duration: 0.2 }
                                }}
                            >
                                <div className="w-8 h-8 flex items-center justify-center text-lg font-semibold bg-purple-500/10 text-purple-400 rounded-full">
                                    #{index + 1}
                                </div>
                                
                                <div className="relative w-10 h-10 flex-shrink-0">
                                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 opacity-75 blur-[1px]"></div>
                                    <Image
                                        src={imageErrors[user.user_id] ? '/images/placeholder-user.jpg' : (user.image || '/images/placeholder-avatar.svg')}
                                        alt={user.name || 'User'}
                                        fill
                                        className="rounded-full object-cover ring-1 ring-purple-500/50"
                                        onError={() => handleImageError(user.user_id)}
                                    />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400">{user.name || 'User'}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-400 text-sm">★ {user.stats?.averageRating?.toFixed(1) || '0.0'}</span> 
                                        <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        <span className="text-xs text-gray-400">{user.stats?.totalFollowers || 0} followers</span>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))
                ) : (
                    <div className="bg-[#1A1C2E] rounded-xl p-6 text-center">
                        <p className="text-gray-400">No users to display</p>
                    </div>
                )}
            </div>
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

export default function PeoplePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('latest');
    const [filterFriends, setFilterFriends] = useState('all');
    const [isSearching, setIsSearching] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    
    const user = useUser();
    const { addFriend, removeFriend, friends, loadFriends } = useFriendsStore();
    const { profiles, loading, getAllProfiles, searchProfiles } = useProfileStore();

    useEffect(() => {
        // Check Appwrite configuration
        const appwriteConfig = checkAppwriteConfig();
        console.log('Appwrite configuration check result:', appwriteConfig);
        
        if (!appwriteConfig.isValid) {
            const errorMsg = `Appwrite configuration error: Missing ${appwriteConfig.missingVars.join(', ')}`;
            console.error(errorMsg);
            setConfigError(errorMsg);
            toast.error('Configuration error detected. Check console for details.');
            return;
        }
        
        const initializeData = async () => {
            try {
                console.log('Initializing data in PeoplePage');
                await Promise.all([loadUsers(), loadFriends()]);
            } catch (error) {
                console.error('Error initializing data:', error);
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
            console.log('Loading users, page:', page);
            
            if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                console.error('Missing environment variables required to load profiles');
                toast.error('Configuration error: Missing environment variables');
                return;
            }
            
            console.log('Вызываем getAllProfiles с параметром page =', page);
            const profiles = await getAllProfiles(page);
            console.log(`Loaded ${profiles.length} profiles`);
            
            if (profiles.length === 0) {
                console.warn('No profiles were loaded. Checking database connection and collection...');
                try {
                    const response = await database.listDocuments(
                        process.env.NEXT_PUBLIC_DATABASE_ID,
                        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                        []
                    );
                    console.log('Raw database response:', response);
                    console.log(`Total documents in collection: ${response.total}`);
                } catch (dbError) {
                    console.error('Database connection error:', dbError);
                }
            }
            
            return profiles;
        } catch (error) {
            console.error('Error loading profiles:', error);
            setError('Failed to load profiles. Please try again.');
            return [];
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            loadUsers();
            return;
        }
        
        setIsSearching(true);
        try {
            await searchProfiles(searchQuery);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        try {
            await addFriend(userId);
            toast.success('Friend added successfully!');
        } catch (error) {
            toast.error('Failed to add friend. Please try again.');
        }
    };

    const handleRemoveFriend = async (userId: string) => {
        try {
            await removeFriend(userId);
            toast.success('Friend removed successfully!');
        } catch (error) {
            toast.error('Failed to remove friend. Please try again.');
        }
    };

    const handleRateUser = async (userId: string, rating: number) => {
        try {
            // Add logic here to rate the user
            console.log(`Rating user ${userId} with ${rating} stars`);
            toast.success('Rating submitted successfully!');
        } catch (error) {
            toast.error('Failed to submit rating. Please try again.');
        }
    };

    const isFriend = (userId: string) => {
        return friends.some(friend => friend.friendId === userId);
    };

    // Filter and sort profiles
    const filteredProfiles = useMemo(() => {
        if (!profiles || profiles.length === 0) return [];
        
        let result = [...profiles];
        
        // Apply friend filter
        if (filterFriends === 'friends') {
            result = result.filter(profile => isFriend(profile.user_id));
        } else if (filterFriends === 'non-friends') {
            result = result.filter(profile => !isFriend(profile.user_id));
        }
        
        // Apply sorting
        if (sortBy === 'latest') {
            // Already sorted by creation date in the API
        } else if (sortBy === 'rating-high') {
            result.sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0));
        } else if (sortBy === 'rating-low') {
            result.sort((a, b) => (a.stats?.averageRating || 0) - (b.stats?.averageRating || 0));
        } else if (sortBy === 'followers') {
            result.sort((a, b) => (b.stats?.totalFollowers || 0) - (a.stats?.totalFollowers || 0));
        } else if (sortBy === 'alphabetical') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return result;
    }, [profiles, sortBy, filterFriends, friends]);

    const loadMoreProfiles = () => {
        setPage(prevPage => prevPage + 1);
    };

    const sortOptions = [
        { value: 'latest', label: 'Latest' },
        { value: 'rating-high', label: 'Highest Rating' },
        { value: 'rating-low', label: 'Lowest Rating' },
        { value: 'followers', label: 'Most Followers' },
        { value: 'alphabetical', label: 'A to Z' },
    ];

    const filterOptions = [
        { value: 'all', label: 'All Users' },
        { value: 'friends', label: 'Friends Only' },
        { value: 'non-friends', label: 'Non-Friends' },
    ];

    return (
        <div className="min-h-screen">
            {/* Error messages */}
            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500 bg-opacity-20 border border-red-500 text-white p-4 rounded-lg mb-6"
                >
                    <p>{error}</p>
                </motion.div>
            )}
            
            {/* Search and filter section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h1 className="text-4xl font-bold text-white">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                                People
                            </span>
                        </h1>
                        <p className="text-gray-400 mt-1">Connect with users from all around the world</p>
                    </motion.div>
                    
                    <form onSubmit={handleSearch} className="flex-1 max-w-md">
                        <div className="relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center"
                            >
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search people..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-3 pl-12 pr-16 rounded-xl bg-[#1A1C2E] border border-[#2A2B3F] focus:border-purple-500 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    className="ml-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-3 rounded-xl hover:opacity-90 transition-opacity"
                                    disabled={isSearching}
                                >
                                    {isSearching ? (
                                        <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <span>Search</span>
                                    )}
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="ml-2 p-3 bg-[#1A1C2E] border border-[#2A2B3F] text-white rounded-xl hover:bg-[#252742] transition-colors"
                                >
                                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                                </motion.button>
                            </motion.div>
                        </div>
                    </form>
                </div>
                
                {/* Filters */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden bg-[#1A1C2E] rounded-xl p-4 md:p-6 mb-6 border border-[#2A2B3F]"
                        >
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                                    <div className="relative">
                                        <select 
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="block w-full px-4 py-2.5 bg-[#252742] border border-[#383B5A] rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        >
                                            {sortOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Filter By</label>
                                    <div className="relative">
                                        <select 
                                            value={filterFriends}
                                            onChange={(e) => setFilterFriends(e.target.value)}
                                            className="block w-full px-4 py-2.5 bg-[#252742] border border-[#383B5A] rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        >
                                            {filterOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Users grid */}
                <div className="lg:col-span-3">
                    {loading && page === 1 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <UserCardSkeleton key={i} />)}
                        </div>
                    ) : filteredProfiles.length > 0 ? (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ staggerChildren: 0.1 }}
                                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                            >
                                {filteredProfiles.map((profile, index) => (
                                    <motion.div
                                        key={profile.$id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <UserCard
                                            user={profile}
                                            isFriend={isFriend(profile.user_id)}
                                            onAddFriend={handleAddFriend}
                                            onRemoveFriend={handleRemoveFriend}
                                            onRateUser={handleRateUser}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                            
                            {/* Load more button */}
                            {!isSearching && (
                                <div className="mt-8 text-center">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={loadMoreProfiles}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl inline-flex items-center space-x-2 disabled:opacity-50 transition-colors shadow-lg"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Loading more users...
                                            </>
                                        ) : (
                                            <>
                                                <span>Load More Users</span>
                                                <ArrowDownIcon className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            )}
                        </>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-[#1E2136] to-[#252742] rounded-xl p-8 text-center shadow-xl"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/10 rounded-full flex items-center justify-center">
                                <XMarkIcon className="w-8 h-8 text-purple-400" />
                            </div>
                            <p className="text-gray-300 mb-4 text-lg">No users found</p>
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        loadUsers();
                                    }}
                                    className="text-purple-400 hover:text-purple-300 underline transition-colors"
                                >
                                    Clear search and try again
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
                
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <RankingCard users={profiles} />
                    
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-[#1E2136] to-[#2A2D45] rounded-xl p-6 shadow-xl border border-purple-900/20"
                    >
                        <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Quick Stats</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-4 bg-[#1A1C2E] rounded-xl hover:bg-[#252742] transition-colors">
                                <span className="text-gray-300">Total Users</span>
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">{profiles.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-[#1A1C2E] rounded-xl hover:bg-[#252742] transition-colors">
                                <span className="text-gray-300">Your Friends</span>
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">{friends.length}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}