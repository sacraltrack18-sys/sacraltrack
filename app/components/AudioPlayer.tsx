"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import useCreateBucketUrl from '../hooks/useCreateBucketUrl';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import moment from 'moment';

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
    const lastKnownTimeRef = useRef<number>(0); // Ref to store playback position on pause

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
            // Восстанавливаем позицию после loadedmetadata
            if (lastKnownTimeRef.current > 0) {
                audioRef.current.currentTime = lastKnownTimeRef.current;
                console.log('[AudioPlayer] Восстановлено время после loadedmetadata:', lastKnownTimeRef.current);
            }
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
                    // If fetch fails after retries, show a toast error
                    errorToast('Could not load audio manifest.');
                    setError('Could not load audio. Please try again.'); // Keep internal error state for component display
                    return null;
                }
            } catch (err) {
                // Don't retry on AbortError as it was intentional
                if (err instanceof DOMException && err.name === 'AbortError') {
                    console.warn('M3U8 fetch aborted - cleanup in progress');
                    return null;
                }
                
                if (attempt === maxRetries - 1) {
                    console.error('Failed to fetch M3U8 after multiple retries:', err);
                    errorToast('Could not load audio. Please try again.'); // Show toast after max retries
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
        let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n';
        manifest += `#EXT-X-TARGETDURATION:${metadata.targetDuration}\n`;
        manifest += '#EXT-X-MEDIA-SEQUENCE:0\n';
        manifest += `#EXT-X-ALLOW-CACHE:${metadata.allowCache ? 'YES' : 'NO'}\n`;
        let segmentCount = 0;
        let endlistLine = -1;
        let segmentLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('#EXTINF')) {
                manifest += line + '\n';
                if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
                    const segmentId = lines[i + 1].trim();
                    const segmentUrl = createSegmentUrl(segmentId);
                    manifest += segmentUrl + '\n';
                    segmentCount++;
                    segmentLines.push(segmentUrl);
                    i++;
                }
            } else if (!line.startsWith('#') && line.trim()) {
                const segmentUrl = createSegmentUrl(line);
                manifest += segmentUrl + '\n';
                segmentCount++;
                segmentLines.push(segmentUrl);
            } else if (line.startsWith('#')) {
                manifest += line + '\n';
                if (line.startsWith('#EXT-X-ENDLIST')) {
                    endlistLine = i;
            }
        }
        }
        if (!content.includes('#EXT-X-ENDLIST')) {
            manifest += '#EXT-X-ENDLIST\n';
        }
        // Логируем результат
        console.log('[AudioPlayer] Итоговый manifest:', manifest);
        console.log('[AudioPlayer] Количество сегментов:', segmentCount);
        console.log('[AudioPlayer] Позиция #EXT-X-ENDLIST:', endlistLine);
        console.log('[AudioPlayer] Сегменты:', segmentLines);
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
    const isIOS = () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    // Надежный unlock audio для iOS
    const unlockAudio = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isIOS()) {
            // Play and immediately pause to unlock
            if (audio.paused) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        audio.pause();
                    }).catch(() => {});
                }
            }
        }
    };

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
                if (isCurrentlyLoading) return; // Prevent concurrent setups
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
                                                    // On iOS, a failed play attempt due to policy might need a manual retry prompt
                                                } else {
                                                    console.error('Error playing audio:', error);
                                                    // If play fails for other reasons, call onPause to sync UI
                                                    onPause();
                                                }
                                            });
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error during play attempt:', e);
                                    onPause(); // Ensure UI sync on exception
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
                        lowLatencyMode: false,
                        maxBufferSize: 0,
                        maxBufferLength: 300,
                        maxMaxBufferLength: 600,
                        maxBufferHole: 0.1,
                        startLevel: -1,
                        manifestLoadingTimeOut: 20000,
                        manifestLoadingMaxRetry: 8,
                        manifestLoadingRetryDelay: 500,
                        levelLoadingTimeOut: 20000,
                        levelLoadingMaxRetry: 8,
                        levelLoadingRetryDelay: 500,
                        fragLoadingTimeOut: 20000,
                        fragLoadingMaxRetry: 8,
                        fragLoadingRetryDelay: 500,
                        startFragPrefetch: true,
                        testBandwidth: true,
                        progressive: true,
                        abrEwmaDefaultEstimate: 1000000,
                        abrBandwidthFactor: 0.95,
                        abrBandwidthUpFactor: 0.7,
                        backBufferLength: 300,
                        appendErrorMaxRetry: 5
                    };

                    try {
                        hls = new Hls(hlsConfig);
                        hlsRef.current = hls;
                        
                        // Добавляем слушатели событий
                        setupHlsEventListeners(hls);

                        hls.loadSource(manifestUrl);
                        hls.attachMedia(audio);
                        setLoadProgress(0.8);
                        // Восстанавливаем позицию после attachMedia
                        if (lastKnownTimeRef.current > 0) {
                            audio.currentTime = lastKnownTimeRef.current;
                            console.log('[AudioPlayer] Восстановлено время после attachMedia:', lastKnownTimeRef.current);
                        }
                        
                        // Add a flag to track if manifest is parsed
                        let manifestParsed = false;
                        
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            manifestParsed = true;
                            setLoadProgress(1.0);
                            isCurrentlyLoading = false;
                            // Восстанавливаем позицию после MANIFEST_PARSED
                            if (lastKnownTimeRef.current > 0) {
                                audio.currentTime = lastKnownTimeRef.current;
                                console.log('[AudioPlayer] Восстановлено время после MANIFEST_PARSED:', lastKnownTimeRef.current);
                            }
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
                                                            // On iOS, a failed play attempt due to policy might need a manual retry prompt
                                                        } else {
                                                            console.error('Error playing audio:', error);
                                                            // If play fails for other reasons, call onPause to sync UI
                                                            onPause();
                                                        }
                                                    });
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error during play attempt:', e);
                                            onPause(); // Ensure UI sync on exception
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
                                                        // On iOS, a failed play attempt due to policy might need a manual retry prompt
                                                    } else {
                                                        console.error('Error playing audio:', error);
                                                        // If play fails for other reasons, call onPause to sync UI
                                                        onPause();
                                                    }
                                                });
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error during play attempt:', e);
                                        onPause(); // Ensure UI sync on exception
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
                                // Even if timeout, try to sync play state if needed
                                if (isPlaying && audio.paused) { // Check if supposed to be playing
                                     console.log('Attempting to play after manifest parsing timeout');
                                     audio.play().catch(e => console.error('Play failed after timeout:', e));
                                }
                            }
                        }, 5000);
                    } catch (hlsError) {
                        console.error('Error setting up HLS:', hlsError);
                        errorToast('Failed to initialize audio player.');
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
                                                    // If play fails, ensure the UI state is updated
                                                    onPause(); // Ensure UI sync on failure
                                                });
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error during play attempt:', e);
                                        onPause(); // Ensure UI sync on exception
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
                                                onPause(); // Ensure UI sync on failure
                                            });
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error during play attempt:', e);
                                    onPause(); // Ensure UI sync on exception
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
                console.log('HLS Error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Фатальная ошибка сети, пытаемся восстановить');
                                    hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Фатальная ошибка медиа, пытаемся восстановить');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.log('Фатальная ошибка, перезапускаем плеер');
                            if (hlsRef.current) {
                                hlsRef.current.destroy();
                                    hlsRef.current = null;
                                            setupHls();
                                        }
                            break;
                    }
                }
            });

            // Добавляем слушатель для буферизации будущих сегментов
            hls.on(Hls.Events.FRAG_LOADED, function(event, data) {
                // При успешной загрузке сегмента, проверяем текущую позицию воспроизведения
                if (audioRef.current && data.frag) {
                    const audio = audioRef.current;
                    const currentTime = audio.currentTime;
                    let bufferedEnd = 0;
                    if (audio.buffered.length > 0) {
                        bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                    }
                    const timeLeft = bufferedEnd - currentTime;
                    // Если буфер мал, инициируем загрузку
                    if (timeLeft < 30) {
                        try {
                            hls.startLoad();
                             } catch (e) {
                            console.warn('Ошибка при вызове startLoad в FRAG_LOADED:', e);
                        }
                    }
                }
            });

            // Мониторим состояние буфера
            hls.on(Hls.Events.BUFFER_APPENDED, () => {
                if (audioRef.current && !audioRef.current.paused) {
                    const audio = audioRef.current;
                    const currentTime = audio.currentTime;
                    let bufferedEnd = 0;
                    
                    for (let i = 0; i < audio.buffered.length; i++) {
                        if (audio.buffered.end(i) > bufferedEnd) {
                            bufferedEnd = audio.buffered.end(i);
                        }
                    }
                    
                    console.log('Текущий буфер:', bufferedEnd - currentTime, 'секунд');
                }
            });
        };

        setupHls(); // Call setupHls when m3u8Url changes

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

    // Добавляем новый эффект для отслеживания паузы
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePause = () => {
            // Сохраняем позицию при любой паузе
            if (audio.currentTime > 0) {
                lastKnownTimeRef.current = audio.currentTime;
                console.log('Сохранена позиция при паузе:', lastKnownTimeRef.current);
            }
        };

        const handlePlay = () => {
            // Восстанавливаем позицию при любом воспроизведении
            if (lastKnownTimeRef.current > 0) {
                audio.currentTime = lastKnownTimeRef.current;
                console.log('Восстановлена позиция при воспроизведении:', lastKnownTimeRef.current);
            }
        };

        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
        };
    }, []);

    // Модифицируем эффект play/pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const playPauseDebounce = setTimeout(async () => {
            if (isPlaying) {
                try {
                    if (audio.paused) {
                        // Принудительно восстанавливаем позицию перед воспроизведением
                        if (lastKnownTimeRef.current > 0) {
                            console.log('Восстанавливаем позицию перед play:', lastKnownTimeRef.current);
                            audio.currentTime = lastKnownTimeRef.current;
                            
                            // Ждем, пока позиция действительно установится
                            await new Promise(resolve => {
                                const checkTime = () => {
                                    if (Math.abs(audio.currentTime - lastKnownTimeRef.current) < 0.1) {
                                        resolve(true);
                                    } else {
                                audio.currentTime = lastKnownTimeRef.current;
                                        setTimeout(checkTime, 10);
                                    }
                                };
                                checkTime();
                            });
                        }

                        // Теперь запускаем воспроизведение
                            const playPromise = audio.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(error => {
                                console.error('Ошибка воспроизведения:', error);
                                    if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                                         onPause();
                                    }
                                });
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при воспроизведении:', error);
                    onPause();
                            }
                        } else {
                if (!audio.paused) {
                    // Сохраняем позицию перед паузой
                    lastKnownTimeRef.current = audio.currentTime;
                    console.log('Сохраняем позицию перед pause:', lastKnownTimeRef.current);
                    audio.pause();
                }
            }
        }, 100);

        return () => clearTimeout(playPauseDebounce);
    }, [isPlaying, onPause]);

    // Добавляем обработчик для seeked события
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleSeeked = () => {
            // Обновляем сохраненную позицию при перемотке
            lastKnownTimeRef.current = audio.currentTime;
            console.log('Обновлена позиция после перемотки:', lastKnownTimeRef.current);
        };

        audio.addEventListener('seeked', handleSeeked);

        return () => {
            audio.removeEventListener('seeked', handleSeeked);
        };
    }, []);

    // Эффект для обработки изменений состояния проигрывания (play/pause)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const playPauseDebounce = setTimeout(() => {
                                if (isPlaying) {
                if (audio.paused) {
                    try {
                        if (audio.readyState >= 2) {
                            // Always restore position before playing
                            if (lastKnownTimeRef.current > 0) {
                                console.log('Restoring to position:', lastKnownTimeRef.current);
                                audio.currentTime = lastKnownTimeRef.current;
                            }
                            
                                    const playPromise = audio.play();
                                    if (playPromise !== undefined) {
                                        playPromise.catch(error => {
                                    console.error('Error playing audio:', error);
                                            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                                                onPause();
                                            }
                                        });
                                    }
                        }
                    } catch (error) {
                        console.error('Exception during play:', error);
                        onPause();
                    }
                }
            } else {
                    if (!audio.paused) {
                    // Always save position before pausing
                    lastKnownTimeRef.current = audio.currentTime;
                    console.log('Saving position:', lastKnownTimeRef.current);
                        audio.pause();
                    }
                }
        }, 100);
        
        return () => clearTimeout(playPauseDebounce);
    }, [isPlaying, onPause]);

    // Обработка событий аудио с улучшенной логикой
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            lastKnownTimeRef.current = 0; // Сброс позиции при окончании трека
            onPause();
        };

        const handleError = (e: Event) => {
            // Check if it's an AbortError, which can be ignored
            const error = e as ErrorEvent;
            // Also check if the error is a NotAllowedError which is common on iOS autoplay restrictions
            if (error && error.message && (error.message.includes('AbortError') || error.message.includes('NotAllowedError'))) {
                console.log('Audio play interrupted or blocked by browser policy (normal behavior)');
                // Do NOT show an error message for AbortError or NotAllowedError
                // Do NOT call onPause() here for NotAllowedError to allow the user to retry play
                return;
            }
            
            console.error('AudioPlayer: Error:', e); // Log the specific error
            errorToast('Audio playback error.'); // Show a generic toast for unexpected errors
            setError('Audio playback error'); // Set internal error state for component display
            onPause(); // Call onPause for actual playback errors
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handlePlaying = () => {
            setIsLoading(false);
            setError(null);
        };

        // Add event listener for 'pause' event to save current time
        const handlePauseEvent = () => {
                lastKnownTimeRef.current = audio.currentTime;
                console.log(`Playback paused, saving time: ${lastKnownTimeRef.current}`);
        };

        // Add all event listeners
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('pause', handlePauseEvent); // Listen for actual pause event
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            // Remove all handlers on unmount
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('pause', handlePauseEvent); // Remove pause listener
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
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            // Если используется HLS, явно инициируем загрузку сегмента
            if (hlsRef.current) {
                try {
                    hlsRef.current.startLoad();
                } catch (e) {
                    console.warn('Ошибка при вызове startLoad после seek:', e);
                }
            }
            // Если должен играть — инициируем play
            if (isPlaying) {
                const audio = audioRef.current;
                if (audio.readyState >= 2) {
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            // Не сбрасываем UI, просто лог
                            console.warn('Ошибка play() после seek:', err);
                        });
                    }
                } else {
                    // Если не готово — ждем canplay и только тогда play
                    const onCanPlay = () => {
                        if (isPlaying) {
                            audio.play().catch(err => {
                                console.warn('Ошибка play() после seek/canplay:', err);
                            });
                        }
                        audio.removeEventListener('canplay', onCanPlay);
                    };
                    audio.addEventListener('canplay', onCanPlay, { once: true });
                }
            }
        }
    }, [duration, isLoading, isPlaying]);

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
                    maxBufferSize: 5 * 1000 * 1000, // Увеличиваем для предзагрузки (5MB)
                    maxBufferLength: 10, // Увеличиваем буфер для более стабильного переключения 
                    maxMaxBufferLength: 20, // Увеличиваем максимальный буфер
                    startLevel: -1,
                    abrEwmaDefaultEstimate: 1000000, // Увеличиваем оценку пропускной способности
                    testBandwidth: false,
                    fragLoadingMaxRetry: 4, // Больше попыток для загрузки фрагментов
                    manifestLoadingMaxRetry: 4,
                    levelLoadingMaxRetry: 4,
                    // Добавляем настройки для более плавного воспроизведения
                    backBufferLength: 10, // Сохраняем больше данных в буфере позади текущей позиции
                    // Add aggressive ABR settings (even for audio, can influence segment loading)
                    abrEwmaFetchAndParseFragKbps: 1000, // Estimate fragment load/parse speed
                    abrBandwidthFactor: 0.8, // Use 80% of estimated bandwidth
                    abrBandwidthUpFactor: 0.2, // Be more aggressive in increasing bandwidth estimate
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

    // Добавляем агрессивный мониторинг буфера
    useEffect(() => {
        if (!audioRef.current || !hlsRef.current || !isPlaying) return;

                const audio = audioRef.current;
                const hls = hlsRef.current;
        let bufferCheckInterval: NodeJS.Timeout;

        const checkAndLoadBuffer = () => {
            if (!audio || !hls) return;

            try {
                if (!audio.paused) {
                    const currentTime = audio.currentTime;
                let bufferedEnd = 0;
                    
                    // Находим текущий буферизованный диапазон
                    for (let i = 0; i < audio.buffered.length; i++) {
                        const start = audio.buffered.start(i);
                        const end = audio.buffered.end(i);
                        if (currentTime >= start && currentTime <= end) {
                            bufferedEnd = end;
                            break;
                        }
                    }

                    const timeBuffered = bufferedEnd - currentTime;
                    console.log('Буферизовано секунд:', timeBuffered);

                    // Если буфер меньше 60 секунд, запускаем загрузку
                    if (timeBuffered < 60) {
                        console.log('Запуск дополнительной загрузки');
                        hls.startLoad();
                    }
                }
            } catch (error) {
                console.warn('Ошибка проверки буфера:', error);
            }
        };

        // Запускаем проверку буфера каждую секунду
        bufferCheckInterval = setInterval(checkAndLoadBuffer, 1000);

        // Добавляем обработчики событий HLS
        const onFragLoaded = () => {
            checkAndLoadBuffer();
        };

        const onFragBuffered = () => {
            checkAndLoadBuffer();
        };

        hls.on(Hls.Events.FRAG_LOADED, onFragLoaded);
        hls.on(Hls.Events.FRAG_BUFFERED, onFragBuffered);

        // Принудительно запускаем загрузку при старте
        hls.startLoad();
        checkAndLoadBuffer();

        return () => {
            clearInterval(bufferCheckInterval);
            if (hls) {
                hls.off(Hls.Events.FRAG_LOADED, onFragLoaded);
                hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
            }
        };
    }, [isPlaying]);

    // Исправление: всегда делаем unlockAudio при onPlay на iOS
    useEffect(() => {
        if (isPlaying) {
            unlockAudio();
        }
    }, [isPlaying, unlockAudio]);

    // Handle seeking
    const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const seekTime = parseFloat(event.target.value);
            audioRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
        }
    }, []);

    // Улучшенный интерфейс с индикатором буферизации и элементами прогрессбара
    return (
        <div className="flex items-center gap-4 w-full p-3">
            <Toaster />
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
                    {formatTime(currentTime)}
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

// Helper function for toast notification
const errorToast = (message: string) => toast.error(message, {
    style: {
        background: 'rgba(46, 36, 105, 0.9)',
        color: '#fff',
        borderLeft: '4px solid #ff5e5b',
        padding: '10px', // Reduced padding
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', // Adjusted shadow
        fontSize: '12px', // Reduced font size
    },
    icon: '❌',
    duration: 3000, // Shorter duration
});
