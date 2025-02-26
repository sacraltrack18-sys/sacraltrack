import React, { useEffect } from "react";
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import { ProfilePageTypes } from "../types"
import { useUser } from "@/app/context/user";
import { useProfileStore } from "@/app/stores/profile"
import { useGeneralStore } from "@/app/stores/general";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { IoSettingsOutline } from 'react-icons/io5';
import EditProfileOverlay from "@/app/components/profile/EditProfileOverlay";
import '@/app/globals.css';
import ProfileComponents from "./includes/ProfileComponents"

export default function ProfileLayout({ children, params }: { children: React.ReactNode, params: ProfilePageTypes }) {
    const pathname = usePathname()
	const userContext = useUser();   
    const { currentProfile } = useProfileStore();
    const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore();
    
    useEffect(() => {
        console.log('Profile Layout Mounted:', {
            params,
            currentProfile,
            userContext: userContext?.user
        });
    }, [params, currentProfile, userContext]);
    

    // Получаем URL изображения
    const profileImage = currentProfile?.image 
        ? useCreateBucketUrl(currentProfile.image) // Если есть ID изображения, получаем URL
        : '/images/placeholder-user.jpg'; // Иначе используем заглушку

    return (
		<>
		<TopNav params={{ id: userContext?.user?.id as string }} />
		
		{isEditProfileOpen && <EditProfileOverlay />}

		<div className="flex justify-between mx-auto w-full px-5">
				<div className="flex justify-end w-full">
				{children}
			</div>
            </div>

            {/* Нижняя панель с объединенными компонентами */}
            <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-[#272B43] border-t border-[#3f2d63] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
                <div className="max-w-screen-xl mx-auto h-full flex items-center justify-between px-4">
                    {/* Левая часть (профиль) */}
                    <div className="flex items-center space-x-4">
                        <div className="w-[50px] h-[50px] rounded-2xl overflow-hidden bg-[#1E2136]">
                            <img 
                                src={profileImage}
                                alt={currentProfile?.name || 'Profile'} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/images/placeholder-user.jpg';
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-white text-[14px] font-bold truncate">
                                {currentProfile?.name || 'User Name'}
                            </p>
                            {userContext?.user?.id && currentProfile?.user_id && userContext.user.id === currentProfile.user_id && (
                                <button 
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="p-1 hover:bg-[#1E2136] rounded-full transition-colors"
                                >
                                    <IoSettingsOutline 
                                        size={18} 
                                        className="text-gray-400 hover:text-white"
                                    />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Правая часть (компоненты профиля) */}
                    <div className="flex items-center">
                        <ProfileComponents />
                    </div>
                </div>
		</div>

            {/* Отступ для контента */}
            <div className="pb-[80px]" />
	</>
    )
}


