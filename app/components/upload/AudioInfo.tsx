import React from 'react';

// Интерфейс для метаданных аудио
interface AudioMetadata {
    duration: number;
    fileName: string;
    sampleRate?: number;
    channels?: number;
    bitDepth?: number;
    fileSize: number;
}

interface AudioInfoProps {
    metadata: AudioMetadata | null;
}

// Форматирование размера файла
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Форматирование времени
const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioInfo: React.FC<AudioInfoProps> = ({ metadata }) => {
    if (!metadata) return null;

    return (
        <div className="bg-gradient-to-br from-[#2A184B]/70 to-[#1f1239]/70 rounded-xl border border-[#20DDBB]/20 p-4 mt-3">
            <h4 className="text-[#20DDBB] text-sm font-medium mb-2">Audio File Information</h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                    <span className="text-white/50">Duration</span>
                    <span className="text-white font-medium">{formatDuration(metadata.duration)}</span>
                </div>
                
                <div className="flex flex-col">
                    <span className="text-white/50">File Size</span>
                    <span className="text-white font-medium">{formatFileSize(metadata.fileSize)}</span>
                </div>
                
                {metadata.sampleRate && (
                    <div className="flex flex-col">
                        <span className="text-white/50">Sample Rate</span>
                        <span className="text-white font-medium">{metadata.sampleRate} Hz</span>
                    </div>
                )}
                
                {metadata.channels && (
                    <div className="flex flex-col">
                        <span className="text-white/50">Channels</span>
                        <span className="text-white font-medium">
                            {metadata.channels === 1 ? 'Mono' : metadata.channels === 2 ? 'Stereo' : `${metadata.channels} channels`}
                        </span>
                    </div>
                )}
                
                {metadata.bitDepth && (
                    <div className="flex flex-col">
                        <span className="text-white/50">Bit Depth</span>
                        <span className="text-white font-medium">{metadata.bitDepth}-bit</span>
                    </div>
                )}
                
                <div className="flex flex-col">
                    <span className="text-white/50">Format</span>
                    <span className="text-white font-medium">WAV</span>
                </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#20DDBB]/50 mr-2"></div>
                    <p className="text-white/70 text-xs">
                        Original file name: <span className="font-mono text-[#20DDBB]/80">{metadata.fileName}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AudioInfo; 