'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface EditContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}

const EditContext = createContext<EditContextType | undefined>(undefined);

export const EditProvider = ({ children }: { children: ReactNode }) => {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <EditContext.Provider value={{ isEditMode, setIsEditMode }}>
      {children}
    </EditContext.Provider>
  );
};

export const useEditContext = (): EditContextType => {
  const context = useContext(EditContext);
  if (context === undefined) {
    throw new Error('useEditContext must be used within an EditProvider');
  }
  return context;
}; 