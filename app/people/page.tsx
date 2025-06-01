"use client";

import React, { useState, useEffect, useMemo, useCallback, useContext, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendsStore } from '@/app/stores/friends';
import { useProfileStore } from '@/app/stores/profile';
import { useUser } from '@/app/context/user';
import { checkAppwriteConfig } from '@/libs/AppWriteClient';
import Image from 'next/image';
import Link from 'next/link';
import TopRankingUsers from '@/app/components/profile/TopRankingUsers';
import Banner from '@/app/components/ads/Banner';
import dynamic from 'next/dynamic';
import styles from './styles.module.css';
import { 
  StarIcon, 
  UserPlusIcon, 
  UserMinusIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon, 
  ArrowDownIcon,
  XMarkIcon,
  ChevronDownIcon,
  UsersIcon,
  HeartIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { database, Query } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useRouter, usePathname } from 'next/navigation';
import { FaTrophy, FaStar, FaMedal, FaCrown } from 'react-icons/fa';
import PeopleLayout from '@/app/layouts/PeopleLayout';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import { useMediaQuery } from 'react-responsive';
import { useInView } from 'react-intersection-observer';
import { useVirtualizer } from '@tanstack/react-virtual';
import UserCardSkeleton from '@/app/components/skeletons/UserCardSkeleton';

// Динамический импорт иконок
const StarIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.StarIcon));
const UserPlusIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.UserPlusIcon));
const UserMinusIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.UserMinusIcon));
const MagnifyingGlassIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.MagnifyingGlassIcon));
const AdjustmentsHorizontalIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.AdjustmentsHorizontalIcon));
const ArrowUpIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.ArrowUpIcon));
const ArrowDownIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.ArrowDownIcon));
const XMarkIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.XMarkIcon));
const ChevronDownIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.ChevronDownIcon));
const UsersIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.UsersIcon));
const HeartIconDynamic = dynamic(() => import('@heroicons/react/24/solid').then(mod => mod.HeartIcon));

// Модифицируем наш хук для ГАРАНТИРОВАННОГО перехода
function useSafeNavigation() {
  // Используем только прямой переход через window.location
  const navigateTo = useCallback((path: string) => {
    console.log("[DEBUG] Directly navigating to:", path);
    // Используем прямую навигацию без try/catch - просто делаем переход
    window.location.href = path;
  }, []);
  
  return { navigateTo };
}

// Определение типов для табов
const TabTypes = {
  USERS: 'users',
  ARTISTS: 'artists'
} as const;

type TabType = typeof TabTypes[keyof typeof TabTypes];

