"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const WelcomeModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Features to display in the carousel - updated for consistency with other components
  const features = [
    {
      title: "Music Streaming Platform",
      description: "Enjoy high-quality audio streaming (192-256 kbps) and premium downloads (WAV & 320 kbps) from emerging and established artists",
      icon: "🎵"
    },
    {
      title: "Music Marketplace",
      description: "Buy and sell music directly with transparent pricing and fair artist royalties, supporting creators directly",
      icon: "💽"
    },
    {
      title: "Social Network",
      description: "Connect with music artists and fans, share vibes, follow creators, and participate in a vibrant music community",
      icon: "👥"
    },
    {
      title: "Artist Recognition",
      description: "Discover and gain visibility with Top 100 charts, user ratings, and trending content features",
      icon: "🏆"
    }
  ];

  useEffect(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('sacraltrack_welcomed');
    
    if (!hasVisited) {
      // Show the welcome modal only on first visit
      setIsVisible(true);
      
      // Start the feature carousel
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          setCurrentSlide(prev => (prev < features.length - 1 ? prev + 1 : 0));
        }, 4000);
        
        return () => clearInterval(interval);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    // Set the flag in localStorage
    localStorage.setItem('sacraltrack_welcomed', 'true');
    // Close the modal
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-11/12 max-w-4xl overflow-hidden rounded-2xl bg-[#1A2338]/70 backdrop-blur-xl shadow-2xl border border-white/10"
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div 
                className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/5 blur-3xl"
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }} 
                transition={{
                  rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                  scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
              />
              <motion.div 
                className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/5 blur-3xl"
                animate={{ 
                  rotate: -360,
                  scale: [1, 1.2, 1],
                }} 
                transition={{
                  rotate: { duration: 35, repeat: Infinity, ease: "linear" },
                  scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                }}
              />
            </div>

            {/* Audio wave visualization */}
            <div className="absolute bottom-0 left-0 right-0 opacity-20">
              <Image 
                src="/images/wave-visualizer.svg" 
                alt="Audio Wave" 
                width={800} 
                height={200}
                className="w-full transform scale-y-50"
              />
            </div>

            {/* Logo and header */}
            <div className="relative z-10 p-8 pt-10 text-center">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-[#20DDBB] blur-xl opacity-30 rounded-full scale-125"></div>
                  <Image 
                    src="/images/T-logo.svg" 
                    alt="Sacral Track Logo" 
                    width={80} 
                    height={80}
                    className="relative z-10"
                  />
                </div>
              </motion.div>
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-3xl md:text-4xl font-bold mb-2 text-white"
              >
                Welcome to <span className="bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] bg-clip-text text-transparent">Sacral Track</span>
              </motion.h2>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 mb-8 max-w-2xl mx-auto"
              >
                The premier music streaming platform, marketplace and social network for music artists and lovers with high-quality audio and fair royalty distribution
              </motion.p>

              {/* Beta warning banner */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8 py-3 px-6 bg-[#1A2338]/80 backdrop-blur-sm rounded-lg border border-yellow-500/30 max-w-2xl mx-auto"
              >
                <p className="text-yellow-400 font-medium flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>BETA VERSION</span>
                </p>
                <p className="text-white/70 text-sm mt-1">
                  We're constantly improving the platform. Explore features and help us make it better!
                </p>
              </motion.div>

              {/* Features carousel - with updated animations */}
              <div className="max-w-2xl mx-auto mb-8 h-36">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                    className="bg-[#252742]/50 backdrop-blur-md rounded-xl p-6 border border-white/10 h-full"
                  >
                    <div className="flex items-center h-full">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#20DDBB]/20 to-[#8B5CF6]/20 backdrop-blur-xl rounded-full flex items-center justify-center mr-4 text-2xl">
                        {features[currentSlide].icon}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-xl font-semibold text-white mb-1">{features[currentSlide].title}</h3>
                        <p className="text-white/70 text-sm">{features[currentSlide].description}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Carousel indicators - with improved design */}
              <div className="flex justify-center gap-2 mb-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    className={`transition-all duration-300 ${
                      index === currentSlide 
                        ? 'w-8 h-2.5 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] rounded-full' 
                        : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40 rounded-full'
                    }`}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </div>

              {/* Call to action buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row justify-center gap-4 max-w-xl mx-auto"
              >
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] rounded-xl font-medium shadow-lg shadow-[#20DDBB]/20 transition-all"
                >
                  Get Started
                </motion.button>
                <Link href="/terms" className="px-8 py-3 bg-white/10 backdrop-blur-md rounded-xl font-medium hover:bg-white/20 transition-all">
                  Read Terms of Service
                </Link>
              </motion.div>

              {/* Copyright */}
              <p className="mt-8 text-white/40 text-sm">
                Copyright © {new Date().getFullYear()} Sacral Track. All rights reserved.
              </p>
            </div>

            {/* Close button */}
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 backdrop-blur-md transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal; 