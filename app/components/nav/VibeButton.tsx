"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsStars } from "react-icons/bs";
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
  const [isHovered, setIsHovered] = useState(false);
  
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

  // Updated baseButtonClass with reduced margins and padding for mobile
  const baseButtonClass = "relative flex h-9 md:h-10 items-center justify-center rounded-full md:rounded-2xl px-2 md:px-4 group transition-all duration-300 mr-2 md:mr-4 cursor-pointer";
  const baseIconClass = "z-10 flex h-4 md:h-5 w-4 md:w-5 items-center justify-center";
  const baseStarsClass = "h-4 w-4 md:h-5 md:w-5 text-purple-400 group-hover:text-blue-400 transition-all duration-500";

  return (
    <motion.button 
      onClick={handleClick} 
      className={baseButtonClass}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 0 15px rgba(147, 51, 234, 0.5)"
      }} 
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      id="vibe-button"
    >
      <motion.div 
        className="absolute inset-0 rounded-full md:rounded-2xl"
        style={{
          background: isHovered 
            ? "linear-gradient(90deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3))" 
            : "linear-gradient(90deg, rgba(147, 51, 234, 0.1), rgba(59, 130, 246, 0.1))"
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div 
        className="absolute inset-0 rounded-full md:rounded-2xl border"
        style={{
          borderColor: isHovered 
            ? "rgba(147, 51, 234, 0.6)" 
            : "rgba(147, 51, 234, 0.3)"
        }}
        transition={{ duration: 0.3 }}
      />
      
      <div className={baseIconClass}>
        <motion.div
          animate={{ 
            rotate: isHovered ? 360 : 0,
            scale: isHovered ? 1.2 : 1
          }}
          transition={{ 
            rotate: { duration: 0.8, ease: "easeInOut" },
            scale: { duration: 0.3 }
          }}
        >
          <BsStars className={baseStarsClass} />
        </motion.div>
      </div>
      
      <motion.span 
        className="ml-1 md:ml-1.5 text-white font-semibold text-xs md:text-sm tracking-wider"
        animate={{
          x: isHovered ? 2 : 0,
          color: isHovered ? "#a78bfa" : "#ffffff"
        }}
        transition={{ duration: 0.3 }}
      >
        Vibe
      </motion.span>
      
      <ClientOnly>
        {isClient && (
          <div className="absolute inset-0 overflow-hidden rounded-full md:rounded-2xl">
            {animationDots.map((dot, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/80"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: isHovered ? 1 : 0,
                  scale: isHovered ? 1 : 0,
                  x: isHovered ? [0, Math.random() * 10 - 5, 0] : 0,
                  y: isHovered ? [0, Math.random() * 10 - 5, 0] : 0
                }}
                transition={{
                  opacity: { duration: 0.3, delay: i * 0.05 },
                  scale: { duration: 0.3, delay: i * 0.05 },
                  x: { duration: 1, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 },
                  y: { duration: 1, repeat: Infinity, repeatType: "reverse", delay: i * 0.1 }
                }}
                style={{
                  top: dot.top,
                  left: dot.left,
                }}
              />
            ))}
          </div>
        )}
      </ClientOnly>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full md:rounded-2xl border border-purple-500/50"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default React.memo(VibeButton); 