// Компонент кнопки таба
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-all ${
      active
        ? 'text-white bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 rounded-lg border border-[#20DDBB]/30'
        : 'text-gray-400 hover:text-white'
    }`}
  >
    {label}
  </button>
);

// Компонент звездного рейтинга
const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <StarIconDynamic key={`full-${i}`} className="w-3 h-3 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative w-3 h-3 overflow-hidden">
          <StarIconDynamic className="absolute w-3 h-3 text-gray-400" />
          <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
            <StarIconDynamic className="absolute w-3 h-3 text-yellow-400" />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <StarIconDynamic key={`empty-${i}`} className="w-3 h-3 text-gray-400" />
      ))}
    </div>
  );
};

// Fix the UserCardProps interface
interface UserCardProps {
    user: {
        $id: string;
        user_id: string;
        name: string;
        username?: string;
        image: string;
        bio: string;
        total_followers?: string | number;
        total_likes?: string | number;
        average_rating?: string | number;
        total_ratings?: string | number;
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

// Компонент UserCard - сделаем всю карточку кликабельной и упростим навигацию
const UserCard: React.FC<UserCardProps> = ({ user, isFriend, onAddFriend, onRemoveFriend, onRateUser }) => {
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { navigateTo } = useSafeNavigation();
    
    // Получаем доступ к глобальному состоянию поиска
    const searchContext = useContext(React.createContext<string>('')); // Можно заменить на актуальный контекст поиска
    
    // Исправляем отображение числовых значений
    const getNumericValue = (value: any): number => {
        if (typeof value === 'string') return parseInt(value, 10) || 0;
        if (typeof value === 'number') return value;
        return 0;
    };
    
    // Get numeric rating value
    const getNumericRating = (rating: any): number => {
        if (typeof rating === 'string') return parseFloat(rating) || 0;
        if (typeof rating === 'number') return rating;
        return 0;
    };
    
    // Get formatted rating for display
    const getRatingDisplay = (rating: any): string => {
        return getNumericRating(rating).toFixed(1);
    };
    
    // Обеспечиваем наличие статистики и корректно получаем данные рейтинга
    const totalFollowers = getNumericValue(user.total_followers || (user.stats?.totalFollowers || 0));
    const totalLikes = getNumericValue(user.total_likes || (user.stats?.totalLikes || 0));
    const totalRatings = getNumericValue(user.total_ratings || (user.stats?.totalRatings || 0));
    const numericRating = getNumericRating(user.average_rating || (user.stats?.averageRating || 0));
    
    // Update local state when user props change
    useEffect(() => {
        // This ensures that when the user data changes (e.g., after a new rating is submitted),
        // the displayed rating is updated accordingly
        setRating(numericRating);
    }, [user.average_rating, user.stats?.averageRating, numericRating]);
    
    // Improved function to get color based on rating - без красного фона
    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'from-yellow-400 to-yellow-600';
        if (rating >= 3.5) return 'from-teal-400 to-emerald-600';
        if (rating >= 2.5) return 'from-blue-400 to-indigo-600';
        if (rating >= 1.5) return 'from-purple-400 to-pink-600';
        return 'from-gray-400 to-gray-600'; // Заменили красный на серый
    };
    
    // Функция для определения уровня пользователя
    const getUserRank = (rating: number, followers: number) => {
        if (rating >= 4.5 && followers >= 100) return "Musical Legend";
        if (rating >= 4.0 && followers >= 50) return "Pro Artist";
        if (rating >= 3.5 && followers >= 20) return "Rising Star";
        if (rating >= 3.0) return "Talented";
        if (rating >= 2.0) return "Enthusiast";
        return "Beginner";
    };
    
    // Get rank badge color
    const getRankBadgeColor = (rank: string) => {
        switch(rank) {
            case "Musical Legend": return "bg-gradient-to-r from-yellow-400 to-amber-600 border-yellow-300";
            case "Pro Artist": return "bg-gradient-to-r from-cyan-500 to-blue-600 border-blue-300";
            case "Rising Star": return "bg-gradient-to-r from-purple-500 to-pink-600 border-pink-300";
            case "Talented": return "bg-gradient-to-r from-teal-500 to-emerald-600 border-emerald-300";
            case "Enthusiast": return "bg-gradient-to-r from-blue-400 to-indigo-600 border-indigo-300";
            default: return "bg-gradient-to-r from-gray-500 to-slate-600 border-gray-400";
        }
    };
    
    // Получаем данные для отображения
    const userRank = getUserRank(numericRating, totalFollowers);
    const rankBadgeColor = getRankBadgeColor(userRank);
    
    // Обработчик для прямого рейтинга по звездам
    const handleStarClick = (value: number) => {
        // Update local component state immediately for visual feedback
        setRating(value);
        setHoverRating(value);
        
        // Then trigger the API call
        onRateUser(user.user_id, value);
    };
    
    // Упрощенная навигация на профиль - самый прямой способ
    const navigateToProfile = () => {
        window.location.href = `/profile/${user.user_id}`;
    };
    
    // Обработчик добавления/удаления друзей с предотвращением всплытия
    const handleFriendAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            isFriend ? onRemoveFriend(user.user_id) : onAddFriend(user.user_id);
        } catch (error) {
            console.error('Friend action error:', error);
        }
    };
    
    // Обработчик рейтинга с предотвращением всплытия
    const handleRatingClick = (e: React.MouseEvent, value: number) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Set local state immediately for visual feedback
        setRating(value);
        setHoverRating(value);
        
        handleStarClick(value);
    };
    
    return (
        <motion.div
            className={`group ${styles.userCard}`}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            initial={false}
            transition={{ 
                duration: 0.2,
                layout: { duration: 0 }
            }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={navigateToProfile}
        >
            {/* Background image with darkening */}
            <div className="absolute inset-0 w-full h-full">
                <Image
                    src={imageError ? '/images/placeholders/music-user-placeholder.svg' : 
                        (user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/music-user-placeholder.svg')}
                    alt={user.name}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                />
                <div className={styles.cardBackground} />
            </div>
            
            {/* Glass overlay */}
            <div className={`${styles.cardGlass} group-hover:opacity-60`} />
            
            {/* User rank badge */}
            <div className="absolute top-3 left-3 z-10">
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold text-white border ${rankBadgeColor} shadow-lg`}>
                    {userRank}
                </span>
            </div>
            
            {/* Interactive star rating */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end">
                <div className="bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                            key={star}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleRatingClick(e, star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 focus:outline-none"
                        >
                            <StarIconDynamic 
                                className={`w-4 h-4 ${
                                    (hoverRating > 0 ? star <= hoverRating : (star <= numericRating || star <= rating)) 
                                        ? 'text-yellow-400' 
                                        : 'text-gray-600'
                                } transition-all duration-200`} 
                            />
                        </motion.button>
                    ))}
                </div>
                <div className="mt-1 bg-black/30 backdrop-blur-md rounded-full px-2 py-0.5 text-center border border-white/10 shadow-lg">
                    <div className="flex items-center gap-1">
                        <StarIconDynamic className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs font-medium text-white/90">
                            {hoverRating > 0 ? hoverRating.toFixed(1) : numericRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-white/60">({totalRatings})</span>
                    </div>
                </div>
            </div>
            
            {/* Content area с информацией о пользователе */}
            <div className="absolute bottom-0 left-0 right-0 cursor-pointer z-10">
                <div className="backdrop-blur-md bg-black/30 border-t border-white/10 p-4 transition-all duration-300 bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-pink-900/40">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-colors">
                            {user.name}
                        </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-white/80 text-sm">
                        <div className="flex items-center">
                            <UsersIconDynamic className="w-4 h-4 mr-1 text-purple-400" />
                            {totalFollowers}
                        </div>
                        <div className="flex items-center">
                            <HeartIconDynamic className="w-4 h-4 mr-1 text-pink-400" />
                            {totalLikes}
                        </div>
                        <div className="flex items-center">
                            <StarIconDynamic className="w-4 h-4 mr-1 text-yellow-400" />
                            {totalRatings}
                        </div>
                    </div>
                    
                    {/* Bio with height limit */}
                    <div className="mt-2 text-white/90 text-sm line-clamp-2 h-10 overflow-hidden">
                        {user.bio || "No bio available."}
                    </div>
                </div>
            </div>
            
            {/* Add/Remove friend button at bottom - с предотвращением всплытия */}
            <div className="absolute bottom-4 right-4 z-20">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFriendAction}
                    className={`backdrop-blur-lg border border-white/20 rounded-full p-2.5 transition-colors duration-200 shadow-lg ${
                        isFriend 
                            ? 'bg-gradient-to-r from-pink-600/40 to-purple-600/40 hover:from-pink-600/60 hover:to-purple-600/60 text-white' 
                            : 'bg-gradient-to-r from-cyan-600/40 to-teal-600/40 hover:from-cyan-600/60 hover:to-teal-600/60 text-white'
                    }`}
                >
                    {isFriend ? <UserMinusIconDynamic className="w-5 h-5" /> : <UserPlusIconDynamic className="w-5 h-5" />}
                </motion.button>
            </div>
        </motion.div>
    );
};

