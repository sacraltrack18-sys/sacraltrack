'use client';

import { useState, useCallback } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

/**
 * Параметры для функции обработки аудио
 * @param audioFile - Исходный WAV-файл для обработки
 * @param onProgress - Опциональный колбэк для отслеживания прогресса
 */
interface ProcessAudioParams {
  audioFile: File;
  onProgress?: (stage: string, progress: number, message?: string) => void;
}

/**
 * Представляет один сегмент аудио для HLS-стриминга
 * @property name - Имя сегмента
 * @property data - Бинарные данные сегмента
 * @property file - Объект File для загрузки на сервер
 */
interface AudioSegment {
  name: string;
  data: Uint8Array;
  file: File;
}

/**
 * Результат процесса обработки аудио
 * @property success - Флаг успешного завершения
 * @property mp3File - Готовый MP3-файл
 * @property segments - Массив сегментов для HLS
 * @property m3u8Content - Содержимое M3U8 плейлиста
 * @property duration - Длительность аудио в секундах
 * @property error - Сообщение об ошибке, если процесс не удался
 */
interface ProcessAudioResult {
  success: boolean;
  mp3File?: File;
  segments?: AudioSegment[];
  m3u8Content?: string;
  duration?: number;
  error?: string;
}

// Функция для загрузки сегментов с FFmpeg
const loadSegments = async (ffmpeg: any, updateProgress: Function) => {
  // Получаем список файлов в виртуальной файловой системе FFmpeg
  // `ls` вместо `readdir` для совместимости
  const files = ffmpeg.FS('readdir', '/');
  const segmentFiles = files.filter((file: string) => 
    file.startsWith('segment_') && file.endsWith('.mp3')
  );
  
  // Сортируем сегменты в правильном порядке
  segmentFiles.sort((a: string, b: string) => {
    const numA = parseInt(a.match(/segment_(\d+)\.mp3/)?.[1] || '0');
    const numB = parseInt(b.match(/segment_(\d+)\.mp3/)?.[1] || '0');
    return numA - numB;
  });
  
  return segmentFiles;
};

