"use client";

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import useCreateBucketUrl from '../hooks/useCreateBucketUrl';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';

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

    // Функция для получения содержимого m3u8 файла
    const fetchM3U8Content = async (url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch m3u8 content');
            const content = await response.text();
            return content;
        } catch (err) {
            console.error('Error fetching m3u8:', err);
            setError('Ошибка загрузки плейлиста');
            return null;
        }
    };

    // Функция для парсинга m3u8 и создания нового манифеста
    const createManifest = (content: string) => {
        const lines = content.split('\n');
        let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n';
        
        lines.forEach(line => {
            if (line.startsWith('#EXTINF:')) {
                manifest += line + '\n';
            } else if (line.trim() && !line.startsWith('#')) {
                // Для каждого ID сегмента формируем полный URL через useCreateBucketUrl
                const segmentUrl = useCreateBucketUrl(line.trim());
                manifest += segmentUrl + '\n';
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
                // Получаем содержимое m3u8 файла
                const content = await fetchM3U8Content(m3u8Url);
                if (!content) return;

                // Создаем новый манифест с полными URL сегментов
                const manifest = createManifest(content);
                
                // Создаем Blob из манифеста
                const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
                const manifestUrl = URL.createObjectURL(blob);

            if (Hls.isSupported()) {
                    if (hlsRef.current) {
                        hlsRef.current.destroy();
                    }

                    hls = new Hls({
                        debug: true,
                        enableWorker: true,
                        lowLatencyMode: true,
                    });
                    
                    hlsRef.current = hls;
                    hls.attachMedia(audio);
                    hls.loadSource(manifestUrl);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setError(null);
                        if (isPlaying) {
                            audio.play().catch(err => {
                                console.error("Ошибка воспроизведения:", err);
                                setError("Ошибка воспроизведения");
                            });
                        }
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS ошибка:', data);
                        if (data.fatal) {
                            setError("Ошибка воспроизведения");
                            hls.destroy();
                        }
                    });
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
                setError('Ошибка инициализации плеера');
            }
        };

        setupHls();
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
                console.error('AudioPlayer: Ошибка воспроизведения:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Добавляем небольшую задержку перед воспроизведением
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
            console.error('AudioPlayer: Ошибка:', e);
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
        <div className="flex items-center gap-4 w-full px-2 py-1">
            <button
                onClick={isPlaying ? onPause : onPlay}
                className="text-white hover:text-[#20DDBB] transition-colors"
            >
                {isPlaying ? (
                    <BsFillPauseFill size={24} />
                ) : (
                    <BsFillPlayFill size={24} />
                )}
            </button>

            <div className="flex-grow flex items-center gap-2">
                <div 
                    className="flex-grow h-1 bg-white rounded cursor-pointer relative"
                    onClick={handleProgressClick}
                >
                    <div 
                        className="absolute top-0 left-0 h-full bg-[#20DDBB] rounded"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
                <span className="text-white text-sm min-w-[40px]">
                    {formatTime(currentTime)}
                </span>
            </div>

            <audio 
                ref={audioRef} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
            >
            Ваш браузер не поддерживает элемент audio.
        </audio>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {isLoading && (
                <div className="flex justify-center mt-2">
                    <div className="w-6 h-6 border-2 border-[#20DDBB] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};
