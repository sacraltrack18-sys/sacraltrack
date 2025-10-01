import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import {
  HeartIcon as HeartOutline,
  StarIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { FaCrown, FaHeadphones, FaUserPlus, FaUserCheck } from "react-icons/fa";

interface UserProps {
  user_id: string;
  name: string;
  avatar?: string;
  location?: string;
  followers?: number;
  rating?: number;
  rating_count?: number;
  rank?: number;
}

interface UserCardProps {
  user: UserProps;
  isFriend: boolean;
  onAddFriend?: (userId: string) => void;
  onRemoveFriend?: (userId: string) => void;
  onRateUser?: (userId: string, rating: number) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isFriend,
  onAddFriend,
  onRemoveFriend,
  onRateUser,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentRating, setCurrentRating] = useState<number>(user.rating || 0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showRatingPanel, setShowRatingPanel] = useState(false);

  // Форматирование числа подписчиков
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  // Обработка добавления/удаления друга
  const handleFriendAction = () => {
    if (isFriend && onRemoveFriend) {
      onRemoveFriend(user.user_id);
    } else if (onAddFriend) {
      onAddFriend(user.user_id);
    }
  };

  // Обработка рейтинга
  const handleRating = (rating: number) => {
    setCurrentRating(rating);
    setRatingSubmitted(true);
    if (onRateUser) {
      onRateUser(user.user_id, rating);
    }

    // Скрыть панель рейтинга через 2 секунды
    setTimeout(() => {
      setShowRatingPanel(false);
      setRatingSubmitted(false);
    }, 2000);
  };

  // Генерация заднего фона в зависимости от rank пользователя
  const getRankBackground = () => {
    if (user.rank === 1) return "bg-gradient-to-r from-[#F9D923] to-[#F8A01E]";
    if (user.rank === 2) return "bg-gradient-to-r from-[#E0E0E0] to-[#B8B8B8]";
    if (user.rank === 3) return "bg-gradient-to-r from-[#CD7F32] to-[#A05215]";
    return "bg-gradient-to-r from-[#20DDBB]/20 to-[#5D59FF]/20";
  };

  // Определяем цвет для имени пользователя на основе его ранга
  const getNameGradient = () => {
    if (user.rank === 1)
      return "bg-gradient-to-r from-[#F9D923] to-[#F8A01E] bg-clip-text text-transparent";
    if (user.rank === 2)
      return "bg-gradient-to-r from-[#E0E0E0] to-[#B8B8B8] bg-clip-text text-transparent";
    if (user.rank === 3)
      return "bg-gradient-to-r from-[#CD7F32] to-[#A05215] bg-clip-text text-transparent";
    return "text-white hover:bg-gradient-to-r hover:from-[#20DDBB] hover:to-[#5D59FF] hover:bg-clip-text hover:text-transparent";
  };

  return (
    <motion.div
      className="group relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm hover:border-[#20DDBB]/30 transition-all duration-300 cursor-pointer aspect-[4/5] mt-5"
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
      initial={false}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Full-size avatar background */}
      <div className="absolute inset-0">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20 flex items-center justify-center">
            <motion.div 
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#20DDBB] to-[#5D59FF] flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/40"></div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/5 via-transparent to-[#5D59FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Rank badge for top users */}
      {user.rank && user.rank <= 3 && (
        <div className="absolute top-3 left-3 z-20">
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-lg ${getRankBackground()}`}
          >
            <FaCrown
              className={`${user.rank === 1 ? "text-yellow-900" : user.rank === 2 ? "text-gray-700" : "text-amber-900"}`}
              size={16}
            />
          </div>
        </div>
      )}

      {/* Content with 5px padding */}
      <div className="absolute inset-[5px] flex flex-col justify-between">
        {/* Top section - Rating */}
        <div className="flex justify-end">
          <div className="flex flex-col items-end">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRatingPanel(true)}
              className="flex items-center bg-black/50 backdrop-blur-md rounded-full px-4 py-2 md:px-3 md:py-1.5 border border-white/30 cursor-pointer shadow-lg min-w-[60px] min-h-[36px] md:min-w-[auto] md:min-h-[auto] active:bg-black/70 transition-all duration-200"
            >
              <StarIcon className="h-5 w-5 md:h-4 md:w-4 mr-1.5 md:mr-1 text-[#20DDBB]" />
              <span className="text-white text-base md:text-sm font-semibold">
                {user.rating?.toFixed(1) || "0.0"}
              </span>
            </motion.div>
            <div className="mt-1 text-xs text-white/80 bg-black/30 rounded px-2 py-0.5">
              ({user.rating_count || 0})
            </div>
          </div>
        </div>

        {/* Bottom section - User info and stats */}
        <div className="space-y-3">
          {/* User name and location */}
          <div>
            <Link href={`/profile/${user.user_id}`}>
              <h3
                className={`text-lg font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#20DDBB] group-hover:to-[#5D59FF] transition-all duration-300 mb-1 ${getNameGradient()}`}
              >
                {user.name}
              </h3>
            </Link>
            {user.location && (
              <div className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#20DDBB]/20 text-[#20DDBB] border border-[#20DDBB]/30 backdrop-blur-sm">
                {user.location}
              </div>
            )}
          </div>

          {/* Stats and friend button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Followers count */}
              <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                <div className="flex items-center gap-1">
                  <FaHeadphones className="w-3 h-3 text-[#20DDBB]" />
                  <span className="text-xs font-medium text-white">
                    {formatFollowers(user.followers || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Friend action button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFriendAction}
              className={`backdrop-blur-md rounded-full p-2.5 border transition-all duration-200 ${
                isFriend
                  ? "bg-pink-500/30 border-pink-500/50 hover:bg-pink-500/40 text-pink-400"
                  : "bg-[#20DDBB]/30 border-[#20DDBB]/50 hover:bg-[#20DDBB]/40 text-[#20DDBB]"
              }`}
            >
              {isFriend ? (
                <HeartSolid className="w-4 h-4" />
              ) : (
                <HeartOutline className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Rating panel */}
      <AnimatePresence>
        {showRatingPanel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-2 bottom-2 p-4 md:p-3 bg-black/90 backdrop-blur-md rounded-xl border border-white/30 z-30 shadow-2xl"
          >
            {!ratingSubmitted ? (
              <>
                <p className="text-sm md:text-xs text-gray-300 mb-3 md:mb-2 text-center font-medium">Rate this user:</p>
                <div className="flex justify-center space-x-3 md:space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRating(star)}
                      className={`text-2xl md:text-lg min-w-[40px] min-h-[40px] md:min-w-[auto] md:min-h-[auto] flex items-center justify-center rounded-full active:bg-white/10 transition-all duration-200 ${star <= currentRating ? "text-[#20DDBB]" : "text-gray-500"}`}
                    >
                      ★
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center text-[#20DDBB] text-sm"
              >
                <span>Thanks for rating!</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
