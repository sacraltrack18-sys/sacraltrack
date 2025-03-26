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

            // Set upload stage
            setProcessingStage('Uploading WAV');
            setProcessingProgress(0);
            toast.loading(`Uploading WAV: 0%`, { id: toastId });

            // Create new controller for cancellation
            const controller = new AbortController();
            setUploadController(controller);

            // Track upload progress using XMLHttpRequest
            const xhr = new XMLHttpRequest();
            
            // Configure all event handlers before opening the connection
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 100);
                    setProcessingProgress(percentage);
                    toast.loading(`Uploading WAV: ${percentage}%`, { id: toastId });
                    console.log(`WAV upload progress: ${percentage}%`);
                }
            };
            
            xhr.onerror = () => {
                console.error('Network error while uploading file');
                toast.error('Network error while uploading file', { id: toastId });
                setIsProcessing(false);
                setUploadController(null);
            };
            
            xhr.onload = async () => {
                if (xhr.status !== 200) {
                    console.error(`Server error: ${xhr.statusText || 'unknown error'}`);
                    toast.error(`Server error: ${xhr.statusText || 'unknown error'}`, { id: toastId });
                    setIsProcessing(false);
                    setUploadController(null);
                    return;
                }
                
                try {
                    // Set progress to 100% when upload is complete
                    setProcessingProgress(100);
                    toast.loading(`Uploading WAV: 100%`, { id: toastId });
                    
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

                    if (!reader) throw new Error('Failed to create reader');

                    // Continue with the rest of the processing...
                    await handleSSEProcessing(reader, decoder, toastId);
                } catch (error) {
                    console.error('Error processing server response');
                    toast.error('Error processing server response', { id: toastId });
                    setIsProcessing(false);
                    setUploadController(null);
                }
            };
            
            // Add abort handler to signal
            controller.signal.addEventListener('abort', () => {
                console.log('Upload canceled by user (from signal)');
                xhr.abort();
                // Toast message will be shown by handleCancelUpload
            });
            
            // Now open the connection and send the request after all handlers are set
            xhr.open('POST', '/api/audio/process');
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.responseType = 'text';
            
            // Final safety check before sending request
            if (isCancelling) {
                console.log("Upload was cancelled before sending request");
                xhr.abort();
                setIsProcessing(false);
                setUploadController(null);
                return;
            }
            
            console.log("Sending XHR request...");
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload track');
            
            // Reset processing state
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
                            const segmentCount = 42; // Real segment count from logs
                            const currentSegment = Math.floor((details.segmentProgress / 100) * segmentCount);
                            
                            // Update stage name with segment information for component UploadProgress
                            setProcessingStage(`${displayStage} ${currentSegment}/${segmentCount}`);
                            
                            // Important: update progress value, so progress bar doesn't "hang" in one place
                            setProcessingProgress(details.segmentProgress);
                            
                            console.log(`Segment progress update: ${details.segmentProgress}% (segment ${currentSegment}/${segmentCount})`);
                        }
                        
                        // If the string contains information about the current segment in "Smooth segment progress: X.YY/Z" format
                        const smoothSegmentMatch = update.stage.match(/Smooth segment progress: ([0-9.]+)\/([0-9.]+)/);
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
                        
                        // If message about created segment
                        const createdSegmentMatch = update.stage.match(/Created segment segment_(\d+)\.mp3/);
                        if (createdSegmentMatch) {
                            const segmentNum = parseInt(createdSegmentMatch[1]);
                            const totalSegments = 42; // Based on logs
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
                                throw new Error('Failed to get processed audio data');
                            }
                            
                            // Convert MP3 file from data URL
                            const mp3Blob = await fetch(result.mp3File).then(r => r.blob());
                            const mp3File = new File([mp3Blob], 'audio.mp3', { type: 'audio/mp3' });
                            
                            // Load segments to Appwrite and get their IDs
                            const segmentIds = [];
                            const totalSegments = result.segments.length;
                            
                            console.log(`Preparing to upload ${totalSegments} segments to Appwrite...`);
                            setProcessingStage('Uploading segments to Appwrite');
                            setProcessingProgress(0);
                            
                            // Check if user exists and we have access to createPost
                            if (!user) {
                                throw new Error('Authentication error. Please sign in to the system');
                            }

                            // Check createSegmentFile function
                            if (!createPostHook?.createSegmentFile) {
                                console.error('createSegmentFile function is not available');
                                throw new Error('Segment upload function is not available. Please refresh the page');
                            }

                            // Load segments one by one with progress display
                            for (let i = 0; i < totalSegments; i++) {
                                try {
                                    const segment = result.segments[i];
                                    console.log(`Processing segment ${i+1}/${totalSegments}: ${segment.name}`);
                                    
                                    // Check if segment has data
                                    if (!segment.data) {
                                        console.error(`Segment ${i+1} has no data!`);
                                        throw new Error(`Segment data ${i+1} is missing`);
                                    }
                                    
                                    // Convert base64 to Blob
                                    console.log(`Creating blob from base64 data for segment ${i+1}...`);
                                    const segmentBlob = await fetch(`data:audio/mp3;base64,${segment.data}`).then(r => r.blob());
                                    console.log(`Created blob, size: ${segmentBlob.size} bytes`);
                                    
                                    // Create File object from Blob
                                    const segmentFile = new File([segmentBlob], segment.name, { type: 'audio/mp3' });
                                    console.log(`Created File object: ${segmentFile.name}, size: ${segmentFile.size} bytes`);
                                    
                                    // Load through createSegmentFile, which is obtained at the upper level component
                                    console.log(`Uploading segment ${i+1} to Appwrite...`);
                                    const segmentId = await createPostHook.createSegmentFile(segmentFile);
                                    
                                    // Check if segmentId is valid
                                    if (!segmentId || segmentId === 'unique()') {
                                        console.warn(`Invalid segment ID received from createSegmentFile for segment ${i+1}: ${segmentId}`);
                                        // Create new ID and try to upload directly
                                        const fallbackId = ID.unique();
                                        console.log(`Trying direct upload with fallback ID: ${fallbackId}`);
                                        
                                        try {
                                            // Direct upload through Appwrite SDK
                                            const uploadResult = await storage.createFile(
                                                process.env.NEXT_PUBLIC_BUCKET_ID!,
                                                fallbackId,
                                                segmentFile
                                            );
                                            
                                            // Use ID from upload result
                                            const validSegmentId = uploadResult?.$id || fallbackId;
                                            console.log(`Segment ${i+1} uploaded with fallback method, ID: ${validSegmentId}`);
                                            segmentIds.push(validSegmentId);
                                        } catch (fallbackError) {
                                            console.error(`Fallback upload failed for segment ${i+1}:`, fallbackError);
                                            throw new Error(`Failed to upload segment ${i+1} by any method`);
                                        }
                                    } else {
                                        console.log(`Segment ${i+1} uploaded successfully, ID: ${segmentId}`);
                                        segmentIds.push(segmentId);
                                    }
                                    
                                    // Update progress
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

                            // Create M3U8 playlist with real URLs of segments
                            console.log('Creating M3U8 playlist with segment IDs...');
                            let m3u8Content = result.m3u8Template;

                            // Debug: show original playlist template
                            console.log('Original M3U8 template (first 200 chars):', m3u8Content.substring(0, 200) + '...');

                            // Check if we have placeholders for replacement
                            if (!m3u8Content.includes('SEGMENT_PLACEHOLDER_')) {
                                console.warn('M3U8 template does not contain SEGMENT_PLACEHOLDER_ markers!');
                                console.log('Creating M3U8 content manually...');
                                
                                // Create HLS playlist manually with simple segment IDs
                                m3u8Content = "#EXTM3U\n";
                                m3u8Content += "#EXT-X-VERSION:3\n";
                                m3u8Content += "#EXT-X-MEDIA-SEQUENCE:0\n";
                                m3u8Content += "#EXT-X-ALLOW-CACHE:YES\n";
                                m3u8Content += "#EXT-X-TARGETDURATION:10\n";
                                m3u8Content += "#EXT-X-PLAYLIST-TYPE:VOD\n";
                                
                                for (let i = 0; i < segmentIds.length; i++) {
                                    const segmentId = segmentIds[i];
                                    // Simply add segment ID, without full URL
                                    m3u8Content += "#EXTINF:10,\n";
                                    m3u8Content += `${segmentId}\n`;
                                    console.log(`Added segment ${i+1} with ID ${segmentId} to M3U8 playlist`);
                                }
                                
                                m3u8Content += "#EXT-X-ENDLIST\n";
                            } else {
                                // Replace placeholders with segment IDs
                                console.log('Environment variables for URLs:');
                                console.log(`- NEXT_PUBLIC_APPWRITE_ENDPOINT: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'undefined'}`);
                                console.log(`- NEXT_PUBLIC_BUCKET_ID: ${process.env.NEXT_PUBLIC_BUCKET_ID || 'undefined'}`);
                                console.log(`- NEXT_PUBLIC_APPWRITE_PROJECT_ID: ${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'undefined'}`);
                                
                                for (let i = 0; i < segmentIds.length; i++) {
                                    const segmentId = segmentIds[i];
                                    const placeholder = `SEGMENT_PLACEHOLDER_${i}`;
                                    
                                    console.log(`Replacing placeholder "${placeholder}" for segment ${i+1} with ID: ${segmentId}`);
                                    
                                    if (m3u8Content.includes(placeholder)) {
                                        // Simply use segment ID instead of full URL
                                        m3u8Content = m3u8Content.replace(placeholder, segmentId);
                                        console.log(`Placeholder ${placeholder} replaced successfully with segment ID`);
                                    } else {
                                        console.warn(`Placeholder ${placeholder} not found in M3U8 template!`);
                                    }
                                }
                            }

                            // Debug: show final playlist
                            console.log('Final M3U8 content (first 500 chars):', m3u8Content.substring(0, 500) + '...');

                            // Create M3U8 file
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

                            // Check for all necessary files
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
            
            // Also need to reset processing state
            setIsProcessing(false);
            setUploadController(null);
            
            throw error;
        } finally {
            // Important: DO NOT reset isProcessing here, 
            // as this would cause progress window to disappear on successful processing
            // Reset isProcessing will happen at the right time in other parts of the code
            
            // Only if process was cancelled or an error occurred
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


