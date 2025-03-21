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

// Функция для проверки файла
async function validateFile(file: File): Promise<{ isValid: boolean; error?: string }> {
    if (!file.type.includes('wav')) {
        return { isValid: false, error: 'File must be in WAV format' };
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB
        return { isValid: false, error: 'File size must not exceed 100MB' };
    }
    return { isValid: true };
}

// Функция для получения длительности аудио
function getAudioDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: FfprobeData) => {
            if (err) {
                console.error('Error getting audio duration:', err);
                reject(err);
            } else {
                const duration = metadata.format.duration || 0;
                console.log('Audio duration:', duration, 'seconds');
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

        const ffmpegProcess = spawn('ffmpeg', [
            '-i', inputPath,
            '-vn', // Отключаем видео потоки
            '-ar', '44100', // Аудио sample rate
            '-ac', '2', // Stereo
            '-b:a', '192k', // Битрейт
            '-f', 'mp3', // Формат выходного файла
            outputPath
        ]);

        // Отслеживаем прогресс конвертации через stderr
        let duration = 0;
        let progressPattern = /time=(\d+):(\d+):(\d+.\d+)/;

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
                
                // Вычисляем прогресс в процентах (от 30 до 45%)
                const progress = Math.min(45, 30 + (currentTime / duration) * 15);
                console.log(`Conversion progress: ${currentTime}/${duration} seconds (${progress.toFixed(2)}%)`);
                
                sendProgress(writer, progress, 'Converting to MP3', {
                        type: 'conversion',
                        progress: progress,
                    message: `Converting audio: ${Math.round(progress)}%`
                    });
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Conversion completed successfully');
                sendProgress(writer, 45, 'Conversion complete', {
                    type: 'conversion',
                    message: 'Audio converted to MP3 successfully'
                });
                resolve();
            } else {
                console.error(`FFmpeg process exited with code ${code}`);
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
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

    // Определяем размер сегмента (10 секунд)
    const segmentDuration = 10;
    const totalSegments = Math.ceil(duration / segmentDuration);
    console.log(`Creating ${totalSegments} segments...`);

    const segments: string[] = [];
    
    // Создаем сегменты
    for (let i = 0; i < totalSegments; i++) {
        const startTime = i * segmentDuration;
        const segmentName = `segment_${i.toString().padStart(3, '0')}.mp3`;
        const segmentPath = path.join(outputDir, segmentName);
        
        // Отправляем прогресс (от 50 до 70%)
        const progress = 50 + ((i + 1) / totalSegments) * 20;
        sendProgress(writer, progress, 'Segmenting audio', {
            type: 'segmentation',
            progress: progress,
            message: `Creating segment ${i + 1} of ${totalSegments}`
        });

        try {
            await new Promise<void>((resolve, reject) => {
                const ffmpegProcess = spawn('ffmpeg', [
                    '-i', inputPath,
                    '-ss', startTime.toString(),
                    '-t', segmentDuration.toString(),
                    '-vn',
                    '-ar', '44100',
                    '-ac', '2',
                    '-b:a', '192k',
                    '-f', 'mp3',
                    segmentPath
                ]);

                ffmpegProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Created segment ${segmentName}`);
                        segments.push(segmentName);
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg process exited with code ${code} for segment ${i}`));
                    }
                });

                ffmpegProcess.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error(`Error creating segment ${i}:`, error);
            throw error;
        }
    }

    console.log(`Created ${segments.length} segments successfully`);
    sendProgress(writer, 70, 'Segmentation complete', {
        type: 'segmentation',
        message: `Created ${segments.length} segments successfully`
    });

    return segments;
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

    const segmentFiles = [];
    
    // Добавим больше логов для отладки
    console.log(`Total segments to prepare: ${segments.length}`);
    console.log(`Segments directory: ${segmentsDir}`);
    
    for (let i = 0; i < segments.length; i++) {
        const segmentPath = path.join(segmentsDir, segments[i]);
        
        // Читаем файл сегмента
        console.log(`Reading segment file ${i+1}/${segments.length}: ${segmentPath}`);
        
        try {
            const segmentData = await fs.readFile(segmentPath);
            console.log(`Segment ${i+1} read successfully, size: ${segmentData.length} bytes`);
            
            // Создаем объект с данными
            const segment = {
                name: segments[i],
                data: segmentData.toString('base64')
            };
            
            // Добавляем в список
            segmentFiles.push(segment);
            
            // Отправляем прогресс (от 75 до 90%)
            const progress = 75 + ((i + 1) / segments.length) * 15;
            sendProgress(writer, progress, 'Preparing segments', {
                type: 'preparation',
                progress: progress,
                message: `Prepared segment ${i + 1} of ${segments.length}`
            });
            
            console.log(`Segment ${i+1} prepared and added to list`);
        } catch (error) {
            console.error(`Error reading segment ${i+1}:`, error);
            throw new Error(`Failed to read segment ${segments[i]}: ${error}`);
        }
    }
    
    console.log('All segments prepared: ', segmentFiles.length);
    sendProgress(writer, 90, 'Segments prepared', {
        type: 'preparation',
        message: 'All segments prepared for client'
    });
    
    return segmentFiles;
};

