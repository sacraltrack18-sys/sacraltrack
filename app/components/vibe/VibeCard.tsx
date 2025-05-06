"use client";

import React, { useState, useEffect, useRef, memo } from 'react';
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
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import useDeviceDetect from '@/app/hooks/useDeviceDetect';
import toast from 'react-hot-toast';
import { useGeneralStore } from '@/app/stores/general';
import { database } from '@/libs/AppWriteClient';
import { addVibeComment, getVibeComments } from '@/app/lib/vibeActions';
import { useRouter } from 'next/navigation';
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { BiLoaderCircle } from 'react-icons/bi';
import { useShareVibeContext } from './useShareVibe';
import { usePathname } from "next/navigation";
import { format } from 'date-fns';
import VibeLikeButton from './VibeLikeButton';

// Интерфейс для комментариев
interface VibeComment {
  id: string;
  user_id: string;
  vibe_id: string;
  text: string;
  created_at: string;
  profile?: {
    id?: string;
    user_id?: string;
    name: string;
    image?: string;
    username?: string;
  };
  isOptimistic?: boolean;
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
        <div className="flex justify-between w-full">
          <div 
            className="h-[50px] flex p-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors duration-200"
          >
            <div className="w-6 h-6 text-white" />
            <span className="text-xs text-white font-semibold flex-grow ml-2">
              0
            </span>
          </div>

          <div 
            className="flex h-[50px] p-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors duration-200"
          >
            <div className="w-6 h-6 text-white" />
            <span className="text-xs text-white font-semibold flex-grow ml-2">
              0
            </span>
          </div>

          <div 
            className="flex h-[50px] p-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors duration-200"
          >
            <div className="w-6 h-6 text-white" />
          </div>
        </div>
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

interface VibeCardProps {
  vibe: VibePostWithProfile;
  onLike?: (vibeId: string) => void;
  onUnlike?: (vibeId: string) => void;
}

const VibeCard: React.FC<VibeCardProps> = ({ vibe, onLike, onUnlike }) => {
  const router = useRouter();
  const { user } = useUser() || { user: null };
  const { isMobile } = useDeviceDetect();
  const { deleteVibePost } = useVibeStore();
  const { setIsLoginOpen } = useGeneralStore();
  const { openShareModal } = useShareVibeContext();
  
  // State for comments and UI
  const { 
    comments: commentsList, 
    fetchComments, 
    addComment, 
    deleteComment,
    isLoading: commentsLoading 
  } = useVibeComments(vibe.id);
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(true);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('music');
  const [showQuickEmojis, setShowQuickEmojis] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [previewEmoji, setPreviewEmoji] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isLikeInProgress, setIsLikeInProgress] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // For storing like state locally
  const getVibeLocalStorageKey = (id: string) => `vibe_like_count_${id}`;

  // Calculate initial stats from multiple sources for better reliability
  const calculateInitialStats = () => {
    let likesCount = 0;
    let commentsCount = 0;

    // 1. Try to get from vibe.stats first
    if (vibe.stats) {
      if (Array.isArray(vibe.stats)) {
        likesCount = parseInt(vibe.stats[0] || '0', 10);
        commentsCount = parseInt(vibe.stats[1] || '0', 10);
      } else if (typeof vibe.stats === 'object' && vibe.stats !== null) {
        likesCount = parseInt(vibe.stats.total_likes || '0', 10);
        commentsCount = parseInt(vibe.stats.total_comments || '0', 10);
      }
    }

    // 2. Check localStorage for potentially fresher data
    try {
      const storedCountKey = getVibeLocalStorageKey(vibe.id);
      const storedCount = localStorage.getItem(storedCountKey);
      
      if (storedCount) {
        const parsedCount = parseInt(storedCount, 10);
        if (!isNaN(parsedCount)) {
          console.log(`[VIBE-CARD] Using stored like count for ${vibe.id}: ${parsedCount}`);
          likesCount = parsedCount;
        }
      }
    } catch (error) {
      console.error('[VIBE-CARD] Error accessing localStorage:', error);
    }

    return {
      likesCount,
      commentsCount
    };
  };

  // Initialize state with calculated stats
  const [vibeStats, setVibeStats] = useState(calculateInitialStats());
  
  // Refs
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPopupRef = useRef<HTMLDivElement>(null);
  
  // Массив быстрых эмодзи
  const quickEmojis = ['😊', '🎵', '🎸', '🔥', '❤️', '👏', '🙌', '✨', '🎉', '😍'];
  
