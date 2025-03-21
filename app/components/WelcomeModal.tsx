"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const WelcomeModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Features to display in the carousel
  const features = [
    {
      title: "Music Streaming",
      description: "Stream high-quality tracks from emerging and established artists around the world",
      icon: "🎵"
    },
    {
      title: "Artist Platform",
      description: "Release your tracks, build a fan base, and earn royalties from streams and sales",
      icon: "🎙️"
    },
    {
      title: "Royalty Management",
      description: "Track your earnings in real-time and withdraw directly to your bank account",
      icon: "💰"
    },
    {
      title: "Community",
      description: "Connect with other music lovers, share playlists, and discover new artists",
      icon: "👥"
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
          setCurrentSlide(prev => (prev < features.length - 1 ? prev + 1 : prev));
        }, 3000);
        
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl modal-overlay"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-11/12 max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E2469] to-[#351E43] shadow-2xl border border-white/10"
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div 
                className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/5 blur-3xl"
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1],
                }} 
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                }}
              />
              <motion.div 
                className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/5 blur-3xl"
                animate={{ 
                  rotate: -360,
                  scale: [1, 1.2, 1],
                }} 
                transition={{
                  rotate: { duration: 25, repeat: Infinity, ease: "linear" },
                  scale: { duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }
                }}
              />
            </div>

            {/* Audio wave visualization */}
            <div className="absolute bottom-0 left-0 right-0 opacity-30">
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
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <Image 
                  src="/images/T-logo.svg" 
                  alt="Sacral Track Logo" 
                  width={80} 
                  height={80}
                  className="animate-glow"
                />
              </motion.div>
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
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
                A revolutionary music platform empowering artists and music lovers with advanced streaming technology and fair royalty distribution
              </motion.p>

              {/* Beta warning banner */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8 py-3 px-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-lg border border-yellow-500/30 max-w-2xl mx-auto"
              >
                <p className="text-yellow-400 font-medium flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>BETA MODE</span>
                </p>
                <p className="text-white/70 text-sm mt-1">
                  Sacral Track is currently in test mode. We're constantly improving the platform and do not take responsibility for any uploaded content during this phase.
                </p>
              </motion.div>

              {/* Features carousel */}
              <div className="max-w-2xl mx-auto mb-8 h-32">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white/5 rounded-xl p-6 border border-white/10"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#20DDBB]/20 to-[#8B5CF6]/20 rounded-full flex items-center justify-center mr-4 text-2xl">
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

              {/* Carousel indicators */}
              <div className="flex justify-center gap-2 mb-8">
                {features.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === currentSlide 
                        ? 'bg-[#20DDBB]' 
                        : 'bg-white/20 hover:bg-white/40'
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
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6] rounded-xl font-medium hover:shadow-lg hover:shadow-[#20DDBB]/20 transition-all transform hover:scale-105 active:scale-95"
                >
                  Get Started
                </button>
                <Link href="/terms" className="px-8 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-all">
                  Read Terms of Service
                </Link>
              </motion.div>

              {/* Copyright */}
              <p className="mt-8 text-white/40 text-sm">
                Copyright © {new Date().getFullYear()} Sacral Track. All rights reserved.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal; 