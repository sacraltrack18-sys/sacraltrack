import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerContext } from '@/app/context/playerContext';

interface UseStableAudioPlayerProps {
  postId: string;
  m3u8Url: string;
  onPlayStatusChange?: (isPlaying: boolean) => void;
}

export const useStableAudioPlayer = ({
  postId,
  m3u8Url,
  onPlayStatusChange,
}: UseStableAudioPlayerProps) => {
  const { 
    currentAudioId, 
    setCurrentAudioId, 
    isPlaying: globalIsPlaying, 
    togglePlayPause,
    stopAllPlayback 
  } = usePlayerContext();
  
  const m3u8UrlRef = useRef(m3u8Url);
  const isMounted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update URL ref when it changes
  useEffect(() => {
    if (m3u8Url && m3u8Url !== m3u8UrlRef.current) {
      m3u8UrlRef.current = m3u8Url;
      console.log(`useStableAudioPlayer: Updated m3u8Url for ${postId}: ${m3u8Url}`);
    }
  }, [m3u8Url, postId]);

  const isCurrentTrack = currentAudioId === postId;
  const isPlaying = isCurrentTrack && globalIsPlaying;

  // Handle play/pause state changes
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (onPlayStatusChange) {
      onPlayStatusChange(isPlaying);
    }
  }, [isPlaying, onPlayStatusChange]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Enhanced play handler with abort signal management
  const handlePlay = useCallback(() => {
    console.log(`useStableAudioPlayer: Play requested for ${postId}`);
    
    // Clean up any previous requests
    cleanup();
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Stop other tracks if a different track is playing
    if (currentAudioId && currentAudioId !== postId) {
      console.log(`useStableAudioPlayer: Stopping ${currentAudioId} to play ${postId}`);
      stopAllPlayback?.();
    }
    
    // Set this track as current
    console.log(`useStableAudioPlayer: Setting ${postId} as current track`);
    setCurrentAudioId(postId);
    
    // Start playing - ensure we toggle to play state
    if (!globalIsPlaying || currentAudioId !== postId) {
      console.log(`useStableAudioPlayer: Starting playback for ${postId}`);
      togglePlayPause();
    }
  }, [currentAudioId, postId, setCurrentAudioId, togglePlayPause, stopAllPlayback, globalIsPlaying, cleanup]);

  // Enhanced pause handler
  const handlePause = useCallback(() => {
    console.log(`useStableAudioPlayer: Pause requested for ${postId}`);
    
    // Clean up any pending requests
    cleanup();
    
    if (isCurrentTrack && globalIsPlaying) {
      console.log(`useStableAudioPlayer: Pausing ${postId}`);
      togglePlayPause();
    }
  }, [isCurrentTrack, globalIsPlaying, togglePlayPause, postId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCurrentTrack && globalIsPlaying) {
        console.log(`useStableAudioPlayer: Cleanup - stopping ${postId}`);
        stopAllPlayback?.();
      }
      cleanup();
    };
  }, [isCurrentTrack, globalIsPlaying, stopAllPlayback, postId, cleanup]);

  return {
    isPlaying,
    handlePlay,
    handlePause,
    m3u8Url: m3u8UrlRef.current,
  };
};
