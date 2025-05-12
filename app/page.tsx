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
import { FaInfoCircle, FaCheckCircle } from "react-icons/fa";
import { PostMainSkeleton } from "./components/PostMain";
import { ErrorBoundary } from "react-error-boundary";
import SafeVibeCard from "./components/vibe/SafeVibeCard";

// Import app initialization to disable console logs
import '@/app/utils/initApp';

// Объединенный тип для ленты, содержащей как обычные посты, так и VIBE посты
interface FeedItem {
  type: 'post' | 'vibe';
  data: any;
  created_at: string;
}

// Helper function to create properly typed FeedItems
const createFeedItem = (type: 'post' | 'vibe', data: any, created_at: string): FeedItem => ({
  type,
  data,
  created_at
});

// Main Home component
export default function Home() {
  return (
    <ContentFilterProvider>
      <GenreProvider>
        <HomePageContent />
      </GenreProvider>
    </ContentFilterProvider>
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
    displayedPosts = [], // Use displayedPosts instead of allPosts
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

  // Sort helper to maintain a stable sort order
  const sortByDate = useCallback((a: FeedItem, b: FeedItem) => {
    if (!a.data.created_at || !b.data.created_at) return 0;
    return new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime();
  }, []);

  // Combine vibe and track posts into a single feed
  useEffect(() => {
    if (!displayedPosts.length && !allVibePosts.length) return;
    
    const combineFeed = () => {
      const combined: FeedItem[] = [];
      
      // Include posts from allPosts based on filter
      const shouldIncludePosts = ['all', 'stracks', 'sacral', 'world'].includes(activeFilter);
      
      if (shouldIncludePosts && displayedPosts.length > 0) {
        const postsToInclude = displayedPosts.filter(post => {
          // Filter posts based on activeFilter
          if (activeFilter === 'all') return true;
          if (activeFilter === 'stracks') return post.genre?.toLowerCase() === 'stracks';
          if (activeFilter === 'sacral') return post.genre?.toLowerCase() === 'sacral';
          if (activeFilter === 'world') return post.genre?.toLowerCase() === 'world';
          return false;
        });
        
        // Add posts to combined feed
        combined.push(...postsToInclude.map(post => 
          createFeedItem('post', post, post.created_at || new Date().toISOString())
        ));
      }
      
      // Include vibes if filter allows
      const shouldIncludeVibes = ['all', 'vibe'].includes(activeFilter);
      
      if (shouldIncludeVibes && allVibePosts.length > 0) {
        combined.push(...allVibePosts.map(vibe => 
          createFeedItem('vibe', vibe, vibe.created_at || new Date().toISOString())
        ));
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
    if (displayedPosts.length > 0 || allVibePosts.length > 0) {
      setInitialContentLoaded(true);
      setIsLoading(false);
    }
  }, [displayedPosts, allVibePosts, hasMorePosts, hasMoreVibes, sortByDate, activeFilter]);

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

  // Auto-refresh at specified interval to keep content fresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const refreshContent = async () => {
      if (refreshCountRef.current >= MAX_AUTO_REFRESHES) {
        // Stop auto-refreshing after max refreshes
        setAutoRefreshEnabled(false);
        return;
      }
      
      refreshCountRef.current += 1;
      // CONSOLE_REMOVED: console.log(`[DEBUG-PAGE] Auto-refreshing content (${refreshCountRef.current}/${MAX_AUTO_REFRESHES})`);
      
      try {
        if (typeof setAllPosts === 'function') {
          await setAllPosts();
        }
        
        // Don't auto-refresh vibes since they're less frequent
      } catch (error) {
        console.error("Error during auto-refresh:", error);
      }
    };
    
    const intervalId = setInterval(refreshContent, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, refreshInterval, setAllPosts]);

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
      // CONSOLE_REMOVED: console.log("[DEBUG-PAGE] Loading more content...");
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

  // Apply filters to the combined feed for display
  const filteredFeed = useMemo(() => {
    if (!combinedFeed.length) return [];
    
    return combinedFeed.filter(item => {
      if (activeFilter === 'all') return true;
      
      if (item.type === 'post') {
        // Filter posts based on activeFilter
        if (activeFilter === 'stracks') return item.data.genre?.toLowerCase() === 'stracks';
        if (activeFilter === 'sacral') return item.data.genre?.toLowerCase() === 'sacral';
        if (activeFilter === 'world') return item.data.genre?.toLowerCase() === 'world';
      }
      
      if (item.type === 'vibe' && activeFilter === 'vibe') {
        return true;
      }
      
      return false;
    });
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
                    // CONSOLE_REMOVED: console.log("[DEBUG-POSTMAIN]", index, item.data);
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
          
          {/* Improved Infinite scroll loading indicator */}
          <ClientOnly>
            {(isLoading || isLoadingPosts || isLoadingVibes) && initialContentLoaded && (
              <div className="py-8 flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Main loader circle */}
                  <div className="w-12 h-12 rounded-full bg-[#24183D] border border-[#20DDBB]/30 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-2 border-[#20DDBB] border-t-transparent animate-spin"></div>
                    
                    {/* Inner pulsing circle */}
                    <motion.div
                      className="w-6 h-6 rounded-full bg-[#20DDBB]/20"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 0.8, 0.6]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "easeInOut" 
                      }}
                    />
                  </div>
                  
                  {/* Animated particles around the loader */}
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#20DDBB]/60"
                    animate={{ 
                      y: [0, -10, 0],
                      x: [0, 5, 0],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut" 
                    }}
                  />
                  
                  <motion.div
                    className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#8A2BE2]/60"
                    animate={{ 
                      y: [0, 8, 0],
                      x: [0, -5, 0],
                      opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.8,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                  />
                </div>
                
                <p className="mt-4 text-[#20DDBB] text-sm font-medium tracking-wide animate-pulse">
                  Loading more tracks...
                </p>
              </div>
            )}
          </ClientOnly>
          
          {/* End of content message */}
          <ClientOnly>
            {!hasMore && initialContentLoaded && filteredFeed.length > 0 && (
              <div className="text-center py-8 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#24183D] border border-[#20DDBB]/20 text-white/70"
                >
                  <FaCheckCircle className="text-[#20DDBB] mr-2" />
                  You've reached the end of your feed
                </motion.div>
              </div>
            )}
          </ClientOnly>
          
          {/* Invisible load more trigger */}
          {hasMore && (
            <div 
              ref={ref} 
              className="h-20 flex items-center justify-center opacity-0"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}