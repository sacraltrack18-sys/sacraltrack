"use client";

import React, { createContext, useContext, ReactNode } from 'react';

interface PeopleSearchContextType {
  onSearch: (query: string) => void;
}

const PeopleSearchContext = createContext<PeopleSearchContextType | null>(null);

interface PeopleSearchProviderProps {
  children: ReactNode;
  onSearch: (query: string) => void;
}

export const PeopleSearchProvider = ({ children, onSearch }: PeopleSearchProviderProps) => {
  return (
    <PeopleSearchContext.Provider value={{ onSearch }}>
      {children}
    </PeopleSearchContext.Provider>
  );
};

export const usePeopleSearch = () => {
  const context = useContext(PeopleSearchContext);
  return context;
};
