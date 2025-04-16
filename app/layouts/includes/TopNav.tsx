"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { BsThreeDotsVertical } from "react-icons/bs"
import { useEffect, useState, useRef, useCallback } from "react" 
import { useUser } from "@/app/context/user"
import { useGeneralStore } from "@/app/stores/general"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { RandomUsers, Genre, Post, ProfilePageTypes, User, ProfileStore } from "@/app/types"
import useSearchProfilesByName from "@/app/hooks/useSearchProfilesByName"
import { useContext } from "react"
import { GenreContext } from "@/app/context/GenreContext"
import { useProfileStore } from "@/app/stores/profile"
import ClientOnly from "@/app/components/ClientOnly"
import { usePostStore } from "@/app/stores/post"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import "@/app/styles/nav-animations.css"
import React from 'react'
import toast from "react-hot-toast"
import useNotifications, { Notification } from "@/app/hooks/useNotifications"
import { TutorialStep } from "@/app/components/TutorialGuide"
import { MusicalNoteIcon } from "@heroicons/react/24/outline"

// Import the smaller components
import GenreSelector from "@/app/components/nav/GenreSelector"
import SearchBar from "@/app/components/nav/SearchBar"
import ProfileMenu from "@/app/components/nav/ProfileMenu"
import ReleaseButton from "@/app/components/nav/ReleaseButton"
import VibeButton from "@/app/components/nav/VibeButton"

// Dynamically import components that are not needed immediately
const NotificationBell = dynamic(() => import("@/app/components/notifications/NotificationBell"), { 
  ssr: false,
  loading: () => (
    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
      <div className="w-4 h-4 rounded-full bg-white/10"></div>
    </div>
  )
})
const TutorialGuide = dynamic(() => import("@/app/components/TutorialGuide"), { ssr: false })
const VibeUploader = dynamic(() => import("@/app/components/vibe/VibeUploader"), { ssr: false })

// Define tutorial steps outside the component to avoid recreation on each render
const tutorialSteps: {
    id: string;
    message: React.ReactNode;
    targetElementId: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    mobilePosition: 'top' | 'bottom' | 'center';
}[] = [
    {
        id: 'welcome',
        message: (
            <div className="space-y-1.5">
                <p className="font-semibold text-[#20DDBB]">Welcome to Sacral Track!</p>
                <p>This is your Release button. Publish your tracks on our marketplace and earn $1 per sale with our high-quality streaming platform.</p>
            </div>
        ),
        targetElementId: 'release-button',
        position: 'bottom',
        mobilePosition: 'bottom'
    },
    {
        id: 'genres',
        message: (
            <div className="space-y-1.5">
                <p className="font-semibold text-[#20DDBB]">Music Categories</p>
                <p>Explore our extensive music library by different genres to discover artists and tracks that match your taste.</p>
            </div>
        ),
        targetElementId: 'genres-button',
        position: 'bottom',
        mobilePosition: 'center'
    },
    {
        id: 'search',
        message: (
            <div className="space-y-1.5">
                <p className="font-semibold text-[#20DDBB]">Music Search</p>
                <p>Find your favorite tracks and artists in our extensive music library. Just start typing to see instant results.</p>
            </div>
        ),
        targetElementId: 'search-button',
        position: 'bottom',
        mobilePosition: 'center'
    },
    {
        id: 'vibe',
        message: (
            <div className="space-y-1.5">
                <p className="font-semibold text-[#20DDBB]">Social Network</p>
                <p>Share Vibes with our music community - post thoughts, photos, and updates to connect with other music lovers.</p>
            </div>
        ),
        targetElementId: 'vibe-button',
        position: 'bottom',
        mobilePosition: 'bottom'
    }
];

