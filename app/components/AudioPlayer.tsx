"use client";

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import useCreateBucketUrl from '../hooks/useCreateBucketUrl';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
    m3u8Url: string;
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ m3u8Url, isPlaying, onPlay, onPause }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Function to fetch m3u8 content
    const fetchM3U8Content = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch m3u8 content');
            const content = await response.text();
            return content;
        } catch (err) {
            console.error('Error fetching m3u8:', err);
            setError('Error loading playlist');
            return null;
        }
    };

    // Function to parse m3u8 and create new manifest
    const createManifest = (content: string) => {
        const lines = content.split('\n');
        let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n';
        
        lines.forEach(line => {
            if (line.startsWith('#EXTINF:')) {
                manifest += line + '\n';
            } else if (line.trim() && !line.startsWith('#')) {
                // Skip segments with unique() in URL
                if (!line.includes('unique()')) {
                    const segmentUrl = useCreateBucketUrl(line.trim());
                    manifest += segmentUrl + '\n';
                }
            }
        });
        
        manifest += '#EXT-X-ENDLIST';
        return manifest;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !m3u8Url) return;

        let hls: Hls;

        const setupHls = async () => {
            try {
                const content = await fetchM3U8Content(m3u8Url);
                if (!content) return;

                const manifest = createManifest(content);
                const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
                const manifestUrl = URL.createObjectURL(blob);

                if (Hls.isSupported()) {
                    if (hlsRef.current) {
                        hlsRef.current.destroy();
                    }

                    const hlsConfig = {
                        enableWorker: true,
                        maxBufferSize: 30 * 1000 * 1000,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 30,
                        fragLoadingTimeOut: 20000,
                        manifestLoadingTimeOut: 20000,
                        levelLoadingTimeOut: 20000,
                        startLevel: -1,
                        abrEwmaDefaultEstimate: 500000,
                        abrMaxWithRealBitrate: true,
                        maxStarvationDelay: 4,
                        maxLoadingDelay: 4,
                        startFragPrefetch: true,
                        progressive: true,
                        // Disable logging
                        debug: false,
                        xhrSetup: (xhr: XMLHttpRequest) => {
                            xhr.withCredentials = false;
                        }
                    };
                    
                    hls = new Hls(hlsConfig);
                    hlsRef.current = hls;

                    // Event handlers
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setError(null);
                        if (isPlaying) {
                            audio.play().catch(() => setError("Playback error"));
                        }
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            setError("Playback error");
                            hls.destroy();
                        }
                    });

                    hls.attachMedia(audio);
                    hls.loadSource(manifestUrl);

                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    audio.src = m3u8Url;
                }

                return () => {
                    if (hlsRef.current) {
                        hlsRef.current.destroy();
                        hlsRef.current = null;
                    }
                    URL.revokeObjectURL(manifestUrl);
                };
            } catch (err) {
                console.error('Error initializing HLS:', err);
                setError('Error initializing player');
            }
        };

        if (audioRef.current) {
            setupHls();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [m3u8Url]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = async () => {
            try {
                setIsLoading(true);
                if (isPlaying) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        await playPromise;
                    }
                } else {
                    audio.pause();
                }
            } catch (error) {
                console.error('AudioPlayer: Playback error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Small delay before playback
        const timeoutId = setTimeout(handlePlay, 100);

        return () => {
            clearTimeout(timeoutId);
            if (audio) {
                audio.pause();
            }
        };
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            onPause();
        };

        const handleError = (e: ErrorEvent) => {
            console.error('AudioPlayer: Error:', e);
            onPause();
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [onPause]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            audioRef.current.currentTime = percent * duration;
        }
    };

    return (
        <div className="flex items-center gap-4 w-full p-3">
            <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className="text-white hover:text-[#20DDBB] transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                {isPlaying ? (
                    <BsFillPauseFill size={28} className="text-[#20DDBB]" />
                ) : (
                    <BsFillPlayFill size={28} />
                )}
            </motion.button>

            <div className="flex-grow flex items-center gap-2">
                <div 
                    className="flex-grow h-1 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
                    onClick={handleProgressClick}
                >
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
                <div className="text-white/60 text-sm font-medium min-w-[45px] text-right">
                    {formatTime(currentTime)}
                </div>
            </div>

            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
            />
            
            {error && (
                <div className="text-red-500 text-sm bg-red-500/10 px-2 py-1 rounded">{error}</div>
            )}
            
            {isLoading && (
                <div className="flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#20DDBB] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};
