"use client";

import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Genre } from "@/app/types";
import { GenreContext } from "@/app/context/GenreContext";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

// Extract genres to a separate file to avoid re-creating on each render
import { genres } from './genreData';

interface GenreSelectorProps {
  isHomePage: boolean;
}

const GenreSelector = ({ isHomePage }: GenreSelectorProps) => {
  const [showGenresPopup, setShowGenresPopup] = useState(false);
  const { setSelectedGenre, selectedGenre } = useContext(GenreContext);

  const handleGenresClick = () => {
    setShowGenresPopup(!showGenresPopup);
  };

  const handleGenreSelect = (genreName: string) => {
    const normalizedGenre = genreName.toLowerCase();
    setSelectedGenre(normalizedGenre);
    setShowGenresPopup(false);
    
    // Show toast notification with optimized animations
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-[#24183D]/90 backdrop-blur-xl shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-10 h-10 rounded-full bg-[#20DDBB]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                Genre selected
              </p>
              <button 
                onClick={() => {
                  toast.dismiss(t.id);
                  setShowGenresPopup(true);
                }}
                className="mt-1 text-sm relative group cursor-pointer"
              >
                <span className="text-[#20DDBB] group-hover:text-white transition-colors duration-200">
                  {genreName}
                </span>
                <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-white 
                      group-hover:w-full transition-all duration-300"></span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/10">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-10 h-full flex items-center justify-center rounded-r-lg 
                     text-white hover:text-[#20DDBB] transition-colors duration-150"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                d="M6 18L18 6M6 6l12 12">
              </path>
            </svg>
          </button>
        </div>
      </motion.div>
    ), {
      duration: 3000,
      position: 'top-center',
    });
  };

  if (!isHomePage) return null;

  return (
    <>
      <button
        id="genres-button"
        className="text-white text-[13px] flex items-center"
        onClick={handleGenresClick}
      >
        <MusicalNoteIcon className="w-[24px] h-[24px] text-blue-400 transition-transform duration-200 hover:scale-110" />
        <span className="ml-2 font-medium text-[13px] hidden md:inline">GENRES</span>
      </button>

      {/* Genre Popup - Mobile Optimized */}
      <AnimatePresence>
        {showGenresPopup && (
          <>
            {/* Overlay for click-outside closing */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-30"
              onClick={() => setShowGenresPopup(false)}
            />
            
            {/* Genres popup with enhanced styling */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 top-[60px] z-40 p-4 md:p-6 
                        bg-[#24183D]/40 backdrop-blur-xl border-b border-white/5
                        shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
            >
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                  {genres
                    .sort((a, b) => {
                      if (a.name === 'All') return -1;
                      if (b.name === 'All') return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((genre) => (
                      <GenreButton 
                        key={genre.id}
                        genre={genre}
                        isSelected={selectedGenre === genre.name.toLowerCase()}
                        onSelect={handleGenreSelect}
                      />
                    ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Memoized genre button to prevent unnecessary re-renders
import React from 'react';

interface GenreButtonProps {
  genre: Genre;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

const GenreButton = React.memo(({ genre, isSelected, onSelect }: GenreButtonProps) => {
  return (
    <motion.button
      onClick={() => onSelect(genre.name)}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`px-4 md:px-6 py-2 md:py-3 text-[13px] md:text-[14px] 
          ${isSelected 
              ? 'bg-[#20DDBB] text-black shadow-[0_0_15px_rgba(32,221,187,0.3)]' 
              : 'bg-[#2E2469]/30 text-white hover:bg-[#2E2469]/50 border border-white/5 hover:border-white/20'
          } rounded-full transition-all duration-300 
          whitespace-nowrap font-medium backdrop-blur-sm
          hover:shadow-[0_0_15px_rgba(32,221,187,0.15)]
          hover:bg-gradient-to-r hover:from-[#2E2469]/50 hover:to-[#2E2469]/30
          relative overflow-hidden group`}
    >
      <span className="relative z-10 flex items-center">
        {isSelected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mr-1.5 inline-block"
          >
            <svg 
              className="w-4 h-4 text-black" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" 
              />
            </svg>
          </motion.span>
        )}
        <span>{genre.name}</span>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/0 to-[#20DDBB]/0 
            group-hover:from-[#20DDBB]/10 group-hover:to-[#20DDBB]/0 
            transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
      
      {/* Optimize the hover animation to use will-change for better performance */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-40 group-hover:opacity-0 transition-opacity"
        style={{ 
          boxShadow: "0 0 0 2px rgba(32, 221, 187, 0.3)",
          willChange: "opacity, transform",
          transition: "opacity 1.5s ease, transform 1.5s ease",
        }}
      />
    </motion.button>
  );
});

GenreButton.displayName = 'GenreButton';

export default GenreSelector; 