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
    preload?: boolean;
}

// Define the type for the time update function
interface TimeUpdateFunction {
    (): void;
    lastUpdate?: number;
}

// Кеш для предзагруженных манифестов и сегментов
const preloadCache = new Map<string, { 
    manifestUrl: string, 
    loaded: boolean, 
    hlsInstance?: Hls 
}>();

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
    m3u8Url, 
    isPlaying, 
    onPlay, 
    onPause,
    preload = true // По умолчанию включаем предзагрузку
}) => {
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
    const isVisibleRef = useRef<boolean>(false);

    // Флаг, указывающий, была ли выполнена предзагрузка для текущего URL
    const [isPreloaded, setIsPreloaded] = useState(false);

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
        
        // Add a loading state flag to prevent multiple play attempts during setup
        let isCurrentlyLoading = false;

        const setupHls = async () => {
            try {
                if (isCurrentlyLoading) return;
                isCurrentlyLoading = true;
                
                setIsLoading(true);
                setLoadProgress(0.1); // Начальный прогресс
                
                // Проверяем, есть ли предзагруженный контент для данного URL
                const preloadedContent = preloadCache.get(m3u8Url);
                
                // Пытаемся использовать кэшированный манифест, если URL не изменился
                let manifestUrl: string;
                let skipManifestLoading = false;
                
                if (manifestBlobRef.current) {
                    // Освобождаем предыдущий Blob URL
                    URL.revokeObjectURL(manifestBlobRef.current);
                    manifestBlobRef.current = null;
                }
                
                // Если есть предзагруженный контент - используем его
                if (preloadedContent && preloadedContent.loaded) {
                    console.log('✅ Используем предзагруженный контент');
                    manifestUrl = preloadedContent.manifestUrl;
                    manifestBlobRef.current = manifestUrl;
                    skipManifestLoading = true;
                    setLoadProgress(0.7); // Уже большая часть загружена
                }
                // Иначе загружаем заново
                else {
                    // Use the abort controller for this fetch
                    const content = await fetchM3U8Content(m3u8Url);
                    if (!content || !isMounted) {
                        isCurrentlyLoading = false;
                        return;
                    }
                    
                    setLoadProgress(0.3); // Обновляем прогресс после получения манифеста
                    
                    const manifest = createManifest(content);
                    const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
                    manifestUrl = URL.createObjectURL(blob);
                    manifestBlobRef.current = manifestUrl;
                }
                
                setLoadProgress(skipManifestLoading ? 0.8 : 0.5);

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
                    
                    // Используем предзагруженный HLS инстанс, если он есть и готов
                    if (preloadedContent && preloadedContent.loaded && preloadedContent.hlsInstance) {
                        try {
                            const preloadedHls = preloadedContent.hlsInstance;
                            
                            // Отсоединяем от временного аудио элемента
                            preloadedHls.detachMedia();
                            
                            // Присоединяем к нашему аудио элементу
                            preloadedHls.attachMedia(audio);
                            
                            hls = preloadedHls;
                            hlsRef.current = hls;
                            
                            // Мгновенно отмечаем как загруженный
                            setLoadProgress(1.0);
                            isCurrentlyLoading = false;
                            
                            // Мгновенно начинаем воспроизведение если нужно
                            if (isPlaying && isMounted) {
                                try {
                                    if (audio.paused) {
                                        const playPromise = audio.play();
                                        if (playPromise !== undefined) {
                                            playPromise.catch(error => {
                                                if (error.name === 'NotAllowedError') {
                                                    console.warn('Autoplay prevented by browser policy');
                                                } else {
                                                    console.error('Error playing audio:', error);
                                                }
                                            });
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error during play attempt:', e);
                                }
                            }
                            
                            // Удаляем из кеша предзагрузки, так как теперь он используется активно
                            preloadCache.delete(m3u8Url);
                            
                            // Добавляем слушатели событий
                            setupHlsEventListeners(hls);
                            
                            return; // Пропускаем дальнейшую инициализацию
                        } catch (error) {
                            console.warn('Не удалось использовать предзагруженный HLS, создаем новый:', error);
                            // Продолжаем обычную инициализацию
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
                        
                        // Добавляем слушатели событий
                        setupHlsEventListeners(hls);

                        hls.loadSource(manifestUrl);
                        hls.attachMedia(audio);
                        setLoadProgress(0.8);
                        
                        // Add a flag to track if manifest is parsed
                        let manifestParsed = false;
                        
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            manifestParsed = true;
                            setLoadProgress(1.0);
                            isCurrentlyLoading = false;
                            
                            // Если трек был предзагружен, мы можем начать воспроизведение мгновенно
                            // без дополнительной задержки
                            const playDelay = skipManifestLoading ? 0 : 300;
                            
                            // Add a small delay before attempting to play if not using preloaded content
                            // This helps avoid the "play() request was interrupted" error
                            if (isPlaying && isMounted) {
                                if (playDelay > 0) {
                                    setTimeout(() => {
                                        if (!isMounted) return;
                                        
                                        try {
                                            if (audio.paused) {
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
                                            }
                                        } catch (e) {
                                            console.error('Error during play attempt:', e);
                                        }
                                    }, playDelay);
                                } else {
                                    // Мгновенное воспроизведение для предзагруженного контента
                                    try {
                                        if (audio.paused) {
                                            const playPromise = audio.play();
                                            if (playPromise !== undefined) {
                                                playPromise.catch(error => {
                                                    if (error.name === 'NotAllowedError') {
                                                        console.warn('Autoplay prevented by browser policy');
                                                    } else {
                                                        console.error('Error playing audio:', error);
                                                    }
                                                });
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error during play attempt:', e);
                                    }
                                }
                            }
                        });
                        
                        // Add a timeout to ensure we don't wait forever for manifest parsing
                        setTimeout(() => {
                            if (!manifestParsed && isMounted) {
                                isCurrentlyLoading = false;
                                setLoadProgress(1.0);
                                console.warn('Manifest parsing timeout - continuing anyway');
                            }
                        }, 5000);
                    } catch (hlsError) {
                        console.error('Error setting up HLS:', hlsError);
                        setError('Failed to initialize audio player.');
                        setIsLoading(false);
                        isCurrentlyLoading = false;
                    }
                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    // For Safari and iOS devices that support HLS natively
                    audio.src = manifestUrl;
                    audio.addEventListener('loadedmetadata', () => {
                        setLoadProgress(1.0);
                        isCurrentlyLoading = false;
                        
                        // Если трек был предзагружен, мы можем начать воспроизведение мгновенно
                        const playDelay = skipManifestLoading ? 0 : 300;
                        
                        if (isPlaying && isMounted) {
                            // Add a small delay before attempting to play
                            if (playDelay > 0) {
                                setTimeout(() => {
                                    if (!isMounted) return;
                                    
                                    try {
                                        if (audio.paused) {
                                            const playPromise = audio.play();
                                            if (playPromise !== undefined) {
                                                playPromise.catch(error => {
                                                    console.error('Error playing audio:', error);
                                                });
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error during play attempt:', e);
                                    }
                                }, playDelay);
                            } else {
                                // Мгновенное воспроизведение для предзагруженного контента
                                try {
                                    if (audio.paused) {
                                        const playPromise = audio.play();
                                        if (playPromise !== undefined) {
                                            playPromise.catch(error => {
                                                console.error('Error playing audio:', error);
                                            });
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error during play attempt:', e);
                                }
                            }
                        }
                    });
                } else {
                    setError('Your browser does not support HLS playback.');
                    setIsLoading(false);
                    isCurrentlyLoading = false;
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
                
                isCurrentlyLoading = false;
            }
        };
        
        // Функция для настройки слушателей событий HLS
        const setupHlsEventListeners = (hls: Hls) => {
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
        
        // Add a debounce to prevent rapid play/pause calls
        const playPauseDebounce = setTimeout(() => {
            if (isPlaying) {
                // Only try to play if the audio is actually paused
                if (audio.paused) {
                    try {
                        // Add an additional check for readiness
                        if (audio.readyState >= 2) {
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
                        } else {
                            // If not ready yet, wait a bit more
                            console.log('Audio not ready yet, waiting...');
                            // Set a visual indication that we're still loading
                            setIsLoading(true);
                            
                            // Set up a one-time event listener for when it becomes ready
                            const onCanPlay = () => {
                                if (isPlaying) {
                                    const playPromise = audio.play();
                                    if (playPromise !== undefined) {
                                        playPromise.catch(error => {
                                            console.error('Error playing audio after canplay:', error);
                                            if (error.name !== 'AbortError') {
                                                onPause();
                                            }
                                        });
                                    }
                                }
                                setIsLoading(false);
                                audio.removeEventListener('canplay', onCanPlay);
                            };
                            
                            audio.addEventListener('canplay', onCanPlay, { once: true });
                        }
                    } catch (error) {
                        console.error('Exception during play:', error);
                        onPause();
                    }
                }
            } else {
                // When pausing, ensure any pending play operations are complete
                try {
                    // Pause only if it's actually playing to avoid unnecessary events
                    if (!audio.paused) {
                        audio.pause();
                    }
                } catch (error) {
                    console.warn('Error pausing audio:', error);
                }
            }
        }, 100); // 100ms debounce 
        
        return () => {
            clearTimeout(playPauseDebounce);
        };
    }, [isPlaying, onPause]);

    // Обработка событий аудио с улучшенной логикой
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            onPause();
        };

        const handleError = (e: Event) => {
            // Check if it's an AbortError, which can be ignored
            const error = e as ErrorEvent;
            if (error && error.message && error.message.includes('AbortError')) {
                console.log('Audio play interrupted by new load request (normal behavior)');
                return; // Don't show error UI for AbortError
            }
            
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

    // Функция для предзагрузки HLS-плейлиста и первого сегмента
    const preloadHlsContent = useCallback(async (url: string) => {
        if (!url || preloadCache.has(url)) return;
        
        try {
            // Создаем запись в кеше для текущего URL
            preloadCache.set(url, { manifestUrl: '', loaded: false });
            
            // Загружаем манифест
            const content = await fetchM3U8Content(url);
            if (!content) {
                preloadCache.delete(url);
                return;
            }
            
            // Создаем и подготавливаем манифест
            const manifest = createManifest(content);
            const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
            const manifestUrl = URL.createObjectURL(blob);
            
            if (Hls.isSupported()) {
                // Создаем HLS-инстанс для предзагрузки
                const hlsConfig = {
                    enableWorker: true,
                    lowLatencyMode: false,
                    maxBufferSize: 2 * 1000 * 1000, // Уменьшаем для предзагрузки (2MB)
                    maxBufferLength: 5, // Только первые несколько секунд 
                    maxMaxBufferLength: 10,
                    startLevel: -1,
                    abrEwmaDefaultEstimate: 500000, 
                    testBandwidth: false,
                    fragLoadingMaxRetry: 2,
                    manifestLoadingMaxRetry: 2,
                    levelLoadingMaxRetry: 2
                };
                
                const hls = new Hls(hlsConfig);
                
                // Обновляем запись в кеше
                preloadCache.set(url, { 
                    manifestUrl, 
                    loaded: false,
                    hlsInstance: hls
                });
                
                // Создаем временный аудиоэлемент для предзагрузки
                const tempAudio = new Audio();
                tempAudio.muted = true;
                tempAudio.volume = 0;
                tempAudio.preload = 'auto';
                
                // Предотвращаем воспроизведение
                tempAudio.pause();
                
                // Загружаем только первый сегмент
                hls.loadSource(manifestUrl);
                hls.attachMedia(tempAudio);
                
                // Ждем парсинга манифеста и загрузки первого сегмента
                hls.once(Hls.Events.MANIFEST_PARSED, () => {
                    // Начинаем загрузку первого сегмента, но не воспроизводим
                    hls.startLoad();
                    
                    // Отмечаем как загруженный после предварительной загрузки
                    setTimeout(() => {
                        if (preloadCache.has(url)) {
                            const cacheEntry = preloadCache.get(url);
                            if (cacheEntry) {
                                preloadCache.set(url, { 
                                    ...cacheEntry, 
                                    loaded: true 
                                });
                                
                                if (url === m3u8Url) {
                                    setIsPreloaded(true);
                                }
                                
                                console.log('✅ Предзагрузка выполнена для:', url);
                            }
                        }
                    }, 1000); // Даем время на загрузку первого сегмента
                });
            } else {
                // Для браузеров без поддержки HLS.js (например, Safari)
                preloadCache.set(url, { 
                    manifestUrl, 
                    loaded: true 
                });
                
                if (url === m3u8Url) {
                    setIsPreloaded(true);
                }
            }
        } catch (error) {
            console.warn('Ошибка предзагрузки:', error);
            preloadCache.delete(url);
        }
    }, [fetchM3U8Content, createManifest, m3u8Url]);

    // Эффект для отслеживания видимости компонента на экране
    useEffect(() => {
        const audioPlayerElement = audioRef.current?.parentElement?.parentElement;
        if (!audioPlayerElement || !preload) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    isVisibleRef.current = entry.isIntersecting;
                    
                    // Если компонент стал видимым и еще не предзагружен - запускаем предзагрузку
                    if (entry.isIntersecting && !isPreloaded && m3u8Url) {
                        console.log('🔄 Компонент видим, начинаем предзагрузку:', m3u8Url);
                        preloadHlsContent(m3u8Url);
                    }
                });
            },
            { threshold: 0.1 } // Начинаем предзагрузку когда 10% компонента видно
        );
        
        observer.observe(audioPlayerElement);
        
        return () => {
            observer.disconnect();
        };
    }, [m3u8Url, isPreloaded, preload, preloadHlsContent]);
    
    // Предзагрузка при монтировании компонента, если URL уже известен
    useEffect(() => {
        if (m3u8Url && preload && !isPreloaded) {
            preloadHlsContent(m3u8Url);
        }
    }, [m3u8Url, preload, isPreloaded, preloadHlsContent]);

    // Очистка кеша предзагрузки при размонтировании компонента
    useEffect(() => {
        // Максимальный размер кеша
        const maxCacheSize = 5;
        
        // Функция для очистки кеша, если он стал слишком большим
        const cleanupCache = () => {
            if (preloadCache.size > maxCacheSize) {
                console.log('🧹 Очистка кеша предзагрузки, текущий размер:', preloadCache.size);
                
                // Получаем все URL в порядке добавления
                const urls = Array.from(preloadCache.keys());
                
                // Оставляем только последние N элементов
                const urlsToRemove = urls.slice(0, urls.length - maxCacheSize);
                
                // Удаляем лишние элементы из кеша
                urlsToRemove.forEach(url => {
                    const entry = preloadCache.get(url);
                    if (entry) {
                        // Уничтожаем HLS инстанс, если он есть
                        if (entry.hlsInstance) {
                            try {
                                entry.hlsInstance.stopLoad();
                                entry.hlsInstance.detachMedia();
                                entry.hlsInstance.destroy();
                            } catch (error) {
                                console.warn('Ошибка при уничтожении HLS инстанса:', error);
                            }
                        }
                        
                        // Освобождаем Blob URL
                        if (entry.manifestUrl) {
                            try {
                                URL.revokeObjectURL(entry.manifestUrl);
                            } catch (error) {
                                console.warn('Ошибка при освобождении Blob URL:', error);
                            }
                        }
                        
                        // Удаляем запись из кеша
                        preloadCache.delete(url);
                    }
                });
                
                console.log('✅ Кеш очищен, новый размер:', preloadCache.size);
            }
        };
        
        // Запускаем очистку кеша при необходимости
        cleanupCache();
        
        // Очищаем при размонтировании всегда для текущего URL
        return () => {
            // Очищаем текущий URL из кеша, если компонент размонтирован
            if (m3u8Url && preloadCache.has(m3u8Url)) {
                const entry = preloadCache.get(m3u8Url);
                if (entry) {
                    // Только если не используется активно
                    if (entry.hlsInstance && entry.hlsInstance !== hlsRef.current) {
                        try {
                            entry.hlsInstance.stopLoad();
                            entry.hlsInstance.detachMedia();
                            entry.hlsInstance.destroy();
                        } catch (error) {
                            console.warn('Ошибка при уничтожении HLS инстанса:', error);
                        }
                    }
                    
                    // Только если не используется активно
                    if (entry.manifestUrl && entry.manifestUrl !== manifestBlobRef.current) {
                        try {
                            URL.revokeObjectURL(entry.manifestUrl);
                        } catch (error) {
                            console.warn('Ошибка при освобождении Blob URL:', error);
                        }
                    }
                    
                    // Удаляем запись из кеша
                    preloadCache.delete(m3u8Url);
                }
            }
        };
    }, [m3u8Url]);

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
