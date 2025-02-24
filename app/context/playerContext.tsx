// PlayerContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PlayerContextType = {
  currentTrack: {
    id: string;
    audio_url: string;
    image_url: string;
    name: string;
    artist: string;
  } | null;
  isPlaying: boolean;
  setCurrentTrack: (track: PlayerContextType['currentTrack']) => void;
  togglePlayPause: () => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [currentTrack, setCurrentTrack] = useState<PlayerContextType['currentTrack']>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlayPause = () => setIsPlaying(prev => !prev);

    return (
        <PlayerContext.Provider value={{ 
            currentTrack, 
            isPlaying, 
            setCurrentTrack, 
            togglePlayPause 
        }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayerContext = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayerContext must be used within a PlayerProvider');
    }
    return context;
};

export default PlayerContext;
