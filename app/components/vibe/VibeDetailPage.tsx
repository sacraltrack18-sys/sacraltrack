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
  XMarkIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import toast from 'react-hot-toast';
import { useGeneralStore } from '@/app/stores/general';
import { database, Query, account } from '@/libs/AppWriteClient';
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
import TopNav from '@/app/layouts/includes/TopNav';

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

// Move the useComments hook outside the component
const useComments = (vibeId: string) => {
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching comments for vibe ID:', vibeId); // Debug log
      const fetchedComments = await getVibeComments(vibeId);
      console.log('Fetched comments data:', fetchedComments); // Debug response
      
      // Check for properly structured response with comments property (API returns { comments: [...] })
      if (fetchedComments && fetchedComments.comments && Array.isArray(fetchedComments.comments)) {
        // Map the API response to the expected VibeComment format
        const formattedComments = await Promise.all(fetchedComments.comments.map(async (comment: any) => {
          // Get profile info if needed
          let profileInfo = { 
            id: comment.user_id,
            name: 'User',
            image: undefined
          };
          
          try {
            // Extract profile information from the comment if available
            if (comment.profile) {
              profileInfo = {
                id: comment.profile.id || comment.user_id,
                name: comment.profile.name || comment.userName || 'User',
                image: comment.profile.image || comment.profileImage || undefined
              };
            }
            
            // If there's a profileImage directly on the comment, use that
            if (comment.profileImage) {
              profileInfo.image = comment.profileImage;
            }
            
            // If there's a userName directly on the comment, use that
            if (comment.userName && !profileInfo.name) {
              profileInfo.name = comment.userName;
            }
            
            // If we have a userId but no profile info, try to get user data from backend
            if (comment.user_id && (!profileInfo.name || profileInfo.name === 'User' || !profileInfo.image)) {
              try {
                // Try to fetch user profile from database
                const userProfileResponse = await database.listDocuments(
                  process.env.NEXT_PUBLIC_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                  [Query.equal('user_id', comment.user_id)]
                );
                
                if (userProfileResponse.documents.length > 0) {
                  const userProfile = userProfileResponse.documents[0];
                  profileInfo = {
                    id: comment.user_id,
                    name: userProfile.name || profileInfo.name,
                    image: userProfile.image || profileInfo.image
                  };
                }
              } catch (profileFetchError) {
                console.error('Error fetching user profile for comment:', profileFetchError);
              }
            }
          } catch (profileError) {
            console.error('Error getting profile for comment:', profileError);
          }
          
          return {
            id: comment.$id || comment.id,
            user_id: comment.user_id,
            vibe_id: comment.vibe_id,
            text: comment.text,
            created_at: comment.created_at,
            profile: profileInfo
          };
        }));
        
        setComments(formattedComments);
        
        // Update total count
        if (typeof fetchedComments.total === 'number') {
          setTotalCount(fetchedComments.total);
        } else {
          setTotalCount(formattedComments.length);
        }
      } else if (fetchedComments && Array.isArray(fetchedComments)) {
        // Handle case where API directly returns an array of comments
        setComments(fetchedComments);
        setTotalCount(fetchedComments.length);
      } else {
        // Handle unexpected response format
        console.error('Unexpected format for fetchedComments:', fetchedComments);
        setComments([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load comments');
      setComments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [vibeId]);

  const addComment = useCallback((comment: VibeComment, replaceId?: string) => {
    try {
      if (!comment || typeof comment !== 'object') {
        console.error('Invalid comment object received in addComment:', comment);
        return;
      }
      
      if (replaceId) {
        setComments(prevComments => 
          prevComments.map(c => c.id === replaceId ? comment : c)
        );
      } else {
        setComments(prevComments => [comment, ...prevComments]);
        setTotalCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error in addComment:', error);
    }
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    try {
      if (!commentId) {
        console.error('Invalid commentId received in deleteComment:', commentId);
        return;
      }
      
      setComments(prevComments => prevComments.filter(c => c.id !== commentId));
      setTotalCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error in deleteComment:', error);
    }
  }, []);

  const addEmojiToComment = useCallback((emoji: string) => {
    try {
      // This function adds an emoji to the comment text
      if (typeof emoji !== 'string') {
        console.error('Invalid emoji in addEmojiToComment:', emoji);
        return '';
      }
      return emoji;
    } catch (error) {
      console.error('Error in addEmojiToComment:', error);
      return '';
    }
  }, []);

  return { 
    comments, 
    fetchComments, 
    addComment, 
    deleteComment, 
    addEmojiToComment, 
    isLoading: loading,
    error,
    totalCount
  };
};

// Add a type definition for the share options including modalOffset
type ShareOptions = {
  imageUrl?: string;
  caption?: string;
  userName?: string;
  modalOffset?: number;
};

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
  
  const { openShareModal } = useShareVibeContext();
  
  const { 
    comments, 
    fetchComments, 
    addComment, 
    deleteComment, 
    addEmojiToComment, 
    isLoading: commentsLoading,
    error,
    totalCount
  } = useComments(vibe.id);
  const [commentText, setCommentText] = useState('');
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Обновим функцию sanitizeText для безопасной работы с эмодзи
  const sanitizeText = (text: string): string => {
    try {
      // Проверяем, что текст - строка
      if (typeof text !== 'string') {
        console.warn('sanitizeText: received non-string input', text);
        return '';
      }
      
      // Ограничиваем длину текста
      let safeText = text.slice(0, 1000);
      
      // Удаляем или заменяем потенциально проблемные символы
      safeText = safeText.trim();
      
      // Экранируем специальные символы для безопасной передачи на сервер
      // Не изменяем эмодзи, но обрабатываем другие специальные символы
      const escapeSpecialChars = (str: string) => {
        try {
          return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        } catch (error) {
          console.error('Error in escapeSpecialChars:', error);
          return str; // Return the original string if escaping fails
        }
      };
      
      return escapeSpecialChars(safeText);
    } catch (error) {
      console.error('Error sanitizing text:', error);
      return '';
    }
  };
  
  // Добавим функцию для отображения комментариев с эмодзи
  const renderCommentText = (text: string): React.ReactNode => {
    try {
      if (text === undefined || text === null) {
        console.warn('renderCommentText received undefined or null text');
        return '';
      }
      
      if (typeof text !== 'string') {
        console.warn('renderCommentText received non-string input:', typeof text);
        return String(text || '');
      }
      
      // Decode HTML entities if any were encoded during sanitization
      const decodeHtmlEntities = (str: string) => {
        try {
          return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        } catch (error) {
          console.error('Error decoding HTML entities:', error);
          return str;
        }
      };
      
      return decodeHtmlEntities(text);
    } catch (error) {
      console.error('Error rendering comment text:', error);
      return String(text || '');
    }
  };
  
  // Add an enhanced useEffect specifically for comments loading
  useEffect(() => {
    // Force load comments when component mounts or when vibe.id changes
    if (vibe.id && fetchComments) {
      console.log('Explicitly loading comments for vibe ID:', vibe.id);
      
      // Fetch comments immediately
      fetchComments();
    }
  }, [vibe.id, fetchComments]);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user?.id && vibe.id) {
        try {
          // First try to get status from the backend directly
          const hasLiked = await checkIfUserLikedVibe(vibe.id, user.id);
          console.log('Like status from backend:', hasLiked);
          setIsLiked(hasLiked);
          
          // Also update the like count from the stats if available
          if (vibe.stats) {
            if (Array.isArray(vibe.stats)) {
              setLikesCount(parseInt(vibe.stats[0], 10) || 0);
            } else if (typeof vibe.stats === 'object' && 'total_likes' in vibe.stats) {
              setLikesCount(vibe.stats.total_likes || 0);
            }
          }
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      } else {
        setIsLiked(false);
      }
    };

    // Run like status check immediately on mount or user change
    checkLikeStatus();
    
    // No need to call fetchComments here as it's already called in the previous useEffect
    
    // Обновим счетчики при загрузке компонента
    refreshVibeStats();
    
    // Simulate image loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id, vibe.id, checkIfUserLikedVibe, userLikedVibes]);

  // Update comment count when comments are loaded or totalCount changes
  useEffect(() => {
    if (totalCount > 0) {
      setCommentsCount(totalCount);
    } else if (comments && comments.length > 0) {
      setCommentsCount(comments.length);
    }
  }, [comments, totalCount]);

  // Добавить useEffect для обработки клика вне панели эмодзи
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleLikeToggle = async () => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    // Store original state to revert in case of error
    const wasLiked = isLiked;
    const prevLikesCount = likesCount;

    try {
      // Проверяем и обновляем сессию пользователя перед выполнением действия с лайком
      try {
        // Это проверит текущую сессию и вернет ошибку, если сессия истекла
        await account.get();
      } catch (sessionError) {
        console.error('Session error:', sessionError);
        // Если сессия истекла, показываем сообщение и открываем окно логина
        toast.error('Your session has expired. Please log in again.', {
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px'
          }
        });
        setIsLoginOpen(true);
        return;
      }

      // Optimistically update UI first
      // Update local state
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((prev: number) => Math.max(0, prev - 1));
      } else {
        setIsLiked(true);
        setLikesCount((prev: number) => prev === 0 ? 1 : prev + 1);
      }
      
      // Создаем уникальный ID операции для отладки
      const operationId = Math.random().toString(36).substring(2, 10);
      console.log(`[VIBE-DETAIL] Starting like operation ${operationId} for vibe ${vibe.id}`);

      // Make API call
      try {
        const response = await toggleVibeVote(vibe.id, user.id);
        
        // Update state with actual values from server
        if (response && response.count !== undefined) {
          console.log(`[VIBE-DETAIL] Like operation ${operationId} succeeded. Action: ${response.action}, Count: ${response.count}`);
          
          // Немедленно обновляем UI с данными сервера
          setLikesCount(response.count);
          setIsLiked(response.action === 'liked');
          
          // Update local store for persistence
          try {
            if (response.action === 'liked' && likeVibe) {
              await likeVibe(vibe.id, user.id);
            } else if (response.action === 'unliked' && unlikeVibe) {
              await unlikeVibe(vibe.id, user.id);
            }
          } catch (storeError) {
            console.error(`[VIBE-DETAIL] Store update error in operation ${operationId}:`, storeError);
          }
          
          // Update local stats in vibe object
          if (Array.isArray(vibe.stats)) {
            const updatedStats = [...vibe.stats];
            updatedStats[0] = response.count.toString();
            vibe.stats = updatedStats;
          } else if (typeof vibe.stats === 'object' && vibe.stats !== null) {
            vibe.stats = {
              ...vibe.stats,
              total_likes: response.count
            };
          }
          
          // Обновляем глобальное состояние для согласованности всех компонентов
          refreshVibeStats();
        }
      } catch (apiError) {
        console.error(`[VIBE-DETAIL] API error in like operation ${operationId}:`, apiError);
        // Revert optimistic update on error
        setIsLiked(wasLiked);
        setLikesCount(prevLikesCount);
        
        // Show user-friendly error
        toast.error('Failed to update like. Please try again.', {
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px'
          }
        });
        
        // If it's an auth error, we need to prompt for login
        if (apiError.toString().includes('401') || 
            apiError.toString().includes('unauthorized') || 
            apiError.toString().includes('unauthenticated')) {
          setIsLoginOpen(true);
        }
      }
    } catch (error) {
      console.error('[VIBE-DETAIL] Error toggling like:', error);
      
      // If there was an error, revert to previous state
      setIsLiked(wasLiked);
      setLikesCount(prevLikesCount);
      
      let errorMessage = 'Could not update like. Please try again.';
      
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('unauthorized') || error.message.includes('authenticated')) {
          errorMessage = 'Please log in to like this vibe.';
          setIsLoginOpen(true);
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }
      
      toast.error(errorMessage, {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
    }
  };

  // Функция для обновления статистики вайба из базы данных
  const refreshVibeStats = async () => {
    if (!vibe.id) return;
    
    try {
      console.log(`[VIBE-DETAIL] Refreshing stats for vibe ${vibe.id}`);
      const vibeDoc = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe.id
      );
      
      if (vibeDoc && vibeDoc.stats) {
        // Update local state with fresh stats
        const stats = vibeDoc.stats;
        
        if (Array.isArray(stats)) {
          const newLikesCount = parseInt(stats[0], 10) || 0;
          const newCommentsCount = parseInt(stats[1], 10) || 0;
          
          console.log(`[VIBE-DETAIL] Stats refreshed: likes=${newLikesCount}, comments=${newCommentsCount}`);
          
          setLikesCount(newLikesCount);
          setCommentsCount(newCommentsCount);
          
          // Обновляем объект вайба тоже для согласованности
          vibe.stats = stats;
        } else if (typeof stats === 'object') {
          const newLikesCount = stats.total_likes || 0;
          const newCommentsCount = stats.total_comments || 0;
          
          console.log(`[VIBE-DETAIL] Stats refreshed: likes=${newLikesCount}, comments=${newCommentsCount}`);
          
          setLikesCount(newLikesCount);
          setCommentsCount(newCommentsCount);
          
          // Обновляем объект вайба тоже для согласованности
          vibe.stats = stats;
        }
      } else {
        console.log(`[VIBE-DETAIL] No stats found in refreshed vibe document`);
      }
    } catch (error) {
      console.error('[VIBE-DETAIL] Error refreshing vibe stats:', error);
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
    
    // Sanitize text before sending to server
    const sanitizedText = sanitizeText(text);
    if (sanitizedText === '') {
      toast.error('Comment text cannot be empty after sanitization');
      setIsSubmitting(false);
      return;
    }
    
    // Maximum number of retry attempts
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;
    
    while (retryCount < maxRetries && !success) {
      try {
        // Show retry toast if this is a retry attempt
        if (retryCount > 0) {
          toast.loading(`Retrying... (${retryCount}/${maxRetries})`, { id: 'comment-retry' });
        }
        
        // Send to server
        const { data, error } = await addVibeComment({
          user_id: user.id,
          vibe_id: vibe.id,
          text: sanitizedText
        });
        
        if (error) {
          throw new Error(error.message || 'Error adding comment');
        }
        
        if (data) {
          try {
            // Safely verify and create comment object with type checks
            const serverComment: VibeComment = {
              id: typeof data.id === 'string' ? data.id : optimisticId,
              user_id: typeof data.user_id === 'string' ? data.user_id : user.id,
              vibe_id: typeof data.vibe_id === 'string' ? data.vibe_id : vibe.id,
              text: typeof data.text === 'string' ? data.text : sanitizedText,
              created_at: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
              profile: {
                id: user.id,
                name: user.name || 'You',
                image: user.image || undefined
              }
            };
            
            // Replace the optimistic comment with the real one
            addComment(serverComment, optimisticId);
            
            // Refresh vibe stats to ensure counts are accurate
            try {
              await refreshVibeStats();
            } catch (statsError) {
              console.error('Error refreshing stats:', statsError);
            }
            
            // Clear any retry toast
            if (retryCount > 0) {
              toast.dismiss('comment-retry');
            }
            
            // Success! Show confirmation toast
            toast.success('Comment posted successfully!', {
              duration: 2000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '10px'
              },
              icon: '✅'
            });
            
            success = true;
            
            // Smooth scroll to the new comment if not on mobile
            if (!isMobile && document.querySelector('.comments-container')) {
              document.querySelector('.comments-container')?.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }
          } catch (processingError) {
            console.error('Error processing server response:', processingError);
            // Even if there was an error processing the response, the comment was added successfully
            // to the server, so we'll count this as a success to avoid retrying
            success = true;
          }
        }
      } catch (error: any) {
        console.error('Error posting comment:', error);
        
        // Clear retry toast if it exists
        toast.dismiss('comment-retry');
        
        // Only increase retry count for recoverable errors (like network or server errors)
        if (error.toString().includes('502') || error.toString().includes('gateway') || 
            error.toString().includes('network') || error.toString().includes('timeout') ||
            error.toString().includes('connection')) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff - 1s, 2s, 4s...)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            continue;
          }
        } else {
          // Non-recoverable error, don't retry
          retryCount = maxRetries;
        }
        
        // Show user-friendly error message
        let errorMessage = 'Failed to post your comment. Please try again.';
        
        if (error.toString().includes('502') || error.toString().includes('gateway')) {
          errorMessage = 'Server is temporarily unavailable. Your comment will be saved locally.';
        } else if (error.toString().includes('400') || error.toString().includes('Bad Request')) {
          errorMessage = 'Invalid comment format. Please try again with different text.';
        } else if (error.toString().includes('403') || error.toString().includes('Forbidden')) {
          errorMessage = 'You don\'t have permission to post comments.';
        } else if (error.toString().includes('429') || error.toString().includes('Too Many Requests')) {
          errorMessage = 'You\'re commenting too quickly. Please wait a moment and try again.';
        }
        
        toast.error(errorMessage, {
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px'
          }
        });
        
        // For 502 errors specifically, keep the optimistic comment with special marking
        if (error.toString().includes('502') || error.toString().includes('gateway')) {
          // Update the optimistic comment to indicate it's pending server sync
          const pendingComment = {
            ...optimisticComment,
            text: text + ' (Pending sync...)'
          };
          addComment(pendingComment, optimisticId);
        } else {
          // For other errors, remove the optimistic comment
          const failedComments = comments.filter(c => c.isOptimistic);
          if (failedComments.length > 0) {
            failedComments.forEach(c => deleteComment(c.id));
          }
          
          // Revert optimistic counter update
          setCommentsCount(prev => Math.max(0, prev - 1));
        }
      }
    }
    
    setIsSubmitting(false);
  };

  const handleAddEmoji = (emoji: string) => {
    // Добавляем эмодзи к текущему тексту комментария
    setCommentText(prev => {
      try {
        // Проверяем, что эмодзи является корректной строкой
        if (typeof emoji !== 'string') {
          console.error('Invalid emoji format:', emoji);
          return prev;
        }
        // Безопасное добавление эмодзи
        return prev + emoji;
      } catch (error) {
        console.error('Error adding emoji:', error);
        return prev;
      }
    });
    // Не закрываем панель после выбора эмодзи, чтобы пользователь мог добавить несколько эмодзи
    // setShowEmojiPicker(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleShare = () => {
    // Use type assertion to bypass the type checking for modalOffset
    openShareModal(vibe.id, {
      imageUrl: vibe.media_url || '/images/placeholders/default-placeholder.svg',
      caption: vibe.caption || 'Share this musical moment',
      userName: vibe.profile?.name || 'Artist',
      modalOffset: 70 // Add 70px offset to move panel down
    } as any); // Use type assertion to bypass type checking
  };

  const renderVibeContent = () => {
    switch(vibe.type) {
      case 'photo':
        return (
          <div className="relative rounded-xl overflow-hidden group">
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
            <div className="w-full flex items-center justify-center">
              <Image 
                src={imageError ? '/images/placeholders/image-placeholder.png' : (vibe.media_url || '/images/placeholders/default-placeholder.svg')}
                alt={vibe.caption || 'Vibe post'}
                className={`w-full object-contain transition-all duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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

  // Add a dedicated useEffect to keep like state in sync with userLikedVibes store
  useEffect(() => {
    // Skip if no vibe id or no user
    if (!vibe.id || !user?.id) return;

    try {
      // If userLikedVibes is an array and contains this vibe id, update the state
      if (Array.isArray(userLikedVibes) && userLikedVibes.includes(vibe.id)) {
        setIsLiked(true);
      } else if (typeof userLikedVibes === 'object' && userLikedVibes !== null) {
        // Safer way to check if this vibe is liked
        let hasLiked = false;
        
        // Filter out null values first, then check for the vibe id
        const validValues = Object.values(userLikedVibes).filter(v => v !== null);
        
        for (const val of validValues) {
          // First convert to unknown, then to Record<string, any>
          const nonNullVal = val as unknown as Record<string, any>;
          if (typeof nonNullVal === 'object' && nonNullVal && 'id' in nonNullVal && nonNullVal.id === vibe.id) {
            hasLiked = true;
            break;
          }
        }
        
        setIsLiked(hasLiked);
      }
    } catch (error) {
      console.error('Error checking like status from store:', error);
    }
  }, [userLikedVibes, vibe.id, user?.id]);

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
      {/* Add TopNav component with required params */}
      <TopNav params={{ id: vibe.user_id }} />
      
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 content-with-top-nav post-detail-container">
        {/* Top navigation and action bar */}
        <div className="flex flex-col space-y-4 mb-6">
          {/* User info and mood badge in one row */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center flex-wrap gap-4 p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10"
          >
            {/* User info - moved to left corner */}
            <Link href={`/profile/${vibe.user_id}`} className="flex items-center group">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-[#20DDBB]/30 group-hover:border-[#20DDBB]/80 transition-all duration-300"
              >
                <Image 
                  src={vibe.profile?.image ? getProfileImageUrl(vibe.profile.image) : '/images/placeholders/user-placeholder.svg'} 
                  alt={vibe.profile?.name || 'User'}
                  className="w-full h-full object-cover"
                  width={40}
                  height={40}
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
            
            {/* Mood badge */}
            {vibe.mood && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#20DDBB]/20 text-[#20DDBB] text-sm backdrop-blur-sm border border-[#20DDBB]/20 hover:border-[#20DDBB]/40 transition-all duration-300"
              >
                <span className="mr-1">🎭</span>
                {vibe.mood}
              </motion.div>
            )}
            
            <div className="flex-grow"></div>
            
            {/* Like button */}
            <motion.button 
              onClick={handleLikeToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 group"
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
                  <HeartIconSolid className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                )}
              </motion.div>
              <span className={`text-sm font-medium ${isLiked ? 'text-red-400' : 'text-gray-400 group-hover:text-white'}`}>
                {likesCount}
              </span>
            </motion.button>
            
            {/* Comments count */}
            <div className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10"
              >
                <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </motion.div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white">
                {commentsCount}
              </span>
            </div>
            
            {/* Share button */}
            <motion.button 
              onClick={handleShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 group"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-sm group-hover:bg-white/10"
              >
                <ShareIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
              </motion.div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white">
                Share
              </span>
            </motion.button>
          </motion.div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Left column - Vibe content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-3/5"
          >
            {/* Vibe content - adjusted height to match the photo */}
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
            
            {/* Tags */}
            {vibe.tags && typeof vibe.tags === 'string' && vibe.tags.split(',').length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {vibe.tags.split(',').map((tag, index) => (
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
            )}
          </motion.div>
          
          {/* Right column - Comments - Reduced empty space */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full md:w-2/5 bg-gradient-to-b from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl overflow-hidden border border-white/10 backdrop-filter backdrop-blur-lg shadow-xl flex flex-col"
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
            
            {/* Comments list - adjusted height */}
            <div className="overflow-y-auto flex-grow p-4 pb-[20px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30 comments-container">
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
                      className={`relative group ${comment.isOptimistic ? 'opacity-80' : ''}`}
                    >
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <Link href={`/profile/${comment.user_id}`}>
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="relative h-10 w-10 rounded-full overflow-hidden border border-white/10 hover:border-[#20DDBB]/50 transition-all duration-300"
                            >
                              <Image
                                src={comment.profile?.image 
                                  ? getProfileImageUrl(comment.profile.image) 
                                  : '/images/placeholders/user-placeholder.svg'}
                                alt={comment.profile?.name || 'User'}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover rounded-full"
                                priority={index < 5} // Prioritize loading first 5 avatars
                              />
                            </motion.div>
                          </Link>
                        </div>
                        
                        <div className={`flex-1 p-3 rounded-lg ${comment.isOptimistic 
                          ? comment.text.includes('Pending sync')
                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30' 
                            : 'bg-gradient-to-r from-[#20DDBB]/20 to-[#0F9E8E]/20 border border-[#20DDBB]/30' 
                          : 'bg-white/5 hover:bg-white/10 transition-colors duration-300'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <Link href={`/profile/${comment.user_id}`}>
                              <span className="font-medium text-[#20DDBB] hover:text-white transition-colors">
                                {comment.profile?.name || 'User'}
                              </span>
                            </Link>
                            <div className="flex items-center">
                              {comment.isOptimistic && (
                                comment.text.includes('Pending sync') ? (
                                  <motion.span 
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="mr-2 text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center"
                                  >
                                    <span className="mr-1">Pending</span>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        // Extract the original text without the "Pending sync" suffix
                                        const originalText = comment.text.replace(' (Pending sync...)', '');
                                        
                                        // Delete the pending comment
                                        deleteComment(comment.id);
                                        
                                        // Set the comment text input field to the original text
                                        setCommentText(originalText);
                                        
                                        // Focus the input field
                                        const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                                        if (inputElement) {
                                          inputElement.focus();
                                        }
                                        
                                        // Show a toast notification
                                        toast.success('Comment restored to input field for retry', {
                                          style: {
                                            background: '#333',
                                            color: '#fff',
                                            borderRadius: '10px'
                                          }
                                        });
                                      }}
                                      className="ml-1 text-amber-300 hover:text-white text-[9px] underline"
                                    >
                                      Retry
                                    </button>
                                  </motion.span>
                                ) : (
                                  <motion.span 
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="mr-2 text-[10px] text-[#20DDBB] bg-[#20DDBB]/20 px-2 py-0.5 rounded-full"
                                  >
                                    Posting...
                                  </motion.span>
                                )
                              )}
                              <span className="text-[11px] text-gray-500">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-white/90">
                            {comment.text.includes('Pending sync') 
                              ? renderCommentText(comment.text.replace(' (Pending sync...)', '')) 
                              : renderCommentText(comment.text)}
                          </p>
                          
                          {comment.text.includes('Pending sync') && (
                            <div className="mt-2 pt-1 border-t border-amber-500/20 flex justify-between items-center">
                              <p className="text-[10px] text-amber-400/80">
                                Will try to send when connection is restored
                              </p>
                              <button
                                onClick={() => {
                                  deleteComment(comment.id);
                                  setCommentsCount(prev => Math.max(0, prev - 1));
                                  toast.success('Pending comment removed', {
                                    style: {
                                      background: '#333',
                                      color: '#fff',
                                      borderRadius: '10px'
                                    }
                                  });
                                }}
                                className="text-[10px] text-amber-400/80 hover:text-amber-300 underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}

                          {/* Author action buttons on hover */}
                          {!comment.isOptimistic && user?.id === comment.user_id && (
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full shadow-lg shadow-red-500/20 transition-all duration-300"
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
                                title="Delete comment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </motion.button>
                              
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 bg-[#20DDBB]/80 hover:bg-[#20DDBB] text-white rounded-full shadow-lg shadow-[#20DDBB]/20 transition-all duration-300"
                                onClick={() => {
                                  // Set the comment text input field to quote the original comment
                                  setCommentText(`@${comment.profile?.name || 'User'}: `);
                                  
                                  // Focus the input field
                                  const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                                  if (inputElement) {
                                    inputElement.focus();
                                  }
                                }}
                                title="Reply to comment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>
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
            
            {/* Comment input - Moved BELOW comments for better UX and made sticky */}
            <div className="p-3 border-t border-white/10 bg-gradient-to-r from-[#1A1A2E] to-[#1A1A2E]/95 sticky bottom-0 shadow-lg shadow-black/30 z-10 mt-[2px]">
              <form onSubmit={handleSubmitComment} className="flex flex-col">
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
                      placeholder="Share your musical thoughts..."
                      className="w-full bg-white/5 text-white placeholder-gray-500 rounded-full py-2 px-4 pr-24 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] border border-white/10 transition-all duration-300 hover:border-white/20 focus:border-[#20DDBB]/50"
                    />
                    
                    {/* Emoji button - Fixed hover states */}
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2 overflow-hidden">
                      <motion.button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1.5 rounded-full transition-all ${
                          showEmojiPicker 
                            ? 'bg-[#20DDBB]/30 text-[#20DDBB]' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FaceSmileIcon className="h-5 w-5" />
                      </motion.button>
                    </div>
                    
                    {/* Submit button - Fixed hover states */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 overflow-hidden">
                      <motion.button
                        type="submit"
                        disabled={isSubmitting || !commentText.trim()}
                        className={`p-1.5 rounded-full ${
                          isSubmitting || !commentText.trim() 
                            ? 'text-gray-400' 
                            : 'text-[#20DDBB] hover:text-white hover:bg-white/10'
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
                
                {/* Emoji Picker Panel - Position ABOVE input on mobile */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      ref={emojiPickerRef}
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-2 p-3 bg-gradient-to-r from-[#1E1A36]/90 to-[#2A2151]/90 rounded-xl border border-white/10 shadow-xl relative z-20 bottom-2 mt-2"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-300 font-medium">Choose an emoji</p>
                        <motion.button
                          type="button"
                          onClick={() => setShowEmojiPicker(false)}
                          className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </motion.button>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#20DDBB]/20">
                        {[
                          '🎵', '🎶', '🎸', '🥁', '🎤', '🎧', '🎷', '🎹', 
                          '🎺', '🎻', '🔥', '🤩', '❤️', '👏', '🙌', '💯', 
                          '🕺', '💃', '🎼', '🎙️', '😊', '😍', '🥳', '🔊',
                          '⭐', '✨', '🌟', '💫', '💥', '💪', '👍', '🤘',
                          '💖', '🎊', '🎉', '🚀', '💨', '🌈', '🧡', '💛'
                        ].map((emoji) => (
                          <motion.button
                            key={`picker-${emoji}`}
                            type="button"
                            onClick={() => handleAddEmoji(emoji)}
                            whileHover={{ 
                              scale: 1.2, 
                              backgroundColor: 'rgba(32, 221, 187, 0.3)'
                            }}
                            whileTap={{ scale: 0.9 }}
                            className="text-xl md:text-2xl p-1.5 hover:bg-white/10 rounded-lg transition-all"
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VibeDetailPage; 