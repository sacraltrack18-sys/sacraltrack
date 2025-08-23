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
import { useVibeStore } from "@/app/stores/vibeStore"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import "@/app/styles/nav-animations.css"
import React from 'react'
import toast from "react-hot-toast"
import { useNotifications, Notification } from "@/app/hooks/useNotifications"
import { MusicalNoteIcon } from "@heroicons/react/24/outline"
import TopNavGuide from '@/app/components/nav/TopNavGuide'
import { usePeopleSearch } from '@/app/context/PeopleSearchContext'

// Import the smaller components
import GenreSelector from "@/app/components/nav/GenreSelector"
import SearchBar from "@/app/components/nav/SearchBar"
import PeopleSearchBar from "@/app/components/nav/PeopleSearchBar"
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
const ClientWelcomeModal = dynamic(() => import("@/app/components/ClientWelcomeModal"), { ssr: false })
const VibeUploader = dynamic(() => import("@/app/components/vibe/VibeUploader"), { ssr: false })

const TopNav = React.memo(({ params }: { params: { id: string } }) => {    
    const userContext = useUser()
    const router = useRouter()
    const pathname = usePathname()
    const isHomePage = pathname === '/'
    const isPeoplePage = pathname === '/people'
    const [isVideoMode, setIsAudioMode] = useState(false);
    const languageMenuRef = useRef<HTMLDivElement>(null);
    const [showVibeUploader, setShowVibeUploader] = useState(false);

    // Get people search context
    const peopleSearchContext = usePeopleSearch();

    {/*SEARCH*/}
   
   const { searchTracksByName } = usePostStore();
   const vibeStore = useVibeStore();
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

        // Search for vibes based on caption or mood
        const searchVibesByText = useCallback(async (query: string) => {
            const normalizedQuery = query.trim().toLowerCase();

            if (!normalizedQuery) return [];

            try {
                // Ensure we have vibe data
                if (vibeStore.allVibePosts.length === 0) {
                    await vibeStore.fetchAllVibes();
                }

                // Search through vibes
                return vibeStore.allVibePosts
                    .filter(vibe => {
                        const caption = vibe.caption?.toLowerCase() || '';
                        const mood = vibe.mood?.toLowerCase() || '';
                        const profileName = vibe.profile?.name?.toLowerCase() || '';

                        return caption.includes(normalizedQuery) ||
                               mood.includes(normalizedQuery) ||
                               profileName.includes(normalizedQuery);
                    })
                    .slice(0, 8) // Limit vibe results
                    .map(vibe => ({
                        id: vibe.id,
                        type: 'vibe',
                        name: vibe.caption || 'Untitled Vibe',
                        image: vibe.media_url,
                        user_id: vibe.user_id,
                        description: vibe.profile?.name || 'Unknown Artist'
                    }));
            } catch (error) {
                console.error('Error searching vibes:', error);
                return [];
            }
        }, [vibeStore]);

        // Define the handleSearchName function
        const handleSearch = useCallback(
            debounce(async (query: string) => {
                if (!query.trim()) {
                    setSearchProfiles([]);
                    return;
                }

                try {
                    console.log(`[SEARCH] Searching for: "${query}"`);

                    const [profileResults, trackResults, vibeResults] = await Promise.all([
                        useSearchProfilesByName(query),
                        searchTracksByName(query),
                        searchVibesByText(query)
                    ]);

                    console.log(`[SEARCH] Found profiles: ${profileResults?.length || 0}`);
                    console.log(`[SEARCH] Found tracks: ${trackResults?.length || 0}`);
                    console.log(`[SEARCH] Found vibes: ${vibeResults?.length || 0}`);

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
                            user_id: track.user_id || track.id
                        })) || []),
                        ...(vibeResults?.map(vibe => ({
                            id: vibe.id,
                            type: 'vibe',
                            name: vibe.name,
                            image: vibe.image,
                            user_id: vibe.user_id,
                            description: vibe.description
                        })) || [])
                    ];

                    setSearchProfiles(formattedResults as (RandomUsers | Post)[]);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchProfiles([]);
                }
            }, 300),
            [searchVibesByText]
        );

        // Обработчик клика по результату поиска
        const handleSearchResultClick = (result: any) => {
            console.log(`[SEARCH] Clicking on result:`, result);

            if (result.type === 'profile') {
                router.push(`/profile/${result.user_id}`);
            } else if (result.type === 'track') {
                router.push(`/post/${result.user_id}/${result.id}`);
            } else if (result.type === 'vibe') {
                router.push(`/vibe/${result.id}`);
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
                console.log("[NAV] Navigating to upload page")
                router.push('/upload')
            }

            const goToPeople = () => {
                if (!userContext?.user) return setIsLoginOpen(true);
                console.log("[NAV] Navigating to people page")
                window.location.href = "/people";
            };

            const openVibeUploader = () => {
                if (!userContext?.user) return setIsLoginOpen(true);
                setShowVibeUploader(true);
            };

     /* Genres */
    // Оставляем только selectedGenre, так как логика выбора жанров перенесена в GenreSelector
    const { setSelectedGenre, selectedGenre } = useContext(GenreContext);

    // Add new state for welcome modal
    const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

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

    // Handle welcome modal close
    const handleWelcomeModalClose = () => {
        setShowWelcomeModal(false);
    };

    return (
        <>  
            <TopNavGuide />
            <div id="TopNav" className="fixed top-0 bg-[linear-gradient(60deg,#2E2469,#351E43)] z-[49] flex items-center h-[60px] right-0 left-0 border-b border-white/10">
                <div className={`flex items-center justify-between w-full px-3 md:px-5 mx-auto ${isHomePage ? 'max-w-full' : ''}`}>
                    {/* Logo - улучшенная версия с более надежной навигацией */}
                    <Link 
                        href="/" 
                        className="flex items-center relative group"
                        aria-label="Go to home page"
                        onClick={(e) => {
                            // Только для страницы people используем прямой переход
                            if (pathname === '/people') {
                                e.preventDefault();
                                console.log('[NAV] Navigating from people to homepage');
                                window.location.href = '/';
                            }
                        }}
                    >
                        <img 
                            className="min-w-[24px] w-[24px] transition-transform duration-200 group-hover:scale-110" 
                            src="/images/T-logo.svg"
                            alt="Sacral Track Logo"
                        />
                        <span className="px-1 py-1 pb-[2px] font-medium text-[16px] text-white hidden md:inline">ST</span>   
                        
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

                    {/* Search Bar - Conditional based on page */}
                    <div className="md:-ml-[140px]">
                        {isPeoplePage && peopleSearchContext ? (
                            <PeopleSearchBar onSearch={peopleSearchContext.onSearch} />
                        ) : (
                            <SearchBar isHomePage={isHomePage} />
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-1 md:gap-3">
                        {/* Release Button - скрыта на странице people */}
                        {pathname !== '/people' && <ReleaseButton />}

                        {/* VIBE Button - скрыта на странице people */}
                        {pathname !== '/people' && <VibeButton onOpenVibeUploader={openVibeUploader} />}

                        {/* Notification Bell */}
                        <div className="mr-1 md:mr-0">
                            <NotificationBell />
                        </div>
                        
                        {/* Profile Section - Centered with 5px top/bottom padding */}
                        <div className="flex items-center justify-center">
                            <div className="mt-[5px] mb-[5px]">
                                <ProfileMenu />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* WelcomeModal вместо TutorialGuide */}
            <ClientWelcomeModal 
                isVisible={showWelcomeModal} 
                onClose={handleWelcomeModalClose} 
                hideFirstVisitCheck={true}
            />

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
  