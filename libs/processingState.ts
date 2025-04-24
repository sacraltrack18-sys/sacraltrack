/**
 * Модуль для отслеживания состояния и прогресса задач обработки аудио.
 * Используется для обмена информацией между разными API маршрутами.
 */

// Типы для информации о задаче
export interface ProcessingTaskData {
    fileId: string;
    bucketId: string;
    imageId?: string;
    trackname?: string;
    artist?: string;
    genre?: string;
    [key: string]: any;
}

export interface ProcessingTaskDetails {
    message?: string;
    type?: string;
    timestamp: string;
    error?: any;
    [key: string]: any;
}

export interface ProcessingTask {
    status: 'pending' | 'processing' | 'complete' | 'error';
    progress: number;
    stage: string;
    details: ProcessingTaskDetails;
    data: ProcessingTaskData;
    result?: any;
}

// Глобальное хранилище для информации о задачах
// Каждая задача идентифицируется уникальным ID
export const processingTasks = new Map<string, ProcessingTask>();

// Функция для обновления статуса задачи
export function updateTaskProgress(
    taskId: string, 
    progress: number, 
    stage: string, 
    details: Partial<ProcessingTaskDetails> = {}
): void {
    const task = processingTasks.get(taskId);
    
    if (!task) {
        console.warn(`[Task ${taskId}] Попытка обновить несуществующую задачу`);
        return;
    }
    
    processingTasks.set(taskId, {
        ...task,
        progress,
        stage,
        details: {
            ...task.details,
            ...details,
            timestamp: new Date().toISOString()
        }
    });
}

// Функция для завершения задачи с результатом
export function completeTask(taskId: string, result: any): void {
    const task = processingTasks.get(taskId);
    
    if (!task) {
        console.warn(`[Task ${taskId}] Попытка завершить несуществующую задачу`);
        return;
    }
    
    processingTasks.set(taskId, {
        ...task,
        status: 'complete',
        progress: 100,
        stage: 'Обработка завершена',
        details: {
            ...task.details,
            message: 'Обработка аудио успешно завершена',
            timestamp: new Date().toISOString(),
            type: 'complete'
        },
        result
    });
}

// Функция для установки ошибки задачи
export function setTaskError(taskId: string, error: any): void {
    const task = processingTasks.get(taskId);
    
    if (!task) {
        console.warn(`[Task ${taskId}] Попытка установить ошибку для несуществующей задачи`);
        return;
    }
    
    processingTasks.set(taskId, {
        ...task,
        status: 'error',
        details: {
            ...task.details,
            message: error instanceof Error ? error.message : 'Неизвестная ошибка',
            timestamp: new Date().toISOString(),
            error,
            type: 'error'
        }
    });
}

// Функция для очистки устаревших задач (можно вызывать периодически)
export function cleanupOldTasks(maxAgeMinutes: number = 60): void {
    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    
    // Используем Array.from для совместимости с TypeScript
    Array.from(processingTasks.entries()).forEach(([taskId, task]) => {
        const taskTime = new Date(task.details.timestamp).getTime();
        if (now - taskTime > maxAgeMs) {
            processingTasks.delete(taskId);
        }
    });
} 