"use client"

{/*UPLOAD PAGE*/}

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useUser } from '@/app/context/user';
import { useCreatePost } from '@/app/hooks/useCreatePost';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ID } from 'appwrite';
import { storage } from '@/libs/AppWriteClient';

import TopNav from '@/app/layouts/includes/TopNav';
import AudioPlayer from '../components/upload/AudioPlayer';
import ImageUploader from '../components/upload/ImageUploader';
import GenreSelector from '../components/upload/GenreSelector';
import SuccessModal from '../components/upload/SuccessModal';
import RequirementsTooltip from '../components/upload/RequirementsTooltip';
import UploadProgress from '../components/upload/UploadProgress';

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

// Добавляем функцию для клиентской сегментации WAV-файла
const segmentWavFileInBrowser = async (
    file: File, 
    maxSegmentSize: number = 4.3 * 1024 * 1024,
    setProcessingStage: (stage: string) => void,
    setProcessingProgress: (progress: number) => void
): Promise<File[]> => {
    return new Promise((resolve, reject) => {
        try {
            setProcessingStage('Подготовка WAV файла к сегментации');
            setProcessingProgress(0);
            
            // Создаем объект FileReader для чтения файла
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    if (!e.target?.result) {
                        throw new Error('Ошибка чтения WAV файла');
                    }
                    
                    const wavBuffer = e.target.result as ArrayBuffer;
                    const wavFile = new Uint8Array(wavBuffer);
                    
                    // Проверяем заголовок WAV файла (RIFF и WAVE маркеры)
                    const isValidWav = 
                        wavFile[0] === 82 && // 'R'
                        wavFile[1] === 73 && // 'I'
                        wavFile[2] === 70 && // 'F'
                        wavFile[3] === 70 && // 'F'
                        wavFile[8] === 87 && // 'W'
                        wavFile[9] === 65 && // 'A'
                        wavFile[10] === 86 && // 'V'
                        wavFile[11] === 69;  // 'E'
                    
                    if (!isValidWav) {
                        throw new Error('Недействительный WAV файл');
                    }
                    
                    // Найдем секцию "fmt " для получения метаданных
                    let fmtOffset = -1;
                    for (let i = 12; i < Math.min(wavFile.length, 200); i++) {
                        if (wavFile[i] === 102 && wavFile[i+1] === 109 && wavFile[i+2] === 116 && wavFile[i+3] === 32) { // "fmt "
                            fmtOffset = i;
                            break;
                        }
                    }
                    
                    if (fmtOffset === -1) {
                        throw new Error('Не удалось найти секцию fmt в WAV файле');
                    }
                    
                    // Получаем количество каналов (16 бит в позиции fmtOffset + 10)
                    const channels = wavFile[fmtOffset + 10] | (wavFile[fmtOffset + 11] << 8);
                    
                    // Получаем частоту дискретизации (32 бита в позиции fmtOffset + 12)
                    const sampleRate = wavFile[fmtOffset + 12] | 
                                   (wavFile[fmtOffset + 13] << 8) |
                                   (wavFile[fmtOffset + 14] << 16) |
                                   (wavFile[fmtOffset + 15] << 24);
                    
                    // Получаем битовую глубину (16 бит в позиции fmtOffset + 22)
                    const bitsPerSample = wavFile[fmtOffset + 22] | (wavFile[fmtOffset + 23] << 8);
                    
                    // Найдем секцию "data"
                    let dataOffset = -1;
                    let dataSize = 0;
                    for (let i = fmtOffset + 24; i < Math.min(wavFile.length, 1000); i++) {
                        if (wavFile[i] === 100 && wavFile[i+1] === 97 && wavFile[i+2] === 116 && wavFile[i+3] === 97) { // "data"
                            dataOffset = i + 8; // Пропускаем "data" и 4 байта размера
                            
                            // Получаем размер секции data (4 байта после "data")
                            dataSize = wavFile[i+4] | 
                                       (wavFile[i+5] << 8) |
                                       (wavFile[i+6] << 16) |
                                       (wavFile[i+7] << 24);
                            break;
                        }
                    }
                    
                    if (dataOffset === -1) {
                        throw new Error('Не удалось найти секцию data в WAV файле');
                    }
                    
                    // Вычисляем размер одного сэмпла в байтах
                    const bytesPerSample = bitsPerSample / 8;
                    // Вычисляем размер фрейма (для всех каналов)
                    const frameSize = bytesPerSample * channels;
                    // Вычисляем количество фреймов в 1 секунде
                    const framesPerSecond = sampleRate;
                    // Вычисляем размер данных для 1 секунды в байтах
                    const bytesPerSecond = frameSize * framesPerSecond;
                    
                    console.log(`WAV метаданные: каналы=${channels}, частота=${sampleRate}Hz, битность=${bitsPerSample}bit`);
                    console.log(`Размер фрейма=${frameSize}B, байт/сек=${bytesPerSecond}B`);
                    
                    // Вычисляем, сколько секунд должен занимать каждый сегмент, чтобы не превышать maxSegmentSize
                    // Берем меньшее значение для гарантии непревышения лимита
                    const segmentDurationSeconds = Math.floor((maxSegmentSize - 44) / bytesPerSecond);
                    
                    // Убедимся, что у нас есть хотя бы 5 секунд в сегменте
                    const effectiveSegmentDuration = Math.max(5, segmentDurationSeconds);
                    
                    console.log(`Длительность сегмента: ${effectiveSegmentDuration} секунд`);
                    
                    // Вычисляем размер сегмента в байтах (добавляем 44 байта для заголовка WAV)
                    const segmentDataSize = effectiveSegmentDuration * bytesPerSecond;
                    const segmentSize = segmentDataSize + 44;
                    
                    console.log(`Размер сегмента: ${segmentSize} байт (${segmentSize / 1024 / 1024} МБ)`);
                    
                    // Вычисляем количество сегментов
                    const numFrames = dataSize / frameSize;
                    const totalDuration = numFrames / framesPerSecond;
                    const numSegments = Math.ceil(totalDuration / effectiveSegmentDuration);
                    
                    console.log(`Общая длительность: ${totalDuration.toFixed(2)} секунд`);
                    console.log(`Количество сегментов: ${numSegments}`);
                    
                    setProcessingStage('Создание WAV сегментов');
                    
                    // Создаем каждый сегмент
                    const segments: File[] = [];
                    
                    // Для каждого сегмента
                    for (let i = 0; i < numSegments; i++) {
                        setProcessingProgress((i / numSegments) * 100);
                        
                        // Вычисляем начальное время и длительность сегмента
                        const startSeconds = i * effectiveSegmentDuration;
                        let segmentDuration = effectiveSegmentDuration;
                        
                        // Для последнего сегмента - возможно меньшая длительность
                        if (i === numSegments - 1) {
                            segmentDuration = Math.min(effectiveSegmentDuration, totalDuration - startSeconds);
                        }
                        
                        // Вычисляем смещение начала и конца данных сегмента
                        const startOffset = dataOffset + Math.floor(startSeconds * bytesPerSecond);
                        const endOffset = Math.min(
                            dataOffset + dataSize,
                            startOffset + Math.floor(segmentDuration * bytesPerSecond)
                        );
                        
                        // Размер данных для этого сегмента
                        const currentSegmentDataSize = endOffset - startOffset;
                        
                        // Создаем новый буфер для сегмента (заголовок + данные)
                        const segmentBuffer = new ArrayBuffer(44 + currentSegmentDataSize);
                        const segmentView = new Uint8Array(segmentBuffer);
                        
                        // Копируем заголовок RIFF
                        segmentView[0] = 82;  // 'R'
                        segmentView[1] = 73;  // 'I'
                        segmentView[2] = 70;  // 'F'
                        segmentView[3] = 70;  // 'F'
                        
                        // Размер файла минус 8 (4 байта на "RIFF" и 4 на размер)
                        const fileSize = 36 + currentSegmentDataSize;
                        segmentView[4] = fileSize & 0xFF;
                        segmentView[5] = (fileSize >> 8) & 0xFF;
                        segmentView[6] = (fileSize >> 16) & 0xFF;
                        segmentView[7] = (fileSize >> 24) & 0xFF;
                        
                        // WAVE заголовок
                        segmentView[8] = 87;   // 'W'
                        segmentView[9] = 65;   // 'A'
                        segmentView[10] = 86;  // 'V'
                        segmentView[11] = 69;  // 'E'
                        
                        // fmt чанк
                        segmentView[12] = 102; // 'f'
                        segmentView[13] = 109; // 'm'
                        segmentView[14] = 116; // 't'
                        segmentView[15] = 32;  // ' '
                        
                        // Размер fmt чанка (16 для PCM)
                        segmentView[16] = 16;
                        segmentView[17] = 0;
                        segmentView[18] = 0;
                        segmentView[19] = 0;
                        
                        // Копируем данные fmt из оригинального файла
                        for (let j = 0; j < 16; j++) {
                            segmentView[20 + j] = wavFile[fmtOffset + 8 + j];
                        }
                        
                        // data чанк
                        segmentView[36] = 100; // 'd'
                        segmentView[37] = 97;  // 'a'
                        segmentView[38] = 116; // 't'
                        segmentView[39] = 97;  // 'a'
                        
                        // Размер data чанка
                        segmentView[40] = currentSegmentDataSize & 0xFF;
                        segmentView[41] = (currentSegmentDataSize >> 8) & 0xFF;
                        segmentView[42] = (currentSegmentDataSize >> 16) & 0xFF;
                        segmentView[43] = (currentSegmentDataSize >> 24) & 0xFF;
                        
                        // Копируем данные сегмента
                        for (let j = 0; j < currentSegmentDataSize; j++) {
                            segmentView[44 + j] = wavFile[startOffset + j];
                        }
                        
                        // Создаем File из буфера
                        const segmentFile = new File(
                            [segmentBuffer], 
                            `wav_segment_${i.toString().padStart(3, '0')}.wav`,
                            { type: 'audio/wav' }
                        );
                        
                        console.log(`Создан сегмент ${i+1}/${numSegments}: ${segmentFile.name}, размер: ${segmentFile.size} байт`);
                        segments.push(segmentFile);
                    }
                    
                    setProcessingProgress(100);
                    console.log(`Процесс сегментации завершен: ${segments.length} сегментов создано`);
                    
                    // Создаем манифест с метаданными о сегментах
                    const manifest = {
                        originalFile: file.name,
                        totalDuration: totalDuration,
                        format: {
                            sampleRate,
                            channels,
                            bitsPerSample
                        },
                        segments: segments.map((segment, index) => {
                            const startSeconds = index * effectiveSegmentDuration;
                            let segmentDuration = effectiveSegmentDuration;
                            if (index === numSegments - 1) {
                                segmentDuration = Math.min(effectiveSegmentDuration, totalDuration - startSeconds);
                            }
                            return {
                                start: startSeconds,
                                duration: segmentDuration,
                                fileName: segment.name
                            };
                        })
                    };
                    
                    // Создаем JSON-файл манифеста
                    const manifestFile = new File(
                        [JSON.stringify(manifest, null, 2)],
                        'wav_manifest.json',
                        { type: 'application/json' }
                    );
                    
                    // Добавляем файл манифеста в начало массива сегментов
                    segments.unshift(manifestFile);
                    
                    resolve(segments);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                    console.error('Ошибка при сегментации WAV файла:', error);
                    reject(new Error(errorMessage));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения WAV файла'));
            };
            
            // Начинаем чтение файла
            reader.readAsArrayBuffer(file);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            console.error('Ошибка при сегментации WAV файла:', error);
            reject(new Error(errorMessage));
        }
    });
};

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
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const audioElement = useRef<HTMLAudioElement | null>(null);

    // Form states
    const [trackname, setTrackname] = useState('');
    const [genre, setGenre] = useState('');
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('');
    const [processingProgress, setProcessingProgress] = useState(0);
    const [uploadedTrackId, setUploadedTrackId] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Добавим состояние для контроля отмены
    const [isCancelling, setIsCancelling] = useState(false);
    const [uploadController, setUploadController] = useState<AbortController | null>(null);

    // Add effect to track isProcessing changes
    useEffect(() => {
        console.log("isProcessing changed:", isProcessing);
        console.log("Current processing stage:", processingStage);
        console.log("Current progress:", processingProgress);
    }, [isProcessing, processingStage, processingProgress]);

    // Check user authentication
    useEffect(() => {
        if (!user) router.push('/');
    }, [user, router]);

    // Проверяем наличие необходимых функций
    useEffect(() => {
        if (!createPostHook?.createPost || !createPostHook?.createSegmentFile) {
            console.error('Functions createPost or createSegmentFile not available');
            toast.error('Initialization error. Please refresh the page');
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
        const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
        const progressBarWidth = progressBar.offsetWidth;
        const clickPercentage = (clickPosition / progressBarWidth) * 100;
        const newTime = (clickPercentage / 100) * audioDuration;

        audioElement.current.currentTime = newTime;
        setAudioProgress(clickPercentage);
    };

    // File handling functions
    const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Create audio element for preview
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            
            audio.onloadedmetadata = () => {
                setAudioDuration(audio.duration);
                audioElement.current = audio;
                
                audio.ontimeupdate = () => {
                    setAudioProgress((audio.currentTime / audio.duration) * 100);
                };
                
                audio.onended = () => {
                    setIsAudioPlaying(false);
                    setAudioProgress(0);
                    audio.currentTime = 0;
                };
            };

            setFileAudio(file);
            setTrackname(file.name.replace(/\.[^/.]+$/, ''));
            
        } catch (error) {
            console.error('Error loading audio:', error);
            toast.error('Error loading audio file');
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
        if (audioElement.current) {
            audioElement.current.pause();
            audioElement.current = null;
        }
        setFileAudio(null);
        setIsAudioPlaying(false);
        setAudioProgress(0);
        setAudioDuration(0);
        setTrackname('');
    };

    const clearImage = () => {
        setFileImage(null);
        setImagePreview(null);
    };

    const clearAll = () => {
        clearAudio();
        clearImage();
        setGenre('');
        setProcessingStage('');
        setProcessingProgress(0);
        setIsProcessing(false);
    };

    // Функция отмены загрузки
    const handleCancelUpload = () => {
        if (!uploadController) {
            console.log("No active upload to cancel");
            return;
        }
        
        console.log("Cancelling upload process");
        setIsCancelling(true);
        
        // Показываем пользователю, что идет отмена
        toast.loading('Cancelling upload...', { 
            id: 'cancel-toast',
            style: {
                border: '1px solid #018CFD',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px'
            },
            icon: '🛑'
        });
        
        // Отмена запроса и загрузки
        console.log("Aborting upload controller");
        uploadController.abort();
        
        // Abort any server-side processing by sending a cancel request
        console.log("Sending server-side cancel request");
        fetch('/api/audio/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user?.id }),
        }).catch(error => {
            console.error('Error cancelling server process:', error);
        }).finally(() => {
            console.log("Server cancel request completed");
        
        // Reset all states immediately
        setIsProcessing(false);
        setIsCancelling(false);
        setProcessingStage('');
        setProcessingProgress(0);
            setUploadController(null);
        
        // Reset all form fields
        clearAll();
        
        toast.success('Upload cancelled', { 
            id: 'cancel-toast',
            style: {
                border: '1px solid #018CFD',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px'
            },
            icon: '✓'
            });
        });
    };

    // Upload functions
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Валидация
        if (!fileAudio) {
            toast.error('Please select an audio file', {
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
            return;
        }
        
        console.log("=== Upload Started ===");

        // Reset cancelling flag to ensure we're starting fresh
        if (isCancelling) {
            console.log("Upload was in cancelling state, resetting");
            setIsCancelling(false);
            await new Promise(resolve => setTimeout(resolve, 100)); // Give time for state to update
        }
        
        console.log("Initial state:", {
            fileAudio,
            fileImage,
            trackname,
            genre,
            isProcessing,
            isCancelling
        });

        if (!fileAudio || !fileImage || !trackname || !genre) {
            console.log("Validation failed:", { fileAudio, fileImage, trackname, genre });
            return;
        }

        // Reset any previous upload controller to avoid interference
        if (uploadController) {
            console.log("Aborting previous upload controller");
            uploadController.abort();
            setUploadController(null);
            await new Promise(resolve => setTimeout(resolve, 100)); // Give time for state to update
        }

        // Set initial stage
        setIsProcessing(true);
        setProcessingStage('Preparing upload');
        setProcessingProgress(0);
            
        // Add a small delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 100));
            
        console.log("State after setting:", {
            isProcessing: true,
            processingStage: 'Preparing upload',
            processingProgress: 0
        });

        // Check file size (not more than 200 MB)
        const fileSizeInMB = fileAudio.size / (1024 * 1024);
        if (fileSizeInMB > 200) {
            toast.error('File size must not exceed 200 MB', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '⚠️'
            });
            setIsProcessing(false);
            return;
        }

        // Check audio duration (not more than 12 minutes)
        if (audioDuration > 12 * 60) {
            toast.error('Track duration must not exceed 12 minutes', {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '⏱️'
            });
            setIsProcessing(false);
            return;
        }

        try {
            // Debug log to confirm states are set
            console.log("Progress bar state:", { isProcessing: true, processingStage: 'Preparing upload', processingProgress: 0 });
            
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

            // Create new controller for cancellation
            const controller = new AbortController();
            setUploadController(controller);
            
            // ИЗМЕНЯЕМ ЛОГИКУ ЗАГРУЗКИ:
            // Вместо отправки целого WAV-файла, разбиваем его на сегменты прямо в браузере
            setProcessingStage('Сегментация WAV файла');
            setProcessingProgress(0);
            
            toast.loading('Сегментация WAV файла: 0%', { id: toastId });
            
            // Выполняем клиентскую сегментацию WAV-файла
            let wavSegmentFiles: File[] = [];
            try {
                wavSegmentFiles = await segmentWavFileInBrowser(
                    fileAudio,
                    4.3 * 1024 * 1024, // 4.3 MB максимальный размер сегмента
                    setProcessingStage,
                    setProcessingProgress
                );
                
                console.log(`Сегментация WAV файла завершена: ${wavSegmentFiles.length} сегментов создано`);
                toast.success(`WAV файл разбит на ${wavSegmentFiles.length} сегментов`, { 
                    id: toastId,
                    style: {
                        border: '1px solid #20DDBB',
                        padding: '16px',
                        color: '#ffffff',
                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                        fontSize: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                    },
                    icon: '✅'
                });
                
                // Малая задержка для отображения сообщения
                await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                console.error('Ошибка при сегментации WAV файла:', error);
                
                toast.error(`Ошибка при сегментации WAV файла: ${errorMessage}`, { 
                    id: toastId,
                    style: {
                        border: '1px solid #FF4A4A',
                        padding: '16px',
                        color: '#ffffff',
                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                        fontSize: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                    },
                    icon: '⚠️'
                });
                
                setIsProcessing(false);
                setUploadController(null);
                return;
            }
            
            // Извлекаем файл манифеста (первый элемент в массиве)
            const wavManifestFile = wavSegmentFiles.length > 0 ? wavSegmentFiles.shift() : null;
            console.log(`Манифест WAV: ${wavManifestFile?.name || 'отсутствует'}`);
            
            // Создаем FormData только с необходимыми данными (без исходного WAV-файла)
            const formData = new FormData();
            
            // Добавляем метаданные
            if (trackname) {
                formData.append('trackname', trackname);
            }
            if (genre) {
                formData.append('genre', genre);
            }
            
            // Добавляем изображение обложки
            if (fileImage) {
                formData.append('image', fileImage);
            }
            
            // Уведомляем сервер, что мы отправляем только WAV сегменты
            formData.append('clientSegmentation', 'true');
            
            // Добавляем манифест WAV, если он существует
            if (wavManifestFile) {
                formData.append('wavManifest', wavManifestFile);
            }
            
            // Добавляем все WAV сегменты в FormData с последовательными номерами
            for (let i = 0; i < wavSegmentFiles.length; i++) {
                formData.append(`wavSegment${i}`, wavSegmentFiles[i]);
            }
            
            // Отправляем информацию о количестве сегментов
            formData.append('wavSegmentCount', wavSegmentFiles.length.toString());
            
            setProcessingStage('Отправка сегментов WAV на сервер');
            setProcessingProgress(0);
            toast.loading(`Отправка сегментов WAV: 0%`, { id: toastId });
            
            // Отправляем запрос с помощью XMLHttpRequest для отслеживания прогресса
            const xhr = new XMLHttpRequest();
            
            // Настраиваем обработчики событий
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 100);
                    setProcessingProgress(percentage);
                    toast.loading(`Отправка сегментов WAV: ${percentage}%`, { id: toastId });
                    console.log(`Прогресс отправки WAV сегментов: ${percentage}%`);
                }
            };
            
            xhr.onerror = () => {
                console.error('Ошибка сети при отправке сегментов');
                toast.error('Ошибка сети при отправке сегментов. Проверьте подключение к интернету и попробуйте снова.', { 
                    id: toastId,
                    style: {
                        border: '1px solid #FF4A4A',
                        padding: '16px',
                        color: '#ffffff',
                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                        fontSize: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                    },
                    icon: '⚠️'
                });
                setIsProcessing(false);
                setUploadController(null);
            };
            
            xhr.onload = async () => {
                // Проверка успешного кода ответа
                console.log(`Ответ сервера: статус=${xhr.status}, тип ответа=${xhr.responseType}, тип содержимого=${xhr.getResponseHeader('Content-Type')}`);
                
                if (xhr.status !== 200) {
                    console.error(`Ошибка сервера: ${xhr.status} ${xhr.statusText}`);
                    
                    let errorMessage = 'Ошибка сервера';
                    let errorDetails = '';
                    
                    // Пытаемся извлечь детали ошибки из ответа
                    try {
                        // Проверяем, является ли ответ JSON
                        const contentType = xhr.getResponseHeader('Content-Type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorResponse = JSON.parse(xhr.responseText);
                            errorMessage = errorResponse.error || errorResponse.message || 'Ошибка сервера';
                            errorDetails = errorResponse.details || '';
                        } else {
                            // Если ответ не JSON, просто берем текст
                            errorMessage = `Ошибка сервера (${xhr.status}): ${xhr.responseText.substring(0, 100)}`;
                        }
                    } catch (parseError) {
                        console.error('Ошибка при разборе ответа сервера:', parseError);
                        // Если не удалось распарсить ответ, используем статус код
                        errorMessage = `Ошибка сервера (${xhr.status}): ${xhr.statusText || 'неизвестная ошибка'}`;
                    }
                    
                    // Для 500 ошибок добавляем специальное сообщение
                    if (xhr.status === 500) {
                        errorMessage = `Сервер столкнулся с ошибкой (500). Попробуйте другой аудиофайл или обратитесь в поддержку.`;
                        console.error(`Ошибка сервера 500. Ответ:`, xhr.responseText);
                    }
                    
                    // Выводим подробную информацию об ошибке в консоль
                    console.error('Детали ошибки загрузки:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        message: errorMessage,
                        details: errorDetails,
                        responseText: xhr.responseText ? xhr.responseText.substring(0, 500) + '...' : 'пустой ответ'
                    });
                    
                    toast.error(errorMessage, { 
                        id: toastId,
                        style: {
                            border: '1px solid #FF4A4A',
                            padding: '16px',
                            color: '#ffffff',
                            background: 'linear-gradient(to right, #2A184B, #1f1239)',
                            fontSize: '16px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                        },
                        icon: '⚠️',
                        duration: 5000
                    });
                    
                    setIsProcessing(false);
                    setUploadController(null);
                    return;
                }
                
                try {
                    // Устанавливаем прогресс 100% при завершении загрузки
                    setProcessingProgress(100);
                    toast.loading(`Отправка WAV сегментов: 100%`, { id: toastId });
                    
                    // Теперь обрабатываем SSE ответ
                    const response = new Response(xhr.response, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/event-stream'
                        }
                    });
                    
                    // Обрабатываем server-sent events для обновлений прогресса
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if (!reader) throw new Error('Не удалось создать reader');

                    // Продолжаем с остальной обработкой...
                    await handleSSEProcessing(reader, decoder, toastId);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                    console.error('Ошибка при обработке ответа сервера:', error);
                    toast.error(`Ошибка при обработке ответа сервера: ${errorMessage}`, { 
                        id: toastId,
                        style: {
                            border: '1px solid #FF4A4A',
                            padding: '16px',
                            color: '#ffffff',
                            background: 'linear-gradient(to right, #2A184B, #1f1239)',
                            fontSize: '16px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                        },
                        icon: '⚠️',
                        duration: 5000
                    });
                    setIsProcessing(false);
                    setUploadController(null);
                }
            };
            
            // Добавляем обработчик прерывания
            controller.signal.addEventListener('abort', () => {
                console.log('Загрузка отменена пользователем');
                xhr.abort();
                // Сообщение toast будет показано в handleCancelUpload
            });
            
            // Открываем соединение и отправляем запрос
            xhr.open('POST', '/api/audio/process');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.responseType = 'text';
            
            // Проверка безопасности перед отправкой
            if (isCancelling) {
                console.log("Загрузка была отменена перед отправкой запроса");
                xhr.abort();
                setIsProcessing(false);
                setUploadController(null);
                return;
            }
            
            console.log("Отправка запроса с WAV сегментами...");
            xhr.send(formData);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            console.error('Ошибка загрузки:', error);
            toast.error(`Не удалось загрузить трек: ${errorMessage}`, {
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '⚠️',
                duration: 5000
            });
            
            // Сбрасываем состояние обработки
            setIsProcessing(false);
            setUploadController(null);
        }
    };
    
    // Separate function to handle SSE processing
    const handleSSEProcessing = async (reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder, toastId: string) => {
        try {
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {stream: true});
                buffer += chunk;
                
                // Process complete events in buffer
                const messages: any[] = [];
                let startIdx = 0;
                
                while (true) {
                    const dataPrefix = 'data: ';
                    const dataIdx = buffer.indexOf(dataPrefix, startIdx);
                    if (dataIdx === -1) break;
                    
                    const dataStart = dataIdx + dataPrefix.length;
                    const dataEnd = buffer.indexOf('\n\n', dataStart);
                    
                    if (dataEnd === -1) break; // Incomplete message, wait for more data
                    
                    const jsonStr = buffer.substring(dataStart, dataEnd);
                    console.log('Processing SSE data (first 100 chars):', jsonStr.substring(0, 100) + '...');
                    
                    try {
                        const jsonData = JSON.parse(jsonStr);
                        messages.push(jsonData);
                        
                        // Move start index for next iteration
                        startIdx = dataEnd + 2;
                    } catch (e) {
                        console.error('Error parsing JSON in SSE:', e);
                        console.log('Problematic JSON string:', jsonStr.substring(0, 150) + '...');
                        
                        // Move to next line to try and recover
                        startIdx = dataEnd + 2;
                    }
                }
                
                // Remove processed messages from buffer
                if (startIdx > 0) {
                    buffer = buffer.substring(startIdx);
                }
                
                // Process all extracted messages
                for (const update of messages) {
                    console.log('Received update type:', update.type);
                    
                    // Обработка ошибок сервера
                    if (update.type === 'error') {
                        const errorMessage = update.message || 'Server error during audio processing';
                        console.error('Server processing error:', errorMessage);
                        
                        // Вывод подробностей ошибки, если они есть
                        if (update.details) {
                            console.error('Error details:', update.details);
                        }
                        if (update.timestamp) {
                            console.error('Error timestamp:', update.timestamp);
                        }
                        
                        toast.error(`Error: ${errorMessage}`, {
                            id: toastId,
                            style: {
                                border: '1px solid #FF4A4A',
                                padding: '16px',
                                color: '#ffffff',
                                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                fontSize: '16px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                            },
                            icon: '⚠️',
                            duration: 5000
                        });
                        
                        // Сбрасываем состояния обработки
                        setIsProcessing(false);
                        setUploadController(null);
                        return; // Прерываем обработку при ошибке
                    }
                    
                    if (update.type === 'progress') {
                        // Map server stages to our UI stages
                        let displayStage = update.stage;
                        let displayProgress = update.progress;
                        let detailedMessage = '';
                        
                        // Extract details from details, if they exist
                        const details = update.details as any;
                        
                        // Handle different types of progress
                        if (update.stage.includes('convert')) {
                            displayStage = 'Converting to MP3';
                            // If there are conversion details
                            if (details?.conversionProgress) {
                                detailedMessage = `Conversion: ${typeof details.conversionProgress === 'string' ? details.conversionProgress : Math.round(details.conversionProgress) + '%'}`;
                            }
                        } else if (update.stage.includes('segment')) {
                            displayStage = 'Segmenting audio';
                            // If there are segment details
                            if (details?.segmentProgress) {
                                detailedMessage = `Segmenting: ${Math.round(details.segmentProgress)}% (${Math.floor(details.segmentProgress / 100 * 42)}/${42} segments)`;
                            }
                        } else if (update.stage.includes('Preparing segment') || update.stage.includes('Prepared segment')) {
                            displayStage = 'Preparing segments';
                            // If there are preparation details
                            if (details?.preparationProgress) {
                                detailedMessage = `Preparation: ${Math.round(details.preparationProgress)}%`;
                            }
                        } else if (update.stage.includes('WAV manifest')) {
                            displayStage = 'Processing WAV manifest';
                            if (details?.message) {
                                detailedMessage = details.message;
                            }
                        } else if (update.stage.includes('Smooth segment progress')) {
                            displayStage = 'Segmenting audio';
                            // Extract information about segment progress from string
                            const match = update.stage.match(/Smooth segment progress: ([0-9.]+)\/([0-9.]+) \(([0-9.]+)%\)/);
                            if (match) {
                                const current = parseFloat(match[1]);
                                const total = parseFloat(match[2]);
                                const percent = parseFloat(match[3]);
                                detailedMessage = `Processing segment ${Math.floor(current)} of ${Math.floor(total)} (${percent.toFixed(1)}%)`;
                            }
                        } else if (update.stage.includes('id') || update.stage.includes('ID')) {
                            displayStage = 'Generating IDs';
                        } else if (update.stage.includes('playlist') || update.stage.includes('m3u8')) {
                            displayStage = 'Creating playlist';
                        } else if (update.stage.includes('Created segment')) {
                            displayStage = 'Segmenting audio';
                            // Extract created segment number
                            const match = update.stage.match(/Created segment segment_(\d+)\.mp3/);
                            if (match) {
                                const segmentNum = parseInt(match[1]);
                                const totalSegments = 42; // Based on logs
                                detailedMessage = `Created segment ${segmentNum+1} of ${totalSegments}`;
                                // Update progress based on created segment
                                displayProgress = ((segmentNum+1) / totalSegments) * 100;
                            }
                        }
                        
                        // Use message from details, if exists and no own detailed message
                        if (!detailedMessage && details?.message) {
                            detailedMessage = details.message;
                        }

                        // Update UI with progress information
                        setProcessingStage(displayStage);
                        setProcessingProgress(displayProgress);
                        
                        // If this is segmenting stage, add details to stage name for UploadProgress
                        // and update progress value based on actual segment progress
                        if (update.stage.includes('segment') && details?.segmentProgress) {
                            const segmentCount = details?.totalSegments || 42; // Use total segments from details or default to 42
                            const currentSegment = Math.floor((details.segmentProgress / 100) * segmentCount);
                            
                            // Update stage name with segment information for component UploadProgress
                            setProcessingStage(`${displayStage} ${currentSegment}/${segmentCount}`);
                            
                            // Important: update progress value, so progress bar doesn't "hang" in one place
                            setProcessingProgress(details.segmentProgress);
                            
                            console.log(`Segment progress update: ${details.segmentProgress}% (segment ${currentSegment}/${segmentCount})`);
                        }
                        
                        // Improved handling for "Smooth segment progress" logs
                        const smoothSegmentMatch = (
                            // Try to match from update.stage first
                            update.stage.match(/Smooth segment progress: ([0-9.]+)\/([0-9.]+)/) ||
                            // Or try to match from details.message if available
                            (details?.message && typeof details.message === 'string' && 
                             details.message.match(/Smooth segment progress: ([0-9.]+)\/([0-9.]+)/))
                        );
                        
                        if (smoothSegmentMatch) {
                            const currentSegmentFloat = parseFloat(smoothSegmentMatch[1]);
                            const totalSegments = parseFloat(smoothSegmentMatch[2]);
                            const realProgress = (currentSegmentFloat / totalSegments) * 100;
                            
                            // Update progress based on actual value
                            setProcessingProgress(realProgress);
                            
                            // Update the stage so user can see segmentation progress
                            setProcessingStage(`Segmenting audio ${Math.floor(currentSegmentFloat)}/${Math.floor(totalSegments)}`);
                            
                            console.log(`Updating progress bar to ${realProgress.toFixed(1)}% based on segment ${currentSegmentFloat}/${totalSegments}`);
                        }
                        
                        // Look for detailed segmentation log info from consoled messages in details.message
                        if (details?.message && typeof details.message === 'string') {
                            // Check for segment creation progress
                            const segmentProgressMatch = details.message.match(/Segment creation progress: ([0-9.]+)% \((?:processed approximately )?([0-9.]+)\/([0-9.]+)\)/);
                            if (segmentProgressMatch) {
                                const percentDone = parseFloat(segmentProgressMatch[1]);
                                const currentSegment = parseFloat(segmentProgressMatch[2]);
                                const totalSegments = parseFloat(segmentProgressMatch[3]);
                                
                                // Update progress display
                                setProcessingProgress(percentDone);
                                setProcessingStage(`Segmenting audio ${Math.floor(currentSegment)}/${Math.floor(totalSegments)}`);
                                
                                console.log(`Segmentation progress from message: ${percentDone}% (segment ${currentSegment}/${totalSegments})`);
                            }
                        }
                        
                        // If message about created segment
                        const createdSegmentMatch = (
                            update.stage.match(/Created segment segment_(\d+)\.mp3/) || 
                            (details?.message && typeof details.message === 'string' && 
                             details.message.match(/Created segment segment_(\d+)\.mp3/))
                        );
                        
                        if (createdSegmentMatch) {
                            const segmentNum = parseInt(createdSegmentMatch[1]);
                            const totalSegments = details?.totalSegments || 42; // Based on logs or details
                            const realProgress = ((segmentNum + 1) / totalSegments) * 100;
                            
                            // Update progress and current segment information
                            setProcessingProgress(realProgress);
                            setProcessingStage(`Segmenting audio ${segmentNum + 1}/${totalSegments}`);
                            
                            console.log(`Created segment ${segmentNum + 1}/${totalSegments}, updating progress to ${realProgress.toFixed(1)}%`);
                        }
                        
                        // If log message includes information about starting segmentation
                        if (update.stage.includes('Creating segments') || update.stage.includes('audio segments')) {
                            // Check if there is information about the number of segments
                            const totalSegmentsMatch = update.stage.match(/Creating (\d+) segments/i);
                            if (totalSegmentsMatch) {
                                const totalSegments = parseInt(totalSegmentsMatch[1]);
                                console.log(`Starting segmentation process with ${totalSegments} segments`);
                                // Set initial segmentation progress
                                setProcessingStage(`Segmenting audio 0/${totalSegments}`);
                                setProcessingProgress(1); // Start with 1% to show the process has begun
                            }
                        }
                        
                        // If this is conversion stage, add time details
                        if (update.stage.includes('convert') && details?.message) {
                            const timeMatch = details.message.match(/(\d+:\d+)\s+from\s+(\d+:\d+)/);
                            if (timeMatch) {
                                setProcessingStage(`${displayStage} (${timeMatch[1]} from ${timeMatch[2]})`);
                                
                                // If there is information about conversion progress, use it
                                if (details.conversionProgress) {
                                    const conversionProgressValue = typeof details.conversionProgress === 'string' 
                                        ? parseInt(details.conversionProgress) 
                                        : details.conversionProgress;
                                        
                                    setProcessingProgress(conversionProgressValue);
                                }
                            }
                        }
                        
                        // If this is preparation stage, add preparation progress information
                        if ((update.stage.includes('Preparing segment') || update.stage.includes('Prepared segment')) && details?.preparationProgress) {
                            const segmentCount = 42; // Real segment count from logs
                            const preparedSegments = Math.floor((details.preparationProgress / 100) * segmentCount);
                            setProcessingStage(`${displayStage} ${preparedSegments}/${segmentCount}`);
                            
                            // Update progress bar based on actual preparation progress
                            setProcessingProgress(details.preparationProgress);
                        }
                        
                        // Form toast message
                        const toastMessage = detailedMessage 
                            ? `${displayStage}: ${Math.round(displayProgress)}% (${detailedMessage})` 
                            : `${displayStage}: ${Math.round(displayProgress)}%`;
                            
                        console.log(`Progress update: ${toastMessage}`);
                        
                        toast.loading(toastMessage, { 
                            id: toastId,
                            style: {
                                border: '1px solid #20DDBB',
                                padding: '16px',
                                color: '#ffffff',
                                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                fontSize: '16px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                            },
                            icon: '🎵'
                        });
                    } else if (update.type === 'complete') {
                        console.log('Audio processing complete, show success animation before proceeding');
                        setProcessingStage('Processing complete');
                        setProcessingProgress(100);
                        toast.success('Audio processing completed!', { 
                            id: toastId,
                            style: {
                                border: '1px solid #20DDBB',
                                padding: '16px',
                                color: '#ffffff',
                                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                fontSize: '16px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                            },
                            icon: '✅'
                        });
                        
                        // Add slight delay to show completion animation
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Now upload to Appwrite
                        setProcessingStage('Uploading to Appwrite storage');
                        setProcessingProgress(0);
                        toast.loading('Uploading files to storage...', { 
                            id: toastId,
                            style: {
                                border: '1px solid #20DDBB',
                                padding: '16px',
                                color: '#ffffff',
                                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                fontSize: '16px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                            },
                            icon: '⬆️'
                        });
                        
                        try {
                            // Convert result data to correct File/Blob objects
                            const result = update.result;
                            
                            // Ensure all necessary data is present
                            if (!result || !result.mp3File || !result.segments || !result.m3u8Template) {
                                throw new Error('Failed to get processed audio data');
                            }
                            
                            // Convert MP3 file from data URL
                            const mp3Blob = await fetch(result.mp3File).then(r => r.blob());
                            const mp3File = new File([mp3Blob], 'audio.mp3', { type: 'audio/mp3' });
                            
                            // Process WAV segments and manifest
                            let wavSegmentFiles: Array<File> = [];
                            let wavManifestFile: File | null = null;
                            
                            // Process WAV manifest if available
                            if (result.wavManifest && result.wavManifest.data) {
                                try {
                                    console.log('Received WAV manifest:', result.wavManifest.name);
                                    const manifestBlob = new Blob([result.wavManifest.data], { type: 'application/json' });
                                    wavManifestFile = new File([manifestBlob], result.wavManifest.name, { type: 'application/json' });
                                    console.log('Created WAV manifest file:', wavManifestFile.name, 'size:', wavManifestFile.size);
                                } catch (error) {
                                    console.error('Error creating WAV manifest file:', error);
                                }
                            }
                            
                            // Process WAV segments if available
                            if (result.wavSegments && Array.isArray(result.wavSegments)) {
                                console.log(`Found ${result.wavSegments.length} WAV segments from server processing`);
                                
                                // For each WAV segment, create File object
                                for (let i = 0; i < result.wavSegments.length; i++) {
                                    try {
                                        const wavSegment = result.wavSegments[i];
                                        console.log(`Processing WAV segment ${i+1}/${result.wavSegments.length}: ${wavSegment.name}`);
                                    
                                    // Check if segment has data
                                        if (!wavSegment.data) {
                                            console.error(`WAV segment ${i+1} has no data!`);
                                            throw new Error(`WAV segment data ${i+1} is missing`);
                                    }
                                    
                                    // Convert base64 to Blob
                                        console.log(`Creating blob from base64 data for WAV segment ${i+1}...`);
                                        // Use atob method for more direct control
                                        const byteString = atob(wavSegment.data);
                                        const arrayBuffer = new ArrayBuffer(byteString.length);
                                        const int8Array = new Uint8Array(arrayBuffer);
                                        for (let j = 0; j < byteString.length; j++) {
                                            int8Array[j] = byteString.charCodeAt(j);
                                        }
                                        
                                        // Create Blob and File objects
                                        const wavSegmentBlob = new Blob([int8Array], { type: 'audio/wav' });
                                        console.log(`Created WAV blob, size: ${wavSegmentBlob.size} bytes`);
                                    
                                    // Create File object from Blob
                                        const wavSegmentFile = new File([wavSegmentBlob], wavSegment.name, { type: 'audio/wav' });
                                        console.log(`Created WAV File object: ${wavSegmentFile.name}, size: ${wavSegmentFile.size} bytes`);
                                        
                                        // Add to array of WAV segments
                                        wavSegmentFiles.push(wavSegmentFile);
                                        
                                    } catch (error) {
                                        console.error(`Error processing WAV segment ${i+1}:`, error);
                                        // Continue with other segments
                                    }
                                }
                                
                                console.log(`Successfully processed ${wavSegmentFiles.length} WAV segments`);
                                    } else {
                                console.log('No WAV segments found in server response');
                            }
                            
                            // Create segment file objects from base64 data
                            const segmentFiles: File[] = [];
                            for (const segment of result.segments) {
                                if (segment && segment.data) {
                                    try {
                                        // Convert base64 to Blob
                                        const byteString = atob(segment.data);
                                        const arrayBuffer = new ArrayBuffer(byteString.length);
                                        const int8Array = new Uint8Array(arrayBuffer);
                                        for (let j = 0; j < byteString.length; j++) {
                                            int8Array[j] = byteString.charCodeAt(j);
                                        }
                                        
                                        // Create Blob and File
                                        const blob = new Blob([int8Array], { type: 'audio/mp3' });
                                        const file = new File([blob], segment.name, { type: 'audio/mp3' });
                                        
                                        console.log(`Processed MP3 segment ${segment.name}, size: ${file.size}`);
                                        segmentFiles.push(file);
                                    } catch (error) {
                                        console.error(`Error processing MP3 segment ${segment.name}:`, error);
                                    }
                            } else {
                                    console.error('Invalid MP3 segment data:', segment);
                                }
                            }

                            console.log('Parameters for createPost:', {
                                audio: fileAudio, // Only if needed and no WAV segments
                                image: fileImage,
                                segments: segmentFiles,
                                wavSegments: wavSegmentFiles,
                                wavManifest: wavManifestFile ? `${wavManifestFile.name} (${wavManifestFile.size} bytes)` : 'none',
                                trackname,
                                genre,
                                userId: user?.id ?? undefined,
                            });

                            // Check for all necessary files
                            if (!fileImage) {
                                throw new Error('Image file is required for upload');
                            }
                            
                            // Создаем параметры для вызова createPost
                            const postParams: any = {
                                image: fileImage,
                                segments: segmentFiles,
                                wavSegments: wavSegmentFiles,
                                trackname,
                                genre,
                                userId: user?.id ?? undefined,
                                onProgress: (stage: string, progress: number) => {
                                    // Map storage stages to UI stages
                                    let displayStage = stage;
                                    if (stage.includes('main audio')) {
                                        displayStage = 'Uploading main audio';
                                    } else if (stage.includes('cover image')) {
                                        displayStage = 'Uploading cover image';
                                    } else if (stage.includes('MP3')) {
                                        displayStage = 'Uploading MP3 version';
                                    } else if (stage.includes('WAV')) {
                                        displayStage = 'Uploading WAV segments';
                                    } else if (stage.includes('WAV manifest')) {
                                        displayStage = 'Uploading WAV manifest';
                                    } else if (stage.includes('playlist')) {
                                        displayStage = 'Uploading playlist';
                                    } else if (stage.includes('database') || stage.includes('record')) {
                                        displayStage = 'Finalizing upload';
                                    }
                                    
                                    setProcessingStage(displayStage);
                                    setProcessingProgress(progress);
                                    toast.loading(`${displayStage}: ${Math.round(progress)}%`, { 
                                        id: toastId,
                                        style: {
                                            border: '1px solid #20DDBB',
                                            padding: '16px',
                                            color: '#ffffff',
                                            background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                            fontSize: '16px',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                                        },
                                        icon: '🎵'
                                    });
                                }
                            };

                            // Добавляем wavManifest, если он был создан
                            if (wavManifestFile) {
                                postParams.wavManifest = wavManifestFile;
                            }

                            // Добавляем audio только если нет WAV сегментов
                            if (wavSegmentFiles.length === 0 && fileAudio) {
                                postParams.audio = fileAudio;
                            }

                            const createPostResult = await createPostHook.createPost(postParams);

                            if (createPostResult.success) {
                                // Set final stages
                                setProcessingStage('Finalizing upload');
                                setProcessingProgress(100);
                                
                                // Wait a bit to show completion
                                await new Promise(resolve => setTimeout(resolve, 800));
                                
                                // Show success toast and modal
                                setUploadedTrackId(createPostResult.trackId);
                                setShowSuccessModal(true);
                                toast.success('Track successfully uploaded!', { 
                                    id: toastId,
                                    style: {
                                        border: '1px solid #20DDBB',
                                        padding: '16px',
                                        color: '#ffffff',
                                        background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                        fontSize: '16px',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                                    },
                                    icon: '🎉',
                                    duration: 5000
                                });
                                setIsProcessing(false);
                                setUploadController(null);

                                console.log('Document created successfully, details:', {
                                    id: createPostResult.trackId,
                                    wavSegments: wavSegmentFiles.length,
                                    wavManifest: wavManifestFile ? 'Uploaded' : 'Not available'
                                });
                            } else {
                                throw new Error(createPostResult.error);
                            }
                        } catch (error) {
                            console.error('Error during Appwrite upload:', error);
                            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
                                id: toastId,
                                style: {
                                    border: '1px solid #FF4A4A',
                                    padding: '16px',
                                    color: '#ffffff',
                                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                                    fontSize: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                                },
                                icon: '⚠️',
                                duration: 5000
                            });
                            setIsProcessing(false);
                            setUploadController(null);
                        }
                    } else if (update.type === 'error') {
                        throw new Error(update.error || 'An error occurred during audio processing');
                    }
                }
            }
        } catch (error) {
            // Улучшенная обработка ошибок при чтении потока SSE
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error processing server-sent events:', error);
            
            toast.error(`Error during track processing: ${errorMessage}`, {
                id: toastId,
                style: {
                    border: '1px solid #FF4A4A',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(255, 74, 74, 0.2)'
                },
                icon: '⚠️',
                duration: 5000
            });
            
            // Reset processing state
            setIsProcessing(false);
            setUploadController(null);
        }
    };

    // Add this after the state declarations
    useEffect(() => {
        console.log("State changed:", {
            isProcessing,
            processingStage,
            processingProgress
        });
    }, [isProcessing, processingStage, processingProgress]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white">
            {/* Enhanced progress visualization with stages and percentages - moved to top level for better visibility */}
            {/* Disable the progress bar as requested */}
            {isProcessing && (
                <UploadProgress
                    isUploading={isProcessing}
                    stage={processingStage}
                    progress={processingProgress}
                    onCancel={handleCancelUpload}
                />
            )}
            
            {/* Use original TopNav from layouts/includes */}
            <TopNav params={{id: ''}} />
            
            {/* Copyright Notification */}
            <CopyrightNotification 
                isVisible={showCopyrightNotice} 
                onClose={() => setShowCopyrightNotice(false)} 
            />
            
            <div className="max-w-4xl mx-auto px-4 py-24">
                {/* New animated header with floating gradient */}
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
                                            <li className="flex items-center mt-2">
                                                <span className="mr-2 text-blue-400">ℹ</span>
                                                <span className="italic">File will be automatically converted to MP3</span>
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
                            onClick={isProcessing ? handleCancelUpload : handleUpload}
                            disabled={(!fileAudio || !fileImage || !trackname || !genre) && !isProcessing}
                            className={`px-10 py-4 rounded-xl font-medium text-lg
                                    transition-all duration-300 transform
                                    ${(!fileAudio || !fileImage || !trackname || !genre) && !isProcessing
                                        ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                        : isProcessing 
                                          ? 'bg-gradient-to-r from-[#0047AB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#018CFD]/20'
                                          : 'bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#20DDBB]/20'
                                    }`}
                        >
                            <div className="flex items-center">
                                {isProcessing ? 'Cancel Upload' : 'Release Track'}
                                {!isProcessing && (
                                    <span className="ml-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                                        i
                                    </span>
                                )}
                            </div>
                        </button>
                        
                        {/* Hover tooltip with validation info */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#2A184B] rounded-lg shadow-lg 
                                      p-4 text-sm text-white/80 opacity-0 group-hover:opacity-100 transition-opacity 
                                      pointer-events-none transform translate-y-2 group-hover:translate-y-0 z-50
                                      border border-[#20DDBB]/20 before:content-[''] before:absolute before:top-full 
                                      before:right-4 before:border-l-[8px] before:border-l-transparent 
                                      before:border-r-[8px] before:border-r-transparent before:border-t-[8px] 
                                      before:border-t-[#2A184B]">
                            <h4 className="font-medium text-[#20DDBB] mb-2">Before releasing:</h4>
                            <ul className="space-y-1.5">
                                <li className="flex items-start">
                                    <span className={`mr-2 ${fileAudio ? 'text-green-400' : 'text-red-400'}`}>
                                        {fileAudio ? '✓' : '×'}
                                    </span>
                                    <span>Audio file uploaded</span>
                                </li>
                                <li className="flex items-start">
                                    <span className={`mr-2 ${fileImage ? 'text-green-400' : 'text-red-400'}`}>
                                        {fileImage ? '✓' : '×'}
                                    </span>
                                    <span>Cover image selected</span>
                                </li>
                                <li className="flex items-start">
                                    <span className={`mr-2 ${trackname ? 'text-green-400' : 'text-red-400'}`}>
                                        {trackname ? '✓' : '×'}
                                    </span>
                                    <span>Track name provided</span>
                                </li>
                                <li className="flex items-start">
                                    <span className={`mr-2 ${genre ? 'text-green-400' : 'text-red-400'}`}>
                                        {genre ? '✓' : '×'}
                                    </span>
                                    <span>Genre selected</span>
                                </li>
                            </ul>
                            
                            <div className="mt-4 pt-3 border-t border-white/10">
                                <p className="text-xs text-[#20DDBB]/90 font-medium">
                                    By clicking "Release Track" you agree to and sign the royalty agreement with Sacral Track.
                                </p>
                                <Link href="/terms" className="text-white/60 text-xs hover:text-[#20DDBB] mt-1 block transition-colors">
                                    Read full agreement →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success modal */}
                <SuccessModal
                    isOpen={showSuccessModal}
                    onClose={() => {
                        setShowSuccessModal(false);
                        clearAll();
                    }}
                    trackId={uploadedTrackId}
                />
            </div>
        </div>
    );
};


