"use client";

import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Genre } from "@/app/types";
import { GenreContext } from "@/app/context/GenreContext";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

// Import genres from the data file
import { uniqueGenres } from './genreData';

interface GenreSelectorProps {
  isHomePage: boolean;
}

// Определяем логические группы жанров
const genreGroups = [
  { id: "all", name: "All", emoji: "✨" },
  { id: "house", name: "House", emoji: "🏠" },
  { id: "techno", name: "Techno", emoji: "🤖" },
  { id: "trance", name: "Trance", emoji: "🔄" },
  { id: "bass", name: "Bass", emoji: "🔊" },
  { id: "ambient", name: "Ambient", emoji: "🌌" },
  { id: "indie", name: "Indie", emoji: "🎸" },
  { id: "other", name: "Other", emoji: "🎵" },
];

// Функция для определения к какой группе относится жанр
const getGenreGroup = (genreName: string): string => {
  const lowerName = genreName.toLowerCase();
  
  if (lowerName === "all") return "all";
  if (lowerName.includes("house") || lowerName.includes("afro") || lowerName.includes("disco")) return "house";
  if (lowerName.includes("techno") || lowerName.includes("tech") || lowerName.includes("minimal")) return "techno";
  if (lowerName.includes("trance") || lowerName.includes("psy")) return "trance";
  if (lowerName.includes("bass") || lowerName.includes("dubstep") || lowerName.includes("trap") || lowerName.includes("garage")) return "bass";
  if (lowerName.includes("ambient") || lowerName.includes("chill") || lowerName.includes("downtempo") || lowerName.includes("idm") || lowerName.includes("experimental")) return "ambient";
  if (lowerName.includes("indie") || lowerName.includes("pop") || lowerName.includes("dance")) return "indie";
  
  return "other";
};

// Группируем жанры по категориям
const getGenresByGroup = () => {
  const grouped: Record<string, Genre[]> = {};
  
  // Инициализируем группы
  genreGroups.forEach(group => {
    grouped[group.id] = [];
  });
  
  // Распределяем жанры по группам
  uniqueGenres.forEach(genre => {
    const group = getGenreGroup(genre.name);
    grouped[group].push(genre);
  });
  
  return grouped;
};

