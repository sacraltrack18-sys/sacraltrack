'use client';

import { useState, useEffect } from 'react';
import { useClientAudioProcessor } from '@/app/hooks/useClientAudioProcessor';
import { motion } from 'framer-motion';

interface EditAudioProcessorProps {
  audioFile: File | null;
  trackId: string;
  onProcessed: (mp3File: File, segments: Array<{name: string, data: Uint8Array, file: File}>, m3u8Content: string, duration: number) => void;
  onError: (error: string) => void;
}

const EditAudioProcessor = ({ audioFile, trackId, onProcessed, onError }: EditAudioProcessorProps) => {
  const { processAudio, isProcessing, progress, stage } = useClientAudioProcessor();
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'completed'>('idle');
  const [currentTask, setCurrentTask] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  useEffect(() => {
    if (!audioFile || !trackId) {
      return;
    }

    // Check SharedArrayBuffer support but only log error
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('SharedArrayBuffer is not supported in this browser, but we will try to continue processing');
    }
    
    const handleProcessing = async () => {
      try {
        setStatus('processing');
        
        const result = await processAudio({
          audioFile,
          onProgress: (stage, progress, message) => {
            console.log(`Edit processing: ${stage} - ${progress}% - ${message || ''}`);
            setCurrentTask(message || stage);
          }
        });

        if (result.success && result.mp3File && result.segments && result.m3u8Content && result.duration) {
          setStatus('completed');
          onProcessed(result.mp3File, result.segments, result.m3u8Content, result.duration);
        } else {
          // Log error but don't show to user
          console.error('Edit processing result error:', result.error);
          // Close processor without error message
          onError('');
        }
      } catch (error) {
        console.error('Audio edit processing error:', error);
        onError('');
      }
    };

    handleProcessing();
  }, [audioFile, trackId, processAudio, onProcessed, onError]);

  // Show only processing, ignore errors
  if (status === 'error') {
    return null;
  }

  if (!isProcessing && status !== 'processing') {
    return null;
  }
  
  const handleCancelClick = () => {
    setShowConfirmation(true);
  };
  
  const handleConfirmCancel = () => {
    // Clear audio input field
    const audioInputs = document.querySelectorAll('input[type="file"][accept*="audio"]');
    audioInputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      inputElement.value = '';
    });
    
    // Call onError to close processor
    onError('');
  };
  
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-lg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-br from-[#2A184B]/75 to-[#1f1239]/75 backdrop-blur-2xl p-8 rounded-2xl max-w-lg w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20"
      >
        {/* Decorative gradient elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#20DDBB]/20 blur-2xl z-0"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#018CFD]/20 blur-2xl z-0"></div>
        
        {/* Close button */}
        <button 
          onClick={handleCancelClick} 
          className="absolute top-3 right-3 p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 
                     hover:bg-white/20 hover:text-white transition-all z-10 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="relative z-10">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
              Processing Track Audio
            </h3>
            <p className="text-white/70 text-sm mt-2">
              Your audio is being prepared for streaming. This may take a few moments.
            </p>
          </div>

          <div className="mb-6">
            <p className="text-[#20DDBB] font-medium mb-3 text-center">
              {currentTask || stage || "Preparing audio..."}
            </p>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] shadow-[0_0_10px_rgba(32,221,187,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-right text-white/70 text-sm mt-2 font-medium">{progress}%</p>
          </div>
        </div>
        
        {/* Confirmation modal */}
        {showConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md rounded-2xl z-20"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gradient-to-br from-[#2A184B]/90 to-[#1f1239]/90 p-6 rounded-xl border border-white/20 max-w-xs w-full shadow-[0_10px_25px_rgba(0,0,0,0.3)]"
            >
              <div className="text-center mb-2">
                <svg className="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-white font-bold text-lg mb-2">Cancel Processing?</h4>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  All processed data will be lost and your audio update will be canceled.
                </p>
              </div>
              
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={handleCancelConfirmation}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors shadow-sm backdrop-blur-sm"
                >
                  Continue
                </button>
                <button 
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 bg-gradient-to-r from-red-500/90 to-red-600/90 text-white rounded-lg hover:from-red-500 hover:to-red-600 transition-all shadow-md"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default EditAudioProcessor; 