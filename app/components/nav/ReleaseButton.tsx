"use client";

import React from "react";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { useRouter } from "next/navigation";

const ReleaseButton = () => {
  const userContext = useUser();
  const { setIsLoginOpen } = useGeneralStore();
  const router = useRouter();
  
  const handleRelease = () => {
    if (!userContext?.user) return setIsLoginOpen(true);
    router.push('/upload');
  };
  
  return (
    <button 
      id="release-button"
      onClick={handleRelease}
      className="flex items-center rounded-2xl py-[6px] px-2 md:px-[15px] transition-transform hover:scale-105 active:scale-95"
    >
      <ArrowTrendingUpIcon className="w-[24px] h-[24px] text-green-400" />
      <span className="ml-2 font-medium text-[13px] hidden md:inline">RELEASE</span>
    </button>
  );
};

export default React.memo(ReleaseButton); 