  // Refresh vibe stats on component mount
  useEffect(() => {
    if (vibe.id) {
      refreshVibeStats();
    }
  }, [vibe.id]);
  
  // Улучшенная функция для получения URL изображения профиля
  function getProfileImageUrl(imageId: string): string {
    if (!imageId || imageId.trim() === '') {
      return '/images/placeholders/user-placeholder.svg';
    }
    try {
      return createBucketUrl(imageId, 'user');
    } catch (error) {
      console.error('Error in getProfileImageUrl:', error);
      return '/images/placeholders/user-placeholder.svg';
    }
  }
  
  // Новая функция для получения URL изображения vibe с обработкой ошибок
  function getVibeImageUrl(mediaUrl: string | undefined): string {
    if (!mediaUrl || mediaUrl.trim() === '') {
      console.log('Empty media URL, using placeholder');
      return '/images/placeholders/default-placeholder.svg';
    }
    
    // Если это уже полный URL, проверяем нужно ли добавить параметры
    if (mediaUrl.startsWith('http')) {
      try {
        // Проверяем на наличие двойного слеша в URL, что может вызвать ошибку
        if (mediaUrl.includes('/files//view')) {
          console.warn('Invalid URL format detected (double slash), using placeholder');
          return '/images/placeholders/default-placeholder.svg';
        }
        
        // Проверяем, есть ли уже параметр output в URL
        if (!mediaUrl.includes('output=')) {
          // Добавляем параметр для правильного отображения WebP
          return `${mediaUrl}${mediaUrl.includes('?') ? '&' : '?'}output=webp`;
        }
        return mediaUrl;
      } catch (error) {
        console.error('Error processing URL:', error);
        return '/images/placeholders/default-placeholder.svg';
      }
    }
    
    // Если это путь к статическому изображению
    if (mediaUrl.startsWith('/images/')) {
      return mediaUrl;
    }
    
    try {
      // Проверяем, не пустой ли ID файла
      if (!mediaUrl || mediaUrl.trim() === '') {
        throw new Error('Empty file ID');
      }
      
      // Используем тип 'track' для вайб-изображений, так как они хранятся в том же бакете
      const imageUrl = createBucketUrl(mediaUrl, 'track');
      
      // Проверяем, что URL корректный
      if (imageUrl.includes('/files//view')) {
        console.warn('Invalid URL generated with double slash, using placeholder');
        return '/images/placeholders/default-placeholder.svg';
      }
      
      // Добавляем параметр webp, если его еще нет
      if (!imageUrl.includes('output=')) {
        return `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}output=webp`;
      }
      return imageUrl;
    } catch (error) {
      console.error('Error in getVibeImageUrl:', error);
      return '/images/placeholders/default-placeholder.svg';
    }
  }
  
  // Save DOM node references for menu handling
  useEffect(() => {
    // ... existing code ...
  }, []);
  
