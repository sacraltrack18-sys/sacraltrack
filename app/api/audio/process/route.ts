import { NextRequest } from 'next/server';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import NodeID3 from 'node-id3';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import { ID } from '@/libs/AppWriteClient';
import { spawn } from 'child_process';
import { storage } from '@/libs/AppWriteClient';

// Set max payload size to 200MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
    responseLimit: false,
  },
};

// Улучшенная функция для отправки ошибки
function sendDetailedError(writer: WritableStreamDefaultWriter, message: string, details: any = {}) {
    console.error(`[ERROR] ${message}`, details);
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(
            `data: ${JSON.stringify({
                type: 'error',
                message,
                timestamp: new Date().toISOString(),
                details: JSON.stringify(details)
            })}\n\n`
        );
        writer.write(data);
    } catch (error) {
        console.error('[CRITICAL] Ошибка при отправке сообщения об ошибке:', error);
    }
}

// Улучшенная функция для валидации файла с подробным логированием
async function validateFile(file: File): Promise<{ isValid: boolean; error?: string }> {
    console.log(`[VALIDATE] Проверка файла: имя=${file.name}, тип=${file.type}, размер=${file.size} байт`);
    
    if (!file.type.includes('wav')) {
        console.error(`[VALIDATE] Неверный формат файла: ${file.type}`);
        return { isValid: false, error: 'Файл должен быть в формате WAV' };
    }
    
    if (file.size > 200 * 1024 * 1024) { // 200MB
        console.error(`[VALIDATE] Файл слишком большой: ${file.size} байт`);
        return { isValid: false, error: 'Размер файла не должен превышать 200МБ' };
    }
    
    console.log('[VALIDATE] Файл успешно прошел валидацию');
    return { isValid: true };
}

// Функция для получения длительности аудио
function getAudioDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        console.log(`[DURATION] Определение длительности для файла: ${inputPath}`);
        
        ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: FfprobeData) => {
            if (err) {
                console.error('[DURATION] Ошибка при получении длительности аудио:', err);
                reject(err);
            } else {
                const duration = metadata.format.duration || 0;
                console.log('[DURATION] Длительность аудио:', duration, 'секунд');
                resolve(duration);
            }
        });
    });
}

// Функция для конвертации аудио с отправкой прогресса
const convertAudio = async (
    inputPath: string,
    outputPath: string,
    writer: WritableStreamDefaultWriter
): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('Starting audio conversion...');
        sendProgress(writer, 30, 'Converting to MP3', {
            type: 'conversion',
            message: 'Starting audio conversion to MP3...'
        });

        // Улучшенные параметры для FFmpeg с аппаратным ускорением и многопоточностью
        const ffmpegProcess = spawn('ffmpeg', [
            '-hwaccel', 'auto',    // Аппаратное ускорение
            '-i', inputPath,
            '-vn',                 // Отключаем видео потоки
            '-ar', '44100',        // Аудио sample rate
            '-ac', '2',            // Stereo
            '-b:a', '192k',        // Битрейт (увеличен до 192k)
            '-threads', '0',       // Используем все доступные потоки процессора
            '-f', 'mp3',           // Формат выходного файла
            '-preset', 'ultrafast',
            outputPath
        ]);

        // Отслеживаем прогресс конвертации через stderr
        let duration = 0;
        let progressPattern = /time=(\d+):(\d+):(\d+.\d+)/;
        let conversionStartPercent = 30;  // Начальный процент для конвертации
        let conversionEndPercent = 45;    // Конечный процент для конвертации
        
        // Переменные для плавного "ползущего" прогресса
        let completedSegments = 0;
        let lastReportedProgress = 0;      // Последний прогресс, о котором сообщил FFmpeg
        let lastReportedTime = 0;          // Последнее время воспроизведения, о котором сообщил FFmpeg
        let lastUpdateTime = Date.now();   // Время последнего обновления
        let progressInterval: NodeJS.Timeout | null = null;

        // Функция для отправки плавных обновлений прогресса
        const sendSmoothProgress = () => {
            if (duration === 0) return; // Ждем, пока узнаем длительность
            
            const now = Date.now();
            const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // в секундах
            
            // Предполагаем скорость обработки на основе предыдущих обновлений (в 10x скорости реального времени)
            // Можно настроить множитель в зависимости от производительности вашей системы
            const estimatedProgressIncrease = Math.min(
                (timeSinceLastUpdate * 10) / duration * 100, // оценка увеличения процента
                1 // Максимальное увеличение за одно обновление - 1%
            );
            
            // Обновляем предполагаемый прогресс, не превышая следующую ожидаемую отметку
            const estimatedProgress = Math.min(
                lastReportedProgress + estimatedProgressIncrease,
                100 // Не превышаем 100%
            );
            
            // Рассчитываем предполагаемое текущее время воспроизведения
            const estimatedCurrentTime = Math.min(
                lastReportedTime + timeSinceLastUpdate * 10, // предполагаемое увеличение времени
                duration // Не превышаем общую длительность
            );
            
            // Корректируем общий прогресс
            const totalProgress = conversionStartPercent + (estimatedProgress / 100) * (conversionEndPercent - conversionStartPercent);
            
            console.log(`Estimated progress: ${estimatedCurrentTime.toFixed(2)}/${duration} seconds (${estimatedProgress.toFixed(2)}% conversion, ${totalProgress.toFixed(2)}% overall progress)`);
            
            // Обновляем индикатор прогресса
            sendProgress(writer, totalProgress, 'Converting to MP3', {
                type: 'conversion',
                progress: estimatedProgress, // Прогресс самой конвертации в процентах
                conversionProgress: `${Math.round(estimatedProgress)}%`, // Текстовое представление
                message: `Conversion progress: ${Math.round(estimatedProgress)}% (${Math.floor(estimatedCurrentTime / 60)}:${(estimatedCurrentTime % 60).toFixed(0).padStart(2, '0')} from ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')})`
            });
            
            // Обновляем время последнего обновления
            lastUpdateTime = now;
        };

        // Запускаем интервал для плавных обновлений прогресса (каждые 200 мс)
        progressInterval = setInterval(sendSmoothProgress, 200);

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.log(`FFmpeg output: ${output.substring(0, 100)}`);
            
            // Извлекаем длительность, если еще не обнаружена
            if (duration === 0) {
                const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+.\d+)/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseFloat(durationMatch[3]);
                    duration = hours * 3600 + minutes * 60 + seconds;
                    console.log(`Detected duration: ${duration} seconds`);
                }
            }
            
            // Извлекаем текущее время обработки
            const match = output.match(progressPattern);
            if (match && duration > 0) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseFloat(match[3]);
                const currentTime = hours * 3600 + minutes * 60 + seconds;
                
                // Вычисляем прогресс в процентах от текущего процесса конвертации (не от всего процесса)
                const conversionProgress = Math.min(100, (currentTime / duration) * 100);
                
                // Корректируем общий прогресс (масштабируем конвертацию между 30% и 45% общего процесса)
                const totalProgress = conversionStartPercent + (conversionProgress / 100) * (conversionEndPercent - conversionStartPercent);
                
                console.log(`Conversion progress: ${currentTime}/${duration} seconds (${conversionProgress.toFixed(2)}% conversion, ${totalProgress.toFixed(2)}% overall progress)`);
                
                // Обновляем последние известные значения для интерполяции
                lastReportedProgress = conversionProgress;
                lastReportedTime = currentTime;
                lastUpdateTime = Date.now();
                
                sendProgress(writer, totalProgress, 'Converting to MP3', {
                        type: 'conversion',
                    progress: conversionProgress, // Прогресс самой конвертации в процентах
                    conversionProgress: `${Math.round(conversionProgress)}%`, // Текстовое представление
                    message: `Conversion progress: ${Math.round(conversionProgress)}% (${Math.floor(currentTime / 60)}:${(currentTime % 60).toFixed(0).padStart(2, '0')} from ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')})`
                    });
            }
        });

        ffmpegProcess.on('close', (code) => {
            // Останавливаем интервал обновления прогресса
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            
            if (code === 0) {
                console.log('Conversion completed successfully');
                sendProgress(writer, conversionEndPercent, 'Conversion complete', {
                    type: 'conversion',
                    progress: 100,
                    conversionProgress: "100%",
                    message: 'Audio successfully converted to MP3'
                });
                resolve();
            } else {
                console.error(`FFmpeg process exited with code ${code}`);
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            // Останавливаем интервал обновления прогресса
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            
            console.error('Error during conversion:', err);
            reject(err);
        });
    });
};

