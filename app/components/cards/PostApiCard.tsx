"use client";

import React from 'react';
import Image from 'next/image'; // Using Next.js Image for optimization
import SimpleMp3Player from '@/app/components/audio/SimpleMp3Player';
import { FaGlobeAmericas, FaExternalLinkAlt } from 'react-icons/fa';
import { HiMusicNote } from 'react-icons/hi';
import { motion } from 'framer-motion';

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
    type: 'api_track';
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


const PostApiCard: React.FC<PostApiCardProps> = ({ track, isPlaying, onPlay, onPause }) => {
    const [imageError, setImageError] = React.useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto shadow-lg shadow-black/20 relative"
            itemScope
            itemType="https://schema.org/MusicRecording" // Schema.org for SEO
        >
            {/* SEO Metadata (simplified for API tracks) */}
            <meta itemProp="name" content={track.title} />
            <meta itemProp="byArtist" content={track.artistName} />
            {track.albumName && <meta itemProp="inAlbum" content={track.albumName} />}
            <meta itemProp="duration" content={`PT${track.duration || 0}S`} /> {/* ISO 8601 duration */}
            {track.imageUrl && <meta itemProp="image" content={track.imageUrl} />}
            <meta itemProp="audio" content={track.audioUrl} />
            <meta itemProp="provider" content={track.source} />


            {/* Header Section - Simplified from PostMain */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Icon for the source instead of user avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#20DDBB]/10 flex items-center justify-center text-[#20DDBB] flex-shrink-0">
                        <FaGlobeAmericas size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold hover:text-[#20DDBB] transition-colors line-clamp-1 text-base" title={track.title}>
                            {track.title || 'Unknown Title'}
                        </h3>
                        <p className="text-[#818BAC] text-sm truncate max-w-[200px] md:max-w-full" title={track.artistName}>
                            {track.artistName || 'Unknown Artist'}
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                    <span className="text-[#20DDBB] text-[10px] px-2.5 py-1 bg-[#20DDBB]/10 rounded-full uppercase font-medium tracking-wider whitespace-nowrap max-w-[110px] truncate block" title={track.source}>
                        {track.source}
                    </span>
                </div>
            </div>

            {/* Image Section - Adapted from PostMain */}
            <div className="relative group aspect-square">
                {imageError || !track.imageUrl ? (
                    <ImageFallback />
                ) : (
                    <Image
                        src={track.imageUrl}
                        alt={`Artwork for ${track.title} by ${track.artistName}`}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImageError(true)}
                        priority={false} // Can be false for non-LCP images
                    />
                )}
                 {/* World Content Label */}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md z-10 border border-white/10">
                    <FaGlobeAmericas className="text-[#20DDBB]" />
                    <span>World Content</span>
                </div>
            </div>
            
            {/* Audio Player Section */}
            <div className="px-4 py-3 border-t border-white/5">
                <SimpleMp3Player
                    audioUrl={track.audioUrl}
                    trackId={track.id}
                    isPlayingGlobal={isPlaying}
                    onPlayGlobal={onPlay}
                    onPauseGlobal={onPause}
                />
            </div>

            {/* Footer for License (if available) */}
            {track.licenseUrl && (
                <div className="px-4 py-2 text-center border-t border-white/10">
                    <a
                        href={track.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-[#20DDBB] transition-colors inline-flex items-center gap-1"
                    >
                        View License <FaExternalLinkAlt size={10} />
                    </a>
                </div>
            )}
        </motion.div>
    );
};

export default PostApiCard;