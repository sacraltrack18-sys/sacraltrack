"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { RandomUsers, Post } from "@/app/types";
import { usePostStore } from "@/app/stores/post";
import useSearchProfilesByName from "@/app/hooks/useSearchProfilesByName";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { useVibeStore } from "@/app/stores/vibeStore";
import { HeartIcon, MusicalNoteIcon, UserIcon } from "@heroicons/react/24/solid";

// Интерфейс для результатов поиска
interface SearchResult {
  id: string;
  type: 'profile' | 'track' | 'vibe';
  name: string;
  image: string;
  user_id: string;
  description?: string;
}

interface SearchBarProps {
  isHomePage: boolean;
}

const SearchBar = ({ isHomePage }: SearchBarProps) => {
  const router = useRouter();
  const { searchTracksByName } = usePostStore();
  const vibeStore = useVibeStore();
  const [searchProfiles, setSearchProfiles] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Memoize debounce function to prevent recreation on renders
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Search for vibes based on caption or mood
  const searchVibesByText = useCallback(async (query: string) => {
    // Normalize the search query
    const normalizedQuery = query.trim().toLowerCase();
    
    if (!normalizedQuery) return [];
    
    try {
      // First ensure we have vibe data
      if (vibeStore.allVibePosts.length === 0) {
        await vibeStore.fetchAllVibes();
      }
      
      // Enhanced vibe search logic
      return vibeStore.allVibePosts
        .filter(vibe => {
          // Get vibe properties safely
          const caption = vibe.caption?.toLowerCase() || '';
          const mood = vibe.mood?.toLowerCase() || '';
          const profileName = vibe.profile?.name?.toLowerCase() || '';
          
          // Check for matches in caption, mood, or profile name
          return caption.includes(normalizedQuery) || 
                 mood.includes(normalizedQuery) || 
                 profileName.includes(normalizedQuery);
        })
        .slice(0, 10) // Увеличиваем лимит до 10 результатов
        .map(vibe => ({
          id: vibe.id,
          type: 'vibe' as const,
          name: vibe.caption || 'Untitled Vibe',
          image: vibe.media_url,
          user_id: vibe.user_id,
          description: vibe.profile?.name || 'Unknown Artist'
        }));
    } catch (error) {
      console.error('Error searching vibes:', error);
      return [];
    }
  }, [vibeStore]);

  // Define the handleSearch function with useCallback for better performance
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setSearchProfiles([]);
        return;
      }
  
      try {
        setIsLoading(true);
        console.log(`[SEARCH] Searching for: "${trimmedQuery}"`);
        
        const [profileResults, trackResults, vibeResults] = await Promise.all([
          useSearchProfilesByName(trimmedQuery),
          searchTracksByName(trimmedQuery),
          searchVibesByText(trimmedQuery)
        ]);

        console.log(`[SEARCH] Found profiles: ${profileResults?.length || 0}`);
        console.log(`[SEARCH] Found tracks: ${trackResults?.length || 0}`);
        console.log(`[SEARCH] Found vibes: ${vibeResults?.length || 0}`);

        // Process all results and apply sorting
        const formattedResults: SearchResult[] = [
          ...(profileResults?.map(profile => ({
            id: profile.id,
            type: 'profile' as const,
            name: profile.name,
            image: profile.image,
            user_id: profile.id,
            description: 'Artist'
          })) || []),
          ...(trackResults?.map(track => ({
            id: track.id,
            type: 'track' as const,
            name: track.name,
            image: track.image,
            user_id: track.id,
            description: 'Track'
          })) || []),
          ...(vibeResults || [])
        ];

        console.log(`[SEARCH] Total results: ${formattedResults.length}`);
        
        // Sort results - prioritize exact matches first
        formattedResults.sort((a, b) => {
          const aNameLower = a.name.toLowerCase();
          const bNameLower = b.name.toLowerCase();
          const queryLower = trimmedQuery.toLowerCase();
          
          // Exact matches first
          if (aNameLower === queryLower && bNameLower !== queryLower) return -1;
          if (bNameLower === queryLower && aNameLower !== queryLower) return 1;
          
          // Starts with next
          if (aNameLower.startsWith(queryLower) && !bNameLower.startsWith(queryLower)) return -1;
          if (bNameLower.startsWith(queryLower) && !aNameLower.startsWith(queryLower)) return 1;
          
          // Otherwise alphabetical
          return aNameLower.localeCompare(bNameLower);
        });

        setSearchProfiles(formattedResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchProfiles([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [searchTracksByName, searchVibesByText]
  );

  // Handle click on search result
  const handleSearchResultClick = (result: SearchResult) => {
    try {
      console.log(`[SEARCH] Navigating to: ${result.type} ${result.id}`);
      // Сначала закрываем поиск и очищаем поле ввода
      setShowSearch(false);
      setSearchQuery("");
      setSearchProfiles([]);

      // Используем прямую навигацию через window.location
      let url = '';
      if (result.type === 'profile') {
        url = `/profile/${result.user_id}`;
      } else if (result.type === 'track') {
        url = `/post/${result.user_id}/${result.id}`;
      } else if (result.type === 'vibe') {
        url = `/vibe/${result.id}`;
      }
      
      // Добавляем небольшую задержку перед переходом
      setTimeout(() => {
        console.log(`[SEARCH] Direct navigation to: ${url}`);
        window.location.href = url;
      }, 10);
    } catch (error) {
      console.error('Search navigation error:', error);
    }
  };

  // Auto-focus when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function for image URLs with error handling
  const getSearchResultImageUrl = useCallback((imageId: string, type: string) => {
    if (!imageId || imageId.trim() === '') {
      if (type === 'profile') return '/images/placeholders/user-placeholder.svg';
      return '/images/placeholders/default-placeholder.svg';
    }
    
    // If already a full URL
    if (imageId.startsWith('http')) return imageId;
    
    try {
      // For vibe posts that might have custom image paths
      if (type === 'vibe' && imageId.startsWith('/')) return imageId;
      
      // createBucketUrl принимает только "track", "banner" или "user"
      // используем "user" как запасной вариант для типа "vibe"
      const imageType = type === 'track' ? 'track' : 'user';
      return createBucketUrl(imageId, imageType);
    } catch (error) {
      console.error('Error in getSearchResultImageUrl:', error);
      return '/images/placeholders/default-placeholder.svg';
    }
  }, []);

  // Don't render if not on homepage
  if (!isHomePage) return null;

  return (
    <div className="relative flex items-center" ref={searchContainerRef}>
      <button
        id="search-button"
        onClick={() => setShowSearch(!showSearch)}
        className="p-2 hover:bg-[#2E2469] rounded-full transition-all duration-200"
      >
        <MagnifyingGlassIcon 
          className="w-[24px] h-[24px] text-cyan-400 transition-transform duration-200 hover:scale-110" 
        />
      </button>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "min(350px, 80vw)", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute right-12 top-1/2 -translate-y-1/2 z-50"
          >
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Search artists, tracks, and vibes..."
                className="w-full px-4 py-3 bg-[#2E2469] text-white rounded-full 
                        focus:outline-none focus:ring-2 focus:ring-[#20DDBB] 
                        placeholder-gray-400 text-sm"
              />
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchQuery.trim() !== "" && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 w-full bg-gradient-to-b from-[#24183D] to-[#1D1131] rounded-xl 
                           shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto border border-indigo-900/50"
                >
                  {searchProfiles.length === 0 && !isLoading ? (
                    <div className="py-6 px-4 text-center">
                      <p className="text-gray-400 text-sm">
                        {searchQuery.length > 0 && searchQuery.length < 2 
                          ? "Please enter at least 2 characters" 
                          : "No results found"}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        {searchQuery.length >= 2 && (
                          <>
                            Try:<br />
                            • Different spelling or keywords<br />
                            • Including artist or track name<br />
                            • Searching without special characters
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {/* Group results by type */}
                      {['profile', 'track', 'vibe'].map(type => {
                        const typeResults = searchProfiles.filter(result => result.type === type);
                        if (typeResults.length === 0) return null;
                        
                        return (
                          <div key={type} className="mb-2">
                            <div className="px-4 py-1">
                              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                {type === 'profile' ? 'Artists' : type === 'track' ? 'Tracks' : 'Vibes'}
                              </span>
                            </div>
                            
                            {typeResults.map(result => (
                              <SearchResultItem 
                                key={`${result.type}-${result.id}`}
                                result={result}
                                getImageUrl={getSearchResultImageUrl}
                                onClick={handleSearchResultClick}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Memoized search result item
interface SearchResultItemProps {
  result: SearchResult;
  getImageUrl: (id: string, type: string) => string;
  onClick: (result: SearchResult) => void;
}

const SearchResultItem = React.memo(({ result, getImageUrl, onClick }: SearchResultItemProps) => {
  // Get the appropriate icon based on result type
  const getIcon = () => {
    switch (result.type) {
      case 'profile':
        return <UserIcon className="w-4 h-4 text-purple-400" />;
      case 'track':
        return <MusicalNoteIcon className="w-4 h-4 text-green-400" />;
      case 'vibe':
        return <HeartIcon className="w-4 h-4 text-pink-400" />;
      default:
        return null;
    }
  };
  
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(46, 36, 105, 0.8)' }}
      onClick={() => onClick(result)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-[#1D1131]">
        <img
          src={getImageUrl(result.image, result.type)}
          alt={result.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = result.type === 'profile' 
              ? '/images/placeholders/user-placeholder.svg'
              : '/images/placeholders/default-placeholder.svg';
          }}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{result.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {getIcon()}
          <span className="text-gray-400 text-xs truncate">
            {result.description || result.type}
          </span>
        </div>
      </div>
      
      <div className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
        {result.type === 'track' && (
          <MusicalNoteIcon className="w-4 h-4 text-cyan-400" />
        )}
      </div>
    </motion.div>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

export default SearchBar; 