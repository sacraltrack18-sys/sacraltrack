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
        className="p-2 hover:bg-[#2E2469] rounded-full transition-all duration-200"
        aria-label="Search people"
      >
        <MagnifyingGlassIcon 
          className="w-[24px] h-[24px] text-cyan-400 transition-transform duration-200 hover:scale-110" 
        />
      </button>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ width: 0, opacity: 0, scale: 0.95 }}
            animate={{ width: "auto", opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-1/2 -translate-y-1/2 z-50
                      left-12 right-4 md:left-auto md:right-12 md:w-80
                      max-w-[calc(100vw-4rem)] md:max-w-none"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-[#2E2469]/95 backdrop-blur-md text-white rounded-2xl
                        focus:outline-none focus:ring-2 focus:ring-[#20DDBB]/50 focus:bg-[#2E2469]
                        placeholder-gray-400 text-sm border border-white/10
                        shadow-lg focus:shadow-xl transition-all duration-300"
              />
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-[#20DDBB] border-t-transparent rounded-full" />
                </div>
              )}
              
              {/* Clear button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeopleSearchBar;
