import { create } from 'zustand';
import useGetLikedPostsByUserId from '../hooks/useGetLikedPostsByUserId';

interface LikedStore {
    likedPosts: any[];
    isLoading: boolean;
    error: string | null;
    showLikedTracks: boolean;
    setShowLikedTracks: (show: boolean) => void;
    fetchLikedPosts: (userId: string) => Promise<void>;
}

export const useLikedStore = create<LikedStore>((set, get) => ({
    likedPosts: [],
    isLoading: false,
    error: null,
    showLikedTracks: false,
    setShowLikedTracks: (show) => {
        console.log('Setting showLikedTracks to:', show);
        set({ showLikedTracks: show });
    },
    fetchLikedPosts: async (userId: string) => {
        try {
            set({ isLoading: true, error: null });
            const posts = await useGetLikedPostsByUserId(userId);
            console.log('Setting liked posts:', posts);
            set({ 
                likedPosts: posts, 
                isLoading: false
            });
        } catch (error) {
            console.error('Error fetching liked posts:', error);
            set({ 
                error: 'Failed to fetch liked posts', 
                isLoading: false 
            });
        }
    }
})); 