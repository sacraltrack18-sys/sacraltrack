import React from 'react';
import { BsInfoCircle, BsCheck, BsX } from 'react-icons/bs';

interface RequirementsTooltipProps {
    isOpen: boolean;
    onClose: () => void;
}

const RequirementsTooltip: React.FC<RequirementsTooltipProps> = ({ 
    isOpen, 
    onClose 
}) => {
    // Simplified list of requirements
    const requirements = [
        { 
            id: 'audio', 
            label: 'Audio File', 
            detail: 'WAV format, up to 200MB',
            info: 'File will be automatically processed'
        },
        { 
            id: 'image', 
            label: 'Cover Image', 
            detail: 'PNG, JPG up to 10MB',
            info: 'Square image recommended'
        },
        { 
            id: 'info', 
            label: 'Track Information', 
            detail: 'Title and genre',
            info: 'Required fields'
        }
    ];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" onClick={onClose}>
            <div 
                className="w-96 p-6 rounded-xl bg-[#2A184B] shadow-xl border border-[#20DDBB]/20"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                    <h3 className="text-white font-semibold">Upload Requirements</h3>
                    <button 
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <ul className="space-y-4">
                    {requirements.map(req => (
                        <li key={req.id} className="flex items-start">
                            <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-[#20DDBB]/20 text-[#20DDBB]">
                                <BsCheck size={14} />
                            </div>
                            <div className="ml-2">
                                <p className="text-white text-sm font-medium">{req.label}</p>
                                <p className="text-white/60 text-xs">{req.detail}</p>
                                <p className="text-[#20DDBB]/80 text-xs italic mt-1">{req.info}</p>
                            </div>
                        </li>
                    ))}
                </ul>

                <div className="mt-6 pt-3 border-t border-white/10">
                    <p className="text-sm text-white/80">
                        After upload, your track will be available on your profile and in the main feed.
                    </p>
                    <p className="text-xs text-[#20DDBB] mt-2">
                        Powered by Sacral Track
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RequirementsTooltip; 