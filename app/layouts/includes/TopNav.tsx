"use client"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { BiSearch } from "react-icons/bi"
import { BsThreeDotsVertical } from "react-icons/bs"
import { useEffect, useState, useRef, useCallback } from "react" 
import { useUser } from "@/app/context/user"
import { useGeneralStore } from "@/app/stores/general"
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { RandomUsers } from "@/app/types"
import useSearchProfilesByName from "@/app/hooks/useSearchProfilesByName"
import { useContext } from "react"
import { Genre } from "@/app/types";
import { GenreContext } from "@/app/context/GenreContext";
import { ProfilePageTypes, User } from "@/app/types"
import { useProfileStore } from "@/app/stores/profile"
import ClientOnly from "@/app/components/ClientOnly"
import { Post } from "@/app/types";
import { usePostStore } from "@/app/stores/post"
import { motion, AnimatePresence } from "framer-motion";





export default function TopNav({ params }: ProfilePageTypes) {    
    const userContext = useUser()
    const router = useRouter()
    const pathname = usePathname()
    const [isVideoMode, setIsAudioMode] = useState(false);

    {/*SEARCH*/}
   
   const { searchTracksByName } = usePostStore();
   const [searchProfiles, setSearchProfiles] = useState<(RandomUsers | Post)[]>([]);
   const [showSearch, setShowSearch] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const searchInputRef = useRef<HTMLInputElement>(null);

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
            let { setCurrentProfile, currentProfile } = useProfileStore()
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
      
  

    return (
        <>  
            <div id="TopNav" className="fixed bg-[linear-gradient(60deg,#2E2469,#351E43)] z-30 flex items-center  h-[70px] right-0 left-0 border-b-2 border-[#fff] ">
                <div className={`flex items-center justify-between gap-6 w-full pl-5 pr-2 mx-auto ${pathname === '/' ? 'max-w-full' : ''}`}>

                    <Link href="/" className="flex items-center">
                        <img 
                            className="min-w-[24px] w-[24px] mr-0 md:mr-2 transition-transform duration-200 hover:scale-110" 
                            src="/images/T-logo.svg"
                        />
                        <span className="px-1 py-1 font-medium text-[13px] hidden md:inline">T</span>   
                    </Link>
                    

                    {/* Genres */}
                    <div className="flex items-center justify-content-between">
                            {pathname === '/' && (
                                <button
                                className="text-white text-[13px] flex items-center mr-0 md:mr-4"
                                onClick={handleGenresClick}
                                >
                                <img
                                    className="w-[23px] h-[23px] mr-2 transition-transform duration-200 hover:scale-110"
                                    src="/images/ico-genre.svg"
                                />
                                <span className="px-1 py-1 font-medium text-[13px] hidden md:inline"></span>
                                </button>
                            )}
                    {showGenresPopup && (
                        <div className="absolute z-10 top-0 right-0 p-6 left-0 mt-[80px] bg-[#24183D] rounded-2xl shadow-2xl">
                            <div className="flex flex-wrap gap-3">
                                {genres
                                    .sort((a, b) => {
                                        if (a.name === 'All') return -1;
                                        if (b.name === 'All') return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((genre) => (
                                        <button
                                key={genre.id}
                                onClick={() => handleGenreSelect(genre.name)} 
                                            className={`px-6 py-3 text-[14px] ${
                                                selectedGenre === genre.name.toLowerCase() 
                                                ? 'bg-[#20DDBB] text-black' 
                                                : 'bg-[#2E2469] text-white'
                                            } hover:bg-[#20DDBB] 
                                            rounded-full transition-all duration-300 
                                            whitespace-nowrap hover:text-black font-medium
                                            hover:shadow-lg hover:scale-105`}
                            >
                                {genre.name}
                                        </button>
                            ))}
                            </div>
                        </div>
                    )}



                    </div>

                    {/* Search Bar */}
                    <div className="relative flex items-center">
                        <button
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
                                    animate={{ width: "300px", opacity: 1 }}
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
                                        placeholder="Search tracks and artists..."
                                        className="w-full px-4 py-2 bg-[#2E2469] text-white rounded-full 
                                                 focus:outline-none focus:ring-2 focus:ring-[#20DDBB] 
                                                 placeholder-gray-400"
                                    />

                                    {/* Search Results */}
                                    {searchProfiles.length > 0 && (
                                        <div className="absolute top-full mt-2 w-full bg-[#24183D] rounded-xl 
                                                      shadow-xl overflow-hidden">
                                            {searchProfiles.map((result) => (
                                                <div
                                                    key={`${result.type}-${result.id}`}
                                                    onClick={() => handleSearchResultClick(result)}
                                                    className="flex items-center gap-3 p-3 hover:bg-[#2E2469] 
                                                             cursor-pointer transition-colors"
                                                >
                                                    <img
                                                        src={useCreateBucketUrl(result.image) || '/images/placeholder.jpg'}
                                                        alt={result.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-white font-medium">{result.name}</p>
                                                        <p className="text-gray-400 text-sm">
                                                            {result.type === 'profile' ? 'Artist' : 'Track'}
                                                        </p>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* AUDIO/VIDEO SWITCH */}
                    <div className={`h-[60px] w-[100px] py-2 my-2 cursor-pointer hidden rounded-xl  items-center justify-center ${isVideoMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <label htmlFor="modeSwitch" className="switch">
                            <input
                            type="checkbox"
                            id="modeSwitch"
                            checked={isVideoMode}
                            onChange={() => setIsAudioMode(!isVideoMode)}
                            className="hidden"
                            />
                            <div className="slider round"></div>
                        </label>
                        </div>

                    <div className="flex items-center gap-3 ">  
                    
                    
                    {/* Release a track button */}
                    <div className="flex items-center gap-4">
                    <button 
                        onClick={() => goTo()}
                        className="flex pl-[15px] pr-[15px] items-center bg-[#] rounded-2xl py-[6px] hover:bg-[#]"
                    >
                        <img className="w-[24px] h-[24px] mr-2" src="/images/ico-rel.svg" />
                        <span className="px-2 py-1 font-medium text-[13px] h-[30px] md:hidden"></span>
                        <span className="px-1 py-1 font-medium text-[13px] hidden md:inline">RELEASE</span>
                    </button>
                    </div>


                    {/* Profile button */}

                        {!userContext?.user?.id ? (
                            <div className="flex items-center">
                            <button
                              onClick={() => setIsLoginOpen(true)}
                              className="flex items-center bg-[#3E83F7] text-white rounded-2xl px-3 py-[10px] hover:bg-[#5492FA]"
                            >
                              <span className="whitespace-nowrap mx-4 font-medium text-[14px] md:inline hidden">Log in</span>
                              <img className="w-[16px] h-[16px] md:hidden m-[3px]" src="/images/Login.svg" alt="Login" />
                            </button>
                            <BsThreeDotsVertical color="#161724" size="25" />
                          </div>
                          
                        ) : (
                            <div className="flex items-center">

                                <div className="relative">

                                    <button 
                                        ref={buttonRef}
                                        onClick={() => setShowMenu(!showMenu)} 
                                        className="relative"
                                    >
                                        <img 
                                            className="w-8 h-8 rounded-full object-cover"
                                            src={useCreateBucketUrl(userContext?.user?.image || '')}
                                        />
                                    </button>
                                    
                                    {showMenu && (
                                        <>
                                            {/* Затемнение фона */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                                                onClick={() => setShowMenu(false)}
                                            />

                                            {/* Меню */}
                                            <motion.div
                                                ref={menuRef}
                                                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                                transition={{ 
                                                    duration: 0.2,
                                                    ease: "easeOut"
                                                }}
                                                className="absolute bg-[#24183D] rounded-2xl mt-5 py-4 w-[200px] 
                                                         shadow-xl top-[40px] right-0 z-50"
                                            >
                                                <div className="flex flex-col gap-2">
                                                    {/* Profile Info */}
                                                    <div className="px-4 py-2 border-b border-[#2E2469]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                                                <img 
                                                                    className="w-full h-full object-cover"
                                                                    src={userContext?.user?.image 
                                                                        ? useCreateBucketUrl(userContext.user.image)
                                                                        : '/images/placeholder-user.jpg'
                                                                    } 
                                                                    alt={userContext?.user?.name || 'User avatar'}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium text-sm">
                                                                    {userContext?.user?.name}
                                                                </p>
                                                                <p className="text-[#818BAC] text-xs">
                                                                    View profile
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Menu Items */}
                                                    <div className="px-2">
                                                        <Link 
                                                            href={`/profile/${userContext?.user?.id}`}
                                                            onClick={() => setShowMenu(false)}
                                                            className="flex items-center gap-3 p-3 text-white hover:bg-[#2E2469] rounded-xl transition-colors"
                                                        >
                                                            <img src="/images/profile.svg" className="w-5 h-5" />
                                                            <span className="text-[13px]">Profile</span>
                                                        </Link>

                                                        <Link 
                                                            href="/royalty"
                                                            onClick={() => setShowMenu(false)}
                                                            className="flex items-center gap-3 p-3 text-white hover:bg-[#2E2469] rounded-xl transition-colors"
                                                        >
                                                            <img src="/images/royalty.svg" className="w-5 h-5" />
                                                            <span className="text-[13px]">Royalty</span>
                                                        </Link>

                                                        <Link 
                                                            href="/people"
                                                            onClick={() => setShowMenu(false)}
                                                            className="flex items-center gap-3 p-3 text-white hover:bg-[#2E2469] rounded-xl transition-colors"
                                                        >
                                                            <img src="/images/people.svg" className="w-5 h-5" />
                                                            <span className="text-[13px]">People</span>
                                                        </Link>

                                            <button 
                                                onClick={() => { 
                                                                    userContext?.logout();
                                                                    setShowMenu(false);
                                                }}
                                                                className="w-full flex items-center gap-3 p-3 text-white hover:bg-[#2E2469] rounded-xl transition-colors"
                                            >
                                                                <img src="/images/logout.svg" className="w-5 h-5" />
                                                                <span className="text-[13px]">Log out</span>
                                            </button>
                                            </div>

                                                    {/* Footer */}
                                                    <div className="px-4 pt-2 mt-2 border-t border-[#2E2469]">
                                                        <p className="text-[11px] text-[#818BAC]">
                                                            © 2024 SACRAL TRACK
                                                        </p>
                                            </div>
                                        </div>
                                            </motion.div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
  