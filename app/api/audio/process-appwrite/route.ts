import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/libs/AppWriteClient';
import { processingTasks, ProcessingTask } from '@/libs/processingState';

// Этот роут только запускает задачу обработки, не возвращает SSE
export async function POST(request: NextRequest) {
    try {
        // Получаем данные запроса
        const jsonData = await request.json();
        const { fileId, bucketId, imageId, trackname, artist, genre, taskId } = jsonData;
        
        if (!fileId || !bucketId || !taskId) {
            return NextResponse.json(
                { error: 'Отсутствуют обязательные параметры: fileId, bucketId или taskId' },
                { status: 400 }
            );
        }
        
        console.log('[API] Инициализация задачи обработки:', { taskId, fileId, bucketId });
        
        // Сохраняем информацию о задаче в глобальное хранилище
        processingTasks.set(taskId, {
            status: 'pending',
            progress: 0,
            stage: 'Инициализация',
            details: {
                message: 'Задача обработки добавлена в очередь',
                timestamp: new Date().toISOString()
            },
            // Сохраняем данные о файле для обработки
            data: {
                fileId,
                bucketId,
                imageId,
                trackname,
                artist,
                genre
            }
        });
        
        // Запускаем обработку асинхронно
        Promise.resolve().then(async () => {
            try {
                // Получаем текущее состояние задачи
                const currentTask = processingTasks.get(taskId);
                if (!currentTask) {
                    console.error(`[API] Задача ${taskId} не найдена при попытке обновления`);
                    return;
                }
                
                // Обновляем статус на "processing"
                processingTasks.set(taskId, {
                    ...currentTask,
                    status: 'processing',
                    progress: 5,
                    stage: 'Начало обработки',
                    details: {
                        message: 'Загрузка файла из Appwrite Storage...',
                        timestamp: new Date().toISOString(),
                        type: 'init'
                    }
                });
                
                // Здесь будет вызов основной функции обработки
                // Это нужно будет реализовать отдельно
                import('@/app/api/audio/process-worker').then(async ({ processAudioFromAppwrite }) => {
                    try {
                        // Гарантируем, что у нас есть валидные данные для передачи в worker
                        if (!currentTask.data) {
                            throw new Error('Отсутствуют данные для обработки задачи');
                        }
                        
                        await processAudioFromAppwrite(taskId, currentTask.data);
                    } catch (err) {
                        console.error('[WORKER] Ошибка обработки в worker:', err);
                        
                        // Получаем актуальное состояние задачи перед обновлением
                        const taskToUpdate = processingTasks.get(taskId);
                        if (!taskToUpdate) {
                            console.error(`[API] Задача ${taskId} не найдена при обработке ошибки`);
                            return;
                        }
                        
                        processingTasks.set(taskId, {
                            ...taskToUpdate,
                            status: 'error',
                            details: {
                                message: err instanceof Error ? err.message : 'Неизвестная ошибка',
                                timestamp: new Date().toISOString(),
                                error: err
                            }
                        });
                    }
                }).catch(err => {
                    console.error('[API] Ошибка импорта process-worker:', err);
                    
                    // Получаем актуальное состояние задачи перед обновлением
                    const taskToUpdate = processingTasks.get(taskId);
                    if (!taskToUpdate) {
                        console.error(`[API] Задача ${taskId} не найдена при обработке ошибки импорта`);
                        return;
                    }
                    
                    processingTasks.set(taskId, {
                        ...taskToUpdate,
                        status: 'error',
                        details: {
                            message: 'Не удалось запустить обработчик аудио',
                            timestamp: new Date().toISOString(),
                            error: err
                        }
                    });
                });
                
            } catch (err) {
                console.error('[API] Ошибка при запуске обработки:', err);
                
                // Получаем актуальное состояние задачи перед обновлением
                const taskToUpdate = processingTasks.get(taskId);
                if (!taskToUpdate) {
                    console.error(`[API] Задача ${taskId} не найдена при обработке общей ошибки`);
                    return;
                }
                
                processingTasks.set(taskId, {
                    ...taskToUpdate,
                    status: 'error',
                    details: {
                        message: err instanceof Error ? err.message : 'Неизвестная ошибка',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        });
        
        // Отправляем успешный ответ, указывающий, что обработка начата
        return NextResponse.json({
            success: true,
            taskId,
            message: 'Задача обработки поставлена в очередь'
        });
        
    } catch (error) {
        console.error('[API] Ошибка при обработке запроса process-appwrite:', error);
        return NextResponse.json(
            { 
                error: 'Ошибка при обработке запроса', 
                details: error instanceof Error ? error.message : 'Неизвестная ошибка' 
            },
            { status: 500 }
        );
    }
} 