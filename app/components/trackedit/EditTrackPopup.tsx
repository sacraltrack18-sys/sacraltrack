"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ID } from 'appwrite';
import { storage, database } from '@/libs/AppWriteClient';
import Image from 'next/image';
import useCreateBucketUrl from '@/app/hooks/useCreateBucketUrl';
import ImageUploader from '../upload/ImageUploader';
import GenreSelector from '../upload/GenreSelector';
import AudioPlayer from '../upload/AudioPlayer';
import UnifiedProgressIndicator from '../upload/UnifiedProgressIndicator';
import { useCreatePost } from '@/app/hooks/useCreatePost';
import { useUpdateTrack } from '@/app/hooks/useUpdateTrack';
import { useClientUpdateTrack } from '@/app/hooks/useClientUpdateTrack';
import EditAudioProcessor from './EditAudioProcessor';
import { useEditContext } from '@/app/context/editContext';

// Utility function to ensure document ID is valid
const getValidDocumentId = (data: any): string => {
  if (!data) return '';
  
  // Try to get ID from common ID fields
  const possibleId = data.$id || data.id || data._id || data.documentId || '';
  
  // Ensure the ID is a non-empty string
  if (typeof possibleId !== 'string' || !possibleId.trim()) {
    console.error('Invalid document ID:', possibleId);
    return '';
  }
  
  return possibleId;
};

// Function to ensure track statistics document exists
const ensureTrackStatisticsExist = async (trackId: string) => {
  if (!trackId) return;
  
  try {
    // Check if stats document already exists
    console.log(`Checking if track statistics exist for track ID: ${trackId}`);
    
    try {
      await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        'track_statistics',
        trackId
      );
      console.log(`Track statistics document already exists for ID: ${trackId}`);
      return; // Document exists, nothing more to do
    } catch (error) {
      console.log(`Track statistics document not found, will create new one for ID: ${trackId}`);
      // Document doesn't exist, continue to create it
    }
    
    // Create new statistics document with track ID as document ID
    const statsData = {
      track_id: trackId,
      play_count: "0",
      likes: "0",
      shares: "0",
      last_played: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      'track_statistics',
      trackId, // Use track ID as document ID
      statsData
    );
    
    console.log(`Created track statistics document with ID: ${result.$id}`);
  } catch (error) {
    console.error('Error ensuring track statistics exist:', error);
    // Don't throw - this is non-critical functionality
  }
};

interface EditTrackPopupProps {
  postData: any;
  isOpen: boolean;
    onClose: () => void;
  onUpdate: (data: any) => void;
}

