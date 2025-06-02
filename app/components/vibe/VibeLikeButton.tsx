"use client";

import React, { useState, useEffect } from 'react';
import { useVibeStore } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useGeneralStore } from '@/app/stores/general';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface VibeLikeButtonProps {
  vibeId: string;
  initialLikeCount?: number | string;
  initialLikeState?: boolean;
  onLikeUpdated?: (count: number, isLiked: boolean) => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VibeLikeButton: React.FC<VibeLikeButtonProps> = ({
  vibeId,
  initialLikeCount = 0,
  initialLikeState = false,
  onLikeUpdated,
  showCount = true,
  size = 'md',
  className = '',
}) => {
  const { user } = useUser() || { user: null };
  const { userLikedVibes, likeVibe, unlikeVibe, checkIfUserLikedVibe, fetchUserLikedVibes } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  
  // Local state for the like button
  const [isLiked, setIsLiked] = useState(initialLikeState);
  const [likesCount, setLikesCount] = useState<number>(
    typeof initialLikeCount === 'string' ? parseInt(initialLikeCount) || 0 : initialLikeCount || 0
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Function to get local storage key for this vibe
  const getVibeLocalStorageKey = (id: string) => `vibe_like_count_${id}`;
  const getVibeUserLikedLocalStorageKey = (id: string, userId: string) => `vibe_liked_by_user_${id}_${userId}`;

  // Immediately update likes count when initialLikeCount changes
  useEffect(() => {
    const newCount = typeof initialLikeCount === 'string' 
      ? parseInt(initialLikeCount) || 0 
      : initialLikeCount || 0;
      
    if (newCount !== likesCount) {
      setLikesCount(newCount);
      try {
        localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
    }
  }, [initialLikeCount, vibeId]);

  // Check if the like count is stored in localStorage
  useEffect(() => {
    if (!vibeId) return;
    
    try {
      // Get stored like count
      const storedCountKey = getVibeLocalStorageKey(vibeId);
      const storedCount = localStorage.getItem(storedCountKey);
      
      if (storedCount) {
        const parsedCount = parseInt(storedCount, 10);
        if (!isNaN(parsedCount) && parsedCount !== likesCount) {
          console.log(`[VibeLikeButton] Using stored like count for ${vibeId}: ${parsedCount}`);
          setLikesCount(parsedCount);
          
          // Notify parent of updated count if callback provided
          if (onLikeUpdated) {
            onLikeUpdated(parsedCount, isLiked);
          }
        }
      }
      
      // If user is logged in, check if they liked this vibe in localStorage
      if (user && user.id) {
        const userLikedKey = getVibeUserLikedLocalStorageKey(vibeId, user.id);
        const userLiked = localStorage.getItem(userLikedKey);
        
        if (userLiked === 'true' && !isLiked) {
          console.log(`[VibeLikeButton] Setting isLiked=true from localStorage for ${vibeId}`);
          setIsLiked(true);
          
          // Notify parent of updated like state if callback provided
          if (onLikeUpdated) {
            onLikeUpdated(likesCount, true);
          }
        }
      }
    } catch (error) {
      console.error('[VibeLikeButton] Error accessing localStorage:', error);
    }
  }, [vibeId, user]);

  // Check initial like state when component mounts
  useEffect(() => {
    if (!user || !vibeId) return;
    
    const checkInitialLikeStatus = async () => {
      try {
        // First check store for faster response
        if (Array.isArray(userLikedVibes) && userLikedVibes.includes(vibeId)) {
          setIsLiked(true);
          
          // Update localStorage
          try {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), 'true');
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
          return;
        }
        
        // If not in store, check the API
        const hasLiked = await checkIfUserLikedVibe(vibeId, user.id);
        setIsLiked(hasLiked);
        
        // Update localStorage
        try {
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), hasLiked ? 'true' : 'false');
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
      } catch (error) {
        console.error('[VibeLikeButton] Error checking like status:', error);
      }
    };
    
    checkInitialLikeStatus();
  }, [vibeId, user, userLikedVibes, checkIfUserLikedVibe]);
  
  // Watch for changes in userLikedVibes
  useEffect(() => {
    if (!vibeId) return;
    
    if (Array.isArray(userLikedVibes)) {
      const isLikedInStore = userLikedVibes.includes(vibeId);
      if (isLikedInStore !== isLiked) {
        setIsLiked(isLikedInStore);
        
        // Update localStorage if user is logged in
        if (user && user.id) {
          try {
            localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), isLikedInStore ? 'true' : 'false');
          } catch (e) {
            console.error('[VibeLikeButton] Error updating localStorage:', e);
          }
        }
      }
    }
  }, [userLikedVibes, vibeId, isLiked]);
  
  // Update local state when initialLikeState changes from parent
  useEffect(() => {
    if (initialLikeState !== isLiked) {
      setIsLiked(initialLikeState);
      
      // Update localStorage if user is logged in
      if (user && user.id) {
        try {
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), initialLikeState ? 'true' : 'false');
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
      }
    }
  }, [initialLikeState]);

  const handleLikeToggle = async () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    // Store previous state for rollback
    const prevIsLiked = isLiked;
    const prevCount = likesCount;
    
    try {
      // Immediate UI update
      const newIsLiked = !isLiked;
      const newCount = newIsLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
      
      // Update UI immediately
      setIsLiked(newIsLiked);
      setLikesCount(newCount);
      
      // Update localStorage
      try {
        localStorage.setItem(getVibeLocalStorageKey(vibeId), newCount.toString());
        localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), newIsLiked ? 'true' : 'false');
      } catch (e) {
        console.error('[VibeLikeButton] Error updating localStorage:', e);
      }
      
      // Notify parent component
      if (onLikeUpdated) {
        onLikeUpdated(newCount, newIsLiked);
      }
      
      // Make API request
      const success = newIsLiked 
        ? await likeVibe(vibeId, user.id)
        : await unlikeVibe(vibeId, user.id);
      
      if (!success) {
        // Rollback on error
        setIsLiked(prevIsLiked);
        setLikesCount(prevCount);
        
        try {
          localStorage.setItem(getVibeLocalStorageKey(vibeId), prevCount.toString());
          localStorage.setItem(getVibeUserLikedLocalStorageKey(vibeId, user.id), prevIsLiked.toString());
        } catch (e) {
          console.error('[VibeLikeButton] Error updating localStorage:', e);
        }
        
        if (onLikeUpdated) {
          onLikeUpdated(prevCount, prevIsLiked);
        }
        
        toast.error(`Failed to ${newIsLiked ? 'like' : 'unlike'}. Please try again.`);
      } else {
        // Update global state
        if (user && user.id) {
          fetchUserLikedVibes(user.id);
        }
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(prevIsLiked);
      setLikesCount(prevCount);
      
      if (onLikeUpdated) {
        onLikeUpdated(prevCount, prevIsLiked);
      }
      
      console.error('[VibeLikeButton] Error in like operation:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Форматирование числа лайков
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleLikeToggle();
      }}
      disabled={isUpdating}
      className={`group flex items-center gap-1.5 ${className}`}
    >
      <div className={`relative flex items-center justify-center transition-transform duration-200 ${isUpdating ? 'scale-90' : 'hover:scale-110'}`}>
        {isLiked ? (
          <HeartIconSolid className={`${
            size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
          } text-red-500`} />
        ) : (
          <HeartIconOutline className={`${
            size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
          } text-gray-400 group-hover:text-red-500 transition-colors`} />
        )}
      </div>
      {showCount && (
        <span className={`${
          isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'
        } transition-colors ${
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
        }`}>
          {formatNumber(likesCount)}
        </span>
      )}
    </button>
  );
};

export default VibeLikeButton; 