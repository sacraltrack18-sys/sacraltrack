import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GenreSelectorProps {
    genre: string;
    setGenre: (genre: string) => void;
}

// Удаляем дублирующиеся жанры из массива
const genres = [
    // Acapella
    "Acapella",

    // Afro
    "Afro / Tribal",
    "Afro Pop",
    "Afro Tech",

    // Ai
    "Ai",

    // Breaks
    "Breakbeat / UK Bass",
    "Breaks",
    "Electro (Classic / Detroit / Modern)",

    // Dubstep / Bass
    "Bass",
    "D'n'B",
    "Dubstep",
    "Future Bass",
    "Melodic Dubstep",
    "Neurofunk",
    "Riddim",
    "Trap",
    "UK Garage",

    // Electronica / Downtempo
    "Ambient",
    "Chillout",
    "Downtempo",
    "Electronica",
    "Experimental",
    "IDM",
    "Leftfield",
    "Trip Hop",

    // Ethnic
    "Ethnic",

    // Films
    "Films",

    // Games
    "Games",

    // Hard Dance
    "Hardcore / Hard Techno",

    // House
    "Afro House",
    "Bass House",
    "Deep House",
    "Future House",
    "House",
    "Melodic House",
    "Organic House",
    "Progressive House",
    "Tech House",

    // Indie Dance / Nu Disco
    "Disco",
    "Disco / Nu Disco",
    "Indie Dance",
    "Indie Dance / Nu Disco",
    "Nu Disco",
    
    // Instrumental
    "Instrumental",

    // Jazz
    "Jazz",

    // K-pop
    "K-pop",

    // Mantra
    "Mantra",

    // Meditative
    "Meditative",

    // Minimal
    "Deep Tech",
    "Lo-Fi",
    "Minimal",
    
    // Poetry
    "Poetry",

    // Rap
    "Rap",

    // Street music
    "Street music",

    // Techno
    "Hypnotic Techno",
    "Deep Techno",
    "Melodic Techno",
    "Minimal", // Note: Minimal is also under its own category. Kept here as per original structure if it's a sub-genre of Techno.
    "Techno",
    "Techno (Peak Time / Driving)",

    // Trance
    "Hard Trance",
    "Progressive Trance",
    "Psy-Trance",
    "Tech-Trance",
    "Trance (Deep / Hypnotic)",
    "Trance (Main Floor)",
    "Uplifting Trance",
    "Vocal Trance"
];

// Создаем массив уникальных жанров
const uniqueGenres = Array.from(new Set(genres));

// Group genres by first letter for better organization
const groupGenresByFirstLetter = () => {
    const grouped: Record<string, string[]> = {};
    uniqueGenres.forEach(genre => {
        const firstLetter = genre.charAt(0).toUpperCase();
        if (!grouped[firstLetter]) {
            grouped[firstLetter] = [];
        }
        grouped[firstLetter].push(genre);
    });
    return grouped;
};

