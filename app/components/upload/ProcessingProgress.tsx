import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingProgressProps {
    stage: string;
    progress: number;
    isProcessing: boolean;
    onCancel?: () => void;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ 
    stage, 
    progress, 
    isProcessing,
    onCancel 
}) => {
    const [stageHistory, setStageHistory] = useState<{id: string, progress: number}[]>([]);
    
    // Отслеживаем историю этапов для лучшей визуализации
    useEffect(() => {
        if (!isProcessing) {
            setStageHistory([]);
            return;
        }
        
        if (stage && !stageHistory.some(s => s.id === stage)) {
            setStageHistory(prev => [...prev, { id: stage, progress }]);
        } else if (stage) {
            setStageHistory(prev => 
                prev.map(s => s.id === stage ? { ...s, progress } : s)
            );
        }
    }, [stage, progress, isProcessing]);
    
    if (!isProcessing) return null;

    // Define the stages and their associated icons/colors/descriptions
    const stages = [
        { 
            id: 'Uploading WAV', 
            icon: '🎵', 
            color: 'from-blue-400 to-purple-500',
            description: 'Отправка WAV файла на сервер (до 12 минут)',
        },
        { 
            id: 'Converting to MP3', 
            icon: '🔄', 
            color: 'from-purple-500 to-pink-500',
            description: 'Конвертация в MP3 для лучшего качества воспроизведения',
        },
        { 
            id: 'Segmenting audio', 
            icon: '✂️', 
            color: 'from-pink-500 to-orange-500',
            description: 'Разделение на сегменты для стримингового воспроизведения',
        },
        { 
            id: 'Uploading to storage', 
            icon: '☁️', 
            color: 'from-orange-500 to-green-500',
            description: 'Загрузка файлов в облачное хранилище',
        },
        { 
            id: 'Generating IDs', 
            icon: '🔑', 
            color: 'from-green-500 to-teal-500',
            description: 'Создание уникальных идентификаторов для сегментов',
        },
        { 
            id: 'Creating playlist', 
            icon: '📋', 
            color: 'from-teal-500 to-cyan-500',
            description: 'Формирование M3U8 плейлиста для потокового воспроизведения',
        },
        { 
            id: 'Uploading cover image', 
            icon: '🖼️', 
            color: 'from-cyan-500 to-blue-500',
            description: 'Загрузка обложки трека в хранилище',
        },
        { 
            id: 'Finalizing upload', 
            icon: '✨', 
            color: 'from-blue-500 to-indigo-500',
            description: 'Завершение процесса и регистрация трека в базе данных',
        },
    ];

    // Find current stage index
    const currentStageIndex = stages.findIndex(s => s.id === stage) !== -1 
        ? stages.findIndex(s => s.id === stage) 
        : stages.findIndex(s => stage.includes(s.id));
    
    const currentStage = currentStageIndex !== -1 
        ? stages[currentStageIndex] 
        : { 
            id: stage, 
            icon: '🔄', 
            color: 'from-purple-400 to-blue-500',
            description: 'Обработка данных...'
        };

    // Определение возможности отмены загрузки на текущем этапе
    // Как правило, это возможно только на начальных этапах
    const canBeCancelled = currentStageIndex <= 4; // Можно отменить до этапа "Uploading to storage"

    // Рассчитываем отображаемый прогресс с учетом завершенных этапов
    const calculateOverallProgress = () => {
        // Если текущий этап не найден, просто возвращаем общий прогресс
        if (currentStageIndex === -1) return progress;
        
        // Если этап последний, просто возвращаем его прогресс
        if (currentStageIndex === stages.length - 1) return progress;
        
        // Каждый этап имеет вес в общем прогрессе
        const stageWeight = 100 / stages.length;
        
        // Прогресс от завершенных этапов
        const completedProgress = currentStageIndex * stageWeight;
        
        // Прогресс текущего этапа в пределах его веса
        const currentProgress = (progress / 100) * stageWeight;
        
        return Math.min(99.9, completedProgress + currentProgress);
    };

    return (
        <div className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center transition-opacity duration-300 ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#2A184B]/90 p-8 rounded-2xl max-w-md w-full shadow-2xl border border-white/10 backdrop-blur-sm"
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="mr-2 text-2xl">{currentStage.icon}</span>
                        {currentStage.id}
                    </h3>
                    
                    {/* Кнопка отмены процесса загрузки */}
                    {onCancel && canBeCancelled && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCancel}
                            className="text-white/60 hover:text-white/90 p-2"
                            title="Отменить загрузку"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.button>
                    )}
                </div>
                
                {/* Описание текущего этапа */}
                <p className="text-sm text-white/60 mb-4">
                    {currentStage.description}
                </p>
                
                {/* Main progress bar */}
                <div className="h-3 w-full bg-white/10 rounded-full mb-6 overflow-hidden">
                    <motion.div 
                        className={`h-full rounded-full bg-gradient-to-r ${currentStage.color}`}
                        style={{ width: `${progress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                
                {/* Overall progress bar */}
                <div className="h-2 w-full bg-white/5 rounded-full mb-2 overflow-hidden">
                    <motion.div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
                        style={{ width: `${calculateOverallProgress()}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${calculateOverallProgress()}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                
                {/* Percentage and glowing animation */}
                <div className="flex justify-between items-center mb-5">
                    <p className="text-sm text-white/60">
                        {currentStageIndex + 1} из {stages.length} этапов
                        <span className="ml-1 text-white/40">({Math.round(calculateOverallProgress())}% всего)</span>
                    </p>
                    <div className="flex items-center">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.05, 1],
                                opacity: [1, 0.8, 1]
                            }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 1.5,
                                ease: "easeInOut"
                            }}
                            className="text-xl font-bold text-white"
                        >
                            {Math.round(progress)}%
                        </motion.div>
                    </div>
                </div>
                
                {/* История последних 3-х этапов для лучшего отображения прогресса */}
                <div className="mb-4">
                    <h4 className="text-sm text-white/60 mb-2">История обработки:</h4>
                    <div className="space-y-2">
                        {stageHistory.slice(-3).map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center justify-between text-sm text-white/70 bg-white/5 rounded-lg p-2"
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">
                                        {item.progress >= 100 ? '✅' : '🔄'}
                                    </span>
                                    <span>{item.id}</span>
                                </div>
                                <span className="font-medium">
                                    {Math.round(item.progress)}%
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
                
                {/* Stage indicators - теперь с подсветкой текущего этапа и прогрессом */}
                <div className="grid grid-cols-4 gap-2">
                    {stages.map((s, i) => (
                        <motion.div 
                            key={s.id}
                            initial={{ opacity: 0.5, y: 10 }}
                            animate={{ 
                                opacity: i <= currentStageIndex ? 1 : 0.5,
                                y: 0,
                                scale: i === currentStageIndex ? 1.1 : 1
                            }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex flex-col items-center p-2 rounded-lg cursor-help
                                ${i === currentStageIndex 
                                    ? 'bg-white/10 ring-1 ring-white/20 text-white' 
                                    : i < currentStageIndex 
                                        ? 'bg-white/10 text-white/70' 
                                        : 'bg-white/5 text-white/40'
                                }`}
                            title={s.description}
                        >
                            <span className="text-xl mb-1">{s.icon}</span>
                            <span className="text-xs text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                {s.id.length > 10 ? `${s.id.substring(0, 10)}...` : s.id}
                            </span>
                            
                            {/* Stage progress indicator */}
                            {i === currentStageIndex && (
                                <motion.div 
                                    className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden"
                                >
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-cyan-400 to-pink-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </div>
                
                {/* Animated particles for flair */}
                <div className="relative h-12 overflow-hidden mt-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-white/40"
                            initial={{ 
                                x: Math.random() * 100 + "%", 
                                y: "100%",
                                opacity: 0.2 + Math.random() * 0.5,
                                scale: 0.5 + Math.random() * 0.5,
                            }}
                            animate={{ 
                                y: "0%", 
                                x: `calc(${Math.random() * 100}% + ${Math.random() * 40 - 20}px)`,
                                opacity: 0
                            }}
                            transition={{ 
                                duration: 1 + Math.random() * 2,
                                repeat: Infinity,
                                repeatDelay: Math.random() * 2,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                </div>
                
                {/* Information about cancellation */}
                {onCancel && !canBeCancelled && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-4 text-center text-xs text-white/40"
                    >
                        На данном этапе отмена загрузки невозможна
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
};

export default ProcessingProgress; 