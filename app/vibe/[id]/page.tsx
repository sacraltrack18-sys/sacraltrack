"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useVibeStore, VibePostWithProfile } from '@/app/stores/vibeStore';
import VibeDetailPage from '@/app/components/vibe/VibeDetailPage';

const VibePage = () => {
  const params = useParams();
  const { fetchVibeById, vibePostById, isLoadingVibes, error } = useVibeStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVibe = async () => {
      setIsLoading(true);
      if (params.id) {
        await fetchVibeById(params.id as string);
      }
      setIsLoading(false);
    };

    loadVibe();
  }, [params.id, fetchVibeById]);

  if (isLoading || isLoadingVibes) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 pr-0 md:pr-6 mb-8 md:mb-0">
            <div className="animate-pulse rounded-xl overflow-hidden h-[500px] bg-white/5"></div>
          </div>
          <div className="w-full md:w-1/3 bg-white/5 rounded-xl animate-pulse h-[500px]"></div>
        </div>
      </div>
    );
  }

  if (error || !vibePostById) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-[#24183D] to-[#0F172A] text-white items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-2xl font-bold mb-4">Vibe Not Found</h1>
          <p className="text-gray-400 mb-6">
            The musical vibe you're looking for might have been deleted or doesn't exist.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 bg-[#20DDBB]/20 hover:bg-[#20DDBB]/40 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <VibeDetailPage vibe={vibePostById} />;
};

export default VibePage; 