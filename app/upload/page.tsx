"use client"

{/*UPLOAD PAGE*/}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useUser } from '@/app/context/user';
import { useCreatePost } from '@/app/hooks/useCreatePost';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ID, storage, functions } from '@/libs/AppWriteClient';
import Image from 'next/image';
import { useSession } from "next-auth/react";
import axios from 'axios';
import { UploadProgress, BackgroundProgress } from '@/app/components/upload/UploadProgress';

import TopNav from '@/app/layouts/includes/TopNav';
import AudioPlayer from '../components/upload/AudioPlayer';
import ImageUploader from '../components/upload/ImageUploader';
import GenreSelector from '../components/upload/GenreSelector';
import SuccessModal from '../components/upload/SuccessModal';
import RequirementsTooltip from '../components/upload/RequirementsTooltip';
import AudioInfo from '../components/upload/AudioInfo';

// Copyright notification component
interface CopyrightNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

const CopyrightNotification = ({ isVisible, onClose }: CopyrightNotificationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed top-20 right-4 z-50 w-80 bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-4 rounded-xl shadow-xl border border-[#20DDBB]/20"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#20DDBB]/20 rounded-full flex items-center justify-center mr-2">
                <svg className="w-5 h-5 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold">Copyright Agreement</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/80 text-sm mb-3">
            Dear artist, by uploading content you agree to our royalty and copyright terms. Your rights will be protected under our agreement.
          </p>
          <div className="flex justify-end">
            <Link href="/terms" className="text-[#20DDBB] text-sm hover:underline">
              Read Agreement
            </Link>
          </div>
          <div className="absolute -bottom-1 -right-1 w-24 h-24 opacity-10">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-[#20DDBB]">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1-1z"/>
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// English translations for user-friendly messages - упрощаем этапы
const stagesToMessages = {
  'preparing': 'Preparing files...',
  'uploading_cover': 'Uploading cover image...',
  'uploading_audio': 'Uploading WAV file...',
  'creating_release': 'Finalizing release...',
  'done': 'Done!'
};

// Добавляем интерфейс для метаданных аудио
interface AudioMetadata {
    duration: number;
    fileName: string;
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
    fileSize: number;
}

export default function Upload() {
    const router = useRouter();
    const userContext = useUser();
    const user = userContext?.user;
    const createPostHook = useCreatePost();
    
    // File states
    const [fileAudio, setFileAudio] = useState<File | null>(null);
    const [fileImage, setFileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showCopyrightNotice, setShowCopyrightNotice] = useState(false);

    // Audio states
    const [audioSrc, setAudioSrc] = useState<string>('');
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    
    // Используем useRef для аудио элемента
    const audioElement = useRef<HTMLAudioElement | null>(null);

    // Form states
    const [trackname, setTrackname] = useState('');
    const [genre, setGenre] = useState('');
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    // Добавляем состояние для контроля нажатия кнопки загрузки
    const [isUploadButtonPressed, setIsUploadButtonPressed] = useState(false);

    // Processing states
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [processingStage, setProcessingStage] = useState<string>('');
    const [uploadedTrackId, setUploadedTrackId] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Добавим состояние для контроля отмены
    const [isCancelling, setIsCancelling] = useState<boolean>(false);
    const [uploadController, setUploadController] = useState<AbortController | null>(null);

    // Упрощаем, оставляем только необходимые состояния для загрузки
    const [uploadProcessing, setUploadProcessing] = useState<boolean>(false);
    const [uploadProcessingStage, setUploadProcessingStage] = useState<string>('');
    const [uploadProcessingProgress, setUploadProcessingProgress] = useState<number>(0);

    // Добавляем состояние для метаданных аудио
    const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);

    // Add effect to track isProcessing changes
    useEffect(() => {
        // Removing console.logs
    }, [isProcessing, processingStage, processingProgress]);

    // Check user authentication
    useEffect(() => {
        if (!user) router.push('/');
    }, [user, router]);

    // Проверяем наличие необходимых функций
    useEffect(() => {
        if (!createPostHook?.createPost) {
            toast.error('Upload functionality not available');
        }
    }, [createPostHook]);

    // Очистка при размонтировании компонента
    useEffect(() => {
        return () => {
            // Отменяем все незавершенные загрузки при уходе со страницы
            if (uploadController) {
                uploadController.abort();
            }
        };
    }, [uploadController]);

    // Audio player functions
    const handleAudioPlay = () => {
        if (!audioElement.current) return;
        
        if (isAudioPlaying) {
            audioElement.current.pause();
        } else {
            audioElement.current.play();
        }
        setIsAudioPlaying(!isAudioPlaying);
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioElement.current) return;

        const progressBar = e.currentTarget;
        const boundingRect = progressBar.getBoundingClientRect();
        const clickPositionX = e.clientX - boundingRect.left;
        const progressBarWidth = boundingRect.width;
        const clickPercentage = (clickPositionX / progressBarWidth) * 100;
        
        const newTime = (clickPercentage / 100) * audioDuration;

        audioElement.current.currentTime = newTime;
        setAudioProgress(clickPercentage);
    };

    // Обновляем функцию handleAudioChange для извлечения метаданных
    const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const audioFile = e.target.files[0];

        // Проверка размера (максимум 200 МБ)
        if (audioFile.size > 200 * 1024 * 1024) {
            toast.error('Audio file size must not exceed 200 MB', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px'
                },
                icon: '⚠️'
            });
            return;
        }

        // Проверка формата (должен быть WAV)
        if (!audioFile.type.includes('wav') && !audioFile.type.includes('audio')) {
            toast.error('Please select a WAV audio file', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px'
                },
                icon: '⚠️'
            });
            return;
        }

        try {
            const audioURL = URL.createObjectURL(audioFile);
            const audio = new Audio(audioURL);

            audio.addEventListener('loadedmetadata', () => {
                const duration = audio.duration;
                setAudioDuration(duration);

                // Проверка длительности (максимум 12 минут)
                if (duration > 12 * 60) {
                    toast.error('Audio duration must not exceed 12 minutes', {
                        style: {
                            border: '1px solid #FF4A4A',
                            padding: '16px',
                            color: '#ffffff',
                            background: 'linear-gradient(to right, #2A184B, #1f1239)',
                            fontSize: '16px',
                            borderRadius: '12px'
                        },
                        icon: '⚠️'
                    });
                    URL.revokeObjectURL(audioURL);
                    return;
                }
                
                // Извлекаем имя файла без расширения
                const fileName = audioFile.name.replace(/\.[^/.]+$/, "");
                
                // Создаем объект метаданных
                const metadata: AudioMetadata = {
                    duration,
                    fileName,
                    fileSize: audioFile.size,
                    // Стандартные значения для WAV (будут уточнены при полном парсинге)
                    sampleRate: 44100, // Типичное значение
                    channels: 2,       // Стерео
                    bitDepth: 16       // 16-бит
                };
                
                // Сохраняем метаданные
                setAudioMetadata(metadata);
                
                // Автоматически заполняем название трека из имени файла
                if (!trackname) {
                    // Форматируем имя файла: заменяем подчеркивания и дефисы на пробелы,
                    // первая буква каждого слова заглавная
                    const formattedName = fileName
                        .replace(/[_-]/g, ' ')
                        .replace(/\b\w/g, (char) => char.toUpperCase());
                    setTrackname(formattedName);
                }

                // Устанавливаем ссылку на аудио элемент
                audioElement.current = audio;
                setAudioSrc(audioURL);
                setFileAudio(audioFile);
                setCurrentTime(0);
                setIsPlaying(false);
            });

            audio.addEventListener('error', (e) => {
                URL.revokeObjectURL(audioURL);
                toast.error('Error loading audio file. Please try another file.', {
                    style: {
                        border: '1px solid #FF4A4A',
                        padding: '16px',
                        color: '#ffffff',
                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                        fontSize: '16px',
                        borderRadius: '12px'
                    },
                    icon: '❌'
                });
            });

            audio.addEventListener('timeupdate', () => {
                if (!audioElement.current) return;
                
                const { currentTime, duration } = audioElement.current;
                setCurrentTime(currentTime);
                setAudioProgress((currentTime / duration) * 100);
                    setCurrentTime(currentTime);
            });

        } catch (error) {
            toast.error('Error preparing audio file. Please try another file.', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px'
                },
                icon: '❌'
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const preview = URL.createObjectURL(file);
            setFileImage(file);
            setImagePreview(preview);
            
            // Show copyright notification when image is selected
            setShowCopyrightNotice(true);
        } catch (error) {
            console.error('Error loading image:', error);
            toast.error('Error loading image file');
        }
    };

    // Clear functions
    const clearAudio = () => {
        const audioRef = audioElement.current;
        if (audioRef) {
            audioRef.pause();
        }
        if (audioSrc) {
            URL.revokeObjectURL(audioSrc);
        }
        setAudioSrc('');
        setFileAudio(null);
        setCurrentTime(0);
        setAudioProgress(0);
        setIsPlaying(false);
        setIsAudioPlaying(false);
    };

    const clearImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setFileImage(null);
    };

    const clearAll = () => {
        clearAudio();
        clearImage();
        setTrackname('');
        setGenre('');
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStage('');
    };

    // Функция отмены загрузки
    const handleCancelUpload = () => {
        // Просто запрашиваем подтверждение (будет обработано в компоненте)
    };

    const handleConfirmCancelUpload = () => {
        // Реальная отмена загрузки
        if (uploadController) {
            uploadController.abort();
        }
        
        setUploadProcessing(false);
        setIsProcessing(false);
        
        toast.error('Upload cancelled', {
            style: {
                border: '1px solid #FF4A4A',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px'
            },
            icon: '❌',
            duration: 3000
        });
    };

    // Обновляем функцию handleUpload для правильной работы с хуком useCreatePost
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Устанавливаем флаг нажатия кнопки загрузки
        setIsUploadButtonPressed(true);
        
        toast.success('Starting upload...', {
            duration: 2000,
            style: {
                border: '1px solid #20DDBB',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px'
            },
            icon: '🎵'
        });
        
        // Validation
        if (!fileAudio || !fileImage || !trackname || !genre) {
            toast.error('Please fill in all required fields', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '🎵'
            });
            setIsUploadButtonPressed(false);
            return;
        }
        
        // Проверка доступности хука createPost
        if (!createPostHook?.createPost) {
            toast.error('Upload functionality not available', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px'
                },
                icon: '❌'
            });
            setIsUploadButtonPressed(false);
            return;
        }

        // Set initial stage
        setIsProcessing(true);
        setProcessingStage('Preparing upload');
        setProcessingProgress(0);
        
        // Добавляем специальное уведомление для больших файлов
        const fileSizeInMB = fileAudio.size / (1024 * 1024);
        if (fileSizeInMB > 50) {
            toast('Uploading large file, this may take a while. Please wait...', {
                duration: 5000,
                icon: '⏳',
                style: {
                    border: '1px solid #FFA500',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px'
                }
            });
        }

        try {
            const toastId = toast.loading('Starting upload...', {
                style: {
                    border: '1px solid #20DDBB',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                },
                icon: '🚀'
            });
            
            const params = {
                audio: fileAudio,
                image: fileImage,
                trackname,
                genre,
                userId: user?.id || 'anonymous',
                onProgress: (stage: string, progress: number, estimatedTime?: string) => {
                    setProcessingStage(stage);
                    setProcessingProgress(progress);
                    toast.loading(`${stage}: ${Math.round(progress)}%`, { id: toastId });
                }
            };
            
            // Вызываем createPost с параметрами
            const result = await createPostHook.createPost(params);
            
            // Проверяем успешность загрузки
            if (!result) {
                throw new Error('Upload failed: No result returned');
            }
            
            // Получаем ID трека
            const trackId = result.trackId || result.postId || result.$id;
            
            if (!trackId) {
                throw new Error('Upload failed: No track ID in response');
            }
            
            // Запускаем фоновую обработку аудио через Appwrite Functions
            try {
                // ID функции обработки аудио
                const AUDIO_PROCESSOR_FUNCTION_ID = '67fd5f3793f097add368';
                
                // Делаем API-запрос через axios для запуска функции
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_APPWRITE_URL}/functions/${AUDIO_PROCESSOR_FUNCTION_ID}/executions`,
                    { postId: trackId },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Appwrite-Project': process.env.NEXT_PUBLIC_ENDPOINT
                        }
                    }
                );
                
                console.log('Background audio processing started for post:', trackId);
                
                // Добавляем уведомление о запуске фоновой обработки
                toast.success('Your track is now being processed in the background', {
                    duration: 5000,
                    style: {
                        border: '1px solid #20DDBB',
                        padding: '16px',
                        color: '#ffffff',
                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                        fontSize: '16px',
                        borderRadius: '12px'
                    },
                    icon: '🔄'
                });
            } catch (processingError) {
                // Если запуск обработки не удался, просто логируем ошибку, но не мешаем пользователю
                console.error('Failed to start audio processing:', processingError);
            }
            
            // Успешно загружено
            setProcessingProgress(100);
            setProcessingStage('Completed');
            toast.success('Upload complete!', { id: toastId });
            
            // Сохраняем ID трека 
            setUploadedTrackId(trackId);
            
            // Показываем модальное окно об успешной загрузке
            setShowSuccessModal(true);
            
            // Очищаем состояние процесса загрузки в конце всех операций
            setIsProcessing(false);
            setIsUploadButtonPressed(false);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            toast.error(`Upload error: ${errorMessage}`, {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '❌',
                duration: 5000
            });
            
            setIsProcessing(false);
            setIsUploadButtonPressed(false);
        }
    };

    // Update code when successful upload result is available to show it to the user
    useEffect(() => {
        if (showSuccessModal && uploadedTrackId) {
            // If we have the ID of the uploaded track, navigate to the track page when the modal is closed
            const handleClose = () => {
                router.push(`/track/${uploadedTrackId}`);
            };
            
            // Add event listener for modal
            const successModal = document.getElementById('success-modal');
            successModal?.addEventListener('close', handleClose);
            
            return () => {
                successModal?.removeEventListener('close', handleClose);
            };
        }
    }, [showSuccessModal, uploadedTrackId, router]);

    // Connect UI components
    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav params={{ id: user?.id as string }} />
            <div className="mt-[80px] max-w-[1280px] mx-auto px-4 pb-20 relative">
                
                {/* Display main upload progress */}
                <UploadProgress
                    isActive={isProcessing}
                    stage={processingStage}
                    progress={processingProgress}
                    onCancel={handleCancelUpload}
                    confirmCancel={handleConfirmCancelUpload}
                />
            
                {/* Copyright notice */}
            <CopyrightNotification 
                isVisible={showCopyrightNotice} 
                onClose={() => setShowCopyrightNotice(false)} 
            />
                
                {/* Success modal */}
                <SuccessModal 
                    isOpen={showSuccessModal} 
                    onClose={() => setShowSuccessModal(false)} 
                    trackId={uploadedTrackId}
                    trackname={trackname}
                />
            
            <form onSubmit={handleUpload} className="max-w-4xl mx-auto px-4 py-24">
                {/* Animated header with floating gradient */}
                <div className="mb-8 text-center relative">
                    {/* Animated background gradient orbs */}
                    <div className="absolute inset-0 overflow-hidden opacity-30 -z-10">
                        <motion.div 
                            className="absolute h-40 w-40 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] blur-3xl"
                            animate={{ 
                                x: ['-20%', '120%'],
                                y: ['30%', '60%'],
                            }} 
                            transition={{ 
                                duration: 15,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                ease: "easeInOut"
                            }}
                        />
                        <motion.div 
                            className="absolute h-60 w-60 rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] blur-3xl"
                            animate={{ 
                                x: ['120%', '-20%'],
                                y: ['10%', '80%'],
                            }} 
                            transition={{ 
                                duration: 18,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                ease: "easeInOut"
                            }}
                        />
                    </div>
                    
                    {/* Main heading */}
                    <motion.h1 
                        className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#20DDBB] via-[#018CFD] to-[#8A2BE2] bg-clip-text text-transparent"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        Create release
                    </motion.h1>
                    
                    {/* Subheading */}
                    <motion.p 
                        className="text-lg text-white/70"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        Upload your track and artwork for release
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left column - Audio upload and player */}
                    <div className="space-y-6">
                        {fileAudio ? (
                            <div className="space-y-3">
                                <div className="w-full rounded-2xl 
                                                bg-gradient-to-br from-[#2A184B] to-[#1f1239]
                                                border border-[#20DDBB]/10 shadow-lg
                                                flex flex-col justify-end overflow-hidden
                                                aspect-square">
                                    <AudioPlayer
                                        fileAudio={fileAudio}
                                        trackname={trackname}
                                        isAudioPlaying={isAudioPlaying}
                                        audioProgress={audioProgress}
                                        audioDuration={audioDuration}
                                        audioElement={audioElement.current}
                                        handleAudioPlay={handleAudioPlay}
                                        handleProgressBarClick={handleProgressBarClick}
                                        clearAudio={clearAudio}
                                    />
                                </div>
                                
                                {/* Компонент отображения метаданных аудио */}
                                <AudioInfo metadata={audioMetadata} />
                            </div>
                        ) : (
                            <motion.label 
                                className="w-full aspect-square rounded-2xl 
                                          bg-gradient-to-br from-[#2A184B] to-[#1f1239]
                                          border border-[#20DDBB]/10 shadow-lg
                                          flex flex-col items-center justify-center
                                          cursor-pointer transition-all duration-300
                                          hover:bg-[#20DDBB]/5 relative overflow-hidden group"
                                whileHover={{ boxShadow: "0 0 25px rgba(32,221,187,0.15)" }}
                            >
                                <input
                                    type="file"
                                    onChange={handleAudioChange}
                                    accept="audio/wav"
                                    className="hidden"
                                />
                                
                                {/* Animated background elements */}
                                <div className="absolute inset-0 opacity-20">
                                    <motion.div 
                                        className="absolute h-60 w-60 rounded-full bg-gradient-to-r from-[#20DDBB]/40 to-[#018CFD]/40 blur-2xl"
                                        animate={{ 
                                            x: ['-50%', '150%'],
                                            y: ['-50%', '150%'],
                                        }} 
                                        transition={{ 
                                            duration: 15,
                                            repeat: Infinity,
                                            repeatType: 'reverse'
                                        }}
                                    />
                                </div>
                                
                                <div className="text-center p-6 z-10">
                                    <motion.div 
                                        className="w-20 h-20 rounded-full bg-gradient-to-br from-[#20DDBB]/20 to-[#018CFD]/20 
                                                  flex items-center justify-center mx-auto mb-6"
                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(32,221,187,0.3)' }}
                                    >
                                        <svg className="w-10 h-10 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
                                    </motion.div>
                                    <p className="text-[#20DDBB] text-lg font-medium mb-2">Drop your track here</p>
                                    <p className="text-white/60 text-sm mb-6">WAV format, up to 12 minutes</p>
                                    
                                    {/* Audio requirements */}
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                        <h4 className="text-xs text-white/80 mb-2">File Requirements:</h4>
                                        <ul className="text-xs text-white/60 space-y-2 text-left max-w-xs mx-auto">
                                            <li className="flex items-center">
                                                <span className="mr-2 text-[#20DDBB]">✓</span>
                                                WAV Format
                                            </li>
                                            <li className="flex items-center">
                                                <span className="mr-2 text-[#20DDBB]">✓</span>
                                                Maximum 12 minutes
                                            </li>
                                            <li className="flex items-center">
                                                <span className="mr-2 text-[#20DDBB]">✓</span>
                                                Up to 200 MB
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                
                                {/* Shimmer effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#20DDBB]/10 to-transparent -translate-x-full group-hover:animate-shimmer opacity-0 group-hover:opacity-100" />
                            </motion.label>
                        )}

                        {/* Track name input and Artist name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div>
                                <input
                                    type="text"
                                    id="trackname"
                                    value={trackname}
                                    onChange={(e) => setTrackname(e.target.value)}
                                    placeholder="Track name"
                                    className="w-full px-4 py-3 rounded-xl bg-[#2A184B]/50 border border-[#20DDBB]/10
                                            text-white placeholder-white/40 outline-none
                                            focus:border-[#20DDBB]/30 focus:ring-1 focus:ring-[#20DDBB]/20 transition-all"
                                />
                            </div>
                            <div>
                                <div className="w-full px-4 py-3 rounded-xl bg-[#2A184B]/50 border border-[#20DDBB]/10
                                            text-white flex items-center">
                                    <span>{user?.name || "Unknown Artist"}</span>
                                    <div className="ml-2 text-[#20DDBB] bg-[#20DDBB]/10 px-2 py-0.5 rounded text-xs">
                                        Verified
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column - Image upload and genre selection */}
                    <div className="space-y-6">
                        <ImageUploader
                            fileImage={fileImage}
                            imagePreview={imagePreview}
                            handleImageChange={handleImageChange}
                            clearImage={clearImage}
                        />

                        {/* GenreSelector without any title */}
                        <GenreSelector
                            genre={genre}
                            setGenre={setGenre}
                        />
                    </div>
                </div>

                {/* Upload button with info tooltip */}
                <div className="mt-12 flex justify-end">
                    <div className="relative group">
                        <button
                            type="submit"
                            disabled={isProcessing || !fileAudio || !fileImage || !trackname || !genre || isUploadButtonPressed}
                            className={`w-full ${
                                isProcessing || !fileAudio || !fileImage || !trackname || !genre || isUploadButtonPressed
                                ? 'bg-purple-500/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                            } text-white py-3 px-6 rounded-xl font-semibold text-lg shadow-lg transition duration-300 flex items-center justify-center`}
                        >
                            {isProcessing ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Uploading...
                                </div>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                    </svg>
                                    Publish Track
                                </>
                            )}
                        </button>
                        
                        {/* Button to show requirements */}
                        <button
                            type="button"
                            onClick={() => setIsTooltipOpen(true)}
                            className="absolute -top-10 right-0 text-xs text-white/60 hover:text-white/90 transition-colors flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Upload Requirements
                        </button>
                        
                        {/* Render tooltip conditionally */}
                        {isTooltipOpen && (
                            <RequirementsTooltip 
                                isOpen={isTooltipOpen} 
                                onClose={() => setIsTooltipOpen(false)} 
                            />
                        )}
                    </div>
                </div>
            </form>
            
            {/* Audio element for playing the uploaded file */}
            <audio 
                ref={audioElement}
                onTimeUpdate={() => {
                    if (!audioElement.current) return;
                    const progress = (audioElement.current.currentTime / audioElement.current.duration) * 100;
                    setAudioProgress(progress);
                        setCurrentTime(audioElement.current.currentTime);
                }}
                onEnded={() => {
                    setIsAudioPlaying(false);
                    setAudioProgress(0);
                        setCurrentTime(0);
                }}
                onDurationChange={() => {
                    if (audioElement.current) {
                        setAudioDuration(audioElement.current.duration);
                    }
                }}
                className="hidden"
                />
            </div>
        </div>
    );
}
