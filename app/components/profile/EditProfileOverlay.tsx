// This is a placeholder component that redirects to the new EnhancedEditProfileOverlay
// It exists only to prevent import errors in other parts of the application

"use client";

import React from 'react';
import { useGeneralStore } from "@/app/stores/general";
import EnhancedEditProfileOverlay from "./EnhancedEditProfileOverlay";

const EditProfileOverlay: React.FC = () => {
  // This component is deprecated and has been replaced by EnhancedEditProfileOverlay
  const { isEditProfileOpen } = useGeneralStore();
  
  if (!isEditProfileOpen) return null;
  
  // Return the enhanced version instead
  return <EnhancedEditProfileOverlay />;
};

export default EditProfileOverlay; 