// Функция для создания сегментов аудио с отправкой прогресса
const createSegments = async (
    inputPath: string,
    outputDir: string,
    writer: WritableStreamDefaultWriter
): Promise<string[]> => {
    console.log('Starting audio segmentation...');
    sendProgress(writer, 50, 'Segmenting audio', {
        type: 'segmentation',
        message: 'Preparing to create audio segments...'
    });

    // Получаем информацию о файле для определения длительности
    const ffprobeProcess = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
    ]);

    let durationStr = '';
    ffprobeProcess.stdout.on('data', (data) => {
        durationStr += data.toString();
    });

    await new Promise((resolve, reject) => {
        ffprobeProcess.on('close', (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`FFprobe process exited with code ${code}`));
            }
        });
    });

    const duration = parseFloat(durationStr.trim());
    console.log(`Audio duration: ${duration} seconds`);

    // Определяем размер сегмента (15 секунд)
    const segmentDuration = 15;
    const totalSegments = Math.ceil(duration / segmentDuration);
    console.log(`Creating ${totalSegments} segments...`);

    const segments: string[] = [];
    
    // Переменные для расчета прогресса
    const segmentationStartPercent = 50;
    const segmentationEndPercent = 70;
    
    // Переменные для плавного обновления прогресса
    let completedSegments = 0;
    let lastUpdateTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Функция для обновления плавного прогресса
    const sendSmoothProgress = () => {
        const now = Date.now();
        const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // в секундах
        
        // Предполагаем прогресс в текущих сегментах
        const estimatedSegmentProgress = Math.min(
            completedSegments + (timeSinceLastUpdate * 0.3),
            totalSegments - 0.05 // чуть меньше полного значения
        );
        
        // Процент прогресса сегментации
        const segmentProgress = (estimatedSegmentProgress / totalSegments) * 100;
        
        // Общий прогресс
        const progress = segmentationStartPercent + (segmentProgress / 100) * (segmentationEndPercent - segmentationStartPercent);
        
        console.log(`Smooth segment progress: ${estimatedSegmentProgress.toFixed(2)}/${totalSegments} (${segmentProgress.toFixed(1)}%)`);
        
        sendProgress(writer, progress, 'Segmenting audio', {
            type: 'segmentation',
            progress: progress,
            segmentProgress: segmentProgress,
            totalSegments: totalSegments,
            currentSegment: Math.floor(estimatedSegmentProgress),
            message: `Segment creation progress: ${Math.floor(segmentProgress)}% (processed approximately ${Math.floor(estimatedSegmentProgress)}/${totalSegments})`
        });
    };
    
    // Запускаем интервал плавных обновлений (каждые 200 мс)
    progressInterval = setInterval(sendSmoothProgress, 200);
    
    // Функция для создания одного сегмента
    const createSegment = async (index: number): Promise<string> => {
        const startTime = index * segmentDuration;
        const segmentName = `segment_${index.toString().padStart(3, '0')}.mp3`;
        const segmentPath = path.join(outputDir, segmentName);
        
        try {
            await new Promise<void>((resolve, reject) => {
                const ffmpegProcess = spawn('ffmpeg', [
                    '-hwaccel', 'auto',
                    '-i', inputPath,
                    '-ss', startTime.toString(),
                    '-t', segmentDuration.toString(),
                    '-vn',
                    '-ar', '44100',
                    '-ac', '2',
                    '-b:a', '192k',
                    '-threads', '0',
                    '-f', 'mp3',
                    '-preset', 'ultrafast',
                    segmentPath
                ]);

                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Created segment ${segmentName}`);
                        
                        // Увеличиваем счетчик завершенных сегментов
                        completedSegments++;
                        lastUpdateTime = Date.now();
                        
                        // Отправляем точное обновление прогресса после завершения сегмента
                        const exactSegmentProgress = (completedSegments / totalSegments) * 100;
                        const exactProgress = segmentationStartPercent + (exactSegmentProgress / 100) * (segmentationEndPercent - segmentationStartPercent);
                        
                        sendProgress(writer, exactProgress, 'Segmenting audio', {
                            type: 'segmentation',
                            progress: exactProgress,
                            segmentProgress: exactSegmentProgress,
                            totalSegments: totalSegments,
                            currentSegment: completedSegments,
                            message: `Segment creation progress: ${Math.round(exactSegmentProgress)}% (${completedSegments}/${totalSegments})`
                        });
                        
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg process exited with code ${code} for segment ${index}`));
                    }
                });

                ffmpegProcess.on('error', (err) => {
                    reject(err);
                });
            });
            
            return segmentName;
        } catch (error) {
            console.error(`Error creating segment ${index}:`, error);
            throw error;
        }
    };

    // Функция для параллельной обработки с ограничением
    const parallelProcess = async (items: number[], processFn: (index: number) => Promise<any>, concurrencyLimit: number) => {
        const results: any[] = new Array(items.length);
        const executing: Promise<any>[] = [];
        let index = 0;
        
        // Создаем очередь для обработки всех элементов
        const enqueue = async (): Promise<void> => {
            // Обрабатываем текущий элемент
            const i = index++;
            
            // Если все элементы уже в обработке, завершаем
            if (i >= items.length) return;
            
            // Создаем промис для текущего элемента и добавляем его в список выполняющихся
            const execPromise = processFn(items[i])
                .then(result => {
                    // Сохраняем результат в массиве
                    results[i] = result;
                    // Удаляем текущий промис из списка выполняющихся
                    const execIndex = executing.indexOf(execPromise);
                    if (execIndex >= 0) executing.splice(execIndex, 1);
                    // Добавляем следующий элемент в очередь
                    return enqueue();
                });
            
            // Добавляем промис в список выполняющихся
            executing.push(execPromise);
            
            // Если достигли лимита параллельных операций, ждем завершения хотя бы одной
            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        };
        
        // Запускаем начальные параллельные операции
        const initPromises: Promise<void>[] = [];
        for (let i = 0; i < concurrencyLimit && i < items.length; i++) {
            initPromises.push(enqueue());
        }
        
        // Ждем завершения всех операций
        await Promise.all(initPromises);
        await Promise.all(executing);
        
        return results;
    };

    try {
        // Создаем массив индексов для параллельной обработки
        const indices = Array.from({ length: totalSegments }, (_, i) => i);
        
        // Определяем количество параллельных операций для сегментации
        // Используем меньшее значение (3), так как сегментация требует больше ресурсов
        const concurrency = 3;
        
        // Обрабатываем сегменты параллельно
        const segmentNames = await parallelProcess(indices, createSegment, concurrency);
        segments.push(...segmentNames);
        
        // Останавливаем интервал обновлений
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        console.log(`Created ${segments.length} segments successfully using parallel processing`);
        sendProgress(writer, 70, 'Segmentation complete', {
            type: 'segmentation',
            message: `Created ${segments.length} segments successfully using parallel processing`,
            segmentProgress: 100,
            totalSegments: totalSegments,
            currentSegment: totalSegments
        });
        
        return segments;
    } catch (error) {
        // Останавливаем интервал обновлений в случае ошибки
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error during parallel segment creation:', error);
        throw error;
    }
};

