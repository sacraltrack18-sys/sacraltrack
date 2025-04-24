import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { storage } from '@/libs/AppWriteClient';
import { 
    updateTaskProgress, 
    setTaskError, 
    completeTask,
    ProcessingTaskData 
} from '@/libs/processingState';
import NodeID3 from 'node-id3';
import ffmpeg from 'fluent-ffmpeg';
import { FfprobeData } from 'fluent-ffmpeg';
import { spawn } from 'child_process';

/**
 * Получение длительности аудио
 */
function getAudioDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        console.log(`[WORKER:DURATION] Определение длительности для файла: ${inputPath}`);
        
        ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: FfprobeData) => {
            if (err) {
                console.error('[WORKER:DURATION] Ошибка при получении длительности аудио:', err);
                reject(err);
            } else {
                // Проверяем наличие необходимых данных
                if (!metadata || !metadata.format) {
                    console.error('[WORKER:DURATION] Отсутствуют метаданные формата');
                    // Вместо отказа, предполагаем минимальную длительность для коротких файлов
                    resolve(0.5); // Предполагаем минимальную длительность 0.5 секунд
                    return;
                }
                
                const duration = metadata.format.duration || 0;
                
                // Если длительность слишком мала или не определена, устанавливаем минимальное значение
                if (duration <= 0.01) {
                    console.log('[WORKER:DURATION] Обнаружен очень короткий файл, устанавливаем минимальную длительность');
                    resolve(0.5); // Минимальная обрабатываемая длительность
                } else {
                    console.log('[WORKER:DURATION] Длительность аудио:', duration, 'секунд');
                    resolve(duration);
                }
            }
        });
    });
}

/**
 * Конвертация аудио в MP3
 */
const convertAudio = async (
    inputPath: string,
    outputPath: string,
    taskId: string
): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('[WORKER:CONVERT] Начало конвертации аудио...');
        
        updateTaskProgress(taskId, 30, 'Конвертация в MP3', {
            type: 'conversion',
            message: 'Начинаем конвертацию в MP3...'
        });

        // Параметры FFmpeg с аппаратным ускорением
        const ffmpegProcess = spawn('ffmpeg', [
            '-hwaccel', 'auto',
            '-i', inputPath,
            '-vn',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '192k',
            '-threads', '0',
            '-f', 'mp3',
            '-preset', 'ultrafast',
            outputPath
        ]);

        // Отслеживание прогресса конвертации через stderr
        let duration = 0;
        let progressPattern = /time=(\d+):(\d+):(\d+.\d+)/;
        let conversionStartPercent = 30;
        let conversionEndPercent = 45;
        let lastUpdateTime = Date.now();
        
        ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            
            // Извлекаем длительность, если еще не обнаружена
            if (duration === 0) {
                const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+.\d+)/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseFloat(durationMatch[3]);
                    duration = hours * 3600 + minutes * 60 + seconds;
                    console.log(`[WORKER:CONVERT] Detected duration: ${duration} seconds`);
                }
            }
            
            // Извлекаем текущее время обработки
            const match = output.match(progressPattern);
            if (match && duration > 0) {
                const hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const seconds = parseFloat(match[3]);
                const currentTime = hours * 3600 + minutes * 60 + seconds;
                
                // Вычисляем прогресс в процентах
                const conversionProgress = Math.min(100, (currentTime / duration) * 100);
                
                // Общий прогресс (масштабируем конвертацию между 30% и 45% общего процесса)
                const totalProgress = conversionStartPercent + (conversionProgress / 100) * (conversionEndPercent - conversionStartPercent);
                
                updateTaskProgress(taskId, totalProgress, 'Конвертация в MP3', {
                    type: 'conversion',
                    progress: conversionProgress,
                    conversionProgress: `${Math.round(conversionProgress)}%`,
                    message: `Конвертация: ${Math.round(conversionProgress)}% (${Math.floor(currentTime / 60)}:${(currentTime % 60).toFixed(0).padStart(2, '0')} из ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')})`
                });
                
                lastUpdateTime = Date.now();
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('[WORKER:CONVERT] Конвертация успешно завершена');
                updateTaskProgress(taskId, conversionEndPercent, 'Конвертация завершена', {
                    type: 'conversion',
                    progress: 100,
                    conversionProgress: "100%",
                    message: 'Аудио успешно конвертировано в MP3'
                });
                resolve();
            } else {
                console.error(`[WORKER:CONVERT] FFmpeg завершился с кодом ${code}`);
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            console.error('[WORKER:CONVERT] Ошибка при конвертации:', err);
            reject(err);
        });
    });
};

