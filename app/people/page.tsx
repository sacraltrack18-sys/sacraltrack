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
import dynamic from 'next/dynamic';
import styles from './styles.module.css';
import {
  StarIcon,
  UserPlusIcon,
  UserMinusIcon,
  XMarkIcon,
  ChevronDownIcon,
  UsersIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { database, Query } from '@/libs/AppWriteClient';
import { ID } from 'appwrite';
import { useRouter, usePathname } from 'next/navigation';
import { FaTrophy } from 'react-icons/fa';
import PeopleLayout from '@/app/layouts/PeopleLayout';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import { useMediaQuery } from 'react-responsive';
import { useInView } from 'react-intersection-observer';
import { useVirtualizer } from '@tanstack/react-virtual';
import UserCardSkeleton from '@/app/components/skeletons/UserCardSkeleton';
import { useSwipeable, SwipeableHandlers } from 'react-swipeable';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { useRefreshControl } from '@/app/hooks/useRefreshControl';
import { PeopleSearchProvider } from '@/app/context/PeopleSearchContext';

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
    totalFriends: number;
    onAddFriend: (userId: string) => void;
    onRemoveFriend: (userId: string) => void;
    onRateUser: (userId: string, rating: number) => void;
}

// Компонент UserCard - сделаем всю карточку кликабельной и упростим навигацию
const UserCard: React.FC<UserCardProps> = ({ user, isFriend, totalFriends, onAddFriend, onRemoveFriend, onRateUser }) => {
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
                    src={imageError ? '/images/placeholders/music-user-placeholder-new.svg' :
                        (user.image ? useCreateBucketUrl(user.image, 'user') : '/images/placeholders/music-user-placeholder-new.svg')}
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
                            <UserPlusIcon className="w-4 h-4 mr-1 text-green-400" />
                            {totalFriends}
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
const MemoizedUserCard = React.memo(UserCard, (prevProps, nextProps) => {
    return prevProps.user.$id === nextProps.user.$id &&
           prevProps.isFriend === nextProps.isFriend &&
           prevProps.totalFriends === nextProps.totalFriends;
});



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
const INITIAL_PAGE_SIZE = 12;
const LOAD_MORE_SIZE = 9;
const SCROLL_THRESHOLD = 0.8;
const SCROLL_DEBOUNCE_TIME = 150;

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

// Оптимизированная функция для виртуализации
const useVirtualScroll = (items: any[], itemHeight: number) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: INITIAL_PAGE_SIZE });
    const containerRef = useRef<HTMLDivElement>(null);

    const updateVisibleRange = useCallback(
        debounce(() => {
            if (!containerRef.current) return;
            
            const container = containerRef.current;
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            
            const start = Math.floor(scrollTop / itemHeight);
            const end = Math.min(
                Math.ceil((scrollTop + containerHeight) / itemHeight) + 1,
                items.length
            );
            
            setVisibleRange({ start: Math.max(0, start - 3), end: end + 3 });
        }, SCROLL_DEBOUNCE_TIME),
        [items.length, itemHeight]
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', updateVisibleRange);
        window.addEventListener('resize', updateVisibleRange);

        return () => {
            container.removeEventListener('scroll', updateVisibleRange);
            window.removeEventListener('resize', updateVisibleRange);
        };
    }, [updateVisibleRange]);

    return { containerRef, visibleRange };
};

// Custom hook for search functionality
const useSearch = (profiles: any[]) => {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(profiles);
    
    const debouncedSearch = useCallback(
        debounce((text: string) => {
            if (!text.trim()) {
                setSearchResults(profiles);
                setSearching(false);
                return;
            }
            
            const searchTerms = text.toLowerCase().trim().split(/\s+/);
            const results = profiles.filter(profile => {
                const searchableText = `${profile.name} ${profile.username || ''} ${profile.bio || ''}`.toLowerCase();
                return searchTerms.every(term => searchableText.includes(term));
            });
            
            setSearchResults(results);
            setSearching(false);
        }, 300),
        [profiles]
    );
    
    const handleSearchInput = useCallback((text: string) => {
        setQuery(text);
        setSearching(true);
        debouncedSearch(text);
    }, [debouncedSearch]);
    
    const handleSearchSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        debouncedSearch(query);
    }, [debouncedSearch, query]);
    
    // Effect to handle search completion
    useEffect(() => {
        if (!searching) return;
        
        const timer = setTimeout(() => {
            setSearching(false);
        }, 500);
        
        return () => clearTimeout(timer);
    }, [searching]);
    
    // Update search results when original profiles change
    useEffect(() => {
        if (!query.trim()) {
            setSearchResults(profiles);
        } else {
            debouncedSearch(query);
        }
    }, [profiles, query, debouncedSearch]);
    
    return {
        query,
        searching,
        searchResults,
        handleSearchInput,
        handleSearchSubmit
    };
};

