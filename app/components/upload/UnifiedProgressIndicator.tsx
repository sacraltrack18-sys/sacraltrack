import React from 'react';
import { motion } from 'framer-motion';

interface UnifiedProgressIndicatorProps {
  isActive: boolean;
  stage: string;
  progress: number;
  estimatedTime?: string;
  onCancel: () => void;
}

const UnifiedProgressIndicator: React.FC<UnifiedProgressIndicatorProps> = ({
  isActive,
  stage,
  progress,
  estimatedTime,
  onCancel
}) => {
  // Format stage text to be more user-friendly
  const getStageText = (stage: string): string => {
    // Remove any Russian text and use English equivalents
    if (stage.includes('Подготовка')) return 'Preparing files...';
    if (stage.includes('Загрузка обложки')) return 'Uploading cover image...';
    if (stage.includes('Загрузка аудиофайла')) return 'Uploading audio file...';
    if (stage.includes('Завершение загрузки')) return 'Finalizing upload...';
    if (stage.includes('Инициализация')) return 'Initializing audio processing...';
    if (stage.includes('Загрузка WAV')) return 'Processing WAV file...';
    if (stage.includes('Конвертация') || stage.includes('конвертация')) return 'Converting WAV to MP3...';
    if (stage.includes('Сегментация') || stage.includes('сегментация')) return 'Segmenting audio for HLS...';
    if (stage.includes('Загрузка MP3')) return 'Uploading MP3 file...';
    if (stage.includes('Загрузка сегментов')) return 'Uploading audio segments...';
    if (stage.includes('Плейлист')) return 'Creating HLS playlist...';
    if (stage.includes('Обновление данных')) return 'Finalizing release data...';
    if (stage.includes('Завершена') || stage.includes('Обработка успешно завершена')) return 'Processing complete!';
    if (stage.includes('No processing information')) return 'Connecting to processing server...';
    
    // If no match, return the original stage
    return stage;
  };

  // Изменим проверку на ошибку, исключим "No processing information found"
  const isError = stage.includes('Error') || stage.includes('Failed');

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="bg-gradient-to-br from-[#2A184B] to-[#1f1239] p-8 rounded-2xl shadow-2xl border border-[#20DDBB]/20 w-full max-w-md relative"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        {/* Close button (X) in top right corner */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/30 transition-colors"
          aria-label="Cancel upload"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Pulsing animated background elements */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-30 -z-10">
          <motion.div 
            className="absolute h-40 w-40 rounded-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] blur-3xl"
            animate={{ 
              x: ['-20%', '120%'],
              y: ['30%', '60%'],
            }} 
            transition={{ 
              duration: 8,
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
              duration: 10,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: "easeInOut"
            }}
          />
        </div>
        
        {/* Header with animated icon */}
        <div className="flex items-center justify-center mb-6">
          <motion.div 
            className="w-16 h-16 rounded-full bg-gradient-to-br from-[#20DDBB]/20 to-[#018CFD]/20 
                      flex items-center justify-center mr-3"
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 0 0 0 rgba(32,221,187,0)",
                "0 0 0 10px rgba(32,221,187,0.2)",
                "0 0 0 0 rgba(32,221,187,0)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg className="w-8 h-8 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                animate={{ pathLength: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white">Processing Your Track</h3>
            <p className="text-white/60 text-sm">Please wait while we prepare your release</p>
          </div>
        </div>
        
        {/* Current stage */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className={`text-white font-medium ${isError ? 'flex items-center' : ''}`}>
              {isError && (
                <span className="w-5 h-5 mr-2 inline-flex items-center justify-center rounded-full bg-amber-500/20 flex-shrink-0">
                  <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
              )}
              {getStageText(stage)}
            </p>
            <span className="text-[#20DDBB] font-mono bg-[#20DDBB]/10 px-2 py-0.5 rounded">
              {progress}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${isError ? 'bg-amber-500' : 'bg-gradient-to-r from-[#20DDBB] to-[#018CFD]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Estimated time */}
          {!isError && estimatedTime && (
            <p className="text-white/50 text-xs mt-2 text-right">
              Estimated time remaining: {estimatedTime}
            </p>
          )}
          
          {/* Error message с подсказкой для повторной попытки - только для реальных ошибок */}
          {isError && (
            <p className="text-amber-500/80 text-xs mt-2 italic">
              If this persists, click the X and try uploading again
            </p>
          )}
        </div>
        
        {/* Processing steps */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-white/80">Processing Steps:</h4>
          
          <div className="space-y-2 text-sm">
            <ProcessingStep 
              text="Converting WAV to MP3" 
              isActive={stage.includes('Конвертация') || stage.includes('конвертация') || stage.includes('Connect') || progress <= 60}
              isDone={progress > 60}
            />
            <ProcessingStep 
              text="Segmenting audio for HLS streaming" 
              isActive={(stage.includes('Сегментация') || stage.includes('сегментация')) && progress > 60}
              isDone={progress > 70}
            />
            <ProcessingStep 
              text="Uploading audio segments" 
              isActive={stage.includes('Загрузка сегментов') && progress > 70}
              isDone={progress > 80}
            />
            <ProcessingStep 
              text="Creating HLS playlist" 
              isActive={stage.includes('Плейлист') && progress > 80}
              isDone={progress > 90}
            />
            <ProcessingStep 
              text="Finalizing release" 
              isActive={(stage.includes('Обновление данных') || stage.includes('Завершение')) && progress > 90}
              isDone={progress >= 100}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper component for each processing step
const ProcessingStep = ({ text, isActive, isDone }: { text: string, isActive: boolean, isDone: boolean }) => {
  return (
    <div className="flex items-center">
      {isDone ? (
        <div className="w-5 h-5 rounded-full bg-[#20DDBB]/20 flex items-center justify-center mr-2">
          <svg className="w-3 h-3 text-[#20DDBB]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : isActive ? (
        <motion.div 
          className="w-5 h-5 rounded-full bg-[#20DDBB]/20 flex items-center justify-center mr-2"
          animate={{ 
            scale: [1, 1.2, 1],
            boxShadow: [
              "0 0 0 0 rgba(32,221,187,0)",
              "0 0 0 4px rgba(32,221,187,0.2)",
              "0 0 0 0 rgba(32,221,187,0)"
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div 
            className="w-2 h-2 bg-[#20DDBB] rounded-full"
            animate={{ scale: [1, 0.8, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mr-2" />
      )}
      <span className={isActive ? "text-white" : isDone ? "text-white/70" : "text-white/40"}>
        {text}
      </span>
    </div>
  );
};

export default UnifiedProgressIndicator; 