"use client"

import { useEffect, useState, useRef, createContext, useMemo, useCallback } from "react"
import { usePostStore } from "@/app/stores/post"
import { useVibeStore } from "@/app/stores/vibeStore"
import ClientOnly from "./components/ClientOnly"
import PostMain from "./components/PostMain"
import VibeCard from "./components/vibe/VibeCard"
import { VibeCardSkeleton } from "./components/vibe/VibeCard"
import { GenreProvider } from "@/app/context/GenreContext";
import { useRouter } from "next/navigation";
import React, { Suspense, lazy } from "react";
import { useInView } from 'react-intersection-observer';
import MainLayout from "./layouts/MainLayout"
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { ContentFilterProvider } from "@/app/context/ContentFilterContext";
import { showOnboarding } from "./components/onboarding/OnboardingGuide";
import { FaInfoCircle } from "react-icons/fa";

// Lazy load components that are not needed immediately
const OnboardingGuide = lazy(() => import('./components/onboarding/OnboardingGuide'));

// Skeleton loaders for content
const PostMainSkeleton = () => (
  <div className="rounded-lg overflow-hidden bg-[#1A2338]/80 backdrop-blur-md mb-4">
    <div className="p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[#374151]"></div>
      <div className="flex-1">
        <div className="h-4 w-24 bg-[#374151] rounded mb-2"></div>
        <div className="h-3 w-32 bg-[#374151] rounded"></div>
      </div>
    </div>
    <div className="aspect-square bg-[#202A45]"></div>
    <div className="p-4">
      <div className="h-4 w-full bg-[#374151] rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-[#374151] rounded"></div>
    </div>
  </div>
);

// Объединенный тип для ленты, содержащей как обычные посты, так и VIBE посты
interface FeedItem {
  type: 'post' | 'vibe';
  data: any;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshCountRef = useRef(0); // Refresh counter
  const MAX_AUTO_REFRESHES = 1; // Maximum number of auto-refreshes
  
  // Content filtering
  const [activeFilter, setActiveFilter] = useState('all');
  
  const { 
    allPosts, 
    loadMorePosts,
    setAllPosts, 
    isLoading: isLoadingPosts, 
    hasMore: hasMorePosts,
    selectedGenre 
  } = usePostStore();

  const {
    allVibePosts,
    fetchAllVibes,
    loadMoreVibes,
    isLoadingVibes,
    hasMore: hasMoreVibes
  } = useVibeStore();

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
      
      // Объединяем и сортируем с использованием мемоизированной функции
      const combined = [...postItems, ...vibeItems].sort(sortByDate);
      
      setCombinedFeed(combined);
      setHasMore(hasMorePosts || hasMoreVibes);
    };
    
    combineFeed();
    
    // Устанавливаем флаг загрузки контента
    if (allPosts.length > 0 || allVibePosts.length > 0) {
      setInitialContentLoaded(true);
      setIsLoading(false);
    }
  }, [allPosts, allVibePosts, hasMorePosts, hasMoreVibes, sortByDate]);

  // Initial load with optimized approach
  useEffect(() => {
    const loadInitialContent = async () => {
      setIsLoading(true);
      
      try {
        // Load posts first for better LCP
        await setAllPosts();
        // Then load vibes
        fetchAllVibes();
      } catch (error) {
        console.error("Error loading initial content:", error);
      } finally {
        refreshCountRef.current = 0;
        setAutoRefreshEnabled(true);
      }
    };
    
    loadInitialContent();
  }, [selectedGenre]);

  // Auto-refresh optimization
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const refreshContent = async () => {
      if (refreshCountRef.current >= MAX_AUTO_REFRESHES) {
        setAutoRefreshEnabled(false);
        return;
      }
      
      setIsLoading(true);
      try {
        await Promise.all([
          setAllPosts(),
          fetchAllVibes()
        ]);
      } finally {
        setIsLoading(false);
        refreshCountRef.current += 1;
      }
    };
    
    const intervalId = setInterval(refreshContent, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, selectedGenre, autoRefreshEnabled, setAllPosts, fetchAllVibes]);

  // Optimized infinite scroll with throttling
  useEffect(() => {
    // Throttle function to prevent too many requests
    let isThrottled = false;
    
    const handleLoadMore = async () => {
      if (inView && hasMore && !isLoading && !isLoadingPosts && !isLoadingVibes && !isThrottled) {
        console.log("[DEBUG-PAGE] Loading more content...");
        isThrottled = true;
        setIsLoading(true);
        
        try {
          // Load more posts first if available
          if (hasMorePosts) {
            await loadMorePosts();
          }
          
          // Then load more vibes if available
          if (hasMoreVibes) {
            await loadMoreVibes();
          }
        } catch (error) {
          console.error("Error loading more content:", error);
        } finally {
          setIsLoading(false);
          // Reset throttle after a delay
          setTimeout(() => {
            isThrottled = false;
          }, 500);
        }
      }
    };

    handleLoadMore();
  }, [inView, hasMore, isLoading, hasMorePosts, hasMoreVibes, isLoadingPosts, isLoadingVibes, loadMorePosts, loadMoreVibes]);

  // Filter content based on active filter - use useMemo to cache results
  const filteredFeed = useMemo(() => {
    if (combinedFeed.length === 0) return [];
    
    if (activeFilter === 'all') {
      console.log("[FILTER-DEBUG] Showing ALL content");
      return combinedFeed;
    } else if (activeFilter === 'vibe') {
      console.log("[FILTER-DEBUG] Filtering for VIBE content only");
      return combinedFeed.filter(item => item.type === 'vibe');
    } else if (activeFilter === 'sacral') {
      console.log("[FILTER-DEBUG] Filtering for SACRAL content only");
      // For sacral filter, we're specifically looking for post-type content
      return combinedFeed.filter(item => item.type === 'post');
    } else if (activeFilter === 'world') {
      console.log("[FILTER-DEBUG] Filtering for WORLD content only");
      // For world content, we check for posts that have 'world' in their genre
      return combinedFeed.filter(item => 
        item.type === 'post' && 
        item.data.genre && 
        item.data.genre.toLowerCase().includes('world')
      );
    }
    console.log("[FILTER-DEBUG] Using default all content");
    return combinedFeed;
  }, [combinedFeed, activeFilter]);

  // Ensure we have a consistent UI whether JS is enabled or not
  return (
    <>
      <ContentFilterProvider>
        <GenreProvider>
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
                  {filteredFeed.map((item, index) => (
                    <div 
                      key={`${item.type}-${item.data.id}`} 
                      className="my-4"
                    >
                      {item.type === 'post' ? (
                        /* Cast post to any to avoid type issues */
                        <PostMain post={item.data as any} />
                      ) : (
                        <VibeCard vibe={item.data} />
                      )}
                    </div>
                  ))}
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
        </GenreProvider>
      </ContentFilterProvider>

      {/* Lazy load Onboarding guide with Suspense */}
      <Suspense fallback={null}>
        {typeof showOnboarding === 'function' ? null : showOnboarding ? <OnboardingGuide /> : null}
      </Suspense>
    </>
  );
}