/**
 * Создание сегментов аудио
 */
const createSegments = async (
    inputPath: string,
    outputDir: string,
    taskId: string
): Promise<string[]> => {
    console.log('[WORKER:SEGMENT] Начало создания сегментов...');
    updateTaskProgress(taskId, 50, 'Сегментация аудио', {
        type: 'segmentation',
        message: 'Подготовка к созданию сегментов аудио'
    });

    // Получаем информацию о файле
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
    console.log(`[WORKER:SEGMENT] Длительность аудио: ${duration} seconds`);

    // Размер сегмента (15 секунд)
    const segmentDuration = 15;
    const totalSegments = Math.ceil(duration / segmentDuration);
    console.log(`[WORKER:SEGMENT] Создаем ${totalSegments} сегментов...`);

    const segments: string[] = [];
    
    // Переменные для расчета прогресса
    const segmentationStartPercent = 50;
    const segmentationEndPercent = 70;
    let completedSegments = 0;
    
    // Функция для создания одного сегмента
    const createSegment = async (index: number): Promise<string> => {
        const startTime = index * segmentDuration;
        const segmentName = `segment_${index.toString().padStart(3, '0')}.mp3`;
        const segmentPath = path.join(outputDir, segmentName);
        
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
                    console.log(`[WORKER:SEGMENT] Создан сегмент ${segmentName}`);
                    
                    // Увеличиваем счетчик завершенных сегментов
                    completedSegments++;
                    
                    // Отправляем обновление прогресса
                    const segmentProgress = (completedSegments / totalSegments) * 100;
                    const totalProgress = segmentationStartPercent + (segmentProgress / 100) * (segmentationEndPercent - segmentationStartPercent);
                    
                    updateTaskProgress(taskId, totalProgress, 'Сегментация аудио', {
                        type: 'segmentation',
                        segmentProgress: segmentProgress,
                        totalSegments: totalSegments,
                        currentSegment: completedSegments,
                        message: `Создание сегментов: ${Math.round(segmentProgress)}% (${completedSegments}/${totalSegments})`
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
    };

    // Параллельная обработка с ограничением
    const parallelProcess = async (items: number[], processFn: (index: number) => Promise<any>, concurrency: number) => {
        const results: any[] = [];
        const running: Set<Promise<any>> = new Set();
        
        for (const item of items) {
            const p = processFn(item).then(result => {
                results.push(result);
                running.delete(p);
                return result;
            });
            
            running.add(p);
            
            if (running.size >= concurrency) {
                // Ждем завершения одной из задач
                await Promise.race(Array.from(running));
            }
        }
        
        // Ждем завершения всех оставшихся задач
        await Promise.all(Array.from(running));
        
        return results;
    };

    try {
        // Создаем массив индексов
        const indices = Array.from({ length: totalSegments }, (_, i) => i);
        
        // Обрабатываем сегменты параллельно с ограничением в 3 потока
        const segmentNames = await parallelProcess(indices, createSegment, 3);
        segments.push(...segmentNames);
        
        console.log(`[WORKER:SEGMENT] Создано ${segments.length} сегментов`);
        updateTaskProgress(taskId, 70, 'Сегментация завершена', {
            type: 'segmentation',
            message: `Создано ${segments.length} сегментов успешно`,
            segmentProgress: 100,
            totalSegments: totalSegments,
            currentSegment: totalSegments
        });
        
        return segments;
    } catch (error) {
        console.error('[WORKER:SEGMENT] Ошибка при создании сегментов:', error);
        throw error;
    }
};

/**
 * Подготовка данных сегментов
 */
const prepareSegments = async (
    segments: string[],
    segmentsDir: string,
    taskId: string
): Promise<{name: string, data: string}[]> => {
    console.log('[WORKER:PREPARE] Подготовка данных сегментов...');
    updateTaskProgress(taskId, 75, 'Подготовка сегментов', {
        type: 'preparation',
        message: 'Подготовка данных сегментов...'
    });

    const segmentFiles: {name: string, data: string}[] = [];
    
    console.log(`[WORKER:PREPARE] Всего сегментов для подготовки: ${segments.length}`);
    
    const preparationStartPercent = 75;
    const preparationEndPercent = 90;
    let completedSegments = 0;
    
    // Функция для обработки одного сегмента
    const processSegment = async (segment: string): Promise<{name: string, data: string}> => {
        const segmentPath = path.join(segmentsDir, segment);
        console.log(`[WORKER:PREPARE] Чтение сегмента: ${segmentPath}`);
        
        const segmentData = await fs.readFile(segmentPath);
        console.log(`[WORKER:PREPARE] Сегмент прочитан, размер: ${segmentData.length} байт`);
        
        // Создаем объект с данными
        const result = {
            name: segment,
            data: segmentData.toString('base64')
        };
        
        // Увеличиваем счетчик завершенных сегментов
        completedSegments++;
        
        // Отправляем обновление прогресса
        const preparationProgress = (completedSegments / segments.length) * 100;
        const totalProgress = preparationStartPercent + (preparationProgress / 100) * (preparationEndPercent - preparationStartPercent);
        
        updateTaskProgress(taskId, totalProgress, 'Подготовка сегментов', {
            type: 'preparation',
            preparationProgress: preparationProgress,
            message: `Подготовка сегментов: ${Math.round(preparationProgress)}% (${completedSegments}/${segments.length})`
        });
        
        return result;
    };

    // Параллельная обработка с ограничением
    const parallelProcess = async (items: string[], processFn: (item: string) => Promise<any>, concurrency: number) => {
        const results: any[] = [];
        const running: Set<Promise<any>> = new Set();
        
        for (const item of items) {
            const p = processFn(item).then(result => {
                results.push(result);
                running.delete(p);
                return result;
            });
            
            running.add(p);
            
            if (running.size >= concurrency) {
                // Ждем завершения одной из задач
                await Promise.race(Array.from(running));
            }
        }
        
        // Ждем завершения всех оставшихся задач
        await Promise.all(Array.from(running));
        
        return results;
    };

    try {
        // Обрабатываем сегменты параллельно с ограничением в 4 потока
        const results = await parallelProcess(segments, processSegment, 4);
        segmentFiles.push(...results);
        
        console.log('[WORKER:PREPARE] Все сегменты подготовлены:', segmentFiles.length);
        updateTaskProgress(taskId, 90, 'Сегменты подготовлены', {
            type: 'preparation',
            message: 'Все сегменты подготовлены',
            preparationProgress: 100
        });
        
        return segmentFiles;
    } catch (error) {
        console.error('[WORKER:PREPARE] Ошибка при подготовке сегментов:', error);
        throw error;
    }
};

/**
 * Основная функция для обработки аудио из Appwrite Storage
 */
export async function processAudioFromAppwrite(
    taskId: string,
    taskData: ProcessingTaskData
): Promise<void> {
    let tempDir = '';
    
    try {
        console.log('[WORKER] Начало обработки аудио из Appwrite...');
        const { fileId, bucketId, imageId, trackname, artist, genre } = taskData;
        
        updateTaskProgress(taskId, 5, 'Инициализация', {
            type: 'init',
            message: 'Создание временной директории для обработки'
        });
        
        // Создаем временную директорию для обработки
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-'));
        console.log('[WORKER] Создана временная директория:', tempDir);
        
        const inputPath = path.join(tempDir, 'input.wav');
        const outputPath = path.join(tempDir, 'output.mp3');
        const segmentsDir = path.join(tempDir, 'segments');
        
        await fs.mkdir(segmentsDir, { recursive: true });
        
        // Скачиваем аудио файл из Appwrite
        updateTaskProgress(taskId, 10, 'Загрузка файла', {
            type: 'downloading',
            message: 'Скачивание аудио файла из хранилища...'
        });
        
        try {
            const fileResponse = await storage.getFileDownload(bucketId, fileId);
            
            if (!fileResponse) {
                throw new Error('Не удалось получить файл из Appwrite');
            }
            
            // Преобразуем ответ в Buffer и сохраняем как файл
            let buffer: Buffer;
            
            if (fileResponse instanceof Blob || fileResponse instanceof File) {
                buffer = Buffer.from(await fileResponse.arrayBuffer());
            } else if (fileResponse instanceof ArrayBuffer) {
                buffer = Buffer.from(fileResponse);
            } else if (Buffer.isBuffer(fileResponse)) {
                buffer = fileResponse;
            } else if (typeof fileResponse === 'object' && fileResponse !== null) {
                const arrayBuffer = await (fileResponse as any).arrayBuffer?.();
                if (arrayBuffer) {
                    buffer = Buffer.from(arrayBuffer);
                } else {
                    throw new Error('Неподдерживаемый тип данных от Appwrite Storage');
                }
            } else {
                throw new Error('Неподдерживаемый тип данных от Appwrite Storage');
            }
            
            await fs.writeFile(inputPath, buffer);
            console.log('[WORKER] Аудио файл сохранен:', inputPath);
            
            updateTaskProgress(taskId, 15, 'Файл сохранен', {
                type: 'downloading',
                message: 'Аудио файл успешно скачан'
            });
            
        } catch (error) {
            console.error('[WORKER] Ошибка при скачивании файла из Appwrite:', error);
            throw new Error(`Не удалось скачать аудио файл: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Скачиваем изображение, если оно есть
        let imageFile: Blob | null = null;
        
        if (imageId) {
            updateTaskProgress(taskId, 20, 'Загрузка обложки', {
                type: 'downloading',
                message: 'Скачивание изображения обложки...'
            });
            
            try {
                const imageResponse = await storage.getFileDownload(bucketId, imageId);
                
                // Обрабатываем изображение аналогично основному файлу
                let imageBuffer: Buffer;
                
                if (imageResponse instanceof Blob || imageResponse instanceof File) {
                    imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                } else if (imageResponse instanceof ArrayBuffer) {
                    imageBuffer = Buffer.from(imageResponse);
                } else if (Buffer.isBuffer(imageResponse)) {
                    imageBuffer = imageResponse;
                } else if (typeof imageResponse === 'object' && imageResponse !== null) {
                    const arrayBuffer = await (imageResponse as any).arrayBuffer?.();
                    if (arrayBuffer) {
                        imageBuffer = Buffer.from(arrayBuffer);
                    } else {
                        throw new Error('Неподдерживаемый тип данных изображения');
                    }
                } else {
                    throw new Error('Неподдерживаемый тип данных изображения');
                }
                
                const imagePath = path.join(tempDir, 'cover.jpg');
                await fs.writeFile(imagePath, imageBuffer);
                
                // Создаем File объект из буфера для дальнейшего использования
                imageFile = new Blob([imageBuffer], { type: 'image/jpeg' });
                console.log('[WORKER] Изображение сохранено');
                
            } catch (error) {
                console.error('[WORKER] Ошибка при скачивании изображения:', error);
                // Продолжаем без изображения
            }
        }
        
        // Проверяем длительность аудио
        updateTaskProgress(taskId, 25, 'Проверка длительности', {
            type: 'duration',
            message: 'Анализ длительности аудио файла'
        });
        
        let duration: number;
        try {
            duration = await getAudioDuration(inputPath);
            console.log('[WORKER] Длительность аудио:', duration, 'секунд');
            
            if (duration > 720) { // 12 минут
                throw new Error(`Длительность аудио превышает 12 минут (${duration} секунд)`);
            }
            
            updateTaskProgress(taskId, 30, 'Проверка пройдена', {
                type: 'duration',
                message: `Длительность аудио: ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}`
            });
            
        } catch (error) {
            console.error('[WORKER] Ошибка при проверке длительности:', error);
            throw new Error(`Не удалось проверить длительность аудио: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Конвертируем аудио в MP3
        try {
            await convertAudio(inputPath, outputPath, taskId);
        } catch (error) {
            console.error('[WORKER] Ошибка при конвертации аудио:', error);
            throw new Error(`Не удалось конвертировать аудио: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Добавляем метаданные
        if (trackname || artist || genre || imageFile) {
            console.log('[WORKER] Добавление метаданных...');
            updateTaskProgress(taskId, 45, 'Добавление метаданных', {
                type: 'metadata',
                message: 'Добавление информации о треке...'
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
            console.log('[WORKER] Метаданные добавлены');
            
            updateTaskProgress(taskId, 50, 'Метаданные добавлены', {
                type: 'metadata',
                message: 'Информация о треке успешно добавлена'
            });
        }
        
        // Создаем сегменты
        let segments: string[];
        try {
            segments = await createSegments(outputPath, segmentsDir, taskId);
        } catch (error) {
            console.error('[WORKER] Ошибка при создании сегментов:', error);
            throw new Error(`Не удалось создать сегменты: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Подготавливаем данные сегментов
        let segmentFiles: {name: string, data: string}[];
        try {
            segmentFiles = await prepareSegments(segments, segmentsDir, taskId);
        } catch (error) {
            console.error('[WORKER] Ошибка при подготовке данных сегментов:', error);
            throw new Error(`Не удалось подготовить данные сегментов: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Подготовка финальных результатов
        updateTaskProgress(taskId, 95, 'Финализация', {
            type: 'finalization',
            message: 'Подготовка финальных данных...'
        });
        
        // Читаем финальный MP3 файл
        const audioData = await fs.readFile(outputPath);
        
        // Создаем шаблон M3U8 плейлиста
        let m3u8Content = "#EXTM3U\n";
        m3u8Content += "#EXT-X-VERSION:3\n";
        m3u8Content += "#EXT-X-MEDIA-SEQUENCE:0\n";
        m3u8Content += "#EXT-X-ALLOW-CACHE:YES\n";
        m3u8Content += "#EXT-X-TARGETDURATION:10\n";
        
        // Добавляем маркеры для сегментов
        for (let i = 0; i < segmentFiles.length; i++) {
            m3u8Content += "#EXTINF:10.0,\n";
            m3u8Content += `SEGMENT_PLACEHOLDER_${i}\n`;
        }
        
        m3u8Content += "#EXT-X-ENDLIST";
        
        // Завершаем обработку с результатами
        completeTask(taskId, {
            segments: segmentFiles,
            mp3File: `data:audio/mp3;base64,${audioData.toString('base64')}`,
            m3u8Template: m3u8Content
        });
        
        console.log('[WORKER] Обработка аудио успешно завершена');
        
    } catch (error) {
        console.error('[WORKER] Ошибка при обработке аудио:', error);
        setTaskError(taskId, error);
    } finally {
        // Очистка временной директории
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                console.log('[WORKER] Очищена временная директория:', tempDir);
            } catch (cleanupError) {
                console.error('[WORKER] Ошибка при очистке временной директории:', cleanupError);
            }
        }
    }
} 