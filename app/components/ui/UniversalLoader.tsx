"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface UniversalLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
  variant?: 'dots' | 'spinner' | 'wave' | 'pulse';
  className?: string;
}

const UniversalLoader: React.FC<UniversalLoaderProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  variant = 'spinner',
  className = ''
}) => {
  // Размеры для разных вариантов
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-12 h-12', text: 'text-sm' },
    lg: { container: 'w-16 h-16', text: 'text-base' },
    xl: { container: 'w-24 h-24', text: 'text-lg' }
  };

  // Анимации для разных вариантов
  const renderLoader = () => {
    const { container } = sizes[size];

    switch (variant) {
      case 'dots':
        return (
          <div className={`flex items-center justify-center space-x-1 ${container}`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-[#20DDBB] rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        );

      case 'wave':
        return (
          <div className={`flex items-end justify-center space-x-1 ${container}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-[#20DDBB] to-[#018CFD] rounded-full"
                animate={{
                  height: ["20%", "100%", "20%"]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={`relative ${container}`}>
            <motion.div
              className="absolute inset-0 rounded-full bg-[#20DDBB]/20 border border-[#20DDBB]/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 0.3, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute inset-2 rounded-full bg-[#20DDBB]/40"
              animate={{
                scale: [1, 0.8, 1],
                opacity: [0.8, 0.4, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <div className="absolute inset-4 rounded-full bg-[#20DDBB]" />
          </div>
        );

      case 'spinner':
      default:
        return (
          <div className={`relative ${container}`}>
            {/* Outer spinning ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#20DDBB]/20 border-t-[#20DDBB]"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            {/* Inner pulsing core */}
            <motion.div
              className="absolute inset-3 rounded-full bg-[#20DDBB]/30 border border-[#20DDBB]/50"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.6, 0.8, 0.6]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Center dot */}
            <div className="absolute inset-5 rounded-full bg-[#20DDBB]" />
          </div>
        );
    }
  };

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {message && (
        <motion.p
          className={`text-white/80 font-medium ${sizes[size].text}`}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div className="bg-[#24183D]/90 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          {loaderContent}
        </div>
      </motion.div>
    );
  }

  return loaderContent;
};

export default UniversalLoader;
