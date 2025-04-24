'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Client, Storage, ID } from 'appwrite';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Инициализация Appwrite для клиентской стороны
const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

const appwriteStorage = new Storage(appwriteClient);
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || '';

// Типы для пропсов и состояний
interface TrackInfo {
    trackname: string;
    artist: string;
    genre: string;
}

interface ProcessingDetails {
    message?: string;
    type?: string;
    progress?: number;
    [key: string]: any;
}

interface UploadCompleteProps {
    onUploadComplete?: (result: any) => void;
}

export function DirectUploadAudio({ onUploadComplete }: UploadCompleteProps) {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [trackInfo, setTrackInfo] = useState<TrackInfo>({
        trackname: '',
        artist: '',
        genre: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStage, setProcessingStage] = useState('');
    const [processingDetails, setProcessingDetails] = useState<ProcessingDetails>({});
    
    const eventSourceRef = useRef<EventSource | null>(null);
    
    // Обработчик выбора аудио файла
    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && files[0].type.includes('audio')) {
            setAudioFile(files[0]);
        } else {
            toast.error('Пожалуйста, загрузите корректный аудиофайл');
        }
    };
    
    // Обработчик выбора изображения
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && files[0].type.includes('image')) {
            setImageFile(files[0]);
        } else {
            toast.error('Пожалуйста, загрузите корректное изображение');
        }
    };
    
    // Обработчик изменения формы
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTrackInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Обработчик обновления прогресса
    const handleServerProgress = useCallback((data: string) => {
        const event = JSON.parse(data);
        
        if (event.type === 'progress') {
            setUploadProgress(event.progress);
            setProcessingStage(event.stage);
            if (event.details) {
                setProcessingDetails(event.details);
            }
        } else if (event.type === 'error') {
            toast.error(`Ошибка: ${event.message}`);
            setIsUploading(false);
            console.error('Ошибка обработки:', event);
        } else if (event.type === 'complete') {
            setUploadProgress(100);
            setProcessingStage('Обработка завершена');
            setIsUploading(false);
            toast.success('Загрузка и обработка успешно завершены!');
            
            if (onUploadComplete && event.result) {
                onUploadComplete(event.result);
            }
        }
    }, [onUploadComplete]);
    
    // Закрытие EventSource при размонтировании компонента
    const closeEventSource = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);
    
    // Загрузка файла с использованием Appwrite Storage и обработка через API
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!audioFile) {
            toast.error('Пожалуйста, выберите аудиофайл');
            return;
        }
        
        try {
            setIsUploading(true);
            setUploadProgress(0);
            setProcessingStage('Загрузка файла в хранилище');
            
            // Закрываем предыдущий EventSource, если он существует
            closeEventSource();
            
            // 1. Загрузка аудио файла в Appwrite Storage
            const audioFileId = ID.unique();
            toast.loading('Загрузка аудиофайла в хранилище...');
            
            await appwriteStorage.createFile(
                BUCKET_ID,
                audioFileId,
                audioFile
            );
            
            toast.dismiss();
            toast.success('Аудиофайл загружен в хранилище');
            setUploadProgress(10);
            
            // 2. Загрузка изображения в Appwrite, если оно есть
            let imageFileId: string | undefined = undefined;
            if (imageFile) {
                toast.loading('Загрузка изображения обложки...');
                imageFileId = ID.unique();
                
                await appwriteStorage.createFile(
                    BUCKET_ID,
                    imageFileId,
                    imageFile
                );
                
                toast.dismiss();
                toast.success('Изображение загружено');
            }
            
            setUploadProgress(20);
            setProcessingStage('Подготовка к обработке аудио');
            
            // 3. Теперь делаем запрос к нашему API для обработки файла
            const apiUrl = '/api/audio/process';
            
            // Создаем EventSource для получения статуса обработки
            eventSourceRef.current = new EventSource(apiUrl);
            
            // Обрабатываем сообщения от сервера
            eventSourceRef.current.onmessage = (event) => {
                handleServerProgress(event.data);
            };
            
            eventSourceRef.current.onerror = (error) => {
                console.error('EventSource error:', error);
                toast.error('Ошибка соединения с сервером');
                closeEventSource();
                setIsUploading(false);
            };
            
            // 4. Отправляем данные об уже загруженных файлах на API обработки
            const response = await axios.post(apiUrl, {
                fileId: audioFileId,
                bucketId: BUCKET_ID,
                imageId: imageFileId,
                trackname: trackInfo.trackname,
                artist: trackInfo.artist,
                genre: trackInfo.genre
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('API response:', response);
            
        } catch (error: any) {
            console.error('Ошибка загрузки:', error);
            toast.error(`Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`);
            setIsUploading(false);
            closeEventSource();
        }
    };
    
    return (
        <div className="w-full max-w-xl mx-auto p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Загрузка аудио</h2>
            
            <form onSubmit={handleUpload} className="space-y-4">
                {/* Выбор аудиофайла */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Аудиофайл (WAV)
                    </label>
                    <input
                        type="file"
                        accept="audio/wav"
                        onChange={handleAudioChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isUploading}
                    />
                    {audioFile && (
                        <p className="mt-1 text-sm text-gray-500">
                            Выбран файл: {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                    )}
                </div>
                
                {/* Информация о треке */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название трека
                    </label>
                    <input
                        type="text"
                        name="trackname"
                        value={trackInfo.trackname}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isUploading}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Исполнитель
                    </label>
                    <input
                        type="text"
                        name="artist"
                        value={trackInfo.artist}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isUploading}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Жанр
                    </label>
                    <input
                        type="text"
                        name="genre"
                        value={trackInfo.genre}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isUploading}
                    />
                </div>
                
                {/* Выбор изображения */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Обложка (опционально)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isUploading}
                    />
                    {imageFile && (
                        <p className="mt-1 text-sm text-gray-500">
                            Выбрано изображение: {imageFile.name}
                        </p>
                    )}
                </div>
                
                {/* Кнопка загрузки */}
                <button
                    type="submit"
                    className={`w-full py-2 px-4 rounded-md font-medium ${
                        isUploading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={isUploading || !audioFile}
                >
                    {isUploading ? 'Загрузка и обработка...' : 'Загрузить и обработать'}
                </button>
            </form>
            
            {/* Прогресс загрузки */}
            {isUploading && (
                <div className="mt-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{width: `${uploadProgress}%`}}
                        ></div>
                    </div>
                    <p className="text-sm text-center font-medium">
                        {processingStage} ({Math.round(uploadProgress)}%)
                    </p>
                    
                    {processingDetails.message && (
                        <p className="text-xs text-center mt-1 text-gray-500">
                            {processingDetails.message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default DirectUploadAudio; 