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
import PostApiCard, { ApiTrack } from "./components/cards/PostApiCard"; // Импортируем PostApiCard и его тип

// Import app initialization to disable console logs
import '@/app/utils/initApp';

// Объединенный тип для ленты
interface FeedItem {
  type: 'post' | 'vibe' | 'api_track'; // Добавляем api_track
  data: any; // Consider creating a more specific union type for data based on 'type'
  created_at: string; // Or Date object
}

// Helper function to create properly typed FeedItems
const createFeedItem = (type: 'post' | 'vibe' | 'api_track', data: any, created_at: string): FeedItem => ({
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
  const [apiTracks, setApiTracks] = useState<ApiTrack[]>([]);
  const [isLoadingApiTracks, setIsLoadingApiTracks] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<{ id: string | null; type: 'post' | 'vibe' | 'api_track' | null }>({ id: null, type: null });
  
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

  // Combine vibe, track posts, and API tracks into a single feed
  useEffect(() => {
    // Wait for all initial data sources if they are expected
    if (isLoadingPosts || isLoadingVibes || isLoadingApiTracks) {
        // If still loading initial sets, don't combine yet, unless some are already present
        if (!initialContentLoaded && !(displayedPosts.length || allVibePosts.length || apiTracks.length)) {
            return;
        }
    }

    const combineFeed = () => {
        const combined: FeedItem[] = [];

        // Include posts from displayedPosts (already filtered by genre in store or here)
        const shouldIncludePosts = ['all', 'stracks', 'sacral'].includes(activeFilter); // 'world' filter will now target api_tracks
        if (shouldIncludePosts && displayedPosts.length > 0) {
            const postsToInclude = displayedPosts.filter(post => {
                if (activeFilter === 'all') return true;
                if (activeFilter === 'stracks') return post.genre?.toLowerCase() === 'stracks';
                if (activeFilter === 'sacral') return post.genre?.toLowerCase() === 'sacral';
                return false; // Explicitly false if no match
            });
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

        // Include API tracks if filter allows
        const shouldIncludeApiTracks = ['all', 'world'].includes(activeFilter);
        console.log('[DEBUG PAGE] apiTracks before combine:', apiTracks); // DEBUG
        if (shouldIncludeApiTracks && apiTracks.length > 0) {
            combined.push(...apiTracks.map(track =>
                createFeedItem('api_track', track, new Date().toISOString())
            ));
        }
        
        combined.sort(sortByDate);
        console.log('[DEBUG PAGE] combinedFeed after combine:', combined); // DEBUG
        
        setCombinedFeed(combined);
        // For now, apiTracks are loaded once, so hasMore depends on posts and vibes
        setHasMore(
            (activeFilter === 'all' || activeFilter === 'stracks' || activeFilter === 'sacral') && hasMorePosts ||
            (activeFilter === 'all' || activeFilter === 'vibe') && hasMoreVibes
        );
    };

    combineFeed();

    if (displayedPosts.length > 0 || allVibePosts.length > 0 || apiTracks.length > 0) {
        setInitialContentLoaded(true);
        setIsLoading(false); // Overall loading false if any content is ready
    }
  }, [displayedPosts, allVibePosts, apiTracks, hasMorePosts, hasMoreVibes, sortByDate, activeFilter, isLoadingPosts, isLoadingVibes, isLoadingApiTracks, initialContentLoaded]);

  // Function to load API tracks
  const loadApiTracks = useCallback(async () => {
    if (isLoadingApiTracks) return;
    console.log('[DEBUG PAGE] Attempting to load API tracks...'); // DEBUG
    setIsLoadingApiTracks(true);
    try {
        const response = await fetch('/api/world-music/jamendo');
        console.log('[DEBUG PAGE] API tracks response status:', response.status); // DEBUG
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DEBUG PAGE] API tracks response error text:', errorText); // DEBUG
            throw new Error(`Failed to fetch API tracks: ${response.status}`);
        }
        const data: ApiTrack[] = await response.json();
        console.log('[DEBUG PAGE] API tracks data received:', data); // DEBUG
        setApiTracks(data);
    } catch (error) {
        console.error("[DEBUG PAGE] Error loading API tracks:", error);
        setApiTracks([]);
    } finally {
        setIsLoadingApiTracks(false);
    }
  }, [isLoadingApiTracks]);


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
       // Load API tracks
       await loadApiTracks();

     } catch (error) {
       console.error("Error loading initial content:", error);
     } finally {
       refreshCountRef.current = 0;
       setAutoRefreshEnabled(true);
       // setIsLoading(false); // Moved to the combineFeed effect
     }
   };
   
   loadInitialContent();
 }, [selectedGenre, setAllPosts, fetchAllVibes, loadApiTracks]);

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
        // 'world' filter now targets api_tracks, which are not paginated in this example
        if ((activeFilter === 'all' || activeFilter === 'stracks' || activeFilter === 'sacral') &&
            hasMorePosts && typeof loadMorePosts === 'function') {
          await loadMorePosts();
        }
        
        if ((activeFilter === 'all' || activeFilter === 'vibe') &&
            hasMoreVibes && typeof loadMoreVibes === 'function') {
          await loadMoreVibes();
        }
        // No loadMore for apiTracks in this example
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
        // 'world' filter is handled by api_track type below
      }
      
      if (item.type === 'vibe' && activeFilter === 'vibe') {
        return true;
      }
      
      if (item.type === 'api_track' && activeFilter === 'world') {
        return true;
      }
      
      return false;
    });
  }, [combinedFeed, activeFilter]);

  const handlePlayPause = useCallback((trackId: string, type: 'post' | 'vibe' | 'api_track') => {
    setCurrentlyPlaying(prev => {
        // If clicking the currently playing track of the same type, pause it
        if (prev.id === trackId && prev.type === type) {
            if (type === 'post' && postStore.currentPlayingPostId === trackId) { // Check if PostMain was playing this
                postStore.setCurrentPlayingPostId(null);
            }
            // For api_track, its own isPlaying prop will handle visual pause via SimpleMp3Player
            return { id: null, type: null };
        }

        // Otherwise, play the new track (and stop others)
        if (type === 'post') { // This should match the type used in FeedItem and createFeedItem
            postStore.setCurrentPlayingPostId(trackId);
        } else {
            // If playing an api_track or vibe, ensure PostMain's player is stopped
            postStore.setCurrentPlayingPostId(null);
        }
        return { id: trackId, type };
    });
  }, [postStore]);


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
                        <PostMain
                            post={item.data}
                            // Pass down play/pause controls if PostMain needs to participate in global play state
                            // isGloballyPlaying={currentlyPlaying.id === item.data.id && currentlyPlaying.type === 'post'}
                            // onGlobalPlay={() => handlePlayPause(item.data.id, 'post')} // Ensure 'post' is used here
                            // onGlobalPause={() => handlePlayPause(item.data.id, 'post')} // Ensure 'post' is used here
                        />
                      ) : item.type === 'vibe' ? (
                        <ErrorBoundary fallback={<div className="bg-[#1A1A2E] p-4 rounded-xl text-white">Could not display this vibe</div>}>
                          <SafeVibeCard
                            vibe={item.data}
                            // Add play/pause if VibeCard has audio & needs to sync
                          />
                        </ErrorBoundary>
                      ) : item.type === 'api_track' ? (
                        <PostApiCard
                            track={item.data as ApiTrack}
                            isPlaying={currentlyPlaying.id === item.data.id && currentlyPlaying.type === 'api_track'}
                            onPlay={() => handlePlayPause(item.data.id, 'api_track')}
                            onPause={() => handlePlayPause(item.data.id, 'api_track')}
                        />
                      ) : null}
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