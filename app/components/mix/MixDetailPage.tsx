"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import {
  PlayIcon,
  PauseIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
} from "@heroicons/react/24/solid";
import { useMixStore, MixPostWithProfile } from "../../stores/mixStore";
import { useUser } from "../../context/user";
import { formatDistanceToNow, format } from "@/app/utils/dateUtils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FaFacebook, FaTwitter, FaLink } from "react-icons/fa";
import TopNav from "../../layouts/includes/TopNav";
import { database, Query } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";
import { ID } from "@/libs/AppWriteClient";

interface MixDetailPageProps {
  mix: MixPostWithProfile;
}

interface MixComment {
  id: string;
  user_id: string;
  mix_id: string;
  text: string;
  created_at: string;
  profile?: {
    user_id: string;
    name: string;
    image: string;
  };
}

// Хук для работы с комментариями
function useComments(mixId: string) {
  const [comments, setComments] = useState<MixComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalComments, setTotalComments] = useState(0);

  // Функция для получения комментариев
  const fetchComments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Получаем комментарии из базы данных
      const response = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        "mix_comments", // Предполагаемое имя коллекции для комментариев миксов
        [Query.equal("mix_id", mixId), Query.orderDesc("created_at")],
      );

      // Получаем профили пользователей для комментариев
      const commentsWithProfiles = await Promise.all(
        response.documents.map(async (comment: any) => {
          try {
            // Проверяем, есть ли уже профиль в комментарии
            if (comment.profile && typeof comment.profile === "object") {
              return {
                id: comment.$id,
                user_id: comment.user_id,
                mix_id: comment.mix_id,
                text: comment.text,
                created_at: comment.created_at,
                profile: {
                  user_id: comment.profile.user_id || comment.user_id,
                  name: comment.profile.name || "Unknown User",
                  image: comment.profile.image || "",
                },
              };
            }

            // Получаем профиль пользователя
            const profileResponse = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.userCollectionId,
              [Query.equal("user_id", comment.user_id)],
            );

            const profile = profileResponse.documents[0] || {
              user_id: comment.user_id,
              name: "Unknown User",
              image: "",
            };

            // Преобразуем документ в формат MixComment
            return {
              id: comment.$id,
              user_id: comment.user_id,
              mix_id: comment.mix_id,
              text: comment.text,
              created_at: comment.created_at,
              profile: {
                user_id: profile.user_id,
                name: profile.name,
                image: profile.image || "",
              },
            };
          } catch (profileError) {
            console.error("Error fetching profile for comment:", profileError);

            // Возвращаем комментарий без профиля в случае ошибки
            return {
              id: comment.$id,
              user_id: comment.user_id,
              mix_id: comment.mix_id,
              text: comment.text,
              created_at: comment.created_at,
              profile: {
                user_id: comment.user_id,
                name: "Unknown User",
                image: "",
              },
            };
          }
        }),
      );

      // Сортируем комментарии по дате создания (новые сверху)
      const sortedComments = commentsWithProfiles.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setComments(sortedComments);
      setTotalComments(response.total);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setError("Failed to load comments");
      setIsLoading(false);
    }
  };

  // Функция для добавления комментария
  const addComment = (newComment: MixComment) => {
    // Проверяем, существует ли уже комментарий с таким ID
    const existingCommentIndex = comments.findIndex(
      (comment) => comment.id === newComment.id,
    );

    if (existingCommentIndex !== -1) {
      // Заменяем существующий комментарий
      const updatedComments = [...comments];
      updatedComments[existingCommentIndex] = newComment;
      setComments(updatedComments);
    } else {
      // Добавляем новый комментарий в начало списка
      setComments([newComment, ...comments]);
      setTotalComments((prev) => prev + 1);
    }
  };

  return {
    comments,
    isLoading,
    error,
    totalComments,
    fetchComments,
    addComment,
  };
}

