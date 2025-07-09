"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface PeopleSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const PeopleSearchBar = ({ onSearch, placeholder = "Search amazing people..." }: PeopleSearchBarProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce function
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

  // Handle search with debouncing
  const handleSearch = useCallback(
    debounce((query: string) => {
      const trimmedQuery = query.trim();
      setIsLoading(false);
      onSearch(trimmedQuery);
    }, 300),
    [onSearch]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsLoading(true);
    handleSearch(value);
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    handleSearch(searchQuery);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    onSearch("");
    setIsLoading(false);
  };

  // Close search
  const closeSearch = () => {
    setShowSearch(false);
    clearSearch();
  };

  // Auto-focus when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearch]);

  return (
    <div className="relative flex items-center justify-end" ref={searchContainerRef}>
      <button
        id="people-search-button"
        onClick={() => setShowSearch(!showSearch)}
        className="p-3 hover:bg-[#2E2469]/80 active:bg-[#2E2469] rounded-2xl transition-all duration-200 group relative"
        aria-label="Search people"
      >
        <MagnifyingGlassIcon
          className="w-6 h-6 text-[#20DDBB] group-hover:text-white transition-all duration-200 group-hover:scale-110"
        />
        {/* Enhanced glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-[#20DDBB]/0 group-hover:bg-[#20DDBB]/10 transition-all duration-200"></div>
      </button>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ width: 0, opacity: 0, scale: 0.9 }}
            animate={{ width: "100%", opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-1/2 -translate-y-1/2 z-50
                      left-2.5 right-2.5 md:left-auto md:right-4
                      max-w-[calc(100vw-20px)]"
            style={{
              minWidth: '300px',
              width: 'clamp(300px, 40vw, 500px)'
            }}
          >
            <form onSubmit={handleSearchSubmit} className="relative group">
              {/* Enhanced search input */}
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  className="w-full pl-14 pr-12 py-4 bg-[#1A1A2E]/95 backdrop-blur-xl text-white rounded-2xl
                          focus:outline-none focus:ring-2 focus:ring-[#20DDBB]/60 focus:bg-[#1A1A2E]
                          placeholder-gray-400 text-base border border-white/20
                          shadow-2xl focus:shadow-[0_0_30px_rgba(32,221,187,0.3)]
                          transition-all duration-300 group-hover:border-[#20DDBB]/40
                          caret-white selection:bg-[#20DDBB]/30"
                  style={{ color: 'white' }}
                />

                {/* Search icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-[#20DDBB]/70 group-focus-within:text-[#20DDBB] transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right side icons */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-[#20DDBB] border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Clear button */}
                {searchQuery && !isLoading && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 group/clear"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-400 group-hover/clear:text-white transition-colors duration-200" />
                  </button>
                )}

                {/* Search button for mobile only */}
                <button
                  type="submit"
                  className="md:hidden p-1.5 bg-[#20DDBB]/20 hover:bg-[#20DDBB]/30 rounded-full transition-all duration-200 group/submit"
                >
                  <svg className="w-4 h-4 text-[#20DDBB] group-hover/submit:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeopleSearchBar;