const GenreSelector = ({ isHomePage }: GenreSelectorProps) => {
  const [showGenresPopup, setShowGenresPopup] = useState(false);
  const [activeGroup, setActiveGroup] = useState("all");
  const { setSelectedGenre, selectedGenre } = useContext(GenreContext);
  const groupedGenres = getGenresByGroup();

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

      {/* Genre Popup - Улучшенный с табами */}
      <AnimatePresence>
        {showGenresPopup && (
          <>
            {/* Overlay for click-outside closing */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30"
              onClick={() => setShowGenresPopup(false)}
            />
            
            {/* Главное меню выбора жанров */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 top-[60px] z-40 
                          bg-gradient-to-b from-[#24183D]/80 to-[#1D142F]/80 backdrop-blur-xl border-b border-white/10
                          shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              {/* Категории (табы) - с горизонтальной прокруткой на мобильных */}
              <div className="overflow-x-auto custom-scrollbar border-b border-white/10">
                <div className="flex space-x-1 p-2 md:p-3 min-w-max md:justify-center">
                  {genreGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setActiveGroup(group.id)}
                      className={`px-3 py-2 md:px-4 md:py-2.5 rounded-lg flex items-center space-x-1.5 transition-all
                        whitespace-nowrap text-[13px] md:text-sm font-medium
                        ${activeGroup === group.id 
                          ? 'bg-[#20DDBB]/20 text-[#20DDBB] shadow-[0_0_10px_rgba(32,221,187,0.15)]' 
                          : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                    >
                      <span className="text-lg">{group.emoji}</span>
                      <span>{group.name}</span>
                      {activeGroup === group.id && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#20DDBB] text-black rounded-full">
                          {group.id === "all" ? uniqueGenres.length : groupedGenres[group.id].length}
                        </motion.span>
                      )}
                    </button>
                  ))}
                  
                  {/* Кнопка сброса жанров */}
                  {selectedGenre !== 'all' && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        setSelectedGenre('all');
                        setShowGenresPopup(false);
                        toast.success("Showing all genres", {
                          icon: "🎵",
                          style: {
                            backgroundColor: '#24183D',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }
                        });
                      }}
                      className="px-3 py-2 md:px-4 md:py-2.5 rounded-lg flex items-center space-x-1.5 transition-all
                      whitespace-nowrap text-[13px] md:text-sm font-medium bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/30 
                      text-[#20DDBB] hover:from-[#20DDBB]/30 hover:to-[#20DDBB]/40 border border-[#20DDBB]/20"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Reset All</span>
                    </motion.button>
                  )}
                </div>
              </div>
              
              {/* Содержимое вкладки - отображение выбранных жанров */}
              <div className="p-3 md:p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                  {/* Специальная карточка "All Genres" */}
                  {selectedGenre !== 'all' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 flex justify-center"
                    >
                      <button
                        onClick={() => handleGenreSelect('All')}
                        className="px-5 py-3 bg-gradient-to-r from-[#20DDBB]/20 to-[#20DDBB]/40 
                          text-[#20DDBB] hover:from-[#20DDBB]/30 hover:to-[#20DDBB]/50 
                          rounded-lg shadow-lg border border-[#20DDBB]/30 
                          flex items-center gap-3 transition-all duration-200
                          hover:scale-105 hover:shadow-[0_0_20px_rgba(32,221,187,0.2)]"
                      >
                        <div className="w-8 h-8 flex items-center justify-center bg-[#20DDBB]/30 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-lg">Reset to All Genres</div>
                          <div className="text-xs text-[#20DDBB]/70">Show tracks from all genres</div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                  
                  {/* Категория "All" показывает все жанры */}
                  {activeGroup === "all" ? (
                    <div className="space-y-4">
                      {genreGroups.filter(g => g.id !== "all").map((group) => (
                        <div key={group.id} className="mb-4">
                          <div className="flex items-center mb-2 text-[#20DDBB]/80">
                            <span className="text-lg mr-2">{group.emoji}</span>
                            <h3 className="font-semibold text-md">{group.name}</h3>
                            <div className="ml-2 h-px flex-grow bg-[#20DDBB]/20"></div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 md:gap-3">
                            {groupedGenres[group.id].sort((a, b) => a.name.localeCompare(b.name)).map((genre) => (
                              <GenreButton 
                                key={genre.id}
                                genre={genre}
                                isSelected={selectedGenre === genre.name.toLowerCase()}
                                onSelect={handleGenreSelect}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                      {groupedGenres[activeGroup].sort((a, b) => a.name.localeCompare(b.name)).map((genre) => (
                        <GenreButton 
                          key={genre.id}
                          genre={genre}
                          isSelected={selectedGenre === genre.name.toLowerCase()}
                          onSelect={handleGenreSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Нижняя панель с дополнительной информацией */}
              <div className="p-3 border-t border-white/10 bg-black/20 backdrop-blur-md flex justify-between items-center">
                <span className="text-xs text-white/40">
                  {activeGroup === "all" 
                    ? `All genres (${uniqueGenres.length})` 
                    : `${activeGroup} (${groupedGenres[activeGroup].length})`}
                </span>
                
                <div className="flex items-center gap-3">
                  {/* Кнопка сброса фильтра жанров */}
                  <motion.button
                    onClick={() => {
                      setSelectedGenre("all");
                      setShowGenresPopup(false);
                      toast.success("Showing all genres", {
                        icon: "🎵",
                        style: {
                          backgroundColor: '#24183D',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }
                      });
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 text-sm rounded-lg bg-[#20DDBB]/20 text-[#20DDBB] border border-[#20DDBB]/20 
                      hover:bg-[#20DDBB]/30 transition-all duration-200 flex items-center gap-1.5`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset to All
                  </motion.button>
                  
                  <button 
                    onClick={() => setShowGenresPopup(false)}
                    className="px-3 py-1.5 text-sm rounded-lg text-gray-300 border border-gray-700/50 
                      hover:bg-white/5 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Улучшенная кнопка жанра, теперь с возможностью показа эмоджи группы
import React from 'react';

interface GenreButtonProps {
  genre: Genre;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

const GenreButton = React.memo(({ genre, isSelected, onSelect }: GenreButtonProps) => {
  // Получаем эмоджи для группы жанра
  const groupEmoji = genreGroups.find(g => g.id === getGenreGroup(genre.name))?.emoji || "🎵";
  
  return (
    <motion.button
      onClick={() => onSelect(genre.name)}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`px-3 md:px-4 py-2 md:py-2.5 text-[13px] md:text-[14px] 
          ${isSelected 
              ? 'bg-gradient-to-r from-[#20DDBB] to-[#20DDBB]/90 text-black shadow-[0_0_15px_rgba(32,221,187,0.3)]' 
              : 'bg-[#2E2469]/30 text-white hover:bg-[#2E2469]/50 border border-white/5 hover:border-white/20'
          } rounded-full transition-all duration-300 
          whitespace-nowrap font-medium backdrop-blur-sm
          hover:shadow-[0_0_15px_rgba(32,221,187,0.15)]
          hover:bg-gradient-to-r hover:from-[#2E2469]/50 hover:to-[#2E2469]/30
          relative overflow-hidden group`}
    >
      <span className="relative z-10 flex items-center">
        {isSelected ? (
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
        ) : (
          <span className="mr-1.5 text-[10px] opacity-70">{groupEmoji}</span>
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