const TopNav = React.memo(({ params }: { params: { id: string } }) => {    
    const userContext = useUser()
    const router = useRouter()
    const pathname = usePathname()
    const [isVideoMode, setIsAudioMode] = useState(false);
    const languageMenuRef = useRef<HTMLDivElement>(null);
    const [showVibeUploader, setShowVibeUploader] = useState(false);

    {/*SEARCH*/}
   
   const { searchTracksByName } = usePostStore();
   const [searchProfiles, setSearchProfiles] = useState<(RandomUsers | Post)[]>([]);
   const [showSearch, setShowSearch] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const searchInputRef = useRef<HTMLInputElement>(null);
   let { setCurrentProfile, currentProfile } = useProfileStore();

    // Debounce function
        function debounce(func: Function, wait: number) {
            let timeout: number;
            return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = window.setTimeout(later, wait);
            };
        }

        // Define the handleSearchName function
        const handleSearch = useCallback(
            debounce(async (query: string) => {
                if (!query.trim()) {
            setSearchProfiles([]);
            return;
            }
        
            try {
            const [profileResults, trackResults] = await Promise.all([
                        useSearchProfilesByName(query),
                        searchTracksByName(query)
                    ]);

                    const formattedResults = [
                        ...(profileResults?.map(profile => ({
                        id: profile.id,
                            type: 'profile',
                        name: profile.name,
                        image: profile.image,
                            user_id: profile.id
                        })) || []),
                        ...(trackResults?.map(track => ({
                            id: track.id,
                            type: 'track',
                            name: track.name,
                            image: track.image,
                          
                        })) || [])
                    ];

                    setSearchProfiles(formattedResults as (RandomUsers | Post)[]);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchProfiles([]);
                }
            }, 300),
            []
        );

        // Обработчик клика по результату поиска
        const handleSearchResultClick = (result: any) => {
            if (result.type === 'profile') {
                router.push(`/profile/${result.user_id}`);
            } else {
                router.push(`/post/${result.user_id}/${result.id}`);
            }
            setShowSearch(false);
            setSearchQuery("");
            setSearchProfiles([]);
        };

        // Автофокус при открытии поиска
        useEffect(() => {
            if (showSearch && searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, [showSearch]);

            let [showMenu, setShowMenu] = useState<boolean>(false)
            let { isEditProfileOpen, setIsLoginOpen, setIsEditProfileOpen } = useGeneralStore()
            let menuRef = useRef<HTMLDivElement>(null)
            let buttonRef = useRef<HTMLButtonElement>(null)

            useEffect(() => {
                if (params.id) {
                    setCurrentProfile(params.id)
                }
            }, [params.id])

            useEffect(() => { setIsEditProfileOpen(false) }, [])

            // Обработчик клика вне меню
            useEffect(() => {
                const handleClickOutside = (event: MouseEvent) => {
                    if (showMenu && 
                        menuRef.current && 
                        buttonRef.current && 
                        !menuRef.current.contains(event.target as Node) &&
                        !buttonRef.current.contains(event.target as Node)) {
                        setShowMenu(false)
                    }
                }

                document.addEventListener('mousedown', handleClickOutside)
                return () => document.removeEventListener('mousedown', handleClickOutside)
            }, [showMenu])

            // Закрываем VibeUploader при смене страницы
            useEffect(() => {
                // При изменении pathname закрываем VibeUploader
                setShowVibeUploader(false)
            }, [pathname])

            const goTo = () => {
                if (!userContext?.user) return setIsLoginOpen(true)
                router.push('/upload')
            }

            const goToPeople = () => {
                if (!userContext?.user) return setIsLoginOpen(true);
                router.push("/people");
            };

            const openVibeUploader = () => {
                if (!userContext?.user) return setIsLoginOpen(true);
                setShowVibeUploader(true);
            };

     /* Genres */
    // Оставляем только selectedGenre, так как логика выбора жанров перенесена в GenreSelector
    const { setSelectedGenre, selectedGenre } = useContext(GenreContext);

    // Add new state for tutorial with localStorage handling on component mount only
    const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(false);
    const [showReleaseTooltip, setShowReleaseTooltip] = useState<boolean>(false);

    useEffect(() => {
        // Initialize tutorial state from localStorage
        setHasSeenTutorial(localStorage.getItem('hasSeenTutorial') === 'true');
        setShowReleaseTooltip(localStorage.getItem('hasSeenReleaseTooltip') !== 'true');
    }, []);

    // Handle tutorial completion
    const handleTutorialComplete = () => {
        setHasSeenTutorial(true);
        setShowReleaseTooltip(false);
        localStorage.setItem('hasSeenTutorial', 'true');
        localStorage.setItem('hasSeenReleaseTooltip', 'true');
    };

    // Add translation for search placeholder
    const searchPlaceholder = "Search tracks and artists...";

    const { notifications } = useNotifications();

    // Фильтруем уведомления о выводе средств
    const withdrawalNotifications = notifications.filter(notification => notification.type === 'withdrawal');

    const handleNotificationClick = (notification: Notification) => {
        // Обработка клика по уведомлению
    };

    const getProfileImageUrl = (imageId: string) => {
        if (!imageId || imageId.trim() === '') {
            return '/images/placeholders/user-placeholder.svg';
        }
        try {
            return createBucketUrl(imageId, 'user');
        } catch (error) {
            console.error('Error in getProfileImageUrl:', error);
            return '/images/placeholders/user-placeholder.svg';
        }
    };

    const getSearchResultImageUrl = (imageId: string) => {
        if (!imageId || imageId.trim() === '') {
            return '/images/placeholders/default-placeholder.svg';
        }
        try {
            const type = imageId.startsWith('track_') ? 'track' : 'user';
            return createBucketUrl(imageId, type);
        } catch (error) {
            console.error('Error in getSearchResultImageUrl:', error);
            return '/images/placeholders/default-placeholder.svg';
        }
    };

    // Client-side only state
    const [isClient, setIsClient] = useState(false);
    const [animationDots, setAnimationDots] = useState<Array<{top: string, left: string, transition: string, delay: string}>>([]);
    
    // Generate animation dots on client-side only
    useEffect(() => {
        setIsClient(true);
        const dots = Array(10).fill(0).map(() => ({
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            transition: `all ${0.5 + Math.random() * 0.5}s ease-out`,
            delay: `${Math.random() * 0.3}s`
        }));
        setAnimationDots(dots);
    }, []);

    const isHomePage = pathname === '/';

    // Preload tutorial guide component on client side for smoother first experience
    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenTutorial')) {
            // Prefetch the tutorial component if user hasn't seen it yet
            import("@/app/components/TutorialGuide");
        }
    }, []);

    return (
        <>  
            <div id="TopNav" className="fixed top-0 bg-[linear-gradient(60deg,#2E2469,#351E43)] z-[999] flex items-center h-[60px] right-0 left-0 border-b border-white/10">
                <div className={`flex items-center justify-between w-full px-3 md:px-5 mx-auto ${isHomePage ? 'max-w-full' : ''}`}>
                    {/* Logo */}
                    <Link href="/" className="flex items-center relative group">
                        <img 
                            className="min-w-[24px] w-[24px] transition-transform duration-200 group-hover:scale-110" 
                            src="/images/T-logo.svg"
                            alt="Sacral Track Logo"
                        />
                        <span className="px-1 py-1 pb-[2px] font-medium text-[16px] hidden md:inline">ST</span>   
                        
                        {/* Main Flow Badge - показывается только когда не на главной странице */}
                        {!isHomePage && (
                            <div className="ml-1 bg-gradient-to-r from-blue-400 to-teal-400 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full shadow-lg transform transition-all duration-300 group-hover:scale-110">
                                <span className="hidden md:inline">go to main flow</span>
                                <span className="inline md:hidden">flow</span>
                            </div>
                        )}
                    </Link>
                    
                    {/* Genres - Only visible on home page */}
                    <div className="flex items-center">
                        {/* Используем компонент GenreSelector вместо ручной кнопки */}
                        <GenreSelector isHomePage={isHomePage} />
                        
                        {/* Кнопка сброса жанров */}
                        {selectedGenre !== 'all' && (
                            <button
                                className="ml-2 md:ml-4 text-[13px] flex items-center px-2.5 py-1 rounded-full bg-[#20DDBB]/20 text-[#20DDBB] hover:bg-[#20DDBB]/30 transition-all duration-150"
                                onClick={() => {
                                    setSelectedGenre('all');
                                    toast.success("Showing all genres", {
                                        icon: "🎵",
                                        style: {
                                            backgroundColor: '#24183D',
                                            color: '#fff',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }
                                    });
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 mr-1">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden md:inline">All Genres</span>
                                <span className="inline md:hidden">Reset</span>
                            </button>
                        )}
                    </div>

                    {/* Search Bar - Only visible on home page */}
                    <SearchBar isHomePage={isHomePage} />

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Release Button */}
                        <ReleaseButton />

                        {/* VIBE Button */}
                        <VibeButton onOpenVibeUploader={openVibeUploader} />

                        {/* Notification Bell */}
                        <NotificationBell />
                        
                        {/* Profile Section */}
                        <ProfileMenu />
                    </div>
                </div>
            </div>

            {/* Tutorial Guide - Loaded only when needed */}
            {!hasSeenTutorial && (
                <TutorialGuide
                    steps={tutorialSteps}
                    isFirstVisit={showReleaseTooltip}
                    onComplete={handleTutorialComplete}
                />
            )}

            {/* Vibe uploader modal - Loaded only when shown */}
            {showVibeUploader && (
                <VibeUploader 
                    onClose={() => setShowVibeUploader(false)} 
                    onSuccess={() => {
                        setShowVibeUploader(false);
                        toast.success('Your vibe has been posted!');
                    }}
                />
            )}
        </>
    )
});

TopNav.displayName = 'TopNav';

export default TopNav;
  