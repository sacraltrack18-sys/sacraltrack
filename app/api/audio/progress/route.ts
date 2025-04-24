import { NextRequest } from 'next/server';
import { processingTasks } from '@/libs/processingState';

// Настройка для бесконечного времени ожидания ответа
export const config = {
  api: {
    responseLimit: false,
  },
};

// Функция для отправки SSE сообщения
function sendEvent(writer: WritableStreamDefaultWriter, data: any) {
    try {
        const encoder = new TextEncoder();
        const event = `data: ${JSON.stringify(data)}\n\n`;
        writer.write(encoder.encode(event));
    } catch (error) {
        console.error('[Progress] Ошибка при отправке события:', error);
    }
}

// Функция для отправки ошибки
function sendError(writer: WritableStreamDefaultWriter, message: string, details: any = {}) {
    sendEvent(writer, {
        type: 'error',
        message,
        timestamp: new Date().toISOString(),
        details
    });
}

// Основной обработчик для SSE
export async function GET(request: NextRequest) {
    // Создаем трансформ-поток для SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Получаем taskId из параметров запроса
    const taskId = request.nextUrl.searchParams.get('taskId');
    
    if (!taskId) {
        sendError(writer, 'Отсутствует параметр taskId');
        writer.close();
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    }
    
    // Проверяем существование задачи
    const task = processingTasks.get(taskId);
    
    if (!task) {
        sendError(writer, `Задача с ID ${taskId} не найдена`);
        writer.close();
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    }
    
    // Отправляем текущее состояние задачи
    sendEvent(writer, {
        type: task.status === 'error' ? 'error' : 'progress',
        progress: task.progress,
        stage: task.stage,
        details: task.details
    });
    
    // Если задача уже завершена или с ошибкой, сразу отправляем финальное сообщение
    if (task.status === 'complete') {
        sendEvent(writer, {
            type: 'complete',
            progress: 100,
            stage: 'Обработка завершена',
            result: task.result
        });
        writer.close();
    } else if (task.status === 'error') {
        sendEvent(writer, {
            type: 'error',
            message: task.details.message || 'Произошла ошибка',
            details: task.details.error
        });
        writer.close();
    } else {
        // Устанавливаем интервал для опроса состояния задачи
        let intervalId: NodeJS.Timeout | null = null;
        
        const pollTaskStatus = () => {
            const currentTask = processingTasks.get(taskId);
            
            if (!currentTask) {
                sendError(writer, `Задача ${taskId} больше не существует`);
                if (intervalId) clearInterval(intervalId);
                writer.close();
                return;
            }
            
            // Отправляем обновление состояния
            sendEvent(writer, {
                type: currentTask.status === 'error' ? 'error' : 'progress',
                progress: currentTask.progress,
                stage: currentTask.stage,
                details: currentTask.details
            });
            
            // Если задача завершена или с ошибкой, закрываем соединение
            if (currentTask.status === 'complete') {
                sendEvent(writer, {
                    type: 'complete',
                    progress: 100,
                    stage: 'Обработка завершена',
                    result: currentTask.result
                });
                if (intervalId) clearInterval(intervalId);
                writer.close();
            } else if (currentTask.status === 'error') {
                sendEvent(writer, {
                    type: 'error',
                    message: currentTask.details.message || 'Произошла ошибка',
                    details: currentTask.details.error
                });
                if (intervalId) clearInterval(intervalId);
                writer.close();
            }
        };
        
        // Опрашиваем состояние каждую секунду
        intervalId = setInterval(pollTaskStatus, 1000);
        
        // Обработка закрытия соединения
        request.signal.addEventListener('abort', () => {
            if (intervalId) clearInterval(intervalId);
            writer.close();
        });
    }
    
    // Возвращаем поток SSE событий
    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
} 