// Функция для создания сегментов WAV с отправкой прогресса
const createWavSegments = async (
    inputPath: string,
    outputDir: string,
    writer: WritableStreamDefaultWriter
): Promise<{segments: string[], manifest: string}> => {
    console.log('Starting WAV segmentation...');
    sendProgress(writer, 25, 'Segmenting WAV file', {
        type: 'wavSegmentation',
        message: 'Preparing to split WAV file into segments...'
    });

    // Получаем информацию о файле для определения длительности и битрейта
    const ffprobeProcess = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration,bit_rate,size',
        '-show_entries', 'stream=codec_name,codec_type,sample_rate,channels,bits_per_sample',
        '-of', 'json',
        inputPath
    ]);

    let ffprobeOutput = '';
    ffprobeProcess.stdout.on('data', (data) => {
        ffprobeOutput += data.toString();
    });

    await new Promise((resolve, reject) => {
        ffprobeProcess.on('close', (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`FFprobe process exited with code ${code}`));
            }
        });
    });

    // Парсим JSON-вывод ffprobe
    const fileInfo = JSON.parse(ffprobeOutput);
    const duration = parseFloat(fileInfo.format.duration);
    const fileSize = parseInt(fileInfo.format.size);
    const bitRate = parseInt(fileInfo.format.bit_rate);
    
    // Находим аудио поток
    const audioStream = fileInfo.streams.find((stream: any) => stream.codec_type === 'audio');
    const sampleRate = parseInt(audioStream?.sample_rate) || 44100;
    const channels = parseInt(audioStream?.channels) || 2;
    const bitsPerSample = parseInt(audioStream?.bits_per_sample) || 16;
    
    console.log(`WAV file info: duration=${duration}s, size=${fileSize}B, bitRate=${bitRate}bps`);
    console.log(`Audio stream: sampleRate=${sampleRate}Hz, channels=${channels}, bitsPerSample=${bitsPerSample}`);

    // Максимальный размер сегмента (4.3MB в байтах)
    const MAX_SEGMENT_SIZE = 4.3 * 1024 * 1024;
    
    // Расчет размера одной секунды аудио
    const bytesPerSecond = bitRate / 8;
    
    // Расчет времени для каждого сегмента, чтобы не превышать MAX_SEGMENT_SIZE
    const segmentDuration = Math.floor(MAX_SEGMENT_SIZE / bytesPerSecond);
    
    console.log(`Calculated segment duration: ${segmentDuration}s (to stay under ${MAX_SEGMENT_SIZE/(1024*1024)}MB)`);
    
    // Обеспечиваем минимальную длительность сегмента (5 секунд)
    const effectiveSegmentDuration = Math.max(5, segmentDuration);
    
    // Расчет количества сегментов
    const totalSegments = Math.ceil(duration / effectiveSegmentDuration);
    console.log(`Creating ${totalSegments} WAV segments with duration ~${effectiveSegmentDuration}s each...`);

    const segments: string[] = [];
    const manifestEntries: {start: number, duration: number, fileName: string}[] = [];
    
    // Переменные для расчета прогресса
    const segmentationStartPercent = 25;
    const segmentationEndPercent = 35;
    
    // Переменные для плавного обновления прогресса
    let completedSegments = 0;
    let lastUpdateTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Функция для обновления плавного прогресса
    const sendSmoothProgress = () => {
        const now = Date.now();
        const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // в секундах
        
        // Предполагаем прогресс в текущих сегментах
        const estimatedSegmentProgress = Math.min(
            completedSegments + (timeSinceLastUpdate * 0.3),
            totalSegments - 0.05 // чуть меньше полного значения
        );
        
        // Процент прогресса сегментации
        const segmentProgress = (estimatedSegmentProgress / totalSegments) * 100;
        
        // Общий прогресс
        const progress = segmentationStartPercent + (segmentProgress / 100) * (segmentationEndPercent - segmentationStartPercent);
        
        console.log(`WAV segment progress: ${estimatedSegmentProgress.toFixed(2)}/${totalSegments} (${segmentProgress.toFixed(1)}%)`);
        
        sendProgress(writer, progress, 'Segmenting WAV file', {
            type: 'wavSegmentation',
            progress: progress,
            segmentProgress: segmentProgress,
            totalSegments: totalSegments,
            currentSegment: Math.floor(estimatedSegmentProgress),
            message: `WAV segmentation progress: ${Math.floor(segmentProgress)}% (processed approximately ${Math.floor(estimatedSegmentProgress)}/${totalSegments})`
        });
    };
    
    // Запускаем интервал плавных обновлений (каждые 200 мс)
    progressInterval = setInterval(sendSmoothProgress, 200);
    
    // Функция для создания одного WAV сегмента
    const createWavSegment = async (index: number): Promise<string> => {
        const startTime = index * effectiveSegmentDuration;
        // Расчет фактической длительности последнего сегмента
        const actualDuration = index === totalSegments - 1 
            ? Math.min(effectiveSegmentDuration, duration - startTime)
            : effectiveSegmentDuration;
            
        const segmentName = `wav_segment_${index.toString().padStart(3, '0')}.wav`;
        const segmentPath = path.join(outputDir, segmentName);
        
        try {
            await new Promise<void>((resolve, reject) => {
                const ffmpegProcess = spawn('ffmpeg', [
                    '-hwaccel', 'auto',
                    '-i', inputPath,
                    '-ss', startTime.toString(),
                    '-t', actualDuration.toString(),
                    '-vn',
                    '-c:a', 'pcm_s16le',  // сохраняем как PCM для WAV
                    '-ar', sampleRate.toString(),     // используем оригинальную частоту дискретизации
                    '-ac', channels.toString(),       // используем оригинальное количество каналов
                    '-threads', '0',       // используем все доступные потоки процессора
                    '-f', 'wav',           // формат выходного файла
                    '-y',                  // перезаписываем файл, если он существует
                    segmentPath
                ]);
                
                let errorOutput = '';
                
                ffmpegProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        // Получаем фактический размер созданного сегмента
                        fs.stat(segmentPath).then((stats) => {
                            const segmentSize = stats.size;
                            console.log(`Created WAV segment ${index+1}/${totalSegments}, size: ${(segmentSize/(1024*1024)).toFixed(2)}MB`);
                            
                            // Добавляем информацию в манифест
                            manifestEntries.push({
                                start: startTime,
                                duration: actualDuration,
                                fileName: segmentName
                            });
                            
                            completedSegments++;
                            lastUpdateTime = Date.now();
                            resolve();
                        }).catch(err => {
                            console.error(`Error checking segment size: ${err}`);
                            reject(err);
                        });
                    } else {
                        console.error(`Error creating WAV segment ${index+1}: ${errorOutput}`);
                        reject(new Error(`FFmpeg process exited with code ${code}: ${errorOutput}`));
                    }
                });
            });
            
            return segmentPath;
        } catch (error) {
            console.error(`Error creating WAV segment ${index+1}:`, error);
            throw error;
        }
    };

    // Функция для параллельной обработки с ограничением
    const parallelProcess = async (items: number[], processFn: (index: number) => Promise<any>, concurrencyLimit: number) => {
        const results: any[] = new Array(items.length);
        const executing: Promise<any>[] = [];
        let index = 0;
        
        // Создаем очередь для обработки всех элементов
        const enqueue = async (): Promise<void> => {
            // Обрабатываем текущий элемент
            const i = index++;
            
            // Если все элементы уже в обработке, завершаем
            if (i >= items.length) return;
            
            // Создаем промис для текущего элемента и добавляем его в список выполняющихся
            const execPromise = processFn(items[i])
                .then(result => {
                    // Сохраняем результат в массиве
                    results[i] = result;
                    // Удаляем текущий промис из списка выполняющихся
                    const execIndex = executing.indexOf(execPromise);
                    if (execIndex >= 0) executing.splice(execIndex, 1);
                    // Добавляем следующий элемент в очередь
                    return enqueue();
                });
            
            // Добавляем промис в список выполняющихся
            executing.push(execPromise);
            
            // Если достигли лимита параллельных операций, ждем завершения хотя бы одной
            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        };
        
        // Запускаем начальные параллельные операции
        const initPromises: Promise<void>[] = [];
        for (let i = 0; i < concurrencyLimit && i < items.length; i++) {
            initPromises.push(enqueue());
        }
        
        // Ждем завершения всех операций
        await Promise.all(initPromises);
        await Promise.all(executing);
        
        return results;
    };

    try {
        // Создаем массив индексов для параллельной обработки
        const indices = Array.from({ length: totalSegments }, (_, i) => i);
        
        // Определяем количество параллельных операций для сегментации
        // Используем меньшее значение (2), так как сегментация WAV требует больше ресурсов
        const concurrency = 2;
        
        // Обрабатываем сегменты параллельно
        const segmentPaths = await parallelProcess(indices, createWavSegment, concurrency);
        segments.push(...segmentPaths);
        
        // Останавливаем интервал обновлений
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        // Создаем манифест-файл с информацией о сегментах
        const manifest = {
            originalFile: path.basename(inputPath),
            totalDuration: duration,
            format: {
                sampleRate,
                channels,
                bitsPerSample
            },
            segments: manifestEntries.sort((a, b) => a.start - b.start)
        };
        
        // Сохраняем манифест в JSON-файл
        const manifestPath = path.join(outputDir, 'wav_manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`Created ${segments.length} WAV segments and manifest file`);
        sendProgress(writer, segmentationEndPercent, 'WAV segmentation complete', {
            type: 'wavSegmentation',
            message: `Created ${segments.length} WAV segments and manifest file`,
            segmentProgress: 100,
            totalSegments: totalSegments,
            currentSegment: totalSegments
        });
        
        return {
            segments: segments,
            manifest: manifestPath
        };
    } catch (error) {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error during WAV segmentation:', error);
        throw error;
    }
};

