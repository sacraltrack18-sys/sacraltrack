import React from 'react';

interface UploadProgressProps {
    progress: number;
    stage: string;
    isUploading: boolean;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ progress, stage, isUploading }) => {
    const getStageColor = (currentStage: string) => {
        switch (currentStage.toLowerCase()) {
            case 'converting':
                return 'from-blue-500 to-purple-500';
            case 'segmenting':
                return 'from-purple-500 to-pink-500';
            case 'uploading':
                return 'from-[#20DDBB] to-[#018CFD]';
            default:
                return 'from-gray-400 to-gray-600';
        }
    };

    if (!isUploading) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1f1239] p-8 rounded-2xl w-[90%] max-w-md border border-white/10">
                <div className="mb-4">
                    <h3 className="text-white text-lg font-medium mb-1">Processing Track</h3>
                    <p className="text-white/60 text-sm">{stage}</p>
                </div>

                {/* Progress bar container */}
                <div className="relative h-4 bg-[#2A184B] rounded-full overflow-hidden">
                    {/* Progress bar */}
                    <div
                        className={`h-full bg-gradient-to-r ${getStageColor(stage)} transition-all duration-300 ease-out`}
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute top-0 left-0 h-full w-[50%] 
                                      bg-gradient-to-r from-transparent via-white/20 to-transparent
                                      animate-shimmer">
                        </div>
                    </div>
                </div>

                {/* Progress percentage */}
                <div className="mt-2 text-right">
                    <span className="text-white/80 text-sm font-medium">{Math.round(progress)}%</span>
                </div>

                {/* Warning message */}
                <div className="mt-6 flex items-center justify-center">
                    <p className="text-white/40 text-xs text-center">
                        Please don't close this window while processing
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UploadProgress; 