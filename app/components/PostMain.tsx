"use client";

import Link from "next/link";
import PostMainLikes from "./PostMainLikes";
import React, { useEffect, useState, memo, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import useCreateBucketUrl from "../hooks/useCreateBucketUrl";
import { PostMainCompTypes, PostWithProfile } from "../types";
import { usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import getStripe from '@/libs/getStripe';
import { usePlayerContext } from '@/app/context/playerContext';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import Image from 'next/image';
import { HiMusicNote } from 'react-icons/hi';
import { FaPlay, FaPause, FaFire, FaStar, FaTrophy, FaHeadphones, FaHeart } from 'react-icons/fa';
import { AiFillFire, AiFillStar } from 'react-icons/ai';
import { BsStars } from 'react-icons/bs';
import ShareModal from './ShareModal';
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import useCheckPurchasedTrack from '@/app/hooks/useCheckPurchasedTrack';
import { useCommentStore } from "@/app/stores/comment";
import FloatingComments from '@/app/components/FloatingComments';
import { CommentWithProfile } from "@/app/types";
import { motion, AnimatePresence } from "framer-motion";
import { PiFireFill } from 'react-icons/pi';
import { ShareIcon } from '@heroicons/react/24/outline';
import useTrackStatistics from '../hooks/useTrackStatistics';
import useTrackInteraction from '../hooks/useTrackInteraction';
import { database, ID } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

// Toast styles
const successToast = (message: string) => toast.success(message, {
  style: {
    background: 'rgba(46, 36, 105, 0.9)',
    color: '#fff',
    borderLeft: '4px solid #20DDBB',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  icon: '🎵',
  duration: 3000,
});

const errorToast = (message: string) => toast.error(message, {
  style: {
    background: 'rgba(46, 36, 105, 0.9)',
    color: '#fff',
    borderLeft: '4px solid #ff5e5b',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  icon: '❌',
  duration: 4000,
});

interface Comment {
    id: string;
    user: {
        name: string;
        image: string;
    };
    text: string;
    created_at: string;
}

interface PostHeaderProps {
    profile: {
        user_id: string;
        name: string;
        image: string;
    };
    avatarUrl: string;
    avatarError: boolean;
    setAvatarError: (error: boolean) => void;
    text: string;
    genre: string;
}

interface PostImageProps {
    imageUrl: string;
    imageError: boolean;
    comments: CommentWithProfile[];
    isPlaying: boolean;
    onTogglePlay: () => void;
    post: any;
    onReact?: (reactionType: string) => void;
    reactions?: Record<string, number>;
    currentReaction?: string | null;
}

// Sound wave animation component
const SoundWave = memo(() => {
  // Store random values in refs to ensure consistent renders
  const randomValues = useRef([...Array(5)].map(() => ({
    height: 8 + Math.floor(Math.random() * 8),
    duration: (0.8 + Math.random() * 0.5).toFixed(2)
  })));

  return (
    <div className="flex items-center justify-center space-x-1 h-12 absolute bottom-4 left-0 right-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white/70 rounded-full"
          initial={{ height: 4 }}
          animate={{ 
            height: [4, randomValues.current[i].height, 4],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: Number(randomValues.current[i].duration),
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
});

SoundWave.displayName = 'SoundWave';

// Optimized image loading with intersection observer
const LazyImage = memo(({ src, alt, className, onError, fallback }: { 
  src: string; 
  alt: string; 
  className?: string; 
  onError?: () => void;
  fallback?: React.ReactNode;
}) => {
  // Use refs for client-side state to prevent hydration mismatch
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const imgRef = useRef(null);

  // Track client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.disconnect();
      }
    };
  }, [isMounted]);

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Always render the image for SSR, but control visibility with CSS
  return (
    <div ref={imgRef} className={`${className || ''} relative overflow-hidden`}>
      {isMounted && (!isInView || !isLoaded) && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#2E2469]/50 to-[#351E43]/50 animate-pulse" />
      )}
      
      {/* Добавляем проверку на пустую строку в src */}
      {src && src.trim() !== "" ? (
        <img
          src={src}
          alt={alt}
          onError={handleError}
          onLoad={handleLoad}
          loading="lazy"
          className={`${className || ''} ${isLoaded || !isMounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-[#2E2469] to-[#351E43] flex items-center justify-center">
          <HiMusicNote className="text-white/40 text-2xl" />
        </div>
      )}
      
      {hasError && fallback}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

const PostHeader = memo(({ profile, avatarUrl, avatarError, setAvatarError, text, genre }: PostHeaderProps) => (
    <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href={`/profile/${profile.user_id}`} aria-label={`Visit ${profile.name}'s profile`}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#20DDBB]/30 transition-all hover:border-[#20DDBB] duration-300">
                    <LazyImage
                        src={avatarError ? '/images/placeholder-user.jpg' : avatarUrl}
                        alt={`${profile.name}'s profile picture`}
                        onError={() => setAvatarError(true)}
                        className="w-full h-full object-cover"
                    />
                </div>
            </Link>
            <div>
                <Link href={`/profile/${profile.user_id}`} className="text-white font-medium hover:underline hover:text-[#20DDBB] transition-colors">
                    {profile.name}
                </Link>
                <div className="flex items-center gap-2">
                    <p className="text-[#818BAC] text-sm">{text}</p>
                    <HiMusicNote className="text-[#20DDBB] text-xs" aria-hidden="true" />
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[#20DDBB] text-xs px-3 py-1 bg-[#20DDBB]/10 rounded-full uppercase font-medium">{genre}</span>
        </div>
    </div>
));

PostHeader.displayName = 'PostHeader';

// Extracted PlayButton component to improve performance
const PlayButton = memo(({ isPlaying, onTogglePlay }: { isPlaying: boolean; onTogglePlay: () => void }) => (
  <button 
      onClick={onTogglePlay}
      className="absolute inset-0 md:hidden flex items-center justify-center"
      aria-label={isPlaying ? 'Pause track' : 'Play track'}
      type="button"
  >
      <div className={`
          w-20 h-20 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center
          transform transition-all duration-300 ${isPlaying ? 'scale-90 bg-[#20DDBB]/30' : 'scale-100'}
      `}>
          {isPlaying ? (
              <FaPause className="text-white text-2xl" aria-hidden="true" />
          ) : (
              <FaPlay className="text-white text-2xl ml-1" aria-hidden="true" />
          )}
      </div>
  </button>
));

PlayButton.displayName = 'PlayButton';

// Fallback for when image fails to load
const PostImageFallback = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#2E2469] to-[#351E43]">
    <div className="text-white/60 text-5xl">
      <HiMusicNote />
    </div>
  </div>
));

PostImageFallback.displayName = 'PostImageFallback';

const PostImage = memo(({ imageUrl, imageError, comments, isPlaying, onTogglePlay, post, onReact, reactions, currentReaction }: PostImageProps) => {
  // Состояние для показа комментариев
  const [showComments, setShowComments] = useState(false);
  // Состояние для отслеживания, были ли уже показаны комментарии
  const [commentsShown, setCommentsShown] = useState(false);
  // Состояние для отслеживания, была ли карточка скрыта с экрана
  const [wasOutOfView, setWasOutOfView] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const commentsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Функция для показа и последующего скрытия комментариев
  const showAndHideComments = useCallback(() => {
    // Проверяем, есть ли комментарии и не были ли они уже показаны
    if (comments && comments.length > 0 && (!commentsShown || wasOutOfView)) {
      // Показываем комментарии
      setShowComments(true);
      
      // Устанавливаем флаг, что комментарии уже были показаны
      setCommentsShown(true);
      
      // Сбрасываем флаг выхода за экран
      setWasOutOfView(false);
      
      // Очищаем предыдущий таймер, если он был
      if (commentsTimerRef.current) {
        clearTimeout(commentsTimerRef.current);
      }
      
      // Устанавливаем таймер, чтобы скрыть комментарии через 10 секунд
      commentsTimerRef.current = setTimeout(() => {
        setShowComments(false);
      }, 10000); // 10 секунд
    }
  }, [comments, commentsShown, wasOutOfView]);
  
  // Эффект для проверки видимости при изменении комментариев
  useEffect(() => {
    // Отображаем комментарии только если они есть и еще не были показаны или были скрыты
    if (comments && comments.length > 0 && (!commentsShown || wasOutOfView)) {
      showAndHideComments();
    }
    
    // Очистка таймера при размонтировании
    return () => {
      if (commentsTimerRef.current) {
        clearTimeout(commentsTimerRef.current);
        commentsTimerRef.current = null;
      }
    };
  }, [comments, commentsShown, showAndHideComments, wasOutOfView]);
  
  // Используем IntersectionObserver для отслеживания видимости карточки
  useEffect(() => {
    // Создаем IntersectionObserver для отслеживания видимости карточки
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Карточка вернулась в область видимости
          if (wasOutOfView) {
            // Если она была вне экрана, показываем комментарии снова
            showAndHideComments();
          }
        } else {
          // Карточка ушла из области видимости
          setWasOutOfView(true);
          // Скрываем комментарии
          setShowComments(false);
          
          // Очищаем таймер при выходе за экран
          if (commentsTimerRef.current) {
            clearTimeout(commentsTimerRef.current);
            commentsTimerRef.current = null;
          }
        }
      },
      { threshold: 0.2 } // Порог видимости 20%
    );
    
    if (imageRef.current) {
      observer.observe(imageRef.current);
    }
    
    return () => {
      if (imageRef.current) {
        observer.disconnect();
      }
      // Очищаем таймер при размонтировании
      if (commentsTimerRef.current) {
        clearTimeout(commentsTimerRef.current);
        commentsTimerRef.current = null;
      }
    };
  }, [wasOutOfView, showAndHideComments]);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div className="relative group" ref={imageRef}>
      {/* Clickable image container for desktop */}
      <div 
        className={`relative ${!isMobile ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          // Only handle click on desktop
          if (!isMobile) {
            e.preventDefault();
            onTogglePlay();
          }
        }}
      >
        <LazyImage
          src={imageError ? '/images/placeholder-music.jpg' : imageUrl}
          alt="Music cover"
          onError={() => {}}
          className="w-full aspect-square object-cover"
        />
        
        {/* Stats Counter in top right corner */}
        {post && <StatsCounter post={post} />}
        
        {/* Desktop play/pause overlay - показываем при наведении */}
        {!isMobile && (
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className={`
              w-14 h-14 rounded-full border border-white/40 backdrop-blur-[2px] flex items-center justify-center
              transform transition-all duration-300 
              ${isPlaying ? 'scale-90 bg-[#20DDBB]/10 border-[#20DDBB]/40' : 'scale-100 bg-black/10'}
              group-hover:bg-black/20
            `}>
              {isPlaying ? (
                <FaPause className="text-white/90 text-lg" aria-hidden="true" />
              ) : (
                <FaPlay className="text-white/90 text-lg ml-1" aria-hidden="true" />
              )}
            </div>
          </div>
        )}
        
        {/* Mobile play button - более прозрачный дизайн */}
        {isMobile && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePlay();
            }}
            className="absolute inset-0 flex items-center justify-center"
            aria-label={isPlaying ? 'Pause track' : 'Play track'}
            type="button"
          >
            <div className={`
              w-14 h-14 rounded-full border border-white/40 backdrop-blur-[2px] flex items-center justify-center
              transform transition-all duration-300 
              ${isPlaying ? 'scale-90 bg-[#20DDBB]/10 border-[#20DDBB]/40' : 'scale-100 bg-black/10'}
            `}>
              {isPlaying ? (
                <FaPause className="text-white/90 text-lg" aria-hidden="true" />
              ) : (
                <FaPlay className="text-white/90 text-lg ml-1" aria-hidden="true" />
              )}
            </div>
          </button>
        )}

        {/* Sound wave animation when playing */}
        {isPlaying && <SoundWave />}
      </div>
      
      {/* Флоатинг комментарии */}
      <AnimatePresence>
        {showComments && comments && comments.length > 0 && (
          <FloatingComments 
            comments={comments}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        )}
      </AnimatePresence>

      {/* Debug visualizer - в продакшн убрать */}
      {/* <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {commentsShown ? '✅' : '❌'} | {wasOutOfView ? '🔄' : '📌'} | {showComments ? '👁️' : '🙈'}
      </div> */}
    </div>
  );
});

PostImage.displayName = 'PostImage';

const PostMainSkeleton = memo(() => (
  <div className="rounded-lg overflow-hidden bg-[#1A2338]/80 backdrop-blur-md mb-4">
    {/* Заголовок скелетона с анимацией */}
    <div className="p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[#374151] animate-pulse"></div>
      <div className="flex-1">
        <div className="h-4 w-24 bg-[#374151] rounded mb-2 animate-pulse"></div>
        <div className="h-3 w-32 bg-[#374151] rounded animate-pulse"></div>
      </div>
    </div>
    
    {/* Изображение с красивой анимацией пульсации */}
    <div className="aspect-square bg-[#202A45] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#202A45] to-[#2D314D] animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[#414867] text-5xl">♫</div>
        </div>
      </div>
    </div>
    
    {/* Нижняя часть с текстом */}
    <div className="p-4">
      <div className="h-4 w-full bg-[#374151] rounded mb-2 animate-pulse"></div>
      <div className="h-4 w-2/3 bg-[#374151] rounded animate-pulse"></div>
    </div>
  </div>
));

PostMainSkeleton.displayName = 'PostMainSkeleton';

// Экспортируем PostMainSkeleton для использования в других компонентах
export { PostMainSkeleton };

// Добавляем интерфейс для типа реакции
interface ReactionType {
    id: string;
    icon: JSX.Element;
    color: string;
    label: string;
    animation: {
        initial: any;
        animate: any;
    };
}

// Добавляем интерфейс для реакций на изображении
interface PostImageReactionsProps {
    post: any;
    onReact: (reactionType: string) => void;
    reactions: Record<string, number>;
}

// Создаем компонент для отображения реакций на изображении
const PostImageReactions = memo(({ post, onReact, reactions = {} }: PostImageReactionsProps) => {
    const reactionTypes: ReactionType[] = [
        // Temporarily removed fire reaction
        /*{
            id: 'fire',
            icon: <div className="fire-icon-3d">
                    <PiFireFill size={38} className="text-transparent fire-gradient" />
                  </div>,
            color: 'text-orange-500',
            label: 'Огонь',
            animation: {
                initial: { scale: 0.8, opacity: 0, rotateY: -30 },
                animate: { scale: 1, opacity: 1, rotateY: 0 }
            }
        }*/
    ];

    return (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-3 z-10">
            {reactionTypes.map((reaction) => (
                <motion.button
                    key={reaction.id}
                    className={`w-16 h-16 rounded-full flex items-center justify-center 
                              transition-all group shadow-lg`}
                    onClick={() => onReact(reaction.id)}
                    whileHover={{ 
                        scale: 1.15, 
                        rotateY: 20
                    }}
                    whileTap={{ scale: 0.9, rotateY: -20 }}
                    initial={reaction.animation.initial}
                    animate={reaction.animation.animate}
                    transition={{ 
                        type: 'spring', 
                        stiffness: 400, 
                        damping: 17,
                        mass: 1.5
                    }}
                    style={{
                        perspective: '800px',
                        transformStyle: 'preserve-3d',
                        backfaceVisibility: 'hidden'
                    }}
                >
                    {reaction.icon}
                </motion.button>
            ))}
        </div>
    );
});

PostImageReactions.displayName = 'PostImageReactions';

// Компонент для отображения эффектов реакций
const ReactionEffect = memo(({ type }: { type: string }) => {
    const renderEffect = () => {
        switch (type) {
            case 'fire':
                return (
                    <motion.div 
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {[...Array(25)].map((_, i) => (
                            <motion.div 
                                key={i}
                                className="absolute"
                                initial={{ 
                                    x: `${Math.random() * 100}%`, 
                                    y: '100%', 
                                    opacity: 0.8,
                                    scale: 0.5 + Math.random() * 0.5,
                                    rotate: Math.random() * 30 - 15,
                                    rotateY: Math.random() * 180,
                                    rotateX: Math.random() * 45
                                }}
                                animate={{ 
                                    y: `${Math.random() * -120}%`,
                                    x: `${Math.random() * 100}%`, 
                                    opacity: 0,
                                    scale: [0.5 + Math.random() * 0.5, 1.2, 0],
                                    rotate: [Math.random() * 30 - 15, Math.random() * 60 - 30],
                                    rotateY: [Math.random() * 180, Math.random() * 360],
                                    rotateX: [Math.random() * 45, Math.random() * 90],
                                    transition: { 
                                        duration: 1.2 + Math.random() * 0.8, 
                                        repeat: 0,
                                        ease: 'easeOut'
                                    }
                                }}
                                style={{
                                    filter: 'drop-shadow(0 0 10px rgba(255, 87, 34, 0.8))',
                                    zIndex: Math.floor(Math.random() * 10),
                                    perspective: '800px',
                                    transformStyle: 'preserve-3d'
                                }}
                            >
                                <div className="fire-icon-3d">
                                    <PiFireFill 
                                        size={15 + Math.random() * 35} 
                                        className="text-transparent fire-gradient" 
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return renderEffect();
});

ReactionEffect.displayName = 'ReactionEffect';

// Обновляем сигнатуру компонента для корректной работы с пропсами
interface PostMainProps {
  post: PostWithProfile;
}

// Функция для проверки и создания документа статистики для трека
const ensureTrackStatisticsExist = async (trackId: string) => {
  if (!trackId) return;
  
  try {
    // Проверяем, существует ли документ статистики
    console.log(`Проверяем статистику для трека с ID: ${trackId}`);
    
    try {
      await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.statisticsCollectionId,
        trackId
      );
      console.log(`Документ статистики существует для трека: ${trackId}`);
      return; // Документ существует, ничего не делаем
    } catch (error) {
      console.log(`Документ статистики не найден, создаем новый для трека: ${trackId}`);
      // Документ не существует, создаем новый
    }
    
    // Создаем документ статистики с ID трека в качестве ID документа
    const statsData = {
      track_id: trackId,
      plays_count: "0", // Преобразуем в строку для совместимости с Appwrite
      downloads_count: "0", // Преобразуем в строку для совместимости с Appwrite
      purchases_count: "0", // Преобразуем в строку для совместимости с Appwrite
      likes: "0", // Преобразуем в строку для совместимости с Appwrite
      shares: "0", // Преобразуем в строку для совместимости с Appwrite
      last_played: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await database.createDocument(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.statisticsCollectionId,
      trackId, // Используем ID трека как ID документа
      statsData
    );
    
    console.log(`Создан документ статистики с ID: ${result.$id}`);
  } catch (error) {
    console.error('Ошибка при создании документа статистики:', error);
    // Не бросаем исключение - это некритичная функциональность
  }
};

// Компонент для отображения счетчиков статистики на изображении
const StatsCounter = memo(({ post }: { post: any }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Функция для получения актуальной статистики
  const fetchStatistics = useCallback(async () => {
    if (!post?.id) return;
    
    try {
      // Запрос к API для получения статистики
      const response = await fetch(`/api/track-stats/${post.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data.statistics);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching track statistics:', error);
      setLoading(false);
    }
  }, [post?.id]);

  // Инициализация и настройка интервала обновления
  useEffect(() => {
    // Сразу загружаем данные
    fetchStatistics();
    
    // Настраиваем интервал обновления каждые 10 секунд
    intervalRef.current = setInterval(() => {
      fetchStatistics();
    }, 10000);
    
    // Очистка интервала при размонтировании
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatistics]);

  // Если загрузка или нет данных, показываем скелетон
  if (loading || !stats) {
    return (
      <div className="absolute top-2 right-2 z-10 bg-black/40 backdrop-blur-md rounded-lg p-2 flex flex-col items-end space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-10 bg-white/20 animate-pulse rounded-full"></div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-8 bg-white/20 animate-pulse rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-2 right-2 z-10 bg-black/40 backdrop-blur-md rounded-lg p-2 flex flex-col items-end space-y-1">
      {/* Счетчик прослушиваний */}
      <div className="flex items-center gap-1.5">
        <FaHeadphones className="text-[#20DDBB] text-xs" />
        <span className="text-white text-xs font-medium">
          {stats?.plays_count ? parseInt(stats.plays_count, 10).toLocaleString() : '0'}
        </span>
      </div>
      
      {/* Счетчик лайков */}
      <div className="flex items-center gap-1.5">
        <FaHeart className="text-pink-400 text-xs" />
        <span className="text-white text-xs font-medium">
          {stats?.likes ? parseInt(stats.likes, 10).toLocaleString() : '0'}
        </span>
      </div>
    </div>
  );
});

StatsCounter.displayName = 'StatsCounter';

const PostMain = memo(({ post }: PostMainProps) => {
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isPurchased, setIsPurchased] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Получаем статистику трека и функции для записи взаимодействий
    const { statistics, isLoading: statsLoading, incrementPlayCount } = useTrackStatistics(post?.id);
    const { recordInteraction, getUserDeviceInfo, getGeographicInfo } = useTrackInteraction();
    
    // Refs to avoid re-renders
    const imageUrlRef = useRef('');
    const avatarUrlRef = useRef('');
    const m3u8UrlRef = useRef('');
    const playCountRecordedRef = useRef(false);
    
    // Memoized values to prevent unnecessary recalculations
    const userContext = useUser();
    const { setIsLoginOpen } = useGeneralStore();
    const { currentAudioId, setCurrentAudioId, isPlaying: globalIsPlaying, togglePlayPause } = usePlayerContext();
    const { checkIfTrackPurchased } = useCheckPurchasedTrack();
    const { commentsByPost, setCommentsByPost, getCommentsByPostId } = useCommentStore();
    const cardRef = useRef<HTMLDivElement>(null);
    
    // Добавляем состояния для реакций
    const [reactions, setReactions] = useState<Record<string, number>>({
        fire: 0
    });
    const [currentReaction, setCurrentReaction] = useState<string | null>(null);
    
    // Calculate URLs only once when post changes
    useEffect(() => {
        if (post) {
            imageUrlRef.current = useCreateBucketUrl(post.image_url);
            avatarUrlRef.current = useCreateBucketUrl(post.profile?.image);
            m3u8UrlRef.current = useCreateBucketUrl(post.m3u8_url);
        }
    }, [post]);

    // Pre-load images only once
    useEffect(() => {
        const loadImage = (url: string, setError: (error: boolean) => void) => {
            if (typeof window !== 'undefined' && url) {
                const img = new window.Image();
                img.src = url;
                img.onerror = () => setError(true);
                img.onload = () => setError(false);
            }
        };

        if (imageUrlRef.current) loadImage(imageUrlRef.current, setImageError);
        if (avatarUrlRef.current) loadImage(avatarUrlRef.current, setAvatarError);
    }, [imageUrlRef.current, avatarUrlRef.current]);

    // Check if track is purchased
    useEffect(() => {
        const checkPurchaseStatus = async () => {
            if (userContext?.user && post?.id) {
                const purchased = await checkIfTrackPurchased(userContext.user.id, post.id);
                setIsPurchased(purchased);
            }
        };
        
        checkPurchaseStatus();
    }, [userContext?.user, post?.id]);

    // Load comments
    useEffect(() => {
        const loadData = async () => {
            if (post?.id) {
                await setCommentsByPost(post.id);
            }
        };
        
        // Debounce comments loading for performance
        const timer = setTimeout(() => {
            loadData();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [post?.id]);

    // Control playback using the global player context
    useEffect(() => {
        // Update local playing state based on global state
        setIsPlaying(currentAudioId === post?.id && globalIsPlaying);
    }, [currentAudioId, globalIsPlaying, post?.id]);

    // Проверяем наличие документа статистики при загрузке компонента
    useEffect(() => {
        if (post?.id) {
            ensureTrackStatisticsExist(post.id).catch(console.error);
        }
    }, [post?.id]);

    // Обновленный обработчик для запуска/остановки воспроизведения
    const handleTogglePlay = useCallback(async () => {
        if (!post) return;
        
        if (currentAudioId !== post.id) {
            // Если воспроизводится другой трек, переключаемся на этот
            setCurrentAudioId(post.id);
            if (!globalIsPlaying) {
                togglePlayPause();
            }
            successToast(`Now playing: ${post.trackname}`);
            
            // Убеждаемся, что документ статистики существует
            await ensureTrackStatisticsExist(post.id);
            
            // Записываем прослушивание только один раз за сессию для этого трека
            if (!playCountRecordedRef.current) {
                playCountRecordedRef.current = true;
                
                // Увеличиваем счетчик прослушиваний
                incrementPlayCount();
                
                // Записываем информацию о прослушивании
                try {
                    const deviceInfo = getUserDeviceInfo();
                    const geoInfo = await getGeographicInfo();
                    
                    await recordInteraction({
                        track_id: post.id,
                        user_id: userContext?.user?.id || 'anonymous',
                        interaction_type: 'play',
                        device_info: deviceInfo,
                        geographic_info: geoInfo
                    });
                } catch (error) {
                    console.error('Failed to record play interaction:', error);
                    // Не останавливаем воспроизведение при ошибке записи
                }
            }
        } else {
            // Если этот трек уже выбран, просто переключаем воспроизведение/паузу
            togglePlayPause();
        }
    }, [currentAudioId, post?.id, globalIsPlaying, togglePlayPause, setCurrentAudioId, 
        userContext?.user?.id, recordInteraction, getUserDeviceInfo, getGeographicInfo,
        incrementPlayCount]);

    // Handle intersection observer for lazy loading
    useEffect(() => {
        if (!cardRef.current || !window.IntersectionObserver) return;
      
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsLoading(false);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
      
        observer.observe(cardRef.current);
        
        return () => {
            observer.disconnect();
        };
    }, []);

    // Функция для обработки реакций
    const handleReaction = useCallback((reactionType: string) => {
        // Увеличиваем счетчик реакции
        setReactions(prev => ({
            ...prev,
            [reactionType]: prev[reactionType] + 1
        }));
        
        // Показываем анимацию реакции
        setCurrentReaction(reactionType);
        
        // Убираем анимацию через 1.5 секунды
        setTimeout(() => {
            setCurrentReaction(null);
        }, 1500);
        
        // Тут можно добавить логику сохранения реакции на сервер
        // например вызов API для сохранения реакции
    }, []);

    // Сбрасываем флаг записи прослушивания при размонтировании компонента
    useEffect(() => {
        return () => {
            playCountRecordedRef.current = false;
        };
    }, []);

    // Early return if no post
    if (!post) {
        console.log("PostMain: No post data provided");
        return <PostMainSkeleton />;
    }

    // Stripe checkout handler
    const handlePurchase = async () => {
        if (!userContext?.user) {
            setIsLoginOpen(true);
            return;
        }

        if (isProcessingPayment) return;

        try {
            setIsProcessingPayment(true);
            successToast("Processing your purchase...");

            const stripe = await getStripe();
            if (!stripe) {
                errorToast("Couldn't load payment processor. Please try again later.");
                return;
            }

            const response = await fetch("/api/checkout_sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    trackId: post.id,
                    trackName: post.trackname,
                    userId: userContext.user.id,
                    authorId: post.profile.user_id,
                    image: post.image_url,
                    audio: post.audio_url,
                    amount: 200 // Fixed price in cents ($2.00)
                }),
            });

            if (!response.ok) {
                throw new Error('Payment initialization failed');
            }

            const data = await response.json();

            const { error } = await stripe.redirectToCheckout({
                sessionId: data.session.id
            });

            if (error) {
                throw error;
            }

        } catch (error: any) {
            console.error('Purchase error:', error);
            errorToast("We couldn't process your payment. Please try again.");
        } finally {
            setIsProcessingPayment(false);
        }
    };
        
    const handleShare = () => {
        setIsShareModalOpen(true);
        successToast("Ready to share this awesome track!");
    };

    // SEO-friendly current URL for sharing
    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/post/${post.user_id}/${post.id}`
        : '';

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto shadow-lg shadow-black/20"
        >
            {/* Hidden schema.org metadata for SEO */}
            <meta itemProp="name" content={post.trackname} />
            <meta itemProp="byArtist" content={post.profile.name} />
            <meta itemProp="genre" content={post.genre} />
            {post.description && <meta itemProp="description" content={post.description} />}
            <link itemProp="url" href={shareUrl} />
            <meta itemProp="inLanguage" content="en" />
            
            <PostHeader 
                profile={post.profile}
                avatarUrl={avatarUrlRef.current}
                avatarError={avatarError}
                setAvatarError={setAvatarError}
                text={post.trackname}
                genre={post.genre}
            />

            <PostImage 
                imageUrl={imageUrlRef.current} 
                imageError={imageError} 
                comments={post?.id ? getCommentsByPostId(post.id) : []}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                post={post}
                onReact={handleReaction}
                reactions={reactions}
                currentReaction={currentReaction}
            />

            <div className="px-4 py-2 w-full">
                <AudioPlayer 
                    m3u8Url={m3u8UrlRef.current} 
                    isPlaying={isPlaying} 
                    onPlay={() => {
                        if (currentAudioId !== post.id) {
                            setCurrentAudioId(post.id);
                        }
                        togglePlayPause();
                    }} 
                    onPause={() => {
                        if (currentAudioId === post.id) {
                            togglePlayPause();
                        }
                    }} 
                />
            </div>

            <div className="px-4 py-3 flex justify-between items-center w-full">
                <div className="flex items-center gap-6">
                    <PostMainLikes post={post} />
                    
                    {/* Счетчик прослушиваний - Удален отсюда, так как перенесен в StatsCounter */}
                </div>

                <div className="flex items-center gap-3">
                    {!isPurchased ? (
                        <motion.button 
                            onClick={handlePurchase}
                            disabled={isProcessingPayment}
                            className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white px-6 py-2.5 rounded-xl font-medium 
                                      shadow-lg shadow-[#20DDBB]/20 hover:shadow-xl hover:shadow-[#20DDBB]/30 
                                      transition-all duration-300 flex items-center gap-2"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            aria-label={`Buy track ${post.trackname} for $2`}
                        >
                            <span className="text-lg">$2</span>
                            <span className="font-semibold">Buy Track</span>
                            {isProcessingPayment && (
                                <motion.div
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </motion.button>
                    ) : (
                        <motion.button 
                            className="bg-gradient-to-r from-[#20DDBB]/20 to-[#018CFD]/20 text-[#20DDBB] px-6 py-2.5 
                                      rounded-xl font-medium border border-[#20DDBB]/30 flex items-center gap-2"
                            whileHover={{ scale: 1.01 }}
                            aria-label="Track already purchased"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-semibold">Purchased</span>
                        </motion.button>
                    )}
                    <motion.button 
                        onClick={handleShare}
                        className="relative p-3 rounded-full bg-white/5 hover:bg-[#2E2469]/50 group overflow-hidden
                                  transition-all duration-300"
                        whileHover={{ 
                            scale: 1.08,
                        }}
                        whileTap={{ scale: 0.92 }}
                        aria-label={`Share track ${post.trackname}`}
                    >
                        <ShareIcon className="w-[24px] h-[24px] text-pink-400 transition-all duration-300 relative z-10
                                             group-hover:text-white group-hover:scale-110" />
                        
                        {/* Animated background effect on hover */}
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 opacity-0 
                                      group-hover:opacity-100 transition-opacity duration-300"
                            initial={{ scale: 0, borderRadius: '100%' }}
                            whileHover={{ 
                                scale: 1.2, 
                                borderRadius: '100%',
                                rotate: [0, 10, -5, 0],
                            }}
                            transition={{
                                scale: { duration: 0.3 },
                                rotate: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                            }}
                        />
                        
                        {/* Animated ripple effect on hover */}
                        <motion.div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            initial={{ boxShadow: "0 0 0 0 rgba(236, 72, 153, 0)" }}
                            whileHover={{ 
                                boxShadow: [
                                    "0 0 0 0 rgba(236, 72, 153, 0.7)",
                                    "0 0 0 8px rgba(236, 72, 153, 0)"
                                ],
                            }}
                            transition={{ 
                                boxShadow: { 
                                    duration: 1.5, 
                                    repeat: Infinity,
                                    repeatType: "loop" 
                                }
                            }}
                        />
                    </motion.button>
                </div>
            </div>

            <ShareModal 
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                post={post}
            />
        </motion.div>
    );
});

PostMain.displayName = 'PostMain';

export default PostMain;
