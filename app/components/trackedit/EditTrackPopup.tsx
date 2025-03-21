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
import UploadProgress from '../upload/UploadProgress';
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
      const toastId = toast.loading('Starting update...', {
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

      // Create abort controller
      const controller = new AbortController();
      setUploadController(controller);

      // If audio file is provided, we need to process it with server API
      if (fileAudio) {
        setProcessingStage('Processing audio');
        toast.loading('Processing audio...', { id: toastId });
        
        // Create FormData for audio processing
        const formData = new FormData();
        formData.append('audio', fileAudio);
        formData.append('trackId', documentId);
        formData.append('action', 'update');
        
        try {
          // Send audio for server-side processing
          const response = await fetch('/api/audio/process', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          if (!response.ok) {
            throw new Error('Audio processing failed');
          }
          
          // Handle the processing response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) throw new Error('Could not create reader');
          
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
              
              if (dataEnd === -1) break; // Incomplete message
              
              const jsonStr = buffer.substring(dataStart, dataEnd);
              
              try {
                const jsonData = JSON.parse(jsonStr);
                messages.push(jsonData);
                startIdx = dataEnd + 2;
              } catch (e) {
                console.error('Error parsing JSON in SSE:', e);
                startIdx = dataEnd + 2;
              }
            }
            
            // Remove processed messages from buffer
            if (startIdx > 0) {
              buffer = buffer.substring(startIdx);
            }
            
            // Process all extracted messages
            for (const update of messages) {
              if (update.type === 'progress') {
                // Map server stages to UI stages
                let displayStage = update.stage;
                if (update.stage.includes('convert')) {
                  displayStage = 'Converting to MP3';
                } else if (update.stage.includes('segment')) {
                  displayStage = 'Segmenting audio';
                } else if (update.stage.includes('Preparing segment')) {
                  displayStage = 'Preparing segments';
                } else if (update.stage.includes('playlist')) {
                  displayStage = 'Creating playlist';
                }
                
                setProcessingStage(displayStage);
                setProcessingProgress(update.progress);
                toast.loading(`${displayStage}: ${Math.round(update.progress)}%`, { id: toastId });
              } else if (update.type === 'complete') {
                // Processing complete
                setProcessingStage('Processing complete');
                setProcessingProgress(100);
                toast.success('Audio processing completed!', { id: toastId });
                
                // Prepare to upload to Appwrite
                setProcessingStage('Uploading to storage');
                setProcessingProgress(0);
                
                const result = update.result;
                
                // Convert MP3 file from data URL
                const mp3Blob = await fetch(result.mp3File).then(r => r.blob());
                const mp3File = new File([mp3Blob], 'audio.mp3', { type: 'audio/mp3' });
                
                // Upload segments and create playlist
                const segmentIds = [];
                const totalSegments = result.segments.length;
                
                setProcessingStage('Uploading segments');
                
                // Remove old segments if they exist
                if (postData.segments) {
                  try {
                    const oldSegmentIds = JSON.parse(postData.segments);
                    setProcessingStage('Removing old segments');
                    
                    for (let i = 0; i < oldSegmentIds.length; i++) {
                      try {
                        await storage.deleteFile(
                          process.env.NEXT_PUBLIC_BUCKET_ID!,
                          oldSegmentIds[i]
                        );
                      } catch (error) {
                        console.warn(`Failed to delete old segment ${oldSegmentIds[i]}:`, error);
                      }
                      
                      const progress = Math.round((i + 1) / oldSegmentIds.length * 100);
                      setProcessingProgress(progress);
                    }
                  } catch (error) {
                    console.warn('Failed to parse or remove old segments:', error);
                  }
                }
                
                setProcessingStage('Uploading new segments');
                setProcessingProgress(0);
                
                for (let i = 0; i < totalSegments; i++) {
                  const segment = result.segments[i];
                  
                  // Convert base64 to Blob
                  const segmentBlob = await fetch(`data:audio/mp3;base64,${segment.data}`).then(r => r.blob());
                  const segmentFile = new File([segmentBlob], segment.name, { type: 'audio/mp3' });
                  
                  // Upload segment
                  const segmentUploadResult = await storage.createFile(
                    process.env.NEXT_PUBLIC_BUCKET_ID!,
                    ID.unique(),
                    segmentFile
                  );
                  const segmentId = segmentUploadResult.$id;
                  
                  segmentIds.push(segmentId);
                  
                  // Update progress
                  const progress = Math.round((i + 1) / totalSegments * 100);
                  setProcessingProgress(progress);
                  toast.loading(`Uploading segments: ${progress}%`, { id: toastId });
                }
                
                // Create M3U8 playlist from segment IDs
                setProcessingStage('Creating playlist');
                setProcessingProgress(0);
                
                let m3u8Content = result.m3u8Template;
                
                // Replace placeholders with actual segment IDs
                for (let i = 0; i < segmentIds.length; i++) {
                  const segmentId = segmentIds[i];
                  const placeholder = `SEGMENT_PLACEHOLDER_${i}`;
                  m3u8Content = m3u8Content.replace(placeholder, segmentId);
                }
                
                // Create M3U8 file
                const m3u8File = new File([m3u8Content], 'playlist.m3u8', { type: 'application/vnd.apple.mpegurl' });
                
                // Upload audio files to Appwrite
                setProcessingStage('Uploading files');
                setProcessingProgress(0);
                
                // If old audio files exist, delete them
                if (postData.audio_url) {
                  try {
                    await storage.deleteFile(
                      process.env.NEXT_PUBLIC_BUCKET_ID!,
                      postData.audio_url
                    );
                  } catch (error) {
                    console.warn('Failed to delete old audio file:', error);
                  }
                }
                
                if (postData.mp3_url) {
                  try {
                    await storage.deleteFile(
                      process.env.NEXT_PUBLIC_BUCKET_ID!,
                      postData.mp3_url
                    );
                  } catch (error) {
                    console.warn('Failed to delete old MP3 file:', error);
                  }
                }
                
                if (postData.m3u8_url) {
                  try {
                    await storage.deleteFile(
                      process.env.NEXT_PUBLIC_BUCKET_ID!,
                      postData.m3u8_url
                    );
                  } catch (error) {
                    console.warn('Failed to delete old M3U8 file:', error);
                  }
                }
                
                // Upload MP3
                const mp3Result = await storage.createFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  ID.unique(),
                  mp3File
                );
                const mp3Id = mp3Result.$id;
                setProcessingProgress(33);
                
                // Upload M3U8
                const m3u8Result = await storage.createFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  ID.unique(),
                  m3u8File
                );
                const m3u8Id = m3u8Result.$id;
                setProcessingProgress(66);
                
                // Upload original audio
                const audioResult = await storage.createFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  ID.unique(),
                  fileAudio
                );
                const audioId = audioResult.$id;
                setProcessingProgress(100);
                
                // Update database with new audio files
                try {
                  console.log('Updating document:', {
                    databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
                    collectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_POST,
                    documentId: documentId,
                    data: {
                      audio_url: audioId,
                      mp3_url: mp3Id,
                      m3u8_url: m3u8Id,
                      segments: JSON.stringify(segmentIds),
                      trackname,
                      genre
                    }
                  });
                  
                  await database.updateDocument(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_POST!,
                    documentId,
                    {
                      audio_url: audioId,
                      mp3_url: mp3Id,
                      m3u8_url: m3u8Id,
                      segments: JSON.stringify(segmentIds),
                      trackname,
                      genre
                    }
                  );
                  
                  // Call onUpdate with the updated data
                  onUpdate({
                    audio_url: audioId,
                    mp3_url: mp3Id,
                    m3u8_url: m3u8Id,
                    segments: JSON.stringify(segmentIds),
                    trackname,
                    genre
                  });
                  
                  // Show success modal
                  setUpdatedTrackDetails({
                    trackname,
                    genre,
                    image_url: postData.image_url
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
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            // Upload was cancelled by user
            return;
          }
          
          console.error('Error processing audio:', error);
          toast.error('Failed to process audio', { id: toastId });
          setIsProcessing(false);
          setUploadController(null);
          return;
        }
      } else {
        // Simple update without audio file
        const updateData: Record<string, any> = {
          trackname,
          genre
        };
        
        // Upload image if provided
        if (fileImage) {
          setProcessingStage('Uploading image');
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
        setProcessingStage('Updating track');
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
          
          // Call onUpdate with the updated data
          onUpdate(updateData);
          
          setProcessingStage('Update complete');
          setProcessingProgress(100);
          toast.success('Track updated successfully!', { id: toastId });
          
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          {/* Progress overlay */}
          {isProcessing && (
            <UploadProgress
              progress={processingProgress}
              stage={processingStage}
              isUploading={isProcessing}
            />
          )}
          
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-b from-[#1f1239] to-[#150c28] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
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
          </motion.div>
        </motion.div>
      )}
      
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 15,
                stiffness: 300, 
                duration: 0.4 
              }}
              className="bg-gradient-to-b from-[#1f1239] to-[#150c28] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#20DDBB]/30"
            >
              {/* Success animation */}
              <div className="relative pt-12 pb-8 px-8 flex flex-col items-center">
                {/* Background glow effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#20DDBB]/10 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#018CFD]/10 rounded-full blur-3xl"></div>
                </div>
                
                {/* Success checkmark */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    delay: 0.2,
                    damping: 10,
                    stiffness: 200 
                  }}
                  className="w-24 h-24 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] flex items-center justify-center mb-6 relative"
                >
                  <motion.svg 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="w-12 h-12 text-white" 
                    viewBox="0 0 24 24"
                  >
                    <motion.path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                  
                  {/* Animated particles around checkmark */}
                  <div className="absolute inset-0">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{ 
                          scale: [0, 1, 0],
                          x: [0, Math.cos(i * (Math.PI * 2 / 12)) * 50],
                          y: [0, Math.sin(i * (Math.PI * 2 / 12)) * 50],
                        }}
                        transition={{
                          delay: 0.6 + (i * 0.05),
                          duration: 1.5,
                          repeat: 0,
                          ease: "easeOut"
                        }}
                        className="absolute w-2 h-2 rounded-full bg-white/80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    ))}
                  </div>
                </motion.div>
                
                {/* Success message */}
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#20DDBB] to-[#018CFD] mb-3 text-center"
                >
                  Track Successfully Updated!
                </motion.h2>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-white/80 text-center"
                >
                  <p className="mb-2">Your track has been updated and changes will be reflected in your account soon.</p>
                  <p className="text-sm text-white/60">Audio processing takes a little time, usually not more than a few minutes.</p>
                </motion.div>
                
                {/* Track info */}
                {updatedTrackDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-6 w-full p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-[#20DDBB]/10 mr-3">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Track cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#20DDBB]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{trackname}</h3>
                        <p className="text-white/60 text-sm">{genre}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="mt-8 flex gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowSuccessModal(false);
                      onClose();
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white font-medium"
                  >
                    Awesome!
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
    );
};

export default EditTrackPopup;
