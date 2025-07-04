"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TestAdBannerProps {
  adWidth?: number;
  adHeight?: number;
  className?: string;
  showAdsTerraInfo?: boolean;
}

const TestAdBanner: React.FC<TestAdBannerProps> = ({
  adWidth = 300,
  adHeight = 250,
  className = '',
  showAdsTerraInfo = false
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/40 overflow-hidden ${className}`}
      style={{ 
        width: `${adWidth}px`, 
        height: `${adHeight}px`,
        maxWidth: '100%'
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
      >
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Декоративный фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10"></div>
      <div className="absolute top-4 right-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-blue-500/20 rounded-full blur-lg"></div>
      
      {/* Контент */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div className="text-white font-bold text-lg mb-2">
          {showAdsTerraInfo ? 'Ad Space Available' : 'SacralTrack Premium'}
        </div>
        <div className="text-white/80 text-sm mb-4 leading-relaxed">
          {showAdsTerraInfo ? (
            adHeight > 150 ? (
              <>AdsTerra ads are not available on localhost.<br/>This space will show ads in production.</>
            ) : (
              <>Ad space available in production</>
            )
          ) : (
            adHeight > 150 ? (
              <>Unlock exclusive features, ad-free experience, and premium content</>
            ) : (
              <>Support us by upgrading to Premium</>
            )
          )}
        </div>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span>High-quality audio streaming</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span>Unlimited downloads</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span>Exclusive releases</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {showAdsTerraInfo ? (
            <>
              <button
                onClick={() => console.log('Testing AdsTerra in production')}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-full transition-all duration-300 transform hover:scale-105"
              >
                Test in Production
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-all duration-300"
              >
                Reload
              </button>
            </>
          ) : (
            <>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-full transition-all duration-300 transform hover:scale-105">
                Upgrade Now
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-all duration-300">
                Learn More
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TestAdBanner;
