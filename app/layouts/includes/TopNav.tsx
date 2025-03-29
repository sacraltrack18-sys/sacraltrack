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
    const [showGenresPopup, setShowGenresPopup] = useState(false);
    const { setSelectedGenre, selectedGenre } = useContext(GenreContext);

    const handleGenresClick = () => {
        setShowGenresPopup(!showGenresPopup);
    };
    

    const handleGenreSelect = (genreName: string) => {
        const normalizedGenre = genreName.toLowerCase();
        setSelectedGenre(normalizedGenre);
        setShowGenresPopup(false);
        
        // Show toast notification
        toast.custom((t) => (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.3 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-[#24183D]/90 backdrop-blur-xl shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 pt-0.5">
                            <div className="w-10 h-10 rounded-full bg-[#20DDBB]/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#20DDBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-white">
                                Genre selected
                            </p>
                            <button 
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    setShowGenresPopup(true);
                                }}
                                className="mt-1 text-sm relative group cursor-pointer"
                            >
                                <span className="text-[#20DDBB] group-hover:text-white transition-colors duration-200">
                                    {genreName}
                                </span>
                                <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-white 
                                      group-hover:w-full transition-all duration-300"></span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-white/10">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-10 h-full flex items-center justify-center rounded-r-lg 
                                 text-white hover:text-[#20DDBB] transition-colors duration-150"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                d="M6 18L18 6M6 6l12 12">
                            </path>
                        </svg>
                    </button>
                </div>
            </motion.div>
        ), {
            duration: 3000,
            position: 'top-center',
        });
    };

      const genres: Genre[] = [
        { id: "genre-all", name: "All" },
        // Our unique genres
        { id: "genre-1", name: "Instrumental" },
        { id: "genre-2", name: "K-pop" },
        { id: "genre-3", name: "Meditative" },
        { id: "genre-4", name: "Acapella" },
        { id: "genre-5", name: "Ai" },
        { id: "genre-6", name: "Films" },
        { id: "genre-7", name: "Games" },
        { id: "genre-8", name: "Jazz" },
        { id: "genre-9", name: "Street music" },
        { id: "genre-10", name: "Poetry" },
        { id: "genre-11", name: "Rap" },
        
        // House
        { id: "genre-12", name: "Deep House" },
        { id: "genre-13", name: "Tech House" },
        { id: "genre-14", name: "Progressive House" },
        { id: "genre-15", name: "Melodic House & Techno" },
        { id: "genre-16", name: "Future House" },
        { id: "genre-17", name: "Bass House" },
        { id: "genre-18", name: "Afro House" },
        
        // Techno
        { id: "genre-19", name: "Peak Time / Driving Techno" },
        { id: "genre-20", name: "Melodic Techno" },
        { id: "genre-21", name: "Deep Techno" },
        { id: "genre-22", name: "Minimal / Deep Tech" },
        { id: "genre-23", name: "Deep / Hypnotic Techno" },
        { id: "genre-24", name: "Techno" },
        { id: "genre-25", name: "Techno (Peak Time / Driving)" },
        { id: "genre-26", name: "Techno (Melodic)" },
        
        // Trance
        { id: "genre-27", name: "Uplifting Trance" },
        { id: "genre-28", name: "Psy-Trance" },
        { id: "genre-29", name: "Tech-Trance" },
        { id: "genre-30", name: "Progressive Trance" },
        { id: "genre-31", name: "Vocal Trance" },
        { id: "genre-32", name: "Hard Trance" },
        { id: "genre-33", name: "Trance (Main Floor)" },
        { id: "genre-34", name: "Trance (Deep / Hypnotic)" },
        
        // Dubstep / Bass
        { id: "genre-35", name: "Dubstep" },
        { id: "genre-36", name: "Riddim" },
        { id: "genre-37", name: "Melodic Dubstep" },
        { id: "genre-38", name: "Bass House" },
        { id: "genre-39", name: "Future Bass" },
        { id: "genre-40", name: "Trap" },
        { id: "genre-41", name: "Bass / Club" },
        { id: "genre-42", name: "Bass Music" },
        { id: "genre-43", name: "UK Garage / Bassline" },
        
        // Breaks
        { id: "genre-44", name: "Breaks" },
        { id: "genre-45", name: "Breakbeat" },
        { id: "genre-46", name: "Breakbeat / UK Bass" },
        { id: "genre-47", name: "Electro (Classic / Detroit / Modern)" },
        
        // Hard Dance
        { id: "genre-48", name: "Hardcore / Hard Techno" },
        { id: "genre-49", name: "Hardstyle / Hardcore" },
        
        // Indie Dance / Nu Disco
        { id: "genre-50", name: "Indie Dance" },
        { id: "genre-51", name: "Nu Disco" },
        { id: "genre-52", name: "Disco" },
        { id: "genre-53", name: "Indie Dance / Nu Disco" },
        { id: "genre-54", name: "Disco / Nu Disco" },
        
        // Electronica / Downtempo
        { id: "genre-55", name: "Electronica" },
        { id: "genre-56", name: "Downtempo" },
        { id: "genre-57", name: "IDM" },
        { id: "genre-58", name: "Leftfield" },
        { id: "genre-59", name: "Ambient" },
        { id: "genre-60", name: "Chillout" },
        { id: "genre-61", name: "Trip Hop" },
        { id: "genre-62", name: "Experimental" },
        
        // Ethnic
        { id: "genre-63", name: "Ethnic" },
        
        // Afro
        { id: "genre-64", name: "Afro House" },
        { id: "genre-65", name: "Afro Tech" },
        { id: "genre-66", name: "Afro Pop" },
        { id: "genre-67", name: "Afro / Tribal" },
        
        // Minimal / Deep Tech
        { id: "genre-68", name: "Minimal" },
        { id: "genre-69", name: "Deep Tech" },
        { id: "genre-70", name: "Minimal / Deep Tech" },
        { id: "genre-71", name: "Deep House" },
        { id: "genre-72", name: "Tech House" },
        
        // Melodic House & Techno
        { id: "genre-73", name: "Melodic House & Techno" },
        { id: "genre-74", name: "Progressive House" },
        { id: "genre-75", name: "Melodic Techno" },
        { id: "genre-76", name: "Deep House" },
        { id: "genre-77", name: "Tech House" }
      ];
      
  

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
            <div id="TopNav" className="fixed top-0 bg-[linear-gradient(60deg,#2E2469,#351E43)] z-50 flex items-center h-[60px] right-0 left-0 border-b border-white/10">
                <div className={`flex items-center justify-between w-full px-3 md:px-5 mx-auto ${isHomePage ? 'max-w-full' : ''}`}>
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <img 
                            className="min-w-[24px] w-[24px] transition-transform duration-200 hover:scale-110" 
                            src="/images/T-logo.svg"
                            alt="Sacral Track Logo"
                        />
                        <span className="px-1 py-1 pb-[2px] font-medium text-[16px] hidden md:inline">ST</span>   
                    </Link>
                    
                    {/* Genres - Only visible on home page */}
                    <div className="flex items-center">
                        <GenreSelector isHomePage={isHomePage} />
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
  