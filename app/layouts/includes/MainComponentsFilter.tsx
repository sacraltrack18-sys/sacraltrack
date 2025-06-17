import React, { useState, useEffect, useContext } from 'react';
import { AiOutlineGlobal, AiOutlineAudio, AiOutlineExperiment, AiOutlineStar, AiOutlineAppstore } from "react-icons/ai"; // Example icons
import { FaMusic, FaGlobe, FaBroadcastTower, FaCompactDisc } from 'react-icons/fa'; // More specific icons
import { useUser } from "@/app/context/user";
import { useRouter } from "next/navigation";
import { ContentFilterContext } from '@/app/context/ContentFilterContext'; // Import context
import type { FilterType } from '@/app/context/ContentFilterContext'; // Import type separately
import { HiMusicNote } from 'react-icons/hi';

export default function MainComponentsFilter() {
    const userContext = useUser();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false); // This state seems unused for filter logic

    const filterContext = useContext(ContentFilterContext);

    if (!filterContext) {
        // Handle the case where context is not available, though it should be if HomePageContent wraps this
        console.warn("ContentFilterContext not found in MainComponentsFilter");
        return null;
    }

    const { activeFilter, setActiveFilter } = filterContext;

    const filters: { name: string; value: FilterType; icon: React.ElementType }[] = [
        { name: "All Content", value: "all", icon: FaCompactDisc },
        { name: "Stracks", value: "stracks", icon: FaMusic },
        { name: "Sacral", value: "sacral", icon: AiOutlineStar }, // Using AiOutlineStar as an example
        { name: "Vibes", value: "vibe", icon: FaBroadcastTower },
        { name: "Tracks", value: "tracks", icon: HiMusicNote },
    ];

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const commonButtonClass = "flex px-3 w-full items-center rounded-xl py-2 hover:bg-[#1f1a23] transition-colors duration-200";
    const activeButtonClass = "bg-gradient-to-r from-[#20DDBB]/30 to-[#5D59FF]/30 text-[#20DDBB] shadow-md"; // Example active style
    const inactiveButtonClass = "bg-[#231c2c] text-white/80";

    return (
        <div>
            {/* For mobile, you might want a different layout, e.g., a dropdown or horizontal scroll */}
            {isMobile ? (
                <div className="ml-[20px] mt-[100px] space-y-2">
                    {filters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                            className={`${commonButtonClass} ${activeFilter === filter.value ? activeButtonClass : inactiveButtonClass}`}
                        >
                            <filter.icon className={`mr-2 ${activeFilter === filter.value ? 'text-[#20DDBB]' : 'text-white/70'}`} size={16}/>
                            <span className="font-medium text-[13px]">{filter.name}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="ml-[20px] mt-[100px] fixed space-y-2 w-[200px]"> {/* Added w-[200px] for consistency */}
                    {filters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                            className={`${commonButtonClass} ${activeFilter === filter.value ? activeButtonClass : inactiveButtonClass}`}
                        >
                            <filter.icon className={`mr-2 ${activeFilter === filter.value ? 'text-[#20DDBB]' : 'text-white/70'}`} size={16}/>
                            <span className="font-medium text-[13px]">{filter.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}