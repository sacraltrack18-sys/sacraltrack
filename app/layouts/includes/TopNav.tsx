"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { BiSearch } from "react-icons/bi"
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
import TutorialGuide, { TutorialStep } from '@/app/components/TutorialGuide'
import NotificationBell from "@/app/components/notifications/NotificationBell"
import useNotifications from "@/app/hooks/useNotifications"
import { toast } from "react-hot-toast"
import VibeUploader from "@/app/components/vibe/VibeUploader"
import { SparklesIcon } from "@heroicons/react/24/outline"

export default function TopNav({ params }: ProfilePageTypes) {    
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
                setCurrentProfile(params?.id)
            }, [])

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
        { id: "genre-29", name: "Afro house" },
        { id: "genre-16", name: "Ambient" },
        { id: "genre-17", name: "Acapella" },
        { id: "genre-18", name: "Ai" },
        { id: "genre-10", name: "Bass" },
        { id: "genre-9", name: "DnB" },
        { id: "genre-28", name: "Downtempo" },
        { id: "genre-3", name: "Deep" },
        { id: "genre-24", name: "Deep bass" },
        { id: "genre-27", name: "Dubstep" },
        { id: "genre-26", name: "Electro" },
        { id: "genre-6", name: "Electronic" },
        { id: "genre-19", name: "Films" },
        { id: "genre-33", name: "Jazz" },
        { id: "genre-20", name: "Games" },
        { id: "genre-4", name: "Hip-hop" },
        { id: "genre-21", name: "Instrumental" },
        { id: "genre-2", name: "K-pop" },
        { id: "genre-12", name: "Lo-fi" },
        { id: "genre-5", name: "Meditative" },
        { id: "genre-11", name: "Minimal" },
        { id: "genre-13", name: "Neurofunk" },
        { id: "genre-22", name: "Poetry" },
        { id: "genre-14", name: "Psy" },
        { id: "genre-23", name: "Rap" },
        { id: "genre-7", name: "Rave" },
        { id: "genre-32", name: "Street music" },
        { id: "genre-1", name: "Techno" },
        { id: "genre-30", name: "Minimal techno" },
        { id: "genre-31", name: "Melodic techno" },
        { id: "genre-15", name: "Trap" },
        { id: "genre-8", name: "House" },
      ];
      
  

    // Add new state for tutorial
    const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('hasSeenTutorial') === 'true';
        }
        return false;
    });

    // Add new state for the release button tooltip
    const [showReleaseTooltip, setShowReleaseTooltip] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('hasSeenReleaseTooltip') !== 'true';
        }
        return true;
    });

    // Tutorial steps configuration
    const tutorialSteps: TutorialStep[] = [
        {
            id: 'welcome',
            message: "Welcome to Sacral Track! Here you can publish your original tracks and earn $1 from each sale.",
            targetElementId: 'release-button',
            position: 'bottom'
        },
        {
            id: 'genres',
            message: "Explore music by different genres and discover new artists.",
            targetElementId: 'genres-button',
            position: 'bottom'
        },
        {
            id: 'search',
            message: "Search for your favorite tracks and artists.",
            targetElementId: 'search-button',
            position: 'bottom'
        },
        {
            id: 'release',
            message: "Welcome! Here you can publish your original tracks and earn $1 from each sale.",
            targetElementId: 'release-button',
            position: 'bottom'
        }
    ];

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
            const type = imageId.startsWith('track_') ? 'track' : 'default';
            return createBucketUrl(imageId, type);
        } catch (error) {
            console.error('Error in getSearchResultImageUrl:', error);
            return '/images/placeholders/default-placeholder.svg';
        }
    };

    return (
        <>  
            <div id="TopNav" className="fixed top-0 bg-[linear-gradient(60deg,#2E2469,#351E43)] z-50 flex items-center h-[60px] right-0 left-0 border-b border-white/10">
                <div className={`flex items-center justify-between w-full px-3 md:px-5 mx-auto ${pathname === '/' ? 'max-w-full' : ''}`}>
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <img 
                            className="min-w-[24px] w-[24px] transition-transform duration-200 hover:scale-110" 
                            src="/images/T-logo.svg"
                        />
                        <span className="px-1 py-1 pb-[2px] font-medium text-[16px] hidden md:inline">ST</span>   
                    </Link>
                    
                    {/* Genres - Mobile Optimized */}
                    <div className="flex items-center">
                            {pathname === '/' && (
                                <button
                                id="genres-button"
                                className="text-white text-[13px] flex items-center"
                                onClick={handleGenresClick}
                                >
                                <img
                                    className="w-[23px] h-[23px] transition-transform duration-200 hover:scale-110"
                                    src="/images/ico-genre.svg"
                                />
                                <span className="ml-2 font-medium text-[13px] hidden md:inline">Genre</span>
                                </button>
                            )}
                    </div>

                    {/* Search Bar - Mobile Optimized */}
                    <div className="relative flex items-center">
                        <button
                            id="search-button"
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 hover:bg-[#2E2469] rounded-full transition-all duration-200"
                        >
                            <BiSearch 
                                size={24} 
                                className="text-white transition-transform duration-200 hover:scale-110" 
                            />
                        </button>

                        <AnimatePresence>
                            {showSearch && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "min(300px, 80vw)", opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute right-12 top-1/2 -translate-y-1/2"
                                >
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                        placeholder={searchPlaceholder}
                                        className="w-full px-4 py-2 bg-[#2E2469] text-white rounded-full 
                                                 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] 
                                                 placeholder-gray-400 text-sm"
                                    />

                                    {/* Search Results - Mobile Optimized */}
                                    {searchProfiles.length > 0 && (
                                        <div className="absolute top-full mt-2 w-full bg-[#24183D] rounded-xl 
                                                      shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                                            {searchProfiles.map((result) => (
                                                <div
                                                    key={`${result.type}-${result.id}`}
                                                    onClick={() => handleSearchResultClick(result)}
                                                    className="flex items-center gap-3 p-3 hover:bg-[#2E2469] 
                                                             cursor-pointer transition-colors"
                                                >
                                                    <img
                                                        src={getSearchResultImageUrl(result.image)}
                                                        alt={result.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-white font-medium text-sm">{result.name}</p>
                                                        <span className="text-gray-400 text-xs">{result.type === 'profile' ? 'Artist' : 'Track'}</span>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Side Actions - Mobile Optimized */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Release Button */}
                    <button 
                        id="release-button"
                        onClick={() => goTo()}
                            className="flex items-center rounded-2xl py-[6px] px-2 md:px-[15px]"
                    >
                            <img className="w-[24px] h-[24px]" src="/images/ico-rel.svg" />
                            <span className="ml-2 font-medium text-[13px] hidden md:inline">RELEASE</span>
                    </button>

                    {/* VIBE Button */}
                    <button 
                        id="vibe-button"
                        onClick={() => openVibeUploader()}
                        className="flex items-center rounded-2xl py-[6px] px-2 md:px-[15px]"
                    >
                        <SparklesIcon className="w-[24px] h-[24px] text-purple-400" />
                        <span className="ml-2 font-medium text-[13px] hidden md:inline">VIBE</span>
                    </button>

                    {/* Notification Bell */}
                        <NotificationBell />

                        {/* Profile Section */}
                    {!userContext?.user?.id ? (
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="flex items-center bg-[#3E83F7] text-white rounded-2xl px-2 md:px-3 py-[10px] hover:bg-[#5492FA]"
                            >
                                <span className="whitespace-nowrap mx-4 font-medium text-[14px] hidden md:inline">Log in</span>
                                <img className="w-[16px] h-[16px] md:hidden m-[3px]" src="/images/Login.svg" alt="Login" />
                            </button>
                    ) : (
                            <div className="relative">
                                <button 
                                    ref={buttonRef}
                                    onClick={() => setShowMenu(!showMenu)} 
                                    className="relative group"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-2 ring-[#20DDBB]/30 
                                                 transition-all duration-300 group-hover:ring-[#20DDBB]/50"
                                    >
                                        <img 
                                            className="w-full h-full object-cover"
                                            src={userContext?.user?.image 
                                                ? getProfileImageUrl(userContext.user.image)
                                                : '/images/placeholders/user-placeholder.svg'
                                            } 
                                            alt={userContext?.user?.name || 'User avatar'}
                                        />
                                    </motion.div>
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#20DDBB] rounded-full 
                                                  border-2 border-[#24183D] group-hover:scale-110 transition-transform"></div>
                                </button>
                                
                                {/* Profile Menu - Mobile Optimized */}
                                {showMenu && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="fixed inset-0 bg-black/40 z-40"
                                            onClick={() => setShowMenu(false)}
                                        />

                                        <motion.div
                                            ref={menuRef}
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-2 w-[280px] max-w-[90vw] bg-[#24183D] rounded-xl 
                                                     shadow-lg z-50 overflow-hidden border border-white/10"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#20DDBB]/3 to-transparent pointer-events-none opacity-30"></div>
                                            
                                            <div className="relative flex flex-col gap-2">
                                                <div className="px-6 py-3 border-b border-white/5">
                                                    <Link 
                                                        href={`/profile/${userContext?.user?.id}`}
                                                        onClick={() => setShowMenu(false)}
                                                        className="flex items-center gap-4 group/profile"
                                                    >
                                                        <motion.div 
                                                            whileHover={{ scale: 1.05 }}
                                                            className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[#20DDBB]/30
                                                                     group-hover/profile:ring-[#20DDBB]/50 transition-all duration-300
                                                                     shadow-[0_0_15px_rgba(32,221,187,0.2)]"
                                                        >
                                                            <img 
                                                                className="w-full h-full object-cover"
                                                                src={userContext?.user?.image 
                                                                    ? getProfileImageUrl(userContext.user.image)
                                                                    : '/images/placeholders/user-placeholder.svg'
                                                                } 
                                                                alt={userContext?.user?.name || 'User avatar'}
                                                            />
                                                        </motion.div>
                                                        <div>
                                                            <p className="text-white font-medium text-[15px]">
                                                                {userContext?.user?.name}
                                                            </p>
                                                            <span className="text-[#20DDBB] text-sm font-medium 
                                                                      group-hover/profile:text-white transition-colors">
                                                                View Profile
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </div>

                                                <div className="px-3 py-2">
                                                    <Link 
                                                        href="/royalty"
                                                        onClick={() => setShowMenu(false)}
                                                        className="flex items-center gap-4 p-3 text-white/90 
                                                                 rounded-xl transition-all duration-200 group relative
                                                                 hover:text-white hover:bg-[#20DDBB]/5"
                                                    >
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                                                                          group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
                                                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                                                                      className="stroke-current" strokeWidth="1.5" fill="none"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                                                                       transition-colors">Royalty</span>
                                                    </Link>

                                                    <Link 
                                                        href="/people"
                                                        onClick={() => setShowMenu(false)}
                                                        className="flex items-center gap-4 p-3 text-white/90
                                                                 rounded-xl transition-all duration-200 group relative
                                                                 hover:text-white hover:bg-[#20DDBB]/5"
                                                    >
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                                                                          group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
                                                                <path d="M16 3.23c2.51 2.48 2.51 6.5 0 9-2.51 2.48-6.57 2.48-9.08 0-2.51-2.48-2.51-6.5 0-9 2.51-2.48 6.57-2.48 9.08 0z"
                                                                      className="stroke-current" strokeWidth="1.5" fill="none"/>
                                                                <path d="M17.82 21c0-3.47-2.85-6.29-6.36-6.29S5.1 17.53 5.1 21"
                                                                      className="stroke-current" strokeWidth="1.5" fill="none"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                                                                       transition-colors">People</span>
                                                    </Link>

                                                    <Link 
                                                        href="/news"
                                                        onClick={() => setShowMenu(false)}
                                                        className="flex items-center gap-4 p-3 text-white/90
                                                                 rounded-xl transition-all duration-200 group relative
                                                                 hover:text-white hover:bg-[#20DDBB]/5"
                                                    >
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                                                                          group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
                                                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"
                                                                      className="stroke-current" strokeWidth="1.5" fill="none" 
                                                                      strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                                                                       transition-colors">News</span>
                                                    </Link>

                                                    <button 
                                                        onClick={() => { 
                                                            userContext?.logout();
                                                            setShowMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-4 p-3 text-white/90
                                                                 rounded-xl transition-all duration-200 group relative
                                                                 hover:text-white hover:bg-[#20DDBB]/5"
                                                    >
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform fill-current 
                                                                          group-hover:text-[#20DDBB]" viewBox="0 0 24 24">
                                                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                                                                      className="stroke-current" strokeWidth="1.5" fill="none"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-[14px] font-medium group-hover:text-[#20DDBB] 
                                                                       transition-colors">Log Out</span>
                                                    </button>
                                                </div>

                                                <div className="px-6 pt-3 mt-2 border-t border-white/10">
                                                    <p className="text-[12px] text-[#818BAC] font-medium">
                                                        All rights © 2025 SACRAL TRACK
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Genre Popup - Mobile Optimized */}
            <AnimatePresence>
                {showGenresPopup && (
                    <>
                        {/* Overlay for click-outside closing */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-30"
                            onClick={() => setShowGenresPopup(false)}
                        />
                        
                        {/* Genres popup with enhanced styling */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-x-0 top-[60px] z-40 p-4 md:p-6 
                                      bg-[#24183D]/40 backdrop-blur-xl border-b border-white/5
                                      shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                        >
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                                    {genres
                                        .sort((a, b) => {
                                            if (a.name === 'All') return -1;
                                            if (b.name === 'All') return 1;
                                            return a.name.localeCompare(b.name);
                                        })
                                        .map((genre) => (
                                            <motion.button
                                                key={genre.id}
                                                onClick={() => handleGenreSelect(genre.name)}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`px-4 md:px-6 py-2 md:py-3 text-[13px] md:text-[14px] 
                                                    ${selectedGenre === genre.name.toLowerCase() 
                                                        ? 'bg-[#20DDBB] text-black shadow-[0_0_15px_rgba(32,221,187,0.3)]' 
                                                        : 'bg-[#2E2469]/30 text-white hover:bg-[#2E2469]/50 border border-white/5 hover:border-white/20'
                                                    } rounded-full transition-all duration-300 
                                                    whitespace-nowrap font-medium backdrop-blur-sm
                                                    hover:shadow-[0_0_15px_rgba(32,221,187,0.15)]
                                                    hover:bg-gradient-to-r hover:from-[#2E2469]/50 hover:to-[#2E2469]/30
                                                    relative overflow-hidden group`}
                                            >
                                                <span className="relative z-10 flex items-center">
                                                    {selectedGenre === genre.name.toLowerCase() && (
                                                        <motion.span
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="w-2 h-2 bg-black rounded-full mr-1.5 inline-block"
                                                        />
                                                    )}
                                                    <span>{genre.name}</span>
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/0 to-[#20DDBB]/0 
                                                      group-hover:from-[#20DDBB]/10 group-hover:to-[#20DDBB]/0 
                                                      transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                                                <motion.div 
                                                    className="absolute inset-0 rounded-full pointer-events-none"
                                                    initial={{ opacity: 0 }}
                                                    whileHover={{ 
                                                        opacity: [0, 0.4, 0], 
                                                        scale: [1, 1.05, 1.03],
                                                        transition: { 
                                                            duration: 1.5, 
                                                            repeat: Infinity,
                                                            repeatType: "loop" 
                                                        }
                                                    }}
                                                    style={{ 
                                                        boxShadow: "0 0 0 2px rgba(32, 221, 187, 0.3)",
                                                    }}
                                                />
                                            </motion.button>
                                        ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Tutorial Guide */}
            <TutorialGuide
                steps={tutorialSteps}
                isFirstVisit={showReleaseTooltip}
                onComplete={handleTutorialComplete}
            />

            {/* Vibe uploader modal */}
            <AnimatePresence>
                {showVibeUploader && (
                    <VibeUploader 
                        onClose={() => setShowVibeUploader(false)} 
                        onSuccess={() => {
                            setShowVibeUploader(false);
                            toast.success('Your vibe has been posted!');
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
  