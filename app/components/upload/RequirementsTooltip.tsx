import React from 'react';
import { BsInfoCircle, BsCheck, BsX } from 'react-icons/bs';

interface RequirementsTooltipProps {
    isOpen: boolean;
    onToggle: () => void;
    fileAudio: File | null;
    fileImage: File | null;
    trackname: string;
}

const RequirementsTooltip: React.FC<RequirementsTooltipProps> = ({ 
    isOpen, 
    onToggle, 
    fileAudio, 
    fileImage, 
    trackname 
}) => {
    const requirements = [
        { 
            id: 'audio', 
            label: 'Audio file', 
            detail: 'WAV format, up to 100MB', 
            isValid: !!fileAudio 
        },
        { 
            id: 'image', 
            label: 'Cover image', 
            detail: 'PNG, JPG up to 10MB', 
            isValid: !!fileImage 
        },
        { 
            id: 'trackname', 
            label: 'Track name', 
            detail: 'Required',
            isValid: !!trackname && trackname.trim().length > 0 
        }
    ];

    const allRequirementsMet = requirements.every(req => req.isValid);

    return (
        <div className="relative">
            {/* Info button */}
            <button 
                onClick={onToggle}
                className={`p-2 rounded-full
                          ${isOpen ? 'bg-[#018CFD]/20 text-[#018CFD]' : 'bg-white/5 text-white/60'}
                          transition-colors duration-300 hover:bg-white/10`}
            >
                <BsInfoCircle size={18} />
            </button>

            {/* Tooltip */}
            {isOpen && (
                <div className="absolute z-10 w-64 p-4 rounded-xl bg-[#2A184B] shadow-lg border border-white/5
                              right-0 mt-2 transform-gpu animate-fadeIn transition-opacity">
                    <div className="mb-3 pb-2 border-b border-white/10">
                        <h4 className="text-white text-sm font-medium">Upload Requirements</h4>
                    </div>

                    <ul className="space-y-3">
                        {requirements.map(req => (
                            <li key={req.id} className="flex items-start">
                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center
                                              ${req.isValid ? 'bg-[#20DDBB]/20 text-[#20DDBB]' : 'bg-red-500/20 text-red-500'}`}>
                                    {req.isValid ? <BsCheck size={14} /> : <BsX size={14} />}
                                </div>
                                <div className="ml-2">
                                    <p className="text-white text-xs font-medium">{req.label}</p>
                                    <p className="text-white/40 text-[10px]">{req.detail}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${allRequirementsMet ? 'bg-[#20DDBB]' : 'bg-orange-500'}`}></div>
                            <p className="ml-2 text-xs text-white/60">
                                {allRequirementsMet ? 'All requirements met' : 'Complete all requirements to upload'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequirementsTooltip; 