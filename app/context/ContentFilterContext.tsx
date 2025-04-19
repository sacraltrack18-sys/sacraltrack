"use client";

import React, { createContext, useState, ReactNode, useEffect } from 'react';

// Content filtering context
interface ContentFilterContextType {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
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
  const [activeFilter, setActiveFilter] = useState('all');

  // Initialize from localStorage if available (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('sacraltrack-filter');
      if (savedFilter) {
        // Convert old "sacral" value to "stracks" if needed
        const normalizedFilter = savedFilter === 'sacral' ? 'stracks' : savedFilter;
        setActiveFilter(normalizedFilter);
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

  const handleSetActiveFilter = (filter: string) => {
    console.log('[CONTENT-FILTER] Setting filter to:', filter);
    // Convert "sacral" to "stracks" for consistency
    const normalizedFilter = filter === 'sacral' ? 'stracks' : filter;
    setActiveFilter(normalizedFilter);
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