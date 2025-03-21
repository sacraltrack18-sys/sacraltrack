import React, { useState, useEffect } from 'react';
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import { AiOutlinePlus, AiOutlineHeart } from 'react-icons/ai';
import useDownloadsStore from '@/app/stores/downloadsStore';
import { useUIStore } from '@/app/stores/uiStore';
import { useLikedStore } from '@/app/stores/likedStore';

const ProfileComponents = () => {
    const userContext = useUser();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const { showPurchases, toggleShowPurchases } = useDownloadsStore();
    const { showLikedTracks, setShowLikedTracks, fetchLikedPosts } = useLikedStore();

    // Добавим консоль лог для отладки
    console.log('ProfileComponents state:', { showLikedTracks, showPurchases });

    const goTo = () => {
        if (!userContext?.user) 
            setIsLoginOpen(true);
        else
            router.push('/upload');
    };

    const goToPeople = () => {
        if (!userContext?.user) 
            setIsLoginOpen(true);
        else
            router.push("/people");
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const toggleLiked = async () => {
        if (userContext?.user?.id) {
            // Сначала загружаем посты
            await fetchLikedPosts(userContext.user.id);
            // Затем переключаем отображение
            setShowLikedTracks(!showLikedTracks);
            
            // Если открыты purchased треки, закрываем их
            if (showPurchases) {
                toggleShowPurchases();
            }
        }
    };

    return (
        <div className="flex items-center gap-6">
            {/* Кнопка Purchased */}
            <button
                onClick={() => {
                    toggleShowPurchases();
                    if (showLikedTracks) {
                        setShowLikedTracks(false);
                    }
                }}
                className={`flex items-center transition-colors duration-300 group ${
                    showPurchases ? 'text-[#20DDBB]' : 'text-gray-400 hover:text-white'
                }`}
            >
                <img 
                    src="/images/downloads.svg" 
                    alt="purchased" 
                    className={`w-5 h-5 mr-2 transition-transform duration-300 ${
                        showPurchases ? 'scale-110' : 'group-hover:scale-110'
                    }`}
                />
                <span className="text-[14px] font-medium">Purchased</span>
            </button>

            {/* Кнопка I Like */}
            <button
                onClick={toggleLiked}
                className={`flex items-center transition-colors duration-300 group ${
                    showLikedTracks ? 'text-[#20DDBB]' : 'text-gray-400 hover:text-white'
                }`}
            >
                <AiOutlineHeart 
                    className={`w-5 h-5 mr-2 transition-transform duration-300 ${
                        showLikedTracks ? 'scale-110' : 'group-hover:scale-110'
                    }`}
                />
                <span className="text-[14px] font-medium">I Like</span>
            </button>
        </div>
    );
};

export default ProfileComponents;
