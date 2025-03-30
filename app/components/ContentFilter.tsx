"use client";

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useUser } from '@/app/context/user';
import { useVibeStore } from '@/app/stores/vibeStore';
import { HiMusicNote } from 'react-icons/hi';
import { FaGlobeAmericas, FaHeart, FaPlay, FaPause, FaGem } from 'react-icons/fa';
import { 
  SparklesIcon, 
  MusicalNoteIcon, 
  FireIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { usePlayerContext } from '@/app/context/playerContext';
import { ContentFilterContext } from '@/app/context/ContentFilterContext';

// Content filter types
type ContentType = 'all' | 'vibe' | 'sacral' | 'world';

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
    <div className="bg-gradient-to-br from-[#1E1A36]/80 to-[#2A2151]/80 rounded-xl overflow-hidden p-4 w-full shadow-xl border border-purple-500/10 animate-pulse">
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
        <div className="h-5 w-16 rounded-full bg-[#20DDBB]/10"></div>
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
      className="bg-gradient-to-br from-[#1E1A36] to-[#2A2151] rounded-xl overflow-hidden p-4 shadow-xl border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300"
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
        <span className="text-[#20DDBB] text-xs px-2 py-0.5 bg-[#20DDBB]/10 rounded-full">{track.genre}</span>
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-red-400 transition-colors">
            <FaHeart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Custom Musical Diamond Icon
const MusicalDiamondIcon = ({ className = "w-5 h-5" }) => (
  <div className={`relative ${className}`}>
    <FaGem className="text-purple-400 w-full h-full" />
    <HiMusicNote className="absolute text-white w-2/3 h-2/3 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
  </div>
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
    if (filter === 'sacral') return 'sacral';
    if (filter === 'world') return 'world';
    return 'all'; // Default to all if not matching
  };
  
  // Internal active tab state now derives from context
  const activeTab = mapFilterToType(activeFilter);
  
  // Handle tab change and update context
  const handleTabChange = (tab: ContentType) => {
    console.log("[FILTER] Setting active filter to:", tab);
    setActiveFilter(tab);
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
    <div>
      {/* Tab buttons - mobile version is more compact */}
      {isMobile ? (
        <div className="flex gap-2 justify-between overflow-x-auto pb-1">
          <MobileTabButton
            active={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            icon={<SparklesIcon className="w-4 h-4" />}
            label="All"
          />
          
          <MobileTabButton
            active={activeTab === 'vibe'}
            onClick={() => handleTabChange('vibe')}
            icon={<SparklesIcon className="w-4 h-4" />}
            label="Vibe"
          />
          
          <MobileTabButton
            active={activeTab === 'sacral'}
            onClick={() => handleTabChange('sacral')}
            icon={<MusicalDiamondIcon className="w-4 h-4" />}
            label="Sacral"
          />
          
          <MobileTabButton
            active={activeTab === 'world'}
            onClick={() => handleTabChange('world')}
            icon={<FaGlobeAmericas className="w-4 h-4" />}
            label="World"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-6">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            icon={<SparklesIcon className="w-5 h-5" />}
            label="All Content"
            description="Show everything"
            isSpecial={false}
          />
          
          <TabButton
            active={activeTab === 'vibe'}
            onClick={() => handleTabChange('vibe')}
            icon={<SparklesIcon className="w-5 h-5" />}
            label="Vibe"
            description="User moments"
            isSpecial={false}
          />
          
          <TabButton
            active={activeTab === 'sacral'}
            onClick={() => handleTabChange('sacral')}
            icon={<MusicalDiamondIcon />}
            label="Sacral Track"
            description="Platform tracks"
            isSpecial={true}
          />
          
          <TabButton
            active={activeTab === 'world'}
            onClick={() => handleTabChange('world')}
            icon={<FaGlobeAmericas className="w-5 h-5" />}
            label="World Tracks"
            description="Global hits"
            isSpecial={false}
          />
        </div>
      )}
      
      {/* Recommendations section - hide on mobile */}
      {!isMobile && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FireIcon className="h-5 w-5 text-[#20DDBB]" />
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
  );
};

// Mobile tab button component
interface MobileTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const MobileTabButton = ({ active, onClick, icon, label }: MobileTabButtonProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex-1 py-2 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-1
        ${active 
          ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-md'
          : 'bg-[#1A1C2E]/80 text-gray-400'
        }
      `}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
};

// Tab button component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  isSpecial?: boolean;
}

const TabButton = ({ active, onClick, icon, label, description, isSpecial = false }: TabButtonProps) => {
  // Special pulse animation for Sacral tab
  const pulseAnimation = isSpecial ? {
    animate: {
      boxShadow: active 
        ? ['0 0 0 0 rgba(139, 92, 246, 0)', '0 0 0 8px rgba(139, 92, 246, 0.2)', '0 0 0 0 rgba(139, 92, 246, 0)']
        : ['0 0 0 0 rgba(139, 92, 246, 0)', '0 0 0 4px rgba(139, 92, 246, 0.1)', '0 0 0 0 rgba(139, 92, 246, 0)']
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop" as "loop"
    }
  } : {};
  
  const specialClass = isSpecial 
    ? active 
      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 ring-2 ring-purple-500/50 ring-offset-2 ring-offset-[#1E1A36]' 
      : 'border-purple-500/30 hover:border-purple-500/50'
    : '';
    
  return (
    <motion.button
      whileHover={{ scale: active ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      {...pulseAnimation}
      className={`
        relative flex-1 py-3 px-4 rounded-xl text-center transition-all duration-300 overflow-hidden shadow-lg
        ${active 
          ? `bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-xl shadow-purple-600/30 border border-purple-500/50 ${specialClass}`
          : `bg-gradient-to-r from-[#1E1A36]/90 to-[#2A2151]/90 backdrop-blur-sm text-gray-300 hover:bg-[#2A2151] border border-white/10 hover:border-white/20 ${specialClass}`
        }
      `}
    >
      {/* Animated background for active tab */}
      {active && (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${isSpecial 
            ? 'from-purple-600/20 via-pink-500/20 to-purple-600/20' 
            : 'from-purple-600/10 via-indigo-600/10 to-purple-600/10'}`}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: isSpecial ? 3 : 5,
            repeat: Infinity,
            repeatType: "loop",
          }}
        />
      )}
      
      {/* Shimmer effect for special tab */}
      {isSpecial && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            repeatDelay: 1
          }}
        />
      )}
      
      <div className="flex flex-col items-center relative z-10">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center mb-1
          ${active 
            ? isSpecial 
              ? 'bg-white/30 shadow-md shadow-purple-500/50' 
              : 'bg-white/20' 
            : 'bg-white/5'
          }
        `}>
          {icon}
        </div>
        <span className={`font-medium block text-sm ${isSpecial && 'text-purple-200'}`}>{label}</span>
        <span className="text-xs opacity-70">{description}</span>
      </div>
      
      {/* Animated music notes for active tab */}
      {active && (
        <>
          <motion.div
            className="absolute -top-2 -right-2 text-white/20"
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, -10, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            <HiMusicNote className="h-4 w-4" />
          </motion.div>
          
          <motion.div
            className="absolute -bottom-2 -left-1 text-white/20"
            animate={{ 
              y: [0, -15, 0],
              rotate: [0, 10, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "loop",
              delay: 1
            }}
          >
            <HiMusicNote className="h-3 w-3" />
          </motion.div>
        </>
      )}
      
      {/* Special sparkle effects for Sacral tab */}
      {isSpecial && active && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-purple-300"
              style={{
                top: `${20 + i * 25}%`,
                left: `${15 + i * 30}%`,
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                delay: i * 0.5,
              }}
            />
          ))}
        </>
      )}
    </motion.button>
  );
};

export default ContentFilter; 