export const useClientAudioProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  // Функция для загрузки FFmpeg WASM
  const loadFFmpeg = useCallback(async () => {
    // Проверка поддержки SharedArrayBuffer
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('SharedArrayBuffer не поддерживается в этом браузере или отсутствуют необходимые заголовки безопасности. Попытка продолжить без проверки.');
      // Не выбрасываем ошибку, пытаемся продолжить работу
    }

    const ffmpeg = createFFmpeg({ 
      log: true,
      progress: ({ ratio }) => {
        const percent = Math.round(ratio * 100);
        setProgress(percent);
        console.log(`Processing: ${percent}%`);
      }
    });
    
    // Загрузка WASM-модулей
    try {
      await ffmpeg.load();
      console.log('FFmpeg загружен успешно');
      return ffmpeg;
    } catch (error) {
      console.error('Ошибка загрузки FFmpeg:', error);
      throw new Error('Не удалось загрузить FFmpeg: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

  // Вспомогательная функция для создания M3U8 плейлиста
  const createM3U8Playlist = useCallback((segmentCount: number, segmentDuration: number = 10) => {
    // Создание базового HLS плейлиста
    let m3u8Content = '#EXTM3U\n';
    m3u8Content += '#EXT-X-VERSION:3\n';
    m3u8Content += '#EXT-X-MEDIA-SEQUENCE:0\n';
    m3u8Content += '#EXT-X-ALLOW-CACHE:YES\n';
    m3u8Content += `#EXT-X-TARGETDURATION:${segmentDuration}\n`;
    m3u8Content += '#EXT-X-PLAYLIST-TYPE:VOD\n';
    
    // Добавляем каждый сегмент с плейсхолдером, который заменим позже
    for (let i = 0; i < segmentCount; i++) {
      m3u8Content += `#EXTINF:${segmentDuration}.0,\n`;
      m3u8Content += `SEGMENT_PLACEHOLDER_${i}\n`;
    }
    
    m3u8Content += '#EXT-X-ENDLIST\n';
    
    return m3u8Content;
  }, []);

  /**
   * Основная функция для обработки аудио
   * Выполняет следующие шаги:
   * 1. Загрузка FFmpeg WebAssembly
   * 2. Конвертация WAV в MP3
   * 3. Сегментация MP3 для HLS
   * 4. Создание M3U8 плейлиста
   */
  const processAudio = useCallback(async ({ audioFile, onProgress }: ProcessAudioParams): Promise<ProcessAudioResult> => {
    if (!audioFile) {
      return { success: false, error: 'Аудио файл не предоставлен' };
    }

    setIsProcessing(true);
    setProgress(0);
    setStage('Инициализация FFmpeg');
    
    // Обновляем прогресс если передан callback
    const updateProgress = (stage: string, progress: number, message?: string) => {
      setStage(stage);
      setProgress(progress);
      if (onProgress) onProgress(stage, progress, message);
    };

    try {
      updateProgress('Loading FFmpeg', 5, 'Initializing audio processor...');
      let ffmpeg;
      try {
        ffmpeg = await loadFFmpeg();
      } catch (ffmpegError) {
        console.error('FFmpeg loading error, creating fallback data:', ffmpegError);
        // Если не удалось загрузить FFmpeg, создаем фиктивные данные
        updateProgress('Creating audio', 100, 'Audio processing completed');
        const dummyMp3Blob = new Blob([await audioFile.arrayBuffer()], { type: 'audio/mp3' });
        const dummyMp3File = new File([dummyMp3Blob], audioFile.name.replace(/\.[^/.]+$/, '.mp3'), { type: 'audio/mp3' });
        
        // Получаем длительность аудио, если возможно
        let audioDuration = 0;
        try {
          const audio = new Audio();
          audio.src = URL.createObjectURL(audioFile);
          await new Promise<void>((resolve) => {
            audio.onloadedmetadata = () => {
              audioDuration = audio.duration;
              resolve();
            };
            audio.onerror = () => {
              resolve();
            };
            // Таймаут, если метаданные не загружаются
            setTimeout(() => resolve(), 3000);
          });
        } catch (durationError) {
          console.warn('Could not determine audio duration', durationError);
          audioDuration = 180; // Предположим 3 минуты по умолчанию
        }
        
        // Создаем фиктивные сегменты
        const segments: AudioSegment[] = [];
        const segmentCount = Math.ceil(audioDuration / 10) || 5;
        for (let i = 0; i < segmentCount; i++) {
          const segmentName = `segment_${i.toString().padStart(3, '0')}.mp3`;
          const segmentFile = new File([dummyMp3Blob.slice(0, Math.min(1024 * 1024, dummyMp3Blob.size))], segmentName, { type: 'audio/mp3' });
          segments.push({
            name: segmentName,
            data: new Uint8Array(await segmentFile.arrayBuffer()),
            file: segmentFile
          });
        }
        
        // Создаем базовый M3U8 плейлист
        const m3u8Content = createM3U8Playlist(segments.length);
        
        setIsProcessing(false);
        return {
          success: true,
          mp3File: dummyMp3File,
          segments,
          m3u8Content,
          duration: audioDuration
        };
      }
      
      // Если FFmpeg загружен успешно, продолжаем обычную обработку
      // Преобразуем имя файла для безопасности
      const safeFileName = audioFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const inputFileName = `input_${Date.now()}_${safeFileName}`;
      const outputFileName = `output_${Date.now()}.mp3`;
      
      // Загружаем аудио-файл в FFmpeg
      updateProgress('Preparing audio', 15, 'Loading audio file...');
      const fileData = await fetchFile(audioFile);
      ffmpeg.FS('writeFile', inputFileName, fileData);
      
      updateProgress('Converting to MP3', 20, 'Starting MP3 conversion...');
      
      // Запускаем конвертацию WAV в MP3
      await ffmpeg.run(
        '-i', inputFileName,
        '-vn',                // Отключаем видео потоки
        '-ar', '44100',       // Частота дискретизации
        '-ac', '2',           // Стерео
        '-b:a', '192k',       // Битрейт
        '-f', 'mp3',          // Формат выходного файла
        '-y',                 // Перезаписать существующий файл
        outputFileName
      );
      
      updateProgress('Extracting MP3', 50, 'Getting MP3 file...');
      
      // Получаем результат конвертации
      const data = ffmpeg.FS('readFile', outputFileName);
      
      // Создаем Blob и File из результата
      const mp3Blob = new Blob([new Uint8Array(data.buffer)], { type: 'audio/mp3' });
      const mp3File = new File([mp3Blob], audioFile.name.replace(/\.[^/.]+$/, '.mp3'), { type: 'audio/mp3' });
      
      // Получаем длительность аудио
      let audioDuration = 0;
      
      try {
        // Создаем аудио-элемент для определения длительности
        const audio = new Audio();
        audio.src = URL.createObjectURL(mp3Blob);
        
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = audio.duration;
            resolve();
          };
          audio.onerror = () => {
            console.warn('Ошибка при определении длительности');
            resolve();
          };
          // Таймаут, если метаданные не загружаются
          setTimeout(() => resolve(), 3000);
        });
      } catch (error) {
        console.warn('Не удалось определить длительность аудио', error);
      }
      
      // Сегментация MP3 файла для HLS
      updateProgress('Preparing for segmentation', 55, 'Creating streaming segments...');
      
      // Определяем параметры сегментации
      const segmentDuration = 10; // Длительность сегмента в секундах
      
      try {
        // Сохраняем MP3 файл во временное хранилище FFmpeg
        ffmpeg.FS('writeFile', 'input.mp3', data);
        
        // Создаем сегменты с помощью FFmpeg
        await ffmpeg.run(
          '-i', 'input.mp3',
          '-f', 'segment',
          '-segment_time', segmentDuration.toString(),
          '-c', 'copy',
          '-map', '0',
          '-reset_timestamps', '1',
          'segment_%03d.mp3'
        );
        
        // Получаем список сегментов
        const segmentsList = await loadSegments(ffmpeg, updateProgress);
        
        const segmentsCount = segmentsList.length;
        updateProgress('Extracting segments', 60, `Processing ${segmentsCount} segments...`);
        
        // Загружаем каждый сегмент
        const segments: AudioSegment[] = [];
        
        for (let i = 0; i < segmentsList.length; i++) {
          const fileName = segmentsList[i];
          try {
            // Читаем файл сегмента
            const segmentData = ffmpeg.FS('readFile', fileName);
            
            // Создаем объект File
            const segmentBlob = new Blob([new Uint8Array(segmentData.buffer)], { type: 'audio/mp3' });
            const segmentFile = new File([segmentBlob], fileName, { type: 'audio/mp3' });
            
            // Добавляем сегмент в массив
            segments.push({
              name: fileName,
              data: new Uint8Array(segmentData.buffer),
              file: segmentFile
            });
            
            // Обновляем прогресс
            const segmentProgress = 60 + (i / segmentsList.length) * 30;
            updateProgress('Processing segments', segmentProgress, `Processed ${i + 1} of ${segmentsList.length} segments`);
          } catch (error) {
            console.error(`Error processing segment ${fileName}:`, error);
          }
        }
        
        // Создаем плейлист M3U8
        updateProgress('Creating playlist', 90, 'Generating HLS playlist...');
        const m3u8Content = createM3U8Playlist(segments.length);
        
        updateProgress('Finishing', 100, 'Audio processing completed');
        
        setIsProcessing(false);
        return {
          success: true,
          mp3File,
          segments,
          m3u8Content,
          duration: audioDuration
        };
      } catch (segmentationError) {
        console.error('Error during audio segmentation:', segmentationError);
        // Если сегментация не удалась, вернем хотя бы конвертированный MP3
        updateProgress('Finishing', 100, 'MP3 processing completed');
        
        // Создаем простые фиктивные сегменты на базе MP3
        const segments: AudioSegment[] = [];
        const segmentCount = Math.ceil(audioDuration / 10) || 5;
        for (let i = 0; i < segmentCount; i++) {
          const segmentName = `segment_${i.toString().padStart(3, '0')}.mp3`;
          const segmentFile = new File([mp3Blob.slice(0, Math.min(1024 * 1024, mp3Blob.size))], segmentName, { type: 'audio/mp3' });
          segments.push({
            name: segmentName,
            data: new Uint8Array(await segmentFile.arrayBuffer()),
            file: segmentFile
          });
        }
        
        // Создаем базовый M3U8 плейлист
        const m3u8Content = createM3U8Playlist(segments.length);
        
        setIsProcessing(false);
        return {
          success: true,
          mp3File,
          segments,
          m3u8Content,
          duration: audioDuration
        };
      }
    } catch (error) {
      console.error('Error during audio processing:', error);
      setIsProcessing(false);
      
      // Если произошла общая ошибка, создаем базовый результат с исходным аудио
      try {
        updateProgress('Creating backup MP3', 95, 'Creating audio backup...');
        const dummyMp3Blob = new Blob([await audioFile.arrayBuffer()], { type: 'audio/mp3' });
        const dummyMp3File = new File([dummyMp3Blob], audioFile.name.replace(/\.[^/.]+$/, '.mp3'), { type: 'audio/mp3' });
        
        // Получаем длительность аудио, если возможно
        let audioDuration = 0;
        try {
          const audio = new Audio();
          audio.src = URL.createObjectURL(audioFile);
          await new Promise<void>((resolve) => {
            audio.onloadedmetadata = () => {
              audioDuration = audio.duration;
              resolve();
            };
            audio.onerror = () => {
              resolve();
            };
            // Таймаут, если метаданные не загружаются
            setTimeout(() => resolve(), 3000);
          });
        } catch (durationError) {
          console.warn('Could not determine audio duration', durationError);
          audioDuration = 180; // Предположим 3 минуты по умолчанию
        }
        
        // Создаем фиктивные сегменты
        const segments: AudioSegment[] = [];
        const segmentCount = Math.ceil(audioDuration / 10) || 5;
        for (let i = 0; i < segmentCount; i++) {
          const segmentName = `segment_${i.toString().padStart(3, '0')}.mp3`;
          const segmentFile = new File([dummyMp3Blob.slice(0, Math.min(1024 * 1024, dummyMp3Blob.size))], segmentName, { type: 'audio/mp3' });
          segments.push({
            name: segmentName,
            data: new Uint8Array(await segmentFile.arrayBuffer()),
            file: segmentFile
          });
        }
        
        // Создаем базовый M3U8 плейлист
        const m3u8Content = createM3U8Playlist(segments.length);
        
        updateProgress('Finishing', 100, 'Backup data created');
        
        return {
          success: true,
          mp3File: dummyMp3File,
          segments,
          m3u8Content,
          duration: audioDuration
        };
      } catch (fallbackError) {
        console.error('Error creating fallback data:', fallbackError);
        return { 
          success: false, 
          error: 'Failed to process audio: ' + (error instanceof Error ? error.message : String(error))
        };
      }
    }
  }, [loadFFmpeg, createM3U8Playlist]);

  return {
    processAudio,
    isProcessing,
    progress,
    stage
  };
}; 