"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import ClientOnly from "@/app/components/ClientOnly";

interface VibeButtonProps {
  onOpenVibeUploader: () => void;
}

const VibeButton = ({ onOpenVibeUploader }: VibeButtonProps) => {
  const userContext = useUser();
  const { setIsLoginOpen } = useGeneralStore();
  const [isClient, setIsClient] = useState(false);
  
  // Reduce animation dots for better performance
  const [animationDots, setAnimationDots] = useState<Array<{top: string, left: string}>>([]);
  
  // Generate animation dots on client-side only
  useEffect(() => {
    setIsClient(true);
    // Reduced number of dots from 10 to 5 for better performance
    const dots = Array(5).fill(0).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
    }));
    setAnimationDots(dots);
  }, []);

  const handleClick = () => {
    if (!userContext?.user) return setIsLoginOpen(true);
    onOpenVibeUploader();
  };

  return (
    <motion.button 
      onClick={handleClick} 
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#20DDBB]/20 group hover:bg-[#20DDBB]/30 transition-all duration-300 mr-4" 
      whileHover={{ scale: 1.03 }} 
      whileTap={{ scale: 0.97 }}
      id="vibe-button"
    >
      <div className="z-10 flex h-5 w-5 items-center justify-center">
        <SparklesIcon className="h-5 w-5 text-[#20DDBB] group-hover:text-white transition-colors duration-300" />
      </div>
      
      <ClientOnly>
        {isClient && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {animationDots.map((dot, i) => (
              <div
                key={i}
                className="opacity-0 group-hover:opacity-100 absolute w-1 h-1 rounded-full bg-white/80"
                style={{
                  top: dot.top,
                  left: dot.left,
                  // Use CSS variables for better performance
                  transition: `all ${0.5 + (i * 0.1)}s ease-out`,
                  transitionDelay: `${i * 0.05}s`,
                  transform: "scale(0)",
                  willChange: "opacity, transform"
                }}
              />
            ))}
          </div>
        )}
      </ClientOnly>
    </motion.button>
  );
};

export default React.memo(VibeButton); 