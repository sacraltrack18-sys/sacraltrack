"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useVibeStore, VibePostWithProfile } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useVibeComments } from '@/app/hooks/useVibeComments';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  EllipsisHorizontalIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import toast from 'react-hot-toast';
import { useGeneralStore } from '@/app/stores/general';

interface VibeCardProps {
  vibe: VibePostWithProfile;
  onLike?: (vibeId: string) => void;
  onUnlike?: (vibeId: string) => void;
}

export const VibeCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-[#1E1A36] to-[#2A2151] rounded-xl overflow-hidden shadow-xl border border-white/5 relative max-w-sm w-full mx-auto"
    >
      {/* Декоративный элемент */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full"></div>

      <div className="p-4">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 skeleton-wave"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 w-28 bg-white/10 rounded-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-white/10 to-purple-600/5 skeleton-wave"></div>
            </div>
            <div className="h-3 w-20 bg-white/5 rounded-md mt-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-white/5 to-purple-600/5 skeleton-wave"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 h-4 w-3/4 bg-white/5 rounded-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-white/5 to-purple-600/5 skeleton-wave"></div>
        </div>
      </div>
      
      <div className="px-4 mb-4">
        <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-white/5 to-purple-600/5 skeleton-wave"></div>
          
          {/* Имитация тега "Fresh Vibe" */}
          <div className="absolute top-3 left-3">
            <div className="bg-white/10 h-6 w-24 rounded-full"></div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between mb-3">
          <div className="flex space-x-4">
            <div className="flex items-center space-x-1">
              <div className="h-8 w-8 bg-white/5 rounded-full"></div>
              <div className="h-3 w-5 bg-white/5 rounded-md"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-8 w-8 bg-white/5 rounded-full"></div>
              <div className="h-3 w-5 bg-white/5 rounded-md"></div>
            </div>
          </div>
          <div className="h-8 w-8 bg-white/5 rounded-full"></div>
        </div>
        
        <div className="h-3 w-32 bg-white/5 rounded-md mt-3"></div>
        <div className="h-3 w-24 bg-white/5 rounded-md mt-2"></div>
      </div>
      
      {/* Добавляем стили для анимации */}
      <style jsx global>{`
        .skeleton-wave {
          animation: skeletonWave 1.5s infinite;
          background-size: 200% 100%;
        }
        
        @keyframes skeletonWave {
          0% {
            background-position: -100% 0;
          }
          50% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </motion.div>
  );
};

const VibeCard: React.FC<VibeCardProps> = ({ vibe, onLike, onUnlike }) => {
  const { user } = useUser() || { user: null };
  const { isMobile } = useDeviceDetect();
  const { userLikedVibes, checkIfUserLikedVibe, likeVibe, unlikeVibe, deleteVibePost } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => {
    // Проверяем формат stats
    if (Array.isArray(vibe.stats) && vibe.stats.length > 0) {
      return parseInt(vibe.stats[0], 10) || 0;
    } else if (vibe.stats && typeof vibe.stats === 'object' && 'total_likes' in vibe.stats) {
      return vibe.stats.total_likes || 0;
    }
    return 0;
  });
  const [showComments, setShowComments] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { comments, fetchComments, addComment, isLoading: commentsLoading } = useVibeComments(vibe.id);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user?.id && vibe.id) {
        try {
          const hasLiked = await checkIfUserLikedVibe(vibe.id, user.id);
          setIsLiked(hasLiked);
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      } else {
        setIsLiked(false);
      }
    };

    checkLikeStatus();
    
    // Simulate image loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id, vibe.id, checkIfUserLikedVibe, userLikedVibes]);

  const handleLikeToggle = async () => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    try {
      if (isLiked) {
        await unlikeVibe(vibe.id, user.id);
        setIsLiked(false);
        setLikesCount((prev: number) => Math.max(0, prev - 1));
        if (onUnlike) onUnlike(vibe.id);
      } else {
        await likeVibe(vibe.id, user.id);
        setIsLiked(true);
        setLikesCount((prev: number) => prev + 1);
        if (onLike) onLike(vibe.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleOpenComments = async () => {
    await fetchComments();
    setShowComments(true);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    try {
      await addComment(commentText);
      setCommentText('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleShare = () => {
    if (navigator.share && isMobile) {
      navigator.share({
        title: `${vibe.profile?.name}'s Vibe`,
        text: vibe.caption || 'Check out this vibe!',
        url: `${window.location.origin}/vibe/${vibe.id}`
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Copy to clipboard for desktop
      navigator.clipboard.writeText(`${window.location.origin}/vibe/${vibe.id}`);
      toast.success('Link copied to clipboard');
    }
  };

  const handleDeleteVibe = async () => {
    try {
      setIsDeleting(true);
      setShowOptions(false);
      
      // Показываем стильный тост с подтверждением
      toast((t) => (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-900/80 to-red-950/80 rounded-lg shadow-xl border border-red-700/30">
          <div className="flex-shrink-0">
            <TrashIcon className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white text-sm">Delete this vibe?</h4>
            <p className="text-xs text-red-200 mt-0.5">This action cannot be undone</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                toast.dismiss(t.id);
                
                // Показываем тост с процессом удаления
                const deleteToastId = toast.loading(
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Deleting vibe</span>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                  </div>,
                  { 
                    style: {
                      background: 'linear-gradient(to right, rgba(46, 16, 101, 0.95), rgba(30, 10, 60, 0.95))',
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    } 
                  }
                );
                
                try {
                  await deleteVibePost(vibe.id, vibe.media_url);
                  
                  // Успешное удаление
                  toast.success(
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Vibe successfully deleted</span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    </div>,
                    { 
                      id: deleteToastId,
                      style: {
                        background: 'linear-gradient(to right, rgba(16, 62, 45, 0.95), rgba(10, 40, 30, 0.95))',
                        color: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                      },
                      duration: 3000
                    }
                  );
                } catch (error) {
                  console.error('Error deleting vibe:', error);
                  
                  // Ошибка удаления
                  toast.error(
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Failed to delete vibe</span>
                      <motion.div
                        initial={{ rotate: 45 }}
                        animate={{ rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    </div>,
                    { 
                      id: deleteToastId,
                      style: {
                        background: 'linear-gradient(to right, rgba(76, 5, 25, 0.95), rgba(54, 5, 20, 0.95))',
                        color: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                      } 
                    }
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              Delete
            </button>
            <button 
              onClick={() => toast.dismiss(t.id)}
              className="py-1.5 px-3 bg-gray-700 hover:bg-gray-800 text-white text-xs font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ), 
      { duration: 10000 });
    } catch (error) {
      console.error('Error initiating vibe deletion:', error);
      setIsDeleting(false);
    }
  };

  // Обновляем renderVibeContent чтобы добавить стили для видео и стикер-типов
  const renderVibeContent = () => {
    switch (vibe.type) {
      case 'photo':
        return (
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-indigo-900/80 animate-pulse flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 animate-spin text-purple-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                  <span className="mt-2 text-purple-200 text-sm font-medium">Loading your vibe...</span>
                </div>
              </div>
            )}
            <Image
              src={imageError ? '/images/placeholders/image-placeholder.png' : vibe.media_url}
              alt={vibe.caption || 'Vibe photo'}
              fill
              className={`object-cover transition-all duration-500 ${isLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} group-hover:scale-110 group-hover:filter group-hover:brightness-110`}
              onError={() => setImageError(true)}
              onLoad={() => setIsLoading(false)}
            />
            {/* Градиентный оверлей */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Декоративный музыкальный элемент - ноты */}
            <div className="absolute top-0 right-0 -mr-8 mt-4 opacity-0 group-hover:opacity-100 group-hover:mr-4 transition-all duration-700">
              <div className="relative h-24 w-24">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-5 h-5 text-purple-400 absolute top-0 right-0"
                  animate={{ 
                    y: [0, -15, 0],
                    opacity: [0, 1, 0],
                    scale: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: 0.2
                  }}
                >
                  <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                </motion.svg>
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4 text-pink-400 absolute top-2 right-6"
                  animate={{ 
                    y: [0, -10, 0],
                    opacity: [0, 1, 0],
                    scale: [0.6, 0.9, 0.6]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: 0.5
                  }}
                >
                  <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                </motion.svg>
              </div>
            </div>
            
            {/* Накладка настроения */}
            {vibe.mood && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-indigo-600 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-white/10 flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-medium tracking-wide">{vibe.mood}</span>
              </div>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2A2151]/80 to-[#1E1A36]/80 flex flex-col items-center justify-center p-4">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center mb-6 border border-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              </motion.div>
              <h3 className="text-white text-xl font-bold mb-2 text-center">Music Video Vibes</h3>
              <p className="text-purple-200 text-sm text-center max-w-xs">
                Share your performances, music clips, and live sessions in our upcoming video feature
              </p>
              <div className="mt-6 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    x: [-20, 0, -20]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-3 h-3 rounded-full bg-purple-400 mr-1"
                ></motion.div>
                <motion.div
                  animate={{ 
                    x: [-10, 10, -10]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                  className="w-3 h-3 rounded-full bg-pink-400 mr-1"
                ></motion.div>
                <motion.div
                  animate={{ 
                    x: [0, 20, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4
                  }}
                  className="w-3 h-3 rounded-full bg-indigo-400"
                ></motion.div>
              </div>
              <div className="mt-4 px-4 py-2 rounded-full bg-white/10 text-xs text-white font-medium tracking-wider">
                COMING SOON
              </div>
            </div>
          </div>
        );
      
      case 'sticker':
        return (
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2A2151]/80 to-[#1E1A36]/80 flex flex-col items-center justify-center p-4">
              <motion.div
                animate={{ 
                  rotate: [0, 5, 0, -5, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-24 h-24 relative mb-6"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <motion.div 
                  className="absolute -top-2 -right-2"
                  animate={{ 
                    y: [-3, 0, -3],
                    rotate: [0, 10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
              </svg>
                </motion.div>
              </motion.div>
              <h3 className="text-white text-xl font-bold mb-2 text-center">Musical Sticker Vibes</h3>
              <p className="text-purple-200 text-sm text-center max-w-xs">
                Express your musical mood with animated stickers and emojis that represent your artistic feelings
              </p>
              <div className="flex space-x-2 mt-6">
                {['🎵', '🎸', '🥁', '🎤', '🎧'].map((emoji, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -10, 0],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 1 + Math.random(),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2
                    }}
                    className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center text-lg shadow-lg"
                  >
                    {emoji}
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 px-4 py-2 rounded-full bg-white/10 text-xs text-white font-medium tracking-wider">
                COMING SOON
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-gradient-to-br from-[#2A2151]/50 to-[#1E1A36]/50 text-white p-6 rounded-xl text-center border border-white/5">
            <div className="text-purple-400 mb-2">Unknown Vibe Type</div>
            <p className="text-gray-300 text-sm">This vibe type is not supported yet</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-[#1E1A36] to-[#2A2151] rounded-xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-900/20 border border-white/5 transition-all relative max-w-sm w-full mx-auto"
    >
      {/* Декоративный фоновый элемент */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full -z-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-tr-full -z-10"></div>
      
      {/* Header с информацией о пользователе */}
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${vibe.user_id}`}>
            <div className="relative h-11 w-11 rounded-full border-2 border-purple-500/30 p-0.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Image
                src={vibe.profile?.image || '/images/placeholders/user-placeholder.svg'}
                alt={vibe.profile?.name || 'User'}
                fill
                className="rounded-full object-cover"
              />
            </div>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${vibe.user_id}`}>
              <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">
                {vibe.profile?.name || 'Unknown User'}
              </h3>
            </Link>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>{new Date(vibe.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-gray-500"></span>
              <span>{new Date(vibe.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </p>
          </div>
          
          {/* Options menu */}
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)} 
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" />
            </button>
            
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-gradient-to-b from-[#2A2D45] to-[#232642] rounded-lg shadow-xl z-10 py-1 border border-white/10"
              >
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-white transition-colors">
                  Report
                </button>
                {user?.id === vibe.user_id && (
                  <button 
                    onClick={handleDeleteVibe}
                    disabled={isDeleting}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 transition-colors flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4"
                        >
                          <svg className="h-4 w-4 text-red-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </motion.div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Caption с музыкальными нотами */}
        {vibe.caption && (
          <div className="mt-3 text-gray-300 text-sm relative">
            <div className="absolute -left-1 top-0 h-full w-0.5 bg-gradient-to-b from-purple-500/30 to-transparent rounded-full"></div>
            <p className="pl-3">{vibe.caption}</p>
          </div>
        )}
      </div>
      
      {/* Vibe content - photo, video, sticker */}
      <div className="px-4 mb-4">
        <div className="relative">
        {renderVibeContent()}
          
          {/* Fresh Vibe Tag - будет показан для новых вайбов, добавленных менее 24 часов назад */}
          {vibe.type === 'photo' && (new Date().getTime() - new Date(vibe.created_at).getTime() < 24 * 60 * 60 * 1000) && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
              <motion.div 
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 
                          px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg flex items-center gap-1 sm:gap-1.5 border border-white/10"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                whileHover={{ 
                  scale: 1.05, 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  transition: { 
                    backgroundPosition: { repeat: Infinity, duration: 3, ease: "linear" },
                    scale: { duration: 0.2 }
                  }
                }}
              >
                {/* Музыкальная нота */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-bounce">
                  <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                </svg>
                <span className="text-[10px] sm:text-xs font-bold text-white tracking-wider">FRESH VIBE</span>
              </motion.div>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons with improved styles */}
      <div className="px-4 pb-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <button 
              onClick={handleLikeToggle}
              className="flex items-center space-x-1 group"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`p-1.5 rounded-full ${isLiked ? 'bg-gradient-to-br from-red-500/30 to-pink-500/30 shadow-sm' : 'bg-white/5 backdrop-blur-sm group-hover:bg-white/10'}`}
              >
                {isLiked ? (
                  <HeartIconSolid className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                )}
              </motion.div>
              <span className={`text-xs ${isLiked ? 'text-red-400' : 'text-gray-400 group-hover:text-white'}`}>
                {likesCount}
              </span>
            </button>
            
            <button 
              onClick={handleOpenComments}
              className="flex items-center space-x-1 group"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10"
              >
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </motion.div>
              <span className="text-xs text-gray-400 group-hover:text-white">
                {Array.isArray(vibe.stats) && vibe.stats.length > 1 
                  ? parseInt(vibe.stats[1], 10) || 0 
                  : (vibe.stats && typeof vibe.stats === 'object' && 'total_comments' in vibe.stats)
                    ? vibe.stats.total_comments
                    : 0}
              </span>
            </button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="p-1.5 rounded-full bg-white/5 backdrop-blur-sm hover:bg-white/10"
          >
            <ShareIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
          </motion.button>
        </div>
        
        {/* Like count with improved style */}
        {likesCount > 0 && (
          <div className="mt-2 flex items-center">
            <span className="inline-block h-1 w-1 rounded-full bg-purple-500 mr-2"></span>
            <p className="text-xs text-gray-400">
            Liked by <span className="font-semibold text-white">{likesCount}</span> {likesCount === 1 ? 'person' : 'people'}
          </p>
          </div>
        )}
        
        {/* Location if available - with music venue style */}
        {vibe.location && (
          <div className="text-xs text-purple-400 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex items-center">
              <span>{vibe.location}</span>
              <div className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-sm bg-purple-900/30 text-[9px] text-purple-300">
                Venue
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Comments modal - стилизованный и адаптивный */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setShowComments(false)}
          >
            {/* Декоративные музыкальные ноты в фоне */}
            <motion.div 
              className="absolute inset-0 pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              {[...Array(10)].map((_, index) => (
                <motion.div
                  key={index}
                  className="absolute"
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: window.innerHeight + 20,
                    opacity: 0,
                    rotate: Math.random() * 60 - 30
                  }}
                  animate={{ 
                    y: -100, 
                    opacity: [0, 0.7, 0],
                    rotate: Math.random() * 60 - 30
                  }}
                  transition={{ 
                    duration: 10 + Math.random() * 15,
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`w-${Math.floor(Math.random() * 3) + 3} h-${Math.floor(Math.random() * 3) + 3} text-${['purple', 'pink', 'indigo'][Math.floor(Math.random() * 3)]}-${Math.floor(Math.random() * 3) + 4}00/50`}
                  >
                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                  </svg>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-gradient-to-br from-[#252742] to-[#1E1A36] rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/5 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Декоративный элемент */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-bl from-purple-600/20 to-transparent rounded-full"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-indigo-600/20 to-transparent rounded-full"></div>
              
              {/* Comments header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400">
                    <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Vibe Comments</h3>
                </div>
                <button 
                  onClick={() => setShowComments(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                </button>
              </div>
              
              {/* Comments list */}
              <div className="overflow-y-auto max-h-[50vh] p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30">
                {commentsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="relative h-12 w-12">
                      <div className="absolute animate-ping h-12 w-12 rounded-full bg-purple-400 opacity-20"></div>
                      <div className="relative flex justify-center items-center h-12 w-12 rounded-full bg-purple-600/20">
                        <svg className="animate-spin h-6 w-6 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                      </div>
                    </div>
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment, index) => (
                      <motion.div 
                        key={comment.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="relative"
                      >
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                            <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/10">
                          <Image
                            src={comment.profile?.image || '/images/placeholders/user-placeholder.svg'}
                            alt={comment.profile?.name || 'User'}
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                        </div>
                          </div>
                          <div className="flex-1">
                            <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/5 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-white text-sm">
                              {comment.profile?.name || 'Unknown User'}
                            </h4>
                                <p className="text-[10px] text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                              })}
                            </p>
                              </div>
                              <p className="text-gray-300 text-sm">{comment.text}</p>
                            </div>
                            
                            {/* Floating musical note for some comments */}
                            {index % 3 === 0 && (
                              <motion.div 
                                className="absolute -right-2 -top-2"
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                              >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                                    <path d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
                                  </svg>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mx-auto text-purple-500/30 mb-4">
                      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-300 text-lg font-medium mb-2">No comments yet</p>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Be the first to share your thoughts about this musical vibe!</p>
                  </div>
                )}
              </div>
              
              {/* Comment input */}
              <div className="p-4 border-t border-white/5 bg-gradient-to-r from-purple-900/10 to-indigo-900/10">
                <form onSubmit={handleSubmitComment} className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
                    <Image
                      src={user?.image || '/images/placeholders/user-placeholder.svg'}
                      alt="Your profile"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </div>
                  </div>
                  <div className="flex-1 relative">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add your musical thoughts..."
                      className="w-full bg-white/5 text-white placeholder-gray-500 rounded-full py-2 px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/10"
                  />
                    <motion.button
                    type="submit"
                    disabled={!commentText.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute right-1 top-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Post
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VibeCard; 