"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// Define the type for the time update function
interface TimeUpdateFunction {
    (): void;
    lastUpdate?: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ m3u8Url, isPlaying, onPlay, onPause }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const retryCountRef = useRef<number>(0);
    const maxRetries = 3;
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const manifestBlobRef = useRef<string | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Обновление времени воспроизведения с троттлингом для производительности
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current) return;
        
        const now = Date.now();
        if (now - lastUpdateRef.current > 250) {
            const time = audioRef.current.currentTime;
            setCurrentTime(time);
            lastUpdateRef.current = now;
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setIsLoading(false);
        }
    }, []);

    // Оптимизированная функция создания URL для сегментов
    const createSegmentUrl = useCallback((segment: string) => {
        if (!segment.trim()) return '';
        return useCreateBucketUrl(segment.trim());
    }, []);

    // Функция для определения нужных нам метаданных из манифеста
    const extractMetadataFromManifest = useCallback((content: string) => {
        const lines = content.split('\n');
        const targetDuration = lines.find(line => line.startsWith('#EXT-X-TARGETDURATION'))
            ?.replace('#EXT-X-TARGETDURATION:', '') || '10';
        
        const allowCache = lines.find(line => line.startsWith('#EXT-X-ALLOW-CACHE'))
            ?.replace('#EXT-X-ALLOW-CACHE:', '') || 'YES';
            
        return { 
            targetDuration: parseInt(targetDuration), 
            allowCache: allowCache === 'YES'
        };
    }, []);

    // Оптимизированная функция для получения M3U8 контента с повторными попытками
    const fetchM3U8Content = useCallback(async (url: string) => {
        // Check if we have the content cached in sessionStorage
        const cacheKey = `m3u8_cache_${url}`;
        try {
            const cachedContent = sessionStorage.getItem(cacheKey);
            if (cachedContent) {
                console.log('Using cached M3U8 content');
                retryCountRef.current = 0;
                return cachedContent;
            }
        } catch (cacheError) {
            // Ignore cache errors and proceed with fetch
        }
        
        // If no cache, fetch the content
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Create a new abort controller for each attempt but link it to our main ref
                const abortController = new AbortController();
                
                // Set a timeout to avoid hanging requests
                const timeoutId = setTimeout(() => {
                    try {
                        abortController.abort();
                    } catch (e) {
                        console.warn('Error aborting fetch:', e);
                    }
                }, 10000);
                
                const response = await fetch(url, { 
                    headers: { 'Cache-Control': 'no-cache' },
                    cache: 'no-store',
                    signal: abortController.signal
                });
                
                // Clear the timeout as request completed
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const content = await response.text();
                
                // Validate the content is proper M3U8 format
                if (content.trim().startsWith('#EXTM3U')) {
                    retryCountRef.current = 0; // Reset retry counter on success
                    
                    // Cache the valid content
                    try {
                        sessionStorage.setItem(cacheKey, content);
                    } catch (storageError) {
                        // Ignore storage errors
                    }
                    
                    return content;
                } else {
                    throw new Error('Invalid M3U8 format');
                }
            } catch (err) {
                // Don't retry on AbortError as it was intentional
                if (err instanceof DOMException && err.name === 'AbortError') {
                    console.warn('M3U8 fetch aborted - cleanup in progress');
                    return null;
                }
                
                if (attempt === maxRetries - 1) {
                    setError('Could not load audio. Please try again.');
                    return null;
                }
                
                // Use a shorter and fixed retry delay
                const retryDelay = 1000; // 1 second between retries
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        return null;
    }, [maxRetries]);

    // Оптимизированная функция создания манифеста с учетом структуры вашего плейлиста
    const createManifest = useCallback((content: string) => {
        const lines = content.split('\n');
        const metadata = extractMetadataFromManifest(content);
        
        // Определяем заголовки манифеста
        let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n';
        manifest += `#EXT-X-TARGETDURATION:${metadata.targetDuration}\n`;
        manifest += '#EXT-X-MEDIA-SEQUENCE:0\n';
        manifest += `#EXT-X-ALLOW-CACHE:${metadata.allowCache ? 'YES' : 'NO'}\n`;
        
        // Обработка сегментов
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('#EXTINF')) {
                manifest += line + '\n';
                
                // Следующая строка должна содержать идентификатор сегмента
                if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
                    const segmentId = lines[i + 1].trim();
                    const segmentUrl = createSegmentUrl(segmentId);
                    manifest += segmentUrl + '\n';
                    i++; // Пропускаем строку с идентификатором, т.к. мы её уже обработали
                }
            } else if (!line.startsWith('#') && line.trim()) {
                // Это одиночный идентификатор сегмента без EXTINF
                const segmentUrl = createSegmentUrl(line);
                manifest += segmentUrl + '\n';
            } else if (line.startsWith('#')) {
                // Любые другие директивы сохраняем как есть
                manifest += line + '\n';
            }
        }
        
        // Добавляем завершение плейлиста, если его нет
        if (!content.includes('#EXT-X-ENDLIST')) {
            manifest += '#EXT-X-ENDLIST\n';
        }
        
        return manifest;
    }, [createSegmentUrl, extractMetadataFromManifest]);

    // Обработка загрузки и прогресса буферизации
    const handleBufferProgress = useCallback((event: typeof Hls.Events.BUFFER_APPENDING, data: any) => {
        if (data && typeof data.data === 'object' && data.data.byteLength) {
            // Обновляем прогресс загрузки на основе данных буфера
            setLoadProgress(prev => Math.min(prev + 0.05, 0.95)); // Постепенное увеличение
        }
    }, []);

    // Detect iOS devices
    const isIOS = useCallback(() => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }, []);

    // Special setup for iOS devices
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        // iOS Safari requires these settings to work properly
        if (isIOS()) {
            // Set these properties for better iOS compatibility
            audio.preload = 'metadata';
            audio.autoplay = false;
            
            // iOS Safari requires these event listeners to enable audio playback
            const unlockAudio = () => {
                if (audio.paused) {
                    // Play and immediately pause to unlock
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            audio.pause();
                            // Reset the time to ensure clean playback
                            audio.currentTime = 0;
                        }).catch(err => {
                            console.warn('Audio unlock failed:', err);
                        });
                    }
                }
            };
            
            // These events can unlock audio on iOS
            const events = ['touchstart', 'touchend', 'click'];
            events.forEach(event => document.body.addEventListener(event, unlockAudio, { once: true }));
            
            return () => {
                events.forEach(event => document.body.removeEventListener(event, unlockAudio));
            };
        }
    }, [isIOS]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !m3u8Url) return;

        let hls: Hls;
        let isMounted = true;
        const abortControllerRef = new AbortController();

        const setupHls = async () => {
            try {
                setIsLoading(true);
                setLoadProgress(0.1); // Начальный прогресс
                
                // Пытаемся использовать кэшированный манифест, если URL не изменился
                let manifestUrl: string;
                
                if (manifestBlobRef.current) {
                    // Освобождаем предыдущий Blob URL
                    URL.revokeObjectURL(manifestBlobRef.current);
                    manifestBlobRef.current = null;
                }
                
                // Use the abort controller for this fetch
                const content = await fetchM3U8Content(m3u8Url);
                if (!content || !isMounted) return;
                
                setLoadProgress(0.3); // Обновляем прогресс после получения манифеста
                
                const manifest = createManifest(content);
                const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
                manifestUrl = URL.createObjectURL(blob);
                manifestBlobRef.current = manifestUrl;
                
                setLoadProgress(0.5); // Обновляем прогресс после создания манифеста

                if (Hls.isSupported()) {
                    if (hlsRef.current) {
                        try {
                            hlsRef.current.stopLoad();
                            hlsRef.current.detachMedia();
                            hlsRef.current.destroy();
                            hlsRef.current = null;
                        } catch (err) {
                            console.warn('Error cleaning up previous HLS instance:', err);
                        }
                    }

                    // Оптимизированная конфигурация HLS для аудио
                    const hlsConfig = {
                        enableWorker: true,
                        lowLatencyMode: false, // Отключаем режим низкой задержки для аудио
                        maxBufferSize: 5 * 1000 * 1000, // Уменьшаем размер буфера для аудио (5MB)
                        maxBufferLength: 20, // Уменьшаем длину буфера
                        liveSyncDurationCount: 3, // Оптимальное значение для аудио
                        maxMaxBufferLength: 30,
                        fragLoadingTimeOut: 15000, // Уменьшаем таймаут для аудио-фрагментов
                        manifestLoadingTimeOut: 10000,
                        levelLoadingTimeOut: 10000,
                        startLevel: -1, // Автоматический выбор качества
                        // Add these settings to improve stability, especially on mobile
                        abrEwmaDefaultEstimate: 500000, // Default bandwidth estimate (500kbps)
                        testBandwidth: false, // Disable bandwidth testing to prevent instability
                        fragLoadingMaxRetry: 4, // More retries for fragment loading
                        manifestLoadingMaxRetry: 4, // More retries for manifest loading
                        levelLoadingMaxRetry: 4 // More retries for level loading
                    };

                    try {
                        hls = new Hls(hlsConfig);
                        hlsRef.current = hls;

                        hls.on(Hls.Events.BUFFER_APPENDING, handleBufferProgress);
                        
                        // Add more error recovery handlers
                        hls.on(Hls.Events.ERROR, function(event, data) {
                            if (data.fatal) {
                                switch(data.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        console.warn('HLS network error detected, trying to recover...');
                                        // Handle network errors with a delay to prevent rapid retries
                                        setTimeout(() => {
                                            if (isMounted && hls) {
                                                hls.startLoad();
                                            }
                                        }, 1000);
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        console.warn('HLS media error detected, trying to recover...');
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        // Cannot recover, so try to destroy and recreate
                                        console.error('Fatal HLS error:', data);
                                        if (isMounted) {
                                            try {
                                                hls.destroy();
                                                hlsRef.current = null;
                                                // Only attempt recreation if still mounted
                                                setTimeout(() => {
                                                    if (isMounted) {
                                                        setupHls();
                                                    }
                                                }, 1000);
                                            } catch (err) {
                                                console.error('Error during HLS recovery:', err);
                                                setError('Playback error. Please try again.');
                                            }
                                        }
                                        break;
                                }
                            } else {
                                // Non-fatal error, just log it
                                console.warn('Non-fatal HLS error:', data);
                            }
                        });

                        hls.loadSource(manifestUrl);
                        hls.attachMedia(audio);
                        setLoadProgress(0.8);
                        
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            setLoadProgress(1.0);
                            if (isPlaying && isMounted) {
                                try {
                                    const playPromise = audio.play();
                                    if (playPromise !== undefined) {
                                        playPromise.catch(error => {
                                            // Handle autoplay restrictions
                                            if (error.name === 'NotAllowedError') {
                                                console.warn('Autoplay prevented by browser policy');
                                            } else {
                                                console.error('Error playing audio:', error);
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.error('Error during play attempt:', e);
                                }
                            }
                        });
                    } catch (hlsError) {
                        console.error('Error setting up HLS:', hlsError);
                        setError('Failed to initialize audio player.');
                        setIsLoading(false);
                    }
                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    // For Safari and iOS devices that support HLS natively
                    audio.src = manifestUrl;
                    audio.addEventListener('loadedmetadata', () => {
                        setLoadProgress(1.0);
                        if (isPlaying && isMounted) {
                            try {
                                const playPromise = audio.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(error => {
                                        console.error('Error playing audio:', error);
                                    });
                                }
                            } catch (e) {
                                console.error('Error during play attempt:', e);
                            }
                        }
                    });
                } else {
                    setError('Your browser does not support HLS playback.');
                    setIsLoading(false);
                }
            } catch (err) {
                // Check if the error is an AbortError (which we can safely ignore)
                if (err instanceof DOMException && err.name === 'AbortError') {
                    console.warn('Audio setup aborted - this is normal during cleanup');
                } else {
                    console.error('Error in setupHLS:', err);
                    setError('Could not initialize audio player.');
                    setIsLoading(false);
                }
            }
        };

        setupHls();

        return () => {
            isMounted = false;
            
            // Abort any in-flight fetches
            abortControllerRef.abort();
            
            // Clean up HLS instance
            if (hlsRef.current) {
                try {
                    // First stop loading to prevent media errors
                    hlsRef.current.stopLoad();
                    // Then detach media
                    hlsRef.current.detachMedia();
                    // Finally destroy the instance
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                } catch (err) {
                    console.warn('Error cleaning up HLS instance:', err);
                }
            }
            
            // Clean up audio element
            if (audio) {
                try {
                    audio.pause();
                    audio.src = '';
                    audio.load(); // This forces the audio element to reset
                } catch (err) {
                    console.warn('Error cleaning up audio element:', err);
                }
            }
            
            // Clean up blob URL
            if (manifestBlobRef.current) {
                try {
                    URL.revokeObjectURL(manifestBlobRef.current);
                    manifestBlobRef.current = null;
                } catch (err) {
                    console.warn('Error revoking object URL:', err);
                }
            }
        };
    }, [m3u8Url, createManifest, fetchM3U8Content, handleBufferProgress, isPlaying]);

    // Эффект для обработки изменений состояния проигрывания (play/pause)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            // Only try to play if the audio is actually paused
            if (audio.paused) {
                try {
                    // Use a safe play approach with promise handling
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('Error playing audio:', error);
                            // If play fails, ensure the UI state is updated
                            if (error.name !== 'AbortError') {
                                onPause();
                            }
                        });
                    }
                } catch (error) {
                    console.error('Exception during play:', error);
                    onPause();
                }
            }
        } else {
            // When pausing, first be sure to cancel any pending play promises
            try {
                // Pause only if it's actually playing to avoid unnecessary events
                if (!audio.paused) {
                    audio.pause();
                }
            } catch (error) {
                console.warn('Error pausing audio:', error);
            }
        }
    }, [isPlaying, onPause]);

    // Обработка событий аудио с улучшенной логикой
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            onPause();
        };

        const handleError = (e: Event) => {
            console.error('AudioPlayer: Error:', e);
            setError('Audio playback error');
            onPause();
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handlePlaying = () => {
            setIsLoading(false);
            setError(null);
        };

        // Добавление всех обработчиков событий
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            // Удаление всех обработчиков при размонтировании
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [onPause, handleTimeUpdate, handleLoadedMetadata, setError, setIsLoading]);

    // Форматирование времени с улучшенной точностью
    const formatTime = useCallback((time: number) => {
        if (isNaN(time) || !isFinite(time)) return '0:00';
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Улучшенный обработчик клика по прогресс-бару с учетом буферизации
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current && !isLoading && duration > 0) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            const newTime = percent * duration;
            
            // Проверяем, буферизован ли запрашиваемый сегмент
            if (audioRef.current.buffered.length > 0) {
                let isBuffered = false;
                
                for (let i = 0; i < audioRef.current.buffered.length; i++) {
                    const start = audioRef.current.buffered.start(i);
                    const end = audioRef.current.buffered.end(i);
                    
                    if (newTime >= start && newTime <= end) {
                        isBuffered = true;
                        break;
                    }
                }
                
                if (isBuffered) {
                    audioRef.current.currentTime = newTime;
                } else {
                    // Если сегмент не буферизован, показываем индикатор загрузки
                    setIsLoading(true);
                    // Устанавливаем время с небольшой задержкой
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = newTime;
                        }
                    }, 100);
                }
            } else {
                // Если информация о буфере недоступна, просто устанавливаем время
                audioRef.current.currentTime = newTime;
            }
        }
    }, [duration, isLoading]);

    // Улучшенный интерфейс с индикатором буферизации и элементами прогрессбара
    return (
        <div className="flex items-center gap-4 w-full p-3">
            <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className="text-white hover:text-[#20DDBB] transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading && loadProgress < 0.5}
            >
                {isLoading ? (
                    <div className="w-7 h-7 rounded-full border-2 border-[#20DDBB] border-t-transparent animate-spin" />
                ) : isPlaying ? (
                    <BsFillPauseFill size={28} className="text-[#20DDBB]" />
                ) : (
                    <BsFillPlayFill size={28} />
                )}
            </motion.button>

            <div className="flex-grow flex items-center gap-2">
                <div 
                    className="flex-grow h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
                    onClick={handleProgressClick}
                >
                    {/* Индикатор буферизации */}
                    <div 
                        className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-300"
                        style={{ 
                            width: `${isLoading ? loadProgress * 100 : 100}%`,
                            opacity: isLoading ? 1 : 0
                        }}
                    />
                    
                    {/* Индикатор прогресса воспроизведения */}
                    <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full transition-all duration-100"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                    
                    {/* Маркер позиции - исправлен синтаксис для top-50% */}
                    <div 
                        className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-lg transform -translate-y-1/2 pointer-events-none"
                        style={{ 
                            left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)`, 
                            opacity: isPlaying ? 1 : 0.7,
                            transition: 'left 0.1s linear, opacity 0.3s ease'
                        }}
                    />
                </div>
                <div className="text-white/80 text-sm font-medium min-w-[45px] text-right">
                    {formatTime(currentTime)}{duration ? ` / ${formatTime(duration)}` : ''}
                </div>
            </div>

            <audio
                ref={audioRef}
                className="hidden"
                preload="auto"
                crossOrigin="anonymous"
            />
            
            {error && (
                <div className="text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded flex items-center">
                    <span className="mr-1">⚠️</span>
                    {error}
                </div>
            )}
        </div>
    );
};
