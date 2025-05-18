"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsVinyl } from "react-icons/bs";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";

const ReleaseButton = () => {
  const router = useRouter();
  const userContext = useUser();
  const { setIsLoginOpen } = useGeneralStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!userContext?.user) return setIsLoginOpen(true);
    console.log("[NAV] Navigating to upload page");
    router.push("/upload");
  };

  const baseButtonClass = "relative flex flex-col sm:flex-row h-[42px] sm:h-9 md:h-10 items-center justify-center rounded-full md:rounded-2xl px-3 sm:px-2 md:px-4 group transition-all duration-300 mr-2 md:mr-4 cursor-pointer";
  const baseIconClass = "z-10 flex h-4 md:h-5 w-4 md:w-5 items-center justify-center";
  const baseVinylClass = "h-4 w-4 md:h-5 md:w-5 text-blue-400 group-hover:text-indigo-400 transition-all duration-500";

  return (
    <motion.button
      onClick={handleClick}
      className={baseButtonClass}
      whileHover={{ 
        scale: 1.05,
        boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)"
      }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      id="release-button"
    >
      <motion.div 
        className="absolute inset-0 rounded-full md:rounded-2xl"
        style={{
          background: isHovered 
            ? "linear-gradient(90deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.3))" 
            : "linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))"
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div 
        className="absolute inset-0 rounded-full md:rounded-2xl border"
        style={{
          borderColor: isHovered 
            ? "rgba(59, 130, 246, 0.6)" 
            : "rgba(59, 130, 246, 0.3)"
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
          <BsVinyl className={baseVinylClass} />
        </motion.div>
      </div>
      
      <motion.span 
        className="sm:ml-1 md:ml-1.5 text-white font-semibold text-[10px] sm:text-xs md:text-sm tracking-wider mt-0.5 sm:mt-0"
        animate={{
          x: isHovered ? 2 : 0,
          color: isHovered ? "#93c5fd" : "#ffffff"
        }}
        transition={{ duration: 0.3 }}
      >
        Release
      </motion.span>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-blue-500/30"
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full md:rounded-2xl border border-blue-500/50"
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

export default React.memo(ReleaseButton); 