"use client"

{/*UPLOAD-FREE PAGE*/}

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useUser } from '@/app/context/user';
import { useCreatePost } from '@/app/hooks/useCreatePost';
import { useClientCreatePost } from '@/app/hooks/useClientCreatePost';
import { useClientUpload } from '@/app/hooks/useClientUpload';
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
import ClientAudioProcessor from '../components/upload/ClientAudioProcessor';

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
              <h3 className="text-white font-semibold">Free Content Agreement</h3>
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
            Dear artist, by uploading content as free you agree that this track will be available for free download without payment. This is perfect for promotional content!
          </p>
          <div className="flex justify-end">
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#20DDBB] text-sm hover:underline">
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

export default function UploadFree() {
    const router = useRouter();
    const userContext = useUser();
    const user = userContext?.user;
    const createPostHook = useCreatePost();
    const clientCreatePostHook = useClientCreatePost();
    const clientUploadHook = useClientUpload();
    
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
    
    // Add state for cancellation control
    const [isCancelling, setIsCancelling] = useState(false);
    const [uploadController, setUploadController] = useState<AbortController | null>(null);

    // New states for client-side processing
    const [clientMp3File, setClientMp3File] = useState<File | null>(null);
    const [clientSegments, setClientSegments] = useState<Array<{name: string, data: Uint8Array, file: File}>>([]);
    const [clientM3u8Content, setClientM3u8Content] = useState<string>('');
    const [clientMp3Duration, setClientMp3Duration] = useState<number>(0);
    const [showAudioProcessor, setShowAudioProcessor] = useState<boolean>(false);
    const [audioProcessingError, setAudioProcessingError] = useState<string>('');

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

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            // Cancel all unfinished uploads when leaving the page
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
            console.log('Selected file:', file.name, 'Type:', file.type);
            
            // Add better validation for file types that includes checking file extension
            const isWav = file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav');
            
            if (!isWav) {
                toast.error('Please select a WAV file format', {
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
                return;
            }

            // Reset client processed file
            setClientMp3File(null);
            setClientSegments([]);
            setClientM3u8Content('');
            setClientMp3Duration(0);
            
            // Create audio element for preview
            const audio = new Audio();
            
            // Use a try/catch specifically for createObjectURL which can fail on some mobile browsers
            try {
                audio.src = URL.createObjectURL(file);
            } catch (urlError) {
                console.error('Error creating object URL:', urlError);
                // If createObjectURL fails, still allow the file to be uploaded
                setFileAudio(file);
                setTrackname(file.name.replace(/\.[^/.]+$/, ''));
                setShowAudioProcessor(true);
                return;
            }
            
            // Add timeout to handle potential mobile issues with metadata loading
            const metadataTimeout = setTimeout(() => {
                console.log('Metadata loading timed out, proceeding anyway');
                setAudioDuration(0); // Set a default duration
                audioElement.current = audio;
                setShowAudioProcessor(true);
            }, 3000); // 3 second timeout
            
            audio.onloadedmetadata = () => {
                clearTimeout(metadataTimeout);
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
                
                // Start client-side processing
                setShowAudioProcessor(true);
            };
            
            // Add error handling for the audio element
            audio.onerror = (e) => {
                clearTimeout(metadataTimeout);
                console.error('Audio loading error:', e);
                // Still allow upload even if preview fails
                setFileAudio(file);
                setTrackname(file.name.replace(/\.[^/.]+$/, ''));
                setShowAudioProcessor(true);
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
        setClientMp3File(null); // Also clear processed MP3
        setClientSegments([]);  // Clear segments
        setClientM3u8Content(''); // Clear playlist
        setClientMp3Duration(0);
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

    // Cancel upload function
    const handleCancelUpload = () => {
        if (!uploadController) {
            console.log("No active upload to cancel");
            return;
        }
        
        console.log("Cancelling upload process");
        setIsCancelling(true);
        
        // Show the user that cancellation is in progress
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
        
        // Cancel request and upload
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

    // Handle processed audio files
    const handleAudioProcessed = (
        mp3File: File, 
        segments: Array<{name: string, data: Uint8Array, file: File}>, 
        m3u8Content: string, 
        duration: number
    ) => {
        console.log('Audio processed successfully:', {
            mp3Size: mp3File.size,
            segmentsCount: segments.length,
            duration
        });
        
        setClientMp3File(mp3File);
        setClientSegments(segments);
        setClientM3u8Content(m3u8Content);
        setClientMp3Duration(duration);
        setShowAudioProcessor(false);
        
        toast.success('Audio successfully processed', {
            style: {
                border: '1px solid #20DDBB',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
            },
            icon: '✅',
            duration: 3000
        });
    };
    
    // Handle audio processing error
    const handleAudioProcessingError = (error: string) => {
        if (error) {
            console.error('Audio processing error:', error);
        }
        setAudioProcessingError(error);
        setShowAudioProcessor(false);
        
        // Пытаемся продолжить процесс загрузки несмотря на ошибку
        if (fileAudio && !clientMp3File) {
            console.log('Attempting to continue with direct upload despite processing error');
            // Показываем уведомление о загрузке без обработки
            toast.success('Done. Continuing with track upload', {
                style: {
                    border: '1px solid #20DDBB',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                },
                icon: '✅',
                duration: 3000
            });
        }
    };

    // Updated upload function using client-side upload for FREE content
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
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
        
        console.log("=== Free Upload Started ===");

        if (!fileAudio || !fileImage || !trackname || !genre) {
            console.log("Validation failed:", { fileAudio, fileImage, trackname, genre });
            return;
        }

        setIsProcessing(true);
        setProcessingStage('Preparing free upload');
        setProcessingProgress(0);
        
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
            // Create toast to display progress
            const toastId = toast.loading('Starting free upload...', {
                style: {
                    border: '1px solid #20DDBB',
                    padding: '16px',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2A184B, #1f1239)',
                    fontSize: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
                },
                icon: '🆓'
            });

            // Use direct client-side upload for audio file
            setProcessingStage('Uploading WAV');
            setProcessingProgress(0);
            
            // First upload the WAV file directly from the client to Appwrite  
            const audioUploadResult = await clientUploadHook.uploadAudio(fileAudio, (stage, progress) => {
                setProcessingProgress(progress);
                toast.loading(`Uploading WAV: ${Math.round(progress)}%`, { id: toastId });
            });
            
            if (!audioUploadResult.success) {
                throw new Error(`Failed to upload audio: ${audioUploadResult.error}`);
            }
            
            // Upload image
            setProcessingStage('Uploading cover image');
            const imageUploadResult = await clientUploadHook.uploadImage(fileImage, (stage, progress) => {
                const scaledProgress = 40 + (progress / 100) * 20;
                setProcessingProgress(scaledProgress);
                toast.loading(`Uploading cover image: ${Math.round(progress)}%`, { id: toastId });
            });
            
            if (!imageUploadResult.success) {
                throw new Error(`Failed to upload image: ${imageUploadResult.error}`);
            }
            
            // Create post directly without payment processing - marking as FREE content 
            setProcessingStage('Creating free track');
            setProcessingProgress(60);
            toast.loading(`Creating free track...`, { id: toastId });
            
            const processingData = {
                audioId: audioUploadResult.fileId,
                imageId: imageUploadResult.fileId,
                trackname,
                genre,
                userId: user?.id,
                is_free: true // Mark as free content
            };
            
            // Send request to process audio for free
            const processResponse = await fetch('/api/audio/process-free', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(processingData)
            });
            
            if (!processResponse.ok) {
                let errorMessage = 'Failed to process free audio';
                
                try {
                    const errorData = await processResponse.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response', e);
                }
                
                throw new Error(errorMessage);
            }
            
            // For free content, we expect immediate response
            const result = await processResponse.json();
            
            if (result.success) {
                setProcessingStage('Finalizing free upload');
                setProcessingProgress(100);
                
                // Show success toast and modal
                setUploadedTrackId(result.trackId);
                setShowSuccessModal(true);
                toast.success('Free track uploaded successfully!', { 
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
                throw new Error(result.error);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Free upload error:', error);
            
            toast.error(`Failed to upload free track: ${errorMessage}`, {
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

    // Update the handleDirectUpload function for free content
    const handleDirectUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // If we have no processed files yet but we have a WAV file, show processor
        if (!clientMp3File && fileAudio) {
            setShowAudioProcessor(true);
            return;
        }
        
        // Basic checks
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
                icon: '❌'
            });
            return;
        }
        
        setIsProcessing(true);
        setProcessingStage('Preparing free upload');
        setProcessingProgress(0);
        
        const toastId = toast.loading('Starting free upload...', {
            style: {
                border: '1px solid #20DDBB',
                padding: '16px',
                color: '#ffffff',
                background: 'linear-gradient(to right, #2A184B, #1f1239)',
                fontSize: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
            },
            icon: '🆓'
        });
        
        try {
            // Create M3U8 file and prepare segments for upload
            const segmentFiles = clientSegments.map(segment => segment.file);
            const m3u8File = new File([clientM3u8Content], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' });
            
            // Use the client hook to create a post with segments - marked as FREE
            const result = await clientCreatePostHook.createPost({
                audio: fileAudio,
                mp3: clientMp3File || undefined,
                m3u8: m3u8File,
                segments: segmentFiles,
                image: fileImage,
                trackname,
                genre,
                userId: user?.id || 'anonymous',
                onProgress: (stage, progress, estimatedTime) => {
                    setProcessingStage(stage);
                    setProcessingProgress(progress);
                    toast.loading(`${stage}: ${Math.round(progress)}% ${estimatedTime || ''}`, { id: toastId });
                }
            });
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create free post');
            }
            
            // Show successful upload message
            toast.success('Free track uploaded successfully!', {
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
                icon: '✅',
                duration: 5000
            });
            
            // Show success modal
            setUploadedTrackId(result.trackId);
            setShowSuccessModal(true);
            
            // Reset form state
            clearAll();
            setIsProcessing(false);
        } catch (error) {
            console.error('Direct free upload error:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Free upload failed: ${errorMessage}`, {
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

    // Проверка заголовков безопасности при загрузке компонента
    React.useEffect(() => {
        console.log('Upload Free page initialized');
        
        // Очистка при размонтировании компонента
        return () => {
            console.log('Unmounting Upload Free component');
        };
    }, []);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1f1239] to-[#150c28] text-white">
            {/* Enhanced progress visualization with stages and percentages - moved to top level for better visibility */}
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
            
            {/* Add the client audio processor component */}
            {showAudioProcessor && fileAudio && (
                <ClientAudioProcessor 
                    audioFile={fileAudio}
                    onProcessed={handleAudioProcessed}
                    onError={handleAudioProcessingError}
                />
            )}
            
            <div className="max-w-4xl mx-auto px-4 py-24">
                {/* New animated header with floating gradient - FREE VERSION */}
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
                        Upload Free Content
                    </motion.h1>
                    
                    {/* Subheading */}
                    <motion.p 
                        className="text-lg text-white/70"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        Share your music with the world - completely free!
                    </motion.p>
                    
                    {/* Free badge */}
                    <motion.div
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 
                                   border border-green-500/30 rounded-full"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <span className="text-green-400 text-sm font-medium">🆓 FREE DOWNLOAD</span>
                    </motion.div>
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
                                          hover:bg-[#20DDBB]/5 relative overflow-hidden group
                                          touch-manipulation tap-highlight-transparent"
                                whileHover={{ boxShadow: "0 0 25px rgba(32,221,187,0.15)" }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <input
                                    type="file"
                                    onChange={handleAudioChange}
                                    accept="audio/wav,audio/*"
                                    className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-10"
                                    aria-label="Upload audio track"
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
                                    <p className="text-[#20DDBB] text-lg font-medium mb-2">Drop your free track here</p>
                                    <p className="text-white/60 text-sm mb-6">WAV format, up to 12 minutes</p>
                                    
                                    {/* Audio requirements */}
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                        <h4 className="text-xs text-white/80 mb-2">Free Content Requirements:</h4>
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
                                                <span className="mr-2 text-green-400">🆓</span>
                                                <span className="italic text-green-400">Available for free download</span>
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
                                    placeholder="Free track name"
                                    className="w-full px-4 py-3 rounded-xl bg-[#2A184B]/50 border border-[#20DDBB]/10
                                            text-white placeholder-white/40 outline-none
                                            focus:border-[#20DDBB]/30 focus:ring-1 focus:ring-[#20DDBB]/20 transition-all"
                                />
                            </div>
                            <div>
                                <div className="w-full px-4 py-3 rounded-xl bg-[#2A184B]/50 border border-[#20DDBB]/10
                                            text-white flex items-center">
                                    <span>{user?.name || "Unknown Artist"}</span>
                                    <div className="ml-2 text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-xs">
                                        Free Content
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

                {/* Upload button with info tooltip - FREE VERSION */}
                <div className="mt-12 flex justify-end">
                    <div className="relative group">
                        <button
                            onClick={isProcessing ? handleCancelUpload : handleDirectUpload}
                            disabled={(!fileAudio || !fileImage || !trackname || !genre) && !isProcessing}
                            className={`px-10 py-4 rounded-full font-medium text-lg
                                    transition-all duration-300 transform
                                    ${(!fileAudio || !fileImage || !trackname || !genre) && !isProcessing
                                        ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                        : isProcessing 
                                          ? 'bg-gradient-to-r from-[#0047AB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#018CFD]/20'
                                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-green-500/20'
                                    }`}
                        >
                            <div className="flex items-center">
                                {isProcessing ? 'Cancel Upload' : 'Upload Free Content'}
                                {!isProcessing && (
                                    <span className="ml-2 w-5 h-5 rounded-full bg-white/20 items-center justify-center text-xs hidden md:flex">
                                        🆓
                                    </span>
                                )}
                            </div>
                        </button>
                        
                        {/* Hover tooltip with validation info - hidden on mobile */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#2A184B] rounded-lg shadow-lg 
                                      p-4 text-sm text-white/80 opacity-0 hidden md:block group-hover:opacity-100 transition-opacity 
                                      pointer-events-none transform translate-y-2 group-hover:translate-y-0 z-50
                                      border border-[#20DDBB]/20 before:content-[''] before:absolute before:top-full 
                                      before:right-4 before:border-l-[8px] before:border-l-transparent 
                                      before:border-r-[8px] before:border-r-transparent before:border-t-[8px] 
                                      before:border-t-[#2A184B]">
                            <h4 className="font-medium text-[#20DDBB] mb-2">Before uploading free content:</h4>
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
                                <p className="text-xs text-green-400/90 font-medium">
                                    🆓 By uploading you make this content available for free download to all users.
                                </p>
                                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-white/60 text-xs hover:text-[#20DDBB] mt-1 block transition-colors">
                                    Read free content terms →
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

