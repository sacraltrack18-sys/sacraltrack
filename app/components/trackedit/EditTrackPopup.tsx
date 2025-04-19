"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  
  // Add success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedTrackDetails, setUpdatedTrackDetails] = useState<any>(null);

  // Modal ref for click outside functionality
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uploadController) {
        uploadController.abort();
      }
    };
  }, [uploadController]);

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

      // If audio file is provided, we need to process it with server API
      if (fileAudio) {
        setProcessingStage('Processing updated audio');
        toast.loading('Processing updated audio...', { id: toastId });
        
        // Create FormData for audio processing
        const formData = new FormData();
        formData.append('audio', fileAudio);
        formData.append('trackId', documentId);
        formData.append('action', 'update');
        
        // Define timeoutId in this scope so it's accessible in the catch block
        let timeoutId: NodeJS.Timeout | undefined;
        
        try {
          // Send audio for server-side processing
          console.log('Sending audio upload to server for processing...');
          const response = await fetch('/api/audio/process', {
            method: 'POST',
            body: formData,
          });
          
          console.log('Server response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            
            // Формируем понятное сообщение об ошибке в зависимости от кода статуса
            let errorMessage = `Server error: ${response.status}`;
            
            if (response.status === 500) {
              // Для 500 ошибок даем более подробное пояснение
              errorMessage = 'The server encountered an error while processing your audio. Please try a different audio file or contact support.';
              console.error('Server 500 error. Full response:', errorText);
              
              // Логируем в консоль всю доступную информацию
              console.error('Upload 500 error details:', {
                status: response.status,
                statusText: response.statusText,
                responseText: errorText.substring(0, 500) + (errorText.length > 500 ? '...' : ''),
                trackId: documentId,
                audioFileName: fileAudio.name,
                audioFileSize: fileAudio.size,
                audioFileType: fileAudio.type
              });
            } else if (response.status === 413) {
              // Для ошибки слишком большого файла
              errorMessage = 'The audio file is too large. Please try a smaller file.';
            } else if (response.status === 422) {
              // Для ошибок валидации
              errorMessage = 'There was a problem with the audio file format. Please ensure it is a valid WAV file.';
            } else {
              // Для других ошибок пытаемся извлечь сообщение из JSON, если возможно
              try {
                const errorResponse = JSON.parse(errorText);
                errorMessage = errorResponse.error || errorResponse.message || errorMessage;
              } catch (parseError) {
                // Если не удалось распарсить JSON, используем текст ответа
                errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100)}`;
              }
            }
                  
            toast.error(errorMessage, { id: toastId });
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
          
          if (!response.body) {
            console.error('Server response has no body');
            toast.error('Server response has no body', { id: toastId });
            throw new Error('Server response has no body');
          }
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let receivedAnyData = false;
          
          // Start processing stage
          setProcessingStage('Checking updated audio duration');
          setProcessingProgress(5);
          
          console.log('Starting to read response stream...');
          
          // Initialize timeout to handle stalled uploads
          timeoutId = setTimeout(() => {
            console.error('Audio processing timeout after 60 seconds of inactivity');
            toast.error('Audio processing timed out. Please try again or use a different audio file.', { id: toastId });
            reader.cancel('Timeout after 60 seconds of inactivity');
          }, 60000); // 60 second timeout
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              // Clear and reset timeout on any data received
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                  console.error('Audio processing timeout after 60 seconds of inactivity');
                  toast.error('Audio processing timed out. Please try again.', { id: toastId });
                  reader.cancel('Timeout after 60 seconds of inactivity');
                }, 60000);
              }
              
              if (done) {
                console.log('Reader done');
                break;
              }
              
              receivedAnyData = true;
              const chunk = decoder.decode(value, { stream: true });
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
                
                if (dataEnd === -1) break; // Incomplete message
                
                const jsonStr = buffer.substring(dataStart, dataEnd);
                try {
                  const jsonData = JSON.parse(jsonStr);
                  messages.push(jsonData);
                  startIdx = dataEnd + 2;
                } catch (e) {
                  console.error('Error parsing JSON in SSE:', e);
                  console.log('Problematic JSON string:', jsonStr);
                  startIdx = dataEnd + 2; // Skip this message
                }
              }
              
              // Remove processed messages from buffer
              if (startIdx > 0) {
                buffer = buffer.substring(startIdx);
              }
              
              // Process all extracted messages
              for (const update of messages) {
                console.log('Received SSE update type:', update.type);
                
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
                  
                  toast.error(`Error: ${errorMessage}`, { id: toastId });
                  
                  // Сбрасываем состояния обработки
                  setIsProcessing(false);
                  
                  // Внимание! Здесь мы хотим выйти из функции, но не можем просто использовать return,
                  // так как мы внутри цикла. Лучший способ - это выбросить ошибку и поймать ее выше.
                  throw new Error(errorMessage);
                }
                
                // Обработка событий прогресса
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
                  
                  // If this is segmenting stage, add details to stage name
                  // and update progress value based on actual segment progress
                  if (update.stage.includes('segment') && details?.segmentProgress) {
                    const segmentCount = details?.totalSegments || 42; // Use total segments from details or default to 42
                    const currentSegment = Math.floor((details.segmentProgress / 100) * segmentCount);
                    
                    // Update stage name with segment information
                    setProcessingStage(`${displayStage} ${currentSegment}/${segmentCount}`);
                    
                    // Important: update progress value, so progress bar doesn't "hang" in one place
                    setProcessingProgress(details.segmentProgress);
                  }
                }
                
                // Обработка результата обработки
                if (update.type === 'result') {
                  console.log('Processing completed successfully:', update);
                  
                  // If we have the result data, use it to update state
                  if (update.data) {
                    // Extract any important data from the result
                    const resultData = update.data;
                    
                    // If we received a document ID, store it
                    if (resultData.documentId) {
                      console.log('Received document ID:', resultData.documentId);
                      // Store document ID to state if needed
                    }
                    
                    // If we received URLs, handle them
                    if (resultData.m3u8Url) {
                      console.log('Received m3u8 URL:', resultData.m3u8Url);
                    }
                  }
                  
                  // Final stage
                  setProcessingStage('Complete');
                  setProcessingProgress(100);
                }
              }
            }
            
            // ... существующий код ...
            
          } catch (error) {
            // Убираем таймаут, если есть
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }
            
            // Если не получили никаких данных, это может быть серверная ошибка
            if (!receivedAnyData) {
              console.error('No data received from server during audio processing');
              toast.error('No data received from server. Please try again with a different audio file.', { id: toastId });
            } else {
              console.error('Error processing server events:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              toast.error(`Error processing audio: ${errorMessage}`, { id: toastId });
            }
            
            // Отменяем чтение, если ошибка не связана с отменой
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              reader.cancel('Error during processing');
            }
            
            throw error; // Пробрасываем ошибку дальше
          }
          
          // ... existing code after successful processing ...
          
        } catch (error) {
          // Убираем таймаут, если он был установлен
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          console.error('Error during track update:', error);
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error during track update';
            
          toast.error(errorMessage, { id: toastId });
          setIsProcessing(false);
          return false; // Return unsuccessful update
        }
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex min-h-screen items-center justify-center px-4 py-8">
              <motion.div
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#2A184B] to-[#1f1239] rounded-2xl shadow-xl border border-[#20DDBB]/20 w-full max-w-4xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, type: 'spring' }}
              >
                {/* Modal content */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                    Edit Track
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    disabled={isProcessing}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left column - Audio upload and player */}
                    <div className="space-y-6">
                      {fileAudio ? (
                        <div className="w-full rounded-2xl 
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
                          className="w-full aspect-square rounded-2xl 
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
                            <p className="text-[#20DDBB] text-lg font-medium mb-2">Change audio track</p>
                            <p className="text-white/60 text-sm mb-6">WAV format, up to 12 minutes</p>
                        </div>
                          
                          {/* Shimmer effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer opacity-0 group-hover:opacity-100" />
                        </motion.label>
                      )}

                      {/* Track name input and Artist name */}
                      <div className="grid grid-cols-1 gap-4 mt-6">
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

                  {/* Update button */}
                  <div className="mt-12 flex justify-end">
                    <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                        className="px-6 py-3 rounded-xl text-white hover:bg-white/10 transition-colors"
                        disabled={isProcessing}
                                >
                                    Cancel
                  </motion.button>
                  <motion.button
                        onClick={isProcessing ? handleCancelUpload : handleSubmit}
                        disabled={(!trackname || !genre) && !isProcessing}
                        className={`px-10 py-4 rounded-xl font-medium text-lg
                                transition-all duration-300 transform
                                ${(!trackname || !genre) && !isProcessing
                                    ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                    : isProcessing 
                                      ? 'bg-gradient-to-r from-[#0047AB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#018CFD]/20'
                                      : 'bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-[#20DDBB]/20'
                                }`}
                      >
                        {isProcessing ? 'Cancel Update' : 'Update Track'}
                  </motion.button>
                    </div>
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
      
      {/* Success modal */}
      <AnimatePresence>
        {showSuccessModal && updatedTrackDetails && (
          <motion.div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
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
              
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-3 bg-transparent border border-white/20 hover:border-white/40 text-white rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (updatedTrackDetails?.id) {
                      router.push(`/post/${updatedTrackDetails.id}`);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
                >
                  View Track
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
