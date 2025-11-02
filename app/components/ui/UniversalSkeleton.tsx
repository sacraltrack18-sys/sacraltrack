"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface UniversalSkeletonProps {
  variant?: 'card' | 'line' | 'circle' | 'rectangle' | 'vibe' | 'user' | 'news';
  width?: string | number;
  height?: string | number;
  className?: string;
  animated?: boolean;
  count?: number;
}

const UniversalSkeleton: React.FC<UniversalSkeletonProps> = ({
  variant = 'line',
  width = '100%',
  height = '20px',
  className = '',
  animated = true,
  count = 1
}) => {
  // Базовые стили для skeleton
  const baseClass = `bg-gradient-to-r from-[#24183D]/40 via-[#2A2151]/60 to-[#24183D]/40 rounded-lg border border-white/5`;
  
  // Анимация shimmer эффекта
  const shimmerClass = animated ? 'animate-pulse' : '';
  
  // Создаем shimmer градиент
  const shimmerGradient = animated ? (
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#20DDBB]/10 to-transparent"
      animate={{ x: ['-100%', '100%'] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  ) : null;

  const renderSkeleton = (index: number = 0) => {
    switch (variant) {
      case 'card':
        return (
          <div key={index} className={`${baseClass} ${shimmerClass} ${className} relative overflow-hidden`} style={{ width, height: height || '300px' }}>
            {shimmerGradient}
            <div className="p-4 space-y-3">
              {/* Header with avatar and text */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#20DDBB]/20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#20DDBB]/20 rounded w-1/3" />
                  <div className="h-3 bg-[#20DDBB]/10 rounded w-1/4" />
                </div>
              </div>
              
              {/* Content lines */}
              <div className="space-y-2">
                <div className="h-4 bg-[#20DDBB]/20 rounded w-full" />
                <div className="h-4 bg-[#20DDBB]/20 rounded w-3/4" />
                <div className="h-4 bg-[#20DDBB]/20 rounded w-1/2" />
              </div>
              
              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-4">
                  <div className="w-6 h-6 bg-[#20DDBB]/20 rounded" />
                  <div className="w-6 h-6 bg-[#20DDBB]/20 rounded" />
                </div>
                <div className="h-6 bg-[#20DDBB]/20 rounded w-20" />
              </div>
            </div>
          </div>
        );

      case 'vibe':
        return (
          <div key={index} className={`${className} relative`}>
            <div className="bg-[#1A1A2E]/50 backdrop-blur-xl rounded-xl overflow-hidden border border-white/5 relative">
              {/* Header */}
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#20DDBB]/20 to-[#20DDBB]/10 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/10 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gradient-to-r from-[#20DDBB]/10 to-[#20DDBB]/5 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="w-full h-[500px] bg-gradient-to-br from-[#20DDBB]/20 via-[#20DDBB]/10 to-[#20DDBB]/5 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-[#20DDBB]/30 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/10 rounded animate-pulse w-full" />
                  <div className="h-4 bg-gradient-to-r from-[#20DDBB]/10 to-[#20DDBB]/5 rounded animate-pulse w-3/4" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex space-x-4">
                    <div className="w-6 h-6 bg-[#20DDBB]/20 rounded animate-pulse" />
                    <div className="w-6 h-6 bg-[#20DDBB]/20 rounded animate-pulse" />
                  </div>
                  <div className="h-8 bg-[#20DDBB]/20 rounded-full animate-pulse w-20" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'user':
        return (
          <motion.div 
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`aspect-[4/5] rounded-2xl relative overflow-hidden border border-white/10 backdrop-blur-sm ${className}`}
          >
            {/* Full-size background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E1A36]/60 to-[#2A2151]/80" />
            
            {/* Dark gradient overlay like real cards */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
            
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#20DDBB]/5 to-transparent animate-pulse" />
            
            {/* Content with same padding as real cards */}
            <div className="absolute inset-[5px] flex flex-col justify-between">
              {/* Top section - Rating placeholder */}
              <div className="flex justify-end">
                <div className="flex flex-col items-end">
                  {/* Rating stars placeholder */}
                  <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className="p-0.5">
                        <div className="w-3 h-3 rounded-sm bg-gray-600/40 animate-pulse" />
                      </div>
                    ))}
                  </div>
                  {/* Rating text placeholder */}
                  <div className="mt-1 h-4 w-12 bg-black/30 rounded px-2 py-0.5 animate-pulse" />
                </div>
              </div>

              {/* Bottom section - User info and stats */}
              <div className="space-y-3">
                {/* User name and rank placeholder */}
                <div>
                  <div className="h-5 w-32 bg-white/20 rounded mb-2 animate-pulse relative overflow-hidden">
                    {shimmerGradient}
                  </div>
                  <div className="h-4 w-20 bg-[#20DDBB]/20 rounded-full border border-white/20 animate-pulse" />
                </div>

                {/* Stats and friend button placeholder */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Friends count placeholder */}
                    <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-[#20DDBB]/40 animate-pulse" />
                        <div className="w-4 h-2 bg-white/30 rounded animate-pulse" />
                      </div>
                    </div>

                    {/* Ratings count placeholder */}
                    <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-yellow-400/40 animate-pulse" />
                        <div className="w-4 h-2 bg-white/30 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Friend action button placeholder */}
                  <div className="w-8 h-8 bg-[#20DDBB]/30 border border-[#20DDBB]/50 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'news':
        return (
          <div key={index} className={`${baseClass} ${shimmerClass} ${className} relative overflow-hidden`} style={{ width, height: height || '200px' }}>
            {shimmerGradient}
            <div className="p-4 space-y-3">
              {/* Image */}
              <div className="h-32 bg-[#20DDBB]/20 rounded-lg" />
              
              {/* Title */}
              <div className="h-5 bg-[#20DDBB]/30 rounded w-full" />
              <div className="h-5 bg-[#20DDBB]/20 rounded w-3/4" />
              
              {/* Description */}
              <div className="space-y-2">
                <div className="h-3 bg-[#20DDBB]/15 rounded w-full" />
                <div className="h-3 bg-[#20DDBB]/15 rounded w-2/3" />
              </div>
              
              {/* Meta */}
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 bg-[#20DDBB]/10 rounded w-20" />
                <div className="h-3 bg-[#20DDBB]/10 rounded w-16" />
              </div>
            </div>
          </div>
        );

      case 'circle':
        return (
          <div 
            key={index}
            className={`${baseClass} ${shimmerClass} ${className} rounded-full relative overflow-hidden`}
            style={{ width, height: height || width }}
          >
            {shimmerGradient}
          </div>
        );

      case 'rectangle':
        return (
          <div 
            key={index}
            className={`${baseClass} ${shimmerClass} ${className} relative overflow-hidden`}
            style={{ width, height }}
          >
            {shimmerGradient}
          </div>
        );

      case 'line':
      default:
        return (
          <div 
            key={index}
            className={`${baseClass} ${shimmerClass} ${className} relative overflow-hidden`}
            style={{ width, height }}
          >
            {shimmerGradient}
          </div>
        );
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, index) => renderSkeleton(index))}
    </div>
  );
};

export default UniversalSkeleton;