// Мемоизированная версия UserCard для предотвращения лишних ререндеров
const MemoizedUserCard = React.memo(UserCard);

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
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2.5 rounded-lg text-sm text-white/90 border border-white/10 transition-all duration-200 shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-purple-300">{label}:</span>
                <span className="font-medium">{options.find(opt => opt.value === value)?.label}</span>
                <ChevronDownIconDynamic className="w-4 h-4 text-purple-300" />
            </button>
            
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-gradient-to-br from-[#1E2136] to-[#141625] rounded-xl py-2 shadow-xl border border-white/10 z-50"
                >
                    {options.map(option => (
                        <button
                            key={option.value}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${option.value === value ? 'text-[#20DDBB] font-medium' : 'text-white/80'}`}
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

// Добавляем компонент загрузки для иконок
const IconLoading = () => (
  <div className="animate-pulse w-5 h-5 bg-gray-300/20 rounded-full"></div>
);

// Обновляем использование иконок, добавляя Suspense
const IconWithFallback = ({ Icon }: { Icon: any }) => (
  <Suspense fallback={<IconLoading />}>
    <Icon className="w-5 h-5" />
  </Suspense>
);

// Constants for optimization
const INITIAL_PAGE_SIZE = 6;
const LOAD_MORE_SIZE = 6;
const SCROLL_THRESHOLD = 0.5;

// Add cache utility
const useProfilesCache = () => {
    const cacheRef = useRef(new Map());
    
    const setCache = useCallback((key: string, data: any) => {
        cacheRef.current.set(key, {
            data,
            timestamp: Date.now()
        });
    }, []);
    
    const getCache = useCallback((key: string) => {
        const cached = cacheRef.current.get(key);
        if (!cached) return null;
        
        // Cache expires after 5 minutes
        if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
            cacheRef.current.delete(key);
            return null;
        }
        
        return cached.data;
    }, []);
    
    return { setCache, getCache };
};

export default function People() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
    const [topRankedUsers, setTopRankedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterBy, setFilterBy] = useState('all');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>(TabTypes.USERS);
    const [showRanking, setShowRanking] = useState(false);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const [isIconsLoaded, setIconsLoaded] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [visibleProfiles, setVisibleProfiles] = useState<any[]>([]);
    const { ref: loadMoreRef, inView } = useInView({
        threshold: SCROLL_THRESHOLD,
        triggerOnce: false
    });
    const { setCache, getCache } = useProfilesCache();
    const parentRef = useRef<HTMLDivElement>(null);
    const allProfilesRef = useRef<any[]>([]);
    
    const { friends, loadFriends, addFriend, removeFriend, sentRequests, loadSentRequests } = useFriendsStore();
    const user = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const { navigateTo } = useSafeNavigation();
    
    // Virtualized list setup
    const rowVirtualizer = useVirtualizer({
        count: visibleProfiles.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 380, // Height of each card
        overscan: 5
    });

    // Optimized load users function
    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            
            // Try to get from cache first
            const cached = getCache('initial_profiles');
            if (cached) {
                console.log("[DEBUG] Using cached profiles");
                setProfiles(cached);
                setFilteredProfiles(cached);
                setVisibleProfiles(cached.slice(0, INITIAL_PAGE_SIZE));
                setIsLoading(false);
                return;
            }
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.limit(50)] // Load more initially but show less
            );
            
            const loadedProfiles = response.documents.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name || 'Unknown User',
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                total_likes: doc.total_likes || '0',
                total_followers: doc.total_followers || '0',
                average_rating: doc.average_rating || '0',
                total_ratings: doc.total_ratings || '0',
                stats: {
                    totalLikes: typeof doc.total_likes === 'string' ? parseInt(doc.total_likes, 10) : 0,
                    totalFollowers: typeof doc.total_followers === 'string' ? parseInt(doc.total_followers, 10) : 0,
                    averageRating: typeof doc.average_rating === 'string' ? parseFloat(doc.average_rating) : 0,
                    totalRatings: typeof doc.total_ratings === 'string' ? parseInt(doc.total_ratings, 10) : 0
                }
            }));
            
            setCache('initial_profiles', loadedProfiles);
            setProfiles(loadedProfiles);
            setFilteredProfiles(loadedProfiles);
            setVisibleProfiles(loadedProfiles.slice(0, INITIAL_PAGE_SIZE));
            allProfilesRef.current = loadedProfiles;
        } catch (error) {
            console.error('[ERROR] Error loading users:', error);
            setError('Failed to load users. Please try again later.');
            
            if (profiles.length > 0) {
                setFilteredProfiles(profiles);
                setVisibleProfiles(profiles.slice(0, INITIAL_PAGE_SIZE));
            }
        } finally {
            setIsLoading(false);
        }
    }, [setCache, getCache]);

    // Load more profiles when scrolling
    const loadMoreProfiles = useCallback(() => {
        if (isLoadingMore || !hasMoreProfiles) return;
        
        const currentLength = visibleProfiles.length;
        const nextProfiles = filteredProfiles.slice(
            currentLength,
            currentLength + LOAD_MORE_SIZE
        );
        
        if (nextProfiles.length > 0) {
            setVisibleProfiles(prev => [...prev, ...nextProfiles]);
        } else {
            setHasMoreProfiles(false);
        }
    }, [filteredProfiles, visibleProfiles.length, isLoadingMore, hasMoreProfiles]);

    // Watch for scroll and load more
    useEffect(() => {
        if (inView && !isLoading) {
            loadMoreProfiles();
        }
    }, [inView, isLoading, loadMoreProfiles]);

    // Optimized search function with debounce
    const debouncedSearch = useCallback(
        debounce((text: string) => {
            if (!text.trim()) {
                setFilteredProfiles(profiles);
                setVisibleProfiles(profiles.slice(0, INITIAL_PAGE_SIZE));
                return;
            }

            const searchTerms = text.trim().toLowerCase().split(/\s+/);
            const results = profiles.filter(profile => {
                if (!profile) return false;
                
                const name = (profile.name || '').toLowerCase();
                const username = (profile.username || '').toLowerCase();
                const bio = (profile.bio || '').toLowerCase();
                
                return searchTerms.every(term => 
                    name.includes(term) || 
                    username.includes(term) || 
                    bio.includes(term)
                );
            });
            
            setFilteredProfiles(results);
            setVisibleProfiles(results.slice(0, INITIAL_PAGE_SIZE));
        }, 300),
        [profiles]
    );

    // Update visible profiles when filters change
    useEffect(() => {
        setVisibleProfiles(filteredProfiles.slice(0, INITIAL_PAGE_SIZE));
    }, [sortBy, sortDirection, filterBy]);

    // Handle search input
    const handleSearchInput = (text: string) => {
        setSearchQuery(text);
        debouncedSearch(text);
    };

    // Handle search form submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        debouncedSearch(searchQuery);
    };

    // Добавим useEffect для отслеживания состояния навигации
    useEffect(() => {
        // Логирование при монтировании компонента
        console.log("[DEBUG] People page mounted");
        
        // Очистка при размонтировании
        return () => {
            console.log("[DEBUG] People page unmounted");
        };
    }, []);

    // Добавим перехват ошибок навигации
    useEffect(() => {
        const handleRouteChange = (url: string) => {
            console.log("[DEBUG] Route changing to:", url);
        };

        // В Next.js App Router нет events API, но можем использовать 
        // window.addEventListener для отслеживания изменений URL
        window.addEventListener('popstate', () => {
            console.log("[DEBUG] popstate event occurred - URL changed");
        });

        return () => {
            window.removeEventListener('popstate', () => {
                console.log("[DEBUG] Cleanup popstate event listener");
            });
        };
    }, []);
    
    // Toggle sort direction
    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };
    
    // Проверяем, является ли пользователь другом или есть ли отправленный запрос
    const isFriend = (userId: string) => {
        return friends.some(friend => friend.friendId === userId) || 
               sentRequests.some(request => request.friendId === userId);
    };
    
    // Рейтинг пользователя
    const handleRateUser = async (userId: string, rating: number) => {
        if (!user?.user?.id) {
            toast.error('You need to be logged in to rate users');
            return;
        }
        
        try {
            // Immediately update the UI for better user experience
            // Update the profile in the local state to show the new rating immediately
            setProfiles(prevProfiles => 
                prevProfiles.map(profile => {
                    if (profile.user_id === userId) {
                        // Calculate new average rating
                        const prevTotalRatings = parseInt(profile.total_ratings as string) || profile.stats.totalRatings || 0;
                        const prevAverage = parseFloat(profile.average_rating as string) || profile.stats.averageRating || 0;
                        
                        let newAverage = prevAverage;
                        let newTotalRatings = prevTotalRatings;
                        
                        // If this is a new rating, calculate new average
                        if (prevTotalRatings === 0) {
                            newAverage = rating;
                            newTotalRatings = 1;
                        } else {
                            // Assume this is an update to an existing rating
                            // (a simple approach that works for UI updates)
                            newAverage = rating;
                        }
                        
                        // Update both the direct fields and the stats object
                        return {
                            ...profile,
                            average_rating: newAverage.toFixed(2),
                            total_ratings: newTotalRatings.toString(),
                            stats: {
                                ...profile.stats,
                                averageRating: newAverage,
                                totalRatings: newTotalRatings
                            }
                        };
                    }
                    return profile;
                })
            );
            
            // Also update filtered profiles
            setFilteredProfiles(prevProfiles => 
                prevProfiles.map(profile => {
                    if (profile.user_id === userId) {
                        // Calculate new average rating
                        const prevTotalRatings = parseInt(profile.total_ratings as string) || profile.stats.totalRatings || 0;
                        const prevAverage = parseFloat(profile.average_rating as string) || profile.stats.averageRating || 0;
                        
                        let newAverage = prevAverage;
                        let newTotalRatings = prevTotalRatings;
                        
                        // If this is a new rating, calculate new average
                        if (prevTotalRatings === 0) {
                            newAverage = rating;
                            newTotalRatings = 1;
                        } else {
                            // Assume this is an update to an existing rating
                            newAverage = rating;
                        }
                        
                        // Update both the direct fields and the stats object
                        return {
                            ...profile,
                            average_rating: newAverage.toFixed(2),
                            total_ratings: newTotalRatings.toString(),
                            stats: {
                                ...profile.stats,
                                averageRating: newAverage,
                                totalRatings: newTotalRatings
                            }
                        };
                    }
                    return profile;
                })
            );
            
            // Сначала проверяем, не оценивал ли уже пользователь
            const existingRating = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                [
                    Query.equal('userId', userId),
                    Query.equal('raterId', user.user.id)
                ]
            );

            if (existingRating.documents.length > 0) {
                // Обновляем существующий рейтинг
                await database.updateDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                    existingRating.documents[0].$id,
                    {
                        rating: rating,
                        updatedAt: new Date().toISOString()
                    }
                );
                toast.success('Rating updated successfully!');
            } else {
                // Создаем новый рейтинг
                await database.createDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                    ID.unique(),
                    {
                        userId: userId,
                        raterId: user.user.id,
                        rating: rating,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                );
                toast.success('Rating submitted successfully!');
            }
            
            // Обновляем статистику пользователя
            await updateUserStats(userId);
            
            // Reload users in the background without blocking UI
            // We already updated the UI above for immediate feedback
            loadUsers().catch(err => console.error('Error reloading users:', err));
            loadTopUsers().catch(err => console.error('Error reloading top users:', err));
        } catch (error) {
            console.error('Error rating user:', error);
            toast.error('Failed to submit rating. Please try again.');
        }
    };
    
    // Обновление статистики пользователя
    const updateUserStats = async (userId: string) => {
        try {
            // Получаем все рейтинги пользователя
            const ratings = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
                [Query.equal('userId', userId)]
            );
            
            // Вычисляем средний рейтинг
            const totalRatings = ratings.documents.length;
            let averageRating = 0;
            
            if (totalRatings > 0) {
                const sum = ratings.documents.reduce((acc, curr) => {
                    const rating = typeof curr.rating === 'string' ? parseFloat(curr.rating) : curr.rating;
                    return acc + rating;
                }, 0);
                
                averageRating = sum / totalRatings;
            }
            
            // Обновляем профиль пользователя
            // Сначала нужно найти профиль по userId
            const profiles = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.equal('user_id', userId)]
            );
            
            if (profiles.documents.length > 0) {
                const profileId = profiles.documents[0].$id;
                
                // Обновляем статистику - используем правильные имена полей из схемы базы данных
                await database.updateDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    profileId,
                    {
                        'average_rating': averageRating.toFixed(2),
                        'total_ratings': totalRatings.toString()
                    }
                );
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    };
    
    // Загрузка новых рейтингов при смене таба
    useEffect(() => {
        loadTopUsers();
    }, [activeTab]);
    
    // Загрузка рейтинга топ-пользователей с использованием реальных данных
    const loadTopUsers = async () => {
        try {
            // Выбираем коллекцию в зависимости от активного таба
            const collectionId = activeTab === TabTypes.ARTISTS 
                ? process.env.NEXT_PUBLIC_COLLECTION_ID_ARTIST_PROFILE! 
                : process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!;
            
            // Сортируем по average_rating (строка в базе)
            const sortField = 'average_rating';
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                collectionId,
                [
                    Query.orderDesc(sortField),
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
                    totalLikes: typeof doc.total_likes === 'string' ? parseInt(doc.total_likes, 10) : (doc.total_likes || 0),
                    totalFollowers: typeof doc.total_followers === 'string' ? parseInt(doc.total_followers, 10) : (doc.total_followers || 0),
                    averageRating: typeof doc.average_rating === 'string' ? parseFloat(doc.average_rating) : (doc.average_rating || 0),
                    totalRatings: typeof doc.total_ratings === 'string' ? parseInt(doc.total_ratings, 10) : (doc.total_ratings || 0),
                    artistScore: typeof doc.artistScore === 'string' ? parseFloat(doc.artistScore) : (doc.artistScore || 0)
                }
            }));
            
            setTopRankedUsers(topUsers);
            console.log('Loaded top users:', topUsers);
        } catch (error) {
            console.error('Error loading top users:', error);
        }
    };
    
    // Handle add friend
    const handleAddFriend = async (userId: string) => {
        try {
            await addFriend(userId);
            toast.success('Friend request sent!');
        } catch (error) {
            console.error('Error adding friend:', error);
            toast.error('Failed to send friend request. Please try again.');
        }
    };
    
    // Handle remove friend
    const handleRemoveFriend = async (userId: string) => {
        try {
            await removeFriend(userId);
            toast.success('Friend removed successfully.');
        } catch (error) {
            console.error('Error removing friend:', error);
            toast.error('Failed to remove friend. Please try again.');
        }
    };
    
    // Load initial data
    useEffect(() => {
        const initializeData = async () => {
            try {
                // Check if Appwrite is configured
                await checkAppwriteConfig();
                
                // Load data asynchronously
                await Promise.all([
                    loadUsers(),
                    loadFriends(),
                    loadSentRequests(),
                    loadTopUsers()
                ]);
            } catch (error) {
                console.error('Initialization error:', error);
                setError('Failed to initialize app. Please try again later.');
            }
        };
        
        initializeData();
    }, []);
    
    // Улучшенная версия для надежной навигации
    const handleSearchResultClick = (result: any) => {
            if (result.type === 'profile') {
            navigateTo(`/profile/${result.user_id}`);
        } else if (result.type === 'track') {
            navigateTo(`/post/${result.user_id}/${result.id}`);
        } else if (result.type === 'vibe') {
            navigateTo(`/vibe/${result.id}`);
        }
    };

    // Handle hydration
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Handle icons loading
    useEffect(() => {
        Promise.all([
            import('@heroicons/react/24/solid'),
            // Add other dynamic imports here
        ]).then(() => {
            setIconsLoaded(true);
        });
    }, []);

    // Initial loading state
    if (!isHydrated || !isIconsLoaded) {
        return (
            <div className={styles.container}>
                <div className={styles.pageContent}>
                    <div className={`${styles.loadingPulse} space-y-4`}>
                        <div className="h-12 bg-white/5 rounded-lg w-full max-w-md"></div>
                        <div className={styles.grid}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={styles.loadingCard}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PeopleLayout>
            <div className={styles.container}>
                <div className={styles.pageContent}>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    {/* Верхний баннер */}
                    <div className="mb-6 w-full flex justify-center">
                        <div className="overflow-hidden rounded-xl">
                            <Banner 
                                adKey="C6AILKQE" 
                                adHeight={90} 
                                adWidth={728} 
                                adFormat="iframe"
                            />
                        </div>
                    </div>
                    
                    {/* Второй баннер */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 overflow-hidden rounded-xl">
                            <Banner 
                                adKey="C6AIL5QE" 
                                adHeight={250} 
                                adWidth={970} 
                                adFormat="iframe"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                        <div className="lg:col-span-3">
                            {/* Упрощенный блок фильтров без фоновой панели */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="mb-6 sticky top-0 z-40 bg-gradient-to-r from-[#252840]/90 to-[#1E2136]/90 shadow-md rounded-b-xl px-2 py-2"
                            >
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Поисковая строка и фильтры */}
                                    <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 min-w-[250px]">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <MagnifyingGlassIconDynamic className="h-5 w-5 text-[#20DDBB]" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search people..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearchInput(e.target.value)}
                                                className="w-full bg-white/5 backdrop-blur-md text-white border border-[#20DDBB]/20 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#20DDBB]/50 focus:border-transparent shadow-md"
                                            />
                                            {isSearching && (
                                                <div className="absolute inset-y-0 right-3 flex items-center">
                                                    <div className="animate-spin h-4 w-4 border-2 border-[#20DDBB] border-t-transparent rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            type="submit"
                                            className="bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] text-white font-medium py-2.5 px-6 rounded-xl hover:shadow-lg hover:shadow-[#20DDBB]/20 transition-all duration-300"
                                        >
                                            Search
                                        </motion.button>
                                    </form>
                                    
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                        
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={toggleSortDirection}
                                            className="flex items-center gap-1 bg-white/10 hover:bg-white/15 p-2.5 rounded-lg text-white border border-white/10 transition-all duration-200 shadow-sm"
                                        >
                                            {sortDirection === 'asc' ? <ArrowUpIconDynamic className="h-5 w-5" /> : <ArrowDownIconDynamic className="h-5 w-5" />}
                                        </motion.button>
                                    </div>
                                </div>
                                
                                {/* Индикатор текущего поиска */}
                                {searchQuery.trim() && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">
                                                Search results for: 
                                            </span>
                                            <span className="bg-[#20DDBB]/10 text-[#20DDBB] px-2 py-1 rounded-md font-medium">
                                                {searchQuery}
                                            </span>
                                            <span className="text-gray-400">
                                                ({filteredProfiles.length} {filteredProfiles.length === 1 ? 'result' : 'results'})
                                            </span>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleSearchInput('')}
                                            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"
                                        >
                                            <XMarkIconDynamic className="h-4 w-4" />
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                            
                            <div 
                                ref={parentRef}
                                className={styles.gridContainer}
                                style={{
                                    height: 'calc(100vh - 200px)',
                                    overflow: 'auto',
                                    scrollBehavior: 'smooth'
                                }}
                            >
                                {isLoading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                        {Array.from({ length: INITIAL_PAGE_SIZE }).map((_, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                            >
                                                <UserCardSkeleton />
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                        {visibleProfiles.map((profile, index) => (
                                            <motion.div
                                                key={profile.$id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                            >
                                                <MemoizedUserCard
                                                    user={profile}
                                                    isFriend={isFriend(profile.user_id)}
                                                    onAddFriend={handleAddFriend}
                                                    onRemoveFriend={handleRemoveFriend}
                                                    onRateUser={handleRateUser}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Intersection Observer target */}
                                {!isLoading && hasMoreProfiles && (
                                    <div 
                                        ref={loadMoreRef} 
                                        className="h-20 w-full flex items-center justify-center"
                                    >
                                        <div className="animate-bounce">
                                            <svg 
                                                className="w-6 h-6 text-[#20DDBB]" 
                                                fill="none" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth="2" 
                                                viewBox="0 0 24 24" 
                                                stroke="currentColor"
                                            >
                                                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Loading indicator */}
                                {isLoadingMore && (
                                    <div className="h-20 w-full flex items-center justify-center">
                                        <div className="animate-spin h-8 w-8 border-2 border-[#20DDBB] border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Боковая панель с топ пользователями (только на десктопе, sticky) */}
                        <div className="lg:col-span-1 hidden lg:block">
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl p-6 shadow-lg border border-white/5 sticky top-24"
                            >
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-white text-center mb-3">Top Ranked</h2>
                                    <div className="flex justify-center mb-4">
                                        <div className="inline-flex bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 p-1 rounded-full">
                                            <button
                                                onClick={() => setActiveTab(TabTypes.USERS)}
                                                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                                                    activeTab === TabTypes.USERS
                                                    ? 'text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-md'
                                                    : 'text-white/60 hover:text-white'
                                                }`}
                                            >
                                                Users
                                            </button>
                                            <button
                                                onClick={() => setActiveTab(TabTypes.ARTISTS)}
                                                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                                                    activeTab === TabTypes.ARTISTS
                                                    ? 'text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-md'
                                                    : 'text-white/60 hover:text-white'
                                                }`}
                                            >
                                                Artists
                                            </button>
                                        </div>
                                    </div>
                                    {topRankedUsers.length > 0 ? (
                                        <TopRankingUsers users={topRankedUsers} />
                                    ) : (
                                        <div className="text-center py-4 text-gray-400">
                                            No users found
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Мобильная Top Ranked панель (фиксированная снизу) */}
            <div className="fixed bottom-0 left-0 w-full z-50 block lg:hidden">
                <div
                    className="mx-auto max-w-md bg-gradient-to-r from-[#252840] to-[#1E2136] rounded-t-2xl shadow-2xl p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setShowRanking(true)}
                >
                    <span className="font-bold text-white text-lg flex items-center gap-2">
                        <FaCrown className="text-yellow-400" /> Top Ranked
                    </span>
                    <span className="text-[#20DDBB] font-semibold">View</span>
                </div>
                {/* Выпадающий рейтинг */}
                <AnimatePresence>
                    {showRanking && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed inset-0 z-50 bg-black/60 flex flex-col"
                            onClick={() => setShowRanking(false)}
                        >
                            <div
                                className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-t-2xl p-6 max-w-md mx-auto mt-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <h2 className="text-xl font-bold text-white text-center mb-3">Top Ranked</h2>
                                <TopRankingUsers users={topRankedUsers} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PeopleLayout>
    );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fix the TopRankingUsersWithDirectNavigation component
const TopRankingUsersWithDirectNavigation = ({ users }: { users: any[] }) => {
    // Дебаг для отслеживания проблем
    useEffect(() => {
        console.log("[DEBUG] TopRankingUsers data:", users);
    }, [users]);
    
    if (!users || users.length === 0) {
        return <div className="text-white/60 text-center p-4">No users found</div>;
    }
    
    return (
        <div className="space-y-2">
            {users.map((user, index) => {
                const userId = user?.user_id || user?.id;
                
                // Пропускаем пользователей без ID
                if (!userId) return null;
                
                // Прямая ссылка на профиль
                const profileUrl = `/profile/${userId}`;
                
                return (
                    <div 
                        key={`top-user-${index}`}
                        className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
                        onClick={() => {
                            console.log(`[DEBUG] Direct navigation to: ${profileUrl}`);
                            window.location.href = profileUrl;
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-gradient-to-br ${index < 3 ? 'from-purple-500/30 to-cyan-500/30' : 'from-gray-500/20 to-slate-500/20'} border border-white/10`}>
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-white truncate">
                                    {user.name || "Unknown User"}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {user.username || `User #${userId?.substring(0, 6)}`}
                                </div>
                            </div>
                            <div className="text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};