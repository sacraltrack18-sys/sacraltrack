import { AiFillHeart } from "react-icons/ai";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useUser } from "../../context/user";
import { BiLoaderCircle } from "react-icons/bi";
import { useGeneralStore } from "../../stores/general";
import { VibeLike } from "../../types";
import useGetLikesByVibeId from "../../hooks/useGetLikesByVibeId";
import useIsVibeLiked from "../../hooks/useIsVibeLiked";
import useCreateVibeLike from "../../hooks/useCreateVibeLike";
import useDeleteVibeLike from "../../hooks/useDeleteVibeLike";
import { motion, AnimatePresence } from "framer-motion";

interface VibeLikesProps {
  vibe: {
    id: string;
    user_id: string;
  };
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onLikeUpdated?: (count: number, isLiked: boolean) => void;
}

const VibeLikes = ({
  vibe,
  showCount = true,
  size = "md",
  className = "",
  onLikeUpdated,
}: VibeLikesProps) => {
  const { setIsLoginOpen } = useGeneralStore();
  const contextUser = useUser();

  const [hasClickedLike, setHasClickedLike] = useState<boolean>(false);
  const [userLiked, setUserLiked] = useState<boolean>(false);
  const [likes, setLikes] = useState<VibeLike[]>([]);

  // Получение всех лайков вайба
  useEffect(() => {
    getAllLikesByVibe();
  }, [vibe.id]);

  // Проверка, лайкнул ли пользователь
  useEffect(() => {
    hasUserLikedVibe();
  }, [likes, contextUser]);

  const getAllLikesByVibe = async () => {
    let result = await useGetLikesByVibeId(vibe.id);
    setLikes(result);

    // Уведомляем родительский компонент о новом количестве лайков
    if (onLikeUpdated) {
      onLikeUpdated(result?.length || 0, userLiked);
    }
  };

  const hasUserLikedVibe = () => {
    if (!contextUser) return;

    if (likes?.length < 1 || !contextUser?.user?.id) {
      setUserLiked(false);
      return;
    }
    let res = useIsVibeLiked(contextUser?.user?.id, vibe.id, likes);
    setUserLiked(res ? true : false);

    // Уведомляем родительский компонент о статусе лайка
    if (onLikeUpdated) {
      onLikeUpdated(likes?.length || 0, res ? true : false);
    }
  };

  const like = async () => {
    setHasClickedLike(true);
    await useCreateVibeLike(contextUser?.user?.id || "", vibe.id);
    await getAllLikesByVibe();
    hasUserLikedVibe();
    setHasClickedLike(false);
  };

  const unlike = async (id: string) => {
    setHasClickedLike(true);
    await useDeleteVibeLike(id);
    await getAllLikesByVibe();
    hasUserLikedVibe();
    setHasClickedLike(false);
  };

  const likeOrUnlike = () => {
    if (!contextUser?.user?.id) {
      setIsLoginOpen(true);
      return;
    }

    if (userLiked) {
      // Найти лайк пользователя и удалить его
      let userLike = likes.find(
        (like) =>
          like.user_id === contextUser.user?.id && like.vibe_id === vibe.id,
      );
      if (userLike) {
        unlike(userLike.id);
      }
    } else {
      like();
    }
  };

  // Размеры в зависимости от size prop
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return { icon: 16, text: "text-xs" };
      case "lg":
        return { icon: 27, text: "text-base" };
      default:
        return { icon: 20, text: "text-sm" };
    }
  };

  const sizeClasses = getSizeClasses();

  // Функция для форматирования числа лайков
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  };

  return (
    <motion.button
      disabled={hasClickedLike}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        likeOrUnlike();
      }}
      className={`group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 transition-all duration-300 backdrop-blur-sm ${className}`}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      aria-label={userLiked ? "Unlike" : "Like"}
      title={userLiked ? "Unlike" : "Like"}
    >
      <div className="relative">
        {!hasClickedLike ? (
          <motion.div
            animate={
              userLiked
                ? {
                    scale: [1, 1.2, 1],
                  }
                : {}
            }
            transition={{ duration: 0.4, type: "spring" }}
          >
            <FaHeart
              className={`${sizeClasses.text === "text-xs" ? "text-sm" : sizeClasses.text === "text-base" ? "text-xl" : "text-lg"} transition-colors duration-300 ${
                likes?.length > 0 && userLiked
                  ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                  : "text-white/70 group-hover:text-pink-400"
              }`}
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <BiLoaderCircle
              className={`${sizeClasses.text === "text-xs" ? "text-sm" : sizeClasses.text === "text-base" ? "text-xl" : "text-lg"} text-pink-400`}
            />
          </motion.div>
        )}
      </div>

      {showCount && (
        <span
          className={`${sizeClasses.text} font-semibold transition-colors duration-300 ${
            likes?.length > 0 && userLiked
              ? "text-pink-400"
              : "text-white/80 group-hover:text-white"
          }`}
        >
          {formatNumber(likes?.length || 0)}
        </span>
      )}
    </motion.button>
  );
};

export default VibeLikes;
