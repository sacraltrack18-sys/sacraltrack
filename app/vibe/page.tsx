"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVibeStore } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import VibeCard, { VibeCardSkeleton } from '@/app/components/vibe/VibeCard';
import VibeUploader from '@/app/components/vibe/VibeUploader';
import Layout from '@/app/components/Layout';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  FaceSmileIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useInView } from 'react-intersection-observer';

const FilterButton: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      active 
        ? 'bg-purple-600 text-white' 
        : 'bg-[#1A1C2E] text-gray-400 hover:bg-[#252742] hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </motion.button>
);

export default function VibePage() {
  const userContext = useUser();
  const user = userContext?.user;
  const { 
    allVibePosts, 
    selectedVibeType, 
    isLoadingVibes, 
    hasMore,
    setSelectedVibeType, 
    fetchAllVibes, 
    loadMoreVibes,
    fetchUserLikedVibes
  } = useVibeStore();
  
  const [showUploader, setShowUploader] = useState(false);
  const [ref, inView] = useInView();
  
  // Load vibes and user likes when component mounts
  useEffect(() => {
    const initializeData = async () => {
      // Индикатор операции
      const initId = Math.random().toString(36).substring(7);
      console.log(`[VIBE-FEED ${initId}] Initializing data`);
      
      // Fetch vibes
      await fetchAllVibes();
      
      // Проверяем кэш лайков перед загрузкой
      const likesLoadFailed = localStorage.getItem('likes_load_failed');
      const likesLoadTimestamp = localStorage.getItem('likes_load_timestamp');
      const needsForceRefresh = likesLoadFailed === 'true' && 
        likesLoadTimestamp && 
        Date.now() - parseInt(likesLoadTimestamp) < 5 * 60 * 1000; // 5 минут
      
      // Load user likes if user is logged in
      if (user && user.id && typeof fetchUserLikedVibes === 'function') {
        console.log(`[VIBE-FEED ${initId}] Loading user liked vibes${needsForceRefresh ? ' (forced)' : ''}`);
        
        // Максимальное количество попыток
        const maxRetries = 3;
        let retryCount = 0;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            // Если это повторная попытка, добавляем задержку
            if (retryCount > 0) {
              const delay = 500 * Math.pow(2, retryCount - 1);
              console.log(`[VIBE-FEED ${initId}] Retry ${retryCount}/${maxRetries} after ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            await fetchUserLikedVibes(user.id);
            console.log(`[VIBE-FEED ${initId}] User likes loaded successfully`);
            
            // Очищаем флаг ошибки загрузки
            if (needsForceRefresh) {
              localStorage.removeItem('likes_load_failed');
              localStorage.removeItem('likes_load_timestamp');
            }
            
            success = true;
          } catch (error) {
            retryCount++;
            console.error(`[VIBE-FEED ${initId}] Error loading user liked vibes (attempt ${retryCount}/${maxRetries}):`, error);
            
            if (retryCount >= maxRetries) {
              console.error(`[VIBE-FEED ${initId}] All attempts to load likes failed`);
            }
          }
        }
      } else {
        console.log(`[VIBE-FEED ${initId}] No user or fetchUserLikedVibes not available, skipping likes loading`);
      }
    };
    
    initializeData();
  }, [fetchAllVibes, user, fetchUserLikedVibes]);
  
  // Load more posts when scrolling to the bottom
  useEffect(() => {
    if (inView && hasMore && !isLoadingVibes) {
      loadMoreVibes();
    }
  }, [inView, hasMore, isLoadingVibes, loadMoreVibes]);
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">VIBE</h1>
            <p className="text-gray-400 mt-1">Share your mood with the world</p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUploader(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span className="font-medium">New Vibe</span>
          </motion.button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <FilterButton
            active={selectedVibeType === 'all'}
            icon={<span className="text-xl">🌈</span>}
            label="All"
            onClick={() => setSelectedVibeType('all')}
          />
          <FilterButton
            active={selectedVibeType === 'photo'}
            icon={<PhotoIcon className="h-5 w-5" />}
            label="Photos"
            onClick={() => setSelectedVibeType('photo')}
          />
          <FilterButton
            active={selectedVibeType === 'video'}
            icon={<VideoCameraIcon className="h-5 w-5" />}
            label="Videos"
            onClick={() => setSelectedVibeType('video')}
          />
          <FilterButton
            active={selectedVibeType === 'sticker'}
            icon={<FaceSmileIcon className="h-5 w-5" />}
            label="Stickers"
            onClick={() => setSelectedVibeType('sticker')}
          />
        </div>
        
        {/* Vibe Grid */}
        <div className="grid grid-cols-1 gap-6 max-w-[450px] mx-auto">
          {isLoadingVibes && allVibePosts.length === 0 ? (
            // Show skeletons while loading
            Array.from({ length: 6 }).map((_, index) => (
              <VibeCardSkeleton key={index} />
            ))
          ) : allVibePosts.length > 0 ? (
            // Show vibes
            allVibePosts.map(vibe => (
              <VibeCard key={vibe.id} vibe={vibe} />
            ))
          ) : (
            // No vibes found
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="text-gray-400 mb-4 text-6xl">
                <span className="text-5xl">🌈</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Vibes Found</h3>
              <p className="text-gray-400 max-w-md mb-8">
                Be the first to share your vibe with the community!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUploader(true)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Create Vibe</span>
              </motion.button>
            </div>
          )}
        </div>
        
        {/* Load more indicator */}
        {hasMore && (
          <div ref={ref} className="flex justify-center mt-8 pb-8">
            <div className="flex items-center text-gray-400">
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${isLoadingVibes ? 'animate-spin' : ''}`} />
              <span>{isLoadingVibes ? 'Loading more vibes...' : 'Load more vibes'}</span>
            </div>
          </div>
        )}
        
        {/* Vibe uploader modal */}
        <AnimatePresence>
          {showUploader && (
            <VibeUploader 
              onClose={() => setShowUploader(false)} 
              onSuccess={() => {
                setShowUploader(false);
                fetchAllVibes();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
} 