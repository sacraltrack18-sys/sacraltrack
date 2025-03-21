import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { Profile, ProfileStore } from '../types';
import useGetProfileByUserId from '../hooks/useGetProfileByUserId';
  
export const useProfileStore = create<ProfileStore>()( 
    devtools(
        persist(
            (set) => ({
                currentProfile: null,
                profiles: [],
                loading: false,
                error: null,

                setCurrentProfile: async (userId: string) => {
                    try {
                        set({ loading: true, error: null });
                        const profile = await useGetProfileByUserId(userId);
                        set({ currentProfile: profile, loading: false });
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        set({ 
                            currentProfile: null, 
                            loading: false,
                            error: error instanceof Error ? error.message : 'Unknown error' 
                        });
                    }
                },
                
                getAllProfiles: async (page: number) => {
                    // Implementation will go here
                    return [];
                },
                
                searchProfiles: async (query: string) => {
                    // Implementation will go here
                    return [];
                },
                
                getProfileById: async (userId: string) => {
                    // Implementation will go here
                    return null;
                },
                
                updateProfile: async (userId: string, data: any) => {
                    // Implementation will go here
                }
            }),
            { 
                name: 'store', 
                storage: createJSONStorage(() => localStorage) 
            }
        )
    )
)
