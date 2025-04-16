import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMusic, 
  FaHeadphones, 
  FaDollarSign, 
  FaCamera, 
  FaHeart,
  FaArrowRight,
  FaTimes,
  FaCheckCircle,
  FaCompactDisc,
  FaChartLine,
  FaUserFriends,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useUser } from '@/app/context/user';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { BsMusicNoteBeamed, BsChatDots, BsBell, BsPerson } from 'react-icons/bs';
import { IoMdNotifications } from 'react-icons/io';
import { RiUserFollowLine } from 'react-icons/ri';
import { MdOutlineMusicNote } from 'react-icons/md';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { TbBellRinging } from 'react-icons/tb';
import { CgProfile } from 'react-icons/cg';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Sacral Track',
    description: 'The premier music streaming platform, marketplace and social network for music artists and lovers with high-quality audio and fair royalty distribution.',
    icon: <FaMusic className="text-2xl text-violet-300" />,
    features: [
      'High-quality music streaming platform',
      'Premium audio quality (192-256 kbps)',
      'Downloads in WAV & 320 kbps formats',
      'Optimized media compression'
    ]
  },
  {
    id: 'marketplace',
    title: 'Music Marketplace',
    description: 'Buy and sell music directly with transparent pricing and fair artist royalties, supporting creators directly.',
    icon: <FaCompactDisc className="text-2xl text-violet-300" />,
    features: [
      'Fixed price model ($2 per track)',
      'Artist receives $1 per sale',
      'Instant withdrawals for artists',
      'Direct support to creators'
    ]
  },
  {
    id: 'social',
    title: 'Social Network',
    description: 'Connect with music artists and fans, share vibes, follow creators, and participate in a vibrant music community.',
    icon: <FaUserFriends className="text-2xl text-violet-300" />,
    features: [
      'Share Vibes & updates',
      'Follow favorite artists',
      'Engage in music discussions',
      'Discover trending music'
    ]
  },
  {
    id: 'recognition',
    title: 'Artist Recognition',
    description: 'Discover and gain visibility with Top 100 charts, user ratings, and trending content features.',
    icon: <FaChartLine className="text-2xl text-violet-300" />,
    features: [
      'Top 100 Artists chart',
      'User rating system',
      'Monthly trending tracks',
      'Featured artist spotlights'
    ]
  },
  {
    id: 'premium',
    title: 'Premium Experience',
    description: 'Enjoy the highest audio quality standards and exclusive content with our premium streaming experience.',
    icon: <FaDollarSign className="text-2xl text-violet-300" />,
    features: [
      'High-fidelity streaming',
      'Exclusive artist content',
      'Ad-free experience',
      'Direct artist communications'
    ]
  }
];

