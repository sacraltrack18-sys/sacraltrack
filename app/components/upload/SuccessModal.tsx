import React, { useEffect } from 'react';
import { BsCheckCircleFill } from 'react-icons/bs';
import Link from 'next/link';
import { useUser } from '@/app/context/user';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    trackId: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, trackId }) => {
    // Get the user context to access the user ID
    const userContext = useUser();
    const userId = userContext?.user?.id;
    
    // Trigger confetti when modal opens
    useEffect(() => {
        if (isOpen) {
            // First confetti burst
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#20DDBB', '#018CFD', '#FFFFFF', '#1f1239']
            });
            
            // Second confetti burst after a delay
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 80,
                    origin: { x: 0, y: 0.6 },
                    colors: ['#20DDBB', '#018CFD', '#FFFFFF', '#1f1239']
                });
                
                confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 80,
                    origin: { x: 1, y: 0.6 },
                    colors: ['#20DDBB', '#018CFD', '#FFFFFF', '#1f1239']
                });
            }, 800);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div 
                        className="bg-gradient-to-b from-[#1f1239] to-[#150c28] p-8 rounded-2xl w-[90%] max-w-md 
                                border border-[#20DDBB]/20 shadow-[0_0_30px_rgba(32,221,187,0.15)]
                                relative overflow-hidden"
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ 
                            type: "spring", 
                            damping: 25, 
                            stiffness: 300 
                        }}
                    >
                        {/* Background effects */}
                        <div className="absolute inset-0 overflow-hidden">
                            <motion.div 
                                className="absolute -top-20 -left-20 w-40 h-40 bg-[#20DDBB]/10 rounded-full blur-3xl"
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 0.7, 0.5],
                                }} 
                                transition={{ 
                                    duration: 5,
                                    repeat: Infinity,
                                    repeatType: 'reverse'
                                }}
                            />
                            <motion.div 
                                className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#018CFD]/10 rounded-full blur-3xl"
                                animate={{ 
                                    scale: [1.2, 1, 1.2],
                                    opacity: [0.7, 0.5, 0.7],
                                }} 
                                transition={{ 
                                    duration: 5,
                                    repeat: Infinity,
                                    repeatType: 'reverse'
                                }}
                            />
                        </div>
                        
                        <div className="relative z-10">
                            {/* Success icon */}
                            <motion.div 
                                className="flex justify-center mb-6"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                <motion.div 
                                    className="w-20 h-20 rounded-full bg-[#20DDBB]/10 flex items-center justify-center"
                                    animate={{ boxShadow: ["0 0 0 0px rgba(32,221,187,0.2)", "0 0 0 10px rgba(32,221,187,0)"] }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity,
                                        repeatDelay: 0.5
                                    }}
                                >
                                    <motion.div
                                        initial={{ rotate: 0 }}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    >
                                        <BsCheckCircleFill className="text-[#20DDBB] text-4xl" />
                                    </motion.div>
                                </motion.div>
                            </motion.div>

                            {/* Success message */}
                            <motion.div 
                                className="text-center mb-8"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <h3 className="text-white text-2xl font-bold mb-3 bg-gradient-to-r from-[#20DDBB] to-[#018CFD] bg-clip-text text-transparent">
                                    Track Published!
                                </h3>
                                <p className="text-white/80 text-base">
                                    Your track has been successfully uploaded and is now available to listeners
                                </p>
                                
                                {/* Track ID display */}
                                <div className="mt-4 px-3 py-2 bg-white/5 rounded-lg inline-block">
                                    <span className="text-xs text-white/60">Track ID: </span>
                                    <span className="text-xs font-mono text-[#20DDBB]">{trackId.substring(0, 8)}...</span>
                                </div>
                            </motion.div>

                            {/* Action buttons */}
                            <motion.div 
                                className="flex flex-col gap-3"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <Link
                                    href={userId ? `/profile/${userId}` : "/profile"}
                                    className="w-full py-4 px-5 bg-gradient-to-r from-[#20DDBB] to-[#018CFD]
                                             rounded-xl text-white text-center font-medium
                                             transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                             hover:shadow-[0_0_20px_rgba(32,221,187,0.3)]"
                                >
                                    <div className="flex items-center justify-center">
                                        <span className="mr-2">View in Your Profile</span>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>
                                </Link>
                                
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 px-5 bg-white/5 rounded-xl text-white/80
                                             transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                             hover:bg-white/10 border border-white/10"
                                >
                                    Upload Another Track
                                </button>
                            </motion.div>
                            
                            {/* Optional: achievement badge */}
                            <motion.div
                                className="absolute -top-3 -right-3 bg-gradient-to-r from-[#FF8A00] to-[#FF4500] text-white text-xs font-bold py-1 px-3 rounded-full transform rotate-12 shadow-lg"
                                initial={{ opacity: 0, scale: 0, rotate: 45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 12 }}
                                transition={{ delay: 1, type: "spring", stiffness: 300 }}
                            >
                                New Release!
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal; 