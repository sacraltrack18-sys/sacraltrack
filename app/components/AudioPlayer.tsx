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
        for (let attempt = 0; attempt < maxRetries; attempt++) {
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
                    retryCountRef.current = 0; // Сбрасываем счетчик попыток при успехе
                    return content;
                } else {
                    throw new Error('Invalid M3U8 format');
                }
            } catch (err) {
                console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, err);
                if (attempt === maxRetries - 1) {
                    setError('Could not load audio. Please try again.');
                    return null;
                }
                // Экспоненциальный backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !m3u8Url) return;

        let hls: Hls;
        let isMounted = true;

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
                        hlsRef.current.destroy();
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
                        abrEwmaDefaultEstimate: 500000,
                        abrMaxWithRealBitrate: true,
                        maxStarvationDelay: 2, // Уменьшаем задержку "голодания" для аудио
                        maxLoadingDelay: 2,
                        startFragPrefetch: true, // Предварительная загрузка фрагментов
                        progressive: true,
                        debug: false,
                        xhrSetup: (xhr: XMLHttpRequest) => {
                            xhr.withCredentials = false;
                            // Добавляем заголовки для кэширования
                            xhr.setRequestHeader('Cache-Control', 'max-age=3600');
                        }
                    };
                    
                    hls = new Hls(hlsConfig);
                    hlsRef.current = hls;

                    // Регистрируем обработчики событий
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setError(null);
                        setLoadProgress(0.8); // Почти готово
                        
                        if (isPlaying && isMounted) {
                            const playPromise = audio.play();
                            if (playPromise !== undefined) {
                                playPromise.catch((error) => {
                                    console.warn('Audio playback was prevented:', error);
                                    if (isMounted) {
                                        onPause(); // Сообщаем родительскому компоненту о паузе
                                    }
                                });
                            }
                        }
                        
                        setIsLoading(false);
                        setLoadProgress(1); // Полностью загружено
                    });

                    // Обработка событий буферизации
                    hls.on(Hls.Events.BUFFER_APPENDING, handleBufferProgress);

                    // Улучшенная обработка ошибок
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            console.error('HLS fatal error:', data.type, data.details);
                            
                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                // Для сетевых ошибок пробуем восстановиться
                                if (retryCountRef.current < maxRetries) {
                                    retryCountRef.current++;
                                    console.log(`Attempting recovery #${retryCountRef.current}...`);
                                    hls.startLoad();
                                } else {
                                    if (isMounted) {
                                        setError("Network error. Check your connection.");
                                        hls.destroy();
                                    }
                                }
                            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                // Для ошибок воспроизведения пробуем восстановиться
                                if (retryCountRef.current < maxRetries) {
                                    retryCountRef.current++;
                                    console.log(`Attempting media recovery #${retryCountRef.current}...`);
                                    hls.recoverMediaError();
                                } else {
                                    if (isMounted) {
                                        setError("Media error. Please try again.");
                                        hls.destroy();
                                    }
                                }
                            } else {
                                if (isMounted) {
                                    setError("Playback error");
                                    hls.destroy();
                                }
                            }
                        } else {
                            // Для нефатальных ошибок просто логируем
                            console.warn('HLS non-fatal error:', data.type, data.details);
                        }
                    });

                    // Добавляем дополнительный обработчик для отслеживания буферизации
                    hls.on(Hls.Events.FRAG_BUFFERED, () => {
                        if (isMounted) {
                            setLoadProgress(1); // Фрагмент буферизован
                            setIsLoading(false);
                        }
                    });

                    hls.attachMedia(audio);
                    hls.loadSource(manifestUrl);

                } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                    // Для устройств Apple, которые поддерживают HLS нативно
                    audio.src = m3u8Url;
                    
                    // Для Safari устанавливаем обработчики ошибок
                    audio.addEventListener('error', (e) => {
                        console.error('Native HLS playback error:', e);
                        if (isMounted) {
                            setError('Playback error. Please try again.');
                        }
                    });
                    
                    if (isPlaying) {
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {
                                if (isMounted) {
                                    onPause();
                                }
                            });
                        }
                    }
                    
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error initializing HLS:', err);
                if (isMounted) {
                    setError('Error initializing player');
                    setIsLoading(false);
                }
            }
        };

        if (audioRef.current) {
            setupHls();
        }

        return () => {
            isMounted = false;
            
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            
            if (manifestBlobRef.current) {
                URL.revokeObjectURL(manifestBlobRef.current);
                manifestBlobRef.current = null;
            }
            
            retryCountRef.current = 0;
        };
    }, [m3u8Url, createManifest, fetchM3U8Content, handleBufferProgress, isPlaying, onPause]);

    // Управление воспроизведением с улучшенной обработкой ошибок
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlay = async () => {
            try {
                setIsLoading(true);
                
                if (isPlaying) {
                    // Проверяем, не воспроизводится ли уже аудио
                    if (audio.paused) {
                        try {
                            const playPromise = audio.play();
                            if (playPromise !== undefined) {
                                await playPromise;
                            }
                        } catch (playError) {
                            // Игнорируем AbortError, так как это нормально при быстром переключении
                            if (playError && typeof playError === 'object' && 'name' in playError && playError.name !== 'AbortError') {
                                console.error('AudioPlayer: Play error:', playError);
                                onPause(); // Информируем родительский компонент о проблеме
                            }
                        }
                    }
                } else {
                    // Проверяем, не на паузе ли уже аудио
                    if (!audio.paused) {
                        audio.pause();
                    }
                }
            } catch (error) {
                console.error('AudioPlayer: Playback error:', error);
                onPause(); // Информируем родительский компонент о проблеме
            } finally {
                setIsLoading(false);
            }
        };

        // Небольшая задержка перед воспроизведением для предотвращения проблем с браузерами
        const timeoutId = setTimeout(handlePlay, 100);

        return () => {
            clearTimeout(timeoutId);
            // Не вызываем pause() при размонтировании, чтобы избежать конфликтов
            // с другими вызовами play()/pause()
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
