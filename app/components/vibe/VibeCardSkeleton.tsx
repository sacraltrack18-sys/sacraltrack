"use client";

import React from 'react';
import UniversalSkeleton from '../ui/UniversalSkeleton';

export const VibeCardSkeleton = () => {
  return (
    <div className="mb-8 mx-auto w-full md:w-[450px]">
      <UniversalSkeleton variant="vibe" />
    </div>
  );
};

export default VibeCardSkeleton;
