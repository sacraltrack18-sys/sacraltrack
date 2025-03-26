"use client";

import React, { createContext, useState, ReactNode } from 'react';

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
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <ContentFilterContext.Provider value={{ activeFilter, setActiveFilter }}>
      {children}
    </ContentFilterContext.Provider>
  );
}; 