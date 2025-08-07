"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  Suspense,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFriendsStore } from "@/app/stores/friends";
import { useUser } from "@/app/context/user";
import { checkAppwriteConfig } from "@/libs/AppWriteClient";
import Image from "next/image";
import dynamic from "next/dynamic";
import styles from "./styles.module.css";
import {
  StarIcon,
  UserPlusIcon,
  UserGroupIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { database, Query } from "@/libs/AppWriteClient";
import { ID } from "appwrite";
import { useRouter, usePathname } from "next/navigation";
import { FaTrophy } from "react-icons/fa";
import PeopleLayout from "@/app/layouts/PeopleLayout";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { useMediaQuery } from "react-responsive";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";
import UserCardSkeleton from "@/app/components/skeletons/UserCardSkeleton";
import { useSwipeable, SwipeableHandlers } from "react-swipeable";
import useInfiniteScroll from "react-infinite-scroll-hook";
import { useRefreshControl } from "@/app/hooks/useRefreshControl";
import { PeopleSearchProvider } from "@/app/context/PeopleSearchContext";
import DefaultAvatar from "@/app/components/ui/DefaultAvatar";
import SimpleLoadingCard from "@/app/components/ui/SimpleLoadingCard";
import SimpleSidebarLoading from "@/app/components/ui/SimpleSidebarLoading";

// Динамический импорт иконок
const StarIconDynamic = dynamic(() =>
  import("@heroicons/react/24/solid").then((mod) => mod.StarIcon),
);
const UserPlusIconDynamic = dynamic(() =>
  import("@heroicons/react/24/solid").then((mod) => mod.UserPlusIcon),
);
const UserMinusIconDynamic = dynamic(() =>
  import("@heroicons/react/24/solid").then((mod) => mod.UserMinusIcon),
);
const HeartIconDynamic = dynamic(() =>
  import("@heroicons/react/24/solid").then((mod) => mod.HeartIcon),
);

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
  USERS: "users",
  ARTISTS: "artists",
} as const;

type TabType = (typeof TabTypes)[keyof typeof TabTypes];

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
        ? "text-white bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 rounded-lg border border-[#20DDBB]/30"
        : "text-gray-400 hover:text-white"
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
        <StarIconDynamic
          key={`full-${i}`}
          className="w-3 h-3 text-yellow-400"
        />
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

