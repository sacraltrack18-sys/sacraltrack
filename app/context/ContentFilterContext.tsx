"use client";

import React, { createContext, useState, ReactNode, useEffect } from 'react';

// Define and export the FilterType
export type FilterType = 'all' | 'stracks' | 'sacral' | 'vibe' | 'tracks';

// Content filtering context
interface ContentFilterContextType {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
}

export const ContentFilterContext = createContext<ContentFilterContextType>({
  activeFilter: 'all',
  setActiveFilter: () => {},
});

interface ContentFilterProviderProps {
  children: ReactNode;
}

export const ContentFilterProvider: React.FC<ContentFilterProviderProps> = ({ children }) => {
  // Use local storage if available to persist filter choice across page refreshes
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Initialize from localStorage if available (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('sacraltrack-filter') as FilterType | null; // Cast to FilterType or null
      if (savedFilter) {
        // Normalize old "sacral" value if necessary, ensure it's a valid FilterType
        let normalizedFilter: FilterType = savedFilter;
        if (savedFilter === 'sacral') { // This specific normalization might still be needed if 'sacral' was a legacy value
            normalizedFilter = 'stracks'; // Or 'sacral' if 'sacral' is now a valid FilterType
        }
        // Ensure the loaded filter is one of the defined FilterTypes
        const validFilters: FilterType[] = ['all', 'stracks', 'sacral', 'vibe', 'tracks'];
        if (validFilters.includes(normalizedFilter)) {
            setActiveFilter(normalizedFilter);
        } else {
            setActiveFilter('all'); // Default if saved filter is invalid
        }
      }
    }
  }, []);

  // Log filter changes for debugging
  useEffect(() => {
    console.log('[CONTENT-FILTER] Current active filter:', activeFilter);
    
    // Save to localStorage when changed
    if (typeof window !== 'undefined') {
      localStorage.setItem('sacraltrack-filter', activeFilter);
    }
  }, [activeFilter]);

  const handleSetActiveFilter = (filter: FilterType) => {
    console.log('[CONTENT-FILTER] Setting filter to:', filter);
    // Normalization for 'sacral' to 'stracks' might be legacy.
    // If 'sacral' is a valid FilterType now, this specific line might not be needed
    // or should be adjusted based on current valid filter values.
    // For now, assuming 'sacral' as a filter value is directly used or handled by its presence in FilterType.
    setActiveFilter(filter);
  };

  return (
    <ContentFilterContext.Provider value={{ 
      activeFilter, 
      setActiveFilter: handleSetActiveFilter 
    }}>
      {children}
    </ContentFilterContext.Provider>
  );
}; 