const EditTrackPopup = ({ postData, isOpen, onClose, onUpdate }: EditTrackPopupProps) => {
  const router = useRouter();
  const createPostHook = useCreatePost();
  const { updateTrack } = useUpdateTrack();
  const { updateTrack: clientUpdateTrack, isProcessing: isClientProcessing, processingStage: clientProcessingStage, processingProgress: clientProcessingProgress } = useClientUpdateTrack();
  const { setIsEditMode } = useEditContext();
  
  // Get document ID using the utility function
  const documentId = getValidDocumentId(postData);
  
  // File states
  const [fileAudio, setFileAudio] = useState<File | null>(null);
  const [fileImage, setFileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Audio states
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  // Form states
  const [trackname, setTrackname] = useState('');
  const [genre, setGenre] = useState('');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);
  
  // Client-side processing states
  const [showAudioProcessor, setShowAudioProcessor] = useState<boolean>(false);
  const [clientMp3File, setClientMp3File] = useState<File | null>(null);
  const [clientSegments, setClientSegments] = useState<Array<{name: string, data: Uint8Array, file: File}>>([]);
  const [clientM3u8Content, setClientM3u8Content] = useState<string>('');
  const [clientMp3Duration, setClientMp3Duration] = useState<number>(0);
  
  // Add success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedTrackDetails, setUpdatedTrackDetails] = useState<any>(null);

  // Modal ref for click outside functionality
  const modalRef = useRef<HTMLDivElement>(null);

  // Additional state for mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen && postData) {
      console.log('EditTrackPopup initialized with postData:', postData);
      console.log('postData.$id =', postData.$id);
      setTrackname(postData?.trackname || '');
      setGenre(postData?.genre || '');
      
      // Set image preview from existing image
      if (postData?.image_url) {
        setImagePreview(useCreateBucketUrl(postData.image_url));
      } else {
        setImagePreview(null);
      }
      
      // Load audio preview if available
      if (postData?.audio_url) {
        const audioUrl = useCreateBucketUrl(postData.audio_url);
        if (audioUrl) {
          const audio = new Audio(audioUrl);
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
        }
      }
    }
  }, [isOpen, postData]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isProcessing]);

  // Manage edit mode for bottom panel animation
  useEffect(() => {
    if (isOpen) {
      setIsEditMode(true);
    }
    
    return () => {
      if (isOpen) {
        setIsEditMode(false);
      }
    };
  }, [isOpen, setIsEditMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uploadController) {
        uploadController.abort();
      }
    };
  }, [uploadController]);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Audio player functions
  const handleAudioPlay = async () => {
    if (!audioElement.current) return;
    
    try {
      if (isAudioPlaying) {
        // Проверяем, не на паузе ли уже аудио
        if (!audioElement.current.paused) {
          audioElement.current.pause();
        }
      } else {
        // Проверяем, не воспроизводится ли уже аудио
        if (audioElement.current.paused) {
          const playPromise = audioElement.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        }
      }
      setIsAudioPlaying(!isAudioPlaying);
    } catch (error) {
      console.error('Error playing audio:', error);
      // В случае ошибки сбрасываем состояние воспроизведения
      setIsAudioPlaying(false);
    }
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
      // Reset client processed files
      setClientMp3File(null);
      setClientSegments([]);
      setClientM3u8Content('');
      setClientMp3Duration(0);
      
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
        
        // Start client-side processing
        setShowAudioProcessor(true);
      };

      setFileAudio(file);
      if (!trackname) {
        setTrackname(file.name.replace(/\.[^/.]+$/, ''));
      }
      
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
  };

  const clearImage = () => {
    setFileImage(null);
    setImagePreview(null);
  };

  // Handle audio processing completion
  const handleAudioProcessed = (
    mp3File: File, 
    segments: Array<{name: string, data: Uint8Array, file: File}>, 
    m3u8Content: string, 
    duration: number
  ) => {
    console.log('Audio processing completed:', {
      mp3Size: mp3File.size,
      segmentsCount: segments.length,
      duration
    });
    
    // Store the processed audio data
    setClientMp3File(mp3File);
    setClientSegments(segments);
    setClientM3u8Content(m3u8Content);
    setClientMp3Duration(duration);
    
    // Hide the processor
    setShowAudioProcessor(false);
    
    // Show success toast
    toast.success('Audio successfully processed', {
      style: {
        border: '1px solid #20DDBB',
        padding: '16px',
        color: '#ffffff',
        background: 'linear-gradient(to right, #2A184B, #1f1239)',
        fontSize: '16px',
        borderRadius: '12px'
      },
      icon: '✓'
    });
  };
  
  // Handle audio processing error
  const handleAudioProcessingError = (error: string) => {
    console.error('Audio processing error:', error);
    setShowAudioProcessor(false);
    
    if (error) {
      toast.error(`Audio processing error: ${error}`, {
        style: {
          border: '1px solid #ff4b4b',
          padding: '16px',
          color: '#ffffff',
          background: 'linear-gradient(to right, #2A184B, #1f1239)',
          fontSize: '16px',
          borderRadius: '12px'
        },
        icon: '⚠️'
      });
    }
    
    // Clear audio since processing failed
    clearAudio();
  };

  // Handle cancel upload function
  const handleCancelUpload = () => {
    if (!uploadController) return;
    
    setIsCancelling(true);
    toast.loading('Cancelling update...', { 
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
    
    uploadController.abort();
    
    // Reset states
    setIsProcessing(false);
    setIsCancelling(false);
    setProcessingStage('');
    setProcessingProgress(0);
    
    toast.success('Update cancelled', { 
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

  // Submit function
  const handleSubmit = async () => {
    if (!trackname.trim()) {
      toast.error('Please enter a track name');
      return;
    }

    if (!genre.trim()) {
      toast.error('Please select a genre');
      return;
    }
    
    // Detailed validation for postData
    console.log('Submitting update with postData:', postData);
    
    if (!postData) {
      toast.error('Track data is missing completely');
      return;
    }
    
    if (!documentId) {
      toast.error(`Invalid track data. Missing ID. Type: ${typeof postData}, Keys: ${postData ? Object.keys(postData).join(', ') : 'none'}`);
      return;
    }
    
    console.log('Document ID for update:', documentId);

    try {
      setIsProcessing(true);
      setProcessingStage('Preparing update');
      setProcessingProgress(0);
      
      // Create a toast for progress updates
      const toastId = toast.loading('Starting track update...', {
        style: {
          border: '1px solid #20DDBB',
          padding: '16px',
          color: '#ffffff',
          background: 'linear-gradient(to right, #2A184B, #1f1239)',
          fontSize: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(32, 221, 187, 0.2)'
        },
        icon: '🔄'
      });

      // Create abort controller
      const controller = new AbortController();
      setUploadController(controller);

      // If we have client-processed audio files, use client-side update
      if (fileAudio && clientMp3File && clientSegments.length > 0 && clientM3u8Content) {
        try {
          console.log('Using client-side update with processed audio files');
          
          // Type assertion to make TypeScript happy
          if (!fileAudio) {
            throw new Error('Audio file is null');
          }
          
          // Create update params with proper null handling
          const updateParams = {
            trackId: documentId,
            audio: fileAudio,
            mp3: clientMp3File,
            segments: clientSegments,
            m3u8: clientM3u8Content,
            trackname,
            genre,
            onProgress: (stage: string, progress: number, estimatedTime?: string) => {
              setProcessingStage(stage + (estimatedTime ? ` (${estimatedTime})` : ''));
              setProcessingProgress(progress);
              
              // Update toast message
              toast.loading(`${stage}${estimatedTime ? ` (${estimatedTime})` : ''} - ${progress}%`, { id: toastId });
            }
          };
          
          // Add image only if it's not null
          if (fileImage) {
            Object.assign(updateParams, { image: fileImage });
          }
          
          const result = await clientUpdateTrack(updateParams);
          
          if (result.success) {
            console.log('Client-side track update successful');
            toast.success('Track updated successfully!', { id: toastId });
            
            // Show success modal
            setUpdatedTrackDetails({
              id: documentId,
              trackname,
              genre,
            });
            setShowSuccessModal(true);
            
            // Call onUpdate with updated data
            onUpdate({
              trackname,
              genre,
              image_url: fileImage ? 'updated' : postData.image_url,
              audio_url: fileAudio ? 'updated' : postData.audio_url,
            });
          } else {
            console.error('Client-side track update failed:', result.error);
            toast.error(`Update failed: ${result.error}`, { id: toastId });
          }
          
          setIsProcessing(false);
          return;
        } catch (error) {
          console.error('Error during client-side track update:', error);
          toast.error(`Update error: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
          setIsProcessing(false);
          return;
        }
      }
      // If audio file is provided but not processed, notify user
      else if (fileAudio) {
        // Show guidance message
        console.error('Audio file not processed before upload attempt');
        
        toast.error('Audio processing is required before updating', { id: toastId });
        toast.success('Start audio processing now', {
          id: 'process-toast',
          duration: 5000,
          style: {
            border: '1px solid #20DDBB',
            padding: '16px',
            color: '#ffffff',
            background: 'linear-gradient(to right, #2A184B, #1f1239)',
            fontSize: '16px',
            borderRadius: '12px'
          },
        });
        
        // Reset processing states
        setIsProcessing(false);
        
        // Start audio processing
        setShowAudioProcessor(true);
        
        return;
      } else {
        // Simple update without audio
        const updateData: Record<string, any> = {
          trackname,
          genre
        };
        
        // Upload image if provided
        if (fileImage) {
          setProcessingStage('Updating cover image');
          setProcessingProgress(50);
          
          // Delete old image if it exists
          if (postData.image_url) {
            try {
              await storage.deleteFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                postData.image_url
              );
            } catch (error) {
              console.warn('Failed to delete old image file:', error);
            }
          }

          // Upload new image
          const result = await storage.createFile(
            process.env.NEXT_PUBLIC_BUCKET_ID!,
            ID.unique(),
            fileImage
          );
          updateData.image_url = result.$id;
        }
        
        // Update database
        setProcessingStage('Updating track information');
        setProcessingProgress(90);
        
        try {
          console.log('Updating document:', {
            databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
            collectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_POST,
            documentId: documentId,
            data: updateData
          });
          
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
            documentId,
            updateData
          );
          
          // Ensure track statistics document exists
          await ensureTrackStatisticsExist(documentId);
          
          // Call onUpdate with the updated data
          onUpdate(updateData);
          
          setProcessingStage('Update complete');
          setProcessingProgress(100);
          toast.success('Track information updated successfully!', { id: toastId });
          
          // Show success modal
          setUpdatedTrackDetails({
            trackname,
            genre,
            image_url: updateData.image_url || postData.image_url
          });
          setShowSuccessModal(true);
          
          // Dismiss the toast notification
          toast.dismiss(toastId);
          
        } catch (dbError) {
          console.error('Database update error:', dbError);
          toast.error(`Database update failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
          throw dbError;
        }
      }
      
    } catch (error) {
      console.error('Error updating track:', error);
      toast.error('Failed to update track');
    } finally {
      setIsProcessing(false);
      setUploadController(null);
    }
  };

  // Handle success modal close
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setIsEditMode(false); // Ensure bottom panel animation is restored
    router.refresh();
  };

  // Update the onClose handler
  const handleClose = () => {
    if (isProcessing) return;
    
    setIsEditMode(false); // Ensure bottom panel animation is restored
    onClose();
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
            className="fixed inset-0 z-[999999] overflow-y-auto bg-black/80 backdrop-blur-md touch-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              className="flex items-center justify-center w-full p-0 sm:p-4 md:p-8" 
              style={{ paddingTop: '70px', paddingBottom: '70px' }}
            >
              <motion.div
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#2A184B] to-[#1f1239] rounded-xl sm:rounded-2xl shadow-xl border border-[#20DDBB]/20 w-full sm:max-w-4xl overflow-hidden shadow-[0_0_30px_rgba(32,221,187,0.2)] my-auto"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
                initial={isMobile ? { y: "100%", opacity: 1 } : { scale: 0.9, y: 20, opacity: 0 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
                exit={isMobile ? { y: "100%", opacity: 1 } : { scale: 0.95, y: -10, opacity: 0 }}
                transition={{ 
                  duration: 0.4, 
                  type: 'spring', 
                  damping: 25, 
                  stiffness: 300 
                }}
              >
                {/* Handle bar for mobile swipe gestures */}
                {isMobile && (
                  <div className="absolute top-2 left-0 right-0 flex justify-center">
                    <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                  </div>
                )}
                
                {/* Modal content */}
                <div className={`sticky top-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-[#2A184B]/95 backdrop-blur-md z-[999999] ${isMobile ? 'mt-3' : ''}`}>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                    Edit Track
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClose}
                    className="p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    disabled={isProcessing}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-[#20DDBB]/20 scrollbar-track-transparent" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                      {/* Left column - Audio upload and player */}
                      <div className="space-y-4 sm:space-y-6">
                        {fileAudio ? (
                          <div className="w-full rounded-xl sm:rounded-2xl 
                                        bg-gradient-to-br from-[#2A184B] to-[#1f1239]
                                        border border-white/5 shadow-lg
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
                              className="w-full aspect-square rounded-xl sm:rounded-2xl
                                        bg-gradient-to-br from-[#2A184B] to-[#1f1239]
                                        border border-white/10 shadow-lg
                                        flex flex-col items-center justify-center
                                        cursor-pointer transition-all duration-300
                                        hover:bg-white/5 relative overflow-hidden group"
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
                              
                              <div className="text-center p-4 sm:p-6 z-10">
                                <motion.div 
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#20DDBB]/20 to-[#018CFD]/20 
                                            flex items-center justify-center mx-auto mb-4 sm:mb-6"
                                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(32,221,187,0.3)' }}
                                >
                                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                </motion.div>
                                <p className="text-[#20DDBB] text-base sm:text-lg font-medium mb-1 sm:mb-2">Change audio track</p>
                                <p className="text-white/60 text-xs sm:text-sm mb-4 sm:mb-6">WAV format, up to 12 minutes</p>
                            </div>
                              
                              {/* Shimmer effect on hover */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer opacity-0 group-hover:opacity-100" />
                            </motion.label>
                          )}

                          {/* Track name input and Artist name */}
                          <div className="grid grid-cols-1 gap-4 mt-4 sm:mt-6">
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
                        </div>
                      </div>

                      {/* Right column - Image upload and genre selection */}
                          <div className="space-y-4 sm:space-y-6">
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
                  </div>
              </div>

              {/* Fixed bottom action bar with buttons */}
              <div className="sticky bottom-0 left-0 right-0 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#2A184B]/95 to-[#1f1239]/95 backdrop-blur-md border-t border-white/10 shadow-lg shadow-[#20DDBB]/5 flex justify-end z-[999999]">
                <div className="flex space-x-3 sm:space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm sm:text-base">Cancel</span>
                  </motion.button>
                  <motion.button
                    onClick={isProcessing ? handleCancelUpload : handleSubmit}
                    disabled={(!trackname || !genre) && !isProcessing}
                    className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base
                            transition-all duration-300 transform flex items-center gap-2 shadow-lg
                            ${(!trackname || !genre) && !isProcessing
                                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                : isProcessing 
                                  ? 'bg-gradient-to-r from-[#0047AB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#018CFD]/20'
                                  : 'bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#20DDBB]/20'
                            }`}
                    animate={trackname && genre && !isProcessing ? {
                      boxShadow: ['0 0 0 rgba(32,221,187,0.3)', '0 0 15px rgba(32,221,187,0.6)', '0 0 0 rgba(32,221,187,0.3)'],
                    } : undefined}
                    transition={{
                      boxShadow: {
                        duration: 2,
                        repeat: trackname && genre && !isProcessing ? Infinity : 0,
                        repeatType: 'loop'
                      },
                      scale: {
                        type: 'spring',
                        damping: 25,
                        stiffness: 300
                      }
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Cancel Update</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

                {/* Processing indicator overlay */}
                <AnimatePresence>
                  {isProcessing && (
                    <UnifiedProgressIndicator
                      isActive={true}
                      stage={processingStage}
                      progress={processingProgress}
                      onCancel={handleCancelUpload}
                    />
                  )}
                </AnimatePresence>
          </motion.div>
            </div>
        </motion.div>
      )}
      </AnimatePresence>
      
      {/* Audio processor component */}
      {showAudioProcessor && fileAudio && (
        <EditAudioProcessor 
          audioFile={fileAudio}
          trackId={documentId}
          onProcessed={handleAudioProcessed}
          onError={handleAudioProcessingError}
        />
      )}
      
      {/* Success modal */}
      <AnimatePresence>
        {showSuccessModal && updatedTrackDetails && (
          <motion.div
            className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-8 rounded-2xl shadow-2xl border border-[#20DDBB]/20 w-full max-w-md relative"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-[#20DDBB]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Track Updated!</h3>
                <p className="text-white/70">Your track has been successfully updated.</p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={handleSuccessModalClose}
                  className="px-6 py-3 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
                >
                  Refresh to update release
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
    );
};

export default EditTrackPopup;
