import { useState, useEffect } from 'react';
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

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
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

let showOnboardingCallback: (() => void) | null = null;

export function showOnboarding() {
  if (showOnboardingCallback) {
    showOnboardingCallback();
  }
}

export default function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const userContext = useUser();
  if (!userContext) {
    return null; // or handle the null case appropriately
  }
  const { user } = userContext;

  useEffect(() => {
    showOnboardingCallback = () => {
      setCurrentStep(0);
      setIsVisible(true);
    };

    return () => {
      showOnboardingCallback = null;
    };
  }, []);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    if (userContext?.user?.id) {
      localStorage.setItem(`user_${userContext.user.id}_onboarded`, 'true');
    }
    localStorage.setItem('onboardingCompleted', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <div className="relative w-full max-w-3xl p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative overflow-hidden bg-[#1A2338]/80 backdrop-blur-xl p-8 rounded-xl border border-[#20DDBB]/20 shadow-xl"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                  className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#20DDBB]/10 to-[#20DDBB]/5 blur-3xl"
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }} 
                  transition={{
                    rotate: { duration: 35, repeat: Infinity, ease: "linear" },
                    scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
                <motion.div 
                  className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/5 blur-3xl"
                  animate={{ 
                    rotate: -360,
                    scale: [1, 1.2, 1],
                  }} 
                  transition={{
                    rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                    scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
              </div>

              <motion.button
                onClick={handleComplete}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                className="absolute top-4 right-4 text-[#818BAC] hover:text-white transition-colors z-10 p-2 rounded-full bg-white/10 backdrop-blur-md"
                aria-label="Close onboarding"
              >
                <FaTimes className="w-5 h-5" />
              </motion.button>

              {currentStep === 0 ? (
                <div className="text-center relative z-10">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8"
                  >
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <motion.div
                        animate={{ 
                          rotate: 360,
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ 
                          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full opacity-20 blur-xl"
                      />
                      <div className="relative z-10 flex items-center justify-center h-full pt-2">
                        <FaCompactDisc className="text-6xl text-violet-300" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">
                      Welcome to Sacral Track
                    </h2>
                    <p className="text-[#9BA3BF] mb-8 max-w-lg mx-auto">
                      The premier music streaming platform, marketplace and social network for music artists and lovers with high-quality audio and fair royalty distribution.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
                      <motion.div 
                        className="p-4 rounded-lg bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30"
                        whileHover={{ scale: 1.05, borderColor: 'rgba(128, 90, 213, 0.5)' }}
                      >
                        <FaMusic className="text-2xl text-violet-300 mx-auto mb-2" />
                        <p className="text-sm text-[#9BA3BF]">Create & Share</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 rounded-lg bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30"
                        whileHover={{ scale: 1.05, borderColor: 'rgba(128, 90, 213, 0.5)' }}
                      >
                        <FaHeadphones className="text-2xl text-violet-300 mx-auto mb-2" />
                        <p className="text-sm text-[#9BA3BF]">Listen & Collect</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 rounded-lg bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30"
                        whileHover={{ scale: 1.05, borderColor: 'rgba(128, 90, 213, 0.5)' }}
                      >
                        <FaCamera className="text-2xl text-violet-300 mx-auto mb-2" />
                        <p className="text-sm text-[#9BA3BF]">Share Vibes</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 rounded-lg bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30"
                        whileHover={{ scale: 1.05, borderColor: 'rgba(128, 90, 213, 0.5)' }}
                      >
                        <FaChartLine className="text-2xl text-violet-300 mx-auto mb-2" />
                        <p className="text-sm text-[#9BA3BF]">Earn & Grow</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.05, backgroundColor: '#4e377a' }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white rounded-full shadow-lg shadow-violet-900/20 transition-all group"
                  >
                    <span>Explore Features</span>
                    <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
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
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                      <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl" />
                      <div className="relative z-10 flex items-center justify-center h-full">
                        {steps[currentStep].icon}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-[#9BA3BF] mb-6 max-w-md mx-auto">
                      {steps[currentStep].description}
                    </p>
                    
                    {steps[currentStep].features?.map((feature, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.03, backgroundColor: 'rgba(50, 45, 70, 0.5)' }}
                        className="p-4 rounded-lg bg-[#252742]/50 backdrop-blur-sm border border-[#3f2d63]/30 hover:border-violet-500/30 transition-all flex items-center"
                      >
                        <FaCheckCircle className="text-[#20DDBB] mr-3 flex-shrink-0" />
                        <p className="text-sm text-left text-[#9BA3BF]">{feature}</p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    onClick={handleNext}
                    whileHover={{ scale: 1.05, backgroundColor: '#4e377a' }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#3f2d63] to-[#4e377a] text-white rounded-full shadow-lg shadow-violet-900/20 transition-all group"
                  >
                    <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                    <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
                  </motion.button>

                  <div className="mt-6 flex justify-center gap-2">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentStep
                            ? 'bg-violet-400 w-4'
                            : 'bg-[#252742]'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 