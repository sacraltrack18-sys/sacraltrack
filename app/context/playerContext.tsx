// PlayerContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PlayerContextType {
    currentAudioId: string | null;
    setCurrentAudioId: (id: string | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
    const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);

    return (
        <PlayerContext.Provider value={{ currentAudioId, setCurrentAudioId }}>
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
