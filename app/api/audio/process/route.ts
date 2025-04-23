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

        // Упрощенные параметры для FFmpeg без проблемных опций
        const ffmpegProcess = spawn('ffmpeg', [
            '-y',                  // Автоматически перезаписывать существующие файлы без запроса
            '-i', inputPath,
            '-vn',                 // Отключаем видео потоки
            '-ar', '44100',        // Аудио sample rate
            '-ac', '2',            // Stereo
            '-b:a', '192k',        // Битрейт (увеличен до 192k)
            '-f', 'mp3',           // Формат выходного файла
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
            
            // Предполагаем скорость обработки на основе предыдущих обновлений (в 5x скорости реального времени)
            const estimatedProgressIncrease = Math.min(
                (timeSinceLastUpdate * 5) / duration * 100, // оценка увеличения процента
                2 // Максимальное увеличение за одно обновление - 2%
            );
            
            // Обновляем предполагаемый прогресс, не превышая следующую ожидаемую отметку
            const estimatedProgress = Math.min(
                lastReportedProgress + estimatedProgressIncrease,
                100 // Не превышаем 100%
            );
            
            // Рассчитываем предполагаемое текущее время воспроизведения
            const estimatedCurrentTime = Math.min(
                lastReportedTime + timeSinceLastUpdate * 5, // предполагаемое увеличение времени
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
            
            // Автоматически увеличиваем lastReportedProgress даже без реальных обновлений от FFmpeg
            // Это обеспечит движение прогресс-бара даже если FFmpeg не отправляет обновления
            lastReportedProgress = Math.min(lastReportedProgress + 0.5, 99);
            lastReportedTime = Math.min(lastReportedTime + timeSinceLastUpdate * 2, duration - 1);
        };

        // Запускаем интервал для плавных обновлений прогресса (каждые 500 мс)
        progressInterval = setInterval(sendSmoothProgress, 500);

        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            console.log(`FFmpeg output: ${output.substring(0, 200)}`);
            
            // Извлекаем длительность, если еще не обнаружена
            if (duration === 0) {
                const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+.\d+)/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseFloat(durationMatch[3]);
                    duration = hours * 3600 + minutes * 60 + seconds;
                    console.log(`Detected duration: ${duration} seconds`);
                    
                    // Устанавливаем начальные значения для плавного прогресса
                    lastReportedTime = 0;
                    lastReportedProgress = 0;
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

    // Упрощенный подход: создаем все сегменты сразу с помощью FFmpeg
    const outputTemplate = path.join(outputDir, 'segment_%03d.mp3');
    
    return new Promise((resolve, reject) => {
        // Показываем плавный прогресс сегментации
        const segmentationStartPercent = 50;
        const segmentationEndPercent = 70;
        let progressValue = segmentationStartPercent;
        const progressInterval = setInterval(() => {
            progressValue = Math.min(progressValue + 0.5, segmentationEndPercent - 1);
            const segmentProgress = ((progressValue - segmentationStartPercent) / (segmentationEndPercent - segmentationStartPercent)) * 100;
            
            sendProgress(writer, progressValue, 'Segmenting audio', {
                type: 'segmentation',
                progress: progressValue,
                segmentProgress: segmentProgress,
                totalSegments: totalSegments,
                currentSegment: Math.floor((segmentProgress / 100) * totalSegments),
                message: `Creating segments: ${Math.round(segmentProgress)}% (approximately ${Math.floor((segmentProgress / 100) * totalSegments)}/${totalSegments})`
            });
        }, 500);
        
        // Создаем сегменты с помощью FFmpeg segment
        const ffmpegProcess = spawn('ffmpeg', [
            '-y',                  // Автоматически перезаписывать существующие файлы без запроса
            '-i', inputPath,
            '-f', 'segment',
            '-segment_time', segmentDuration.toString(),
            '-c:a', 'libmp3lame',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '192k',
            outputTemplate
        ]);
        
        // Обрабатываем вывод FFmpeg для отладки
        ffmpegProcess.stderr.on('data', (data) => {
            console.log(`Segment FFmpeg output: ${data.toString().substring(0, 200)}`);
        });
        
        ffmpegProcess.on('close', (code) => {
            clearInterval(progressInterval);
            
            if (code === 0) {
                // Чтение директории для получения списка созданных сегментов
                fs.readdir(outputDir).then(files => {
                    const segments = files.filter(file => file.startsWith('segment_') && file.endsWith('.mp3'))
                                         .sort(); // Сортируем для правильного порядка
                                         
                    console.log(`Created ${segments.length} segments successfully`);
                    
                    // Отправляем финальный прогресс сегментации
                    sendProgress(writer, segmentationEndPercent, 'Segmentation complete', {
                        type: 'segmentation',
                        progress: segmentationEndPercent,
                        segmentProgress: 100,
                        totalSegments: totalSegments,
                        currentSegment: totalSegments,
                        message: `Created ${segments.length} segments successfully`
                    });
                    
                    resolve(segments);
                }).catch(err => {
                    console.error('Error reading segment directory:', err);
                    reject(err);
                });
            } else {
                console.error(`FFmpeg segmentation process exited with code ${code}`);
                reject(new Error(`FFmpeg segmentation process exited with code ${code}`));
            }
        });
        
        ffmpegProcess.on('error', (err) => {
            clearInterval(progressInterval);
            console.error('Error during segmentation:', err);
            reject(err);
        });
    });
};

// Функция для подготовки сегментов без загрузки в Appwrite
const prepareSegments = async (
    segments: string[],
    segmentsDir: string,
    writer: WritableStreamDefaultWriter
): Promise<{name: string, data: string}[]> => {
    console.log('Preparing segment data...');
    sendProgress(writer, 75, 'Preparing segments', {
        type: 'preparation',
        message: 'Preparing segment data for client...'
    });

    const segmentFiles: {name: string, data: string}[] = [];
    
    // Добавим больше логов для отладки
    console.log(`Total segments to prepare: ${segments.length}`);
    console.log(`Segments directory: ${segmentsDir}`);
    
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
        
        // Оценка общего прогресса на основе завершенных сегментов
        // (небольшое увеличение для создания эффекта движения)
        const estimatedSegmentProgress = Math.min(
            completedSegments + (timeSinceLastUpdate * 0.3),
            segments.length - 0.05 // чуть меньше полного значения
        );
        
        // Процент прогресса подготовки
        const preparationProgress = (estimatedSegmentProgress / segments.length) * 100;
        
        // Общий прогресс
        const progress = preparationStartPercent + (preparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
        
        console.log(`Smooth preparation progress: ${estimatedSegmentProgress.toFixed(2)}/${segments.length} (${preparationProgress.toFixed(1)}%)`);
        
        sendProgress(writer, progress, 'Preparing segments', {
            type: 'preparation',
            progress: progress,
            preparationProgress: preparationProgress,
            message: `Segment preparation: ${Math.floor(preparationProgress)}% (processed approximately ${Math.floor(estimatedSegmentProgress)}/${segments.length})`
        });
    };
    
    // Запускаем интервал плавных обновлений каждые 100 мс для более частого обновления UI
    progressInterval = setInterval(sendSmoothProgress, 100);
    
    // Функция для обработки одного сегмента
    const processSegment = async (segmentIndex: number): Promise<{name: string, data: string}> => {
        const segmentPath = path.join(segmentsDir, segments[segmentIndex]);
        console.log(`Reading segment file ${segmentIndex+1}/${segments.length}: ${segmentPath}`);
        
        try {
            const segmentData = await fs.readFile(segmentPath);
            console.log(`Segment ${segmentIndex+1} read successfully, size: ${segmentData.length} bytes`);
            
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
            
            sendProgress(writer, exactProgress, 'Preparing segments', {
                type: 'preparation',
                progress: exactProgress,
                preparationProgress: exactPreparationProgress,
                message: `Segments prepared: ${completedSegments} of ${segments.length} (${Math.round(exactPreparationProgress)}%)`
            });
            
            console.log(`Segment ${segmentIndex+1} prepared`);
            return segment;
        } catch (error) {
            console.error(`Error reading segment ${segmentIndex+1}:`, error);
            throw new Error(`Failed to read segment ${segments[segmentIndex]}: ${error}`);
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
    
    console.log('All segments prepared: ', segmentFiles.length);
    sendProgress(writer, 90, 'Segments prepared', {
        type: 'preparation',
            message: 'All segments prepared for client',
            preparationProgress: 100
    });
    
    return segmentFiles;
    } catch (error) {
        // Останавливаем интервал обновлений в случае ошибки
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        console.error('Error during parallel segment preparation:', error);
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
    // Create a response with streaming support
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Create a response object with proper headers
    const response = new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

    // Process in background
    (async () => {
        try {
            // Check if the request is multipart/form-data
            const contentType = request.headers.get('content-type');
            if (!contentType || !contentType.includes('multipart/form-data')) {
                sendError(writer, 'Request must be multipart/form-data');
                writer.close();
                return;
            }

            const formData = await request.formData();
            const audio = formData.get('audio') as File;
            const image = formData.get('image') as File;
            const trackname = formData.get('trackname') as string;
            const genre = formData.get('genre') as string;
            const skipWavUpload = formData.get('skipWavUpload') === 'true'; // New parameter to skip WAV upload

            console.log('Received files:', { 
                audioName: audio?.name, 
                audioSize: audio?.size, 
                audioType: audio?.type,
                imageName: image?.name,
                skipWavUpload: skipWavUpload
            });

            // Validate the audio file
            if (!audio) {
                sendError(writer, 'No audio file provided');
                writer.close();
                return;
            }

            const audioValidation = await validateFile(audio);
            if (!audioValidation.isValid) {
                sendError(writer, audioValidation.error || 'Invalid audio file');
                writer.close();
                return;
            }

            // Валидация иных входных данных
            if (!trackname || trackname.trim() === '') {
                sendError(writer, 'Track name is required');
                writer.close();
                return;
            }

            if (!genre || genre.trim() === '') {
                sendError(writer, 'Genre is required');
                writer.close();
                return;
            }

            // Create a temporary directory for processing
            const processId = ID.unique();
            const tmpDir = path.join(os.tmpdir(), 'audio-processing', processId);
            console.log('Using temporary directory:', tmpDir);
            
            try {
                await fs.mkdir(tmpDir, { recursive: true });
                await fs.mkdir(path.join(tmpDir, 'segments'), { recursive: true });
            } catch (error) {
                console.error('Error creating temp directory:', error);
                sendError(writer, 'Failed to create temporary directory');
                writer.close();
                return;
            }

            // Save the audio file to disk
            console.log('Saving audio file to temporary location...');
            const audioBuffer = await audio.arrayBuffer();
            const audioPath = path.join(tmpDir, `original.wav`);
            await fs.writeFile(audioPath, Buffer.from(audioBuffer));
            console.log('Audio file saved to:', audioPath);

            // If we're not skipping WAV upload progress (for backward compatibility)
            if (!skipWavUpload) {
                // Simulate WAV upload progress since we already have the WAV file
                const totalSteps = 10;
                for (let i = 0; i <= totalSteps; i++) {
                    // Skip if the next step is already 100%
                    if (i === totalSteps) {
                        sendProgress(writer, 30, 'Uploading WAV', {
                            type: 'upload',
                            progress: 100,
                            message: 'Upload complete'
                        });
                    } else {
                        // Interpolate progress from 0 to 30%
                        const progress = (i / totalSteps) * 30;
                        sendProgress(writer, progress, 'Uploading WAV', {
                            type: 'upload',
                            progress: (i / totalSteps) * 100,
                            message: `Uploading WAV file: ${Math.round((i / totalSteps) * 100)}%`
                        });
                    }
                    // Add delay between steps
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            // Проверка длительности аудио (не более 12 минут)
            try {
                console.log('Checking audio duration...');
                const audioDuration = await getAudioDuration(audioPath);
                
                if (audioDuration > 12 * 60) { // 12 minutes in seconds
                    sendError(writer, 'Audio duration exceeds the maximum allowed (12 minutes)');
                    writer.close();
                    return;
                }
                
                console.log('Audio duration check passed:', audioDuration, 'seconds');
            } catch (error) {
                console.error('Error checking audio duration:', error);
                sendError(writer, 'Failed to check audio duration');
                writer.close();
                return;
            }

            // Convert audio to MP3
            const mp3Path = path.join(tmpDir, 'audio.mp3');
            try {
                sendProgress(writer, skipWavUpload ? 0 : 30, 'Converting to MP3', {
                    type: 'conversion',
                    message: 'Starting audio conversion'
                });
                
                console.log('Converting audio to MP3...');
                await convertAudio(audioPath, mp3Path, writer);
                console.log('Audio conversion completed:', mp3Path);
            } catch (error) {
                console.error('Error converting audio:', error);
                sendError(writer, 'Failed to convert audio');
                writer.close();
                return;
            }

            // Добавляем метаданные
            if (trackname || genre || image) {
                console.log('Adding metadata...');
                sendProgress(writer, 45, 'Adding Metadata...', {
                    type: 'metadata',
                    message: 'Adding track information...'
                });
                
                const tags: any = {
                    title: trackname,
                    genre: genre,
                    year: new Date().getFullYear().toString(),
                    comment: {
                        language: 'eng',
                        text: 'Processed with Sacral Track'
                    }
                };

                if (image) {
                    const imageBuffer = Buffer.from(await image.arrayBuffer());
                    tags.image = {
                        mime: image.type,
                        type: {
                            id: 3,
                            name: 'front cover'
                        },
                        description: 'Album cover',
                        imageBuffer
                    };
                }

                await NodeID3.write(tags, mp3Path);
                console.log('Metadata added successfully');
                
                sendProgress(writer, 50, 'Metadata Added', {
                    type: 'metadata',
                    message: 'Track information successfully added'
                });
            }

            // Создаем сегменты с подробным отслеживанием прогресса
            console.log('Creating audio segments...');
            const segments = await createSegments(mp3Path, path.join(tmpDir, 'segments'), writer);
            console.log('Created segments:', segments.length);

            // Вместо вызова uploadSegments, используем prepareSegments
            console.log('Preparing segments...');
            const segmentFiles = await prepareSegments(segments, path.join(tmpDir, 'segments'), writer);
            console.log('Segment files prepared:', segmentFiles.length);

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
            const finalProgressInterval = setInterval(updateFinalizationProgress, 200);

            // Читаем финальный аудио файл
            const audioData = await fs.readFile(mp3Path);
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
            }
            
            // Отправляем финальный результат
            sendProgress(writer, 100, 'Processing Complete', {
                type: 'complete',
                message: 'Audio processing successfully completed'
            });
            
            // Отправляем результат клиенту
            console.log('Sending final result to client...');
            sendComplete(writer, { 
                result: {
                    segments: segmentFiles, // Отправляем данные сегментов
                    mp3File: `data:audio/mp3;base64,${audioData.toString('base64')}`,
                    m3u8Template: m3u8Content // Отправляем шаблон M3U8 плейлиста
                }
            });

            writer.close();
            console.log('Processing completed successfully');

        } catch (error) {
            // Останавливаем интервал прогресса, если он активен
            const finalProgressInterval = setInterval(() => {}, 1000);
            
            console.error('[API] Ошибка при обработке аудио:', error);
            
            // Форматируем сообщение об ошибке для логирования и отправки
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            const errorDetails = error instanceof Error && error.stack ? error.stack : 'Нет информации о стеке вызовов';
            
            console.error('[API] Детали ошибки:', {
                message: errorMessage,
                stack: errorDetails,
                timestamp: new Date().toISOString()
            });
            
            writer.close();

            // Очистка временной директории
            // We don't have access to tmpDir here since it's defined in the async block
            // If we need cleanup, we should handle it differently or restructure the code
            
            // Возвращаем ответ с детальной информацией об ошибке
            return response;
        }
    })();
    
    // Return the response outside the async function
    return response;
} 
