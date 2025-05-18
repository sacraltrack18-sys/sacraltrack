"use client";

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useUser } from '@/app/context/user';
import { useVibeStore } from '@/app/stores/vibeStore';
import { HiMusicNote } from 'react-icons/hi';
import { FaGlobeAmericas, FaHeart, FaPlay, FaPause, FaGem, FaCompactDisc, FaStar } from 'react-icons/fa';
import { 
  SparklesIcon, 
  MusicalNoteIcon, 
  FireIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { usePlayerContext } from '@/app/context/playerContext';
import { ContentFilterContext } from '@/app/context/ContentFilterContext';

// Content filter types
type ContentType = 'all' | 'vibe' | 'stracks' | 'world';

// Recommendation track types
interface RecommendationTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  genre: string;
}

// Skeleton component for recommendations
const RecommendationSkeleton = () => {
  return (
    <div className="bg-gradient-to-br from-[#1E1A36]/80 to-[#2A2151]/80 rounded-xl overflow-hidden p-4 w-full shadow-xl border border-purple-500/10 animate-pulse backdrop-blur-lg">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 bg-purple-700/30 rounded-lg shadow-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent"></div>
        </div>
        <div className="flex-1">
          <div className="h-4 w-3/4 bg-white/10 rounded mb-2"></div>
          <div className="h-3 w-1/2 bg-white/5 rounded"></div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-blue-400/10"></div>
        <div className="h-4 w-4 rounded-full bg-white/10"></div>
      </div>
    </div>
  );
};

// Recommendation card component
const RecommendationCard = ({ track }: { track: RecommendationTrack }) => {
  const { currentTrack, isPlaying, togglePlayPause, setCurrentTrack } = usePlayerContext();
  const isCurrentTrack = currentTrack?.id === track.id;
  
  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      setCurrentTrack({
        id: track.id,
        audio_url: track.audioUrl,
        image_url: track.coverUrl,
        name: track.title,
        artist: track.artist
      });
    }
  };
  
  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-gradient-to-br from-[#1E1A36] to-[#2A2151] rounded-xl overflow-hidden p-4 shadow-xl border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-lg"
    >
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group shadow-md">
          <Image 
            src={track.coverUrl} 
            alt={track.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-transparent pointer-events-none"></div>
          <button 
            onClick={handlePlay}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200"
          >
            {isCurrentTrack && isPlaying ? (
              <FaPause className="text-white text-xl" />
            ) : (
              <FaPlay className="text-white text-xl ml-1" />
            )}
          </button>
          {isCurrentTrack && isPlaying && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-white rounded-full"
                  animate={{ 
                    height: [3, 8, 3],
                  }}
                  transition={{
                    duration: 0.8 + Math.random() * 0.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-white font-medium text-sm">{track.title}</h3>
          <p className="text-gray-400 text-xs">{track.artist}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-blue-400 text-xs px-2 py-0.5 bg-blue-400/10 rounded-full">{track.genre}</span>
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-pink-400 transition-colors">
            <FaHeart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Обновленная иконка для All Content - бриллиант
const AllContentIcon = ({ className = "w-5 h-5" }) => (
  <FaGem className={className} />
);

// Обновленная иконка для Vibe - магия
const VibeIcon = ({ className = "w-5 h-5" }) => (
  <SparklesIcon className={className} />
);

// Обновленная иконка для World - планета
const WorldIcon = ({ className = "w-5 h-5" }) => (
  <FaGlobeAmericas className={className} />
);

// Main filter component
const ContentFilter = () => {
  const { activeFilter, setActiveFilter } = useContext(ContentFilterContext);
  const [recommendations, setRecommendations] = useState<RecommendationTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser() || { user: null };
  const [isMobile, setIsMobile] = useState(false);
  
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
    if (filter === 'world') return 'world';
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
  
  // Fake data for recommendations (to be replaced with real logic in the future)
  useEffect(() => {
    // Simulation of loading recommendations
    setLoading(true);
    
    // After 1.5 seconds, load fake recommendations
    const timer = setTimeout(() => {
      const fakeRecommendations: RecommendationTrack[] = [
        {
          id: 'rec1',
          title: 'Cosmic Harmony',
          artist: 'Nebula Dreams',
          coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          audioUrl: '/audio/sample1.mp3',
          genre: 'Ambient'
        },
        {
          id: 'rec2',
          title: 'Electric Soul',
          artist: 'Rhythm Section',
          coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
          audioUrl: '/audio/sample2.mp3',
          genre: 'Electronic'
        }
      ];
      
      setRecommendations(fakeRecommendations);
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Future logic for tracking preferences
  const refreshRecommendations = () => {
    setLoading(true);
    
    // Simulating recommendation updates
    setTimeout(() => {
      const updatedRecommendations: RecommendationTrack[] = [
        {
          id: 'rec3',
          title: 'Midnight Journey',
          artist: 'Aurora Beats',
          coverUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff',
          audioUrl: '/audio/sample3.mp3',
          genre: 'Downtempo'
        },
        {
          id: 'rec4',
          title: 'Urban Flow',
          artist: 'City Lights',
          coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
          audioUrl: '/audio/sample4.mp3',
          genre: 'Hip Hop'
        }
      ];
      
      setRecommendations(updatedRecommendations);
      setLoading(false);
    }, 1000);
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
            
            {/* World */}
            <TabButton 
              active={activeTab === 'world'} 
              onClick={() => handleTabChange('world')}
              icon={<WorldIcon />}
              label="World"
              description="Global trending content"
            />
          </div>
          
          {/* Recommendations section - hide on mobile */}
          {!isMobile && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FireIcon className="h-5 w-5 text-pink-400" />
                  <h3 className="text-white font-bold tracking-wide">Recommended</h3>
                </div>
                
                <button 
                  onClick={refreshRecommendations}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <>
                    <RecommendationSkeleton />
                    <RecommendationSkeleton />
                  </>
                ) : (
                  recommendations.map(track => (
                    <RecommendationCard key={track.id} track={track} />
                  ))
                )}
              </div>
            </div>
          )}
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
              active={activeTab === 'world'} 
              onClick={() => handleTabChange('world')}
              icon={<WorldIcon className="w-5 h-5" />}
              label="World"
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