import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('audio') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Создаем временные директории
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-'));
        const inputPath = path.join(tempDir, 'input.wav');
        const outputPath = path.join(tempDir, 'output.mp3');
        const segmentsDir = path.join(tempDir, 'segments');
        
        await fs.mkdir(segmentsDir, { recursive: true });

        // Сохраняем входной файл
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(inputPath, buffer);

        // Конвертируем в MP3
        await execAsync(`ffmpeg -i ${inputPath} -c:a libmp3lame -b:a 192k -ar 44100 ${outputPath}`);

        // Создаем сегменты
        await execAsync(
            `ffmpeg -i ${outputPath} -f segment -segment_time 10 -c copy ${path.join(segmentsDir, 'segment%03d.mp3')}`
        );

        // Читаем все сегменты
        const segments = await fs.readdir(segmentsDir);
        const segmentFiles = await Promise.all(
            segments.map(async (segment) => {
                const content = await fs.readFile(path.join(segmentsDir, segment));
                return {
                    name: segment,
                    content: content
                };
            })
        );

        // Создаем M3U8 плейлист
        const m3u8Content = '#EXTM3U\n' +
            '#EXT-X-VERSION:3\n' +
            '#EXT-X-TARGETDURATION:10\n' +
            '#EXT-X-MEDIA-SEQUENCE:0\n' +
            '#EXT-X-PLAYLIST-TYPE:VOD\n\n' +
            segments.map(segment => `#EXTINF:10.0,\n${segment}`).join('\n') +
            '\n#EXT-X-ENDLIST';

        // Очищаем временные файлы
        await fs.rm(tempDir, { recursive: true, force: true });

        return NextResponse.json({
            mp3: await fs.readFile(outputPath),
            segments: segmentFiles,
            m3u8: m3u8Content
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json(
            { error: 'Failed to process audio file' },
            { status: 500 }
        );
    }
} 