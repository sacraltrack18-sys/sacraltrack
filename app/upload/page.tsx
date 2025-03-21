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
import UploadProgress from '../components/upload/UploadProgress';
import ProcessingProgress from '../components/upload/ProcessingProgress';
import SuccessModal from '../components/upload/SuccessModal';
import RequirementsTooltip from '../components/upload/RequirementsTooltip';

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

// Add a new AdvancedProgressBar component
const AdvancedProgressBar = ({ 
  isProcessing, 
  stage, 
  progress, 
  onCancel 
}: { 
  isProcessing: boolean; 
  stage: string; 
  progress: number; 
  onCancel: () => void;
}) => {
  console.log("AdvancedProgressBar render:", { isProcessing, stage, progress });
  
  // The upload stages in order
  const stages = [
    "Uploading WAV",
    "Converting to MP3",
    "Segmenting audio",
    "Preparing segments",
    "Uploading segments",
    "Creating playlist",
    "Uploading main audio",
    "Uploading cover image",
    "Uploading MP3 version",
    "Finalizing upload"
  ];

  // Map the current stage to index in the stages array
  const getCurrentStageIndex = () => {
    if (!stage) return -1;
    
    const stageIndex = stages.findIndex(s => 
      stage.toLowerCase().includes(s.toLowerCase())
    );
    console.log("Current stage index:", stageIndex, "for stage:", stage);
    return stageIndex !== -1 ? stageIndex : stages.length - 1;
  };

  const currentStageIndex = getCurrentStageIndex();
  
  // Calculate overall progress based on stages completed and current progress
  const calculateOverallProgress = () => {
    if (currentStageIndex === -1) return 0;
    
    const stageWidth = 100 / stages.length;
    const completedStagesProgress = currentStageIndex * stageWidth;
    const currentStageProgress = progress * (stageWidth / 100);
    
    const overallProgress = completedStagesProgress + currentStageProgress;
    console.log("Overall progress calculation:", { 
      stageWidth, 
      completedStagesProgress, 
      currentStageProgress, 
      overallProgress 
    });
    
    return overallProgress;
  };
  
  const overallProgress = calculateOverallProgress();

  // Only show if processing
  if (!isProcessing) {
    console.log("AdvancedProgressBar not displaying because isProcessing is false");
    return null;
  }

  console.log("AdvancedProgressBar is displaying with overall progress:", Math.round(overallProgress) + "%");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50">
      <div className="w-[90%] max-w-3xl bg-gradient-to-b from-[#1F1239] to-[#150C28] rounded-2xl shadow-2xl border border-[#20DDBB]/20 p-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#20DDBB]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#018CFD]/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Uploading Track</h3>
              <p className="text-[#20DDBB]">{Math.round(overallProgress)}% complete</p>
            </div>
            <button 
              onClick={onCancel}
              className="bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
          
          {/* Main progress bar */}
          <div className="mb-8">
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative">
              {/* Glow effect */}
              <div className="absolute inset-y-0 left-0 w-full h-full bg-gradient-to-r from-[#20DDBB]/0 via-[#20DDBB]/30 to-[#018CFD]/0 animate-pulse opacity-50"></div>
              
              {/* Progress fill */}
              <div 
                className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full relative transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
              
              {/* Progress marker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg shadow-[#20DDBB]/40 transform -translate-x-1/2 transition-all duration-500 ease-out"
                style={{ left: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Stages timeline */}
          <div className="relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10"></div>
            <div className="flex justify-between mb-10">
              {stages.map((s, index) => {
                // Determine status: completed, current, or upcoming
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isUpcoming = index > currentStageIndex;
                
                return (
                  <div key={index} className="relative flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
                    {/* Stage marker */}
                    <div 
                      className={`w-4 h-4 rounded-full transition-all duration-300 z-10 transform ${
                        isCompleted ? 'bg-[#20DDBB] scale-100' : 
                        isCurrent ? 'bg-white shadow-lg shadow-[#20DDBB]/50 scale-125' : 
                        'bg-white/20 scale-90'
                      }`}
                    >
                      {/* Pulse effect for current stage */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-full bg-white/50 animate-ping"></div>
                      )}
                    </div>
                    
                    {/* Stage name */}
                    <div 
                      className={`absolute top-6 text-xs font-medium transition-all ${
                        isCompleted ? 'text-[#20DDBB]/80' : 
                        isCurrent ? 'text-white' : 
                        'text-white/40'
                      }`}
                      style={{ 
                        transform: `translateX(-50%) scale(${isCurrent ? '1' : '0.9'})`,
                        maxWidth: '100px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {s}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Current stage details */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-medium text-white">{stage}</h4>
              <span className="text-[#20DDBB] font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Estimated remaining time would go here */}
            <div className="mt-4 text-sm text-white/60 flex items-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mr-2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Processing... Please don't close your browser
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Upload() {
    const router = useRouter();
    const user  = useUser();
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
            console.error('Функции createPost или createSegmentFile недоступны');
            toast.error('Ошибка инициализации загрузки. Пожалуйста, обновите страницу');
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
        if (!uploadController) return;
        
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
        uploadController.abort();
        
        // Abort any server-side processing by sending a cancel request
        fetch('/api/audio/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user?.id }),
        }).catch(error => {
            console.error('Error cancelling server process:', error);
        });
        
        // Reset all states immediately
        setIsProcessing(false);
        setIsCancelling(false);
        setProcessingStage('');
        setProcessingProgress(0);
        
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
    };

    // Upload functions
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log("=== Upload Started ===");
        console.log("Initial state:", {
            fileAudio,
            fileImage,
            trackname,
            genre,
            isProcessing
        });

        if (!fileAudio || !fileImage || !trackname || !genre) {
            console.log("Validation failed:", { fileAudio, fileImage, trackname, genre });
            return;
        }

        try {
            console.log("Setting initial processing state...");
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

            // Проверка длительности аудио (не более 12 минут)
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
                return;
            }

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

            // Создаем новый контроллер для возможности отмены
            const controller = new AbortController();
            setUploadController(controller);

            // Create FormData
            const formData = new FormData();
            formData.append('audio', fileAudio);
            if (fileImage) {
                formData.append('image', fileImage);
            }
            if (trackname) {
                formData.append('trackname', trackname);
            }
            if (genre) {
                formData.append('genre', genre);
            }

            // Set initial stage
            setProcessingStage('Uploading WAV');
            setProcessingProgress(0);
            toast.loading(`Загрузка WAV: 0%`, { id: toastId });

            // Track upload progress using XMLHttpRequest
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/audio/process');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            
            // Abort controller for signal
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 100);
                    setProcessingProgress(percentage);
                    toast.loading(`Загрузка WAV: ${percentage}%`, { id: toastId });
                    console.log(`WAV upload progress: ${percentage}%`);
                }
            };
            
            xhr.onerror = () => {
                console.error('Сетевая ошибка при загрузке файла');
                toast.error('Сетевая ошибка при загрузке файла', { id: toastId });
                setIsProcessing(false);
                setUploadController(null);
            };
            
            xhr.onabort = () => {
                console.log('Загрузка отменена пользователем');
                toast.error('Загрузка отменена пользователем', { id: 'cancel-toast' });
                setIsProcessing(false);
                setUploadController(null);
            };
            
            xhr.onload = async () => {
                if (xhr.status !== 200) {
                    console.error('Ошибка сервера:', xhr.status, xhr.statusText);
                    toast.error(`Ошибка сервера: ${xhr.statusText || 'неизвестная ошибка'}`, { id: toastId });
                    setIsProcessing(false);
                    setUploadController(null);
                    return;
                }
                
                try {
                    // Set progress to 100% when upload is complete
                    setProcessingProgress(100);
                    toast.loading(`Загрузка WAV: 100%`, { id: toastId });
                    
                    // Now handle the SSE response
                    const response = new Response(xhr.response, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/event-stream'
                        }
                    });
                    
                    // Handle server-sent events for progress updates
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if (!reader) throw new Error('Не удалось создать reader');

                    // Continue with the rest of the processing...
                    await handleSSEProcessing(reader, decoder, toastId);
                } catch (error) {
                    console.error('Ошибка обработки ответа:', error);
                    toast.error('Ошибка обработки ответа сервера', { id: toastId });
                    setIsProcessing(false);
                    setUploadController(null);
                }
            };
            
            // Connect abort controller
            uploadController?.signal.addEventListener('abort', () => {
                xhr.abort();
            });
            
            // Send the request
            xhr.responseType = 'text';
            xhr.send(formData);
            
        } catch (error) {
            // Check if it was a user cancellation
            if (error instanceof DOMException && error.name === 'AbortError') {
                // Upload was cancelled by the user, do nothing
                return;
            }
            
            console.error('Ошибка загрузки:', error);
            const errorToastId = toast.loading('Upload failed');
            toast.error('Failed to upload track', { id: errorToastId });
            
            // Reset processing state only on error
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
                const messages = [];
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
                    
                    if (update.type === 'progress') {
                        // Map server stages to our UI stages
                        let displayStage = update.stage;
                        if (update.stage.includes('convert')) {
                            displayStage = 'Converting to MP3';
                        } else if (update.stage.includes('segment')) {
                            displayStage = 'Segmenting audio';
                        } else if (update.stage.includes('Preparing segment') || update.stage.includes('Prepared segment')) {
                            displayStage = 'Preparing segments';
                        } else if (update.stage.includes('id') || update.stage.includes('ID')) {
                            displayStage = 'Generating IDs';
                        } else if (update.stage.includes('playlist') || update.stage.includes('m3u8')) {
                            displayStage = 'Creating playlist';
                        }

                        setProcessingStage(displayStage);
                        setProcessingProgress(update.progress);
                        toast.loading(`${displayStage}: ${Math.round(update.progress)}%`, { 
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
                        // Audio processing complete, show success animation before proceeding
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
                                throw new Error('Не удалось получить данные обработанного аудио');
                            }
                            
                            // Convert MP3 file from data URL
                            const mp3Blob = await fetch(result.mp3File).then(r => r.blob());
                            const mp3File = new File([mp3Blob], 'audio.mp3', { type: 'audio/mp3' });
                            
                            // Загружаем сегменты в Appwrite и получаем их ID
                            const segmentIds = [];
                            const totalSegments = result.segments.length;
                            
                            console.log(`Preparing to upload ${totalSegments} segments to Appwrite...`);
                            setProcessingStage('Uploading segments to Appwrite');
                            setProcessingProgress(0);
                            
                            // Проверка, что user существует и у нас есть доступ к createPost
                            if (!user) {
                                throw new Error('Authentication error. Please sign in to the system');
                            }

                            // Проверяем функцию createSegmentFile
                            if (!createPostHook?.createSegmentFile) {
                                console.error('createSegmentFile function is not available');
                                throw new Error('Segment upload function is not available. Please refresh the page');
                            }

                            // Загружаем сегменты по очереди с показом прогресса
                            for (let i = 0; i < totalSegments; i++) {
                                try {
                                    const segment = result.segments[i];
                                    console.log(`Processing segment ${i+1}/${totalSegments}: ${segment.name}`);
                                    
                                    // Проверяем, что у сегмента есть data
                                    if (!segment.data) {
                                        console.error(`Segment ${i+1} has no data!`);
                                        throw new Error(`Данные сегмента ${i+1} отсутствуют`);
                                    }
                                    
                                    // Конвертируем base64 в Blob
                                    console.log(`Creating blob from base64 data for segment ${i+1}...`);
                                    const segmentBlob = await fetch(`data:audio/mp3;base64,${segment.data}`).then(r => r.blob());
                                    console.log(`Created blob, size: ${segmentBlob.size} bytes`);
                                    
                                    // Создаем File объект из Blob
                                    const segmentFile = new File([segmentBlob], segment.name, { type: 'audio/mp3' });
                                    console.log(`Created File object: ${segmentFile.name}, size: ${segmentFile.size} bytes`);
                                    
                                    // Загружаем через createSegmentFile, который получен на верхнем уровне компонента
                                    console.log(`Uploading segment ${i+1} to Appwrite...`);
                                    const segmentId = await createPostHook.createSegmentFile(segmentFile);
                                    
                                    // Проверяем, что segmentId валидный
                                    if (!segmentId || segmentId === 'unique()') {
                                        console.warn(`Invalid segment ID received from createSegmentFile for segment ${i+1}: ${segmentId}`);
                                        // Создаем новый ID и пробуем загрузить напрямую
                                        const fallbackId = ID.unique();
                                        console.log(`Trying direct upload with fallback ID: ${fallbackId}`);
                                        
                                        try {
                                            // Прямая загрузка через Appwrite SDK
                                            const uploadResult = await storage.createFile(
                                                process.env.NEXT_PUBLIC_BUCKET_ID!,
                                                fallbackId,
                                                segmentFile
                                            );
                                            
                                            // Используем ID из результата загрузки
                                            const validSegmentId = uploadResult?.$id || fallbackId;
                                            console.log(`Segment ${i+1} uploaded with fallback method, ID: ${validSegmentId}`);
                                            segmentIds.push(validSegmentId);
                                        } catch (fallbackError) {
                                            console.error(`Fallback upload failed for segment ${i+1}:`, fallbackError);
                                            throw new Error(`Не удалось загрузить сегмент ${i+1} ни одним из способов`);
                                        }
                                    } else {
                                        console.log(`Segment ${i+1} uploaded successfully, ID: ${segmentId}`);
                                        segmentIds.push(segmentId);
                                    }
                                    
                                    // Обновляем прогресс
                                    const progress = Math.round((i + 1) / totalSegments * 100);
                                    setProcessingProgress(progress);
                                    toast.loading(`Uploading segments: ${progress}%`, { 
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
                                        icon: '🧩'
                                    });
                                } catch (error) {
                                    console.error(`Error uploading segment ${i+1}:`, error);
                                    throw new Error(`Error uploading segment ${i+1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                            }

                            console.log(`All ${totalSegments} segments uploaded successfully`);
                            console.log('Segment IDs:', segmentIds);

                            // Создаем M3U8 плейлист с реальными URL сегментов
                            console.log('Creating M3U8 playlist with segment IDs...');
                            let m3u8Content = result.m3u8Template;

                            // Debug: показываем оригинальный шаблон плейлиста
                            console.log('Original M3U8 template (first 200 chars):', m3u8Content.substring(0, 200) + '...');

                            // Проверяем, что у нас есть плейсхолдеры для замены
                            if (!m3u8Content.includes('SEGMENT_PLACEHOLDER_')) {
                                console.warn('M3U8 template does not contain SEGMENT_PLACEHOLDER_ markers!');
                                console.log('Creating M3U8 content manually...');
                                
                                // Создаем HLS плейлист вручную с простыми ID сегментов
                                m3u8Content = "#EXTM3U\n";
                                m3u8Content += "#EXT-X-VERSION:3\n";
                                m3u8Content += "#EXT-X-MEDIA-SEQUENCE:0\n";
                                m3u8Content += "#EXT-X-ALLOW-CACHE:YES\n";
                                m3u8Content += "#EXT-X-TARGETDURATION:10\n";
                                m3u8Content += "#EXT-X-PLAYLIST-TYPE:VOD\n";
                                
                                for (let i = 0; i < segmentIds.length; i++) {
                                    const segmentId = segmentIds[i];
                                    // Просто добавляем ID сегмента, без полного URL
                                    m3u8Content += "#EXTINF:10,\n";
                                    m3u8Content += `${segmentId}\n`;
                                    console.log(`Added segment ${i+1} with ID ${segmentId} to M3U8 playlist`);
                                }
                                
                                m3u8Content += "#EXT-X-ENDLIST\n";
                            } else {
                                // Заменяем плейсхолдеры на ID сегментов
                                console.log('Environment variables for URLs:');
                                console.log(`- NEXT_PUBLIC_APPWRITE_ENDPOINT: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'undefined'}`);
                                console.log(`- NEXT_PUBLIC_BUCKET_ID: ${process.env.NEXT_PUBLIC_BUCKET_ID || 'undefined'}`);
                                console.log(`- NEXT_PUBLIC_APPWRITE_PROJECT_ID: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'undefined'}`);
                                
                                for (let i = 0; i < segmentIds.length; i++) {
                                    const segmentId = segmentIds[i];
                                    const placeholder = `SEGMENT_PLACEHOLDER_${i}`;
                                    
                                    console.log(`Replacing placeholder "${placeholder}" for segment ${i+1} with ID: ${segmentId}`);
                                    
                                    if (m3u8Content.includes(placeholder)) {
                                        // Просто используем ID сегмента вместо полного URL
                                        m3u8Content = m3u8Content.replace(placeholder, segmentId);
                                        console.log(`Placeholder ${placeholder} replaced successfully with segment ID`);
                                    } else {
                                        console.warn(`Placeholder ${placeholder} not found in M3U8 template!`);
                                    }
                                }
                            }

                            // Debug: показываем финальный плейлист
                            console.log('Final M3U8 content (first 500 chars):', m3u8Content.substring(0, 500) + '...');

                            // Создаем M3U8 файл
                            console.log('Creating M3U8 file...');
                            const m3u8File = new File([m3u8Content], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' });

                            console.log('Parameters for createPost:', {
                                audio: fileAudio,
                                image: fileImage,
                                mp3: mp3File,
                                m3u8: m3u8File,
                                segments: segmentIds,
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
                            });

                            // Проверяем наличие всех необходимых файлов
                            if (!fileAudio || !fileImage) {
                                throw new Error('Required files for upload are missing');
                            }
                            
                            const createPostResult = await createPostHook.createPost({
                                audio: fileAudio,
                                image: fileImage,
                                mp3: mp3File,
                                m3u8: m3u8File,
                                segments: segmentIds,
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
                            });

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
                                    icon: '🎉'
                                });
                            } else {
                                throw new Error(createPostResult.error);
                            }
                        } catch (error) {
                            console.error('Error during Appwrite upload:', error);
                            throw new Error(`Appwrite upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                    } else if (update.type === 'error') {
                        throw new Error(update.error || 'An error occurred during audio processing');
                    }
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            
            console.error('Error processing SSE:', error);
            toast.error(error instanceof Error ? error.message : 'Audio processing error', { 
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
                icon: '❌'
            });
            
            // Также нужно сбросить состояние обработки
            setIsProcessing(false);
            setUploadController(null);
            
            throw error;
        } finally {
            // Важно: НЕ сбрасываем isProcessing здесь, 
            // т.к. это приведет к исчезновению окна прогресса при успешной обработке
            // Сброс isProcessing произойдет в нужное время в других частях кода
            
            // Только если процесс был отменен или произошла ошибка
            if (isCancelling) {
                setIsProcessing(false);
                setUploadController(null);
            }
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
            {/* {isProcessing && (
                <AdvancedProgressBar
                    isProcessing={isProcessing}
                    stage={processingStage}
                    progress={processingProgress}
                    onCancel={() => {
                        console.log("Cancel clicked");
                        setIsProcessing(false);
                        setProcessingStage('');
                        setProcessingProgress(0);
                    }}
                />
            )} */}
            
            {/* Use original TopNav from layouts/includes */}
            <TopNav params={{id: ''}} />
            
            {/* Copyright Notification */}
            <CopyrightNotification 
                isVisible={showCopyrightNotice} 
                onClose={() => setShowCopyrightNotice(false)} 
            />
            
            <div className="max-w-4xl mx-auto px-4 py-24">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                        Upload Your Track
                    </h1>
                    <RequirementsTooltip
                        isOpen={isTooltipOpen}
                        onToggle={() => setIsTooltipOpen(!isTooltipOpen)}
                        fileAudio={fileAudio}
                        fileImage={fileImage}
                        trackname={trackname}
                    />
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
                                                Up to 100 MB
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
                                    <span>{user?.user?.name || "Unknown Artist"}</span>
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


