"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import useCreateBucketUrl from '../hooks/useCreateBucketUrl';
import { BsFillPlayFill, BsFillPauseFill } from 'react-icons/bs';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

interface AudioPlayerProps {
    m3u8Url: string;
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
}

// Простой кеш для манифестов
const manifestCache = new Map<string, string>();

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    m3u8Url,
    isPlaying,
    onPlay,
    onPause
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const manifestBlobRef = useRef<string | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const isInitializedRef = useRef<boolean>(false);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    // Простое обновление времени воспроизведения
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current) return;

        const now = Date.now();
        if (now - lastUpdateRef.current > 500) { // Увеличиваем интервал для стабильности
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



    // Простая функция для получения M3U8 контента
    const fetchM3U8Content = useCallback(async (url: string) => {
        // Проверяем кеш
        const cacheKey = `m3u8_cache_${url}`;
        const cachedContent = manifestCache.get(cacheKey);
        if (cachedContent) {
            console.log('Using cached M3U8 content');
            return cachedContent;
        }

        try {
            const response = await fetch(url, {
                headers: { 'Cache-Control': 'no-cache' },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();

            if (content.trim().startsWith('#EXTM3U')) {
                // Кешируем контент
                manifestCache.set(cacheKey, content);
                return content;
            } else {
                throw new Error('Invalid M3U8 format');
            }
        } catch (err) {
            console.error('Failed to fetch M3U8:', err);
            errorToast('Could not load audio. Please try again.');
            setError('Could not load audio. Please try again.');
            return null;
        }
    }, []);

    // Простая функция создания манифеста
    const createManifest = useCallback((content: string) => {
        const lines = content.split('\n');
        let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n';
        manifest += '#EXT-X-TARGETDURATION:10\n';
        manifest += '#EXT-X-MEDIA-SEQUENCE:0\n';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('#EXTINF')) {
                manifest += line + '\n';
                if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
                    const segmentId = lines[i + 1].trim();
                    const segmentUrl = createSegmentUrl(segmentId);
                    manifest += segmentUrl + '\n';
                    i++;
                }
            } else if (!line.startsWith('#') && line.trim()) {
                const segmentUrl = createSegmentUrl(line);
                manifest += segmentUrl + '\n';
            } else if (line.startsWith('#') && !line.startsWith('#EXT-X-TARGETDURATION') && !line.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
                manifest += line + '\n';
            }
        }

        if (!content.includes('#EXT-X-ENDLIST')) {
            manifest += '#EXT-X-ENDLIST\n';
        }

        return manifest;
    }, [createSegmentUrl]);

    // Простая функция для безопасного воспроизведения
    const safePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || !isInitializedRef.current) return;

        try {
            // Отменяем предыдущий промис воспроизведения
            if (playPromiseRef.current) {
                try {
                    await playPromiseRef.current;
                } catch (e) {
                    // Игнорируем ошибки отмененного промиса
                }
            }

            if (audio.paused && audio.readyState >= 2) {
                playPromiseRef.current = audio.play();
                await playPromiseRef.current;
                playPromiseRef.current = null;
            }
        } catch (error) {
            playPromiseRef.current = null;
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                console.error('Error playing audio:', error);
                onPause();
            }
        }
    }, [onPause]);

    // Простая функция для паузы
    const safePause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (!audio.paused) {
                audio.pause();
            }
        } catch (error) {
            console.error('Error pausing audio:', error);
        }
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !m3u8Url) return;

        let hls: Hls;
        let isMounted = true;

        const setupHls = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Очищаем предыдущий Blob URL
                if (manifestBlobRef.current) {
                    URL.revokeObjectURL(manifestBlobRef.current);
                    manifestBlobRef.current = null;
                }

                // Загружаем манифест
                const content = await fetchM3U8Content(m3u8Url);
                if (!content || !isMounted) {
                    setIsLoading(false);
                    return;
                }

                // Создаем манифест
                const manifest = createManifest(content);
                const blob = new Blob([manifest], { type: 'application/x-mpegURL' });
                const manifestUrl = URL.createObjectURL(blob);
                manifestBlobRef.current = manifestUrl;

                if (Hls.isSupported()) {
                    // Очищаем предыдущий HLS инстанс
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

                    // Оптимизированная конфигурация HLS для устранения артефактов
                    const hlsConfig = {
                        enableWorker: false, // Отключаем для стабильности
                        lowLatencyMode: false,
                        maxBufferSize: 15 * 1024 * 1024, // Увеличиваем буфер для плавности
                        maxBufferLength: 45, // Увеличиваем для предотвращения разрывов
                        maxMaxBufferLength: 90, // Больший максимальный буфер
                        startLevel: -1,
                        manifestLoadingTimeOut: 10000,
                        manifestLoadingMaxRetry: 3,
                        levelLoadingTimeOut: 10000,
                        levelLoadingMaxRetry: 3,
                        fragLoadingTimeOut: 10000,
                        fragLoadingMaxRetry: 3,
                        testBandwidth: false,
                        progressive: true,
                        // Настройки для устранения артефактов при переходах
                        maxBufferHole: 0.1, // Уменьшаем допустимые разрывы в буфере
                        highBufferWatchdogPeriod: 1, // Частая проверка буфера
                        nudgeOffset: 0.05, // Минимальный сдвиг при проблемах
                        nudgeMaxRetry: 5, // Больше попыток исправления
                        maxSeekHole: 0.1, // Минимальные разрывы при перемотке
                        // Настройки для плавных переходов
                        backBufferLength: 30, // Сохраняем больше данных позади
                        appendErrorMaxRetry: 5, // Больше попыток при ошибках добавления
                        // Настройки для качественного аудио
                        defaultAudioCodec: 'mp4a.40.2', // AAC кодек
                        enableSoftwareAES: true, // Программная расшифровка для стабильности
                    };

                    try {
                        hls = new Hls(hlsConfig);
                        hlsRef.current = hls;

                        // Улучшенные обработчики ошибок и событий для устранения артефактов
                        hls.on(Hls.Events.ERROR, (_, data) => {
                            console.error('HLS Error:', data);
                            if (data.fatal) {
                                switch (data.type) {
                                    case Hls.ErrorTypes.NETWORK_ERROR:
                                        console.log('Network error, trying to recover...');
                                        hls.startLoad();
                                        break;
                                    case Hls.ErrorTypes.MEDIA_ERROR:
                                        console.log('Media error, trying to recover...');
                                        hls.recoverMediaError();
                                        break;
                                    default:
                                        console.error('Fatal error, destroying HLS');
                                        setError('Playback error occurred');
                                        break;
                                }
                            } else {
                                // Обработка не фатальных ошибок для предотвращения артефактов
                                if (data.details === 'bufferStalledError' || data.details === 'bufferNudgeOnStall') {
                                    console.log('Buffer stall detected, attempting recovery...');
                                    // Мягкое восстановление без прерывания воспроизведения
                                    setTimeout(() => {
                                        if (hls && audioRef.current && !audioRef.current.paused) {
                                            hls.startLoad();
                                        }
                                    }, 100);
                                }
                            }
                        });

                        // Мониторинг буфера для предотвращения разрывов
                        hls.on(Hls.Events.BUFFER_APPENDED, () => {
                            if (audioRef.current && !audioRef.current.paused) {
                                const audio = audioRef.current;
                                const currentTime = audio.currentTime;
                                let bufferedEnd = 0;

                                // Находим актуальный буферизованный диапазон
                                for (let i = 0; i < audio.buffered.length; i++) {
                                    const start = audio.buffered.start(i);
                                    const end = audio.buffered.end(i);
                                    if (currentTime >= start && currentTime <= end) {
                                        bufferedEnd = end;
                                        break;
                                    }
                                }

                                const timeBuffered = bufferedEnd - currentTime;

                                // Если буфер становится критически мал, заранее загружаем данные
                                if (timeBuffered < 10) {
                                    console.log(`Low buffer detected (${timeBuffered.toFixed(2)}s), preloading...`);
                                    hls.startLoad();
                                }
                            }
                        });

                        // Обработка успешной загрузки фрагментов
                        hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
                            if (data.frag && audioRef.current) {
                                console.log(`Fragment loaded: ${data.frag.sn}, duration: ${data.frag.duration}s`);
                            }
                        });

                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            setIsLoading(false);
                            isInitializedRef.current = true;
                            console.log('HLS manifest parsed successfully');
                        });

                        hls.loadSource(manifestUrl);
                        hls.attachMedia(audio);

                    } catch (hlsError) {
                        console.error('Error setting up HLS:', hlsError);
                        errorToast('Failed to initialize audio player.');
                        setError('Failed to initialize audio player.');
                        setIsLoading(false);
                    }
                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    // Для Safari и iOS устройств с нативной поддержкой HLS
                    audio.src = manifestUrl;
                    audio.addEventListener('loadedmetadata', () => {
                        setIsLoading(false);
                        isInitializedRef.current = true;
                        console.log('Native HLS loaded successfully');
                    });
                } else {
                    setError('Your browser does not support HLS playback.');
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error in setupHLS:', err);
                setError('Could not initialize audio player.');
                setIsLoading(false);
            }
        };
        setupHls(); // Вызываем setupHls при изменении m3u8Url

        return () => {
            isMounted = false;
            isInitializedRef.current = false;

            // Очищаем HLS инстанс
            if (hlsRef.current) {
                try {
                    hlsRef.current.stopLoad();
                    hlsRef.current.detachMedia();
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                } catch (err) {
                    console.warn('Error cleaning up HLS instance:', err);
                }
            }

            // Очищаем аудио элемент
            if (audio) {
                try {
                    audio.pause();
                    audio.src = '';
                    audio.load();
                } catch (err) {
                    console.warn('Error cleaning up audio element:', err);
                }
            }

            // Очищаем blob URL
            if (manifestBlobRef.current) {
                try {
                    URL.revokeObjectURL(manifestBlobRef.current);
                    manifestBlobRef.current = null;
                } catch (err) {
                    console.warn('Error revoking object URL:', err);
                }
            }
        };
    }, [m3u8Url, createManifest, fetchM3U8Content]);

    // Простой эффект для управления воспроизведением
    useEffect(() => {
        if (!isInitializedRef.current) return;

        if (isPlaying) {
            safePlay();
        } else {
            safePause();
        }
    }, [isPlaying, safePlay, safePause]);

    // Улучшенные обработчики событий аудио для предотвращения артефактов
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

        // Обработчик для предотвращения артефактов при буферизации
        const handleCanPlay = () => {
            setIsLoading(false);
        };

        const handleCanPlayThrough = () => {
            setIsLoading(false);
        };

        // Обработчик остановки воспроизведения (stalled)
        const handleStalled = () => {
            console.log('Audio stalled, attempting recovery...');
            if (hlsRef.current && !audio.paused) {
                // Мягкое восстановление при остановке
                setTimeout(() => {
                    if (hlsRef.current && !audio.paused) {
                        hlsRef.current.startLoad();
                    }
                }, 200);
            }
        };

        // Обработчик прерывания воспроизведения
        const handleSuspend = () => {
            console.log('Audio suspended');
        };

        // Обработчик прогресса загрузки
        const handleProgress = () => {
            if (audio.buffered.length > 0) {
                const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                const currentTime = audio.currentTime;
                const timeBuffered = bufferedEnd - currentTime;

                // Если буфер мал и есть HLS, запускаем загрузку
                if (timeBuffered < 15 && hlsRef.current && !audio.paused) {
                    hlsRef.current.startLoad();
                }
            }
        };

        // Добавляем обработчики событий
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('stalled', handleStalled);
        audio.addEventListener('suspend', handleSuspend);
        audio.addEventListener('progress', handleProgress);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            // Удаляем обработчики при размонтировании
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            audio.removeEventListener('stalled', handleStalled);
            audio.removeEventListener('suspend', handleSuspend);
            audio.removeEventListener('progress', handleProgress);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [onPause, handleTimeUpdate, handleLoadedMetadata]);

    // Форматирование времени с улучшенной точностью
    const formatTime = useCallback((time: number) => {
        if (isNaN(time) || !isFinite(time)) return '0:00';
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Улучшенный обработчик клика по прогресс-бару для плавной перемотки
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (audioRef.current && !isLoading && duration > 0) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            const newTime = percent * duration;
            const audio = audioRef.current;
            const wasPlaying = !audio.paused;

            // Плавная перемотка для предотвращения артефактов
            try {
                // Временно приостанавливаем для плавной перемотки
                if (wasPlaying) {
                    audio.pause();
                }

                // Устанавливаем новое время
                audio.currentTime = newTime;
                setCurrentTime(newTime);

                // Если HLS используется, обновляем буфер
                if (hlsRef.current) {
                    // Небольшая задержка для стабилизации
                    setTimeout(() => {
                        if (hlsRef.current) {
                            hlsRef.current.startLoad();

                            // Возобновляем воспроизведение если было активно
                            if (wasPlaying && audio.readyState >= 2) {
                                setTimeout(() => {
                                    if (wasPlaying && audio.paused) {
                                        audio.play().catch(err => {
                                            console.warn('Error resuming playback after seek:', err);
                                        });
                                    }
                                }, 100);
                            }
                        }
                    }, 50);
                } else if (wasPlaying && audio.readyState >= 2) {
                    // Для нативного HLS возобновляем сразу
                    setTimeout(() => {
                        if (wasPlaying && audio.paused) {
                            audio.play().catch(err => {
                                console.warn('Error resuming playback after seek:', err);
                            });
                        }
                    }, 50);
                }
            } catch (error) {
                console.warn('Error during seek operation:', error);
            }
        }
    }, [duration, isLoading]);







    // Простой интерфейс плеера
    return (
        <div className="flex items-center gap-4 w-full p-3">
            <Toaster />
            <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className="text-white hover:text-[#20DDBB] transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading}
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
                    {/* Индикатор прогресса воспроизведения */}
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full transition-all duration-100"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />

                    {/* Маркер позиции */}
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
                playsInline
                controls={false}
                muted={false}
                autoPlay={false}
                style={{ display: 'none' }}
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

// Экспорт по умолчанию
export default AudioPlayer;