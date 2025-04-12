"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useVibeStore, VibePostWithProfile } from '@/app/stores/vibeStore';
import { useUser } from '@/app/context/user';
import { useVibeComments, MUSIC_EMOJIS } from '@/app/hooks/useVibeComments';
import { 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ShareIcon, 
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  MusicalNoteIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import toast from 'react-hot-toast';
import { useGeneralStore } from '@/app/stores/general';
import { database } from '@/libs/AppWriteClient';
import { toggleVibeVote, addVibeComment, getVibeComments } from '@/app/lib/vibeActions';
import { useRouter } from 'next/navigation';
import createBucketUrl from '@/app/hooks/useCreateBucketUrl';
import { formatDistanceToNow } from 'date-fns';
import { 
  FaTwitter, 
  FaFacebook, 
  FaTelegram, 
  FaWhatsapp, 
  FaLink,
  FaEnvelope,
  FaInstagram,
  FaPinterest,
  FaReddit
} from 'react-icons/fa';
import { useShareVibeContext } from './useShareVibe';
import { getProfileImageUrl } from '@/app/utils/imageUtils';

interface VibeDetailPageProps {
  vibe: VibePostWithProfile;
}

interface VibeComment {
  id: string;
  user_id: string;
  vibe_id: string;
  text: string;
  created_at: string;
  profile?: {
    id: string;
    name: string;
    image?: string;
  };
  isOptimistic?: boolean;
}

const VibeDetailPage: React.FC<VibeDetailPageProps> = ({ vibe }) => {
  const router = useRouter();
  const { user } = useUser() || { user: null };
  const { isMobile } = useDeviceDetect();
  const { userLikedVibes, checkIfUserLikedVibe, likeVibe, unlikeVibe } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => {
    if (Array.isArray(vibe.stats)) {
      return parseInt(vibe.stats[0], 10) || 0;
    } else if (vibe.stats && typeof vibe.stats === 'object' && 'total_likes' in vibe.stats) {
      return vibe.stats.total_likes || 0;
    }
    return 0;
  });
  const [commentsCount, setCommentsCount] = useState(() => {
    if (Array.isArray(vibe.stats)) {
      return parseInt(vibe.stats[1], 10) || 0;
    } else if (vibe.stats && typeof vibe.stats === 'object' && 'total_comments' in vibe.stats) {
      return vibe.stats.total_comments || 0;
    }
    return 0;
  });
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(true);
  
  const { openShareModal } = useShareVibeContext();
  
  const useComments = (vibeId: string) => {
    const [comments, setComments] = useState<VibeComment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComments = useCallback(async () => {
      setLoading(true);
      try {
        const fetchedComments = await getVibeComments(vibeId);
        if (fetchedComments) {
          setComments(fetchedComments);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    }, [vibeId]);

    const addComment = useCallback((comment: VibeComment, replaceId?: string) => {
      if (replaceId) {
        setComments(prevComments => 
          prevComments.map(c => c.id === replaceId ? comment : c)
        );
      } else {
        setComments(prevComments => [...prevComments, comment]);
      }
    }, []);

    const deleteComment = useCallback((commentId: string) => {
      setComments(prevComments => prevComments.filter(c => c.id !== commentId));
    }, []);

    const addEmojiToComment = useCallback((emoji: string) => {
      // This function adds an emoji to the comment text
      return emoji;
    }, []);

    return { 
      comments, 
      fetchComments, 
      addComment, 
      deleteComment, 
      addEmojiToComment, 
      isLoading: loading 
    };
  };
  
  const { 
    comments, 
    fetchComments, 
    addComment, 
    deleteComment, 
    addEmojiToComment, 
    isLoading: commentsLoading 
  } = useComments(vibe.id);
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
    fetchComments();
    
    // Обновим счетчики при загрузке компонента
    refreshVibeStats();
    
    // Simulate image loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id, vibe.id, checkIfUserLikedVibe, userLikedVibes, fetchComments]);

  // Update comment count when comments are loaded
  useEffect(() => {
    if (comments && comments.length > 0) {
      setCommentsCount(comments.length);
    }
  }, [comments]);

  const handleLikeToggle = async () => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    try {
      // Оптимистично обновляем UI сразу
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((prev: number) => Math.max(0, prev - 1));
      } else {
        setIsLiked(true);
        // Если это первый лайк (текущее значение 0), устанавливаем сразу 1,
        // иначе инкрементируем предыдущее значение
        setLikesCount((prev: number) => prev === 0 ? 1 : prev + 1);
      }

      // Вызываем API для лайков
      const response = await toggleVibeVote(vibe.id, user.id);
      
      // Обновляем счетчик лайков с точным значением из API
      if (response && response.count !== undefined) {
        setLikesCount(response.count);
        setIsLiked(response.action === 'liked');
        
        // Обновляем локальную статистику в vibe объекте
        // Эта часть важна для предотвращения ошибки "Unknown attribute: '0'"
        if (Array.isArray(vibe.stats)) {
          // Если stats это массив, обновляем первый элемент (индекс лайков)
          const updatedStats = [...vibe.stats];
          updatedStats[0] = response.count.toString();
          vibe.stats = updatedStats;
        } else if (typeof vibe.stats === 'object' && vibe.stats !== null) {
          // Если stats это объект, обновляем total_likes
          vibe.stats = {
            ...vibe.stats,
            total_likes: response.count
          };
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // В случае ошибки возвращаем предыдущее состояние
      if (isLiked) {
        setIsLiked(true);
        setLikesCount((prev: number) => prev + 1);
      } else {
        setIsLiked(false);
        setLikesCount((prev: number) => Math.max(0, prev - 1));
      }
      
      toast.error('Could not update like. Please try again.', {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
    }
  };

  // Функция для обновления статистики вайба (лайки, комментарии) из базы данных
  const refreshVibeStats = async () => {
    if (!vibe.id) return;
    
    try {
      const vibeDoc = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe.id
      );
      
      if (vibeDoc && vibeDoc.stats) {
        // Update local state with fresh stats
        const stats = vibeDoc.stats;
        
        if (Array.isArray(stats)) {
          setLikesCount(parseInt(stats[0], 10) || 0);
          setCommentsCount(parseInt(stats[1], 10) || 0);
        } else if (typeof stats === 'object') {
          setLikesCount(stats.total_likes || 0);
          setCommentsCount(stats.total_comments || 0);
        }
      }
    } catch (error) {
      console.error('Error refreshing vibe stats:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim comment text
    const text = commentText.trim();
    if (!text) return;
    
    // Check if user is logged in
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create an optimistic comment to immediately show in UI
      const optimisticId = `temp-${Date.now()}`;
      const optimisticComment: VibeComment = {
        id: optimisticId,
        user_id: user.id,
        vibe_id: vibe.id,
        text: text,
        created_at: new Date().toISOString(),
        profile: {
          id: user.id,
          name: user.name || 'You',
          image: user.image || undefined
        },
        isOptimistic: true
      };
      
      // Optimistically add comment to UI
      addComment(optimisticComment);
      
      // Optimistically update counter
      setCommentsCount(prev => prev + 1);
      
      // Clear input
      setCommentText('');
      
      // Send to server
      const { data, error } = await addVibeComment({
        user_id: user.id,
        vibe_id: vibe.id,
        text: text
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        // Replace optimistic comment with real one from server
        const serverComment: VibeComment = {
          id: data.id,
          user_id: data.user_id,
          vibe_id: data.vibe_id,
          text: data.text,
          created_at: data.created_at,
          profile: {
            id: user.id,
            name: user.name || 'You',
            image: user.image || undefined
          }
        };
        
        // Replace the optimistic comment with the real one
        addComment(serverComment, optimisticId);
        
        // Refresh vibe stats to ensure counts are accurate
        refreshVibeStats();
      }
      
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post your comment. Please try again.');
      
      // Revert optimistic updates if there was an error
      setCommentsCount(prev => Math.max(0, prev - 1));
      
      // Remove failed comment from UI
      const failedComments = comments.filter(c => c.isOptimistic);
      if (failedComments.length > 0) {
        failedComments.forEach(c => deleteComment(c.id));
      }
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setCommentText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleShare = () => {
    openShareModal(vibe.id, {
      imageUrl: vibe.media_url || '/images/placeholders/default-placeholder.svg',
      caption: vibe.caption || 'Share this musical moment',
      userName: vibe.profile?.name || 'Artist'
      });
  };

  const renderVibeContent = () => {
    switch(vibe.type) {
      case 'photo':
        return (
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2A2151]/50 to-[#1E1A36]/50 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                    rotate: [0, 10, 0, -10, 0],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                  className="text-[#20DDBB]"
                >
                  <MusicalNoteIcon className="w-12 h-12" />
                </motion.div>
              </div>
            )}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
            />
            <div className="w-full h-full flex items-center justify-center">
            <Image 
                src={imageError ? '/images/placeholders/image-placeholder.png' : (vibe.media_url || '/images/placeholders/default-placeholder.svg')} 
              alt={vibe.caption || 'Vibe post'}
                className={`object-contain w-full h-full transition-all duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              width={800}
              height={1000}
              onError={() => setImageError(true)}
              onLoad={() => setIsLoading(false)}
              priority
            />
            </div>
          </div>
        );
        
      // Другие типы Vibe можно добавить по мере необходимости
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
    <div className="min-h-screen pt-[70px] pb-20 md:pb-10 bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
        {/* Back button and share */}
        <div className="flex justify-between items-center mb-6">
          <motion.button 
            onClick={handleGoBack}
            whileHover={{ 
              scale: 1.05,
              backgroundColor: 'rgba(255, 255, 255, 0.15)'
            }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-[#20DDBB] transition-all duration-300 px-4 py-2 rounded-lg bg-white/5 hover:text-white backdrop-blur-sm border border-white/10"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </motion.button>
          
          <motion.button 
            onClick={handleShare}
            whileHover={{ 
              scale: 1.05,
              backgroundColor: 'rgba(255, 255, 255, 0.15)'
            }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-[#20DDBB] transition-all duration-300 px-4 py-2 rounded-lg bg-white/5 hover:text-white backdrop-blur-sm border border-white/10"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </motion.button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left column - Vibe content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-3/5"
          >
            {/* User info */}
            <div className="flex items-center mb-4">
              <Link href={`/profile/${vibe.user_id}`} className="flex items-center group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="w-12 h-12 rounded-full overflow-hidden mr-3 border-2 border-[#20DDBB]/30 group-hover:border-[#20DDBB]/80 transition-all duration-300"
                >
                  <Image 
                    src={vibe.profile?.image ? getProfileImageUrl(vibe.profile.image) : '/images/placeholders/user-placeholder.svg'} 
                    alt={vibe.profile?.name || 'User'}
                    className="w-full h-full object-cover"
                    width={48}
                    height={48}
                  />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[#20DDBB] transition-colors">
                    {vibe.profile?.name || 'Unknown User'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {new Date(vibe.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </Link>
            </div>
            
            {/* Vibe content */}
            <div className="mb-6 rounded-xl shadow-xl overflow-hidden shadow-[#20DDBB]/5">
              {renderVibeContent()}
            </div>
            
            {/* Caption */}
            {vibe.caption && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/5"
              >
                <p className="text-white/90 text-lg leading-relaxed">{vibe.caption}</p>
              </motion.div>
            )}
            
            {/* Tags & Mood */}
            <div className="flex flex-wrap gap-2 mb-6">
              {vibe.mood && (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-[#20DDBB]/20 text-[#20DDBB] text-sm backdrop-blur-sm border border-[#20DDBB]/20 hover:border-[#20DDBB]/40 transition-all duration-300"
                >
                  <span className="mr-1">🎭</span>
                  {vibe.mood}
                </motion.div>
              )}
              
              {vibe.tags && typeof vibe.tags === 'string' && vibe.tags.split(',').map((tag, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
                >
                  <span className="mr-1">#</span>
                  {tag.trim()}
                </motion.div>
              ))}
            </div>
            
            {/* Action buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center justify-around md:justify-start md:space-x-8 mb-8 pb-6 border-b border-white/10"
            >
              <motion.button 
                onClick={handleLikeToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col md:flex-row items-center md:space-x-2 group"
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  animate={isLiked ? { 
                    scale: [1, 1.4, 1],
                    rotate: [0, 15, -15, 0],
                  } : {}}
                  transition={{ duration: 0.5 }}
                  className={`p-2 rounded-full ${isLiked 
                    ? 'bg-gradient-to-br from-red-500/30 to-pink-500/30 shadow-lg shadow-red-500/20' 
                    : 'bg-white/5 backdrop-blur-sm group-hover:bg-white/10'}`}
                >
                  {isLiked ? (
                    <HeartIconSolid className="h-6 w-6 text-red-500" />
                  ) : (
                    <HeartIcon className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
                  )}
                </motion.div>
                <span className={`text-sm font-medium mt-1 md:mt-0 ${isLiked ? 'text-red-400' : 'text-gray-400 group-hover:text-white'}`}>
                  {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                </span>
              </motion.button>
              
              <div className="flex flex-col md:flex-row items-center md:space-x-2 group">
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10"
                >
                  <ChatBubbleLeftIcon className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
                </motion.div>
                <span className="text-sm font-medium mt-1 md:mt-0 text-gray-400 group-hover:text-white">
                  {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                </span>
              </div>
              
              <motion.button 
                onClick={handleShare}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col md:flex-row items-center md:space-x-2 group"
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10"
                >
                  <ShareIcon className="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" />
                </motion.div>
                <span className="text-sm font-medium mt-1 md:mt-0 text-gray-400 group-hover:text-white">
                  Share
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
          
          {/* Right column - Comments */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full md:w-2/5 bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl overflow-hidden border border-white/10 backdrop-filter backdrop-blur-lg shadow-xl"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1A1A2E] z-10">
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftIcon className="w-5 h-5 text-[#20DDBB]" />
                <h3 className="text-lg font-semibold text-white">Comments</h3>
              </div>
              <motion.div 
                animate={commentsCount > 0 ? { 
                  scale: [1, 1.1, 1],
                  backgroundColor: ['rgba(32, 221, 187, 0.2)', 'rgba(32, 221, 187, 0.3)', 'rgba(32, 221, 187, 0.2)'],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm font-medium px-2 py-1 rounded-full bg-[#20DDBB]/20 text-[#20DDBB]"
              >
                {commentsCount}
              </motion.div>
            </div>
            
            {/* Comments list */}
            <div className="overflow-y-auto max-h-[calc(100vh-350px)] md:max-h-[calc(100vh-300px)] p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30">
              {commentsLoading && comments.length === 0 ? (
                <div className="flex justify-center items-center py-10">
                  <div className="relative h-12 w-12">
                    <motion.div 
                      className="absolute h-12 w-12 rounded-full bg-purple-400 opacity-20"
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.3, 0.2],
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
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
                      transition={{ 
                        delay: comment.isOptimistic ? 0 : index * 0.05, 
                        duration: 0.3 
                      }}
                      className={`relative group ${comment.isOptimistic ? 'opacity-70' : ''}`}
                    >
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <Link href={`/profile/${comment.user_id}`}>
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="relative h-10 w-10 rounded-full overflow-hidden border border-white/10 hover:border-[#20DDBB]/50 transition-all duration-300"
                            >
                              <Image
                                src={comment.profile?.image || '/images/placeholders/user-placeholder.svg'}
                                alt={comment.profile?.name || 'User'}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            </motion.div>
                          </Link>
                        </div>
                        
                        <div className={`flex-1 p-3 rounded-lg ${comment.isOptimistic 
                          ? 'bg-gradient-to-r from-[#20DDBB]/20 to-[#0F9E8E]/20 border border-[#20DDBB]/30' 
                          : 'bg-white/5 hover:bg-white/10 transition-colors duration-300'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <Link href={`/profile/${comment.user_id}`}>
                              <span className="font-medium text-[#20DDBB] hover:text-white transition-colors">
                                {comment.profile?.name || 'User'}
                              </span>
                            </Link>
                            <div className="flex items-center">
                              {comment.isOptimistic && (
                                <motion.span 
                                  animate={{ opacity: [0.6, 1, 0.6] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="mr-2 text-[10px] text-[#20DDBB] bg-[#20DDBB]/20 px-2 py-0.5 rounded-full"
                                >
                                  Posting...
                                </motion.span>
                              )}
                            <span className="text-[11px] text-gray-500">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                            </div>
                          </div>
                          <p className="text-sm text-white/90">{comment.text}</p>
                        </div>
                      </div>
                      
                      {!comment.isOptimistic && user?.id === comment.user_id && (
                        <motion.button 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          whileHover={{ opacity: 1, scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="absolute -right-2 -top-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20 transition-all duration-300"
                          onClick={() => {
                            // Optimistically remove comment
                            const prevCount = commentsCount;
                            setCommentsCount(Math.max(0, prevCount - 1));
                            
                            if (deleteComment) {
                              deleteComment(comment.id);
                              
                              toast.success('Comment deleted!', {
                                duration: 2000,
                                style: {
                                  background: '#333',
                                  color: '#fff',
                                  borderRadius: '10px'
                                },
                                icon: '🗑️'
                              });
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-16 px-4"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="mx-auto mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mx-auto text-purple-500/20">
                    <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                  </svg>
                  </motion.div>
                  <h3 className="text-gray-300 text-xl font-medium mb-2 bg-gradient-to-r from-purple-300 to-[#20DDBB] bg-clip-text text-transparent">No comments yet</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">Be the first to share your thoughts about this musical vibe!</p>
                </motion.div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="p-4 border-t border-white/10 bg-gradient-to-r from-[#1A1A2E] to-[#1A1A2E]/90">
              <form onSubmit={handleSubmitComment} className="flex flex-col">
                {/* Emoji panel */}
                <motion.div 
                  className="mb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    type="button"
                    onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mb-2 text-sm text-[#20DDBB] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span className="flex items-center">
                      {showEmojiPanel ? 
                        <><span className="mr-1">🎵</span> Hide emojis</> : 
                        <><span className="mr-1">🎵</span> Show emojis</>
                      }
                    </span>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showEmojiPanel && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 p-2 bg-gradient-to-r from-[#1E1A36]/80 to-[#2A2151]/80 rounded-lg border border-white/5"
                      >
                        <p className="text-xs text-gray-400 mb-1.5">Quick emojis:</p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {['🎵', '🎶', '🎸', '🥁', '🎤', '🎧', '🎷', '🎹', '🎺', '🎻', '🔥', '🤩', '❤️', '👏', '🙌', '💯', '🕺', '💃', '🎼', '🎙️'].map((emoji) => (
                            <motion.button
                              key={emoji}
                              type="button"
                              onClick={() => handleAddEmoji(emoji)}
                              whileHover={{ 
                                scale: 1.3, 
                                rotate: [0, 5, -5, 0],
                                backgroundColor: 'rgba(32, 221, 187, 0.3)'
                              }}
                              whileTap={{ scale: 0.9 }}
                              className="text-xl md:text-2xl p-1.5 hover:bg-gradient-to-r from-[#20DDBB]/30 to-[#20DDBB]/20 rounded-full transition-all shadow-sm hover:shadow-[#20DDBB]/20"
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <motion.div 
                      whileHover={{ scale: 1.1, borderColor: 'rgba(32, 221, 187, 0.5)' }}
                      className="h-8 w-8 rounded-full overflow-hidden border border-white/10 transition-all duration-300"
                    >
                      <Image
                        src={user?.image ? getProfileImageUrl(user.image) : '/images/placeholders/user-placeholder.svg'}
                        alt="Your profile"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    </motion.div>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add your musical thoughts..."
                      className="w-full bg-white/5 text-white placeholder-gray-500 rounded-full py-2 px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] border border-white/10 transition-all duration-300 hover:border-white/20 focus:border-[#20DDBB]/50"
                    />
                    {/* Submit button */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || !commentText.trim()}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                        isSubmitting || !commentText.trim() 
                          ? 'text-gray-400' 
                          : 'text-[#20DDBB] hover:text-white'
                      }`}
                      whileHover={{ scale: commentText.trim() ? 1.1 : 1 }}
                      whileTap={{ scale: commentText.trim() ? 0.9 : 1 }}
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4"/>
                          </svg>
                        </motion.div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile fixed action bar */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0F172A] to-[#0F172A]/90 backdrop-blur-lg p-3 border-t border-white/5 z-40"
      >
        <div className="flex justify-around items-center">
          <motion.button 
            onClick={handleLikeToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={`p-2 rounded-full ${isLiked ? 'bg-red-500/20' : ''}`}
            >
              {isLiked ? (
                <HeartIconSolid className="h-7 w-7 text-red-500" />
              ) : (
                <HeartIcon className="h-7 w-7 text-gray-400" />
              )}
            </motion.div>
            <span className={`text-xs mt-1 ${isLiked ? 'text-red-400' : 'text-gray-400'}`}>
              {likesCount}
            </span>
          </motion.button>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="p-2 rounded-full">
              <ChatBubbleLeftIcon className="h-7 w-7 text-gray-400" />
            </div>
            <span className="text-xs mt-1 text-gray-400">
              {commentsCount}
            </span>
          </motion.div>
          
          <motion.button 
            onClick={handleShare}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="p-2 rounded-full">
              <ShareIcon className="h-7 w-7 text-gray-400" />
            </div>
            <span className="text-xs mt-1 text-gray-400">
              Share
            </span>
          </motion.button>
          
          <motion.button 
            onClick={handleGoBack}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="p-2 rounded-full">
              <ArrowLeftIcon className="h-7 w-7 text-gray-400" />
            </div>
            <span className="text-xs mt-1 text-gray-400">
              Back
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default VibeDetailPage; 