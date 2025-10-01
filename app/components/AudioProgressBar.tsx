"use client";

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BsVolumeUp, BsVolumeMute } from 'react-icons/bs';

interface AudioProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  formatTime: (time: number) => string;
}

const AudioProgressBar = ({
  currentTime,
  duration,
  buffered,
  volume,
  isPlaying,
  onSeek,
  onVolumeChange,
  formatTime
}: AudioProgressBarProps) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(newTime);
  };

  const handleVolumeClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    onVolumeChange(percentage);
  };

  return (
    <div className="w-full px-4 py-2">
      {/* Time and Progress Bar */}
      <div className="flex items-center space-x-3">
        <span className="text-xs text-zinc-400 font-medium min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="relative flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer group"
        >
          {/* Buffered Progress */}
          <motion.div
            className="absolute h-full bg-zinc-600 rounded-full"
            style={{
              width: `${(buffered / duration) * 100}%`,
              transformOrigin: 'left'
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Playback Progress */}
          <motion.div
            className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
            style={{
              width: `${(currentTime / duration) * 100}%`,
              transformOrigin: 'left'
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: isPlaying ? 0.1 : 0.3,
              ease: 'linear'
            }}
          />

          {/* Hover Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.div
              className="w-4 h-4 bg-amber-500 rounded-full shadow-lg"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
        </div>

        <span className="text-xs text-zinc-400 font-medium min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume Control */}
      <div className="flex items-center mt-3 space-x-2">
        <button
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          className="p-1 text-zinc-400 hover:text-white transition-colors"
        >
          {volume === 0 ? <BsVolumeMute size={16} /> : <BsVolumeUp size={16} />}
        </button>

        <div
          ref={volumeBarRef}
          onClick={handleVolumeClick}
          className="relative w-24 h-1 bg-zinc-800 rounded-full cursor-pointer group"
        >
          <motion.div
            className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
            style={{
              width: `${volume * 100}%`,
              transformOrigin: 'left'
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.2 }}
          />

          {/* Hover Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.div
              className="w-3 h-3 bg-amber-500 rounded-full shadow-lg"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioProgressBar; 