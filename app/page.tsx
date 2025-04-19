"use client"

import { useEffect, useState, useRef, createContext, useMemo, useCallback, useContext } from "react"
import { usePostStore } from "@/app/stores/post"
import { useVibeStore } from "@/app/stores/vibeStore"
import ClientOnly from "./components/ClientOnly"
import PostMain from "./components/PostMain"
import { VibeCardSkeleton } from "./components/vibe/VibeCard"
import { GenreProvider } from "@/app/context/GenreContext";
import { useRouter } from "next/navigation";
import React, { Suspense, lazy } from "react";
import { useInView } from 'react-intersection-observer';
import MainLayout from "./layouts/MainLayout"
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { ContentFilterProvider, ContentFilterContext } from "@/app/context/ContentFilterContext";
import { OnboardingProvider, useOnboarding } from "@/app/context/OnboardingContext";
import { FaInfoCircle } from "react-icons/fa";
import { PostMainSkeleton } from "./components/PostMain";
import { ErrorBoundary } from "react-error-boundary";
import SafeVibeCard from "./components/vibe/SafeVibeCard";

// Lazy load components that are not needed immediately
const OnboardingGuide = lazy(() => import('./components/onboarding/OnboardingGuide'));

// Объединенный тип для ленты, содержащей как обычные посты, так и VIBE посты
interface FeedItem {
  type: 'post' | 'vibe';
  data: any;
  created_at: string;
}

// Main Home component
export default function Home() {
  return (
    <OnboardingProvider>
      <HomeContent />
    </OnboardingProvider>
  );
}

