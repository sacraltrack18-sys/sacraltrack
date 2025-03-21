"use client"

import { useEffect, useState, useRef } from "react"
import { usePostStore } from "@/app/stores/post"
import ClientOnly from "./components/ClientOnly"
import PostMain from "./components/PostMain"
import { GenreProvider } from "@/app/context/GenreContext";
import { useRouter } from "next/navigation";
import React, { Suspense } from "react";
import { useInView } from 'react-intersection-observer';
import MainLayout from "./layouts/MainLayout"
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshCountRef = useRef(0); // Refresh counter
  const MAX_AUTO_REFRESHES = 1; // Maximum number of auto-refreshes
  
  const { 
    allPosts, 
    loadMorePosts,
    setAllPosts, 
    isLoading, 
    hasMore,
    selectedGenre 
  } = usePostStore();

  // Улучшенные настройки IntersectionObserver
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Уменьшаем отступ для более точного срабатывания
    triggerOnce: false, // Позволяем триггеру срабатывать multiple times
  });

  // Initial load
  useEffect(() => {
    console.log("[DEBUG-PAGE] Initial posts loading, selected genre:", selectedGenre);
    setAllPosts();
    refreshCountRef.current = 0;
    setAutoRefreshEnabled(true);
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
      
      setAllPosts();
      refreshCountRef.current += 1;
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, selectedGenre, autoRefreshEnabled]);

  // Improved scroll loading logic
  useEffect(() => {
    const handleLoadMore = async () => {
      if (inView && hasMore && !isLoading) {
        console.log("[DEBUG-PAGE] Loading more posts...");
        await loadMorePosts();
      }
    };

    handleLoadMore();
  }, [inView, hasMore, isLoading]);

  // Filtering is done in the store
  const filteredPosts = allPosts;

  return (
    <>
      <GenreProvider>
        <MainLayout>
          <div className="mt-[80px] w-full ml-auto">
            {/* Auto-refresh info */}
            {!autoRefreshEnabled && (
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
                {/* No posts message */}
                {filteredPosts.length === 0 && !isLoading && (
                  <div className="text-center text-[#818BAC] py-4">
                    No posts found. Check the developer console logs.
                  </div>
                )}
                
                {/* Posts list */}
                <AnimatePresence mode="popLayout">
                  {filteredPosts.map((post, index) => {
                    const uniqueKey = `${post.id}-${index}`;
                    const profile = post.profile || {
                      user_id: "unknown",
                      name: "Unknown user",
                      image: "https://placehold.co/300x300?text=User"
                    };
                    
                    return (
                      <motion.div 
                        key={uniqueKey}
                        ref={index === filteredPosts.length - 1 ? ref : undefined}
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
                    <p className="text-[#818BAC] text-sm animate-pulse">Loading more tracks...</p>
                  </motion.div>
                )}

                {/* End of list indicator */}
                {!hasMore && filteredPosts.length > 0 && (
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
          </div>
        </MainLayout>
      </GenreProvider>
    </>
  );
}