  // Добавляем обработчик клика вне эмодзи попапа
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPopupRef.current && !emojiPopupRef.current.contains(event.target as Node)) {
        setShowQuickEmojis(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Click outside handler for menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  // Функция для быстрой вставки эмодзи
  const insertEmoji = (emoji: string) => {
    try {
      // Проверка типа и формата эмодзи
      if (typeof emoji !== 'string') {
        console.error('Invalid emoji format:', emoji);
        return;
      }
      
      // Безопасно добавляем эмодзи к комментарию
      setCommentText(prev => prev + emoji);
      
      // Визуальная обратная связь с анимацией
      setPreviewEmoji(emoji);
      setTimeout(() => setPreviewEmoji(null), 500);
    } catch (error) {
      console.error('Error inserting emoji:', error);
    }
  };
  
  // Создаем обертку для addComment, чтобы правильно обрабатывать наш интерфейс
  const addCommentWrapper = (comment: VibeComment, replaceId?: string) => {
    if (addComment && typeof addComment === 'function') {
      if (replaceId) {
        // Если есть ID для замены, передаем этот параметр в хук
        // @ts-ignore - игнорируем проверку типов, т.к. нас интересует только текст комментария
        addComment(comment, replaceId);
      } else {
        // Добавляем новый комментарий через хук
        // @ts-ignore - игнорируем проверку типов, т.к. нас интересует только текст комментария
        addComment(comment);
      }
    }
    
    // Update local comment count
    setVibeStats(prev => ({
      ...prev,
      commentsCount: prev.commentsCount + 1
    }));
  };
  
  // Handle like updates from the VibeLikeButton component
  const handleLikeUpdate = (newCount: number, isLiked: boolean) => {
    // Update only the local stats
    setVibeStats(prev => ({
      ...prev,
      likesCount: newCount
    }));
    
    // Store the updated count in localStorage
    try {
      localStorage.setItem(getVibeLocalStorageKey(vibe.id), newCount.toString());
    } catch (error) {
      console.error('[VIBE-CARD] Error storing like count in localStorage:', error);
    }
    
    // Call the parent handlers if provided
    if (isLiked && onLike) {
      onLike(vibe.id);
    } else if (!isLiked && onUnlike) {
      onUnlike(vibe.id);
    }
  };
  
  // Replace the refreshVibeStats function with a simpler version that only updates this card
  const refreshVibeStats = async () => {
    if (!vibe.id) return;
    
    try {
      const vibeDoc = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe.id
      );
      
      if (vibeDoc && vibeDoc.stats) {
        let statsObj;
        
        // Parse stats if they're in string format
        if (typeof vibeDoc.stats === 'string') {
          try {
            statsObj = JSON.parse(vibeDoc.stats);
          } catch (parseError) {
            console.error('[VIBE-CARD] Error parsing stats:', parseError);
            statsObj = vibeDoc.stats;
          }
        } else {
          statsObj = vibeDoc.stats;
        }
        
        // Handle different formats of stats
        if (Array.isArray(statsObj)) {
          const newLikesCount = parseInt(statsObj[0], 10) || 0;
          const newCommentsCount = parseInt(statsObj[1], 10) || 0;
          
          // Only update local stats, not global store
          setVibeStats({
            likesCount: newLikesCount,
            commentsCount: newCommentsCount
          });
          
          // Also update localStorage
          try {
            localStorage.setItem(getVibeLocalStorageKey(vibe.id), newLikesCount.toString());
          } catch (error) {
            console.error('[VIBE-CARD] Error storing like count in localStorage:', error);
          }
        } else if (typeof statsObj === 'object' && statsObj !== null) {
          const newLikesCount = parseInt(statsObj.total_likes, 10) || 0;
          const newCommentsCount = parseInt(statsObj.total_comments, 10) || 0;
          
          // Only update local stats, not global store
          setVibeStats({
            likesCount: newLikesCount,
            commentsCount: newCommentsCount
          });
          
          // Also update localStorage
          try {
            localStorage.setItem(getVibeLocalStorageKey(vibe.id), newLikesCount.toString());
          } catch (error) {
            console.error('[VIBE-CARD] Error storing like count in localStorage:', error);
          }
        }
      }
    } catch (error) {
      console.error('[VIBE-CARD] Error refreshing vibe stats:', error);
    }
  };
  
  const handleOpenComments = () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    setShowComments(true);
    fetchComments();
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }
    
    const trimmedComment = commentText.trim();
    if (!trimmedComment) return;
    
    try {
      // Сохраняем текущий текст комментария и очищаем поле ввода сразу
      const commentToSend = trimmedComment;
      setCommentText('');
      
      // Создаем оптимистичный комментарий для немедленного отображения
      const optimisticId = `temp-${Date.now()}`;
      const optimisticComment = {
        id: optimisticId,
        user_id: user.id,
        vibe_id: vibe.id,
        text: commentToSend,
        created_at: new Date().toISOString(),
        profile: {
          id: user.id,
          name: user.name || 'You',
          image: user.image || undefined
        },
        isOptimistic: true
      };
      
      // Добавляем временный комментарий в UI и увеличиваем счетчик - мгновенный отклик
      addCommentWrapper(optimisticComment);
      
      // Если комментарии не загружены, показываем их
      if (!showComments) {
        setShowComments(true);
      }
      
      // Отправляем комментарий на сервер
      const response = await addVibeComment({ vibe_id: vibe.id, user_id: user.id, text: commentToSend });
      
      // Проверяем наличие ошибки
      if (response.error) {
        throw new Error(response.error.message || 'Failed to add comment');
      }

      // Когда ответ получен, заменяем оптимистичный комментарий настоящим
      if (response && response.data) {
        // Удаляем оптимистичный комментарий и получаем актуальный список комментариев
        fetchComments();
        
        // Обновляем счетчик комментариев
        refreshVibeStats();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      
      // Показываем уведомление об ошибке
      toast.error(`Failed to add comment. Please try again.`, {
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
      
      // Восстанавливаем текст комментария в поле ввода
      setCommentText(trimmedComment);
    }
  };
  
  const handleShare = () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }
    
    openShareModal(vibe.id, {
      imageUrl: vibe.media_url || '/images/placeholders/default-placeholder.svg',
      caption: vibe.caption || 'Share this musical moment',
      userName: vibe.profile?.name || 'Artist'
    });
  };
  
  // Add this function to handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    // Добавляем консольный вывод для отладки
    console.log("Card clicked");
    
    // Если клик был на кнопке, ссылке или инпуте, не выполняем навигацию
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('a') ||
      (e.target as HTMLElement).closest('input')
    ) {
      console.log("Click on button/link/input - ignoring navigation");
      return;
    }
    
    // Останавливаем всплытие события, чтобы избежать конфликтов
    e.stopPropagation();
    
    // Выводим ID вайба
    console.log(`Navigating to vibe/${vibe.id}`);
    
    // Навигация на страницу детального просмотра вайба
    router.push(`/vibe/${vibe.id}`);
  };
  
  const handleDeleteVibe = async () => {
    if (!user || user.id !== vibe.user_id) return;
    
    try {
      setIsDeleting(true);
      await deleteVibePost(vibe.id, vibe.media_url);
      
      toast.success('Vibe deleted successfully!', {
        icon: '🗑️',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      
      // Refresh page or redirect
      router.refresh();
    } catch (error) {
      console.error('Error deleting vibe:', error);
      toast.error('Could not delete vibe. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowOptions(false);
    }
  };
  
  // Render vibe content based on type
  const renderVibeContent = () => {
    // Default type is 'photo' if not specified
    const vibeType = vibe.type || 'photo';
    
    switch(vibeType) {
      case 'photo':
      default:
        return (
          <div className="relative aspect-[4/5] rounded-xl overflow-hidden group">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2A2151]/50 to-[#1E1A36]/50 flex items-center justify-center">
                <div className="animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Image 
              src={imageError ? '/images/placeholders/default-placeholder.svg' : getVibeImageUrl(vibe.media_url)}
              alt={vibe.caption || 'Vibe post'}
              className={`object-cover w-full h-full transition-all duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              width={500}
              height={650}
              onError={(e) => {
                console.error('Image load error for:', vibe.media_url);
                setImageError(true);
              }}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        );
    }
  };
  
  // Функция для проверки, находится ли элемент в поле зрения пользователя
  const isElementInViewport = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  return (
    <div className="mb-8 mx-auto w-full md:w-[450px]">
      <div 
        id={`vibe-card-${vibe.id}`}
        className="bg-[#1A1A2E] bg-opacity-50 rounded-xl overflow-hidden border border-white/5 group cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(32,221,187,0.15)] hover:border-[#20DDBB]/20"
        onClick={handleCardClick}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="p-4"
        >
          {/* Vibe header section */}
          <div className="flex items-center justify-between mb-4">
            <Link href={`/profile/${vibe.user_id}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border border-white/10">
                  <Image 
                    src={getProfileImageUrl(vibe.profile?.image || '')} 
                    alt={vibe.profile?.name || 'User'}
                    className="w-full h-full object-cover"
                    width={40}
                    height={40}
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">
                    {vibe.profile?.name || 'Unknown User'}
                  </h3>
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
              </div>
            </Link>
            
            {/* Options menu */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} 
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-1 bg-[#1E1A36] border border-white/10 rounded-xl overflow-hidden shadow-lg z-20 min-w-[160px]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <ShareIcon className="h-4 w-4 text-gray-400" />
                    <span>Share vibe</span>
                  </button>
                  
                  {user?.id === vibe.user_id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteVibe(); }}
                      disabled={isDeleting}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 transition-colors flex items-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin"></div>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <TrashIcon className="h-4 w-4 text-red-400" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vibe content */}
          <div className="mb-4">
            {renderVibeContent()}
          </div>
          
          {/* Caption с музыкальными нотами */}
          {vibe.caption && (
            <div className="mt-3 text-gray-300 text-sm relative">
              <div className="absolute -left-1 top-0 h-full w-0.5 bg-gradient-to-b from-purple-500/30 to-transparent rounded-full"></div>
              <p className="pl-3">{vibe.caption}</p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center justify-between w-full mt-4">
            <div className="flex items-center gap-4">
              <VibeLikeButton 
                vibeId={vibe.id}
                initialLikeCount={vibeStats.likesCount}
                onLikeUpdated={handleLikeUpdate}
                className="h-[50px] flex p-4 hover:bg-white/5 rounded-lg transition-colors duration-200"
              />

              <motion.button 
                onClick={(e) => { e.stopPropagation(); handleOpenComments(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/10 hover:from-[#20DDBB]/30 hover:to-[#20DDBB]/20 border border-[#20DDBB]/30 hover:border-[#20DDBB]/50 transition-all duration-300 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChatBubbleLeftIcon className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white">{vibeStats.commentsCount}</span>
              </motion.button>
            </div>

            <motion.button 
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/10 hover:from-[#20DDBB]/30 hover:to-[#20DDBB]/20 border border-[#20DDBB]/30 hover:border-[#20DDBB]/50 transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShareIcon className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white">Share</span>
            </motion.button>
          </div>
        </motion.div>
        
        {/* Comments section modal */}
        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center overflow-hidden"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              onClick={(e) => { 
                e.stopPropagation(); 
                // Обновляем счетчики перед закрытием попапа
                refreshVibeStats();
                setShowComments(false); 
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-[#1E1A36] to-[#2A2151] rounded-xl overflow-hidden shadow-2xl border border-white/10 w-full max-w-md md:max-w-md mx-2 my-2 md:mx-0 flex flex-col max-h-[85vh] md:max-h-[90vh]"
              >
                {/* Заголовок */}
                <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between bg-[#1A1A2E]/50 sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[#20DDBB] text-xl">😊</span>
                    <h3 className="text-white font-semibold text-lg">Comments</h3>
                    <span className="bg-[#20DDBB]/20 text-[#20DDBB] text-xs px-2 py-0.5 rounded-full ml-2">
                      {vibeStats.commentsCount}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowComments(false);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                    aria-label="Close comments"
                  >
                    <XMarkIcon className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
                
                {/* Список комментариев */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-[200px] md:min-h-[300px] overscroll-contain">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin h-8 w-8 border-2 border-[#20DDBB] border-t-transparent rounded-full"></div>
                    </div>
                  ) : comments && comments.length > 0 ? (
                    comments.map((comment: any) => (
                      <div key={comment.id} className={`bg-[#1A1A2E]/80 p-3 rounded-xl border ${comment.isOptimistic ? 'border-[#20DDBB]/30 bg-gradient-to-r from-[#20DDBB]/5 to-[#0F9E8E]/5' : 'border-white/5'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                            <Image 
                              src={comment.profile?.image ? getProfileImageUrl(comment.profile.image) : '/images/placeholders/user-placeholder.svg'} 
                              alt={comment.profile?.name || 'User'}
                              className="w-full h-full object-cover"
                              width={36}
                              height={36}
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm truncate">
                                  {comment.profile?.name || 'User'}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  {comment.isOptimistic ? (
                                    <span className="flex items-center gap-1">
                                      <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute h-2 w-2 rounded-full bg-[#20DDBB]/40"></span>
                                        <span className="relative rounded-full h-2 w-2 bg-[#20DDBB]"></span>
                                      </span>
                                      Sending...
                                    </span>
                                  ) : (
                                    new Date(comment.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  )}
                                </p>
                              </div>
                              
                              {user?.id === comment.user_id && !comment.isOptimistic && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (deleteComment) deleteComment(comment.id);
                                  }}
                                  className="p-2 rounded-full hover:bg-red-500/10 text-red-400 touch-manipulation ml-2"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            
                            <p className="mt-2 text-sm text-gray-200 break-words">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <div className="text-[#20DDBB] text-3xl mb-2">😊</div>
                      <p>Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
                
                {/* Форма добавления комментария */}
                <form onSubmit={handleSubmitComment} className="p-3 md:p-4 border-t border-white/10 bg-[#1A1A2E]/50 sticky bottom-0 z-10">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-gradient-to-br from-[#1E1A36] to-[#2A2151]">
                      <Image 
                        src={user?.image ? getProfileImageUrl(user.image) : '/images/placeholders/user-placeholder.svg'} 
                        alt={user?.name || 'User'}
                        className="w-full h-full object-cover"
                        width={36}
                        height={36}
                      />
                    </div>
                    
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        ref={inputRef}
                        className="w-full bg-[#272B43] border border-white/10 rounded-l-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#20DDBB] transition-all placeholder-gray-500 pr-16"
                      />
                      
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        {commentText && (
                          <motion.button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCommentText('');
                              inputRef.current?.focus();
                            }}
                            whileTap={{ scale: 0.8 }}
                            className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 touch-manipulation"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </motion.button>
                        )}
                        
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQuickEmojis(!showQuickEmojis);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-2 rounded-full transition-all touch-manipulation ${showQuickEmojis ? 'bg-[#20DDBB]/30 text-[#20DDBB]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                          <span className="text-lg">😊</span>
                        </motion.button>
                      </div>
                      
                      {/* Всплывающая панель быстрых эмодзи */}
                      <AnimatePresence>
                        {showQuickEmojis && (
                          <motion.div
                            ref={emojiPopupRef}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="absolute bottom-full right-0 mb-2 bg-gradient-to-r from-[#1E1A36]/95 to-[#2A2151]/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-[#20DDBB]/20 z-50"
                          >
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {quickEmojis.map((emoji, idx) => (
                                <motion.button
                                  key={`quick-${emoji}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertEmoji(emoji);
                                    setTimeout(() => {
                                      setShowQuickEmojis(false);
                                      inputRef.current?.focus();
                                    }, 300);
                                  }}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.8, rotate: 10 }}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ 
                                    opacity: 1, 
                                    y: 0,
                                    transition: { delay: idx * 0.03 }
                                  }}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#20DDBB]/20 text-lg touch-manipulation"
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <motion.button 
                      type="submit" 
                      disabled={!commentText.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/80 text-white px-3 py-2.5 rounded-r-xl font-medium text-sm hover:shadow-[0_0_10px_rgba(32,221,187,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px] relative touch-manipulation"
                    >
                      {/* Анимация успешной вставки эмодзи */}
                      <AnimatePresence>
                        {previewEmoji && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.5 }}
                            animate={{ opacity: 1, y: -20, scale: 1.2 }}
                            exit={{ opacity: 0, y: -40, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                            className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none"
                          >
                            <div className="text-3xl filter drop-shadow-lg">
                              {previewEmoji}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    </motion.button>
                  </div>
                  
                  {/* Индикатор настроения */}
                  {commentText && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="mt-2 px-3 py-1.5 bg-gradient-to-r from-[#1E1A36]/80 to-[#2A2151]/80 rounded-lg text-xs text-gray-400 flex items-center justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Mood:</span>
                        <span className={`font-medium ${
                          commentText.includes('🎵') || commentText.includes('🎸') ? 'text-[#20DDBB]' : 
                          commentText.includes('❤️') || commentText.includes('😍') ? 'text-pink-400' : 
                          commentText.includes('🔥') || commentText.includes('👏') ? 'text-amber-400' : 
                          'text-gray-400'
                        }`}>
                          {commentText.includes('🎵') || commentText.includes('🎸') || commentText.includes('🎹') ? 'Musical 🎵' : 
                           commentText.includes('❤️') || commentText.includes('😍') || commentText.includes('🥰') ? 'Loving ❤️' : 
                           commentText.includes('🔥') || commentText.includes('💯') || commentText.includes('👏') ? 'Fire 🔥' : 
                           'Neutral'}
                        </span>
                      </div>
                      <span className={`${commentText.length > 450 ? 'text-amber-400' : 'text-gray-400'}`}>{commentText.length}/500</span>
                    </motion.div>
                  )}
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Компонент кнопки эмодзи для повторного использования
interface EmojiButtonProps {
  emoji: string;
  idx: number;
  color: string;
  setPreviewEmoji: React.Dispatch<React.SetStateAction<string | null>>;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
}

const EmojiButton: React.FC<EmojiButtonProps> = ({ emoji, idx, color, setPreviewEmoji, setCommentText }) => {
  return (
    <motion.button
      type="button"
      onMouseEnter={() => setPreviewEmoji(emoji)}
      onMouseLeave={() => setPreviewEmoji(null)}
      onClick={() => {
        setCommentText(prev => prev + emoji);
        setPreviewEmoji(null);
      }}
      whileHover={{ 
        scale: 1.2,
        backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.2)`
      }}
      whileTap={{ 
        scale: 0.8,
        rotate: [0, 10, -10, 0]
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        transition: { 
          delay: idx * 0.02,
          type: "spring",
          stiffness: 300,
          damping: 15
        }
      }}
      className={`text-xl p-2.5 rounded-lg transition-all duration-200 transform hover:shadow-lg hover:shadow-${color}/20 bg-black/20 backdrop-blur-sm border border-white/5`}
      style={{
        boxShadow: `0 0 5px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`
      }}
    >
      {emoji}
    </motion.button>
  );
};

export default VibeCard; 