interface ProgressData {
    type: string; // 'progress', 'complete', 'error'
    progress: number;
    stage: string;
    details?: {
        type: 'init' | 'conversion' | 'metadata' | 'segmentation';
        progress?: number;
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
        progress,
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

    try {
        console.log('Starting audio processing request...');
        sendProgress(writer, 0, 'Starting audio processing...', {
            type: 'init',
            message: 'Initializing audio processing...'
        });
        
        const formData = await request.formData();
        const file = formData.get('audio') as File;
        const trackname = formData.get('trackname') as string;
        const artist = formData.get('artist') as string;
        const genre = formData.get('genre') as string;
        const imageFile = formData.get('image') as File;

        console.log('Received form data:', {
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size,
            trackname,
            artist,
            genre,
            hasImage: !!imageFile
        });

        if (!file) {
            throw new Error('No file provided');
        }

        // Проверяем файл
        const validation = await validateFile(file);
        if (!validation.isValid) {
            console.log('File validation failed:', validation.error);
            throw new Error(validation.error);
        }
        console.log('File validation passed');
        
        // Сообщаем о начале обработки файла
        sendProgress(writer, 10, 'File validated', {
            type: 'validation',
            message: 'File validation passed, preparing for processing'
        });

        // Создаем временную директорию
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-'));
        console.log('Created temp directory:', tempDir);
        
        const inputPath = path.join(tempDir, 'input.wav');
        const outputPath = path.join(tempDir, 'output.mp3');
        const segmentsDir = path.join(tempDir, 'segments');

        await fs.mkdir(segmentsDir, { recursive: true });
        console.log('Created segments directory:', segmentsDir);

        // Сохраняем входной файл и сообщаем о прогрессе
        sendProgress(writer, 15, 'Saving file', {
            type: 'saving',
            message: 'Saving uploaded file to temporary storage'
        });
        
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(inputPath, buffer);
        console.log('Saved input file:', inputPath);
        
        sendProgress(writer, 20, 'File saved', {
            type: 'saving',
            message: 'File saved successfully, checking audio duration'
        });

        // Проверяем длительность
        console.log('Checking audio duration...');
        sendProgress(writer, 25, 'Checking audio duration', {
            type: 'duration',
            message: 'Analyzing audio file duration'
        });
        
        const duration = await getAudioDuration(inputPath);
        console.log('Audio duration:', duration, 'seconds');
        
        if (duration > 720) { // 12 минут
            throw new Error('Audio file must not exceed 12 minutes');
        }
        
        sendProgress(writer, 30, 'Duration check passed', {
            type: 'duration',
            message: `Audio duration is ${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}`
        });

        // Проверяем доступность FFmpeg
        try {
            console.log('Checking FFmpeg installation...');
            const ffmpegPath = await new Promise<string>((resolve, reject) => {
                ffmpeg.getAvailableEncoders((err, encoders) => {
                    if (err) reject(err);
                    console.log('Available encoders:', Object.keys(encoders));
                    resolve('ffmpeg'); // Просто возвращаем 'ffmpeg', так как мы проверяем доступность через encoders
                });
            });
            console.log('FFmpeg is available');
        } catch (error) {
            console.error('Error checking FFmpeg:', error);
            throw new Error('FFmpeg not properly configured');
        }

        // Конвертируем в MP3 с подробными отчетами о прогрессе
        console.log('Starting audio conversion to MP3...');
        await convertAudio(inputPath, outputPath, writer);
        
        // Добавляем метаданные
        if (trackname || artist || genre || imageFile) {
            console.log('Adding metadata...');
            sendProgress(writer, 45, 'Adding metadata...', {
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
            
            sendProgress(writer, 50, 'Metadata added', {
                type: 'metadata',
                message: 'Track information added successfully'
            });
        }

        // Создаем сегменты с подробным отслеживанием прогресса
        console.log('Creating audio segments...');
        const segments = await createSegments(outputPath, segmentsDir, writer);
        console.log('Created segments:', segments.length);

        // Вместо вызова uploadSegments, используем prepareSegments
        console.log('Preparing segments...');
        const segmentFiles = await prepareSegments(segments, segmentsDir, writer);
        console.log('Segment files prepared:', segmentFiles.length);

        // Читаем финальный аудио файл
        const audioData = await fs.readFile(outputPath);
        console.log('Final audio file size:', audioData.length);

        // Создаем шаблон M3U8 плейлиста 
        // (конкретные URL-адреса будут добавлены клиентом после загрузки в Appwrite)
        console.log('Creating M3U8 playlist template...');
        sendProgress(writer, 95, 'Creating playlist', {
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
        
        // Отправляем финальный результат
        sendProgress(writer, 100, 'Processing complete', {
            type: 'complete',
            message: 'Audio processing completed successfully'
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

        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        console.error('Error during audio processing:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error instanceof Error ? error.stack : '';
        
        sendError(writer, errorMessage, { details: errorDetails });
        
        writer.close();

        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                console.log('Cleaned up temp directory:', tempDir);
            } catch (cleanupError) {
                console.error('Error cleaning up temp directory:', cleanupError);
            }
        }

        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    }
} 