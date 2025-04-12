"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextType {
  isVisible: boolean;
  currentStep: number;
  setIsVisible: (visible: boolean) => void;
  setCurrentStep: (step: number) => void;
  showOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const showOnboarding = () => {
    console.log('Showing onboarding guide...');
    setIsVisible(true);
    setCurrentStep(0);
  };

  return (
    <OnboardingContext.Provider value={{ 
      isVisible, 
      currentStep, 
      setIsVisible, 
      setCurrentStep,
      showOnboarding 
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  
  if (context === undefined) {
    console.warn('useOnboarding must be used within an OnboardingProvider');
    return {
      isVisible: false,
      currentStep: 0,
      setIsVisible: () => console.warn('OnboardingContext not initialized'),
      setCurrentStep: () => console.warn('OnboardingContext not initialized'),
      showOnboarding: () => console.warn('OnboardingContext not initialized')
    };
  }
  
  return context;
}; 