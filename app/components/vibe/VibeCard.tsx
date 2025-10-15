"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useVibeStore, VibePostWithProfile } from "@/app/stores/vibeStore";
import { useUser } from "@/app/context/user";
import { useVibeComments, MUSIC_EMOJIS } from "@/app/hooks/useVibeComments";
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import useDeviceDetect from "@/app/hooks/useDeviceDetect";
import toast from "react-hot-toast";
import { useGeneralStore } from "@/app/stores/general";
import { database } from "@/libs/AppWriteClient";
import { addVibeComment, getVibeComments } from "@/app/lib/vibeActions";
import { useRouter } from "next/navigation";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { BiLoaderCircle } from "react-icons/bi";
import { useShareVibeContext } from "./useShareVibe";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import VibeLikes from "./VibeLikes";
import QuickCommentModal from "./QuickCommentModal";

// Интерфейс для комментариев
interface VibeComment {
  id: string;
  user_id: string;
  vibe_id: string;
  text: string;
  created_at: string;
  profile?: {
    user_id: string;
    name: string;
    image: string;
    username?: string;
  };
  isOptimistic?: boolean;
}

import SimpleSkeleton from "@/app/components/ui/UnifiedSkeleton";

export const VibeCardSkeleton = () => {
  return <SimpleSkeleton />;
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
    isLoading: commentsLoading,
  } = useVibeComments(vibe.id);
  const [commentText, setCommentText] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(true);
  const [activeEmojiCategory, setActiveEmojiCategory] =
    useState<string>("music");
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
  const [commentsLoadTimeout, setCommentsLoadTimeout] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // For storing like state locally
  const getVibeLocalStorageKey = (id: string) => `vibe_like_count_${id}`;

  // Calculate initial stats from multiple sources for better reliability
  const calculateInitialStats = () => {
    let likesCount = 0;
    let commentsCount = 0;

    // First try to get comments count from the comments list if it's already loaded
    if (commentsList && Array.isArray(commentsList)) {
      commentsCount = commentsList.length;
    }
    // Then try to get from vibe.stats if comments list is empty
    else if (vibe.stats) {
      if (Array.isArray(vibe.stats)) {
        likesCount =
          typeof vibe.stats[0] === "string"
            ? parseInt(vibe.stats[0], 10) || 0
            : typeof vibe.stats[0] === "number"
              ? vibe.stats[0]
              : 0;

        commentsCount =
          typeof vibe.stats[1] === "string"
            ? parseInt(vibe.stats[1], 10) || 0
            : typeof vibe.stats[1] === "number"
              ? vibe.stats[1]
              : 0;
      } else if (typeof vibe.stats === "object" && vibe.stats !== null) {
        likesCount =
          typeof vibe.stats.total_likes === "string"
            ? parseInt(vibe.stats.total_likes, 10) || 0
            : typeof vibe.stats.total_likes === "number"
              ? vibe.stats.total_likes
              : 0;

        commentsCount =
          typeof vibe.stats.total_comments === "string"
            ? parseInt(vibe.stats.total_comments, 10) || 0
            : typeof vibe.stats.total_comments === "number"
              ? vibe.stats.total_comments
              : 0;
      }
    }

    return {
      likesCount,
      commentsCount,
    };
  };

  // Initialize state with calculated stats
  const [vibeStats, setVibeStats] = useState(calculateInitialStats());

  // Update stats when comments list changes or when vibe stats change
  useEffect(() => {
    const newStats = calculateInitialStats();
    if (commentsList && Array.isArray(commentsList)) {
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: commentsList.length,
      }));
    } else if (newStats.commentsCount > 0) {
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: newStats.commentsCount,
      }));
    }
  }, [commentsList, vibe.stats]);

  // Fetch comments immediately when component mounts and set up polling
  useEffect(() => {
    if (vibe.id) {
      console.log(`[VIBE-CARD] Initial comments loading for: ${vibe.id}`);
      fetchComments();

      // Set up polling with visibility detection
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          console.log(
            "[VIBE-CARD] Visibility changed to visible, fetching comments",
          );
          fetchComments();
        }
      };

      // Add visibility change listener
      document.addEventListener("visibilitychange", onVisibilityChange);

      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }
  }, [vibe.id, fetchComments]);

  // Add a new effect to keep the comment count in sync with the actual comments
  useEffect(() => {
    if (commentsList && Array.isArray(commentsList)) {
      const actualCount = commentsList.length;
      if (actualCount !== vibeStats.commentsCount) {
        setVibeStats((prev) => ({
          ...prev,
          commentsCount: actualCount,
        }));
      }
    }
  }, [commentsList]);

  // Refs
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPopupRef = useRef<HTMLDivElement>(null);

  // Массив быстрых эмодзи
  const quickEmojis = [
    "😊",
    "🎵",
    "🎸",
    "🔥",
    "❤️",
    "👏",
    "🙌",
    "✨",
    "🎉",
    "😍",
  ];

  // Refresh vibe stats on component mount
  useEffect(() => {
    if (vibe.id) {
      console.log(`[VIBE-CARD] useEffect triggered for vibe ID: ${vibe.id}`);
      refreshVibeStats();
    }
  }, [vibe.id]);

  // Улучшенная функция для получения URL изображения профиля
  function getProfileImageUrl(imageId: string): string {
    if (!imageId || imageId.trim() === "") {
      return "/images/placeholders/user-placeholder.svg";
    }
    try {
      return createBucketUrl(imageId, "user");
    } catch (error) {
      console.error("Error in getProfileImageUrl:", error);
      return "/images/placeholders/user-placeholder.svg";
    }
  }

  // Новая функция для получения URL изображения vibe с обработкой ошибок
  function getVibeImageUrl(mediaUrl: string | undefined): string {
    if (!mediaUrl || mediaUrl.trim() === "") {
      console.log("Empty media URL, returning empty string");
      return "";
    }

    // Если это уже полный URL, проверяем нужно ли добавить параметры
    if (mediaUrl.startsWith("http")) {
      try {
        // Проверяем на наличие двойного слеша в URL, что может вызвать ошибку
        if (mediaUrl.includes("/files//view")) {
          console.warn(
            "Invalid URL format detected (double slash), returning empty string",
          );
          return "";
        }

        // Проверяем, есть ли уже параметр output в URL
        if (!mediaUrl.includes("output=")) {
          // Добавляем параметр для правильного отображения WebP
          return `${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}output=webp`;
        }
        return mediaUrl;
      } catch (error) {
        console.error("Error processing URL:", error);
        return "";
      }
    }

    // Если это путь к статическому изображению
    if (mediaUrl.startsWith("/images/")) {
      return mediaUrl;
    }

    try {
      // Проверяем, не пустой ли ID файла
      if (!mediaUrl || mediaUrl.trim() === "") {
        throw new Error("Empty file ID");
      }

      // Используем тип 'track' для вайб-изображений, так как они хранятся в том же бакете
      const imageUrl = createBucketUrl(mediaUrl, "track");

      // Проверяем, что URL корректный
      if (imageUrl.includes("/files//view")) {
        console.warn(
          "Invalid URL generated with double slash, returning empty string",
        );
        return "";
      }

      // Добавляем параметр webp, если его еще нет
      if (!imageUrl.includes("output=")) {
        return `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}output=webp`;
      }
      return imageUrl;
    } catch (error) {
      console.error("Error in getVibeImageUrl:", error);
      return "";
    }
  }

  // Save DOM node references for menu handling
  useEffect(() => {
    // ... existing code ...
  }, []);

  // Добавляем обработчик клика вне эмодзи попапа
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPopupRef.current &&
        !emojiPopupRef.current.contains(event.target as Node)
      ) {
        setShowQuickEmojis(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Click outside handler for menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Функция для быстрой вставки эмодзи
  const insertEmoji = (emoji: string) => {
    try {
      // Проверка типа и формата эмодзи
      if (typeof emoji !== "string") {
        console.error("Invalid emoji format:", emoji);
        return;
      }

      // Безопасно добавляем эмодзи к комментарию
      setCommentText((prev) => prev + emoji);

      // Визуальная обратная связь с анимацией
      setPreviewEmoji(emoji);
      setTimeout(() => setPreviewEmoji(null), 500);
    } catch (error) {
      console.error("Error inserting emoji:", error);
    }
  };

  // Добавляем эффект для обновления счетчика комментариев при изменении списка комментариев
  useEffect(() => {
    if (commentsList && Array.isArray(commentsList)) {
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: commentsList.length,
      }));
    }
  }, [commentsList]);

  // Fix the handleOpenComments function
  const handleOpenComments = async () => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    // Open the quick comment modal
    setShowComments(true);
  };

  // Handle quick comment submit
  const handleQuickCommentSubmit = async (text: string) => {
    if (!user?.id) {
      setIsLoginOpen(true);
      return;
    }

    const trimmedComment = text.trim();
    if (!trimmedComment) return;

    try {
      setIsSubmittingComment(true);

      // Create optimistic comment
      const optimisticId = `temp-${Date.now()}`;
      const optimisticComment = {
        id: optimisticId,
        user_id: user.id,
        vibe_id: vibe.id,
        text: trimmedComment,
        created_at: new Date().toISOString(),
        profile: {
          user_id: user.id,
          name: user.name || "You",
          image: user.image || "/images/placeholders/user-placeholder.svg",
          username: undefined,
        },
        isOptimistic: true,
      };

      // Add comment via hook
      await addComment(optimisticComment);

      // Update local stats counter
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: safeNumberConversion(prev.commentsCount) + 1,
      }));

      // Send to server
      const response = await addVibeComment({
        vibe_id: vibe.id,
        user_id: user.id,
        text: trimmedComment,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to add comment");
      }

      // Replace optimistic comment with real one if needed
      if (response.data && addComment) {
        const realComment = {
          ...response.data,
          profile: {
            user_id: user.id,
            name: user.name || "You",
            image: user.image || "/images/placeholders/user-placeholder.svg",
            username: undefined,
          },
        };
        await addComment(realComment, optimisticId);
      }

      // Refresh stats
      await refreshVibeStats();
    } catch (error) {
      console.error("Error adding quick comment:", error);
      throw error;
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Fix the addCommentWrapper function to use the hook's addComment directly
  const addCommentWrapper = async (
    comment: VibeComment,
    replaceId?: string,
  ) => {
    try {
      if (addComment && typeof addComment === "function") {
        if (replaceId) {
          // If there's an ID for replacement, pass this parameter to the hook
          await addComment(comment, replaceId);
        } else {
          // Add a new comment through the hook
          await addComment(comment);
        }
      }

      // Update local comment count
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: safeNumberConversion(prev.commentsCount) + 1,
      }));

      // Ensure we have the latest comments
      if (!commentsLoading) {
        fetchComments();
      }
    } catch (error) {
      console.error("[VIBE-CARD] Error in addCommentWrapper:", error);
    }
  };

  // Add formatNumber function for consistent number display
  const formatNumber = (num: number | string | undefined): string => {
    if (num === undefined || num === null) return "0";

    const parsedNum = typeof num === "string" ? parseInt(num, 10) : num;

    if (isNaN(parsedNum)) return "0";

    if (parsedNum >= 1000000) {
      return Math.floor(parsedNum / 1000000) + "M+";
    } else if (parsedNum >= 1000) {
      return Math.floor(parsedNum / 1000) + "k+";
    } else if (parsedNum >= 100) {
      return "100+";
    } else {
      return String(parsedNum);
    }
  };

  // Обновляем вызов handleLikeUpdate
  const handleLikeUpdate = (newCount: number, isLiked: boolean) => {
    // Update only the local stats immediately
    setVibeStats((prev) => ({
      ...prev,
      likesCount: newCount,
    }));

    // Call the parent handlers if provided
    if (isLiked && onLike) {
      onLike(vibe.id);
    } else if (!isLiked && onUnlike) {
      onUnlike(vibe.id);
    }
  };

  // Вспомогательная функция для безопасного преобразования значений
  const safeNumberConversion = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseInt(value, 10) || 0;
    return 0;
  };

  // Replace the refreshVibeStats function with a simpler version that only updates this card
  const refreshVibeStats = async () => {
    if (!vibe.id) return;

    try {
      console.log(`[VIBE-CARD] Refreshing stats for vibe ID: ${vibe.id}`);
      const vibeDoc = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe.id,
      );

      if (vibeDoc && vibeDoc.stats) {
        let statsObj;

        // Parse stats if they're in string format
        if (typeof vibeDoc.stats === "string") {
          try {
            statsObj = JSON.parse(vibeDoc.stats);
          } catch (parseError) {
            console.error("[VIBE-CARD] Error parsing stats:", parseError);
            statsObj = vibeDoc.stats;
          }
        } else {
          statsObj = vibeDoc.stats;
        }

        // Handle different formats of stats
        if (Array.isArray(statsObj)) {
          // Безопасное преобразование для массивов статистики
          const newLikesCount = safeNumberConversion(statsObj[0]);
          const newCommentsCount = safeNumberConversion(statsObj[1]);

          // Only update local stats, not global store
          setVibeStats({
            likesCount: newLikesCount,
            commentsCount: newCommentsCount,
          });

          // Also update localStorage
          try {
            localStorage.setItem(
              getVibeLocalStorageKey(vibe.id),
              newLikesCount.toString(),
            );
          } catch (error) {
            console.error(
              "[VIBE-CARD] Error storing like count in localStorage:",
              error,
            );
          }
        } else if (typeof statsObj === "object" && statsObj !== null) {
          // Безопасное преобразование для объекта статистики
          const newLikesCount = safeNumberConversion(statsObj.total_likes);
          const newCommentsCount = safeNumberConversion(
            statsObj.total_comments,
          );

          // Only update local stats, not global store
          setVibeStats({
            likesCount: newLikesCount,
            commentsCount: newCommentsCount,
          });

          // Also update localStorage
          try {
            localStorage.setItem(
              getVibeLocalStorageKey(vibe.id),
              newLikesCount.toString(),
            );
          } catch (error) {
            console.error(
              "[VIBE-CARD] Error storing like count in localStorage:",
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error("[VIBE-CARD] Error refreshing vibe stats:", error);
    }
  };

  // Fix the handleSubmitComment function to handle loading state properly
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
      setCommentText("");
      setIsSubmittingComment(true);

      // Создаем оптимистичный комментарий для немедленного отображения
      const optimisticId = `temp-${Date.now()}`;
      const optimisticComment = {
        id: optimisticId,
        user_id: user.id,
        vibe_id: vibe.id,
        text: commentToSend,
        created_at: new Date().toISOString(),
        profile: {
          user_id: user.id,
          name: user.name || "You",
          image: user.image || "/images/placeholders/user-placeholder.svg",
          username: undefined,
        },
        isOptimistic: true,
      };

      // Directly add comment via the hook to ensure it appears
      await addComment(optimisticComment);

      // Increase local stats counter - update both the stats object and the comments list
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: safeNumberConversion(prev.commentsCount) + 1,
      }));

      // Отправляем комментарий на сервер
      const response = await addVibeComment({
        vibe_id: vibe.id,
        user_id: user.id,
        text: commentToSend,
      });

      // Проверяем наличие ошибки
      if (response.error) {
        throw new Error(response.error.message || "Failed to add comment");
      }

      // Когда ответ получен, заменяем оптимистичный комментарий настоящим
      if (response && response.data) {
        // Only fetch if we're not already loading
        if (!commentsLoading) {
          await fetchComments();
        }

        // Update vibe stats to show correct comment count
        refreshVibeStats();
      }
    } catch (error) {
      console.error("Error adding comment:", error);

      // Откатываем увеличение счетчика комментариев
      setVibeStats((prev) => ({
        ...prev,
        commentsCount: Math.max(
          0,
          safeNumberConversion(prev.commentsCount) - 1,
        ),
      }));

      // Показываем уведомление об ошибке
      toast.error(`Failed to add comment. Please try again.`, {
        duration: 3000,
        style: {
          background: "#333",
          color: "#fff",
          borderRadius: "10px",
        },
      });

      // Восстанавливаем текст комментария в поле ввода
      setCommentText(trimmedComment);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    openShareModal(vibe.id, {
      imageUrl:
        vibe.media_url || "/images/placeholders/default-placeholder.svg",
      caption: vibe.caption || "Share this musical moment",
      userName: vibe.profile?.name || "Artist",
    });
  };

  // Add this function to handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    // Добавляем консольный вывод для отладки
    console.log("Card clicked");

    // Если клик был на кнопке, ссылке или инпуте, не выполняем навигацию
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a") ||
      (e.target as HTMLElement).closest("input")
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

      toast.success("Vibe deleted successfully!", {
        icon: "🗑️",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });

      // Refresh page or redirect
      router.refresh();
    } catch (error) {
      console.error("Error deleting vibe:", error);
      toast.error("Could not delete vibe. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowOptions(false);
    }
  };

  // Функция для получения превью видео
  function getVideoThumbnailUrl(vibe: VibePostWithProfile): string {
    // Проверяем наличие thumbnail_url
    if (
      vibe.thumbnail_url &&
      vibe.thumbnail_url.trim() !== "" &&
      vibe.thumbnail_url !== "null"
    ) {
      // Если thumbnail_url уже полный URL (включая формат из примера пользователя)
      if (vibe.thumbnail_url.startsWith("http")) {
        console.log(
          `[VIBE-CARD] Using existing thumbnail URL for vibe ${vibe.id}:`,
          vibe.thumbnail_url,
        );
        return vibe.thumbnail_url;
      }

      // Иначе предполагаем, что это ID файла и конструируем URL
      try {
        // Используем createBucketUrl для создания правильного URL
        const thumbnailUrl = createBucketUrl(vibe.thumbnail_url, "track");
        console.log(
          `[VIBE-CARD] Generated thumbnail URL for vibe ${vibe.id}:`,
          thumbnailUrl,
        );
        return thumbnailUrl;
      } catch (error) {
        console.error(
          `[VIBE-CARD] Error creating bucket URL for thumbnail ${vibe.thumbnail_url}:`,
          error,
        );
      }
    }

    // Если у нас есть media_url и это видео, попробуем использовать его
    if (vibe.media_url && vibe.type === "video") {
      try {
        // Для видео можно использовать тот же URL, что и для медиа
        if (vibe.media_url.startsWith("http")) {
          // Если это уже полный URL, используем его напрямую
          console.log(
            `[VIBE-CARD] Using media URL as thumbnail for vibe ${vibe.id}:`,
            vibe.media_url,
          );
          return vibe.media_url;
        } else {
          // Иначе создаем URL через createBucketUrl
          const mediaUrl = createBucketUrl(vibe.media_url, "track");
          console.log(
            `[VIBE-CARD] Generated media URL as thumbnail for vibe ${vibe.id}:`,
            mediaUrl,
          );
          return mediaUrl;
        }
      } catch (error) {
        console.error(
          `[VIBE-CARD] Error creating bucket URL for media ${vibe.media_url}:`,
          error,
        );
      }
    }

    // Возвращаем пустую строку вместо плейсхолдера
    console.warn(`[VIBE-CARD] No valid thumbnail for vibe ${vibe.id}`);
    return "";
  }

  // Render vibe content based on type
  const renderVibeContent = () => {
    // Default type is 'photo' if not specified
    const vibeType = vibe.type || "photo";
    switch (vibeType) {
      case "video":
        if (!vibe.media_url) return null;
        return (
          <div className="relative w-full group" style={{ minHeight: 300 }}>
            {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> */}
            {!showVideo ? (
              <div
                className="relative w-full h-full cursor-pointer"
                onClick={handleThumbnailClick}
              >
                {/* Simplified clean background */}
                <div className="relative z-10 flex items-center justify-center p-8">
                  <motion.button
                    onClick={handleThumbnailClick}
                    className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#20DDBB]/50 rounded-xl backdrop-blur-sm transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent"></div>
                    <span className="text-white text-sm font-semibold">PLAY</span>
                  </motion.button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={vibe.media_url}
                controls
                // autoPlay удален, теперь воспроизведение управляется через IntersectionObserver
                muted={true} // Изначально видео будет без звука, звук включится после начала воспроизведения
                playsInline
                className={`w-full transition-all duration-500 group-hover:[&::-webkit-media-controls]:opacity-0 group-hover:[&::-webkit-media-controls-panel]:opacity-0 group-hover:[&::-webkit-media-controls-play-button]:opacity-0 group-hover:[&::-webkit-media-controls-timeline]:opacity-0 group-hover:[&::-webkit-media-controls-current-time-display]:opacity-0 group-hover:[&::-webkit-media-controls-time-remaining-display]:opacity-0 group-hover:[&::-webkit-media-controls-mute-button]:opacity-0 group-hover:[&::-webkit-media-controls-volume-slider]:opacity-0 group-hover:[&::-webkit-media-controls-fullscreen-button]:opacity-0 ${isLoading ? "opacity-0" : "opacity-100"}`}
                width={500}
                height={650}
                onLoadedData={(e) => {
                  setIsLoading(false);
                  // Воспроизведение теперь управляется через IntersectionObserver
                  if (isInViewport && !videoEnded) {
                    try {
                      const playPromise = e.currentTarget.play();
                      if (playPromise !== undefined) {
                        playPromise
                          .then(() => {
                            console.log(
                              `[VIBE-CARD] Video for vibe ${vibe.id} started playing on load`,
                            );
                            if (e.currentTarget) {
                              e.currentTarget.muted = false;
                            }
                          })
                          .catch((error) => {
                            console.error(
                              `[VIBE-CARD] Error playing video for vibe ${vibe.id} on load:`,
                              error,
                            );
                          });
                      }
                    } catch (err) {
                      console.error(
                        `[VIBE-CARD] Error playing video for vibe ${vibe.id} on load:`,
                        err,
                      );
                    }
                  }
                }}
                onEnded={handleVideoEnded}
                onError={() => setIsLoading(false)}
                style={{
                  width: "100%",
                  height: "100%",
                  maxHeight: 870,
                  minHeight: 300,
                  background: "#181828",
                  objectFit: "cover",
                }}
                poster={getVideoThumbnailUrl(vibe)}
              />
            )}
          </div>
        );
      case "photo":
      default:
        // Conditionally render the image section if vibe.media_url exists
        if (!vibe.media_url) return null;
        return (
          <div className="relative w-full group">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2A2151]/50 to-[#1E1A36]/50 flex items-center justify-center">
                <div className="animate-pulse">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-[#20DDBB]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              </div>
            )}
            {/* <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" /> */}
            <Image
              src={
                imageError
                  ? "/images/placeholders/default-placeholder.svg"
                  : getVibeImageUrl(vibe.media_url)
              }
              alt={
                vibe.caption
                  ? `Musical vibe: ${vibe.caption} by ${vibe.profile?.name || "artist"}`
                  : `Musical vibe shared by ${vibe.profile?.name || "artist"} on ${new Date(vibe.created_at).toLocaleDateString()}`
              }
              className={`w-full transition-all duration-500 ${isLoading ? "opacity-0" : "opacity-100"}`}
              width={500}
              height={650}
              onError={(e) => {
                console.error("Image load error for:", vibe.media_url);
                setImageError(true);
              }}
              onLoad={() => setIsLoading(false)}
              style={{
                width: "100%",
                height: "100%",
                maxHeight: 870,
                objectFit: "cover",
              }}
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
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  // Ref для видео элемента
  const videoRef = useRef<HTMLVideoElement>(null);
  // Ref для карточки вайба
  const vibeCardRef = useRef<HTMLDivElement>(null);
  // Состояние для отслеживания, находится ли карточка в поле зрения
  const [isInViewport, setIsInViewport] = useState(false);
  // Состояние для отслеживания, закончилось ли воспроизведение видео
  const [videoEnded, setVideoEnded] = useState(false);

  // Используем IntersectionObserver для определения видимости карточки
  useEffect(() => {
    if (!vibeCardRef.current || vibe.type !== "video") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;
        console.log(
          `[VIBE-CARD] Vibe ${vibe.id} visibility changed to: ${isVisible}`,
        );
        setIsInViewport(isVisible);

        // Если карточка видима и видео загружено, но не воспроизводится
        if (isVisible && videoRef.current && showVideo && !videoEnded) {
          try {
            // Попытка воспроизвести видео
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log(
                    `[VIBE-CARD] Video for vibe ${vibe.id} started playing`,
                  );
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                  }
                })
                .catch((error) => {
                  console.error(
                    `[VIBE-CARD] Error playing video for vibe ${vibe.id}:`,
                    error,
                  );
                });
            }
          } catch (error) {
            console.error(
              `[VIBE-CARD] Error playing video for vibe ${vibe.id}:`,
              error,
            );
          }
        } else if (!isVisible && videoRef.current) {
          // Если карточка не видима, ставим видео на паузу
          try {
            videoRef.current.pause();
            console.log(
              `[VIBE-CARD] Video for vibe ${vibe.id} paused due to visibility change`,
            );
          } catch (error) {
            console.error(
              `[VIBE-CARD] Error pausing video for vibe ${vibe.id}:`,
              error,
            );
          }
        }
      },
      { threshold: 0.5 }, // Карточка считается видимой, когда видно не менее 50% её площади
    );

    observer.observe(vibeCardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [vibe.id, vibe.type, showVideo, videoEnded]);

  // Обработчик события окончания воспроизведения видео
  const handleVideoEnded = () => {
    console.log(`[VIBE-CARD] Video for vibe ${vibe.id} ended`);
    setVideoEnded(true);
    setShowVideo(false); // Показываем миниатюру после окончания видео
  };

  // Сбрасываем состояние videoEnded при клике на миниатюру
  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoEnded(false);
    setShowVideo(true);
  };

  return (
    <div className="mb-8 mx-[10px] md:mx-auto w-full md:w-[450px] vibe-card-container">
      <motion.div
        id={`vibe-card-${vibe.id}`}
        ref={vibeCardRef}
        className="relative p-0.5 rounded-2xl overflow-hidden group cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Animated border gradient - DISABLED */}
        {/* <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/40 via-purple-500/20 to-[#5D59FF]/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div> */}

        {/* Card content container */}
        <div
          className="relative bg-gradient-to-br from-[#24183d]/95 to-[#1E1432]/98 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500"
          itemScope
          itemType="https://schema.org/SocialMediaPosting"
        >
          {/* Enhanced SEO metadata for search engines */}
          <div className="hidden" aria-hidden="true">
            <h1 itemProp="headline">
              {vibe.caption ||
                `Musical Vibe by ${vibe.profile?.name || "artist"} - SacralTrack`}
            </h1>
            <h2>Discover Musical Moments on SacralTrack</h2>
            <p itemProp="description">
              {vibe.caption || 
                `Experience this unique musical vibe shared by ${vibe.profile?.name || "an artist"} on SacralTrack. Join the community of music lovers sharing their favorite musical moments, discover new artists, and connect through the power of music.`}
            </p>
            <meta
              itemProp="author"
              content={vibe.profile?.name || "SacralTrack User"}
            />
            <meta
              itemProp="datePublished"
              content={vibe.created_at || new Date().toISOString()}
            />
            <meta itemProp="image" content={getVibeImageUrl(vibe.media_url)} />
            <meta itemProp="url" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/vibe/${vibe.id}`} />
            <meta itemProp="interactionCount" content="0 likes, 0 comments" />
            <meta
              itemProp="keywords"
              content={`musical vibe, ${vibe.profile?.name || "artist"}, music community, SacralTrack, music sharing, social music, musical moments, music discovery, artist community, music platform, ${vibe.caption ? vibe.caption.split(' ').slice(0, 5).join(', ') : 'music content'}`}
            />
            
            {/* Enhanced Open Graph tags */}
            <meta
              property="og:title"
              content={`${vibe.caption || `Musical Vibe by ${vibe.profile?.name || "artist"}`} - SacralTrack`}
            />
            <meta property="og:type" content="music.song" />
            <meta property="og:url" content={`${typeof window !== 'undefined' ? window.location.origin : ''}/vibe/${vibe.id}`} />
            <meta
              property="og:image"
              content={getVibeImageUrl(vibe.media_url)}
            />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`Musical vibe by ${vibe.profile?.name || "artist"} on SacralTrack`} />
            <meta
              property="og:description"
              content={vibe.caption || 
                `Experience this unique musical vibe by ${vibe.profile?.name || "an artist"} on SacralTrack. Join our music community and discover amazing musical moments.`}
            />
            <meta property="og:site_name" content="SacralTrack - Music Community" />
            <meta property="og:locale" content="en_US" />
            <meta property="article:published_time" content={vibe.created_at} />
            <meta property="article:author" content={vibe.profile?.name || "SacralTrack User"} />
            <meta property="article:section" content="Music Vibes" />
            <meta property="article:tag" content="music" />
            <meta property="article:tag" content="vibe" />
            <meta property="article:tag" content="community" />
            
            {/* Enhanced Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@SacralTrack" />
            <meta name="twitter:creator" content={`@${vibe.profile?.name?.replace(/\s+/g, '') || 'SacralTrack'}`} />
            <meta
              name="twitter:title"
              content={vibe.caption ||
                `Musical Vibe by ${vibe.profile?.name || "artist"}`}
            />
            <meta
              name="twitter:description"
              content={vibe.caption ||
                `Experience this unique musical vibe by ${vibe.profile?.name || "an artist"} on SacralTrack. Join our music community!`}
            />
            <meta
              name="twitter:image"
              content={getVibeImageUrl(vibe.media_url)}
            />
            <meta name="twitter:image:alt" content={`Musical vibe by ${vibe.profile?.name || "artist"}`} />
            
            {/* Additional SEO meta tags */}
            <meta name="description" content={vibe.caption || `Musical vibe by ${vibe.profile?.name || "artist"} on SacralTrack - Join the music community`} />
            <meta name="keywords" content={`musical vibe, ${vibe.profile?.name || "artist"}, music community, SacralTrack, music sharing, social music platform, music discovery, artist community, musical moments, music lovers`} />
            <meta name="author" content={vibe.profile?.name || "SacralTrack User"} />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow" />
            <link rel="canonical" href={`${typeof window !== 'undefined' ? window.location.origin : ''}/vibe/${vibe.id}`} />
          </div>

          {/* JSON-LD Structured Data for enhanced SEO */}
          <script 
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SocialMediaPosting",
                "headline": vibe.caption || `Musical Vibe by ${vibe.profile?.name || "artist"}`,
                "description": vibe.caption || `Experience this unique musical vibe shared by ${vibe.profile?.name || "an artist"} on SacralTrack`,
                "datePublished": vibe.created_at,
                "author": {
                  "@type": "Person",
                  "name": vibe.profile?.name || "SacralTrack User",
                  "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${vibe.profile?.user_id}`,
                  "image": vibe.profile?.image ? createBucketUrl(vibe.profile.image, 'user') : '/images/default-avatar.jpg'
                },
                "publisher": {
                  "@type": "Organization",
                  "name": "SacralTrack",
                  "logo": {
                    "@type": "ImageObject",
                    "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`
                  }
                },
                "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/vibe/${vibe.id}`,
                "image": {
                  "@type": "ImageObject",
                  "url": getVibeImageUrl(vibe.media_url),
                  "width": 1200,
                  "height": 630
                },
                "video": vibe.media_url ? {
                  "@type": "VideoObject",
                  "contentUrl": getVibeImageUrl(vibe.media_url),
                  "thumbnailUrl": getVibeImageUrl(vibe.media_url),
                  "uploadDate": vibe.created_at
                } : undefined,
                "mainEntityOfPage": {
                  "@type": "WebPage",
                  "@id": `${typeof window !== 'undefined' ? window.location.origin : ''}/vibe/${vibe.id}`
                },
                "interactionStatistic": [
                  {
                    "@type": "InteractionCounter",
                    "interactionType": "https://schema.org/LikeAction",
                    "userInteractionCount": 0
                  },
                  {
                    "@type": "InteractionCounter",
                    "interactionType": "https://schema.org/CommentAction",
                    "userInteractionCount": 0
                  }
                ],
                "genre": "Music",
                "keywords": `musical vibe, ${vibe.profile?.name || "artist"}, music community, SacralTrack, music sharing, social music platform`,
                "inLanguage": "en-US",
                "isPartOf": {
                  "@type": "WebSite",
                  "name": "SacralTrack",
                  "url": typeof window !== 'undefined' ? window.location.origin : ''
                },

              })
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="p-[5px]"
          >
            {/* Vibe header section */}
            <div className="flex items-center justify-between mb-4">
              <Link
                href={`/profile/${vibe.user_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl overflow-hidden mr-4 border border-white/10 shadow-lg">
                    <Image
                      src={getProfileImageUrl(vibe.profile?.image || "")}
                      alt={`${vibe.profile?.name || "Artist"}'s profile picture - Music creator`}
                      className="w-full h-full object-cover"
                      width={48}
                      height={48}
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#20DDBB] hover:to-[#5D59FF] transition-all duration-300 text-lg">
                      {vibe.profile?.name || "Unknown User"}
                    </h3>
                    <p className="text-xs text-[#A6B1D0] flex items-center gap-1">
                      <span>
                        {new Date(vibe.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="inline-block w-1 h-1 rounded-full bg-gray-500"></span>
                      <span>
                        {new Date(vibe.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>

              {/* Options menu */}
              <div className="relative flex items-center gap-2">
                {/* Details button - HIDDEN */}
                {/* <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/vibe/${vibe.id}`);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/10 hover:from-[#20DDBB]/30 hover:to-[#20DDBB]/20 border border-[#20DDBB]/30 hover:border-[#20DDBB]/50 transition-all duration-300 text-sm text-white/90 hover:text-white flex items-center gap-1.5 backdrop-blur-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                    <path
                      fillRule="evenodd"
                      d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="hidden md:inline">Details</span>
                </motion.button> */}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(!showOptions);
                  }}
                  className={`p-1.5 rounded-full hover:bg-white/10 transition-colors relative z-30 ${showOptions ? "bg-white/10" : ""}`}
                >
                  <EllipsisHorizontalIcon className="h-5 w-5 text-gray-400" />
                </button>

                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 bg-[#1E1A36] border border-white/10 rounded-xl overflow-hidden shadow-lg z-20 min-w-[160px]"
                  >
                    {/* Стрелочка указывающая на кнопку */}
                    <div className="absolute -top-1 right-3 w-2 h-2 bg-[#1E1A36] border-l border-t border-white/10 transform rotate-45"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <ShareIcon className="h-4 w-4 text-gray-400" />
                      <span>Share vibe</span>
                    </button>

                    {user?.id === vibe.user_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVibe();
                        }}
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
                  </motion.div>
                )}
              </div>
            </div>

            {/* Vibe content */}
            {renderVibeContent()}

            {/* Caption с музыкальными нотами */}
            {vibe.caption && (
              <div className="mt-[5px] flex items-start justify-between text-gray-300 text-sm relative">
                <div className="absolute -left-1 top-0 h-full w-0.5 bg-gradient-to-b from-purple-500/30 to-transparent rounded-full"></div>
                                <p className="pl-3 flex-1 mr-2">{vibe.caption}</p>
                {/* Mood Glass Tag */}
                {vibe.mood && (
                  <div
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(32,221,187,0.15) 0%, rgba(1,140,253,0.15) 100%)",
                      backdropFilter: "blur(10px) saturate(1.8)",
                      WebkitBackdropFilter: "blur(10px) saturate(1.8)",
                      border: "1px solid rgba(32,221,187,0.2)",
                      color: "#20DDBB",
                    }}
                  >
                    {vibe.mood}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="p-[5px] border-t border-white/5 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <VibeLikes
                    vibe={vibe}
                    onLikeUpdated={handleLikeUpdate}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 transition-all duration-300 backdrop-blur-sm"
                    size="md"
                  />

                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenComments();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#20DDBB]/30 transition-all duration-300 backdrop-blur-sm"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5 text-white/70" />
                    <span className="text-sm font-semibold text-white/80">
                      {formatNumber(vibeStats.commentsCount)}
                    </span>
                  </motion.button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#20DDBB]/30 transition-all duration-300"
                >
                  <ShareIcon className="w-5 h-5 text-white/80 hover:text-[#20DDBB]" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Comment Modal */}
      <QuickCommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onSubmit={handleQuickCommentSubmit}
        onDelete={deleteComment}
        vibeId={vibe.id}
        isSubmitting={isSubmittingComment}
        comments={commentsList}
      />
    </div>
  );
};

// Reusable emoji button component
interface EmojiButtonProps {
  emoji: string;
  idx: number;
  color: string;
  setPreviewEmoji: React.Dispatch<React.SetStateAction<string | null>>;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
}

const EmojiButton: React.FC<EmojiButtonProps> = ({
  emoji,
  idx,
  color,
  setPreviewEmoji,
  setCommentText,
}) => {
  return (
    <button
      type="button"
      onMouseEnter={() => setPreviewEmoji(emoji)}
      onMouseLeave={() => setPreviewEmoji(null)}
      onClick={() => {
        setCommentText((prev) => prev + emoji);
        setPreviewEmoji(null);
      }}
      className={`text-xl p-2.5 rounded-lg transition-all duration-200 transform hover:shadow-lg hover:shadow-${color}/20 bg-black/20 backdrop-blur-sm border border-white/5`}
      style={{
        boxShadow: `0 0 5px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`,
      }}
    >
      {emoji}
    </button>
  );
};

export default VibeCard;
