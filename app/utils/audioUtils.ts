export async function validateAudioFile(file: File): Promise<{ 
    isValid: boolean; 
    error?: string;
    duration?: number;
}> {
    // Проверяем формат файла
    if (!file.type.includes('wav')) {
        return {
            isValid: false,
            error: 'Please upload a WAV file'
        };
    }

    // Проверяем длительность
    try {
        const audioBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedData = await audioContext.decodeAudioData(audioBuffer);
        const duration = decodedData.duration;

        if (duration > 720) { // 12 минут = 720 секунд
            return {
                isValid: false,
                error: 'Audio file must not exceed 12 minutes',
                duration
            };
        }

        return {
            isValid: true,
            duration
        };
    } catch (error) {
        return {
            isValid: false,
            error: 'Invalid WAV file format'
        };
    }
}

// Функция для сохранения прогресса загрузки
export function saveUploadProgress(trackId: string, progress: number): void {
    try {
        localStorage.setItem(`upload_progress_${trackId}`, JSON.stringify({
            progress,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Ошибка при сохранении прогресса:', error);
    }
}

// Функция для получения сохраненного прогресса
export function getUploadProgress(trackId: string): number {
    try {
        const saved = localStorage.getItem(`upload_progress_${trackId}`);
        if (saved) {
            const { progress, timestamp } = JSON.parse(saved);
            // Прогресс сохраняется только на 24 часа
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                return progress;
            }
            localStorage.removeItem(`upload_progress_${trackId}`);
        }
    } catch (error) {
        console.error('Ошибка при получении прогресса:', error);
    }
    return 0;
} 