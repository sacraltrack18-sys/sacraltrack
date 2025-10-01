// app/contexts/GenreContext.tsx
import React, { createContext, useState, useContext } from 'react';
import { usePostStore } from "@/app/stores/post";

interface GenreContextType {
    selectedGenre: string;
    setSelectedGenre: (genre: string) => void;
}

export const GenreContext = createContext<GenreContextType>({
    selectedGenre: 'all',
    setSelectedGenre: () => {},
});

export const GenreProvider = ({ children }: { children: React.ReactNode }) => {
    const [selectedGenre, setSelectedGenre] = useState('all');
    const { setGenre } = usePostStore();

    const handleGenreSelect = (genre: string) => {
        const normalizedGenre = genre.toLowerCase();
        setSelectedGenre(normalizedGenre);
        setGenre(normalizedGenre); // Обновляем жанр в store
    };

    return (
        <GenreContext.Provider value={{ 
            selectedGenre, 
            setSelectedGenre: handleGenreSelect 
        }}>
            {children}
        </GenreContext.Provider>
    );
};
