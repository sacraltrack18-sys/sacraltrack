import React from 'react';
import { BsCheckCircleFill } from 'react-icons/bs';
import Link from 'next/link';
import { useUser } from '@/app/context/user';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    trackId: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, trackId }) => {
    // Get the user context to access the user ID
    const userContext = useUser();
    const userId = userContext?.user?.id;
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1f1239] p-8 rounded-2xl w-[90%] max-w-md border border-white/10
                          animate-float">
                {/* Success icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#20DDBB]/10 flex items-center justify-center">
                        <BsCheckCircleFill className="text-[#20DDBB] text-3xl" />
                    </div>
                </div>

                {/* Success message */}
                <div className="text-center mb-8">
                    <h3 className="text-white text-xl font-medium mb-2">Upload Complete!</h3>
                    <p className="text-white/60 text-sm">
                        Your track has been successfully uploaded and processed
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                    <Link
                        href={userId ? `/profile/${userId}` : "/profile"}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#20DDBB] to-[#018CFD]
                                 rounded-xl text-white text-center font-medium
                                 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                 hover:shadow-[0_0_20px_rgba(32,221,187,0.3)]"
                    >
                        Go to Account
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-white/5 rounded-xl text-white/60
                                 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                 hover:bg-white/10"
                    >
                        Upload Another Track
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal; 