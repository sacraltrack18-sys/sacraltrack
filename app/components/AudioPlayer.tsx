"use client";

import React, { useEffect, useRef, useState, useCallback, FC } from "react";
import Hls from "hls.js";
import useCreateBucketUrl from "../hooks/useCreateBucketUrl";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

interface AudioPlayerProps {
  m3u8Url: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

// Оптимизированный кеш с автоочисткой
const manifestCache = new Map<string, { content: string; timestamp: number }>();
const MANIFEST_CACHE_TTL = 5 * 60 * 1000; // 5 минут
const MAX_MANIFEST_CACHE_SIZE = 50;

// Кеш для предзагруженных сегментов с оптимизированными настройками
const segmentCache = new Map<string, { blob: Blob; timestamp: number }>();
const SEGMENT_CACHE_TTL = 15 * 60 * 1000; // 15 минут
const MAX_SEGMENT_CACHE_SIZE = 150; // Увеличиваем максимальное количество сегментов в кеше
const PRELOAD_SEGMENT_TIMEOUT = 8000; // 8 секунд таймаут для предзагрузки сегментов

// Очистка кеша манифестов
const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(manifestCache.entries());

  // Удаляем устаревшие записи
  entries.forEach(([key, value]) => {
    if (now - value.timestamp > MANIFEST_CACHE_TTL) {
      manifestCache.delete(key);
      if (process.env.NODE_ENV === 'development') {
        console.log(`AudioPlayer: Removed expired manifest from cache: ${key}`);
      }
    }
  });

  // Ограничиваем размер кеша
  if (manifestCache.size > MAX_MANIFEST_CACHE_SIZE) {
    const sortedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, manifestCache.size - MAX_MANIFEST_CACHE_SIZE);

    sortedEntries.forEach(([key]) => {
      manifestCache.delete(key);
      if (process.env.NODE_ENV === 'development') {
        console.log(`AudioPlayer: Removed oldest manifest from cache: ${key}`);
      }
    });
  }
  
  // Очищаем кеш сегментов
  cleanupSegmentCache();
};