// Функция для подготовки сегментов WAV без загрузки в Appwrite
const prepareWavSegments = async (
    segments: string[],
    segmentsDir: string,
    writer: WritableStreamDefaultWriter,
    manifestPath?: string
): Promise<{segments: {name: string, data: string}[], manifest?: {data: string, name: string}}> => {
    console.log('Preparing WAV segment data...');
    sendProgress(writer, 35, 'Preparing WAV segments', {
        type: 'wavPreparation',
        message: 'Preparing WAV segment data for client...'
    });

    const segmentFiles: {name: string, data: string}[] = [];
    
    // Добавим больше логов для отладки
    console.log(`Total WAV segments to prepare: ${segments.length}`);
    console.log(`WAV segments directory: ${segmentsDir}`);
    
    const preparationStartPercent = 35;
    const preparationEndPercent = 45;
    
    // Переменные для плавного обновления прогресса
    let completedSegments = 0;
    let lastUpdateTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Функция для обновления плавного прогресса
    const sendSmoothProgress = () => {
        const now = Date.now();
        const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // в секундах
        
        // Предполагаем прогресс в текущих сегментах
        const estimatedSegmentProgress = Math.min(
            completedSegments + (timeSinceLastUpdate * 0.1),
            segments.length - 0.05 // чуть меньше полного значения
        );
        
        // Процент прогресса подготовки
        const preparationProgress = (estimatedSegmentProgress / segments.length) * 100;
        
        // Общий прогресс
        const progress = preparationStartPercent + (preparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
        
        console.log(`WAV preparation progress: ${estimatedSegmentProgress.toFixed(2)}/${segments.length} (${preparationProgress.toFixed(1)}%)`);
        
        sendProgress(writer, progress, 'Preparing WAV segments', {
            type: 'wavPreparation',
            progress: progress,
            preparationProgress: preparationProgress,
            message: `WAV segments prepared: ${Math.floor(estimatedSegmentProgress)} of ${segments.length} (${Math.round(preparationProgress)}%)`
        });
    };
    
    // Запускаем интервал плавных обновлений (каждые 200 мс)
    progressInterval = setInterval(sendSmoothProgress, 200);
    
    // Функция для обработки одного сегмента
    const processWavSegment = async (segmentIndex: number): Promise<{name: string, data: string}> => {
        const segmentPath = segments[segmentIndex];
        const fileName = path.basename(segmentPath);
        console.log(`Reading WAV segment file ${segmentIndex+1}/${segments.length}: ${segmentPath}`);
        
        try {
            const segmentData = await fs.readFile(segmentPath);
            console.log(`WAV segment ${segmentIndex+1} read successfully, size: ${segmentData.length} bytes`);
            
            // Создаем объект с данными
            const segment = {
                name: fileName,
                data: segmentData.toString('base64')
            };
            
            // Увеличиваем счетчик завершенных сегментов
            completedSegments++;
            lastUpdateTime = Date.now();
            
            // Отправляем точное обновление прогресса при завершении сегмента
            const exactPreparationProgress = (completedSegments / segments.length) * 100;
            const exactProgress = preparationStartPercent + (exactPreparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
            
            sendProgress(writer, exactProgress, 'Preparing WAV segments', {
                type: 'wavPreparation',
                progress: exactProgress,
                preparationProgress: exactPreparationProgress,
                message: `WAV segments prepared: ${completedSegments} of ${segments.length} (${Math.round(exactPreparationProgress)}%)`
            });
            
            console.log(`WAV segment ${segmentIndex+1} prepared`);
            return segment;
        } catch (error) {
            console.error(`Error reading WAV segment ${segmentIndex+1}:`, error);
            throw new Error(`Failed to read WAV segment ${fileName}: ${error}`);
        }
    };

    // Функция для параллельной обработки с ограничением
    const parallelProcess = async (items: number[], processFn: (index: number) => Promise<any>, concurrencyLimit: number) => {
        const results: any[] = new Array(items.length);
        const executing: Promise<any>[] = [];
        let index = 0;
        
        // Создаем очередь для обработки всех элементов
        const enqueue = async (): Promise<void> => {
            // Обрабатываем текущий элемент
            const i = index++;
            
            // Если все элементы уже в обработке, завершаем
            if (i >= items.length) return;
            
            // Создаем промис для текущего элемента и добавляем его в список выполняющихся
            const execPromise = processFn(items[i])
                .then(result => {
                    // Сохраняем результат в массиве
                    results[i] = result;
                    // Удаляем текущий промис из списка выполняющихся
                    const execIndex = executing.indexOf(execPromise);
                    if (execIndex >= 0) executing.splice(execIndex, 1);
                    // Добавляем следующий элемент в очередь
                    return enqueue();
                });
            
            // Добавляем промис в список выполняющихся
            executing.push(execPromise);
            
            // Если достигли лимита параллельных операций, ждем завершения хотя бы одной
            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        };
        
        // Запускаем начальные параллельные операции
        const initPromises: Promise<void>[] = [];
        for (let i = 0; i < concurrencyLimit && i < items.length; i++) {
            initPromises.push(enqueue());
        }
        
        // Ждем завершения всех операций
        await Promise.all(initPromises);
        await Promise.all(executing);
        
        return results;
    };

    try {
        // Создаем массив индексов для параллельной обработки
        const indices = Array.from({ length: segments.length }, (_, i) => i);
        
        // Определяем количество параллельных операций
        // Рекомендуемое значение: 3 для баланса между скоростью и нагрузкой
        const concurrency = 3;
        
        // Обрабатываем сегменты параллельно
        const results = await parallelProcess(indices, processWavSegment, concurrency);
        
        // Добавляем результаты в итоговый массив
        segmentFiles.push(...results);
        
        // Останавливаем интервал обновлений
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        let manifestData;
        // Если путь к манифесту предоставлен, читаем его
        if (manifestPath) {
            try {
                const manifestContent = await fs.readFile(manifestPath, 'utf8');
                console.log('WAV manifest file read successfully');
                manifestData = {
                    name: path.basename(manifestPath),
                    data: manifestContent
                };
            } catch (error) {
                console.error('Error reading WAV manifest file:', error);
            }
        }
        
        console.log('All WAV segments prepared: ', segmentFiles.length);
        sendProgress(writer, preparationEndPercent, 'WAV segments prepared', {
            type: 'wavPreparation',
            message: 'All WAV segments prepared for client',
            preparationProgress: 100
        });
        
        return {
            segments: segmentFiles,
            manifest: manifestData
        };
    } catch (error) {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error during WAV segment preparation:', error);
        throw error;
    }
};

// Функция для подготовки сегментов MP3 без загрузки в Appwrite
const prepareSegments = async (
    segments: string[],
    segmentsDir: string,
    writer: WritableStreamDefaultWriter
): Promise<{name: string, data: string}[]> => {
    console.log('Preparing MP3 segment data...');
    sendProgress(writer, 75, 'Preparing MP3 segments', {
        type: 'preparation',
        message: 'Preparing MP3 segment data for client...'
    });

    const segmentFiles: {name: string, data: string}[] = [];
    
    // Добавим больше логов для отладки
    console.log(`Total MP3 segments to prepare: ${segments.length}`);
    console.log(`MP3 segments directory: ${segmentsDir}`);
    
    const preparationStartPercent = 75;
    const preparationEndPercent = 90;
    
    // Переменные для плавного обновления прогресса
    let completedSegments = 0;
    let lastUpdateTime = Date.now();
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Функция для обновления плавного прогресса
    const sendSmoothProgress = () => {
        const now = Date.now();
        const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // в секундах
        
        // Предполагаем прогресс в текущих сегментах
        const estimatedSegmentProgress = Math.min(
            completedSegments + (timeSinceLastUpdate * 0.3),
            segments.length - 0.05 // чуть меньше полного значения
        );
        
        // Процент прогресса подготовки
        const preparationProgress = (estimatedSegmentProgress / segments.length) * 100;
        
        // Общий прогресс
        const progress = preparationStartPercent + (preparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
        
        console.log(`MP3 preparation progress: ${estimatedSegmentProgress.toFixed(2)}/${segments.length} (${preparationProgress.toFixed(1)}%)`);
        
        sendProgress(writer, progress, 'Preparing MP3 segments', {
            type: 'preparation',
            progress: progress,
            preparationProgress: preparationProgress,
            message: `MP3 segments prepared: ${Math.floor(estimatedSegmentProgress)} of ${segments.length} (${Math.round(preparationProgress)}%)`
        });
    };
    
    // Запускаем интервал плавных обновлений (каждые 100 мс)
    progressInterval = setInterval(sendSmoothProgress, 100);
    
    // Функция для обработки одного сегмента
    const processSegment = async (segmentIndex: number): Promise<{name: string, data: string}> => {
        const segmentPath = path.join(segmentsDir, segments[segmentIndex]);
        console.log(`Reading MP3 segment file ${segmentIndex+1}/${segments.length}: ${segmentPath}`);
        
        try {
            const segmentData = await fs.readFile(segmentPath);
            console.log(`MP3 segment ${segmentIndex+1} read successfully, size: ${segmentData.length} bytes`);
            
            // Создаем объект с данными
            const segment = {
                name: segments[segmentIndex],
                data: segmentData.toString('base64')
            };
            
            // Увеличиваем счетчик завершенных сегментов
            completedSegments++;
            lastUpdateTime = Date.now();
            
            // Отправляем точное обновление прогресса при завершении сегмента
            const exactPreparationProgress = (completedSegments / segments.length) * 100;
            const exactProgress = preparationStartPercent + (exactPreparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
            
            sendProgress(writer, exactProgress, 'Preparing MP3 segments', {
                type: 'preparation',
                progress: exactProgress,
                preparationProgress: exactPreparationProgress,
                message: `MP3 segments prepared: ${completedSegments} of ${segments.length} (${Math.round(exactPreparationProgress)}%)`
            });
            
            console.log(`MP3 segment ${segmentIndex+1} prepared`);
            return segment;
        } catch (error) {
            console.error(`Error reading MP3 segment ${segmentIndex+1}:`, error);
            throw new Error(`Failed to read segment ${segments[segmentIndex]}: ${error}`);
        }
    };
    
    try {
        // Функция для параллельной обработки с ограничением - используем ту же логику как в других функциях
    const parallelProcess = async (items: number[], processFn: (index: number) => Promise<any>, concurrencyLimit: number) => {
        const results: any[] = new Array(items.length);
        const executing: Promise<any>[] = [];
        let index = 0;
        
        // Создаем очередь для обработки всех элементов
        const enqueue = async (): Promise<void> => {
            // Обрабатываем текущий элемент
            const i = index++;
            
            // Если все элементы уже в обработке, завершаем
            if (i >= items.length) return;
            
            // Создаем промис для текущего элемента и добавляем его в список выполняющихся
            const execPromise = processFn(items[i])
                .then(result => {
                    // Сохраняем результат в массиве
                    results[i] = result;
                    // Удаляем текущий промис из списка выполняющихся
                    const execIndex = executing.indexOf(execPromise);
                    if (execIndex >= 0) executing.splice(execIndex, 1);
                    // Добавляем следующий элемент в очередь
                    return enqueue();
                });
            
            // Добавляем промис в список выполняющихся
            executing.push(execPromise);
            
            // Если достигли лимита параллельных операций, ждем завершения хотя бы одной
            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        };
        
        // Запускаем начальные параллельные операции
        const initPromises: Promise<void>[] = [];
        for (let i = 0; i < concurrencyLimit && i < items.length; i++) {
            initPromises.push(enqueue());
        }
        
        // Ждем завершения всех операций
        await Promise.all(initPromises);
        await Promise.all(executing);
        
        return results;
    };
    
        // Создаем массив индексов для параллельной обработки
        const indices = Array.from({ length: segments.length }, (_, i) => i);
        
        // Определяем количество параллельных операций
        // Рекомендуемое значение: от 3 до 6 для баланса между скоростью и нагрузкой
        const concurrency = 4;
        
        // Обрабатываем сегменты параллельно
        const results = await parallelProcess(indices, processSegment, concurrency);
        
        // Добавляем результаты в итоговый массив
        segmentFiles.push(...results);
        
        // Останавливаем интервал обновлений
        if (progressInterval) {
            clearInterval(progressInterval);
    }
    
        console.log('All MP3 segments prepared: ', segmentFiles.length);
        sendProgress(writer, 90, 'MP3 segments prepared', {
        type: 'preparation',
            message: 'All MP3 segments prepared for client',
            preparationProgress: 100
    });
    
    return segmentFiles;
    } catch (error) {
        // Останавливаем интервал обновлений в случае ошибки
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error during parallel MP3 segment preparation:', error);
        throw error;
    }
};

interface ProgressData {
    type: string; // 'progress', 'complete', 'error'
    progress: number;
    stage: string;
    details?: {
        type: 'init' | 'conversion' | 'metadata' | 'segmentation' | 'preparation';
        progress?: number;
        conversionProgress?: string | number; // Прогресс конвертации в процентах
        segmentProgress?: number; // Прогресс сегментации в процентах
        preparationProgress?: number; // Прогресс подготовки сегментов в процентах
        message: string;
        timemark?: string;
        currentTime?: number;
        totalDuration?: number;
        result?: any;
    } | unknown;
}

// Функция для отправки обновлений о прогрессе
function sendProgress(writer: WritableStreamDefaultWriter, progress: number, stage: string, details?: unknown) {
    const data: ProgressData = {
        type: 'progress',
        progress: Math.round(progress * 10) / 10, // Округляем до 1 десятичного знака для плавности
        stage,
        details
    };
    
    // Ensure JSON is properly formatted
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Функция для отправки сообщения о завершении
function sendComplete(writer: WritableStreamDefaultWriter, result: any) {
    const data = {
        type: 'complete',
        progress: 100,
        stage: 'Processing complete',
        ...result
    };
    
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Функция для отправки ошибки
function sendError(writer: WritableStreamDefaultWriter, error: string, details?: unknown) {
    const data = {
        type: 'error',
        error,
        details
    };
    
    writer.write(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
    let tempDir = '';
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Переменная для интервала прогресса на финальных этапах
    let finalProgressInterval: NodeJS.Timeout | null = null;

    try {
        console.log('[API] Начало обработки запроса на загрузку аудио...');
        sendProgress(writer, 0, 'Processing Started', {
            type: 'init',
            message: 'Initializing audio processing...'
        });
        
        // Получение данных формы
        let formData;
        try {
            formData = await request.formData();
            console.log('[API] Форма успешно получена');
        } catch (error) {
            console.error('[API] Ошибка при получении данных формы:', error);
            throw new Error(`Ошибка при получении данных формы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
        
        // Проверка, выполнена ли сегментация на клиенте
        const isClientSegmentation = formData.get('clientSegmentation') === 'true';
        console.log('[API] Клиентская сегментация:', isClientSegmentation);
        
        // Получение основных параметров из формы
        const trackname = formData.get('trackname') as string;
        const artist = formData.get('artist') as string;
        const genre = formData.get('genre') as string;
        const imageFile = formData.get('image') as File;
        
        // Создание временной директории с улучшенной обработкой ошибок
        try {
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-'));
            console.log('[API] Создана временная директория:', tempDir);
        } catch (error) {
            console.error('[API] Ошибка при создании временной директории:', error);
            sendDetailedError(writer, 'Ошибка при создании временной директории', error);
            throw new Error(`Не удалось создать временную директорию: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
        
        const outputPath = path.join(tempDir, 'output.mp3');
        const segmentsDir = path.join(tempDir, 'segments');
        const wavSegmentsDir = path.join(tempDir, 'wav_segments');

        // Создаем директории для сегментов
        try {
            await fs.mkdir(segmentsDir, { recursive: true });
            console.log('[API] Создана директория для MP3 сегментов:', segmentsDir);
            
            await fs.mkdir(wavSegmentsDir, { recursive: true });
            console.log('[API] Создана директория для WAV сегментов:', wavSegmentsDir);
        } catch (error) {
            console.error('[API] Ошибка при создании директорий для сегментов:', error);
            sendDetailedError(writer, 'Ошибка при создании директорий для сегментов', error);
            throw new Error(`Не удалось создать директории для сегментов: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
        
        // Переменные для хранения путей к файлам и информации о сегментах
        let inputPath = ''; // путь к входному WAV файлу
        let wavSegmentPaths: string[] = []; // пути к WAV сегментам
        let wavManifestPath = ''; // путь к манифесту WAV
        let wavManifestData: any = null; // данные манифеста
        
        if (isClientSegmentation) {
            // ОБРАБОТКА СЕГМЕНТОВ ОТ КЛИЕНТА
            console.log('[API] Обработка WAV сегментов, полученных от клиента');
            sendProgress(writer, 10, 'Processing WAV segments', {
                type: 'clientSegments',
                message: 'Processing WAV segments from client'
            });
            
            // Получаем количество WAV сегментов
            const wavSegmentCount = parseInt(formData.get('wavSegmentCount') as string || '0');
            console.log(`[API] Количество WAV сегментов от клиента: ${wavSegmentCount}`);
            
            // Получаем файл манифеста WAV, если он есть
            const wavManifestFile = formData.get('wavManifest') as File;
            if (wavManifestFile) {
                wavManifestPath = path.join(wavSegmentsDir, 'wav_manifest.json');
                try {
                    const manifestBuffer = Buffer.from(await wavManifestFile.arrayBuffer());
                    await fs.writeFile(wavManifestPath, manifestBuffer);
                    console.log(`[API] Файл манифеста WAV сохранен: ${wavManifestPath}`);
                    
                    // Читаем и парсим манифест
                    const manifestContent = await fs.readFile(wavManifestPath, 'utf8');
                    wavManifestData = JSON.parse(manifestContent);
                    console.log(`[API] Манифест WAV успешно прочитан: ${wavManifestPath}`);
                    console.log(`[API] Информация о WAV: каналы=${wavManifestData.format.channels}, частота=${wavManifestData.format.sampleRate}Hz`);
                } catch (error) {
                    console.error('[API] Ошибка при сохранении/чтении файла манифеста WAV:', error);
                    sendDetailedError(writer, 'Ошибка при обработке манифеста WAV', error);
                    // Продолжаем выполнение, даже если чтение манифеста не удалось
                }
            } else {
                console.log('[API] Файл манифеста WAV не предоставлен');
            }
            
            // Сохраняем WAV сегменты
            for (let i = 0; i < wavSegmentCount; i++) {
                const segmentKey = `wavSegment${i}`;
                const segmentFile = formData.get(segmentKey) as File;
                
                if (segmentFile) {
                    const segmentPath = path.join(wavSegmentsDir, segmentFile.name);
                    try {
                        const segmentBuffer = Buffer.from(await segmentFile.arrayBuffer());
                        await fs.writeFile(segmentPath, segmentBuffer);
                        wavSegmentPaths.push(segmentPath);
                        console.log(`[API] Сохранен WAV сегмент ${i+1}/${wavSegmentCount}: ${segmentPath}, размер=${segmentBuffer.length} байт`);
                    } catch (error) {
                        console.error(`[API] Ошибка при сохранении WAV сегмента ${i+1}:`, error);
                        sendDetailedError(writer, `Ошибка при сохранении WAV сегмента ${i+1}`, error);
                        // Продолжаем с оставшимися сегментами
                    }
                } else {
                    console.error(`[API] WAV сегмент ${i+1} не найден в FormData`);
                }
            }
            
            console.log(`[API] Сохранено ${wavSegmentPaths.length} из ${wavSegmentCount} WAV сегментов`);
            
            if (wavSegmentPaths.length === 0) {
                throw new Error('Не удалось сохранить ни одного WAV сегмента');
            }
            
            sendProgress(writer, 30, 'WAV segments processed', {
                type: 'clientSegments',
                message: `Processed ${wavSegmentPaths.length} WAV segments from client`
            });
            
            // Создаем входной WAV файл из первого сегмента для получения формата
            // Это нужно только для того, чтобы продолжить с существующим кодом
            inputPath = path.join(tempDir, 'input.wav');
            
            try {
                // Копируем первый WAV сегмент как образец для конвертации
                await fs.copyFile(wavSegmentPaths[0], inputPath);
                console.log(`[API] Создан входной WAV файл из первого сегмента: ${inputPath}`);
            } catch (error) {
                console.error('[API] Ошибка при создании входного WAV файла:', error);
                sendDetailedError(writer, 'Ошибка при создании входного WAV файла', error);
                throw new Error(`Не удалось создать входной WAV файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
            }
        } else {
            // ОБРАБОТКА ПОЛНОГО WAV ФАЙЛА (старый код)
            const file = formData.get('audio') as File;

            console.log('[API] Получены данные формы:', {
                fileName: file?.name,
                fileType: file?.type,
                fileSize: file?.size,
                trackname,
                artist,
                genre,
                hasImage: !!imageFile
            });

            if (!file) {
                const error = 'Файл не предоставлен';
                console.error('[API] ' + error);
                sendDetailedError(writer, error);
                throw new Error(error);
            }

            // Проверка файла с улучшенной обработкой ошибок
            try {
                const validation = await validateFile(file);
                if (!validation.isValid) {
                    console.error('[API] Проверка файла не пройдена:', validation.error);
                    sendDetailedError(writer, `Валидация файла не пройдена: ${validation.error}`);
                    throw new Error(validation.error);
                }
                console.log('[API] Проверка файла пройдена успешно');
            } catch (error) {
                console.error('[API] Ошибка при валидации файла:', error);
                sendDetailedError(writer, 'Ошибка при валидации файла', error);
                throw error;
            }
            
            // Сообщаем о начале обработки файла
            sendProgress(writer, 10, 'File Validated', {
                type: 'validation',
                message: 'File validation passed, preparing for processing'
            });

            inputPath = path.join(tempDir, 'input.wav');

            // Сохранение входного файла и сообщение о прогрессе
            sendProgress(writer, 15, 'Saving File', {
                type: 'saving',
                message: 'Saving uploaded file to temporary storage'
            });
            
            try {
                console.log('[API] Преобразование файла в буфер...');
                const buffer = Buffer.from(await file.arrayBuffer());
                console.log('[API] Сохранение входного файла: путь=' + inputPath + ', размер=' + buffer.length + ' байт');
                await fs.writeFile(inputPath, buffer);
                console.log('[API] Входной файл успешно сохранен:', inputPath);
            } catch (error) {
                console.error('[API] Ошибка при сохранении входного файла:', error);
                sendDetailedError(writer, 'Ошибка при сохранении входного файла', error);
                throw new Error(`Не удалось сохранить входной файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
            }
            
            sendProgress(writer, 20, 'File Saved', {
                type: 'saving',
                message: 'File saved successfully, checking audio duration'
            });

            // Проверка длительности с улучшенной обработкой ошибок
            console.log('[API] Проверка длительности аудио...');
            sendProgress(writer, 25, 'Checking Duration', {
                type: 'duration',
                message: 'Analyzing audio file duration'
            });
            
            let duration;
            try {
                duration = await getAudioDuration(inputPath);
                console.log('[API] Длительность аудио:', duration, 'секунд');
            } catch (error) {
                console.error('[API] Ошибка при получении длительности аудио:', error);
                sendDetailedError(writer, 'Ошибка при получении длительности аудио', error);
                throw new Error(`Не удалось определить длительность аудио: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
            }
            
            if (duration > 720) { // 12 минут
                const error = 'Длительность аудиофайла не должна превышать 12 минут';
                console.error('[API] ' + error + `. Текущая длительность: ${duration} секунд`);
                sendDetailedError(writer, error, { duration });
                throw new Error(error);
            }
            
            sendProgress(writer, 30, 'Duration Check Passed', {
                type: 'duration',
                message: `Audio duration: ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}`
            });
        }
        
        // Конвертация аудио с улучшенной обработкой ошибок
        try {
            console.log('[API] Начало конвертации аудио...');
            await convertAudio(inputPath, outputPath, writer);
            console.log('[API] Аудио успешно конвертировано в MP3:', outputPath);
        } catch (error) {
            console.error('[API] Ошибка при конвертации аудио:', error);
            sendDetailedError(writer, 'Ошибка при конвертации аудио в MP3', error);
            throw new Error(`Не удалось конвертировать аудио: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }

        // Добавляем метаданные
        if (trackname || artist || genre || imageFile) {
            console.log('Adding metadata...');
            sendProgress(writer, 45, 'Adding Metadata...', {
                type: 'metadata',
                message: 'Adding track information...'
            });
            
            const tags: any = {
                title: trackname,
                artist: artist,
                genre: genre,
                year: new Date().getFullYear().toString(),
                comment: {
                    language: 'eng',
                    text: 'Processed with Sacral Track'
                }
            };

            if (imageFile) {
                const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
                tags.image = {
                    mime: imageFile.type,
                    type: {
                        id: 3,
                        name: 'front cover'
                    },
                    description: 'Album cover',
                    imageBuffer
                };
            }

            await NodeID3.write(tags, outputPath);
            console.log('Metadata added successfully');
            
            sendProgress(writer, 50, 'Metadata Added', {
                type: 'metadata',
                message: 'Track information successfully added'
            });
        }

        // Создаем сегменты с подробным отслеживанием прогресса
        console.log('Creating audio segments...');
        const segments = await createSegments(outputPath, segmentsDir, writer);
        console.log('Created segments:', segments.length);

        // Проверяем, нужно ли создавать WAV сегменты или они уже предоставлены клиентом
        let wavSegments;
        if (isClientSegmentation) {
            console.log('Using WAV segments from client...');
            // Используем сегменты, полученные от клиента
            wavSegments = {
                segments: wavSegmentPaths,
                manifest: wavManifestPath
            };
        } else {
            // Создаем WAV сегменты из исходного файла
            console.log('Creating WAV segments from original file...');
            wavSegments = await createWavSegments(inputPath, wavSegmentsDir, writer);
        }
        console.log('WAV segments ready:', wavSegments.segments.length);

        // Подготавливаем сегменты WAV для клиента
        console.log('Preparing WAV segments...');
        const wavSegmentFiles = await prepareWavSegments(wavSegments.segments, wavSegmentsDir, writer, wavSegments.manifest);
        console.log('WAV segment files prepared:', wavSegmentFiles.segments.length);

        // Подготавливаем MP3 сегменты
        console.log('Preparing MP3 segments...');
        const segmentFiles = await prepareSegments(segments, segmentsDir, writer);
        console.log('MP3 segment files prepared:', segmentFiles.length);

        // Начинаем процесс финализации с плавным прогрессом
        console.log('Starting finalization process...');
        
        // Переменные для плавного прогресса финализации
        let finalizationProgress = 90;
        const finalizationStartTime = Date.now();
        
        // Функция для обновления прогресса финализации
        const updateFinalizationProgress = () => {
            const now = Date.now();
            const elapsed = (now - finalizationStartTime) / 1000; // в секундах
            
            // Увеличиваем прогресс со временем, но не более 99%
            finalizationProgress = Math.min(99, 90 + (elapsed * 1.5)); // примерно +1.5% за секунду
            
            console.log(`Finalization smooth progress: ${finalizationProgress.toFixed(1)}%`);
            
            sendProgress(writer, finalizationProgress, 'Finalizing', {
                type: 'finalization',
                message: 'Preparing audio file for completion...'
            });
        };
        
        // Запускаем интервал плавного прогресса финализации
        finalProgressInterval = setInterval(updateFinalizationProgress, 200);

        // Читаем финальный аудио файл
        const audioData = await fs.readFile(outputPath);
        console.log('Final audio file size:', audioData.length);

        // Создаем шаблон M3U8 плейлиста 
        // (конкретные URL-адреса будут добавлены клиентом после загрузки в Appwrite)
        console.log('Creating M3U8 playlist template...');
        sendProgress(writer, 95, 'Creating Playlist', {
            type: 'playlist',
            message: 'Creating M3U8 playlist template'
        });
        
        let m3u8Content = "#EXTM3U\n";
        m3u8Content += "#EXT-X-VERSION:3\n";
        m3u8Content += "#EXT-X-MEDIA-SEQUENCE:0\n";
        m3u8Content += "#EXT-X-ALLOW-CACHE:YES\n";
        m3u8Content += "#EXT-X-TARGETDURATION:10\n";
        
        // Добавляем маркеры для сегментов, клиент заменит их на реальные URL
        for (let i = 0; i < segmentFiles.length; i++) {
            m3u8Content += "#EXTINF:10.0,\n";
            m3u8Content += `SEGMENT_PLACEHOLDER_${i}\n`;
        }
        
        m3u8Content += "#EXT-X-ENDLIST";
        
        console.log('M3U8 playlist template created');
        
        // Останавливаем интервал прогресса финализации
        if (finalProgressInterval) {
            clearInterval(finalProgressInterval);
            finalProgressInterval = null;
        }
        
        // Отправляем финальный результат
        console.log('Sending final result to client...');
        sendComplete(writer, { 
            result: {
                segments: segmentFiles, // Отправляем данные MP3 сегментов
                wavSegments: wavSegmentFiles.segments, // Добавляем WAV сегменты
                mp3File: `data:audio/mp3;base64,${audioData.toString('base64')}`,
                m3u8Template: m3u8Content, // Отправляем шаблон M3U8 плейлиста
                wavManifest: wavSegmentFiles.manifest // Добавляем манифест WAV сегментов
            }
        });

        writer.close();
        console.log('Processing completed successfully');

        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        // Останавливаем интервал прогресса, если он активен
        if (finalProgressInterval) {
            clearInterval(finalProgressInterval);
            finalProgressInterval = null;
        }
        
        console.error('[API] Ошибка при обработке аудио:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        const errorDetails = error instanceof Error ? error.stack : '';
        
        // Используем улучшенную функцию отправки ошибки
        sendDetailedError(writer, errorMessage, { 
            stack: errorDetails,
            timestamp: new Date().toISOString(),
            tempDir: tempDir ? tempDir : 'не создана'
        });
        
        writer.close();

        // Очистка временной директории
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                console.log('[API] Очищена временная директория:', tempDir);
            } catch (cleanupError) {
                console.error('[API] Ошибка при очистке временной директории:', cleanupError);
            }
        }

        // Возвращаем ответ с детальной информацией об ошибке
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    }
} 