// Add this helper function at the top of the file, after imports
const calculateRating = (rating: number): { full: number; half: boolean; empty: number } => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    return {
        full: fullStars,
        half: hasHalf,
        empty: emptyStars
    };
};

export default function People() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [visibleProfiles, setVisibleProfiles] = useState<any[]>([]);
    const [topRankedUsers, setTopRankedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreProfiles, setHasMoreProfiles] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>(TabTypes.USERS);
    const [showRanking, setShowRanking] = useState(false);
    const isMobile = useMediaQuery({ maxWidth: 768 });
    const [isIconsLoaded, setIconsLoaded] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const { ref: loadMoreRef, inView } = useInView({
        threshold: SCROLL_THRESHOLD,
        triggerOnce: false
    });
    const { setCache, getCache } = useProfilesCache();
    const parentRef = useRef<HTMLDivElement>(null);
    const allProfilesRef = useRef<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [lastTouchY, setLastTouchY] = useState(0);
    const [isScrollingUp, setIsScrollingUp] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const [showTopRanked, setShowTopRanked] = useState(false);
    const [friendsCountCache, setFriendsCountCache] = useState<{[userId: string]: number}>({});

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

    // Use virtual scroll
    const { containerRef: virtualScrollContainerRef, visibleRange } = useVirtualScroll(profiles, 380); // 380px is card height

    // Use the search hook
    const {
        query,
        searching,
        searchResults,
        handleSearchInput,
        handleSearchSubmit
    } = useSearch(profiles);

    // Mobile touch handlers with improved scroll detection
    const handleTouchStart = (e: React.TouchEvent) => {
        setLastTouchY(e.touches[0].clientY);
    };

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - lastTouchY;

        // Only update scroll direction if movement is significant (reduces jitter)
        if (Math.abs(deltaY) > 5) {
            setIsScrollingUp(deltaY > 0);
            setLastTouchY(currentY);
        }
    }, [lastTouchY]);

    // Swipe handlers for mobile
    const swipeHandlers = useSwipeable({
        onSwipedDown: () => {
            if (containerRef.current?.scrollTop === 0) {
                handleRefresh();
            }
        },
        onSwipedLeft: () => {
            if (activeTab === TabTypes.USERS) {
                setActiveTab(TabTypes.ARTISTS);
            }
        },
        onSwipedRight: () => {
            if (activeTab === TabTypes.ARTISTS) {
                setActiveTab(TabTypes.USERS);
            }
        },
        trackMouse: false
    });

    // Refresh control for mobile pull-to-refresh
    const { isRefreshing: isPullingToRefresh, onRefresh } = useRefreshControl();

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                loadUsers(),
                loadFriends(),
                loadSentRequests(),
                loadTopUsers()
            ]);
            toast.success('Content updated!');
        } catch (error) {
            console.error('Refresh error:', error);
            toast.error('Failed to refresh. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    };



    // Improved scroll handler with debouncing and smooth behavior
    const handleScroll = useCallback(
        debounce(() => {
            if (!containerRef.current) return;
        }, 100),
        [isScrollingUp, isMobile]
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Improved mobile navigation with stable positioning
    const MobileNav = () => (
        <motion.nav
            className={styles.mobileNav}
            initial={{ y: 100, opacity: 0 }}
            animate={{
                y: 0,
                opacity: 1,
                transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 40,
                    opacity: { duration: 0.3 }
                }
            }}
        >
            <button
                onClick={() => setShowTopRanked(true)}
                className="p-2 rounded-xl flex flex-col items-center text-white/60 active:text-[#20DDBB] active:bg-[#20DDBB]/10 transition-all"
            >
                <FaTrophy className="w-5 h-5" />
                <span className="text-xs mt-0.5">Top</span>
            </button>
        </motion.nav>
    );

    // Move TopRankedModal inside People component
    const TopRankedModal = () => (
        <AnimatePresence>
            {showTopRanked && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
                    onClick={() => setShowTopRanked(false)}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25 }}
                        className="absolute bottom-0 left-0 right-0 bg-[#1A1A2E] rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1A1A2E] z-10">
                            <h2 className="text-xl font-bold text-white">Top</h2>
                            <button 
                                onClick={() => setShowTopRanked(false)}
                                className="p-2 rounded-full hover:bg-white/10"
                            >
                                <XMarkIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto p-4 ${styles.hideScrollbar}`}>
                            {topRankedUsers.map((user, index) => {
                                const userId = user?.user_id || user?.id;
                                if (!userId) return null;

                                return (
                                    <motion.div
                                        key={`top-user-${index}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="mb-3"
                                    >
                                        <div 
                                            className="p-4 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-all"
                                            onClick={() => {
                                                window.location.href = `/profile/${userId}`;
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Rank Badge */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                                                    index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-400 border border-yellow-500/20' :
                                                    index === 1 ? 'bg-gradient-to-br from-slate-400/20 to-slate-500/20 text-slate-300 border border-slate-400/20' :
                                                    index === 2 ? 'bg-gradient-to-br from-amber-600/20 to-amber-700/20 text-amber-500 border border-amber-600/20' :
                                                    'bg-gradient-to-br from-purple-500/10 to-purple-600/10 text-purple-400 border border-purple-500/20'
                                                }`}>
                                                    {index + 1}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white text-lg">
                                                        {user.name || "Unknown User"}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center">
                                                            <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                                                            <span className="text-sm text-yellow-400">
                                                                {user.stats?.averageRating?.toFixed(1) || "0.0"}
                                                            </span>
                                                        </div>
                                                        <span className="text-white/20">•</span>
                                                        <div className="flex items-center">
                                                            <UserPlusIcon className="w-4 h-4 text-green-400 mr-1" />
                                                            <span className="text-sm text-green-400">
                                                                {getUserFriendsCount(userId)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronDownIcon className="w-5 h-5 text-white/40 rotate-[-90deg]" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );



    // Optimize profile loading
    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            
            // Try to get from cache first
            const cached = getCache('initial_profiles');
            if (cached) {
                console.log("[DEBUG] Using cached profiles");
                setProfiles(cached);
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
            setVisibleProfiles(loadedProfiles); // Update visible profiles as well
        } catch (error) {
            console.error('[ERROR] Error loading users:', error);
            setError('Failed to load users. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [setCache, getCache]);

    // Effect to update visible profiles when search results change
    useEffect(() => {
        // Simply use search results without additional filtering or sorting
        setVisibleProfiles(searchResults);
    }, [searchResults]);

    // Effect to load friends count for visible profiles
    useEffect(() => {
        visibleProfiles.forEach(profile => {
            if (profile.user_id && friendsCountCache[profile.user_id] === undefined) {
                loadUserFriendsCount(profile.user_id);
            }
        });
    }, [visibleProfiles, friendsCountCache]);

    // Effect to load friends count for top ranked users
    useEffect(() => {
        topRankedUsers.forEach(user => {
            const userId = user?.user_id || user?.id;
            if (userId && friendsCountCache[userId] === undefined) {
                loadUserFriendsCount(userId);
            }
        });
    }, [topRankedUsers, friendsCountCache]);

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
    

    
    // Проверяем, является ли пользователь другом или есть ли отправленный запрос
    const isFriend = (userId: string) => {
        return friends.some(friend => friend.friendId === userId) ||
               sentRequests.some(request => request.friendId === userId);
    };

    // Загружаем количество друзей для пользователя
    const loadUserFriendsCount = async (userId: string) => {
        if (friendsCountCache[userId] !== undefined) {
            return; // Уже загружено
        }

        try {
            // Получаем друзей, где пользователь является инициатором
            const friendsAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            // Получаем друзей, где пользователь является получателем
            const friendsAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friend_id', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            const totalFriends = friendsAsInitiator.total + friendsAsReceiver.total;
            setFriendsCountCache(prev => ({ ...prev, [userId]: totalFriends }));
        } catch (error) {
            console.error('Error getting friends count:', error);
            setFriendsCountCache(prev => ({ ...prev, [userId]: 0 }));
        }
    };

    // Получаем количество друзей из кеша (синхронно)
    const getUserFriendsCount = (userId: string): number => {
        return friendsCountCache[userId] ?? 0;
    };

    // Проверяем, есть ли у пользователя опубликованные посты
    const checkUserHasPosts = async (userId: string): Promise<boolean> => {
        try {
            const posts = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
                [
                    Query.equal('user_id', userId),
                    Query.limit(1) // Нужен только один пост для проверки
                ]
            );
            return posts.total > 0;
        } catch (error) {
            console.error('Error checking user posts:', error);
            return false;
        }
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
    
    // Функция для подсчета вайбов пользователя
    const getUserVibesCount = async (userId: string): Promise<number> => {
        try {
            const vibes = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
                [
                    Query.equal('user_id', userId),
                    Query.limit(1000) // Достаточно для подсчета
                ]
            );
            return vibes.total;
        } catch (error) {
            console.error('Error counting user vibes:', error);
            return 0;
        }
    };

    // Функция для подсчета друзей пользователя
    const getUserFriendsCountForRanking = async (userId: string): Promise<number> => {
        try {
            // Получаем друзей, где пользователь является инициатором
            const friendsAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('status', 'accepted'),
                    Query.limit(1000)
                ]
            );

            // Получаем друзей, где пользователь является получателем
            const friendsAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friend_id', userId),
                    Query.equal('status', 'accepted'),
                    Query.limit(1000)
                ]
            );

            return friendsAsInitiator.total + friendsAsReceiver.total;
        } catch (error) {
            console.error('Error counting user friends:', error);
            return 0;
        }
    };

    // Функция для подсчета постов пользователя
    const getUserPostsCount = async (userId: string): Promise<number> => {
        try {
            const posts = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
                [
                    Query.equal('user_id', userId),
                    Query.limit(1000)
                ]
            );
            return posts.total;
        } catch (error) {
            console.error('Error counting user posts:', error);
            return 0;
        }
    };

    // Функция для расчета комплексного рейтинга
    const calculateUserScore = async (doc: any, isArtist: boolean): Promise<number> => {
        const totalRatings = typeof doc.total_ratings === 'string' ? parseInt(doc.total_ratings, 10) : (doc.total_ratings || 0);
        const averageRating = typeof doc.average_rating === 'string' ? parseFloat(doc.average_rating) : (doc.average_rating || 0);

        // 1. Основной фактор: количество поставленных звезд рейтингов
        const ratingsScore = totalRatings * averageRating; // Учитываем и количество и качество рейтингов

        // Получаем дополнительные метрики
        const [vibesCount, friendsCount, postsCount] = await Promise.all([
            getUserVibesCount(doc.user_id),
            getUserFriendsCountForRanking(doc.user_id),
            getUserPostsCount(doc.user_id)
        ]);

        let finalScore = ratingsScore * 10; // Основной вес для рейтингов

        if (isArtist) {
            // Для артистов: 2-й фактор - релизы (посты) и вайбы, 3-й фактор - друзья
            finalScore += (postsCount * 3) + (vibesCount * 2) + (friendsCount * 1);
        } else {
            // Для пользователей: 2-й фактор - только вайбы и друзья (посты не учитываются)
            finalScore += (vibesCount * 2.5) + (friendsCount * 1.5);
        }

        return finalScore;
    };

    // Загрузка рейтинга топ-пользователей с новой системой ранжирования
    const loadTopUsers = async () => {
        try {
            // Загружаем больше пользователей для фильтрации и ранжирования
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [
                    Query.limit(100) // Увеличиваем лимит для лучшей выборки
                ]
            );

            // Создаем массив пользователей с их рейтингами
            const usersWithScores: any[] = [];

            for (const doc of response.documents) {
                const hasPosts = await checkUserHasPosts(doc.user_id);
                const isArtist = hasPosts;

                // Фильтруем по активному табу
                if ((activeTab === TabTypes.USERS && !isArtist) ||
                    (activeTab === TabTypes.ARTISTS && isArtist)) {

                    // Рассчитываем комплексный рейтинг
                    const score = await calculateUserScore(doc, isArtist);

                    usersWithScores.push({
                        ...doc,
                        calculatedScore: score,
                        isArtist: isArtist
                    });
                }
            }

            // Сортируем по рассчитанному рейтингу
            usersWithScores.sort((a, b) => b.calculatedScore - a.calculatedScore);

            // Берем топ-10
            const filteredUsers = usersWithScores.slice(0, 10);

            // Преобразуем данные для отображения
            const topUsers = filteredUsers.map(doc => ({
                $id: doc.$id,
                user_id: doc.user_id,
                name: doc.name,
                username: doc.username,
                image: doc.image,
                bio: doc.bio || '',
                calculatedScore: doc.calculatedScore, // Добавляем рассчитанный рейтинг
                isArtist: doc.isArtist, // Добавляем флаг артиста
                stats: {
                    totalLikes: typeof doc.total_likes === 'string' ? parseInt(doc.total_likes, 10) : (doc.total_likes || 0),
                    totalFollowers: typeof doc.total_followers === 'string' ? parseInt(doc.total_followers, 10) : (doc.total_followers || 0),
                    averageRating: typeof doc.average_rating === 'string' ? parseFloat(doc.average_rating) : (doc.average_rating || 0),
                    totalRatings: typeof doc.total_ratings === 'string' ? parseInt(doc.total_ratings, 10) : (doc.total_ratings || 0),
                    artistScore: doc.calculatedScore // Используем новый рассчитанный рейтинг
                }
            }));

            setTopRankedUsers(topUsers);
            console.log(`Loaded top ${activeTab} with new ranking system:`, topUsers.map(u => ({
                name: u.name,
                score: u.calculatedScore,
                ratings: u.stats.totalRatings,
                avgRating: u.stats.averageRating,
                isArtist: u.isArtist
            })));
        } catch (error) {
            console.error('Error loading top users:', error);
            setTopRankedUsers([]);
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
        <PeopleSearchProvider onSearch={handleSearchInput}>
            <PeopleLayout>
                <div
                    {...swipeHandlers}
                    className="min-h-screen bg-[#1A1A2E]"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                >

                                    
                {/* Main Content */}
                <div className={styles.container}>
                    <div className={styles.pageContent}>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Users Grid */}
                            <div className="lg:col-span-3">
                                <div 
                                    ref={containerRef}
                                    className={styles.gridContainer}
                                >
                                    {/* Pull to refresh indicator */}
                                    {isPullingToRefresh && (
                                        <div className="flex items-center justify-center py-4 text-[#20DDBB]">
                                            <div className="animate-spin mr-2">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                            </div>
                                            <span>Refreshing...</span>
                                </div>
                            )}
                        
                                    {/* Grid content */}
                                    <div className={styles.gridLayout}>
                                        {isLoading ? (
                                            Array.from({ length: INITIAL_PAGE_SIZE }).map((_, index) => (
                                                <div key={index}>
                                                    <UserCardSkeleton />
                                                </div>
                                            ))
                                        ) : (
                                            searchResults
                                                .slice(visibleRange.start, visibleRange.end)
                                                .map((profile) => (
                                                    <div 
                                                        key={profile.$id}
                                                        className="transform-gpu"
                                                    >
                                                        <MemoizedUserCard
                                                            user={profile}
                                                            isFriend={isFriend(profile.user_id)}
                                                            totalFriends={getUserFriendsCount(profile.user_id)}
                                                            onAddFriend={handleAddFriend}
                                                            onRemoveFriend={handleRemoveFriend}
                                                            onRateUser={handleRateUser}
                                                        />
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                    
                                    {/* Load more indicator */}
                                    {!isLoading && hasMoreProfiles && (
                                        <div ref={loadMoreRef} className="h-16 w-full flex items-center justify-center">
                                            <div className="w-8 h-8 border-2 border-[#20DDBB] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                    </div>
                    
                            {/* Sidebar - Hidden on mobile */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                                    className="bg-gradient-to-br from-[#252840] to-[#1E2136] rounded-2xl shadow-lg border border-white/5 sticky top-20 h-[calc(100vh-100px)] flex flex-col overflow-hidden"
                        >
                                    {/* Header */}
                                    <div className="p-5 border-b border-white/5">
                                <h2 className="text-xl font-bold text-white text-center mb-3">Top</h2>
                                        <div className="flex justify-center">
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
                                    </div>

                                    {/* Users List - with custom scrollbar */}
                                    <div className={`flex-1 overflow-y-auto px-2 py-3 ${styles.hideScrollbar}`}>
                                        {topRankedUsers.slice(0, 8).map((user, index) => {
                                            const userId = user?.user_id || user?.id;
                                            if (!userId) return null;
                                            
                                            return (
                                                <motion.div 
                                                    key={`top-user-${index}`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className="mb-2 last:mb-0"
                                                    onClick={() => {
                                                        window.location.href = `/profile/${userId}`;
                                                    }}
                                                >
                                                    <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10 backdrop-blur-sm">
                                                        <div className="flex items-center gap-3">
                                                            {/* Rank Number with Dynamic Color */}
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium ${
                                                                index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-400 border border-yellow-500/20' :
                                                                index === 1 ? 'bg-gradient-to-br from-slate-400/20 to-slate-500/20 text-slate-300 border border-slate-400/20' :
                                                                index === 2 ? 'bg-gradient-to-br from-amber-600/20 to-amber-700/20 text-amber-500 border border-amber-600/20' :
                                                                'bg-gradient-to-br from-purple-500/10 to-purple-600/10 text-purple-400 border border-purple-500/20'
                                                            }`}>
                                                                {index + 1}
                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-white truncate">
                                                                    {user.name || "Unknown User"}
                    </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className="flex items-center">
                                                                        {/* Rating Stars */}
                                                                        <div className="flex items-center">
                                                                            {(() => {
                                                                                const rating = user.stats?.averageRating || 0;
                                                                                const { full, half, empty } = calculateRating(rating);
                                                                                
                                                                                return (
                                                                                    <>
                                                                                        {/* Full stars */}
                                                                                        {[...Array(full)].map((_, i) => (
                                                                                            <StarIcon
                                                                                                key={`full-${i}`}
                                                                                                className="w-3.5 h-3.5 text-yellow-400"
                                                                                            />
                                                                                        ))}
                                                                                        
                                                                                        {/* Half star */}
                                                                                        {half && (
                                                                                            <div className="relative w-3.5 h-3.5">
                                                                                                <StarIcon className="absolute inset-0 text-white/10" />
                </div>
                                                                                        )}
                                                                                        
                                                                                        {/* Empty stars */}
                                                                                        {[...Array(empty)].map((_, i) => (
                                                                                            <StarIcon
                                                                                                key={`empty-${i}`}
                                                                                                className="w-3.5 h-3.5 text-white/10"
                                                                                            />
                                                                                        ))}
                                                                                    </>
                                                                                );
                                                                            })()}
            </div>
                                                                        <span className="text-xs text-yellow-400/90 ml-1">
                                                                            ({user.stats?.totalRatings || 0})
                    </span>
                </div>
                                                                    <span className="text-xs text-white/40">•</span>
                                                                    <div className="flex items-center">
                                                                        <UserPlusIcon className="w-3.5 h-3.5 text-green-400 mr-1" />
                                                                        <span className="text-xs text-green-400">
                                                                            {getUserFriendsCount(userId)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-white/40">
                                                                <ChevronDownIcon className="w-4 h-4 rotate-[-90deg]" />
                                                            </div>
                                                        </div>
                            </div>
                        </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile-specific components */}
                <MobileNav />
                <TopRankedModal />
                </div>
            </PeopleLayout>
        </PeopleSearchProvider>
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