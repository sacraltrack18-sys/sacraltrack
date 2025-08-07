"use client";

import React from "react";
import Image from "next/image"; // Using Next.js Image for optimization
import SimpleMp3Player from "@/app/components/audio/SimpleMp3Player";
import { FaGlobeAmericas, FaExternalLinkAlt, FaPlay } from "react-icons/fa";
import { HiMusicNote } from "react-icons/hi";
import { motion } from "framer-motion";

export interface ApiTrack {
  id: string;
  title: string;
  artistName: string;
  albumName?: string;
  imageUrl?: string;
  audioUrl: string;
  duration?: number;
  source: string;
  licenseUrl?: string;
  type: "api_track";
}

interface PostApiCardProps {
  track: ApiTrack;
  isPlaying: boolean;
  onPlay: (trackId: string) => void;
  onPause: (trackId: string) => void;
}

// Fallback for image errors, similar to LazyImage's fallback concept
const ImageFallback = () => (
  <div className="w-full h-full bg-gradient-to-r from-[#2E2469] to-[#351E43] flex items-center justify-center">
    <HiMusicNote className="text-white/40 text-5xl" />
  </div>
);

const PostApiCard: React.FC<PostApiCardProps> = ({
  track,
  isPlaying,
  onPlay,
  onPause,
}) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        type: "spring",
        damping: 25,
        stiffness: 300,
      }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
      className="relative p-0.5 rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto group"
      itemScope
      itemType="https://schema.org/MusicRecording"
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/40 via-purple-500/20 to-[#5D59FF]/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Card content container */}
      <div className="relative bg-gradient-to-br from-[#24183d]/95 to-[#1E1432]/98 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group-hover:shadow-[0_25px_60px_rgba(32,221,187,0.15)] transition-all duration-500">
        {/* SEO Metadata (simplified for API tracks) */}
        <meta itemProp="name" content={track.title} />
        <meta itemProp="byArtist" content={track.artistName} />
        {track.albumName && (
          <meta itemProp="inAlbum" content={track.albumName} />
        )}
        <meta itemProp="duration" content={`PT${track.duration || 0}S`} />{" "}
        {/* ISO 8601 duration */}
        {track.imageUrl && <meta itemProp="image" content={track.imageUrl} />}
        <meta itemProp="audio" content={track.audioUrl} />
        <meta itemProp="provider" content={track.source} />
        {/* Header Section */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Enhanced source icon */}
            <motion.div
              className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20 backdrop-blur-sm flex items-center justify-center text-[#20DDBB] flex-shrink-0 border border-white/10"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/10 to-[#5D59FF]/10 rounded-xl blur-sm"></div>
              <FaGlobeAmericas size={24} className="relative z-10" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h3
                className="text-white font-bold hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#20DDBB] hover:to-[#5D59FF] transition-all duration-300 line-clamp-1 text-lg"
                title={track.title}
              >
                {track.title || "Unknown Title"}
              </h3>
              <p
                className="text-[#A6B1D0] text-sm truncate max-w-[200px] md:max-w-full font-medium"
                title={track.artistName}
              >
                {track.artistName || "Unknown Artist"}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            <motion.span
              className="relative overflow-hidden text-[#20DDBB] text-xs px-3 py-2 bg-gradient-to-r from-[#20DDBB]/10 to-[#5D59FF]/10 backdrop-blur-sm rounded-xl border border-[#20DDBB]/20 font-bold tracking-wider whitespace-nowrap max-w-[110px] truncate block shadow-[0_4px_15px_rgba(32,221,187,0.1)]"
              title={track.source}
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative">{track.source}</span>
            </motion.span>
          </div>
        </div>
        {/* Image Section */}
        <div className="relative group aspect-square overflow-hidden">
          {imageError || !track.imageUrl ? (
            <ImageFallback />
          ) : (
            <Image
              src={track.imageUrl}
              alt={`Artwork for ${track.title} by ${track.artistName}`}
              layout="fill"
              objectFit="cover"
              className="transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
              onError={() => setImageError(true)}
              priority={false}
            />
          )}

          {/* Enhanced gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* World Content Label */}
          <motion.div
            className="absolute top-4 right-4 bg-gradient-to-r from-black/60 to-black/40 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg z-10 border border-white/20"
            initial={{ opacity: 0.8 }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <FaGlobeAmericas className="text-[#20DDBB]" size={14} />
            <span>World Content</span>
          </motion.div>

          {/* Play button overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={false}
          >
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-[#20DDBB] to-[#5D59FF] rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(32,221,187,0.4)] cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlay className="text-white text-xl ml-1" />
            </motion.div>
          </motion.div>
        </div>
        {/* Audio Player Section */}
        <div className="px-5 py-4 border-t border-white/5 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent">
          <div className="relative">
            <SimpleMp3Player
              audioUrl={track.audioUrl}
              trackId={track.id}
              isPlayingGlobal={isPlaying}
              onPlayGlobal={onPlay}
              onPauseGlobal={onPause}
            />
          </div>
        </div>
        {/* Footer for License (if available) */}
        {track.licenseUrl && (
          <div className="px-5 py-3 text-center border-t border-white/5">
            <motion.a
              href={track.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#A6B1D0] hover:text-[#20DDBB] transition-all duration-300 inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#20DDBB]/5 font-medium"
              whileHover={{ scale: 1.02 }}
            >
              <span>View License</span>
              <FaExternalLinkAlt size={12} />
            </motion.a>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PostApiCard;