// Мемоизированный компонент UserCard для оптимизации производительности
const UserCard: React.FC<UserCardProps> = memo(
  ({
    user,
    isFriend,
    totalFriends,
    onAddFriend,
    onRemoveFriend,
    onRateUser,
  }) => {
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { navigateTo } = useSafeNavigation();
    const currentUser = useUser();

    // Получаем доступ к глобальному состоянию поиска
    const searchContext = useContext(React.createContext<string>("")); // Можно заменить на актуальный контекст поиска

    // Исправляем отображение числовых значений
    const getNumericValue = (value: any): number => {
      if (typeof value === "string") return parseInt(value, 10) || 0;
      if (typeof value === "number") return value;
      return 0;
    };

    // Get numeric rating value
    const getNumericRating = (rating: any): number => {
      if (typeof rating === "string") return parseFloat(rating) || 0;
      if (typeof rating === "number") return rating;
      return 0;
    };

    // Get formatted rating for display
    const getRatingDisplay = (rating: any): string => {
      return getNumericRating(rating).toFixed(1);
    };

    // Обеспечиваем наличие статистики и корректно получаем данные рейтинга
    const totalFollowers = getNumericValue(
      user.total_followers || user.stats?.totalFollowers || 0,
    );
    const totalRatings = getNumericValue(
      user.total_ratings || user.stats?.totalRatings || 0,
    );
    const numericRating = getNumericRating(
      user.average_rating || user.stats?.averageRating || 0,
    );

    // Update local state when user props change
    useEffect(() => {
      // This ensures that when the user data changes (e.g., after a new rating is submitted),
      // the displayed rating is updated accordingly
      setRating(numericRating);
    }, [user.average_rating, user.stats?.averageRating, numericRating]);

    // Improved function to get color based on rating - без красного фона
    const getRatingColor = (rating: number) => {
      if (rating >= 4.5) return "from-yellow-400 to-yellow-600";
      if (rating >= 3.5) return "from-teal-400 to-emerald-600";
      if (rating >= 2.5) return "from-blue-400 to-indigo-600";
      if (rating >= 1.5) return "from-purple-400 to-pink-600";
      return "from-gray-400 to-gray-600"; // Заменили красный на серый
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
      switch (rank) {
        case "Musical Legend":
          return "bg-gradient-to-r from-yellow-400 to-amber-600 border-yellow-300";
        case "Pro Artist":
          return "bg-gradient-to-r from-cyan-500 to-blue-600 border-blue-300";
        case "Rising Star":
          return "bg-gradient-to-r from-purple-500 to-pink-600 border-pink-300";
        case "Talented":
          return "bg-gradient-to-r from-teal-500 to-emerald-600 border-emerald-300";
        case "Enthusiast":
          return "bg-gradient-to-r from-blue-400 to-indigo-600 border-indigo-300";
        default:
          return "bg-gradient-to-r from-gray-500 to-slate-600 border-gray-400";
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
        console.error("Friend action error:", error);
      }
    };

    // Обработчик рейтинга с предотвращением всплытия
    const handleRatingClick = (e: React.MouseEvent, value: number) => {
      e.stopPropagation();
      e.preventDefault();

      // Check if user is logged in before allowing rating
      if (!currentUser?.user?.id) {
        return; // Silently prevent rating, no error message
      }

      // Set local state immediately for visual feedback
      setRating(value);
      setHoverRating(value);

      handleStarClick(value);
    };

    return (
      <motion.div
        className="group relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm hover:border-[#20DDBB]/30 transition-all duration-300 cursor-pointer aspect-[4/5]"
        whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
        initial={false}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={navigateToProfile}
      >
        {/* Full-size avatar background */}
        <div className="absolute inset-0">
          {user.image && !imageError ? (
            <Image
              src={useCreateBucketUrl(user.image, "user")}
              alt={user.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <DefaultAvatar className="w-full h-full rounded-none" />
          )}
        </div>

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/5 via-transparent to-[#5D59FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Content with 5px padding */}
        <div className="absolute inset-[5px] flex flex-col justify-between">
          {/* Top section - Rating */}
          <div className="flex justify-end">
            <div className="flex flex-col items-end">
              <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleRatingClick(e, star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`p-0.5 focus:outline-none ${!currentUser?.user?.id ? "cursor-not-allowed opacity-60" : ""}`}
                    disabled={!currentUser?.user?.id}
                  >
                    <StarIconDynamic
                      className={`w-3 h-3 ${
                        (
                          hoverRating > 0
                            ? star <= hoverRating
                            : star <= numericRating || star <= rating
                        )
                          ? "text-yellow-400"
                          : "text-gray-600"
                      } transition-all duration-200`}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="mt-1 text-xs text-white/80 bg-black/30 rounded px-2 py-0.5">
                {hoverRating > 0
                  ? hoverRating.toFixed(1)
                  : numericRating.toFixed(1)}{" "}
                ({totalRatings})
              </div>
            </div>
          </div>

          {/* Bottom section - User info and stats */}
          <div className="space-y-3">
            {/* User name and rank */}
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#20DDBB] group-hover:to-[#5D59FF] transition-all duration-300 mb-1">
                {user.name}
              </h3>
              <div
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${rankBadgeColor} backdrop-blur-sm`}
              >
                {userRank}
              </div>
            </div>

            {/* Stats and friend button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Friends count */}
                <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                  <div className="flex items-center gap-1">
                    <UserPlusIcon className="w-3 h-3 text-[#20DDBB]" />
                    <span className="text-xs font-medium text-white">
                      {totalFriends}
                    </span>
                  </div>
                </div>

                {/* Ratings count */}
                <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                  <div className="flex items-center gap-1">
                    <StarIconDynamic className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs font-medium text-white">
                      {totalRatings}
                    </span>
                  </div>
                </div>
              </div>

              {/* Friend action button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFriendAction}
                className={`backdrop-blur-md rounded-full p-2 border transition-all duration-200 ${
                  isFriend
                    ? "bg-pink-500/30 border-pink-500/50 hover:bg-pink-500/40 text-pink-400"
                    : "bg-[#20DDBB]/30 border-[#20DDBB]/50 hover:bg-[#20DDBB]/40 text-[#20DDBB]"
                }`}
              >
                {isFriend ? (
                  <UserMinusIconDynamic className="w-4 h-4" />
                ) : (
                  <UserPlusIconDynamic className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

// Мемоизированная версия UserCard для предотвращения лишних ререндеров
const MemoizedUserCard = React.memo(UserCard, (prevProps, nextProps) => {
  return (
    prevProps.user.$id === nextProps.user.$id &&
    prevProps.isFriend === nextProps.isFriend &&
    prevProps.totalFriends === nextProps.totalFriends
  );
});

// Добавляем компонент загрузки для иконок
const IconLoading = () => (
  <div className="w-5 h-5 bg-gray-300/20 rounded-full"></div>
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
      timestamp: Date.now(),
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
  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: INITIAL_PAGE_SIZE,
  });
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
        items.length,
      );

      setVisibleRange({ start: Math.max(0, start - 3), end: end + 3 });
    }, SCROLL_DEBOUNCE_TIME),
    [items.length, itemHeight],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateVisibleRange);
    window.addEventListener("resize", updateVisibleRange);

    return () => {
      container.removeEventListener("scroll", updateVisibleRange);
      window.removeEventListener("resize", updateVisibleRange);
    };
  }, [updateVisibleRange]);

  return { containerRef, visibleRange };
};

// Custom hook for search functionality
const useSearch = (profiles: any[]) => {
  const [query, setQuery] = useState("");
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
      const results = profiles.filter((profile) => {
        const searchableText =
          `${profile.name} ${profile.username || ""} ${profile.bio || ""}`.toLowerCase();
        return searchTerms.every((term) => searchableText.includes(term));
      });

      setSearchResults(results);
      setSearching(false);
    }, 300),
    [profiles],
  );

  const handleSearchInput = useCallback(
    (text: string) => {
      setQuery(text);
      setSearching(true);
      debouncedSearch(text);
    },
    [debouncedSearch],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearching(true);
      debouncedSearch(query);
    },
    [debouncedSearch, query],
  );

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
    handleSearchSubmit,
  };
};

// Add this helper function at the top of the file, after imports
const calculateRating = (
  rating: number,
): { full: number; half: boolean; empty: number } => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return {
    full: fullStars,
    half: hasHalf,
    empty: emptyStars,
  };
};

export default function People() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [visibleProfiles, setVisibleProfiles] = useState<any[]>([]);
  const [topRankedUsers, setTopRankedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopUsers, setIsLoadingTopUsers] = useState(false);
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
    triggerOnce: false,
  });
  const { setCache, getCache } = useProfilesCache();
  const parentRef = useRef<HTMLDivElement>(null);
  const allProfilesRef = useRef<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [lastTouchY, setLastTouchY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [showTopRanked, setShowTopRanked] = useState(false);
  const [showFullTop100, setShowFullTop100] = useState(false);
  const [fullTop100Users, setFullTop100Users] = useState<any[]>([]);
  const [isLoadingTop100, setIsLoadingTop100] = useState(false);
  const [friendsCountCache, setFriendsCountCache] = useState<{
    [userId: string]: number;
  }>({});

  const {
    friends,
    loadFriends,
    addFriend,
    removeFriend,
    sentRequests,
    loadSentRequests,
  } = useFriendsStore();
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { navigateTo } = useSafeNavigation();

  // Virtualized list setup
  const rowVirtualizer = useVirtualizer({
    count: visibleProfiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 380, // Height of each card
    overscan: 5,
  });

  // Use virtual scroll
  const { containerRef: virtualScrollContainerRef, visibleRange } =
    useVirtualScroll(profiles, 380); // 380px is card height

  // Use the search hook
  const {
    query,
    searching,
    searchResults,
    handleSearchInput,
    handleSearchSubmit,
  } = useSearch(profiles);

  // Mobile touch handlers with improved scroll detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setLastTouchY(e.touches[0].clientY);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - lastTouchY;

      // Only update scroll direction if movement is significant (reduces jitter)
      if (Math.abs(deltaY) > 5) {
        setIsScrollingUp(deltaY > 0);
        setLastTouchY(currentY);
      }
    },
    [lastTouchY],
  );

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
    trackMouse: false,
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
        loadTopUsers(),
      ]);
      toast.success("Content updated!");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Improved scroll handler with debouncing and smooth behavior
  const handleScroll = useCallback(
    debounce(() => {
      if (!containerRef.current) return;
    }, 100),
    [isScrollingUp, isMobile],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Enhanced mobile navigation with smooth animations and no jerking
  const MobileNav = () => (
    <motion.nav
      className={styles.mobileNav}
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: 0,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
          opacity: { duration: 0.4 },
        },
      }}
      exit={{
        y: 100,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
    >
      <motion.button
        onClick={() => setShowTopRanked(true)}
        className="relative px-6 py-3 rounded-2xl flex flex-col items-center text-white/70 hover:text-white active:text-[#20DDBB] transition-all duration-300 group"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/0 to-[#5D59FF]/0 group-hover:from-[#20DDBB]/10 group-hover:to-[#5D59FF]/10 group-active:from-[#20DDBB]/20 group-active:to-[#5D59FF]/20 rounded-2xl transition-all duration-300"></div>

        {/* Icon with enhanced styling */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <FaTrophy className="w-6 h-6 group-hover:text-[#20DDBB] transition-colors duration-300" />
            {/* Subtle glow for icon */}
            <div className="absolute inset-0 w-6 h-6 bg-[#20DDBB]/0 group-hover:bg-[#20DDBB]/20 rounded-full blur-sm transition-all duration-300"></div>
          </div>
          <span className="text-xs mt-1 font-medium group-hover:text-[#20DDBB] transition-colors duration-300">
            Top Rankings
          </span>
        </div>

        {/* Ripple effect on tap */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-all duration-150"></div>
        </div>
      </motion.button>
    </motion.nav>
  );

  // Enhanced TopRankedModal with better UX/UI
  const TopRankedModal = () => (
    <AnimatePresence>
      {showTopRanked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 lg:hidden"
          onClick={() => setShowTopRanked(false)}
        >
          <motion.div
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1A1A2E] to-[#252840] rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
            </div>

            {/* Header with tabs */}
            <div className="px-5 pb-4 border-b border-white/5 sticky top-0 bg-gradient-to-t from-[#1A1A2E] to-[#252840] z-10 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] bg-clip-text text-transparent">
                  Top Rankings
                </h2>
                <button
                  onClick={() => setShowTopRanked(false)}
                  className="p-2 rounded-xl hover:bg-white/10 active:bg-white/20 transition-all duration-200"
                >
                  <XMarkIcon className="w-6 h-6 text-white/80" />
                </button>
              </div>

              {/* Tab selector */}
              <div className="flex justify-center">
                <div className="inline-flex bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setActiveTab(TabTypes.USERS)}
                    className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                      activeTab === TabTypes.USERS
                        ? "text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-lg border border-[#20DDBB]/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab(TabTypes.ARTISTS)}
                    className={`px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                      activeTab === TabTypes.ARTISTS
                        ? "text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-lg border border-[#20DDBB]/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Artists
                  </button>
                </div>
              </div>
            </div>

            {/* Content area with smooth scrolling */}
            <div
              className={`flex-1 overflow-y-auto px-5 pb-6 space-y-3 ${styles.hideScrollbar}`}
            >
              {topRankedUsers.length > 0 ? (
                // Show top users immediately if available
                topRankedUsers.map((rankedUser, index) => (
                  <motion.div
                    key={rankedUser.$id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                      index < 3
                        ? "bg-gradient-to-r from-white/10 to-white/5 border-[#20DDBB]/30 hover:border-[#20DDBB]/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    }`}
                    onClick={() => navigateTo(`/profile/${rankedUser.user_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Ranking number */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3
                            ? "bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {index + 1}
                      </div>

                      {/* User avatar */}
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20">
                        {rankedUser.image ? (
                          <Image
                            src={useCreateBucketUrl(rankedUser.image, "user")}
                            alt={rankedUser.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserGroupIcon className="w-6 h-6 text-[#20DDBB]/60" />
                          </div>
                        )}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">
                            {rankedUser.name}
                          </h3>
                          {index < 3 && (
                            <FaTrophy
                              className={`w-4 h-4 ${
                                index === 0
                                  ? "text-yellow-400"
                                  : index === 1
                                    ? "text-gray-300"
                                    : "text-amber-600"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <StarIcon className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-white/80">
                              {rankedUser.stats.averageRating.toFixed(1)}
                            </span>
                            <span className="text-xs text-white/60">
                              ({rankedUser.stats.totalRatings})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserGroupIcon className="w-4 h-4 text-[#20DDBB]" />
                            <span className="text-sm text-white/80">
                              {rankedUser.stats.totalFollowers}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score indicator */}
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#20DDBB]">
                          {rankedUser.calculatedScore?.toFixed(1) || "0.0"}
                        </div>
                        <div className="text-xs text-white/60">score</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : isLoadingTopUsers ? (
                // Simple loading without animation
                <SimpleSidebarLoading itemsCount={5} />
              ) : (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center mb-4">
                    <FaTrophy className="w-8 h-8 text-white/40" />
                  </div>
                  <h3 className="text-white/80 font-medium mb-2">
                    No rankings yet
                  </h3>
                  <p className="text-white/50 text-sm">
                    Be the first to get rated!
                  </p>
                </div>
              )}
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
      const cached = getCache("initial_profiles");
      if (cached) {
        console.log("[DEBUG] Using cached profiles");
        setProfiles(cached);
        setIsLoading(false);
        return;
      }

      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [
          Query.limit(80), // Оптимальное количество для хорошего UX
          Query.orderDesc("$createdAt"), // Сортировка по дате создания
        ],
      );

      const loadedProfiles = response.documents.map((doc) => ({
        $id: doc.$id,
        user_id: doc.user_id,
        name: doc.name || "Unknown User",
        username: doc.username,
        image: doc.image,
        bio: doc.bio || "",
        total_likes: doc.total_likes || "0",
        total_followers: doc.total_followers || "0",
        average_rating: doc.average_rating || "0",
        total_ratings: doc.total_ratings || "0",
        stats: {
          totalLikes:
            typeof doc.total_likes === "string"
              ? parseInt(doc.total_likes, 10)
              : 0,
          totalFollowers:
            typeof doc.total_followers === "string"
              ? parseInt(doc.total_followers, 10)
              : 0,
          averageRating:
            typeof doc.average_rating === "string"
              ? parseFloat(doc.average_rating)
              : 0,
          totalRatings:
            typeof doc.total_ratings === "string"
              ? parseInt(doc.total_ratings, 10)
              : 0,
        },
      }));

      setCache("initial_profiles", loadedProfiles);
      setProfiles(loadedProfiles);
      setVisibleProfiles(loadedProfiles); // Update visible profiles as well
    } catch (error) {
      console.error("[ERROR] Error loading users:", error);
      setError("Failed to load users. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [setCache, getCache]);

  // Оптимизированная пагинация - показываем 16 карточек, затем по 16 при скролле
  const [displayedCount, setDisplayedCount] = useState(16);
  const LOAD_INCREMENT = 16;

  const memoizedVisibleProfiles = useMemo(() => {
    const sourceProfiles =
      searchResults && searchResults.length > 0 ? searchResults : profiles;
    return sourceProfiles.slice(0, displayedCount);
  }, [searchResults, profiles, displayedCount]);

  // Effect to update visible profiles when search results change
  useEffect(() => {
    setVisibleProfiles(memoizedVisibleProfiles);
    // Reset displayed count when search changes
    if (searchResults && searchResults.length > 0) {
      setDisplayedCount(Math.min(16, searchResults.length));
    } else {
      setDisplayedCount(16);
    }
  }, [memoizedVisibleProfiles, searchResults]);

  // Подгрузка при скролле
  useEffect(() => {
    if (inView && !isLoading && displayedCount < profiles.length) {
      setDisplayedCount((prev) =>
        Math.min(prev + LOAD_INCREMENT, profiles.length),
      );
    }
  }, [inView, isLoading, displayedCount, profiles.length]);

  // Effect to load friends count for visible profiles
  useEffect(() => {
    visibleProfiles.forEach((profile) => {
      if (profile.user_id && friendsCountCache[profile.user_id] === undefined) {
        loadUserFriendsCount(profile.user_id);
      }
    });
  }, [visibleProfiles, friendsCountCache]);

  // Effect to load friends count for top ranked users
  useEffect(() => {
    topRankedUsers.forEach((user) => {
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
    window.addEventListener("popstate", () => {
      console.log("[DEBUG] popstate event occurred - URL changed");
    });

    return () => {
      window.removeEventListener("popstate", () => {
        console.log("[DEBUG] Cleanup popstate event listener");
      });
    };
  }, []);

  // Проверяем, является ли пользователь другом или есть ли отправленный запрос
  const isFriend = (userId: string) => {
    return (
      friends.some((friend) => friend.friendId === userId) ||
      sentRequests.some((request) => request.friendId === userId)
    );
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
        [Query.equal("user_id", userId), Query.equal("status", "accepted")],
      );

      // Получаем друзей, где пользователь является получателем
      const friendsAsReceiver = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [Query.equal("friend_id", userId), Query.equal("status", "accepted")],
      );

      const totalFriends = friendsAsInitiator.total + friendsAsReceiver.total;
      setFriendsCountCache((prev) => ({ ...prev, [userId]: totalFriends }));
    } catch (error) {
      console.error("Error getting friends count:", error);
      setFriendsCountCache((prev) => ({ ...prev, [userId]: 0 }));
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
          Query.equal("user_id", userId),
          Query.limit(1), // Нужен только один пост для проверки
        ],
      );
      return posts.total > 0;
    } catch (error) {
      console.error("Error checking user posts:", error);
      return false;
    }
  };

  // Рейтинг пользователя
  const handleRateUser = async (userId: string, rating: number) => {
    if (!user?.user?.id) {
      // Silently return if user is not logged in
      return;
    }

    try {
      // Immediately update the UI for better user experience
      // Update the profile in the local state to show the new rating immediately
      setProfiles((prevProfiles) =>
        prevProfiles.map((profile) => {
          if (profile.user_id === userId) {
            // Calculate new average rating
            const prevTotalRatings =
              parseInt(profile.total_ratings as string) ||
              profile.stats.totalRatings ||
              0;
            const prevAverage =
              parseFloat(profile.average_rating as string) ||
              profile.stats.averageRating ||
              0;

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
                totalRatings: newTotalRatings,
              },
            };
          }
          return profile;
        }),
      );

      // Also update visible profiles for immediate UI feedback
      setVisibleProfiles((prevVisible) =>
        prevVisible.map((profile) => {
          if (profile.user_id === userId) {
            // Calculate new average rating
            const prevTotalRatings =
              parseInt(profile.total_ratings as string) ||
              profile.stats.totalRatings ||
              0;
            const prevAverage =
              parseFloat(profile.average_rating as string) ||
              profile.stats.averageRating ||
              0;

            let newAverage = prevAverage;
            let newTotalRatings = prevTotalRatings;

            // If this is a new rating, calculate new average
            if (prevTotalRatings === 0) {
              newAverage = rating;
              newTotalRatings = 1;
            } else {
              // For existing ratings, calculate proper average
              newTotalRatings = prevTotalRatings + 1;
              newAverage =
                (prevAverage * prevTotalRatings + rating) / newTotalRatings;
            }

            // Update both the direct fields and the stats object
            return {
              ...profile,
              average_rating: newAverage.toFixed(2),
              total_ratings: newTotalRatings.toString(),
              stats: {
                ...profile.stats,
                averageRating: newAverage,
                totalRatings: newTotalRatings,
              },
            };
          }
          return profile;
        }),
      );

      // Сначала проверяем, не оценивал ли уже пользователь
      const existingRating = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
        [Query.equal("userId", userId), Query.equal("raterId", user.user.id)],
      );

      if (existingRating.documents.length > 0) {
        // Обновляем существующий рейтинг
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
          existingRating.documents[0].$id,
          {
            rating: rating,
            updatedAt: new Date().toISOString(),
          },
        );
        toast.success("Rating updated successfully!");
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
            updatedAt: new Date().toISOString(),
          },
        );
        toast.success("Rating submitted successfully!");
      }

      // Обновляем статистику пользователя
      await updateUserStats(userId);

      // Reload users in the background without blocking UI
      // We already updated the UI above for immediate feedback
      loadUsers().catch((err) => console.error("Error reloading users:", err));
      loadTopUsers().catch((err) =>
        console.error("Error reloading top users:", err),
      );
    } catch (error) {
      console.error("Error rating user:", error);
      toast.error("Failed to submit rating. Please try again.");
    }
  };

  // Обновление статистики пользователя
  const updateUserStats = async (userId: string) => {
    try {
      // Получаем все рейтинги пользователя
      const ratings = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
        [Query.equal("userId", userId)],
      );

      // Вычисляем средний рейтинг
      const totalRatings = ratings.documents.length;
      let averageRating = 0;

      if (totalRatings > 0) {
        const sum = ratings.documents.reduce((acc, curr) => {
          const rating =
            typeof curr.rating === "string"
              ? parseFloat(curr.rating)
              : curr.rating;
          return acc + rating;
        }, 0);

        averageRating = sum / totalRatings;
      }

      // Обновляем профиль пользователя
      // Сначала нужно найти профиль по userId
      const profiles = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [Query.equal("user_id", userId)],
      );

      if (profiles.documents.length > 0) {
        const profileId = profiles.documents[0].$id;

        // Обновляем статистику - используем правильные имена полей из схемы базы данных
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          profileId,
          {
            average_rating: averageRating.toFixed(2),
            total_ratings: totalRatings.toString(),
          },
        );
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  };

  // Immediate loading for tab changes - no debounce for faster response
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
          Query.equal("user_id", userId),
          Query.limit(1000), // Достаточно для подсчета
        ],
      );
      return vibes.total;
    } catch (error) {
      console.error("Error counting user vibes:", error);
      return 0;
    }
  };

  // Функция для подсчета друзей пользователя
  const getUserFriendsCountForRanking = async (
    userId: string,
  ): Promise<number> => {
    try {
      // Получаем друзей, где пользователь является инициатором
      const friendsAsInitiator = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal("user_id", userId),
          Query.equal("status", "accepted"),
          Query.limit(1000),
        ],
      );

      // Получаем друзей, где пользователь является получателем
      const friendsAsReceiver = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal("friend_id", userId),
          Query.equal("status", "accepted"),
          Query.limit(1000),
        ],
      );

      return friendsAsInitiator.total + friendsAsReceiver.total;
    } catch (error) {
      console.error("Error counting user friends:", error);
      return 0;
    }
  };

  // Функция для подсчета постов пользователя
  const getUserPostsCount = async (userId: string): Promise<number> => {
    try {
      const posts = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
        [Query.equal("user_id", userId), Query.limit(1000)],
      );
      return posts.total;
    } catch (error) {
      console.error("Error counting user posts:", error);
      return 0;
    }
  };

  // Функция для расчета комплексного рейтинга
  const calculateUserScore = async (
    doc: any,
    isArtist: boolean,
  ): Promise<number> => {
    const totalRatings =
      typeof doc.total_ratings === "string"
        ? parseInt(doc.total_ratings, 10)
        : doc.total_ratings || 0;
    const averageRating =
      typeof doc.average_rating === "string"
        ? parseFloat(doc.average_rating)
        : doc.average_rating || 0;

    // 1. Основной фактор: количество поставленных звезд рейтингов
    const ratingsScore = totalRatings * averageRating; // Учитываем и количество и качество рейтингов

    // Получаем дополнительные метрики
    const [vibesCount, friendsCount, postsCount] = await Promise.all([
      getUserVibesCount(doc.user_id),
      getUserFriendsCountForRanking(doc.user_id),
      getUserPostsCount(doc.user_id),
    ]);

    let finalScore = ratingsScore * 10; // Основной вес для рейтингов

    if (isArtist) {
      // Для артистов: 2-й фактор - релизы (посты) и вайбы, 3-й фактор - друзья
      finalScore += postsCount * 3 + vibesCount * 2 + friendsCount * 1;
    } else {
      // Для пользователей: 2-й фактор - только вайбы и друзья (посты не учитываются)
      finalScore += vibesCount * 2.5 + friendsCount * 1.5;
    }

    return finalScore;
  };

  // Оптимизированная загрузка топ-пользователей для мгновенного отображения
  const loadTopUsers = useCallback(async () => {
    try {
      // Проверяем кэш первым делом для мгновенного отображения
      const cacheKey = `top_users_${activeTab}`;
      const cached = getCache(cacheKey);

      if (cached && cached.length > 0) {
        setTopRankedUsers(cached);
        setIsLoadingTopUsers(false);
        return;
      }

      setIsLoadingTopUsers(true);

      // Используем уже загруженные профили для быстрой обработки
      let usersToProcess = profiles;

      if (profiles.length === 0) {
        // Загружаем только если нет кэшированных профилей
        const response = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          [
            Query.limit(50), // Увеличиваем лимит для лучшего выбора
            Query.orderDesc("average_rating"), // Предварительная сортировка
          ],
        );
        usersToProcess = response.documents;
      }

      // Быстрая фильтрация на основе простых критериев
      const quickFilteredUsers = usersToProcess
        .filter((doc) => {
          const totalRatings = parseInt(doc.total_ratings as string) || 0;
          const averageRating = parseFloat(doc.average_rating as string) || 0;
          // Быстрая фильтрация: только пользователи с рейтингом
          return totalRatings > 0 && averageRating > 0;
        })
        .slice(0, 20); // Берем только топ-20 для дальнейшей обработки

      // Параллельная загрузка всех необходимых данных одним запросом
      const [postsData, vibesData, friendsData] = await Promise.all([
        // Получаем все посты для всех пользователей одним запросом
        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
            [
              Query.equal(
                "user_id",
                quickFilteredUsers.map((u) => u.user_id),
              ),
              Query.limit(1000),
            ],
          )
          .catch(() => ({ documents: [] })),

        // Получаем все вайбы одним запросом
        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE!,
            [
              Query.equal(
                "user_id",
                quickFilteredUsers.map((u) => u.user_id),
              ),
              Query.limit(1000),
            ],
          )
          .catch(() => ({ documents: [] })),

        // Получаем всех друзей одним запросом
        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
            [Query.limit(1000)],
          )
          .catch(() => ({ documents: [] })),
      ]);

      // Создаем индексы для быстрого поиска
      const postsIndex = new Map<string, number>();
      const vibesIndex = new Map<string, number>();
      const friendsIndex = new Map<string, number>();

      // Подсчитываем посты для каждого пользователя
      postsData.documents.forEach((post: any) => {
        const userId = post.user_id;
        postsIndex.set(userId, (postsIndex.get(userId) || 0) + 1);
      });

      // Подсчитываем вайбы для каждого пользователя
      vibesData.documents.forEach((vibe: any) => {
        const userId = vibe.user_id;
        vibesIndex.set(userId, (vibesIndex.get(userId) || 0) + 1);
      });

      // Подсчитываем друзей для каждого пользователя
      friendsData.documents.forEach((friend: any) => {
        if (friend.status === "accepted") {
          const userId1 = friend.user_id;
          const userId2 = friend.friend_id;
          friendsIndex.set(userId1, (friendsIndex.get(userId1) || 0) + 1);
          friendsIndex.set(userId2, (friendsIndex.get(userId2) || 0) + 1);
        }
      });

      // Быстрый расчет рейтингов без дополнительных запросов
      const usersWithScores = quickFilteredUsers
        .map((doc) => {
          const totalRatings = parseInt(doc.total_ratings as string) || 0;
          const averageRating = parseFloat(doc.average_rating as string) || 0;
          const postsCount = postsIndex.get(doc.user_id) || 0;
          const vibesCount = vibesIndex.get(doc.user_id) || 0;
          const friendsCount = friendsIndex.get(doc.user_id) || 0;

          const isArtist = postsCount > 0;

          // Фильтруем по активному табу
          if (
            (activeTab === TabTypes.USERS && isArtist) ||
            (activeTab === TabTypes.ARTISTS && !isArtist)
          ) {
            return null;
          }

          // Быстрый расчет рейтинга
          const ratingsScore = totalRatings * averageRating;
          let finalScore = ratingsScore * 10;

          if (isArtist) {
            finalScore += postsCount * 3 + vibesCount * 2 + friendsCount * 1;
          } else {
            finalScore += vibesCount * 2.5 + friendsCount * 1.5;
          }

          return {
            ...doc,
            calculatedScore: finalScore,
            isArtist: isArtist,
            postsCount,
            vibesCount,
            friendsCount,
          };
        })
        .filter(Boolean);

      // Сортируем и берем топ-10
      const topUsers = usersWithScores
        .sort((a, b) => b.calculatedScore - a.calculatedScore)
        .slice(0, 10)
        .map((doc) => ({
          $id: doc.$id,
          user_id: doc.user_id,
          name: doc.name,
          username: doc.username,
          image: doc.image,
          bio: doc.bio || "",
          calculatedScore: doc.calculatedScore,
          isArtist: doc.isArtist,
          stats: {
            totalLikes: parseInt(doc.total_likes as string) || 0,
            totalFollowers: parseInt(doc.total_followers as string) || 0,
            averageRating: parseFloat(doc.average_rating as string) || 0,
            totalRatings: parseInt(doc.total_ratings as string) || 0,
            artistScore: doc.calculatedScore,
          },
        }));

      // Кэшируем результаты
      setCache(cacheKey, topUsers);
      setTopRankedUsers(topUsers);

      console.log(
        `Loaded top ${activeTab} (optimized):`,
        topUsers.map((u) => ({
          name: u.name,
          score: u.calculatedScore,
          ratings: u.stats.totalRatings,
          avgRating: u.stats.averageRating,
          isArtist: u.isArtist,
        })),
      );
    } catch (error) {
      console.error("Error loading top users:", error);
      setTopRankedUsers([]);
    } finally {
      setIsLoadingTopUsers(false);
    }
  }, [activeTab, profiles, getCache, setCache]);

  // Функция для загрузки топ-100 пользователей
  const loadTop100Users = useCallback(async () => {
    if (isLoadingTop100) return;

    try {
      setIsLoadingTop100(true);

      // Проверяем кэш
      const cacheKey = `top_100_users_${activeTab}`;
      const cached = getCache(cacheKey);

      if (cached && cached.length > 0) {
        setFullTop100Users(cached);
        return;
      }

      // Загружаем больше пользователей для топ-100
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [
          Query.limit(150), // Загружаем больше для лучшего выбора
          Query.orderDesc("average_rating"),
        ],
      );

      // Используем ту же логику что и для топ-пользователей, но берем больше
      const quickFilteredUsers = response.documents
        .filter((doc) => {
          const totalRatings = parseInt(doc.total_ratings as string) || 0;
          const averageRating = parseFloat(doc.average_rating as string) || 0;
          return totalRatings > 0 && averageRating > 0;
        })
        .slice(0, 100);

      // Параллельная загрузка данных
      const [postsData, vibesData, friendsData] = await Promise.all([
        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
            [
              Query.equal(
                "user_id",
                quickFilteredUsers.map((u) => u.user_id),
              ),
              Query.limit(2000),
            ],
          )
          .catch(() => ({ documents: [] })),

        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE!,
            [
              Query.equal(
                "user_id",
                quickFilteredUsers.map((u) => u.user_id),
              ),
              Query.limit(2000),
            ],
          )
          .catch(() => ({ documents: [] })),

        database
          .listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
            [Query.limit(2000)],
          )
          .catch(() => ({ documents: [] })),
      ]);

      // Создаем индексы
      const postsIndex = new Map<string, number>();
      const vibesIndex = new Map<string, number>();
      const friendsIndex = new Map<string, number>();

      postsData.documents.forEach((post: any) => {
        const userId = post.user_id;
        postsIndex.set(userId, (postsIndex.get(userId) || 0) + 1);
      });

      vibesData.documents.forEach((vibe: any) => {
        const userId = vibe.user_id;
        vibesIndex.set(userId, (vibesIndex.get(userId) || 0) + 1);
      });

      friendsData.documents.forEach((friend: any) => {
        if (friend.status === "accepted") {
          const userId1 = friend.user_id;
          const userId2 = friend.friend_id;
          friendsIndex.set(userId1, (friendsIndex.get(userId1) || 0) + 1);
          friendsIndex.set(userId2, (friendsIndex.get(userId2) || 0) + 1);
        }
      });

      // Рассчитываем рейтинги
      const usersWithScores = quickFilteredUsers
        .map((doc) => {
          const totalRatings = parseInt(doc.total_ratings as string) || 0;
          const averageRating = parseFloat(doc.average_rating as string) || 0;
          const postsCount = postsIndex.get(doc.user_id) || 0;
          const vibesCount = vibesIndex.get(doc.user_id) || 0;
          const friendsCount = friendsIndex.get(doc.user_id) || 0;

          const isArtist = postsCount > 0;

          // Фильтруем по активному табу
          if (
            (activeTab === TabTypes.USERS && isArtist) ||
            (activeTab === TabTypes.ARTISTS && !isArtist)
          ) {
            return null;
          }

          const ratingsScore = totalRatings * averageRating;
          let finalScore = ratingsScore * 10;

          if (isArtist) {
            finalScore += postsCount * 3 + vibesCount * 2 + friendsCount * 1;
          } else {
            finalScore += vibesCount * 2.5 + friendsCount * 1.5;
          }

          return {
            ...doc,
            calculatedScore: finalScore,
            isArtist: isArtist,
            stats: {
              totalLikes: parseInt(doc.total_likes as string) || 0,
              totalFollowers: parseInt(doc.total_followers as string) || 0,
              averageRating: parseFloat(doc.average_rating as string) || 0,
              totalRatings: parseInt(doc.total_ratings as string) || 0,
              artistScore: finalScore,
            },
          };
        })
        .filter(Boolean);

      // Сортируем и берем топ-100
      const top100 = usersWithScores
        .filter((user) => user !== null)
        .sort((a, b) => (b?.calculatedScore || 0) - (a?.calculatedScore || 0))
        .slice(0, 100);

      setCache(cacheKey, top100);
      setFullTop100Users(top100);
    } catch (error) {
      console.error("Error loading top 100 users:", error);
    } finally {
      setIsLoadingTop100(false);
    }
  }, [activeTab, getCache, setCache, isLoadingTop100]);

  // Предзагрузка топ-пользователей сразу при монтировании компонента
  useEffect(() => {
    // Загружаем топ-пользователей сразу, не дожидаясь основных профилей
    loadTopUsers();
  }, [activeTab]);

  // Дополнительная загрузка при изменении профилей (для обновления данных)
  useEffect(() => {
    if (profiles.length > 0) {
      // Обновляем топ-пользователей если есть новые данные
      const cacheKey = `top_users_${activeTab}`;
      const cached = getCache(cacheKey);
      if (!cached || cached.length === 0) {
        loadTopUsers();
      }
    }
  }, [profiles.length, loadTopUsers, activeTab, getCache]);

  // Handle add friend
  const handleAddFriend = async (userId: string) => {
    try {
      await addFriend(userId);
      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error adding friend:", error);
      toast.error("Failed to send friend request. Please try again.");
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async (userId: string) => {
    try {
      await removeFriend(userId);
      toast.success("Friend removed successfully.");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend. Please try again.");
    }
  };

  // Load initial data - оптимизированная загрузка
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if Appwrite is configured
        await checkAppwriteConfig();

        // Загружаем все данные параллельно для максимальной скорости
        await Promise.all([
          loadUsers(),
          loadFriends(),
          loadSentRequests(),
          loadTopUsers(), // Загружается параллельно с основными данными
        ]);
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to initialize app. Please try again later.");
      }
    };

    initializeData();
  }, []);

  // Улучшенная версия для надежной навигации
  const handleSearchResultClick = (result: any) => {
    if (result.type === "profile") {
      navigateTo(`/profile/${result.user_id}`);
    } else if (result.type === "track") {
      navigateTo(`/post/${result.user_id}/${result.id}`);
    } else if (result.type === "vibe") {
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
      import("@heroicons/react/24/solid"),
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
          <div className="space-y-4">
            <div className="h-12 bg-white/5 rounded-lg w-full max-w-md"></div>
            <div className={styles.grid}>
              {[...Array(6)].map((_, i) => (
                <SimpleLoadingCard key={i} />
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
          className="h-screen bg-[#1A1A2E] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Main Content */}
          <div className={styles.container}>
            <div className={styles.pageContent}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Users Grid */}
                <div className="lg:col-span-3">
                  <div ref={containerRef} className={styles.gridContainer}>
                    {/* Pull to refresh indicator */}
                    {isPullingToRefresh && (
                      <div className="flex items-center justify-center py-4 text-[#20DDBB]">
                        <div className="mr-2">
                          <div className="w-5 h-5 rounded-full border-2 border-[#20DDBB] border-t-transparent"></div>
                        </div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    )}

                    {/* Grid content */}
                    <div className={styles.gridLayout}>
                      {isLoading
                        ? Array.from({ length: INITIAL_PAGE_SIZE }).map(
                            (_, index) => (
                              <div key={index}>
                                <UserCardSkeleton />
                              </div>
                            ),
                          )
                        : visibleProfiles.map((profile) => (
                            <div key={profile.$id} className="transform-gpu">
                              <MemoizedUserCard
                                user={profile}
                                isFriend={isFriend(profile.user_id)}
                                totalFriends={getUserFriendsCount(
                                  profile.user_id,
                                )}
                                onAddFriend={handleAddFriend}
                                onRemoveFriend={handleRemoveFriend}
                                onRateUser={handleRateUser}
                              />
                            </div>
                          ))}
                    </div>

                    {/* Load more trigger with indicator */}
                    {!isLoading && displayedCount < profiles.length && (
                      <div className="flex flex-col items-center py-8">
                        <div ref={loadMoreRef} className="h-4 w-full"></div>
                        <div className="flex items-center gap-2 text-white/60">
                          <div className="w-4 h-4 border-2 border-[#20DDBB] border-t-transparent rounded-full"></div>
                          <span className="text-sm">Loading more...</span>
                        </div>
                      </div>
                    )}

                    {/* End of list indicator */}
                    {!isLoading &&
                      displayedCount >= profiles.length &&
                      profiles.length > 16 && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-white/40 text-sm">
                            You've reached the end! 🎉
                          </div>
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
                      <h2 className="text-xl font-bold text-white text-center mb-3">
                        Top
                      </h2>
                      <div className="flex justify-center">
                        <div className="inline-flex bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 p-1 rounded-full">
                          <button
                            onClick={() => setActiveTab(TabTypes.USERS)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                              activeTab === TabTypes.USERS
                                ? "text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-md"
                                : "text-white/60 hover:text-white"
                            }`}
                          >
                            Users
                          </button>
                          <button
                            onClick={() => setActiveTab(TabTypes.ARTISTS)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                              activeTab === TabTypes.ARTISTS
                                ? "text-white bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 shadow-md"
                                : "text-white/60 hover:text-white"
                            }`}
                          >
                            Artists
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Users List - with custom scrollbar */}
                    <div
                      className={`flex-1 overflow-y-auto px-2 py-3 ${styles.hideScrollbar}`}
                    >
                      {topRankedUsers.length > 0 ? (
                        topRankedUsers.slice(0, 8).map((user, index) => {
                          const userId = user?.user_id || user?.id;
                          if (!userId) return null;

                          return (
                            <motion.div
                              key={`top-user-${index}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="mb-1 last:mb-0"
                              onClick={() => {
                                window.location.href = `/profile/${userId}`;
                              }}
                            >
                              <div className="p-1 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/5 backdrop-blur-sm group">
                                <div className="flex items-center gap-2">
                                  {/* Rank Number */}
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      index === 0
                                        ? "bg-gradient-to-br from-yellow-500/30 to-amber-600/30 text-yellow-400"
                                        : index === 1
                                          ? "bg-gradient-to-br from-slate-400/30 to-slate-500/30 text-slate-300"
                                          : index === 2
                                            ? "bg-gradient-to-br from-amber-600/30 to-amber-700/30 text-amber-500"
                                            : "bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>

                                  {/* Avatar */}
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 group-hover:border-[#20DDBB]/50 transition-colors">
                                    {user.image ? (
                                      <Image
                                        src={useCreateBucketUrl(
                                          user.image,
                                          "user",
                                        )}
                                        alt={user.name}
                                        width={32}
                                        height={32}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center">
                                        <div className="w-3 h-3 rounded-full bg-white/30"></div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate group-hover:text-[#20DDBB] transition-colors">
                                      {user.name || "Unknown User"}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {/* Rating */}
                                      <div className="flex items-center gap-1">
                                        <StarIcon className="w-3 h-3 text-yellow-400" />
                                        <span className="text-xs text-white/80">
                                          {(
                                            user.stats?.averageRating || 0
                                          ).toFixed(1)}
                                        </span>
                                        <span className="text-xs text-white/50">
                                          ({user.stats?.totalRatings || 0})
                                        </span>
                                      </div>

                                      {/* Score */}
                                      <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                        <span className="text-xs text-[#20DDBB] font-medium">
                                          {user.calculatedScore?.toFixed(0) ||
                                            "0"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Arrow indicator */}
                                  <div className="text-white/30 group-hover:text-[#20DDBB] transition-colors">
                                    <ChevronDownIcon className="w-4 h-4 rotate-[-90deg]" />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      ) : isLoadingTopUsers ? (
                        // Показываем скелетон только при первой загрузке
                        <div className="space-y-2">
                          {[...Array(5)].map((_, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-xl bg-white/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Пустое состояние
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center mb-3">
                            <FaTrophy className="w-6 h-6 text-white/40" />
                          </div>
                          <p className="text-white/60 text-sm">
                            No rankings yet
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            Be the first to get rated!
                          </p>
                        </div>
                      )}

                      {/* Кнопка "Показать весь топ 100" */}
                      {topRankedUsers.length > 0 && (
                        <div className="p-1 mt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setShowFullTop100(true);
                              loadTop100Users();
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 hover:from-[#20DDBB]/20 hover:to-[#5D59FF]/20 border border-[#20DDBB]/20 hover:border-[#20DDBB]/40 text-[#20DDBB] hover:text-white transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <FaTrophy className="w-4 h-4" />
                            Show Full Top 100
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-specific components */}
          <MobileNav />
          <TopRankedModal />

          {/* Top 100 Modal */}
          <AnimatePresence>
            {showFullTop100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={() => setShowFullTop100(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-br from-[#1A1A2E] to-[#252840] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-6 border-b border-white/10 bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] flex items-center justify-center">
                          <FaTrophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] bg-clip-text text-transparent">
                            Top 100{" "}
                            {activeTab === TabTypes.USERS ? "Users" : "Artists"}
                          </h2>
                          <p className="text-white/60 text-sm">
                            Best by rating and activity
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFullTop100(false)}
                        className="p-2 rounded-xl hover:bg-white/10 active:bg-white/20 transition-all duration-200"
                      >
                        <XMarkIcon className="w-6 h-6 text-white/80" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {isLoadingTop100 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(12)].map((_, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                              <div className="w-10 h-10 rounded-full bg-white/10"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                <div className="h-3 bg-white/10 rounded w-1/2"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : fullTop100Users.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fullTop100Users.map((user, index) => (
                          <motion.div
                            key={user.$id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/5 group"
                            onClick={() => {
                              setShowFullTop100(false);
                              window.location.href = `/profile/${user.user_id}`;
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {/* Rank */}
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  index < 3
                                    ? "bg-gradient-to-br from-yellow-500/30 to-amber-600/30 text-yellow-400"
                                    : index < 10
                                      ? "bg-gradient-to-br from-slate-400/30 to-slate-500/30 text-slate-300"
                                      : "bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-purple-400"
                                }`}
                              >
                                {index + 1}
                              </div>

                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 group-hover:border-[#20DDBB]/50 transition-colors">
                                {user.image ? (
                                  <Image
                                    src={useCreateBucketUrl(user.image, "user")}
                                    alt={user.name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center">
                                    <div className="w-4 h-4 rounded-full bg-white/30"></div>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate group-hover:text-[#20DDBB] transition-colors">
                                  {user.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="flex items-center gap-1">
                                    <StarIcon className="w-3 h-3 text-yellow-400" />
                                    <span className="text-xs text-white/80">
                                      {(user.stats?.averageRating || 0).toFixed(
                                        1,
                                      )}
                                    </span>
                                  </div>
                                  <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                  <span className="text-xs text-[#20DDBB] font-medium">
                                    {user.calculatedScore?.toFixed(0) || "0"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center mb-4">
                          <FaTrophy className="w-8 h-8 text-white/40" />
                        </div>
                        <h3 className="text-white/80 font-medium mb-2">
                          No ranking data
                        </h3>
                        <p className="text-white/50 text-sm">
                          Users will appear here after receiving ratings
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PeopleLayout>
    </PeopleSearchProvider>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
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
