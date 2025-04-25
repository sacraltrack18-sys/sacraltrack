'use client';

import { useState, useCallback } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

interface ProcessAudioParams {
  audioFile: File;
  onProgress?: (stage: string, progress: number, message?: string) => void;
}

interface AudioSegment {
  name: string;
  data: Uint8Array;
  file: File;
}

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
      console.error('SharedArrayBuffer не поддерживается в этом браузере или отсутствуют необходимые заголовки безопасности');
      throw new Error('Ваш браузер не поддерживает некоторые функции, необходимые для обработки аудио. Возможные причины: использование режима инкогнито, отсутствие заголовков безопасности на сервере или старая версия браузера.');
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

  // Основная функция для обработки аудио
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
      updateProgress('Загрузка FFmpeg', 5, 'Инициализация обработчика аудио...');
      const ffmpeg = await loadFFmpeg();
      
      // Преобразуем имя файла для безопасности
      const safeFileName = audioFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const inputFileName = `input_${Date.now()}_${safeFileName}`;
      const outputFileName = `output_${Date.now()}.mp3`;
      
      // Загружаем аудио-файл в FFmpeg
      updateProgress('Подготовка аудио', 15, 'Загрузка аудио файла...');
      const fileData = await fetchFile(audioFile);
      ffmpeg.FS('writeFile', inputFileName, fileData);
      
      updateProgress('Конвертация в MP3', 20, 'Начало конвертации в MP3...');
      
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
      
      updateProgress('Извлечение MP3', 50, 'Получение MP3 файла...');
      
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
        });
      } catch (error) {
        console.warn('Не удалось определить длительность аудио', error);
      }
      
      // Сегментация MP3 файла для HLS
      updateProgress('Подготовка к сегментации', 55, 'Создание сегментов для стриминга...');
      
      // Определяем параметры сегментации
      const segmentDuration = 10; // Длительность сегмента в секундах
      
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
      const segmentFiles = await loadSegments(ffmpeg, updateProgress);
      
      const segmentsCount = segmentFiles.length;
      updateProgress('Извлечение сегментов', 60, `Обработка ${segmentsCount} сегментов...`);
      
      // Загружаем каждый сегмент
      const segments: AudioSegment[] = [];
      
      for (let i = 0; i < segmentFiles.length; i++) {
        const fileName = segmentFiles[i];
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
          const segmentProgress = 60 + (i / segmentFiles.length) * 30;
          updateProgress('Обработка сегментов', segmentProgress, `Обработано ${i + 1} из ${segmentFiles.length} сегментов`);
        } catch (error) {
          console.error(`Ошибка при обработке сегмента ${fileName}:`, error);
        }
      }
      
      // Создаем плейлист M3U8
      updateProgress('Создание плейлиста', 90, 'Генерация HLS плейлиста...');
      const m3u8Content = createM3U8Playlist(segments.length);
      
      updateProgress('Завершение', 100, 'Обработка аудио завершена');
      
      setIsProcessing(false);
      return {
        success: true,
        mp3File,
        segments,
        m3u8Content,
        duration: audioDuration
      };
    } catch (error) {
      console.error('Ошибка при обработке аудио:', error);
      setIsProcessing(false);
      return { 
        success: false, 
        error: 'Ошибка при обработке аудио: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }, [loadFFmpeg, createM3U8Playlist]);

  return {
    processAudio,
    isProcessing,
    progress,
    stage
  };
}; 