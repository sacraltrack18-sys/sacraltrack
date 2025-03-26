import React from 'react';
import { motion } from 'framer-motion';

// Add animation keyframes
const shimmerAnimation = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;

interface UploadProgressProps {
  stage: string; 
  progress: number; 
  isUploading: boolean;
  onCancel?: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ 
  isUploading, 
  stage, 
  progress, 
  onCancel 
}) => {
  // The upload stages in order - keep these technical stages for tracking
  const stages = [
    "Uploading WAV",
    "Converting MP3",
    "Segmenting",
    "Preparing",
    "Uploading Segments",
    "Creating Playlist",
    "Main Audio",
    "Cover Image",
    "MP3 Version",
    "Finalizing"
  ];

  // User-friendly stage messages
  const userFriendlyMessages: {[key: string]: string} = {
    "Uploading WAV": "Uploading your track",
    "Converting MP3": "Processing your audio",
    "Segmenting": "Optimizing playback",
    "Preparing": "Preparing your track",
    "Uploading Segments": "Uploading track parts",
    "Creating Playlist": "Creating track playlist",
    "Main Audio": "Uploading main audio",
    "Cover Image": "Uploading cover image",
    "MP3 Version": "Creating streamable version",
    "Finalizing": "Almost done!"
  };

  // Extract detailed information from stage name
  const getDetailedInfo = () => {
    if (!stage) return '';

    // Извлекаем информацию о сегментах
    if (stage.toLowerCase().includes('segment')) {
      const segmentMatch = stage.match(/(\d+)\/(\d+)/);
      if (segmentMatch) {
        const [_, current, total] = segmentMatch;
        const currentSegment = parseInt(current);
        const totalSegments = parseInt(total);
        const percentDone = Math.round((currentSegment / totalSegments) * 100);
        return `Processing segment ${current} of ${total} (${percentDone}% complete)`;
      }
    }
    
    // Извлекаем информацию о конвертации
    if (stage.toLowerCase().includes('convert')) {
      const timeMatch = stage.match(/\((\d+:\d+)\s+from\s+(\d+:\d+)\)/);
      if (timeMatch) {
        const [_, current, total] = timeMatch;
        return `Converting: ${current} of ${total} total length`;
      }
    }
    
    // Извлекаем информацию о подготовке сегментов
    if (stage.toLowerCase().includes('prepar')) {
      const prepMatch = stage.match(/(\d+)\/(\d+)/);
      if (prepMatch) {
        const [_, current, total] = prepMatch;
        const percentDone = Math.round((parseInt(current) / parseInt(total)) * 100);
        return `Preparing segment ${current} of ${total} for streaming (${percentDone}% complete)`;
      }
    }
    
    return '';
  };

  // Map the current stage to index in the stages array
  const getCurrentStageIndex = () => {
    if (!stage) return -1;
    
    const stageIndex = stages.findIndex(s => 
      stage.toLowerCase().includes(s.toLowerCase())
    );
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
    
    return overallProgress;
  };
  
  const overallProgress = calculateOverallProgress();

  // Get a user-friendly message for the current stage
  const getUserFriendlyMessage = () => {
    for (const technicalTerm in userFriendlyMessages) {
      if (stage.toLowerCase().includes(technicalTerm.toLowerCase())) {
        return userFriendlyMessages[technicalTerm];
      }
    }
    return "Processing your track";
  };

  // Only show if processing
  if (!isUploading) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Add style tag for shimmer animation */}
      <style dangerouslySetInnerHTML={{ __html: shimmerAnimation }} />
      
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-lg"></div>
      
      {/* Glass card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-[90%] max-w-xl bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 relative z-10"
      >
        {/* Close button (X) */}
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Header - Cleaner with subtle gradient */}
        <div className="mb-8 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
            Uploading Track
          </h3>
          <p className="text-white/70 mt-1">Please keep this window open</p>
        </div>
        
        {/* Current stage with friendly message */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="w-5 h-5 mr-3 relative">
                <svg className="w-5 h-5 text-[#20DDBB] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white">{getUserFriendlyMessage()}</h4>
            </div>
            <span className="text-[#20DDBB] text-lg font-bold">{Math.round(progress)}%</span>
          </div>
          
          {/* Detailed processing information if available */}
          {getDetailedInfo() && (
            <div className="mb-3 text-sm text-white/70 pl-8">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-[#20DDBB]/50 rounded-full mr-2"></span>
                <span>{getDetailedInfo()}</span>
              </div>
            </div>
          )}
          
          {/* Current stage progress bar */}
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            />
          </div>
        </div>
        
        {/* Overall progress - simplified */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/70">Overall Progress</p>
            <p className="text-white font-medium">{Math.round(overallProgress)}%</p>
          </div>
          
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden relative">
            {/* Progress track with subtle pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4wMyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50"></div>
            
            {/* Main progress bar */}
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] via-[#20DDBB]/80 to-[#018CFD] rounded-full relative overflow-hidden"
              style={{ width: `${overallProgress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
            </motion.div>
            
            {/* Glowing dot */}
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-[#20DDBB]/30 transform -translate-x-1/2"
              style={{ left: `${overallProgress}%` }}
              initial={{ left: 0 }}
              animate={{ left: `${overallProgress}%` }}
              transition={{ type: "spring", damping: 15 }}
            />
          </div>
        </div>
        
        {/* Simplified step indication */}
        <div className="flex items-center justify-between mt-6 px-1">
          {stages.map((_, index) => {
            // Calculate position percentage
            const position = (index / (stages.length - 1)) * 100;
            const isActive = position <= overallProgress;
            
            return (
              <div 
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-[#20DDBB]' : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>
        
        {/* Footer reminder */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>Please don't close your browser during upload</p>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadProgress; 