export default function MixDetailPage({ mix }: MixDetailPageProps) {
  const { userLikedMixes, likeMix, unlikeMix } = useMixStore();
  const userContext = useUser();
  const user = userContext?.user;
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const {
    comments,
    isLoading: isLoadingComments,
    error: commentsError,
    totalComments,
    fetchComments,
    addComment,
  } = useComments(mix.id);

  // Проверяем, лайкнул ли пользователь этот микс
  const isLiked = userLikedMixes.includes(mix.id);

  // Загружаем комментарии при монтировании компонента
  useEffect(() => {
    fetchComments();
  }, [mix.id]);

  // Обработчик клика по кнопке лайка
  const handleLikeClick = () => {
    if (!user) {
      toast.error("You need to be logged in to like mixes");
      return;
    }

    if (isLiked) {
      unlikeMix(mix.id, user.id);
    } else {
      likeMix(mix.id, user.id);
    }
  };

  // Обработчик клика по кнопке воспроизведения
  const handlePlayClick = () => {
    if (!audioElement) {
      const audio = new Audio(mix.media_url);
      setAudioElement(audio);

      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));

      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        toast.error("Failed to play audio");
      });
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play().catch((error) => {
          console.error("Error playing audio:", error);
          toast.error("Failed to play audio");
        });
      }
    }
  };

  // Обработчик отправки комментария
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You need to be logged in to comment");
      return;
    }

    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setIsSubmittingComment(true);

      // Создаем документ комментария
      const response = await database.createDocument(
        APPWRITE_CONFIG.databaseId,
        "mix_comments", // Предполагаемое имя коллекции для комментариев миксов
        ID.unique(),
        {
          user_id: user.id,
          mix_id: mix.id,
          text: commentText.trim(),
          created_at: new Date().toISOString(),
          profile: {
            user_id: user.id,
            name: user.name || "Unknown User",
            image: user.image || "",
          },
        },
      );

      // Обновляем статистику микса
      const updatedStats = { ...mix.stats, comments: mix.stats.comments + 1 };

      await database.updateDocument(
        APPWRITE_CONFIG.databaseId,
        "mixes", // Предполагаемое имя коллекции для миксов
        mix.id,
        { stats: updatedStats },
      );

      // Добавляем комментарий в список
      const newComment: MixComment = {
        id: response.$id,
        user_id: user.id,
        mix_id: mix.id,
        text: commentText.trim(),
        created_at: new Date().toISOString(),
        profile: {
          user_id: user.id,
          name: user.name || "Unknown User",
          image: user.image || "",
        },
      };

      addComment(newComment);
      setCommentText("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Функция для копирования ссылки на микс
  const copyLinkToClipboard = () => {
    const url = `${window.location.origin}/mix/${mix.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link"),
    );
  };

  // Функция для шаринга в Facebook
  const shareOnFacebook = () => {
    const url = `${window.location.origin}/mix/${mix.id}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
    );
  };

  // Функция для шаринга в Twitter
  const shareOnTwitter = () => {
    const url = `${window.location.origin}/mix/${mix.id}`;
    const text = `Check out this awesome mix: ${mix.title}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
  };

  // Останавливаем воспроизведение при размонтировании компонента
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [audioElement]);

  // Получаем полный URL для изображения профиля
  const getProfileImageUrl = (imageId: string) => {
    if (!imageId) return "/images/default-avatar.png";

    // Проверяем, является ли imageId уже полным URL
    if (imageId.startsWith("http://") || imageId.startsWith("https://")) {
      return imageId;
    }

    // Создаем URL для доступа к файлу в Appwrite Storage
    return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.storageId}/files/${imageId}/view?project=${APPWRITE_CONFIG.projectId}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <TopNav params={{ id: mix?.id || "" }} />

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Верхняя часть с изображением и информацией о миксе */}
        <div className="relative aspect-video">
          <Image
            src={mix.image_url || "/images/default-mix-cover.jpg"}
            alt={mix.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <button
              onClick={handlePlayClick}
              className="bg-white bg-opacity-90 rounded-full p-4 transform hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <PauseIcon className="h-10 w-10 text-primary" />
              ) : (
                <PlayIcon className="h-10 w-10 text-primary" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Информация о пользователе */}
          <div className="flex items-center mb-4">
            <Link
              href={`/profile/${mix.user_id}`}
              className="flex items-center"
            >
              <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
                <Image
                  src={getProfileImageUrl(mix.profile.image)}
                  alt={mix.profile.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium">{mix.profile.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(mix.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
          </div>

          {/* Заголовок и описание микса */}
          <h1 className="text-2xl font-bold mb-2">{mix.title}</h1>
          <p className="text-gray-700 mb-4">{mix.description}</p>

          {/* Метаданные микса */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">
              {mix.genre}
            </span>
            {mix.tags &&
              mix.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 px-3 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Действия с миксом */}
          <div className="flex justify-between items-center border-t border-b py-4 mb-6">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLikeClick}
                className="flex items-center gap-1 text-gray-700 hover:text-primary transition-colors"
              >
                {isLiked ? (
                  <HeartSolid className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartOutline className="h-6 w-6" />
                )}
                <span>{mix.stats.likes}</span>
              </button>

              <button
                className="flex items-center gap-1 text-gray-700 hover:text-primary transition-colors"
                onClick={() =>
                  document
                    .getElementById("comments-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <ChatBubbleLeftIcon className="h-6 w-6" />
                <span>{totalComments}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={shareOnFacebook}
                className="text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="Share on Facebook"
              >
                <FaFacebook className="h-5 w-5" />
              </button>

              <button
                onClick={shareOnTwitter}
                className="text-gray-700 hover:text-blue-400 transition-colors"
                aria-label="Share on Twitter"
              >
                <FaTwitter className="h-5 w-5" />
              </button>

              <button
                onClick={copyLinkToClipboard}
                className="text-gray-700 hover:text-primary transition-colors"
                aria-label="Copy link"
              >
                <FaLink className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Секция комментариев */}
          <div id="comments-section">
            <h2 className="text-xl font-bold mb-4">
              Comments ({totalComments})
            </h2>

            {/* Форма добавления комментария */}
            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={
                        user.image
                          ? getProfileImageUrl(user.image)
                          : "/images/default-avatar.png"
                      }
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-grow">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      disabled={isSubmittingComment}
                    />

                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmittingComment ? "Posting..." : "Post Comment"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-center text-gray-600">
                  <Link
                    href="/login"
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to add a comment
                </p>
              </div>
            )}

            {/* Список комментариев */}
            {isLoadingComments ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                      <div className="flex-grow">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : commentsError ? (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-600">{commentsError}</p>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    <Link
                      href={`/profile/${comment.user_id}`}
                      className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={
                          comment.profile?.image
                            ? getProfileImageUrl(comment.profile.image)
                            : "/images/default-avatar.png"
                        }
                        alt={comment.profile?.name || "User"}
                        fill
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/profile/${comment.user_id}`}
                          className="font-medium hover:underline"
                        >
                          {comment.profile?.name || "Unknown User"}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <p className="text-gray-700">{comment.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
