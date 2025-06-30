"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { motion } from "framer-motion";

interface SimpleMp3PlayerProps {
  audioUrl: string;
  trackId: string; // Unique ID for the track
  isPlayingGlobal: boolean; // Is this specific track supposed to be playing globally?
  onPlayGlobal: (trackId: string) => void; // Callback to set this track as globally playing
  onPauseGlobal: (trackId: string) => void; // Callback to set this track as globally paused
}

const SimpleMp3Player: React.FC<SimpleMp3PlayerProps> = ({
  audioUrl,
  trackId,
  isPlayingGlobal,
  onPlayGlobal,
  onPauseGlobal,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isPlayingRequestRef = useRef(false);
  const mountedRef = useRef(true);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false); // Local state reflecting <audio> element
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [hasError, setHasError] = useState(false);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (!mountedRef.current) return;
      setDuration(audio.duration);
      setIsLoading(false);
      setHasError(false);
    };
    const handleTimeUpdate = () => {
      if (!mountedRef.current) return;
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      if (!mountedRef.current) return;
      onPauseGlobal(trackId); // Signal global pause
      setIsActuallyPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => {
      if (!mountedRef.current) return;
      setIsActuallyPlaying(true);
    };
    const handlePause = () => {
      if (!mountedRef.current) return;
      setIsActuallyPlaying(false);
    };
    const handleWaiting = () => {
      if (!mountedRef.current) return;
      setIsLoading(true);
    };
    const handlePlaying = () => {
      if (!mountedRef.current) return;
      setIsLoading(false);
    };
    const handleError = (e: Event) => {
      if (!mountedRef.current) return;
      console.error("Audio Error:", (e.target as HTMLAudioElement).error);
      setIsLoading(false);
      setHasError(true);
      onPauseGlobal(trackId); // Stop if error
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError);

    // Initial load attempt
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl, trackId, onPauseGlobal]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !mountedRef.current) return;

    const handlePlayback = async () => {
      if (isPlayingGlobal) {
        // Prevent multiple concurrent play attempts
        if (isPlayingRequestRef.current) return;
        isPlayingRequestRef.current = true;

        try {
          // Wait for any existing play promise
          if (playPromiseRef.current) {
            try {
              await playPromiseRef.current;
            } catch (e) {
              // Ignore AbortError
              if (e instanceof Error && e.name !== "AbortError") {
                console.warn(
                  "[SimpleMp3Player] Previous play promise error:",
                  e,
                );
              }
            }
          }

          playPromiseRef.current = audio.play();
          await playPromiseRef.current;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.log("[SimpleMp3Player] Play aborted (normal behavior)");
          } else {
            console.error("Error playing audio:", error);
            if (mountedRef.current) {
              onPauseGlobal(trackId);
            }
          }
        } finally {
          isPlayingRequestRef.current = false;
          playPromiseRef.current = null;
        }
      } else {
        // Clear any pending play attempts
        isPlayingRequestRef.current = false;
        playPromiseRef.current = null;

        try {
          audio.pause();
        } catch (error) {
          console.warn("[SimpleMp3Player] Error pausing:", error);
        }
      }
    };

    handlePlayback();
  }, [isPlayingGlobal, trackId, onPauseGlobal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      isPlayingRequestRef.current = false;
      playPromiseRef.current = null;
    };
  }, []);

  const togglePlayPause = () => {
    if (hasError) {
      // Retry on error
      setHasError(false);
      setIsLoading(true);
      if (audioRef.current) {
        audioRef.current.load();
      }
      return;
    }

    if (isPlayingGlobal) {
      onPauseGlobal(trackId);
    } else {
      onPlayGlobal(trackId);
    }
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (audioRef.current && duration > 0 && !isLoading && !hasError) {
        try {
          const bounds = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - bounds.left) / bounds.width;
          const newTime = percent * duration;
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        } catch (error) {
          console.warn("[SimpleMp3Player] Seek failed:", error);
        }
      }
    },
    [duration, isLoading, hasError],
  );

  return (
    <div className="flex items-center gap-3 w-full p-2 bg-black/10 rounded-lg">
      <motion.button
        onClick={togglePlayPause}
        className={`text-white hover:text-[#20DDBB] transition-colors disabled:opacity-50 ${
          hasError ? "text-red-400 hover:text-red-300" : ""
        }`}
        whileHover={{ scale: isLoading ? 1 : 1.1 }}
        whileTap={{ scale: isLoading ? 1 : 0.9 }}
        disabled={isLoading && !duration && !hasError}
        title={hasError ? "Click to retry" : undefined}
      >
        {hasError ? (
          <div className="w-6 h-6 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : isLoading && !isActuallyPlaying ? (
          <div className="w-6 h-6 rounded-full border-2 border-[#20DDBB] border-t-transparent animate-spin" />
        ) : isActuallyPlaying ? (
          <BsFillPauseFill size={24} className="text-[#20DDBB]" />
        ) : (
          <BsFillPlayFill size={24} />
        )}
      </motion.button>

      <div className="flex-grow flex items-center gap-2">
        <div
          className="flex-grow h-1.5 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
        <div className="text-white/70 text-xs font-medium min-w-[40px] text-right">
          {formatTime(currentTime)}
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
};

export default SimpleMp3Player;