const GenreSelector: React.FC<GenreSelectorProps> = ({ genre, setGenre }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const groupedGenres = groupGenresByFirstLetter();

    // Handle clicking outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Filter genres based on search term
    const filteredGenres = searchTerm.trim() === '' 
        ? uniqueGenres 
        : uniqueGenres.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));

    // Handle genre selection
    const handleSelectGenre = (selectedGenre: string) => {
        setGenre(selectedGenre);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Handle key press events
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'Enter' && filteredGenres.length > 0 && searchTerm.trim() !== '') {
            handleSelectGenre(filteredGenres[0]);
        }
    };

    // Обработчик для очистки выбранного жанра
    const handleClearGenre = (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем открытие/закрытие выпадающего списка
        setGenre('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Genre selector button with glass effect */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3.5 rounded-xl flex items-center justify-between
                         transition-all duration-300 backdrop-blur-md
                         bg-gradient-to-r from-[#2A184B]/70 to-[#1f1239]/70 border
                         ${isOpen 
                             ? 'border-[#20DDBB]/40 shadow-[0_0_15px_rgba(32,221,187,0.2)]' 
                             : 'border-[#20DDBB]/10 hover:border-[#20DDBB]/30'}
                         ${genre ? 'text-white' : 'text-white/40'}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{genre || 'Select a genre'}</span>
                <div className="flex items-center">
                    {genre && (
                        <span 
                            onClick={handleClearGenre}
                            className="mr-2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </span>
                    )}
                    <svg 
                        className={`w-5 h-5 text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Dropdown menu - now appears ABOVE the selector */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-30 bottom-full mb-2 w-full bg-[#1f1239]/90 backdrop-filter backdrop-blur-xl
                                rounded-xl shadow-xl border border-[#20DDBB]/20
                                overflow-hidden"
                        style={{ 
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 20px -3px rgba(32, 221, 187, 0.25)" 
                        }}
                    >
                        {/* Glow effects */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#20DDBB]/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#018CFD]/10 rounded-full blur-3xl"></div>
                        </div>
                        
                        {/* Search input */}
                        <div className="p-3 border-b border-white/10 sticky top-0 bg-[#2A184B]/70 backdrop-blur-md z-10">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search genres..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={`w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg
                                           text-white placeholder-white/40 outline-none
                                           focus:border-[#20DDBB]/30 focus:ring-1 focus:ring-[#20DDBB]/20 transition-all`}
                                />
                                <svg 
                                    className="w-4 h-4 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Genre list with enhanced styling */}
                        <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar relative">
                            {filteredGenres.length === 0 ? (
                                <div className="px-3 py-6 text-center text-white/40 text-sm">
                                    No genres found matching "{searchTerm}"
                                </div>
                            ) : searchTerm.trim() !== '' ? (
                                // Search results
                                <ul className="py-1">
                                    {filteredGenres.map((genreName, index) => (
                                        <li key={`search-${genreName}-${index}`}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectGenre(genreName)}
                                                className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-[#20DDBB]/10
                                                      ${genreName === genre 
                                                        ? 'text-[#20DDBB] font-medium bg-[#20DDBB]/10' 
                                                        : 'text-white/80'}`}
                                            >
                                                {genreName}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                // Grouped genres when not searching
                                Object.entries(groupedGenres).map(([letter, groupGenres]) => (
                                    <div key={`group-${letter}`} className="mb-2">
                                        <div className="px-4 py-1 text-xs font-semibold text-[#20DDBB]/70 uppercase tracking-wider">
                                            {letter}
                                        </div>
                                        <ul>
                                            {(groupGenres as string[]).map((genreName, index) => (
                                                <li key={`${letter}-${genreName}-${index}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectGenre(genreName)}
                                                        className={`w-full text-left px-4 py-2.5 transition-all
                                                            hover:bg-gradient-to-r hover:from-[#20DDBB]/10 hover:to-transparent
                                                            ${genreName === genre 
                                                                ? 'text-[#20DDBB] font-medium bg-gradient-to-r from-[#20DDBB]/10 to-transparent' 
                                                                : 'text-white/80'}`}
                                                    >
                                                        {genreName}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Quick selection tags with enhanced styling */}
                        <div className="p-3 border-t border-white/10 bg-[#2A184B]/40 backdrop-blur-md">
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-white/40 pt-1">Popular:</span>
                                {['House', 'Techno', 'Lo-Fi', 'Ambient', 'Bass'].map((tag, index) => (
                                    <button
                                        key={`tag-${tag}-${index}`}
                                        onClick={() => handleSelectGenre(tag)}
                                        className="px-2.5 py-1 bg-[#20DDBB]/5 hover:bg-[#20DDBB]/15 text-white/80 hover:text-white
                                               text-xs rounded-full transition-all border border-[#20DDBB]/20
                                               hover:border-[#20DDBB]/40 hover:shadow-[0_0_10px_rgba(32,221,187,0.15)]"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GenreSelector; 