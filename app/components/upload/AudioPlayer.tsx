import React from 'react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
    fileAudio: File;
    trackname: string;
    isAudioPlaying: boolean;
    audioProgress: number;
    audioDuration: number;
    audioElement: HTMLAudioElement | null;
    handleAudioPlay: () => void;
    handleProgressBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    clearAudio: () => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    fileAudio,
    trackname,
    isAudioPlaying,
    audioProgress,
    audioDuration,
    audioElement,
    handleAudioPlay,
    handleProgressBarClick,
    clearAudio
}) => {
    // Format times for display
    const currentTime = audioElement ? formatTime(audioElement.currentTime) : '0:00';
    const duration = formatTime(audioDuration);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-white/5 shadow-lg"
        >
            {/* Visualizer bars */}
            <div className="w-full flex-grow bg-gradient-to-b from-[#2A184B] to-[#1f1239] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="flex items-end h-24 gap-[2px]">
                        {/* Generate audio wave visualization */}
                        {[...Array(60)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: '20%' }}
                                animate={{ 
                                    height: isAudioPlaying 
                                        ? `${Math.max(15, Math.random() * 100)}%` 
                                        : `${20 + (i % 3) * 10}%` 
                                }}
                                transition={{ 
                                    duration: isAudioPlaying ? 0.4 : 0, 
                                    repeat: isAudioPlaying ? Infinity : 0,
                                    repeatType: 'reverse'
                                }}
                                className="w-1 bg-white/40 rounded-full"
                                style={{ 
                                    animationDelay: `${i * 0.05}s`,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Shimmer effect */}
                {isAudioPlaying && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                )}

                {/* Play/Pause button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={handleAudioPlay}
                    className="z-10 w-16 h-16 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] flex items-center justify-center shadow-lg
                            transition-transform duration-300 hover:shadow-[#018CFD]/20 hover:shadow-xl"
                >
                    {isAudioPlaying ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </motion.button>
            </div>

            {/* Track info & controls */}
            <div className="p-4 bg-[#2A184B]/50">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white truncate pr-2">{trackname}</h3>
                        <p className="text-white/60 text-sm mt-1">{fileAudio.type}</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearAudio}
                        className="text-white/60 hover:text-white/90"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </motion.button>
                </div>

                {/* Progress bar */}
                <div 
                    className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer mb-2 relative"
                    onClick={handleProgressBarClick}
                >
                    <motion.div 
                        className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD]"
                        style={{ width: `${audioProgress}%` }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${audioProgress}%` }}
                        transition={{ duration: 0.1 }}
                    />
                </div>

                {/* Time indicators */}
                <div className="flex justify-between text-xs text-white/60">
                    <span>{currentTime}</span>
                    <span>{duration}</span>
                </div>
            </div>
        </motion.div>
    );
};

export default AudioPlayer; 