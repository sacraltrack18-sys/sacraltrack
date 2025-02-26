// PlayerContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the type for the current track
export type CurrentTrackType = {
  id: string;
  audio_url: string;
  image_url: string;
  name: string;
  artist: string;
} | null;

// Define the PlayerContextType
export type PlayerContextType = {
  currentAudioId: string | null;
  currentTrack: CurrentTrackType;
  isPlaying: boolean;
  setCurrentAudioId: (id: string | null) => void;
  setCurrentTrack: (track: CurrentTrackType) => void;
  togglePlayPause: () => void;
};

// Create the context
const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Create the provider component
export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrackType>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const togglePlayPause = () => setIsPlaying(prev => !prev);

  return (
    <PlayerContext.Provider value={{ 
      currentAudioId,
      setCurrentAudioId,
      currentTrack, 
      isPlaying, 
      setCurrentTrack, 
      togglePlayPause 
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

// Create a custom hook to use the PlayerContext
export const usePlayerContext = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayerContext must be used within a PlayerProvider');
  }
  return context;
};

export default PlayerContext;
