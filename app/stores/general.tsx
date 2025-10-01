import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { RandomUsers } from '../types';
import useGetRandomUsers from '../hooks/useGetRandomUsers';
  
interface GeneralStore {
    isLoginOpen: boolean,
    isRegisterOpen: boolean,
    isEditProfileOpen: boolean,
    randomUsers: RandomUsers[]
    setIsLoginOpen: (val: boolean) => void,
    setIsRegisterOpen: (val: boolean) => void,
    setIsEditProfileOpen: (val: boolean) => void,
    setRandomUsers: () => void,
}

export const useGeneralStore = create<GeneralStore>()( 
    devtools(
        persist(
            (set, get) => ({
                isLoginOpen: false,
                isRegisterOpen: false,
                isEditProfileOpen: false,
                randomUsers: [],

                setIsLoginOpen: (val: boolean) => {
                    if (val === true) {
                        set({ isRegisterOpen: false, isEditProfileOpen: false });
                    }
                    set({ isLoginOpen: val });
                },
                setIsRegisterOpen: (val: boolean) => {
                    if (val === true) {
                        set({ isLoginOpen: false, isEditProfileOpen: false });
                    }
                    set({ isRegisterOpen: val });
                },
                setIsEditProfileOpen: (val: boolean) => {
                    if (val === true) {
                        set({ isLoginOpen: false, isRegisterOpen: false });
                    }
                    set({ isEditProfileOpen: val });
                },
                setRandomUsers: async () => {
                    const result = await useGetRandomUsers()
                    set({ randomUsers: result as RandomUsers[] })
                },
            }),
            { 
                name: 'store', 
                storage: createJSONStorage(() => localStorage) 
            }
        )
    )
)