// Очистка кеша сегментов
const cleanupSegmentCache = () => {
  const now = Date.now();
  const entries = Array.from(segmentCache.entries());
  
  // Удаляем устаревшие сегменты
  entries.forEach(([key, value]) => {
    if (now - value.timestamp > SEGMENT_CACHE_TTL) {
      segmentCache.delete(key);
    }
  });
  
  // Ограничиваем размер кеша сегментов
  if (segmentCache.size > MAX_SEGMENT_CACHE_SIZE) {
    const sortedEntries = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, segmentCache.size - MAX_SEGMENT_CACHE_SIZE);

    sortedEntries.forEach(([key]) => segmentCache.delete(key));
  }
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  m3u8Url,
  isPlaying,
  onPlay,
  onPause,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [bufferHealth, setBufferHealth] = useState(100);
  const createBucketUrl = useCreateBucketUrl; // Получаем функцию на верхнем уровне

  // Refs для управления состоянием
  const manifestBlobRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastBufferLogRef = useRef<number>(0); // Для отслеживания последнего лога буфера
  const isInitializedRef = useRef<boolean>(false);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const mediaErrorRecoveryAttemptRef = useRef<number>(0); // Для отслеживания попыток восстановления после ошибок медиа
  const mountedRef = useRef<boolean>(true);

  // Оптимизированное обновление времени и мониторинг буфера
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || !mountedRef.current) return;

    const now = Date.now();
    if (now - lastUpdateRef.current > 250) { // Оптимизированная частота обновления UI
      const audio = audioRef.current;
      const time = audio.currentTime;
      setCurrentTime(time);
      lastUpdateRef.current = now;

      // Расширенный мониторинг буфера
      if (audio.buffered.length > 0) {
        const currentTime = audio.currentTime;
        let bufferedAhead = 0;
        let totalBuffered = 0;
        let bufferedBehind = 0;
        let hasCurrentBuffer = false;

        // Анализируем все буферные диапазоны
        for (let i = 0; i < audio.buffered.length; i++) {
          const start = audio.buffered.start(i);
          const end = audio.buffered.end(i);
          totalBuffered += (end - start);
          
          // Находим текущий буферный диапазон
          if (currentTime >= start && currentTime <= end) {
            bufferedAhead = end - currentTime;
            bufferedBehind = currentTime - start;
            hasCurrentBuffer = true;
          } else if (start > currentTime && !hasCurrentBuffer) {
            // Если мы еще не нашли текущий буфер и есть буфер впереди
            bufferedAhead = end - currentTime;
          }
        }

        // Рассчитываем здоровье буфера с учетом общего буфера
        const healthPercent = Math.min(100, (bufferedAhead / 30) * 100);
        setBufferHealth(healthPercent);
        
        // Предзагрузка дополнительных сегментов при низком буфере впереди
        if (bufferedAhead < 10 && hlsRef.current) {
          // Если буфер впереди меньше 10 секунд, увеличиваем приоритет загрузки
          console.log(`AudioPlayer: Low buffer ahead (${bufferedAhead.toFixed(2)}s), prioritizing loading`);
          if (hlsRef.current.config) {
            // Временно увеличиваем размер буфера для ускорения загрузки
            const originalMaxBufferLength = hlsRef.current.config.maxBufferLength;
            hlsRef.current.config.maxBufferLength = Math.max(60, originalMaxBufferLength || 30);
            
            // Возвращаем исходное значение через 5 секунд
            setTimeout(() => {
              if (hlsRef.current && hlsRef.current.config && mountedRef.current) {
                hlsRef.current.config.maxBufferLength = originalMaxBufferLength;
              }
            }, 5000);
          }
        }
        
        // Логируем информацию о буфере для отладки (не чаще раза в 5 секунд)
        if (now - (lastBufferLogRef.current || 0) > 5000) {
          console.log(`AudioPlayer: Buffer stats - ahead: ${bufferedAhead.toFixed(2)}s, behind: ${bufferedBehind.toFixed(2)}s, total: ${totalBuffered.toFixed(2)}s, health: ${healthPercent.toFixed(0)}%`);
          lastBufferLogRef.current = now;
        }
      }
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current || !mountedRef.current) return;
    setDuration(audioRef.current.duration);
    setIsLoading(false);
  }, []);

  // Создание URL для сегментов с кешированием
  const createSegmentUrl = useCallback((segment: string) => {
    if (!segment.trim()) {
      console.warn("AudioPlayer: Empty segment provided");
      return "";
    }
    
    try {
      // Проверяем, является ли сегмент уже полным URL
      if (segment.startsWith("http://") || segment.startsWith("https://")) {
        console.log(`AudioPlayer: Using existing URL for segment: ${segment}`);
        return segment;
      }
      
      // Если сегмент начинается с /, считаем его относительным путем
      if (segment.startsWith("/")) {
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}${segment}`;
        console.log(`AudioPlayer: Created relative URL for segment: ${fullUrl}`);
        return fullUrl;
      }
      
      // Создаем URL через createBucketUrl
      const sanitizedSegment = segment.trim().replace(/[\s\n\r]/g, "");
      const url = createBucketUrl(sanitizedSegment);
      console.log(`AudioPlayer: Created segment URL: ${url} from segment: ${segment}`);
      return url;
    } catch (error) {
      console.error("AudioPlayer: Failed to create segment URL:", error, "Segment:", segment);
      return "";
    }
  }, [createBucketUrl]);
  
  // Предзагрузка сегмента с кешированием
  const preloadSegment = useCallback(async (segmentUrl: string): Promise<Blob | null> => {
    if (!segmentUrl) return null;
    
    // Проверяем кеш сегментов
    if (segmentCache.has(segmentUrl)) {
      console.log(`AudioPlayer: Using cached segment: ${segmentUrl}`);
      const cachedSegment = segmentCache.get(segmentUrl);
      if (cachedSegment) {
        // Обновляем временную метку для предотвращения удаления из кеша
        segmentCache.set(segmentUrl, { ...cachedSegment, timestamp: Date.now() });
        return cachedSegment.blob;
      }
    }
    
    try {
      console.log(`AudioPlayer: Preloading segment: ${segmentUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PRELOAD_SEGMENT_TIMEOUT); // Используем константу для таймаута
      
      // Улучшенные настройки для загрузки сегментов
      const response = await fetch(segmentUrl, { 
        signal: controller.signal,
        headers: {
          'Range': 'bytes=0-', // Запрашиваем весь файл
          'Cache-Control': 'max-age=7200', // Кешируем на 2 часа
          'X-Requested-With': 'XMLHttpRequest' // Для лучшей совместимости с CDN
        },
        cache: 'force-cache', // Используем кэш браузера, если возможно
        // Дополнительные настройки для оптимизации
        mode: 'cors', // Разрешаем CORS запросы
        credentials: 'same-origin', // Отправляем куки только для того же источника
        referrerPolicy: 'no-referrer-when-downgrade', // Оптимальная политика реферера
        keepalive: true // Поддерживаем соединение для последующих запросов
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`AudioPlayer: Failed to preload segment: ${segmentUrl}, status: ${response.status}`);
        return null;
      }
      
      const blob = await response.blob();
      
      // Кешируем сегмент
      segmentCache.set(segmentUrl, { blob, timestamp: Date.now() });
      cleanupSegmentCache(); // Очищаем кеш, если он стал слишком большим
      
      console.log(`AudioPlayer: Successfully preloaded segment: ${segmentUrl}, size: ${blob.size} bytes`);
      return blob;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`AudioPlayer: Preloading segment timed out: ${segmentUrl}`);
        } else {
          console.error(`AudioPlayer: Error preloading segment: ${segmentUrl}`, error);
        }
      } else {
        console.error(`AudioPlayer: Unknown error preloading segment: ${segmentUrl}`, error);
      }
      return null;
    }
  }, []);

  // Оптимизированная загрузка M3U8 с кэшированием и предзагрузкой сегментов
  const fetchM3U8Content = useCallback(
    async (url: string, signal?: AbortSignal) => {
      cleanupCache(); // Очистка кеша перед запросом

      if (!url || url.trim() === "") {
        console.error("AudioPlayer: Empty M3U8 URL provided");
        if (mountedRef.current) {
          setError("Invalid audio source. Please try another track.");
          toast.error("Invalid audio source. Please try another track.");
        }
        return null;
      }

      // Проверяем, что URL имеет правильный формат
      if (!url.startsWith("http") && !url.startsWith("/")) {
        console.error(`AudioPlayer: Invalid M3U8 URL format: ${url}`);
        if (mountedRef.current) {
          setError("Invalid audio source format.");
          toast.error("Invalid audio source format. Please try another track.");
        }
        return null;
      }

      const cacheKey = `m3u8_cache_${url}`;
      const cached = manifestCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < MANIFEST_CACHE_TTL) {
        console.log("AudioPlayer: Using cached M3U8 content");
        return cached.content;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`AudioPlayer: Fetching M3U8 from URL: ${url}`);
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.warn("AudioPlayer: M3U8 fetch timeout after 8 seconds");
          }
          controller.abort();
        }, 8000); // Уменьшаем таймаут до 8 секунд для более быстрой реакции

        if (signal) {
          signal.addEventListener("abort", () => {
            if (process.env.NODE_ENV === 'development') {
              console.log("AudioPlayer: M3U8 fetch aborted by parent signal");
            }
            controller.abort();
          });
        }

        // Используем более агрессивные настройки кеширования и приоритета
        const response = await fetch(url, {
          headers: {
            "Cache-Control": "max-age=7200", // Кэшировать на 2 часа
            Accept: "application/vnd.apple.mpegurl,application/x-mpegurl,*/*",
            "X-Requested-With": "XMLHttpRequest" // Добавляем заголовок для лучшей совместимости с CDN
          },
          cache: "force-cache", // Используем кэш браузера, если возможно
          signal: controller.signal,
          // Добавляем дополнительные настройки для оптимизации
          mode: "cors", // Разрешаем CORS запросы
          credentials: "same-origin", // Отправляем куки только для того же источника
          referrerPolicy: "no-referrer-when-downgrade" // Оптимальная политика реферера
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`AudioPlayer: HTTP error fetching M3U8! status: ${response.status}, statusText: ${response.statusText}`);
          }
          if (mountedRef.current) {
            if (response.status === 404) {
              setError("Audio file not found. Please try another track.");
              toast.error("Audio file not found. Please try another track.");
            } else {
              setError(`Network error (${response.status}). Please try again later.`);
              toast.error(`Network error (${response.status}). Please try again later.`);
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const content = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.log(`AudioPlayer: M3U8 content received, length: ${content.length} bytes`);
          
          // Выводим первые 200 символов содержимого для отладки
          console.log(`AudioPlayer: M3U8 content preview: ${content.substring(0, 200)}...`);
        }

        // Проверка на пустой контент
        if (!content.trim()) {
          if (process.env.NODE_ENV === 'development') {
            console.error("AudioPlayer: Empty M3U8 content received");
          }
          if (mountedRef.current) {
            setError("Empty audio source. Please try another track.");
            toast.error("Empty audio source. Please try another track.");
          }
          return null;
        }

        // Более гибкая проверка формата M3U8
        if (content.trim().includes("#EXTM3U") || content.trim().includes("#EXTINF")) {
          if (process.env.NODE_ENV === 'development') {
            console.log("AudioPlayer: Valid M3U8 format detected");
          }
          manifestCache.set(cacheKey, { content, timestamp: Date.now() });
          return content;
        } else {
          // Попытка восстановления - если содержимое похоже на список сегментов без заголовков
          const lines = content.trim().split("\n");
          
          // Проверяем, похоже ли содержимое на список сегментов
          if (lines.length > 1) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("AudioPlayer: Attempting to recover malformed M3U8 - adding required headers");
            }
            
            // Проверяем, содержит ли каждая строка идентификатор сегмента
            const looksLikeSegmentList = lines.every(line => {
              const trimmed = line.trim();
              return trimmed && !trimmed.startsWith("#");
            });
            
            if (looksLikeSegmentList) {
              // Создаем правильный M3U8 плейлист с необходимыми заголовками
              const recoveredContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n${lines.map(line => `#EXTINF:10.0,\n${line.trim()}`).join("\n")}\n#EXT-X-ENDLIST`;
              if (process.env.NODE_ENV === 'development') {
                console.log(`AudioPlayer: Recovered M3U8 content: ${recoveredContent.substring(0, 200)}...`);
              }
              manifestCache.set(cacheKey, { content: recoveredContent, timestamp: Date.now() });
              
              // Предзагружаем первые сегменты для ускорения воспроизведения
              setTimeout(() => {
                lines.slice(0, 3).forEach(line => {
                  const segmentUrl = createSegmentUrl(line.trim());
                  if (segmentUrl) preloadSegment(segmentUrl);
                });
              }, 100);
              
              return recoveredContent;
            }
          }
          
          // Если это не похоже на список сегментов, пробуем другой формат восстановления
          // Проверяем, может быть это просто один сегмент
          if (content.trim() && !content.includes("#")) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("AudioPlayer: Content appears to be a single segment - creating minimal playlist");
            }
            const recoveredContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:10.0,\n${content.trim()}\n#EXT-X-ENDLIST`;
            if (process.env.NODE_ENV === 'development') {
              console.log(`AudioPlayer: Created minimal playlist: ${recoveredContent}`);
            }
            manifestCache.set(cacheKey, { content: recoveredContent, timestamp: Date.now() });
            return recoveredContent;
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.error("AudioPlayer: Invalid M3U8 format:", content.substring(0, 100) + "...");
          }
          if (mountedRef.current) {
            setError("Invalid audio format. Please try another track.");
            toast.error("Invalid audio format. Please try another track.");
          }
          throw new Error("Invalid M3U8 format");
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            if (process.env.NODE_ENV === 'development') {
              console.log("AudioPlayer: M3U8 fetch aborted");
            }
            return null;
          }
          
          // Более подробное логирование ошибок только в development
          if (process.env.NODE_ENV === 'development') {
            console.error(`AudioPlayer: Failed to fetch M3U8: ${err.name} - ${err.message}`);
            if (err.stack) {
              console.error(`AudioPlayer: Error stack: ${err.stack}`);
            }
          } else {
            console.warn(`AudioPlayer: Failed to fetch M3U8: ${err.message}`);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.error("AudioPlayer: Unknown error fetching M3U8:", err);
          }
        }
        
        if (mountedRef.current) {
          setError("Could not load audio. Please try again.");
          toast.error("Could not load audio. Please try again.");
        }
        return null;
      }
    },
    [createSegmentUrl, preloadSegment],
  );

  // Оптимизированное создание манифеста с предзагрузкой сегментов
  const createManifest = useCallback(
    async (content: string) => {
      console.log("Processing M3U8 content:", content.substring(0, 100) + "...");
      const lines = content.split("\n").filter((line) => line.trim());
      const segments: string[] = [];
      
      // Проверяем, начинается ли плейлист с #EXTM3U
      let manifest = "";
      if (!lines[0]?.startsWith("#EXTM3U")) {
        manifest = "#EXTM3U\n";
      }
      
      // Флаги для отслеживания обязательных заголовков
      let hasVersion = false;
      let hasTargetDuration = false;
      let hasMediaSequence = false;
      let hasExtinf = false;
      
      // Проверяем наличие EXTINF в исходном контенте
      for (const line of lines) {
        if (line.trim().startsWith("#EXTINF")) {
          hasExtinf = true;
          break;
        }
      }
      
      // Первый проход: сохраняем все заголовки и проверяем наличие обязательных
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Добавляем строку в манифест, если это заголовок
        if (trimmedLine.startsWith("#")) {
          // Не дублируем #EXTM3U, если он уже добавлен
          if (trimmedLine === "#EXTM3U" && manifest.startsWith("#EXTM3U")) {
            continue;
          }
          
          manifest += trimmedLine + "\n";
          
          // Отмечаем наличие обязательных заголовков
          if (trimmedLine.startsWith("#EXT-X-VERSION")) {
            hasVersion = true;
          } else if (trimmedLine.startsWith("#EXT-X-TARGETDURATION")) {
            hasTargetDuration = true;
          } else if (trimmedLine.startsWith("#EXT-X-MEDIA-SEQUENCE")) {
            hasMediaSequence = true;
          }
        }
      }
      
      // Добавляем отсутствующие обязательные заголовки
      if (!hasVersion) {
        manifest += "#EXT-X-VERSION:3\n";
      }
      if (!hasTargetDuration) {
        manifest += "#EXT-X-TARGETDURATION:10\n";
      }
      if (!hasMediaSequence) {
        manifest += "#EXT-X-MEDIA-SEQUENCE:0\n";
      }

      // Второй проход: собираем сегменты для предзагрузки
      let i = 0;
      let currentDuration = "";
      const segmentUrls: Array<{url: string, duration: string}> = [];
      
      while (i < lines.length) {
        const line = lines[i].trim();

        // Обработка информации о длительности сегмента
        if (line.startsWith("#EXTINF")) {
          currentDuration = line;
          i++;
          continue;
        }
        
        // Пропускаем заголовки
        if (line.startsWith("#")) {
          i++;
          continue;
        }
        
        // Обработка сегмента (не начинается с #)
        if (line && !line.startsWith("#")) {
          // Создаем URL для сегмента
          const segmentUrl = createSegmentUrl(line);
          if (segmentUrl) {
            segmentUrls.push({ url: segmentUrl, duration: currentDuration });
          } else {
            console.warn(`AudioPlayer: Failed to create URL for segment: ${line}`);
          }
          
          // Сбрасываем информацию о длительности
          currentDuration = "";
        }
        
        i++;
      }
      
      console.log(`AudioPlayer: Found ${segmentUrls.length} segments in manifest`);
      
      // Предзагружаем первые 6 сегментов параллельно для более быстрого старта
      const preloadCount = Math.min(6, segmentUrls.length);
      if (preloadCount > 0) {
        console.log(`AudioPlayer: Preloading first ${preloadCount} segments with high priority`);
        
        // Разделяем сегменты на критические (первые 2) и остальные для приоритизации
        const criticalSegments = segmentUrls.slice(0, 2);
        const otherInitialSegments = segmentUrls.slice(2, preloadCount);
        
        // Сначала загружаем критические сегменты
        try {
          console.log(`AudioPlayer: Loading ${criticalSegments.length} critical segments first`);
          const criticalResults = await Promise.allSettled(
            criticalSegments.map(segment => preloadSegment(segment.url))
          );
          
          const criticalSuccessCount = criticalResults.filter(r => r.status === 'fulfilled').length;
          console.log(`AudioPlayer: Successfully preloaded ${criticalSuccessCount}/${criticalSegments.length} critical segments`);
          
          // Затем загружаем остальные начальные сегменты
          console.log(`AudioPlayer: Now loading ${otherInitialSegments.length} additional initial segments`);
          const otherResults = await Promise.allSettled(
            otherInitialSegments.map(segment => preloadSegment(segment.url))
          );
          
          const otherSuccessCount = otherResults.filter(r => r.status === 'fulfilled').length;
          console.log(`AudioPlayer: Successfully preloaded ${otherSuccessCount}/${otherInitialSegments.length} additional initial segments`);
          
          // Объединяем результаты для повторных попыток
          const allResults = [...criticalResults, ...otherResults];
          const failedIndices = allResults
            .map((result, index) => result.status === 'rejected' ? index : -1)
            .filter(index => index !== -1);
          
          if (failedIndices.length > 0) {
            console.log(`AudioPlayer: Retrying ${failedIndices.length} failed segment preloads with exponential backoff`);
            
            // Используем экспоненциальную задержку для повторных попыток
            failedIndices.forEach((index, retryIndex) => {
              const retryDelay = 300 * Math.pow(1.5, retryIndex); // Экспоненциальная задержка
              setTimeout(() => {
                if (mountedRef.current) {
                  const segmentIndex = index < criticalSegments.length ? 
                    index : index - criticalSegments.length + 2;
                  
                  console.log(`AudioPlayer: Retry attempt for segment ${segmentIndex}`);
                  preloadSegment(segmentUrls[segmentIndex].url).catch(err => {
                    console.warn(`AudioPlayer: Retry preload error for segment ${segmentIndex}:`, err);
                  });
                }
              }, retryDelay);
            });
          }
        } catch (error) {
          console.warn(`AudioPlayer: Error during segment preloading:`, error);
          // Продолжаем даже при ошибке предзагрузки
        }
      }
      
      // Запускаем предзагрузку следующих сегментов в фоне с приоритизацией
      if (segmentUrls.length > preloadCount) {
        console.log(`AudioPlayer: Starting background preload for next segments`);
        
        // Предзагружаем следующие сегменты в порядке приоритета с интервалами
        const remainingSegments = segmentUrls.slice(preloadCount);
        const maxBackgroundPreload = Math.min(10, remainingSegments.length); // Увеличиваем количество предзагружаемых сегментов
        
        // Используем интервалы для распределения нагрузки с адаптивными задержками
        const baseDelay = 600; // Уменьшаем базовую задержку для более быстрой загрузки
        
        for (let i = 0; i < maxBackgroundPreload; i++) {
          // Адаптивная задержка - более важные сегменты загружаются раньше
          const delay = baseDelay + (i * Math.min(150, 50 * Math.floor(i/2))); 
          setTimeout(() => {
            if (mountedRef.current) { // Проверяем, что компонент все еще смонтирован
              console.log(`AudioPlayer: Background preloading segment ${preloadCount + i}`);
              preloadSegment(remainingSegments[i].url)
                .then(() => {
                  // При успешной загрузке пытаемся загрузить следующий сегмент за пределами текущего диапазона
                  const nextIndex = preloadCount + maxBackgroundPreload + i;
                  if (nextIndex < segmentUrls.length && mountedRef.current) {
                    setTimeout(() => {
                      preloadSegment(segmentUrls[nextIndex].url).catch(() => {});
                    }, 200);
                  }
                })
                .catch(err => {
                  console.warn(`AudioPlayer: Background preload error for segment ${preloadCount + i}:`, err);
                });
            }
          }, delay);
        }
      }
      
      // Добавляем сегменты в манифест
      for (const segment of segmentUrls) {
        // Если у нас нет информации о длительности и в исходном контенте нет EXTINF,
        // добавляем стандартную длительность
        if (!segment.duration && !hasExtinf) {
          manifest += "#EXTINF:10.0,\n";
        } else if (segment.duration) {
          manifest += segment.duration + "\n";
        }
        
        manifest += segment.url + "\n";
        segments.push(segment.url);
      }

      // Добавляем маркер конца плейлиста, если его нет
      if (!manifest.includes("#EXT-X-ENDLIST")) {
        manifest += "#EXT-X-ENDLIST\n";
      }

      console.log(`AudioPlayer: Created manifest with ${segments.length} segments`);
      console.log(`AudioPlayer: Created optimized manifest:\n${manifest.substring(0, 500)}${manifest.length > 500 ? "..." : ""}`);
      return manifest;
    },
    [createSegmentUrl, preloadSegment],
  );

  // Безопасное воспроизведение с retry логикой
  const safePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: Audio element reference is missing in safePlay");
      }
      return;
    }
    
    if (!isInitializedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("AudioPlayer: Attempted to play before initialization");
      }
      return;
    }
    
    if (!mountedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("AudioPlayer: Attempted to play after component unmounted");
      }
      return;
    }

    try {
      // Отменяем предыдущий промис
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Игнорируем ошибки отмененного промиса
          if (process.env.NODE_ENV === 'development') {
            console.log("Previous play promise was canceled", e);
          }
        }
      }
      
      // Проверяем состояние аудио элемента
      if (process.env.NODE_ENV === 'development') {
        console.log(`Audio state before play: readyState=${audio.readyState}, paused=${audio.paused}, currentTime=${audio.currentTime}, duration=${audio.duration}`);
      }

      if (
        audio.paused &&
        audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Starting playback...");
        }
        playPromiseRef.current = audio.play();
        try {
          await playPromiseRef.current;
          playPromiseRef.current = null;
          retryCountRef.current = 0; // Сброс счетчика retry при успехе
          if (process.env.NODE_ENV === 'development') {
            console.log("Playback started successfully");
          }
          
          // Сбрасываем ошибки при успешном воспроизведении
          if (error) {
            setError(null);
          }
        } catch (err) {
          playPromiseRef.current = null;
          
          if (err instanceof Error) {
            if (err.name === "AbortError") {
              if (process.env.NODE_ENV === 'development') {
                console.log("Play aborted");
              }
              return;
            } else if (err.name === "NotAllowedError") {
              if (process.env.NODE_ENV === 'development') {
                console.warn("Play not allowed by browser - user must interact with the page first");
              }
              toast.error("Please interact with the page to enable audio playback");
              return;
            }
          }
          throw err;
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Not ready to play: readyState=${audio.readyState}, paused=${audio.paused}`,
          );
        }
        
        // Если аудио не готово, но HLS инициализирован, пробуем перезагрузить
        if (hlsRef.current && isInitializedRef.current) {
          if (process.env.NODE_ENV === 'development') {
            console.log("Attempting to reload HLS stream...");
          }
          try {
            hlsRef.current.startLoad();
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.error("Error reloading HLS stream:", err);
            }
          }
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error playing audio:", error);
      }

      // Retry логика для временных ошибок
      if (retryCountRef.current < 3 && mountedRef.current) {
        retryCountRef.current++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`Retrying play attempt ${retryCountRef.current}/3`);
        }
        setTimeout(() => {
          if (mountedRef.current && isPlaying) {
            safePlay();
          }
        }, 1000 * retryCountRef.current);
      } else {
        onPause();
        if (mountedRef.current) {
          setError("Could not play audio. Please try again.");
          toast.error("Could not play audio. Please try again.");
        }
      }
    }
  }, [isPlaying, onPause, error]);

  // Безопасная пауза
  const safePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: Audio element reference is missing in safePause");
      }
      return;
    }
    
    if (!isInitializedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("AudioPlayer: Attempted to pause before initialization");
      }
      return;
    }
    
    if (!mountedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("AudioPlayer: Attempted to pause after component unmounted");
      }
      return;
    }

    try {
      if (!audio.paused) {
        audio.pause();
      }
      playPromiseRef.current = null;
      retryCountRef.current = 0; // Сброс счетчика retry при успешной паузе
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error pausing audio:", error);
      }
      if (mountedRef.current) {
        setError("Could not pause audio. Please try again.");
        toast.error("Could not pause audio. Please try again.");
      }
    }
  }, []);

  // Основной эффект инициализации
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: Audio element reference is missing");
      }
      return;
    }
    
    if (!m3u8Url) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: Missing m3u8Url");
      }
      setError("Missing audio source");
      return;
    }

    mountedRef.current = true;
    if (process.env.NODE_ENV === 'development') {
      console.log(`AudioPlayer: Initializing with URL: ${m3u8Url}`);
    }
    
    // Инициализация HLS
  // Инициализация HLS с проверкой URL
  const initializeHls = async (url: string): Promise<string | null> => {
    if (!url) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: No URL provided for HLS initialization");
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`AudioPlayer: Initializing HLS with URL: ${url}`);
    }
    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0; // Сбрасываем счетчик попыток при новой инициализации

    try {
      // Проверяем формат URL
      if (!url.startsWith("http") && !url.startsWith("/")) {
        // Если URL не начинается с http или /, пробуем создать URL через createBucketUrl
        try {
          const bucketUrl = createSegmentUrl(url);
          if (bucketUrl) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`AudioPlayer: Created bucket URL: ${bucketUrl} from: ${url}`);
            }
            url = bucketUrl;
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`AudioPlayer: Could not create bucket URL for: ${url}`, error);
          }
          // Продолжаем с исходным URL
        }
      }
      
      // Здесь должен быть вызов setupHls с обработанным URL
      return url; // Возвращаем обработанный URL для использования в setupHls
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("AudioPlayer: Error initializing HLS:", error);
        if (error instanceof Error) {
          console.error(`AudioPlayer: Error name: ${error.name}, message: ${error.message}`);
          if (error.stack) {
            console.error(`AudioPlayer: Error stack: ${error.stack}`);
          }
        }
      } else {
        if (error instanceof Error) {
          console.warn(`AudioPlayer: HLS init error - ${error.message}`);
        }
      }
      
      if (mountedRef.current) {
        setError("Failed to initialize audio player. Please try again.");
        toast.error("Failed to initialize audio player. Please try again.");
      }
      return null;
    }
  };

    const setupHls = async (url?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        retryCountRef.current = 0;

        // Используем переданный URL или URL из пропсов
        const sourceUrl = url || m3u8Url;

        // Создаем новый AbortController для этого запроса
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Очищаем предыдущий Blob URL
        if (manifestBlobRef.current) {
          URL.revokeObjectURL(manifestBlobRef.current);
          manifestBlobRef.current = null;
        }
        
        // Проверяем и инициализируем URL через initializeHls
        const processedUrl = await initializeHls(sourceUrl);
        if (!processedUrl) {
          console.error("AudioPlayer: Failed to initialize URL");
          if (mountedRef.current) {
            setIsLoading(false);
            setError("Failed to initialize audio source");
          }
          return;
        }

        // Загружаем манифест с обработанным URL
        console.log(`AudioPlayer: Fetching M3U8 content from ${processedUrl}`);
        const content = await fetchM3U8Content(
          processedUrl,
          abortControllerRef.current.signal,
        );
        
        if (!content) {
          console.error("AudioPlayer: Failed to fetch M3U8 content");
          if (mountedRef.current) {
            setIsLoading(false);
            setError("Failed to load audio source");
          }
          return;
        }
        
        if (!mountedRef.current) {
          console.log("AudioPlayer: Component unmounted during fetch");
          return;
        }

        // Создаем оптимизированный манифест
        console.log("AudioPlayer: Creating manifest from content");
        const manifest = await createManifest(content);
        const blob = new Blob([manifest], { type: "application/x-mpegURL" });
        const manifestUrl = URL.createObjectURL(blob);
        manifestBlobRef.current = manifestUrl;
        console.log("AudioPlayer: Manifest blob URL created");

        if (Hls.isSupported()) {
          console.log("AudioPlayer: HLS is supported");
          // Очищаем предыдущий HLS
          if (hlsRef.current) {
            try {
              hlsRef.current.stopLoad();
              hlsRef.current.detachMedia();
              hlsRef.current.destroy();
              console.log("AudioPlayer: Previous HLS instance cleaned up");
            } catch (err) {
              console.warn("Error cleaning up previous HLS:", err);
            }
          }

          // Улучшенная конфигурация HLS для аудио
          const hlsConfig: Partial<Hls["config"]> = {
            enableWorker: true, // Включаем Web Worker для улучшения производительности
            lowLatencyMode: true, // Режим низкой задержки
            backBufferLength: 30, // Увеличиваем буфер назад для лучшего перемещения по треку
            maxBufferSize: 12 * 1024 * 1024, // 12MB для лучшей буферизации
            maxBufferLength: 40, // Увеличиваем максимальную длину буфера
            maxMaxBufferLength: 90, // Увеличиваем абсолютный максимум буфера
            startLevel: -1, // Автоматический выбор качества
            manifestLoadingTimeOut: PRELOAD_SEGMENT_TIMEOUT, // Используем константу для таймаута
            manifestLoadingMaxRetry: 8, // Увеличиваем количество попыток загрузки манифеста
            levelLoadingTimeOut: PRELOAD_SEGMENT_TIMEOUT, // Используем константу для таймаута
            levelLoadingMaxRetry: 8, // Увеличиваем количество попыток загрузки уровня
            fragLoadingTimeOut: PRELOAD_SEGMENT_TIMEOUT + 2000, // Таймаут для фрагментов
            fragLoadingMaxRetry: 8, // Увеличиваем количество попыток загрузки фрагмента
            testBandwidth: true, // Включаем тестирование пропускной способности
            progressive: true, // Прогрессивная загрузка
            maxBufferHole: 0.01, // Уменьшаем максимальный размер дыры в буфере для более плавного воспроизведения
            highBufferWatchdogPeriod: 1, // Уменьшаем период проверки высокого буфера
            nudgeOffset: 0.01, // Уменьшаем смещение для более плавного воспроизведения
            nudgeMaxRetry: 10, // Увеличиваем максимальное количество попыток nudge
            appendErrorMaxRetry: 10, // Увеличиваем максимальное количество попыток добавления
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            maxLiveSyncPlaybackRate: 1.2,
            abrEwmaFastLive: 1.5, // Оптимизируем для более быстрой адаптации
            abrEwmaSlowLive: 3, // Оптимизируем для более стабильной адаптации
            abrMaxWithRealBitrate: true, // Используем реальный битрейт
            maxStarvationDelay: 1, // Уменьшаем задержку при голодании
            maxLoadingDelay: 1, // Уменьшаем максимальную задержку загрузки
            initialLiveManifestSize: 1, // Минимальный размер для начала воспроизведения
            manifestLoadingRetryDelay: 500, // Уменьшаем задержку между повторными попытками загрузки манифеста
            manifestLoadingMaxRetryTimeout: 30000, // Максимальное время для повторных попыток загрузки манифеста
            levelLoadingRetryDelay: 500, // Уменьшаем задержку между повторными попытками загрузки уровня
            fragLoadingRetryDelay: 500, // Уменьшаем задержку между повторными попытками загрузки фрагмента
            fragLoadingMaxRetryTimeout: 30000, // Максимальное время для повторных попыток загрузки фрагмента
            startFragPrefetch: true, // Начинаем предзагрузку фрагментов
            debug: false // Отключаем отладку в продакшене для улучшения производительности
          };

          const hls = new Hls(hlsConfig);
          hlsRef.current = hls;
          console.log("AudioPlayer: New HLS instance created");

          // Улучшенные обработчики событий HLS с расширенной обработкой ошибок
          hls.on(Hls.Events.ERROR, (_, data) => {
            // Игнорируем AbortError в production
            if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR && 
                data.response && data.response.code === 0) {
              if (process.env.NODE_ENV === 'development') {
                console.warn("AudioPlayer: HLS AbortError (normal during cleanup)");
              }
              return;
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.warn("AudioPlayer: HLS Error:", data.type, data.details, data.fatal);
              
              // Добавляем более подробную информацию об ошибке
              if (data.response) {
                console.error(`AudioPlayer: Error details - status: ${data.response.code}, message: ${data.response.text}`);
              }
            }

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  if (retryCountRef.current < 8) { // Увеличиваем максимальное количество попыток
                    retryCountRef.current++;
                    if (process.env.NODE_ENV === 'development') {
                      console.log(
                        `AudioPlayer: Network error, retrying... (${retryCountRef.current}/8)`,
                      );
                    }
                    
                    // Экспоненциальная задержка перед повторной попыткой с джиттером
                    const baseDelay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
                    const jitter = Math.random() * 500; // Добавляем случайный джиттер до 500мс
                    const backoffDelay = baseDelay + jitter;
                    
                    setTimeout(() => {
                      if (hlsRef.current && mountedRef.current) {
                        // Перед повторной попыткой проверяем сетевое соединение
                        if (navigator.onLine) {
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`AudioPlayer: Restarting load after ${Math.round(backoffDelay)}ms delay`);
                          }
                          
                          // Пробуем сначала остановить и очистить загрузку перед повторной попыткой
                          try {
                            hls.stopLoad();
                            // Небольшая пауза перед перезапуском загрузки
                            setTimeout(() => {
                              if (mountedRef.current && hlsRef.current) {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('AudioPlayer: Reloading source after network error');
                                }
                                // Используем текущий URL из HLS
                                if (hlsRef.current.url) {
                                  hls.loadSource(hlsRef.current.url);
                                  hls.startLoad();
                                }
                              }
                            }, 100);
                          } catch (e) {
                            if (process.env.NODE_ENV === 'development') {
                              console.warn('AudioPlayer: Error during load reset:', e);
                            }
                            // Если очистка не удалась, просто перезапускаем загрузку
                            hls.startLoad();
                          }
                        } else {
                          if (process.env.NODE_ENV === 'development') {
                            console.warn("AudioPlayer: Device is offline, waiting for connection");
                          }
                          setError("Нет подключения к интернету. Ожидание сети...");
                          // Добавляем слушатель для автоматического возобновления при появлении сети
                          const onlineHandler = () => {
                            if (process.env.NODE_ENV === 'development') {
                              console.log("AudioPlayer: Network connection restored, restarting load");
                            }
                            setError("Соединение восстановлено. Загрузка...");
                            if (hlsRef.current && mountedRef.current) {
                              // Сбрасываем счетчик попыток при восстановлении соединения
                              retryCountRef.current = 0;
                              
                              // Небольшая задержка для стабилизации соединения
                              setTimeout(() => {
                                if (mountedRef.current && hlsRef.current && hlsRef.current.url) {
                                  hls.loadSource(hlsRef.current.url);
                                  hls.startLoad();
                                }
                              }, 1000);
                              window.removeEventListener('online', onlineHandler);
                            }
                          };
                          window.addEventListener('online', onlineHandler);
                        }
                      }
                    }, backoffDelay);
                  } else {
                    setError("Не удалось установить соединение с сервером");
                    toast.error("Не удалось установить соединение. Пожалуйста, проверьте интернет и попробуйте позже.");
                  }
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  if (process.env.NODE_ENV === 'development') {
                    console.log("AudioPlayer: Media error, attempting recovery...");
                  }
                  try {
                    // Улучшенная стратегия восстановления после ошибки медиа
                    const mediaErrorAttempt = mediaErrorRecoveryAttemptRef.current;
                    mediaErrorRecoveryAttemptRef.current++;
                    
                    // Сначала пробуем стандартное восстановление
                    hls.recoverMediaError();
                    
                    // Если первая попытка не удалась, пробуем более агрессивное восстановление
                    if (mediaErrorAttempt < 3) { // Увеличиваем количество попыток восстановления
                      // Сбрасываем текущее время и пробуем снова с разными стратегиями
                      if (audioRef.current) {
                        // Пробуем разные стратегии восстановления в зависимости от номера попытки
                        switch (mediaErrorAttempt) {
                          case 0:
                            // Первая попытка: сброс на начало текущего сегмента
                            if (process.env.NODE_ENV === 'development') {
                              console.log('AudioPlayer: Recovery strategy 1: Reset to current segment');
                            }
                            audioRef.current.currentTime = Math.floor(audioRef.current.currentTime);
                            break;
                          case 1:
                            // Вторая попытка: сброс на предыдущий сегмент
                            if (process.env.NODE_ENV === 'development') {
                              console.log('AudioPlayer: Recovery strategy 2: Reset to previous segment');
                            }
                            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
                            break;
                          case 2:
                            // Третья попытка: полный сброс
                            if (process.env.NODE_ENV === 'development') {
                              console.log('AudioPlayer: Recovery strategy 3: Full reset');
                            }
                            audioRef.current.currentTime = 0;
                            break;
                        }
                      }
                      
                      setTimeout(() => {
                        if (mountedRef.current && hlsRef.current) {
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`AudioPlayer: Retry media error recovery (${mediaErrorAttempt + 1}/3)...`);
                          }
                          try {
                            hls.recoverMediaError();
                            
                            // Если восстановление успешно, пробуем воспроизвести
                            if (audioRef.current && audioRef.current.paused) {
                              audioRef.current.play().catch(e => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error('AudioPlayer: Error resuming playback:', e);
                                }
                                // Если воспроизведение не удалось, пробуем перезагрузить HLS
                                if (mountedRef.current && hlsRef.current) {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log('AudioPlayer: Reloading HLS after failed recovery...');
                                  }
                                  hls.destroy();
                                  // Используем m3u8Url из пропсов для перезагрузки
                                  setupHls(m3u8Url);
                                }
                              });
                            }
                          } catch (e) {
                            if (process.env.NODE_ENV === 'development') {
                              console.error('AudioPlayer: Error during media recovery:', e);
                            }
                            // Если восстановление не удалось, пробуем перезагрузить HLS
                            if (mountedRef.current && hlsRef.current) {
                              if (process.env.NODE_ENV === 'development') {
                                console.log('AudioPlayer: Reloading HLS after failed recovery...');
                              }
                              hls.destroy();
                              // Используем m3u8Url из пропсов для перезагрузки
                              setupHls(m3u8Url);
                            }
                          }
                        }
                      }, 500 * (mediaErrorAttempt + 1)); // Увеличиваем задержку с каждой попыткой
                    } else {
                      // Если все попытки не удались, перезагружаем HLS полностью
                      if (process.env.NODE_ENV === 'development') {
                        console.log('AudioPlayer: All recovery attempts failed. Reloading HLS...');
                      }
                      if (mountedRef.current && hlsRef.current) {
                        mediaErrorRecoveryAttemptRef.current = 0; // Сбрасываем счетчик
                        hls.destroy();
                        // Используем m3u8Url из пропсов для перезагрузки
                        setupHls(m3u8Url);
                      }
                    }
                  } catch (err) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error("AudioPlayer: Failed to recover from media error:", err);
                    }
                    setError("Ошибка воспроизведения медиа");
                    toast.error("Ошибка воспроизведения. Пожалуйста, попробуйте другой трек.");
                  }
                  break;
                default:
                  setError("Произошла ошибка воспроизведения");
                  toast.error("Произошла ошибка воспроизведения. Пожалуйста, попробуйте еще раз.");
                  // Для других критических ошибок пробуем перезагрузить HLS
                  if (mountedRef.current && hlsRef.current) {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('AudioPlayer: Attempting to recover from fatal error by reloading');
                    }
                    setTimeout(() => {
                      if (mountedRef.current && hlsRef.current) {
                        hls.destroy();
                        // Используем m3u8Url из пропсов для перезагрузки
                        setupHls(m3u8Url);
                      }
                    }, 1000);
                  }
                  break;
              }
            } else {
              // Улучшенная обработка некритических ошибок
              if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn("AudioPlayer: Fragment load error - attempting recovery");
                }
                
                // Пробуем перезагрузить проблемный фрагмент
                if (data.frag && data.frag.url) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`AudioPlayer: Attempting to reload fragment: ${data.frag.sn}`);
                  }
                  // Для некритических ошибок фрагментов можно увеличить буфер
                  if (hlsRef.current) {
                    // Временно увеличиваем размер буфера для лучшей устойчивости
                    const currentMaxBufferLength = hlsRef.current.config.maxBufferLength || 30;
                    hlsRef.current.config.maxBufferLength = Math.min(90, currentMaxBufferLength + 10);
                    
                    // Возвращаем обратно через некоторое время
                    setTimeout(() => {
                      if (hlsRef.current && mountedRef.current) {
                        hlsRef.current.config.maxBufferLength = currentMaxBufferLength;
                      }
                    }, 30000);
                  }
                }
              } else if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn("AudioPlayer: Buffer stalled - attempting recovery");
                }
                
                // Проверяем состояние буфера
                if (audioRef.current) {
                  const buffered = audioRef.current.buffered;
                  if (process.env.NODE_ENV === 'development') {
                    let bufferInfo = 'Buffer state: ';
                    for (let i = 0; i < buffered.length; i++) {
                      bufferInfo += `[${buffered.start(i).toFixed(2)}-${buffered.end(i).toFixed(2)}] `;
                    }
                    console.log(bufferInfo);
                  }
                  
                  // Если аудио воспроизводится, пробуем стратегию паузы и воспроизведения
                  if (!audioRef.current.paused) {
                    audioRef.current.pause();
                    setTimeout(() => {
                      if (mountedRef.current && audioRef.current) {
                        // Увеличиваем приоритет загрузки буфера
                        if (hlsRef.current) {
                          const currentMaxBufferLength = hlsRef.current.config.maxBufferLength || 30;
                          hlsRef.current.config.maxBufferLength = Math.min(90, currentMaxBufferLength + 15);
                        }
                        
                        audioRef.current.play().catch(e => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('AudioPlayer: Error resuming after buffer stall:', e);
                          }
                          // Если воспроизведение не удалось, пробуем еще раз через секунду
                          setTimeout(() => {
                            if (mountedRef.current && audioRef.current) {
                              audioRef.current.play().catch(e2 => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error('AudioPlayer: Repeated error resuming:', e2);
                                }
                              });
                            }
                          }, 1000);
                        });
                      }
                    }, 500);
                  }
                }
              } else if (data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('AudioPlayer: Buffer append error - attempting recovery');
                }
                // Для ошибок добавления в буфер можно попробовать очистить буфер и перезагрузить
                if (hlsRef.current) {
                  // BUFFER_RESET требует два аргумента: event и data (data может быть пустым объектом)
                  hlsRef.current.trigger(Hls.Events.BUFFER_RESET, undefined);
                }
              }
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            if (!mountedRef.current) return;
            if (process.env.NODE_ENV === 'development') {
              console.log(`AudioPlayer: HLS manifest parsed successfully with ${data.levels.length} quality level(s)`);
            }
            setIsLoading(false);
            isInitializedRef.current = true;
            hls.startLoad();
          });

          hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            if (!mountedRef.current) return;
            if (process.env.NODE_ENV === 'development') {
              console.log(`AudioPlayer: Fragment loaded: ${data.frag.sn}/${data.frag.level}`);
            }
            setError(null); // Очищаем ошибки при успешной загрузке фрагментов
          });
          
          // Добавляем обработчик успешной загрузки уровня
          hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            if (!mountedRef.current) return;
            if (process.env.NODE_ENV === 'development') {
              console.log(`AudioPlayer: Level ${data.level} loaded with ${data.details.fragments.length} fragments`);
            }
            setError(null);
          });

          if (process.env.NODE_ENV === 'development') {
            console.log("AudioPlayer: Loading source and attaching media");
          }
          hls.loadSource(manifestBlobRef.current);
          hls.attachMedia(audio);
        } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          // Нативная поддержка HLS
          if (process.env.NODE_ENV === 'development') {
            console.log("AudioPlayer: Using native HLS support");
          }
          audio.src = manifestBlobRef.current || sourceUrl;
          audio.addEventListener("loadedmetadata", () => {
            if (mountedRef.current) {
              setIsLoading(false);
              isInitializedRef.current = true;
              if (process.env.NODE_ENV === 'development') {
                console.log("Native HLS loaded successfully");
              }
            }
          });
        } else {
          console.error("AudioPlayer: Browser does not support HLS playback");
          setError("Your browser does not support HLS playback.");
          toast.error("Your browser does not support audio playback. Please try a different browser.");
          setIsLoading(false);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error in setupHLS:", err);
          if (err instanceof Error) {
            console.error(`AudioPlayer: Error name: ${err.name}, message: ${err.message}`);
            if (err.stack) {
              console.error(`AudioPlayer: Error stack: ${err.stack}`);
            }
          }
        } else {
          // В production только основная информация об ошибке
          if (err instanceof Error) {
            console.warn(`AudioPlayer: Setup error - ${err.message}`);
          }
        }
        if (mountedRef.current) {
          setError("Could not initialize audio player.");
          toast.error("Could not initialize audio player. Please try again.");
          setIsLoading(false);
        }
      }
    };

    setupHls();

    return () => {
      mountedRef.current = false;
      isInitializedRef.current = false;

      // Отменяем текущие запросы
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Error aborting controller:", err);
          }
        }
      }

      // Очищаем HLS
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
          hlsRef.current = null;
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Error cleaning up HLS:", err);
          }
        }
      }

      // Очищаем аудио
      if (audio) {
        try {
          audio.pause();
          audio.src = "";
          audio.load();
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Error cleaning up audio:", err);
          }
        }
      }

      // Очищаем blob URL
      if (manifestBlobRef.current) {
        try {
          URL.revokeObjectURL(manifestBlobRef.current);
          manifestBlobRef.current = null;
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Error revoking object URL:", err);
          }
        }
      }
    };
  }, [m3u8Url, createManifest, fetchM3U8Content]);

  // Управление воспроизведением
  useEffect(() => {
    if (!isInitializedRef.current || !mountedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        if (isPlaying) {
          safePlay();
        } else {
          safePause();
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, safePlay, safePause]);

  // Обработчики событий аудио
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (mountedRef.current) {
        onPause();
      }
    };
    
    // Обработчик ошибок аудио с детальной диагностикой
    const handleAudioError = (e: Event) => {
      if (!mountedRef.current) return;
      
      const audio = e.target as HTMLAudioElement;
      const errorCode = audio.error ? audio.error.code : 'unknown';
      const errorMessage = audio.error ? audio.error.message : 'Unknown error';
      
      // В development режиме логируем подробно, в production - минимально
      if (process.env.NODE_ENV === 'development') {
        console.error(`AudioPlayer: Audio error detected - code=${errorCode}, message=${errorMessage}`);
        console.error('Error event details:', e);
        
        // Проверяем состояние аудио элемента
        if (audio) {
          console.log(`Audio state during error: readyState=${audio.readyState}, paused=${audio.paused}, currentTime=${audio.currentTime}, networkState=${audio.networkState}`);
        }
        
        // Проверяем состояние HLS
        if (hlsRef.current) {
          console.log('HLS state during error:', hlsRef.current.levels, hlsRef.current.currentLevel);
        }
      } else {
        // В production только основная информация
        console.warn(`AudioPlayer: Audio error - code=${errorCode}`);
      }
      
      // Формируем понятное сообщение для пользователя
      let userMessage = "Ошибка воспроизведения аудио";
      let recoveryAttempted = false;
      
      if (audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            userMessage = "Воспроизведение было прервано";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            userMessage = "Ошибка сети при загрузке аудио";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            userMessage = "Ошибка декодирования аудио";
            // Попытка восстановления для ошибок декодирования
            if (hlsRef.current) {
              if (process.env.NODE_ENV === 'development') {
                console.log("Attempting to recover from media decode error...");
              }
              try {
                hlsRef.current.recoverMediaError();
                recoveryAttempted = true;
              } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                  console.error("Failed to recover from media error:", err);
                }
              }
            }
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            userMessage = "Формат аудио не поддерживается";
            break;
        }
      }
      
      // Устанавливаем ошибку и показываем уведомление
      setError(userMessage);
      toast.error(userMessage + ". Пожалуйста, попробуйте еще раз.");
      
      // Останавливаем воспроизведение
      onPause();
      
      // Если не было попытки восстановления, пробуем перезагрузить HLS
      if (!recoveryAttempted && hlsRef.current && isInitializedRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Attempting to reload HLS after error...");
        }
        try {
          setTimeout(() => {
            if (hlsRef.current && mountedRef.current) {
              hlsRef.current.startLoad();
            }
          }, 1000);
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Failed to reload HLS after error:", err);
          }
        }
      }
    };

    // Обработчик ошибок для обратной совместимости
    const handleError = (e: Event) => {
      // Делегируем обработку ошибок в более детальную функцию
      handleAudioError(e);
    };

    const handleWaiting = () => {
      if (mountedRef.current) {
        setIsLoading(true);
      }
    };

    const handlePlaying = () => {
      if (mountedRef.current) {
        setIsLoading(false);
        setError(null);
      }
    };

    const handleCanPlay = () => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    // Добавляем обработчики
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleAudioError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleAudioError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [onPause, handleTimeUpdate, handleLoadedMetadata, isInitializedRef]);

  // Форматирование времени
  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Обработчик клика по прогресс-бару
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || isLoading || !duration || error) return;

      const bounds = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - bounds.left) / bounds.width;
      const newTime = Math.max(0, Math.min(duration, percent * duration));
      const audio = audioRef.current;
      const wasPlaying = !audio.paused;

      try {
        if (wasPlaying) {
          audio.pause();
        }

        audio.currentTime = newTime;
        setCurrentTime(newTime);

        if (hlsRef.current) {
          setTimeout(() => {
            if (hlsRef.current && mountedRef.current) {
              hlsRef.current.startLoad();
              if (wasPlaying) {
                setTimeout(() => {
                  if (wasPlaying && audio.paused && mountedRef.current) {
                    audio.play().catch(console.warn);
                  }
                }, 200);
              }
            }
          }, 100);
        } else if (wasPlaying) {
          setTimeout(() => {
            if (wasPlaying && audio.paused && mountedRef.current) {
              audio.play().catch(console.warn);
            }
          }, 100);
        }
      } catch (error) {
        console.warn("Error during seek:", error);
      }
    },
    [duration, isLoading, error],
  );

  // Cleanup на размонтирование
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-4 w-full p-3">
      <Toaster position="top-right" />

      <motion.button
        onClick={isPlaying ? onPause : onPlay}
        className="text-white hover:text-[#20DDBB] transition-colors disabled:opacity-50"
        whileHover={{ scale: isLoading ? 1 : 1.1 }}
        whileTap={{ scale: isLoading ? 1 : 0.9 }}
        disabled={isLoading || error !== null}
        title={
          error ? "Audio error - click to retry" : isPlaying ? "Pause" : "Play"
        }
      >
        {isLoading ? (
          <div className="w-7 h-7 rounded-full border-2 border-[#20DDBB] border-t-transparent animate-spin" />
        ) : error ? (
          <div className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300">
            ⚠️
          </div>
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
          {/* Индикатор буфера */}
          <div
            className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-300"
            style={{ width: `${bufferHealth}%` }}
          />

          {/* Прогресс воспроизведения */}
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
              transition: "left 0.1s linear, opacity 0.3s ease",
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

export default AudioPlayer;
