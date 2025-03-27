"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TutorialStep {
    id: string;
    message: string | React.ReactNode;
    targetElementId: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    mobilePosition?: 'top' | 'bottom' | 'center';
}

interface TutorialGuideProps {
    steps: TutorialStep[];
    isFirstVisit?: boolean;
    onComplete?: () => void;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ steps, isFirstVisit = true, onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [isMounted, setIsMounted] = useState<boolean>(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsMobile(window.innerWidth < 768);
        
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        
        if (isFirstVisit) {
            setIsVisible(true);
        }
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isFirstVisit]);

    useEffect(() => {
        if (isMounted && isVisible && steps.length > 0) {
            positionTooltip();
            window.addEventListener('resize', positionTooltip);
            window.addEventListener('scroll', positionTooltip);
            return () => {
                window.removeEventListener('resize', positionTooltip);
                window.removeEventListener('scroll', positionTooltip);
            };
        }
    }, [currentStepIndex, isVisible, isMounted, isMobile]);

    const positionTooltip = () => {
        const currentStep = steps[currentStepIndex];
        const targetElement = document.getElementById(currentStep.targetElementId);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            let position = isMobile && currentStep.mobilePosition 
                ? currentStep.mobilePosition 
                : currentStep.position;
                
            if (isMobile && viewportWidth < 400) {
                position = 'center';
            }

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = Math.max(20, rect.top - 120);
                    left = Math.min(Math.max(20, rect.left + (rect.width / 2) - 150), viewportWidth - 320);
                    break;
                case 'bottom':
                    top = Math.min(rect.bottom + 20, viewportHeight - 170);
                    left = Math.min(Math.max(20, rect.left + (rect.width / 2) - 150), viewportWidth - 320);
                    break;
                case 'left':
                    top = Math.min(Math.max(20, rect.top + (rect.height / 2) - 60), viewportHeight - 170);
                    left = Math.max(20, rect.left - 320);
                    break;
                case 'right':
                    top = Math.min(Math.max(20, rect.top + (rect.height / 2) - 60), viewportHeight - 170);
                    left = Math.min(rect.right + 20, viewportWidth - 320);
                    break;
                case 'center':
                    top = (viewportHeight - 150) / 2;
                    left = (viewportWidth - 300) / 2;
                    break;
            }

            setTooltipPosition({ top, left });
            
            targetElement.style.transition = 'all 0.3s ease';
            targetElement.style.boxShadow = '0 0 0 4px rgba(32, 221, 187, 0.5)';
            targetElement.style.zIndex = '999';
            
            return () => {
                targetElement.style.boxShadow = '';
                targetElement.style.zIndex = '';
            };
        }
    };

    const handleNext = () => {
        const currentStep = steps[currentStepIndex];
        const currentTarget = document.getElementById(currentStep.targetElementId);
        if (currentTarget) {
            currentTarget.style.boxShadow = '';
            currentTarget.style.zIndex = '';
        }
        
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsVisible(false);
            if (onComplete) onComplete();
        }
    };

    const handleSkip = () => {
        const currentStep = steps[currentStepIndex];
        const currentTarget = document.getElementById(currentStep.targetElementId);
        if (currentTarget) {
            currentTarget.style.boxShadow = '';
            currentTarget.style.zIndex = '';
        }
        
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    if (!isMounted || !isVisible || steps.length === 0) return null;

    const getArrowPosition = () => {
        const currentStep = steps[currentStepIndex];
        let position = isMobile && currentStep.mobilePosition 
            ? currentStep.mobilePosition 
            : currentStep.position;
            
        if (isMobile && window.innerWidth < 400) {
            position = 'center';
        }
        
        if (position === 'center') return {};
        
        return {
            top: position === 'bottom' ? '-8px' : undefined,
            bottom: position === 'top' ? '-8px' : undefined,
            left: position === 'right' ? '-8px' : undefined,
            right: position === 'left' ? '-8px' : undefined,
            margin: 'auto'
        };
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'fixed',
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    zIndex: 2000,
                }}
                className="pointer-events-auto"
            >
                <div className="relative bg-[#1A2338]/80 backdrop-blur-xl rounded-xl p-5 shadow-xl w-[300px] border border-[#20DDBB]/20">
                    {steps[currentStepIndex].position && (
                        <motion.div 
                            className="absolute w-4 h-4 bg-[#1A2338]/80 backdrop-blur-xl transform rotate-45 border-[#20DDBB]/20"
                            style={getArrowPosition()}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        />
                    )}

                    <div className="relative z-10">
                        <p className="text-white text-sm mb-4 leading-relaxed">{steps[currentStepIndex].message}</p>
                        
                        <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                                {steps.map((_, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ scale: 0.8, opacity: 0.5 }}
                                        animate={{ 
                                            scale: index === currentStepIndex ? 1 : 0.8,
                                            opacity: index === currentStepIndex ? 1 : 0.5
                                        }}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                            index === currentStepIndex ? 'bg-[#20DDBB]' : 'bg-[#2E2469]'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <motion.button
                                    onClick={handleSkip}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1 text-xs text-[#818BAC] hover:text-white transition-colors"
                                >
                                    Skip
                                </motion.button>
                                <motion.button
                                    onClick={handleNext}
                                    whileHover={{ scale: 1.05, backgroundColor: '#1CB99D' }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-1 text-xs bg-[#20DDBB] text-black rounded-full hover:bg-[#1CB99D] transition-colors"
                                >
                                    {currentStepIndex === steps.length - 1 ? 'Got it' : 'Next'}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TutorialGuide; 