function HomeContent() {
  const onboardingContext = useOnboarding();

  useEffect(() => {
    // Wrap in try-catch to handle potential undefined context
    try {
      // Проверяем, что контекст и функция showOnboarding существуют
      if (onboardingContext && typeof onboardingContext.showOnboarding === 'function') {
        const isOnboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
        if (!isOnboardingCompleted) {
          // Add small delay to ensure context is ready
          setTimeout(() => {
            onboardingContext.showOnboarding();
          }, 0);
        }
      } else {
        console.warn('Onboarding context or showOnboarding function is not available');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }, [onboardingContext]);

  return (
    <>
      <ContentFilterProvider>
        <GenreProvider>
          <HomePageContent />
        </GenreProvider>
      </ContentFilterProvider>

      <Suspense fallback={null}>
        <OnboardingGuide />
      </Suspense>
    </>
  );
}

// Content component that uses the context
function HomePageContent() {
  const router = useRouter();
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshCountRef = useRef(0); // Refresh counter
  const MAX_AUTO_REFRESHES = 1; // Maximum number of auto-refreshes
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce reference
  
  // Get activeFilter from ContentFilterContext
  const filterContext = useContext(ContentFilterContext);
  const activeFilter = filterContext?.activeFilter || 'all';
  
  // Безопасно получаем значения из store с дефолтными значениями если они undefined
  const postStore = usePostStore();
  const vibeStore = useVibeStore();
  
  const { 
    allPosts = [], 
    loadMorePosts,
    setAllPosts, 
    isLoading: isLoadingPosts = false, 
    hasMore: hasMorePosts = false,
    selectedGenre = 'all' 
  } = postStore || {};

  const {
    allVibePosts = [],
    fetchAllVibes,
    loadMoreVibes,
    isLoadingVibes = false,
    hasMore: hasMoreVibes = false
  } = vibeStore || {};

  // Объединенный стейт для ленты
  const [combinedFeed, setCombinedFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [hasMore, setHasMore] = useState(true);
  
  // Track if initial content has been loaded
  const [initialContentLoaded, setInitialContentLoaded] = useState(false);

  // Улучшенные настройки IntersectionObserver
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px', // Увеличиваем отступ для заблаговременной загрузки
    triggerOnce: false, // Позволяем триггеру срабатывать multiple times
  });

  // Мемоизируем функцию сортировки для избежания повторных вычислений
  const sortByDate = useCallback((a: FeedItem, b: FeedItem) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }, []);

  // Загрузка комбинированной ленты с мемоизацией для оптимизации рендеринга
  useEffect(() => {
    if (!allPosts.length && !allVibePosts.length) return;
    
    const combineFeed = () => {
      // Преобразуем посты и VIBE посты в единый формат с мемоизацией
      const postItems: FeedItem[] = allPosts.map(post => ({
        type: 'post',
        data: post,
        created_at: post.created_at
      }));
      
      const vibeItems: FeedItem[] = allVibePosts.map(vibe => ({
        type: 'vibe',
        data: vibe,
        created_at: vibe.created_at
      }));
      
      // Применяем фильтрацию в зависимости от активного фильтра
      let combined: FeedItem[] = [];
      
      // Фильтруем элементы в зависимости от выбранного фильтра
      if (activeFilter === 'all') {
        // Показываем все элементы
        combined = [...postItems, ...vibeItems];
      } else if (activeFilter === 'stracks' || activeFilter === 'sacral') {
        // Показываем только PostMain карточки (Sacral Track)
        combined = [...postItems];
      } else if (activeFilter === 'vibe') {
        // Показываем только Vibe карточки
        combined = [...vibeItems];
      } else if (activeFilter === 'world') {
        // В будущем здесь может быть дополнительная логика для фильтрации World Tracks
        // Пока просто показываем все посты
        combined = [...postItems];
      }
      
      // Сортируем с использованием мемоизированной функции
      combined.sort(sortByDate);
      
      setCombinedFeed(combined);
      setHasMore(
        (activeFilter === 'all' || activeFilter === 'stracks' || activeFilter === 'sacral' || activeFilter === 'world') && hasMorePosts || 
        (activeFilter === 'all' || activeFilter === 'vibe') && hasMoreVibes
      );
    };
    
    combineFeed();
    
    // Устанавливаем флаг загрузки контента
    if (allPosts.length > 0 || allVibePosts.length > 0) {
      setInitialContentLoaded(true);
      setIsLoading(false);
    }
  }, [allPosts, allVibePosts, hasMorePosts, hasMoreVibes, sortByDate, activeFilter]);

  // Initial load with optimized approach
  useEffect(() => {
    const loadInitialContent = async () => {
      setIsLoading(true);
      
      try {
        // Проверяем, что функции существуют перед их вызовом
        if (typeof setAllPosts === 'function') {
          // Load posts first for better LCP
          await setAllPosts();
        } else {
          console.error('setAllPosts is not a function');
        }
        
        if (typeof fetchAllVibes === 'function') {
          // Then load vibes
          await fetchAllVibes();
        } else {
          console.error('fetchAllVibes is not a function');
        }
      } catch (error) {
        console.error("Error loading initial content:", error);
      } finally {
        refreshCountRef.current = 0;
        setAutoRefreshEnabled(true);
      }
    };
    
    loadInitialContent();
  }, [selectedGenre, setAllPosts, fetchAllVibes]);

  // Auto-refresh optimization
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const refreshContent = async () => {
      // Only refresh if data is stale or needed
      if (refreshCountRef.current >= MAX_AUTO_REFRESHES) {
        setAutoRefreshEnabled(false);
        return;
      }
      
      // Don't set loading state for background refreshes to avoid re-renders
      try {
        // Проверяем функции перед вызовом
        const promises = [];
        
        if (typeof setAllPosts === 'function') {
          promises.push(setAllPosts());
        }
        
        if (typeof fetchAllVibes === 'function') {
          promises.push(fetchAllVibes());
        }
        
        // Use Promise.all if both functions exist
        if (promises.length > 0) {
          await Promise.all(promises);
          refreshCountRef.current += 1;
          console.log("[REFRESH] Completed refresh #" + refreshCountRef.current);
        }
      } catch (error) {
        console.error("[REFRESH] Error during refresh:", error);
      }
    };
    
    const intervalId = setInterval(refreshContent, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, selectedGenre, autoRefreshEnabled, setAllPosts, fetchAllVibes]);

  // Optimized infinite scroll with throttling and debouncing
  useEffect(() => {
    // Skip if necessary conditions aren't met
    if (!inView || !hasMore || isLoading || isLoadingPosts || isLoadingVibes) {
      return;
    }
    
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    // Set a new timeout for debouncing
    loadTimeoutRef.current = setTimeout(async () => {
      console.log("[DEBUG-PAGE] Loading more content...");
      setIsLoading(true);
      
      try {
        // Загружаем следующие элементы в зависимости от фильтра
        if ((activeFilter === 'all' || activeFilter === 'stracks' || activeFilter === 'sacral' || activeFilter === 'world') && 
            hasMorePosts && typeof loadMorePosts === 'function') {
          await loadMorePosts();
        }
        
        if ((activeFilter === 'all' || activeFilter === 'vibe') && 
            hasMoreVibes && typeof loadMoreVibes === 'function') {
          await loadMoreVibes();
        }
      } catch (error) {
        console.error("Error loading more content:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce delay
    
    // Clean up the timeout
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [inView, hasMore, isLoading, hasMorePosts, hasMoreVibes, isLoadingPosts, isLoadingVibes, loadMorePosts, loadMoreVibes, activeFilter]);

  // Filter content based on active filter - use useMemo to cache results
  const filteredFeed = useMemo(() => {
    if (combinedFeed.length === 0) return [];
    
    // Only log when development mode is enabled
    if (process.env.NODE_ENV === 'development') {
      console.log("[FILTER-DEBUG] Active filter:", activeFilter);
      console.log("[FILTER-DEBUG] Combined feed items:", combinedFeed.length);
      console.log("[FILTER-DEBUG] Posts:", combinedFeed.filter(item => item.type === 'post').length);
      console.log("[FILTER-DEBUG] Vibes:", combinedFeed.filter(item => item.type === 'vibe').length);
    }
    
    if (activeFilter === 'all') {
      if (process.env.NODE_ENV === 'development') {
        console.log("[FILTER-DEBUG] Showing ALL content");
      }
      return combinedFeed;
    } else if (activeFilter === 'vibe') {
      const vibeItems = combinedFeed.filter(item => item.type === 'vibe');
      if (process.env.NODE_ENV === 'development') {
        console.log("[FILTER-DEBUG] Showing", vibeItems.length, "vibe items");
      }
      return vibeItems;
    } else if (activeFilter === 'sacral') {
      const postItems = combinedFeed.filter(item => item.type === 'post');
      if (process.env.NODE_ENV === 'development') {
        console.log("[FILTER-DEBUG] Showing", postItems.length, "post items");
      }
      return postItems;
    } else if (activeFilter === 'world') {
      const worldItems = combinedFeed.filter(item => 
        item.type === 'post' && 
        item.data.genre && 
        item.data.genre.toLowerCase().includes('world')
      );
      if (process.env.NODE_ENV === 'development') {
        console.log("[FILTER-DEBUG] Showing", worldItems.length, "world items");
      }
      return worldItems;
    }
    return combinedFeed;
  }, [combinedFeed, activeFilter]);

  return (
    <MainLayout>
      <div className="mt-[80px] w-full ml-auto">
        <div className="max-w-[800px] mx-auto px-2 md:px-0">
          {/* Initial loading skeleton */}
          {isLoading && !initialContentLoaded && (
            <div className="space-y-4 p-4">
              {Array(3).fill(0).map((_, index) => (
                <PostMainSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          )}
          
          {/* No content message - wrapped in ClientOnly to prevent hydration mismatch */}
          <ClientOnly>
            {initialContentLoaded && filteredFeed.length === 0 && !isLoading && (
              <div className="text-center py-8 text-white">
                <FaInfoCircle className="text-[#20DDBB] text-3xl mx-auto mb-2" />
                <p className="text-lg font-medium">No content found</p>
                <p className="text-[#818BAC] mt-1">Try selecting a different filter or genre</p>
              </div>
            )}
          </ClientOnly>
          
          {/* Feed content - wrapped in ClientOnly to prevent hydration mismatch */}
          <ClientOnly>
            {filteredFeed.length > 0 && (
              <>
                {filteredFeed.map((item, index) => {
                  // Логируем данные только в режиме разработки и только для первого элемента
                  if (process.env.NODE_ENV === 'development' && index === 0 && item.type === 'post') {
                    console.log("[DEBUG-POSTMAIN]", index, item.data);
                  }
                  
                  return (
                    <div 
                      key={`${item.type}-${item.data.id}`} 
                      className={`my-4 ${item.type === 'vibe' ? 'flex justify-center' : ''}`}
                    >
                      {item.type === 'post' ? (
                        <PostMain post={item.data} />
                      ) : (
                        <ErrorBoundary fallback={<div className="bg-[#1A1A2E] p-4 rounded-xl text-white">Could not display this vibe</div>}>
                          <SafeVibeCard vibe={item.data} />
                        </ErrorBoundary>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </ClientOnly>
          
          {/* Infinite scroll loading indicator */}
          <ClientOnly>
            {(isLoading || isLoadingPosts || isLoadingVibes) && initialContentLoaded && (
              <div className="py-4 flex justify-center">
                <div className="w-8 h-8 border-t-2 border-b-2 border-[#20DDBB] rounded-full animate-spin"></div>
              </div>
            )}
          </ClientOnly>
          
          {/* End of content message */}
          <ClientOnly>
            {!hasMore && initialContentLoaded && filteredFeed.length > 0 && (
              <div className="text-center py-8 text-[#818BAC]">
                You've reached the end of your feed
              </div>
            )}
          </ClientOnly>
          
          {/* Infinite scroll trigger */}
          <div ref={ref} className="h-10 mb-8" />
        </div>
      </div>
    </MainLayout>
  );
}