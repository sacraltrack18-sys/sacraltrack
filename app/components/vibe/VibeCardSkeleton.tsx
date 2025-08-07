"use client";

import React from 'react';

export const VibeCardSkeleton = () => {
  return (
    <div className="mb-8 mx-auto w-full md:w-[450px]">
      <div className="bg-[#1A1A2E]/50 backdrop-blur-xl rounded-xl overflow-hidden border border-white/5 relative">
        {/* Header Section */}
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-4">
          {/* Avatar skeleton */}
          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full animate-pulse" />
          
          <div className="flex-1">
            {/* Username skeleton */}
            <div className="h-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded animate-pulse mb-1" style={{ width: '60%' }} />
            {/* Time skeleton */}
            <div className="h-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse" style={{ width: '40%' }} />
          </div>
          
          {/* Options button skeleton */}
          <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Image Section */}
      <div className="relative">
        <div className="w-full h-[500px] bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 animate-pulse" />
        
        {/* Play button overlay skeleton */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Caption skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded animate-pulse" style={{ width: '90%' }} />
          <div className="h-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse" style={{ width: '70%' }} />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Like button skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse" style={{ width: '20px' }} />
            </div>
            
            {/* Comment button skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse" style={{ width: '20px' }} />
            </div>
          </div>
          
          {/* Details button skeleton */}
          <div className="h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full animate-pulse" style={{ width: '80px' }} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default VibeCardSkeleton;
