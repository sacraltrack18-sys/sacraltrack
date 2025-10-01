import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ProgressStage = 'uploading' | 'compressing' | 'segmenting' | 'completed' | 'idle';

interface ProgressAudioProps {
  isVisible: boolean;
  stage: ProgressStage;
  progress: number;
  timeRemaining?: string;
  onCancel: () => void;
  confirmCancelText?: string;
}

const stageMessages = {
  uploading: 'Uploading audio file...',
  compressing: 'Converting audio to MP3 format...',
  segmenting: 'Segmenting audio for streaming...',
  completed: 'Processing completed successfully!',
  idle: ''
};

const ProgressAudio: React.FC<ProgressAudioProps> = ({
  isVisible,
  stage,
  progress,
  timeRemaining,
  onCancel,
  confirmCancelText = 'Are you sure you want to cancel? All upload progress will be lost.'
}) => {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  
  const handleCancelClick = () => {
    setShowConfirmCancel(true);
  };
  
  const handleConfirmCancel = () => {
    setShowConfirmCancel(false);
    onCancel();
  };
  
  const handleDismissCancel = () => {
    setShowConfirmCancel(false);
  };
  
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="relative w-[90%] max-w-md bg-gradient-to-br from-purple-900/80 to-gray-900/90 p-6 rounded-xl shadow-2xl border border-purple-500/20"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Кнопка закрытия в правом верхнем углу */}
          <button 
            onClick={stage === 'completed' ? onCancel : handleCancelClick}
            className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center text-purple-300 hover:text-white rounded-full hover:bg-purple-900/50 transition-colors duration-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Header */}
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              {stageMessages[stage]}
            </h3>
            <p className="text-purple-200/80 text-sm">
              {stage !== 'completed' ? 'Please wait while we process your audio' : 'Your audio is ready!'}
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', damping: 15 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-purple-200/70">
              <span>{Math.round(progress)}% complete</span>
              {timeRemaining && stage !== 'completed' && (
                <span>~{timeRemaining} remaining</span>
              )}
            </div>
          </div>
          
          {/* Подробная информация о текущем этапе */}
          <div className="mb-4 text-center">
            {stage === 'uploading' && (
              <p className="text-xs text-purple-200/60">Uploading your WAV file to the server</p>
            )}
            {stage === 'compressing' && (
              <p className="text-xs text-purple-200/60">Converting WAV to MP3 for better playback</p>
            )}
            {stage === 'segmenting' && (
              <p className="text-xs text-purple-200/60">Splitting audio into segments for streaming playback</p>
            )}
          </div>
          
          {/* Действия внизу модального окна */}
          {!showConfirmCancel && stage === 'completed' && (
            <div className="flex justify-center mt-6">
              <button
                onClick={onCancel}
                className="py-2 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200"
              >
                Done
              </button>
            </div>
          )}
          
          {/* Confirmation dialog */}
          {showConfirmCancel && (
            <motion.div
              className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-white text-sm mb-4">{confirmCancelText}</p>
              <div className="flex justify-between gap-3">
                <button
                  onClick={handleDismissCancel}
                  className="flex-1 py-2 px-4 bg-gray-700/50 hover:bg-gray-700 rounded-md text-sm text-white transition-colors duration-200"
                >
                  Continue Upload
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2 px-4 bg-red-600/80 hover:bg-red-600 rounded-md text-sm text-white transition-colors duration-200"
                >
                  Cancel Upload
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Visual elements for style */}
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-purple-200">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          
          {/* Glowing orbs for visual appeal */}
          <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-purple-500/20 blur-xl"></div>
          <div className="absolute -bottom-8 -left-8 w-16 h-16 rounded-full bg-blue-500/20 blur-xl"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressAudio; 