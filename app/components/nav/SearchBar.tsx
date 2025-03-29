"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { RandomUsers, Post } from "@/app/types";
import { usePostStore } from "@/app/stores/post";
import useSearchProfilesByName from "@/app/hooks/useSearchProfilesByName";
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";

interface SearchBarProps {
  isHomePage: boolean;
}

const SearchBar = ({ isHomePage }: SearchBarProps) => {
  const router = useRouter();
  const { searchTracksByName } = usePostStore();
  const [searchProfiles, setSearchProfiles] = useState<(RandomUsers | Post)[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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

  // Define the handleSearch function with useCallback for better performance
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchProfiles([]);
        return;
      }
  
      try {
        const [profileResults, trackResults] = await Promise.all([
          useSearchProfilesByName(query),
          searchTracksByName(query)
        ]);

        const formattedResults = [
          ...(profileResults?.map(profile => ({
            id: profile.id,
            type: 'profile',
            name: profile.name,
            image: profile.image,
            user_id: profile.id
          })) || []),
          ...(trackResults?.map(track => ({
            id: track.id,
            type: 'track',
            name: track.name,
            image: track.image,
            user_id: track.user_id
          })) || [])
        ];

        setSearchProfiles(formattedResults as (RandomUsers | Post)[]);
      } catch (error) {
        console.error('Search error:', error);
        setSearchProfiles([]);
      }
    }, 300),
    [searchTracksByName]
  );

  // Handle click on search result
  const handleSearchResultClick = (result: any) => {
    if (result.type === 'profile') {
      router.push(`/profile/${result.user_id}`);
    } else {
      router.push(`/post/${result.user_id}/${result.id}`);
    }
    setShowSearch(false);
    setSearchQuery("");
    setSearchProfiles([]);
  };

  // Auto-focus when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Helper function for image URLs with error handling
  const getSearchResultImageUrl = useCallback((imageId: string) => {
    if (!imageId || imageId.trim() === '') {
      return '/images/placeholders/default-placeholder.svg';
    }
    try {
      const type = imageId.startsWith('track_') ? 'track' : 'user';
      return createBucketUrl(imageId, type);
    } catch (error) {
      console.error('Error in getSearchResultImageUrl:', error);
      return '/images/placeholders/default-placeholder.svg';
    }
  }, []);

  // Don't render if not on homepage
  if (!isHomePage) return null;

  return (
    <div className="relative flex items-center">
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
            animate={{ width: "min(300px, 80vw)", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute right-12 top-1/2 -translate-y-1/2"
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search tracks and artists..."
              className="w-full px-4 py-2 bg-[#2E2469] text-white rounded-full 
                      focus:outline-none focus:ring-2 focus:ring-[#20DDBB] 
                      placeholder-gray-400 text-sm"
            />

            {/* Search Results */}
            {searchProfiles.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-[#24183D] rounded-xl 
                           shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {searchProfiles.map((result) => (
                  <SearchResultItem 
                    key={`${result.type}-${result.id}`}
                    result={result}
                    getImageUrl={getSearchResultImageUrl}
                    onClick={handleSearchResultClick}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Memoized search result item
interface SearchResultItemProps {
  result: RandomUsers | Post;
  getImageUrl: (id: string) => string;
  onClick: (result: any) => void;
}

const SearchResultItem = React.memo(({ result, getImageUrl, onClick }: SearchResultItemProps) => {
  return (
    <div
      onClick={() => onClick(result)}
      className="flex items-center gap-3 p-3 hover:bg-[#2E2469] 
                cursor-pointer transition-colors"
    >
      <img
        src={getImageUrl(result.image)}
        alt={result.name}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div>
        <p className="text-white font-medium text-sm">{result.name}</p>
        <span className="text-gray-400 text-xs">
          {result.type === 'profile' ? 'Artist' : 'Track'}
        </span>
      </div>
    </div>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

export default SearchBar; 