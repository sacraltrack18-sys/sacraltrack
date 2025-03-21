"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TutorialStep {
    id: string;
    message: string | React.ReactNode;
    targetElementId: string;
    position: 'top' | 'bottom' | 'left' | 'right';
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

    useEffect(() => {
        setIsMounted(true);
        if (isFirstVisit) {
            setIsVisible(true);
        }
    }, [isFirstVisit]);

    useEffect(() => {
        if (isMounted && isVisible && steps.length > 0) {
            positionTooltip();
            window.addEventListener('resize', positionTooltip);
            return () => window.removeEventListener('resize', positionTooltip);
        }
    }, [currentStepIndex, isVisible, isMounted]);

    const positionTooltip = () => {
        const currentStep = steps[currentStepIndex];
        const targetElement = document.getElementById(currentStep.targetElementId);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const position = currentStep.position || 'bottom';

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top - 120;
                    left = rect.left + (rect.width / 2) - 150;
                    break;
                case 'bottom':
                    top = rect.bottom + 20;
                    left = rect.left + (rect.width / 2) - 150;
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - 60;
                    left = rect.left - 320;
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - 60;
                    left = rect.right + 20;
                    break;
            }

            setTooltipPosition({ top, left });
        }
    };

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsVisible(false);
            if (onComplete) onComplete();
        }
    };

    const handleSkip = () => {
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    if (!isMounted || !isVisible || steps.length === 0) return null;

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
                    zIndex: 1000,
                }}
                className="pointer-events-auto"
            >
                <div className="relative bg-[#24183D] rounded-xl p-4 shadow-xl w-[300px]">
                    {/* Tooltip Arrow */}
                    <div 
                        className="absolute w-4 h-4 bg-[#24183D] transform rotate-45"
                        style={{
                            top: steps[currentStepIndex].position === 'bottom' ? '-8px' : undefined,
                            bottom: steps[currentStepIndex].position === 'top' ? '-8px' : undefined,
                            left: steps[currentStepIndex].position === 'right' ? '-8px' : undefined,
                            right: steps[currentStepIndex].position === 'left' ? '-8px' : undefined,
                            margin: 'auto'
                        }}
                        suppressHydrationWarning={true}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                        <p className="text-white text-sm mb-4">{steps[currentStepIndex].message}</p>
                        
                        <div className="flex justify-between items-center">
                            {/* Progress dots */}
                            <div className="flex gap-1">
                                {steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                            index === currentStepIndex ? 'bg-[#20DDBB]' : 'bg-[#2E2469]'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSkip}
                                    className="px-3 py-1 text-xs text-[#818BAC] hover:text-white transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-4 py-1 text-xs bg-[#20DDBB] text-black rounded-full hover:bg-[#1CB99D] transition-colors"
                                >
                                    {currentStepIndex === steps.length - 1 ? 'Got it' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TutorialGuide; 