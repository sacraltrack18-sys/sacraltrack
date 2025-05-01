"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useVibeStore, VibePostWithProfile } from '@/app/stores/vibeStore';
import VibeDetailPage from '@/app/components/vibe/VibeDetailPage';
import { useUser } from '@/app/context/user';

const VibePage = () => {
  const params = useParams();
  const { fetchVibeById, vibePostById, isLoadingVibes, error, fetchUserLikedVibes } = useVibeStore();
  const { user } = useUser() || { user: null };
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVibe = async () => {
      setIsLoading(true);
      if (params?.id) {
        await fetchVibeById(params.id as string);
      }
      setIsLoading(false);
    };

    loadVibe();
  }, [params?.id, fetchVibeById]);

  // Load user likes when page loads
  useEffect(() => {
    const ensureLikesLoaded = async () => {
      // Индикатор операции
      const loadId = Math.random().toString(36).substring(7);
      
      // Проверяем кэш лайков перед загрузкой
      const likesLoadFailed = localStorage.getItem('likes_load_failed');
      const likesLoadTimestamp = localStorage.getItem('likes_load_timestamp');
      const needsForceRefresh = likesLoadFailed === 'true' && 
        likesLoadTimestamp && 
        Date.now() - parseInt(likesLoadTimestamp) < 5 * 60 * 1000; // 5 минут
        
      if (user && user.id && typeof fetchUserLikedVibes === 'function') {
        console.log(`[VIBE-DETAIL-PAGE ${loadId}] Ensuring user liked vibes are loaded${needsForceRefresh ? ' (forced)' : ''}`);
        
        // Максимальное количество попыток
        const maxRetries = 3;
        let retryCount = 0;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            // Если это повторная попытка, добавляем задержку
            if (retryCount > 0) {
              const delay = 500 * Math.pow(2, retryCount - 1);
              console.log(`[VIBE-DETAIL-PAGE ${loadId}] Retry ${retryCount}/${maxRetries} after ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            await fetchUserLikedVibes(user.id);
            console.log(`[VIBE-DETAIL-PAGE ${loadId}] User likes loaded successfully`);
            
            // Очищаем флаг ошибки загрузки
            if (needsForceRefresh) {
              localStorage.removeItem('likes_load_failed');
              localStorage.removeItem('likes_load_timestamp');
            }
            
            success = true;
          } catch (error) {
            retryCount++;
            console.error(`[VIBE-DETAIL-PAGE ${loadId}] Error loading user liked vibes (attempt ${retryCount}/${maxRetries}):`, error);
            
            if (retryCount >= maxRetries) {
              console.error(`[VIBE-DETAIL-PAGE ${loadId}] All attempts to load likes failed`);
            }
          }
        }
      } else {
        console.log(`[VIBE-DETAIL-PAGE] No user or fetchUserLikedVibes not available, skipping likes loading`);
      }
    };

    ensureLikesLoaded();
  }, [user, fetchUserLikedVibes]);

  if (isLoading || isLoadingVibes) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 pr-0 md:pr-6 mb-8 md:mb-0">
            <div className="animate-pulse rounded-xl overflow-hidden h-[500px] bg-white/5"></div>
          </div>
          <div className="w-full md:w-1/3 bg-white/5 rounded-xl animate-pulse h-[500px]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row">
          <div className="w-full p-6 text-center bg-white/5 rounded-xl backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Vibe</h1>
            <p className="text-white/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vibePostById) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row">
          <div className="w-full p-6 text-center bg-white/5 rounded-xl backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">Vibe Not Found</h1>
            <p className="text-white/80">We couldn't find the vibe you're looking for.</p>
          </div>
        </div>
      </div>
    );
  }

  return <VibeDetailPage vibe={vibePostById} />;
};

export default VibePage; 