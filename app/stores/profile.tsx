import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { Profile } from '@/app/types';
import useGetProfileByUserId from '../hooks/useGetProfileByUserId';
  
interface ProfileStore {
    currentProfile: Profile | null;
    setCurrentProfile: (userId: string) => void;
}

export const useProfileStore = create<ProfileStore>()( 
    devtools(
        persist(
            (set) => ({
                currentProfile: null,

                setCurrentProfile: async (userId: string) => {
                    try {
                        const profile = await useGetProfileByUserId(userId);
                        set({ currentProfile: profile });
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        set({ currentProfile: null });
                    }
                },
            }),
            { 
                name: 'store', 
                storage: createJSONStorage(() => localStorage) 
            }
        )
    )
)
