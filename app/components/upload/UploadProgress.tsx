import React from 'react';
import { motion } from 'framer-motion';

// Styles for the shimmer animation
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

// Interface for the base progress component
interface BaseProgressProps {
  stage: string; 
  progress: number; 
  isActive: boolean;
}

// Interface for the upload progress component
interface UploadProgressProps extends BaseProgressProps {
  onCancel: () => void;
  confirmCancel: () => void;
}

// Main upload progress component
export const UploadProgress: React.FC<UploadProgressProps> = ({
  isActive,
  stage,
  progress,
  onCancel,
  confirmCancel
}) => {
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  
  // Упрощенные этапы загрузки (без обработки аудио)
  const stages = [
    "Preparing upload",
    "Uploading cover",
    "Uploading WAV",
    "Creating release"
  ];

  // Map для понятных пользователю сообщений
  const userFriendlyMessages: {[key: string]: string} = {
    "Preparing upload": "Preparing your files",
    "Uploading cover": "Uploading cover image",
    "Uploading WAV": "Uploading audio file",
    "Creating release": "Creating release",
    "Completed": "Upload complete"
  };
  
  // Получаем индекс текущего этапа
  const getCurrentStageIndex = () => {
    if (!stage) return 0;
    
    const stageIndex = stages.findIndex(s => 
      stage.toLowerCase().includes(s.toLowerCase())
    );
    return stageIndex !== -1 ? stageIndex : 0;
  };
  
  // Вычисляем общий прогресс
  const calculateOverallProgress = () => {
    const currentStageIndex = getCurrentStageIndex();
    if (currentStageIndex === -1) return progress;
    
    const stageWidth = 100 / stages.length;
    const completedStagesProgress = currentStageIndex * stageWidth;
    const currentStageProgress = progress * (stageWidth / 100);
    
    return Math.min(99, completedStagesProgress + currentStageProgress);
  };
  
  // Получаем сообщение понятное пользователю
  const getUserFriendlyMessage = () => {
    for (const technicalTerm in userFriendlyMessages) {
      if (stage.toLowerCase().includes(technicalTerm.toLowerCase())) {
        return userFriendlyMessages[technicalTerm];
      }
    }
    return "Uploading track";
  };

  // Обработка нажатия на кнопку отмены
  const handleCancelClick = () => {
    if (showConfirmation) {
      confirmCancel();
      setShowConfirmation(false);
    } else {
      setShowConfirmation(true);
    }
  };
  
  // Не отображаем, если неактивно
  if (!isActive) return null;

  const overallProgress = calculateOverallProgress();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Style tag для анимации shimmer */}
      <style dangerouslySetInnerHTML={{ __html: shimmerAnimation }} />
      
      {/* Фон с размытием */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>
      
      {/* Стеклянная карточка */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-[90%] max-w-xl bg-white/5 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-8 relative z-10"
      >
        {/* Заголовок с анимацией */}
        <div className="mb-8 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
            Publishing Track
          </h3>
          <p className="text-white/70 mt-1">Please wait for the upload to complete</p>
        </div>
        
        {/* Текущий этап с понятным сообщением */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="w-5 h-5 mr-3 relative">
                <svg className="w-5 h-5 text-[#20DDBB] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white">{getUserFriendlyMessage()}</h4>
            </div>
            <span className="text-[#20DDBB] text-lg font-bold">{Math.round(progress)}%</span>
          </div>
          
          {/* Прогресс-бар текущего этапа */}
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] to-[#018CFD] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 100, duration: 0.3 }}
            />
          </div>
        </div>
        
        {/* Общий прогресс */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white/70">Overall Progress</p>
            <p className="text-white font-medium">{Math.round(overallProgress)}%</p>
          </div>
          
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden relative">
            {/* Основной прогресс-бар */}
            <motion.div 
              className="h-full bg-gradient-to-r from-[#20DDBB] via-[#20DDBB]/80 to-[#018CFD] rounded-full relative overflow-hidden"
              style={{ width: `${overallProgress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
            >
              {/* Эффект shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
            </motion.div>
          </div>
        </div>
        
        {/* Индикация этапов */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {stages.map((stageName, index) => {
              const currentIndex = getCurrentStageIndex();
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              
              return (
                <div 
                  key={index} 
                  className="flex flex-col items-center"
                  style={{ width: `${100 / stages.length}%` }}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center
                                 ${isCompleted 
                                     ? 'bg-[#20DDBB] text-black' 
                                     : isCurrent 
                                       ? 'bg-[#20DDBB]/20 border border-[#20DDBB] text-white' 
                                       : 'bg-white/10 text-white/30'
                                 }
                                 ${isCurrent ? 'animate-pulse' : ''}`}>
                    {isCompleted && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center 
                              ${isCompleted 
                                  ? 'text-[#20DDBB]' 
                                  : isCurrent 
                                    ? 'text-white' 
                                    : 'text-white/30'
                              }`}>
                    {userFriendlyMessages[stageName] || stageName}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="w-full h-0.5 bg-white/10 relative -mt-10 z-[-1]"></div>
        </div>
        
        {/* Информация и кнопка отмены */}
        <div className="flex flex-col items-center">
          {!showConfirmation ? (
            <>
              <p className="text-white/50 text-sm mb-4">
                After upload, your track will be automatically processed in the background
              </p>
              <button
                onClick={handleCancelClick}
                className="text-white/60 hover:text-white/80 font-medium py-2 px-4 mt-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors duration-200"
              >
                Cancel Upload
              </button>
            </>
          ) : (
            <div className="text-center p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-white font-medium mb-3">Are you sure you want to cancel the upload?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="text-white/80 hover:text-white py-2 px-4 rounded-lg border border-white/10"
                >
                  Continue Upload
                </button>
                <button
                  onClick={handleCancelClick}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Пустой компонент для обратной совместимости
export const BackgroundProgress: React.FC<any> = () => null;