"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import {
  PlayIcon,
  PauseIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/solid";
import { useMixStore, MixPostWithProfile } from "../../stores/mixStore";
import { useUser } from "../../context/user";
import { formatDistanceToNow } from "@/app/utils/dateUtils";
import toast from "react-hot-toast";

interface MixCardProps {
  mix: MixPostWithProfile;
}

export default function MixCard({ mix }: MixCardProps) {
  const { userLikedMixes, likeMix, unlikeMix } = useMixStore();
  const userContext = useUser();
  const user = userContext?.user;
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  // Проверяем, лайкнул ли пользователь этот микс
  const isLiked = userLikedMixes.includes(mix.id);

  // Обработчик клика по кнопке лайка
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  // Останавливаем воспроизведение при размонтировании компонента
  React.useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [audioElement]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="bg-gradient-to-br from-[#1A1C2E] to-[#252742] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-purple-500/10"
    >
      <Link href={`/mix/${mix.id}`} className="block h-full">
        <div className="relative aspect-video group">
          {mix.image_url ? (
            <Image
              src={mix.image_url}
              alt={mix.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-purple-500/30 flex items-center justify-center">
              <MusicalNoteIcon className="h-16 w-16 text-white/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
            <motion.button
              onClick={handlePlayClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full p-4 shadow-lg backdrop-blur-sm bg-opacity-80 z-10"
            >
              {isPlaying ? (
                <PauseIcon className="h-8 w-8 text-white" />
              ) : (
                <PlayIcon className="h-8 w-8 text-white" />
              )}
            </motion.button>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center mb-3">
            <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3 border-2 border-purple-500/30">
              <Image
                src={mix.profile.image || "/images/default-avatar.png"}
                alt={mix.profile.name}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-sm font-medium text-white/90">
              {mix.profile.name}
            </span>
          </div>

          <h3 className="font-bold text-xl mb-2 line-clamp-1 text-white group-hover:text-purple-300 transition-colors">
            {mix.title}
          </h3>
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {mix.description}
          </p>

          <div className="flex justify-between items-center text-sm text-gray-300">
            <div className="flex items-center space-x-3">
              <span className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 px-3 py-1 rounded-full text-xs text-white font-medium">
                {mix.genre}
              </span>
              <span className="text-gray-400">
                {formatDistanceToNow(new Date(mix.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <motion.button
              onClick={handleLikeClick}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-2"
            >
              {isLiked ? (
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  <HeartSolid className="h-6 w-6 text-red-500 drop-shadow-glow" />
                </motion.div>
              ) : (
                <HeartOutline className="h-6 w-6 text-white/80 hover:text-red-400 transition-colors" />
              )}
              <span className="font-medium">{mix.stats.likes}</span>
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
