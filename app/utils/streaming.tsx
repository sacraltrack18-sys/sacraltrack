import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Создаем один экземпляр FFmpeg с правильными настройками
const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',  // Обновленная версия
    logger: ({ message }) => {
        console.log('FFmpeg Log:', message);
    },
    progress: ({ ratio }) => {
        console.log('FFmpeg Progress:', ratio);
    }
});

let isFFmpegLoaded = false;

// Функция для инициализации FFmpeg
export async function initFFmpeg(): Promise<boolean> {
    if (isFFmpegLoaded) return true;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            console.log('Initializing FFmpeg, attempt:', retryCount + 1);
            await ffmpeg.load();
            isFFmpegLoaded = true;
            console.log('FFmpeg initialized successfully');
            return true;
        } catch (error) {
            console.error(`FFmpeg initialization error (attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount === maxRetries) {
                throw new Error('Failed to initialize FFmpeg after multiple attempts');
            }
            // Ждем перед следующей попыткой
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return false;
}

// Функция для очистки временных файлов из системы FFmpeg
async function cleanup(files: string[]) {
    for (const file of files) {
        try {
            await ffmpeg.FS('unlink', file);
        } catch (error) {
            console.error(`Ошибка при удалении файла ${file}:`, error);
        }
    }
}

// Вспомогательная функция для удаления расширения файла
function removeFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
}

// Обновляем типы для более точного отслеживания прогресса
type ProcessingStats = {
    stage: string;
    progress: number;
    details?: string;
};

// Функция для конвертации WAV в MP3
export async function convertWavToMp3(audioFile: File, onProgress: (stats: ProcessingStats) => void): Promise<Blob> {
    try {
        if (!isFFmpegLoaded) {
            console.log('Loading FFmpeg...');
            await initFFmpeg();
        }

        onProgress({ stage: 'Loading audio file', progress: 0 });

        // Получаем длительность аудио для расчета прогресса
        const audioElement = new Audio(URL.createObjectURL(audioFile));
        await new Promise((resolve) => {
            audioElement.addEventListener('loadedmetadata', resolve);
        });
        const duration = audioElement.duration;

        // Записываем входной файл
        const inputData = new Uint8Array(await audioFile.arrayBuffer());
        ffmpeg.FS('writeFile', 'input.wav', inputData);

        onProgress({ stage: 'Converting to MP3...', progress: 20 });

        // Настраиваем логгер для отслеживания прогресса
        ffmpeg.setLogger(({ type, message }) => {
            if (type === 'fferr') {
                const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/);
                if (timeMatch) {
                    const [_, hours, minutes, seconds] = timeMatch;
                    const currentTime = parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
                    const progress = Math.min(20 + (currentTime / duration) * 60, 80);
                    
                    onProgress({ 
                        stage: 'Converting to MP3...',
                        progress,
                    });
                }
            }
        });
        
        // Оптимизированные настройки FFmpeg для максимальной скорости
        await ffmpeg.run(
            '-i', 'input.wav',
            '-c:a', 'libmp3lame',    // MP3 кодек
            '-b:a', '192k',          // Битрейт
            '-ac', '2',              // Стерео
            '-ar', '44100',          // Частота дискретизации
            '-compression_level', '0', // Минимальная компрессия
            '-threads', 'auto',       // Все потоки
            '-preset', 'veryfast',    // Очень быстрая предустановка
            '-qscale:a', '2',        // Высокое качество VBR
            '-joint_stereo', '1',     // Объединенное стерео для скорости
            '-f', 'mp3',             // Принудительно MP3 формат
            '-bufsize', '192k',      // Размер буфера
            '-maxrate', '192k',      // Максимальный битрейт
            '-y',                    // Перезапись файла
            'output.mp3'
        );

        onProgress({ stage: 'Track segmentation...', progress: 90 });

        // Проверяем существование выходного файла
        try {
            const data = ffmpeg.FS('readFile', 'output.mp3');
            console.log('Successfully read output file, size:', data.length);
            
            // Очищаем файлы
            ffmpeg.FS('unlink', 'input.wav');
            ffmpeg.FS('unlink', 'output.mp3');
            
            onProgress({ stage: 'Complete', progress: 100 });
            return new Blob([data.buffer], { type: 'audio/mp3' });
        } catch (readError) {
            console.error('Error reading output file:', readError);
            throw new Error('Failed to read converted audio file');
        }
    } catch (error) {
        console.error('MP3 conversion error:', error);
        throw error;
    }
}

// Функция для создания M3U8 плейлиста с ID сегментов
export function createM3U8File(segmentIds: string[]): File {
    const m3u8Content = '#EXTM3U\n' +
        '#EXT-X-VERSION:3\n' +
        '#EXT-X-TARGETDURATION:10\n' +
        '#EXT-X-MEDIA-SEQUENCE:0\n' +
        '#EXT-X-PLAYLIST-TYPE:VOD\n\n' +
        segmentIds.map(id => `#EXTINF:10,\n${id}`).join('\n') +
        '\n#EXT-X-ENDLIST';

    return new File([m3u8Content], 'playlist.m3u8', {
        type: 'application/vnd.apple.mpegurl'
    });
}

// Функция для сегментации аудио
export async function segmentAudio(mp3Blob: Blob, onProgress: (stats: ProcessingStats) => void): Promise<File[]> {
    try {
        if (!isFFmpegLoaded) await initFFmpeg();

        onProgress({ stage: 'Starting segmentation', progress: 0 });
        const arrayBuffer = await mp3Blob.arrayBuffer();
        const inputData = new Uint8Array(arrayBuffer);

        await ffmpeg.FS('writeFile', 'input.mp3', inputData);

        // Сегментация в MP3 формате
        await ffmpeg.run(
            '-i', 'input.mp3',
            '-f', 'segment',
            '-segment_time', '10',
            '-c', 'copy',              // Копируем аудио без перекодирования
            '-map', '0:a',
            '-segment_format', 'mp3',  // Формат сегментов MP3
            'segment%03d.mp3'          // Выходные файлы в формате MP3
        );

        // Собираем сегменты
        const segments: File[] = [];
        let segmentIndex = 0;
        
        while (true) {
            try {
                const segmentName = `segment${String(segmentIndex).padStart(3, '0')}.mp3`;
                const segmentData = ffmpeg.FS('readFile', segmentName);
                segments.push(new File([segmentData], segmentName, { type: 'audio/mp3' }));
                await ffmpeg.FS('unlink', segmentName);
                segmentIndex++;
            } catch (e) {
                break;
            }
        }

        await cleanup(['input.mp3']);
        return segments;
    } catch (error) {
        console.error('Segmentation error:', error);
        throw error;
    }
}

// Функция для оптимизации изображения
export async function optimizeImage(imageFile: File, onProgress: (stats: ProcessingStats) => void): Promise<Blob> {
    try {
        if (!isFFmpegLoaded) {
            await initFFmpeg();
        }

        // Показываем начало процесса
        onProgress({ 
            stage: 'Starting image optimization...', 
            progress: 0 
        });

        // Получаем информацию о входном файле
        const originalSize = imageFile.size;
        console.log('Original image size:', (originalSize / 1024).toFixed(2), 'KB');

        // Читаем входной файл
        const inputData = new Uint8Array(await imageFile.arrayBuffer());
        await ffmpeg.FS('writeFile', 'input.jpg', inputData);

        onProgress({ 
            stage: 'Optimizing image...', 
            progress: 30 
        });

        // Оптимизируем изображение с корректными параметрами FFmpeg
        await ffmpeg.run(
            '-i', 'input.jpg',
            '-vf', 'scale=800:-1',
            '-q:v', '2',
            '-y',
            'output.jpg'
        );

        onProgress({ 
            stage: 'Processing complete...', 
            progress: 60 
        });

        try {
            const outputData = await ffmpeg.FS('readFile', 'output.jpg');
            const optimizedSize = outputData.length;
            
            console.log('Optimized image size:', (optimizedSize / 1024).toFixed(2), 'KB');
            const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
            console.log('Size reduction:', reduction.toFixed(2), '%');

            // Очищаем файлы
            await ffmpeg.FS('unlink', 'input.jpg');
            await ffmpeg.FS('unlink', 'output.jpg');

            onProgress({ 
                stage: 'Optimization complete', 
                progress: 100,
                details: `Reduced by ${reduction.toFixed(0)}%`
            });

            // Проверяем эффективность оптимизации
            if (optimizedSize >= originalSize) {
                console.log('Using original image (no size reduction)');
                return imageFile;
            }

            return new Blob([outputData], { type: 'image/jpeg' });

        } catch (readError) {
            console.error('Error reading optimized image:', readError);
            onProgress({ 
                stage: 'Using original image', 
                progress: 100,
                details: 'Optimization failed'
            });
            return imageFile;
        }

    } catch (error) {
        console.error('Optimization error:', error);
        onProgress({ 
            stage: 'Using original image', 
            progress: 100,
            details: 'Error during optimization'
        });
        return imageFile;
    }
}