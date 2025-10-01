"use client";

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/app/context/user';
import { useVibeStore } from '@/app/stores/vibeStore';
import { HiMusicNote } from 'react-icons/hi';
import { FaGlobeAmericas, FaGem } from 'react-icons/fa';
import { 
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ContentFilterContext } from '@/app/context/ContentFilterContext';

// Content filter types
type ContentType = 'all' | 'vibe' | 'stracks' | 'tracks';

// Обновленная иконка для All Content - кружок
const AllContentIcon = ({ className = "w-5 h-5" }) => (
  <span className={className + " inline-block rounded-full bg-gradient-to-br from-[#20DDBB] to-[#8B5CF6]"} style={{ width: '20px', height: '20px' }} />
);

// Обновленная иконка для Vibe - магия
const VibeIcon = ({ className = "w-5 h-5" }) => (
  <SparklesIcon className={className} />
);

// Обновленная иконка для World - планета
const WorldIcon = ({ className = "w-5 h-5" }) => (
  <FaGlobeAmericas className={className} />
);

// Обновленная иконка для Tracks - нота
const TracksIcon = ({ className = "w-5 h-5" }) => (
  <HiMusicNote className={className} />
);

// Main filter component
const ContentFilter = () => {
  const { activeFilter, setActiveFilter } = useContext(ContentFilterContext);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useUser() || { user: null };
  
  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Map the context filter to the component's internal type
  const mapFilterToType = (filter: string): ContentType => {
    if (filter === 'all') return 'all';
    if (filter === 'vibe') return 'vibe';
    if (filter === 'sacral' || filter === 'stracks') return 'stracks';
    if (filter === 'tracks') return 'tracks';
    return 'all'; // Default to all if not matching
  };
  
  // Internal active tab state now derives from context
  const activeTab = mapFilterToType(activeFilter);
  
  // Handle tab change and update context
  const handleTabChange = (tab: ContentType) => {
    // Сделаем логирование заметнее
    console.log("%c[FILTER] 🔄 Changing filter to: " + tab, "background: #2A184B; color: #4F46E5; font-weight: bold; padding: 2px 5px; border-radius: 3px;");
    
    // Запоминаем старое значение для логирования
    const prevFilter = activeFilter;
    
    // Устанавливаем новое значение фильтра
    setActiveFilter(tab);
    
    // Добавляем заметное логирование об изменении фильтра
    console.log(`%c[FILTER-CHANGED] 📊 Filter changed from ${prevFilter} to ${tab}`, "background: #351E43; color: #ffffff; font-weight: bold; padding: 3px 6px; border-radius: 3px;");
    
    // Сохраняем в localStorage, чтобы гарантировать, что это сохранено
    if (typeof window !== 'undefined') {
      localStorage.setItem('sacraltrack-filter', tab);
      console.log(`[FILTER-STORAGE] 💾 Saved filter "${tab}" to localStorage`);
    }
  };
  
  return (
    <>
      {/* Desktop version */}
      <div className="hidden md:block w-full">
        <div className="w-full backdrop-blur-xl rounded-2xl p-4">
          
          {/* Filter buttons */}
          <div className="flex flex-col space-y-2">
            {/* All content */}
            <TabButton 
              active={activeTab === 'all'} 
              onClick={() => handleTabChange('all')}
              icon={<AllContentIcon />}
              label="All Content"
              description="View all content types"
            />
            
            {/* Vibe */}
            <TabButton 
              active={activeTab === 'vibe'} 
              onClick={() => handleTabChange('vibe')}
              icon={<VibeIcon />}
              label="Vibes"
              description="Social posts from artists & fans"
            />
            
            {/* Tracks */}
            <TabButton 
              active={activeTab === 'tracks'} 
              onClick={() => handleTabChange('tracks')}
              icon={<TracksIcon />}
              label="Tracks"
              description="Only music tracks (PostMain)"
            />
          </div>
        </div>
      </div>
      
      {/* Mobile version - optimized for mobile display */}
      <div className="block md:hidden w-full">
        <div className="w-full rounded-t-2xl">
          <div className="flex justify-between items-center px-2">
            <MobileTabButton 
              active={activeTab === 'all'} 
              onClick={() => handleTabChange('all')}
              icon={<AllContentIcon className="w-5 h-5" />}
              label="All"
            />
            
            <MobileTabButton 
              active={activeTab === 'vibe'} 
              onClick={() => handleTabChange('vibe')}
              icon={<VibeIcon className="w-5 h-5" />}
              label="Vibes"
            />
            
            <MobileTabButton 
              active={activeTab === 'tracks'} 
              onClick={() => handleTabChange('tracks')}
              icon={<TracksIcon className="w-5 h-5" />}
              label="Tracks"
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Types for tab buttons
interface MobileTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  isSpecial?: boolean;
}

// Компонент для мобильной версии табов
const MobileTabButton = ({ active, onClick, icon, label }: MobileTabButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2 px-5 transition-all duration-300 relative ${
        active
          ? 'text-white'
          : 'text-gray-400 hover:text-white/70'
      }`}
    >
      <div className={active ? 'text-white' : 'text-gray-400'}>
        {icon}
      </div>
      <span className="text-[9px] font-medium mt-0.5">{label}</span>
      
      {active && (
        <motion.div
          layoutId="activeTabIndicator-mobile"
          className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#20DDBB] to-[#8B5CF6]"
          initial={false}
          transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
        />
      )}
    </button>
  );
};

// Tab button component - устраняем квадратные фоны под иконками
const TabButton = ({ active, onClick, icon, label, description, isSpecial = false }: TabButtonProps) => {
  const specialClass = isSpecial 
    ? active 
      ? 'bg-gradient-to-br from-[#2E2469] to-[#4F46E5] ring-2 ring-[#4F46E5]/50 ring-offset-1 ring-offset-[#1E1A36]' 
      : 'border-[#4F46E5]/30 hover:border-[#4F46E5]/50'
    : '';
    
  return (
    <motion.button
      whileHover={{ scale: active ? 1 : 1.03, y: active ? 0 : -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative py-4 px-4 rounded-2xl text-center transition-all duration-300 overflow-hidden
        ${active 
          ? `bg-gradient-to-br from-[#2E2469]/90 to-[#4F46E5]/90 text-white shadow-lg shadow-[#4F46E5]/20 border border-[#4F46E5]/50 backdrop-blur-lg ${specialClass}`
          : `bg-gradient-to-r from-[#1E1A36]/50 to-[#2A2151]/50 text-gray-300 hover:bg-[#2A2151]/60 border border-white/5 hover:border-white/20 backdrop-blur-lg ${specialClass}`
        }
      `}
    >
      <div className="flex flex-col items-center relative z-10">
        <div className="mb-1.5">
          {icon}
        </div>
        <span className={`font-medium block text-sm ${isSpecial && active ? 'text-white' : isSpecial ? 'text-blue-200' : ''}`}>{label}</span>
        <span className="text-[9px] opacity-60">{description}</span>
      </div>
    </motion.button>
  );
};

export default ContentFilter; 