export const OnboardingGuide: React.FC = () => {
  const { isVisible, currentStep, setIsVisible, setCurrentStep } = useOnboarding();
  const { user } = useUser() || {};
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    console.log('OnboardingGuide mounted, visibility:', isVisible);
    return () => console.log('OnboardingGuide unmounted');
  }, []);

  useEffect(() => {
    console.log('Visibility changed:', isVisible);
  }, [isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      
      // Set onboarding completed in localStorage
      try {
        localStorage.setItem('onboardingCompleted', 'true');
      } catch (e) {
        console.error('Error setting localStorage:', e);
      }
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg"
        >
          <div className="relative w-full max-w-4xl p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative overflow-hidden bg-gradient-to-br from-[#1A2338]/90 to-[#2A3348]/90 backdrop-blur-xl p-10 rounded-2xl border border-[#20DDBB]/20 shadow-2xl"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                  className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-r from-[#20DDBB]/15 to-[#20DDBB]/5 blur-3xl"
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.2, 1],
                  }} 
                  transition={{
                    rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                    scale: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
                <motion.div 
                  className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-r from-violet-500/15 to-purple-500/5 blur-3xl"
                  animate={{ 
                    rotate: -360,
                    scale: [1, 1.3, 1],
                  }} 
                  transition={{
                    rotate: { duration: 35, repeat: Infinity, ease: "linear" },
                    scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
              </div>

              <motion.button
                onClick={handleComplete}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                whileTap={{ scale: 0.95 }}
                className="absolute top-4 right-4 text-[#818BAC] hover:text-white transition-colors z-10 p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10"
                aria-label="Close onboarding"
              >
                <FaTimes className="w-5 h-5" />
              </motion.button>

              {currentStep === 0 ? (
                <div className="text-center relative z-10">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-10"
                  >
                    <div className="relative w-28 h-28 mx-auto mb-8">
                      <motion.div
                        animate={{ 
                          rotate: 360,
                          scale: [1, 1.15, 1],
                        }}
                        transition={{ 
                          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-500/30 rounded-full blur-2xl"
                      />
                      <div className="relative z-10 flex items-center justify-center h-full pt-2">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 0.9, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <FaCompactDisc className="text-7xl text-violet-300" />
                        </motion.div>
                      </div>
                    </div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent mb-4">
                      Welcome to Sacral Track
                    </h2>
                    <p className="text-[#9BA3BF] text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                      The premier music streaming platform, marketplace and social network for music artists and lovers with high-quality audio and fair royalty distribution.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 max-w-2xl mx-auto">
                      {[
                        { icon: FaMusic, text: "Create & Share" },
                        { icon: FaHeadphones, text: "Listen & Collect" },
                        { icon: FaCamera, text: "Share Vibes" },
                        { icon: FaChartLine, text: "Earn & Grow" }
                      ].map((item, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          whileHover={{ 
                            scale: 1.05, 
                            backgroundColor: 'rgba(50, 45, 70, 0.6)',
                            borderColor: 'rgba(128, 90, 213, 0.5)'
                          }}
                          className="p-5 rounded-xl bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30 group transition-all duration-300"
                        >
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <item.icon className="text-3xl text-violet-300 mx-auto mb-3 group-hover:text-violet-200 transition-colors" />
                          </motion.div>
                          <p className="text-sm font-medium text-[#9BA3BF] group-hover:text-white transition-colors">{item.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-full shadow-lg shadow-violet-900/30 transition-all duration-300 group font-medium text-lg"
                  >
                    <span>Explore Features</span>
                    <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </motion.button>
                </div>
              ) : (
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="text-center relative z-10"
                >
                  <div className="mb-8">
                    <div className="w-20 h-20 mx-auto mb-8 relative">
                      <motion.div 
                        className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <div className="relative z-10 flex items-center justify-center h-full">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 0.9, 1]
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          {steps[currentStep].icon}
                        </motion.div>
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent mb-4">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-[#9BA3BF] text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                      {steps[currentStep].description}
                    </p>
                    
                    <div className="space-y-4">
                      {steps[currentStep].features?.map((feature, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          whileHover={{ 
                            scale: 1.02, 
                            backgroundColor: 'rgba(50, 45, 70, 0.6)',
                            borderColor: 'rgba(128, 90, 213, 0.5)'
                          }}
                          className="p-4 rounded-xl bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30 hover:border-violet-500/30 transition-all duration-300 flex items-center group"
                        >
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <FaCheckCircle className="text-[#20DDBB] text-xl mr-4 flex-shrink-0 group-hover:text-[#2EEEBB] transition-colors" />
                          </motion.div>
                          <p className="text-base text-left text-[#9BA3BF] group-hover:text-white transition-colors">{feature}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-10">
                    <motion.button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#252742]/50 text-[#9BA3BF] rounded-full border border-[#3f2d63]/30 transition-all duration-300 group hover:text-white hover:border-violet-500/30"
                      style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
                    >
                      <FaArrowRight className="text-sm rotate-180 transition-transform duration-300 group-hover:-translate-x-1" />
                      <span>Previous</span>
                    </motion.button>

                    <div className="flex justify-center gap-2">
                      {steps.map((step, index) => (
                        <motion.div
                          key={step.id}
                          initial={{ scale: 0.8 }}
                          animate={{ 
                            scale: index === currentStep ? 1 : 0.8,
                            backgroundColor: index === currentStep ? '#8B5CF6' : '#252742'
                          }}
                          whileHover={{ scale: 1.2 }}
                          className={`w-2 h-2 rounded-full cursor-pointer transition-all duration-300`}
                          onClick={() => setCurrentStep(index)}
                        />
                      ))}
                    </div>

                    <motion.button
                      onClick={handleNext}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-full shadow-lg shadow-violet-900/20 transition-all duration-300 group"
                    >
                      <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                      <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingGuide;

export const showOnboarding = () => {
  // Get context functions from the hook
  const { setIsVisible, setCurrentStep } = useOnboarding();
  
  setIsVisible(true);
  setCurrentStep(0);
}; 