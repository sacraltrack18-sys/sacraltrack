"use client"

import { useEffect, useState, useRef, createContext } from "react"
import { usePostStore } from "@/app/stores/post"
import { useVibeStore } from "@/app/stores/vibeStore"
import ClientOnly from "./components/ClientOnly"
import PostMain from "./components/PostMain"
import VibeCard from "./components/vibe/VibeCard"
import { GenreProvider } from "@/app/context/GenreContext";
import { useRouter } from "next/navigation";
import React, { Suspense } from "react";
import { useInView } from 'react-intersection-observer';
import MainLayout from "./layouts/MainLayout"
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { ContentFilterProvider } from "@/app/context/ContentFilterContext";
import { showOnboarding } from "./components/onboarding/OnboardingGuide";
import { FaInfoCircle } from "react-icons/fa";

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
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Улучшенные настройки IntersectionObserver
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Уменьшаем отступ для более точного срабатывания
    triggerOnce: false, // Позволяем триггеру срабатывать multiple times
  });

  // Загрузка комбинированной ленты
  useEffect(() => {
    const combineFeed = () => {
      // Преобразуем посты и VIBE посты в единый формат
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
      
      // Объединяем и сортируем по дате создания (новые сверху)
      const combined = [...postItems, ...vibeItems].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setCombinedFeed(combined);
      setHasMore(hasMorePosts || hasMoreVibes);
    };
    
    combineFeed();
  }, [allPosts, allVibePosts, hasMorePosts, hasMoreVibes]);

  // Initial load
  useEffect(() => {
    console.log("[DEBUG-PAGE] Initial content loading, selected genre:", selectedGenre);
    setIsLoading(true);
    
    Promise.all([
      setAllPosts(),
      fetchAllVibes()
    ]).finally(() => {
      setIsLoading(false);
      refreshCountRef.current = 0;
      setAutoRefreshEnabled(true);
    });
  }, [selectedGenre]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const intervalId = setInterval(() => {
      if (refreshCountRef.current >= MAX_AUTO_REFRESHES) {
        clearInterval(intervalId);
        setAutoRefreshEnabled(false);
        return;
      }
      
      setIsLoading(true);
      Promise.all([
        setAllPosts(),
        fetchAllVibes()
      ]).finally(() => {
        setIsLoading(false);
        refreshCountRef.current += 1;
      });
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, selectedGenre, autoRefreshEnabled]);

  // Improved scroll loading logic
  useEffect(() => {
    const handleLoadMore = async () => {
      if (inView && hasMore && !isLoading && !isLoadingPosts && !isLoadingVibes) {
        console.log("[DEBUG-PAGE] Loading more content...");
        setIsLoading(true);
        
        try {
          // Загружаем больше контента из обоих источников
          await Promise.all([
            hasMorePosts ? loadMorePosts() : Promise.resolve(),
            hasMoreVibes ? loadMoreVibes() : Promise.resolve()
          ]);
        } catch (error) {
          console.error("Error loading more content:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleLoadMore();
  }, [inView, hasMore, isLoading, hasMorePosts, hasMoreVibes, isLoadingPosts, isLoadingVibes]);

  // Filter content based on active filter
  const getFilteredFeed = () => {
    console.log(`[FILTER] Current active filter: ${activeFilter}`);
    
    if (activeFilter === 'all') {
      return combinedFeed;
    } else if (activeFilter === 'vibe') {
      console.log(`[FILTER] Filtering for VIBE posts, found: ${combinedFeed.filter(item => item.type === 'vibe').length}`);
      return combinedFeed.filter(item => item.type === 'vibe');
    } else if (activeFilter === 'sacral') {
      console.log(`[FILTER] Filtering for SACRAL posts, found: ${combinedFeed.filter(item => item.type === 'post').length}`);
      return combinedFeed.filter(item => item.type === 'post');
    } else if (activeFilter === 'world') {
      // For world content, we check for posts that have 'world' in their genre
      const worldPosts = combinedFeed.filter(item => 
        item.type === 'post' && 
        item.data.genre && 
        item.data.genre.toLowerCase().includes('world')
      );
      console.log(`[FILTER] Filtering for WORLD posts, found: ${worldPosts.length}`);
      return worldPosts;
    }
    return combinedFeed;
  };

  const filteredFeed = getFilteredFeed();

  return (
    <>
      <ContentFilterProvider>
        <GenreProvider>
          <MainLayout>
            <div className="mt-[80px] w-full ml-auto">
              {/* Auto-refresh info - now hidden */}
              {false && !autoRefreshEnabled && (
                <div className="text-center text-[#20DDBB] text-sm py-2 mb-4 bg-[#1E2136] rounded-md mx-4">
                  Auto-refresh completed {MAX_AUTO_REFRESHES} time{MAX_AUTO_REFRESHES !== 1 ? 's' : ''} and disabled. 
                  <button 
                    onClick={() => {
                      refreshCountRef.current = 0;
                      setAutoRefreshEnabled(true);
                    }}
                    className="ml-2 underline hover:text-white"
                  >
                    Enable again
                  </button>
                </div>
              )}
              
              <ClientOnly>
                <Suspense fallback={
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center py-4"
                  >
                    <div className="w-8 h-8 border-t-2 border-[#20DDBB] rounded-full animate-spin"></div>
                  </motion.div>
                }>
                  {/* No content message */}
                  {filteredFeed.length === 0 && !isLoading && (
                    <div className="text-center text-[#818BAC] py-4">
                      No content found. Check the developer console logs.
                    </div>
                  )}
                  
                  {/* Combined feed list */}
                  <AnimatePresence mode="popLayout">
                    {filteredFeed.map((item, index) => {
                      const uniqueKey = `${item.type}-${item.data.id}-${index}`;
                      
                      if (item.type === 'post') {
                        const post = item.data;
                        const profile = post.profile || {
                          user_id: "unknown",
                          name: "Unknown user",
                          image: "https://placehold.co/300x300?text=User"
                        };
                        
                        return (
                          <motion.div 
                            key={uniqueKey}
                            ref={index === filteredFeed.length - 1 ? ref : undefined}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            <PostMain
                              post={post}
                              router={router}
                              id={post.id}
                              user_id={post.user_id}
                              audio_url={post.audio_url}
                              image_url={post.image_url}
                              price={post.price}
                              mp3_url={post.mp3_url}
                              m3u8_url={post.m3u8_url}
                              text={post.text}
                              trackname={post.trackname || "Untitled"}
                              created_at={post.created_at}
                              genre={post.genre}
                              profile={{
                                user_id: profile.user_id,
                                name: profile.name || "Unknown user",
                                image: profile.image || "https://placehold.co/300x300?text=User"
                              }}
                            />
                          </motion.div>
                        );
                      } else { // Vibe post
                        const vibe = item.data;
                        
                        return (
                          <motion.div 
                            key={uniqueKey}
                            ref={index === filteredFeed.length - 1 ? ref : undefined}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mb-6 px-4"
                          >
                            <VibeCard vibe={vibe} />
                          </motion.div>
                        );
                      }
                    })}
                  </AnimatePresence>

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 gap-4"
                    >
                      <div className="relative w-20 h-20">
                        <div className="absolute top-0 left-0 w-full h-full">
                          <div className="w-20 h-20 border-4 border-[#20DDBB]/20 rounded-full animate-pulse"></div>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-full">
                          <div className="w-20 h-20 border-4 border-transparent border-t-[#20DDBB] rounded-full animate-spin"></div>
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <img src="/images/T-logo.svg" alt="Logo" className="w-8 h-8 opacity-50" />
                        </div>
                      </div>
                      <p className="text-[#818BAC] text-sm animate-pulse">Loading more content...</p>
                    </motion.div>
                  )}

                  {/* End of list indicator */}
                  {!hasMore && filteredFeed.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#20DDBB]/10 border border-[#20DDBB]/20">
                        <span className="text-[#20DDBB] text-sm">✓</span>
                        <span className="text-[#818BAC] text-sm">You've reached the end</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Invisible loader trigger */}
                  <div ref={ref} className="h-10 w-full" />
                </Suspense>
              </ClientOnly>

              {/* Onboarding Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => showOnboarding()}
                className="fixed bottom-8 left-8 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white p-4 rounded-full 
                          shadow-lg hover:shadow-[#20DDBB]/20 transition-all z-50 group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaInfoCircle size={20} />
                <span className="absolute left-full ml-2 px-2 py-1 bg-[#1A2338] rounded text-sm whitespace-nowrap
                              opacity-0 group-hover:opacity-100 transition-opacity">
                  Show Guide
                </span>
              </motion.button>
            </div>
          </MainLayout>
        </GenreProvider>
      </ContentFilterProvider>
    </>
  );
}