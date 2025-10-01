"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  buffered: number;
}

export const useAudioPlayer = (audioUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    buffered: 0
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current = new Audio(audioUrl);
    audioRef.current.preload = 'metadata';

    const audio = audioRef.current;

    const updateTime = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        buffered: audio.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0
      }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration
      }));
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', updateTime);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', updateTime);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (state.isPlaying) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
      } else {
        if (audioRef.current.paused) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        }
      }

      setState(prev => ({
        ...prev,
        isPlaying: !prev.isPlaying
      }));
    } catch (error) {
      console.error('Error toggling audio playback:', error);
      setState(prev => ({
        ...prev,
        isPlaying: false
      }));
    }
  }, [state.isPlaying]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = time;
    setState(prev => ({
      ...prev,
      currentTime: time
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    
    const newVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = newVolume;
    setState(prev => ({
      ...prev,
      volume: newVolume
    }));
  }, []);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    togglePlay,
    seek,
    setVolume,
    formatTime
  };
};

export default useAudioPlayer; 