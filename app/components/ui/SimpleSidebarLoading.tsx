"use client";

import React from "react";

interface SimpleSidebarLoadingProps {
  itemsCount?: number;
  className?: string;
}

const SimpleSidebarLoading: React.FC<SimpleSidebarLoadingProps> = ({
  itemsCount = 5,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: itemsCount }).map((_, index) => (
        <div
          key={index}
          className="p-3 rounded-xl bg-white/5 border border-white/5"
        >
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/5" />

            {/* User info placeholder */}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>

            {/* Rating/rank placeholder */}
            <div className="flex flex-col items-end space-y-1">
              <div className="h-3 w-8 bg-white/10 rounded" />
              <div className="h-2 w-6 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SimpleSidebarLoading;
