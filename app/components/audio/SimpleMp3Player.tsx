"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';
import { motion } from 'framer-motion';

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
    const [isActuallyPlaying, setIsActuallyPlaying] = useState(false); // Local state reflecting <audio> element
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true

    const formatTime = useCallback((time: number) => {
        if (isNaN(time) || !isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            onPauseGlobal(trackId); // Signal global pause
            setIsActuallyPlaying(false);
            setCurrentTime(0);
        };
        const handlePlay = () => setIsActuallyPlaying(true);
        const handlePause = () => setIsActuallyPlaying(false);
        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);
        const handleError = (e: Event) => {
            console.error("Audio Error:", (e.target as HTMLAudioElement).error);
            setIsLoading(false);
            onPauseGlobal(trackId); // Stop if error
        }

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('error', handleError);
        
        // Initial load attempt
        audio.load();


        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('error', handleError);
        };
    }, [audioUrl, trackId, onPauseGlobal]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlayingGlobal) {
            audio.play().catch(e => console.error("Error playing audio:", e));
        } else {
            audio.pause();
        }
    }, [isPlayingGlobal]);


    const togglePlayPause = () => {
        if (isPlayingGlobal) {
            onPauseGlobal(trackId);
        } else {
            onPlayGlobal(trackId);
        }
    };

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current && duration > 0 && !isLoading) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            const newTime = percent * duration;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [duration, isLoading]);

    return (
        <div className="flex items-center gap-3 w-full p-2 bg-black/10 rounded-lg">
            <motion.button
                onClick={togglePlayPause}
                className="text-white hover:text-[#20DDBB] transition-colors disabled:opacity-50"
                whileHover={{ scale: isLoading ? 1 : 1.1 }}
                whileTap={{ scale: isLoading ? 1 : 0.9 }}
                disabled={isLoading && !duration} // Disable if loading and no duration yet
            >
                {isLoading && !isActuallyPlaying ? (
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
            <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
        </div>
    );
};

export default SimpleMp3Player;