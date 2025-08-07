"use client";

import React from "react";

interface SimpleLoadingCardProps {
  className?: string;
}

const SimpleLoadingCard: React.FC<SimpleLoadingCardProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm aspect-[4/5] ${className}`}
    >
      {/* Simple gradient background without animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/2" />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />

      {/* Content with 5px padding */}
      <div className="absolute inset-[5px] flex flex-col justify-between">
        {/* Top section - Rating placeholder */}
        <div className="flex justify-end">
          <div className="flex flex-col items-end">
            <div className="flex items-center bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
              {/* Simple star placeholders */}
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="w-3 h-3 mx-0.5 rounded-full bg-gray-600"
                />
              ))}
            </div>
            <div className="mt-1 text-xs text-white/60 bg-black/30 rounded px-2 py-0.5">
              --
            </div>
          </div>
        </div>

        {/* Bottom section - User info placeholder */}
        <div className="space-y-3">
          {/* User name and rank placeholder */}
          <div>
            <div className="h-5 w-24 bg-white/20 rounded mb-1" />
            <div className="inline-block px-2 py-0.5 rounded-full bg-gray-500/50 border border-gray-400/30">
              <div className="h-3 w-16 bg-white/30 rounded" />
            </div>
          </div>

          {/* Stats and button placeholder */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Friends count placeholder */}
              <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#20DDBB]/50" />
                  <div className="h-3 w-4 bg-white/40 rounded" />
                </div>
              </div>

              {/* Ratings count placeholder */}
              <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                  <div className="h-3 w-4 bg-white/40 rounded" />
                </div>
              </div>
            </div>

            {/* Friend action button placeholder */}
            <div className="backdrop-blur-md rounded-full p-2 border border-[#20DDBB]/30 bg-[#20DDBB]/20">
              <div className="w-4 h-4 rounded-full bg-[#20DDBB]/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoadingCard;
