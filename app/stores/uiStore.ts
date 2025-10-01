import { create } from 'zustand';

interface UIStore {
    showLikedTracks: boolean;
    setShowLikedTracks: (show: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    showLikedTracks: false,
    setShowLikedTracks: (show) => set({ showLikedTracks: show }),
})); 