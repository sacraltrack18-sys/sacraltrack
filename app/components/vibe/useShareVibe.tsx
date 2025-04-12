"use client";

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseShareVibeOptions {
  appName?: string;
}

interface ShareFunctions {
  copyLink: (url: string) => Promise<void>;
  shareViaTwitter: (caption: string, url: string) => void;
  shareViaFacebook: (url: string) => void;
  shareViaTelegram: (caption: string, url: string) => void;
  shareViaWhatsapp: (caption: string, url: string) => void;
  shareViaEmail: (caption: string, url: string) => void;
  shareViaInstagram: () => void;
}

/**
 * Hook for managing vibe sharing functionality
 */
export const useShareVibe = (options: UseShareVibeOptions = {}) => {
  const { appName = 'Sacral Track' } = options;
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentVibeId, setCurrentVibeId] = useState<string | null>(null);
  const [currentVibeData, setCurrentVibeData] = useState<{
    imageUrl?: string;
    caption?: string;
    userName?: string;
  }>({});

  const openShareModal = useCallback((vibeId: string, vibeData: {
    imageUrl?: string;
    caption?: string;
    userName?: string;
  }) => {
    setCurrentVibeId(vibeId);
    setCurrentVibeData(vibeData);
    setIsShareModalOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsShareModalOpen(false);
  }, []);

  // Build the vibe URL from the current vibe ID
  const getVibeUrl = useCallback((vibeId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/vibe/${vibeId}`;
  }, []);

  // Functions for sharing via different platforms
  const shareFunctions: ShareFunctions = {
    copyLink: async (url: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!', {
          icon: '🔗',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
      } catch (err) {
        console.error('Error copying link:', err);
        toast.error('Could not copy link', {
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px'
          }
        });
      }
    },

    shareViaTwitter: (caption: string, url: string): void => {
      const text = `Check out this awesome vibe: "${caption}" on ${appName}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    },

    shareViaFacebook: (url: string): void => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    },

    shareViaTelegram: (caption: string, url: string): void => {
      const text = `Check out this awesome vibe: "${caption}" on ${appName}`;
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    },

    shareViaWhatsapp: (caption: string, url: string): void => {
      const text = `Check out this awesome vibe: "${caption}" on ${appName}: ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    },

    shareViaEmail: (caption: string, url: string): void => {
      const subject = `Check out this awesome vibe on ${appName}`;
      const body = `Hey!\n\nI found this amazing vibe on ${appName}: "${caption}"\n\nCheck it out here: ${url}\n\nEnjoy!`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    },

    shareViaInstagram: (): void => {
      // Instagram doesn't have a web sharing API
      toast.error('Instagram sharing is not available directly. Copy the link and share it manually on Instagram.', {
        duration: 4000,
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '10px'
        }
      });
    }
  };

  return {
    isShareModalOpen,
    currentVibeId,
    currentVibeData,
    openShareModal,
    closeShareModal,
    getVibeUrl,
    ...shareFunctions
  };
};

// Create a context and provider for the share functionality
import React, { createContext, useContext, ReactNode } from 'react';
import ShareVibeModal from './ShareVibeModal';

interface ShareVibeContextType {
  openShareModal: (vibeId: string, vibeData: {
    imageUrl?: string;
    caption?: string;
    userName?: string;
  }) => void;
  closeShareModal: () => void;
  getVibeUrl: (vibeId: string) => string;
  copyLink: (url: string) => Promise<void>;
  shareViaTwitter: (caption: string, url: string) => void;
  shareViaFacebook: (url: string) => void;
  shareViaTelegram: (caption: string, url: string) => void;
  shareViaWhatsapp: (caption: string, url: string) => void;
  shareViaEmail: (caption: string, url: string) => void;
  shareViaInstagram: () => void;
}

const ShareVibeContext = createContext<ShareVibeContextType | null>(null);

export const useShareVibeContext = () => {
  const context = useContext(ShareVibeContext);
  if (!context) {
    throw new Error('useShareVibeContext must be used within a ShareVibeProvider');
  }
  return context;
};

interface ShareVibeProviderProps {
  children: ReactNode;
  appName?: string;
}

export const ShareVibeProvider: React.FC<ShareVibeProviderProps> = ({ 
  children,
  appName = 'Sacral Track'
}) => {
  const shareVibe = useShareVibe({ appName });
  
  return (
    <ShareVibeContext.Provider value={shareVibe}>
      {children}
      
      <ShareVibeModal 
        isOpen={shareVibe.isShareModalOpen}
        onClose={shareVibe.closeShareModal}
        vibeId={shareVibe.currentVibeId || ''}
        vibeImageUrl={shareVibe.currentVibeData.imageUrl}
        vibeCaption={shareVibe.currentVibeData.caption}
        userName={shareVibe.currentVibeData.userName}
      />
    </ShareVibeContext.Provider>
  );
};

export default useShareVibe; 