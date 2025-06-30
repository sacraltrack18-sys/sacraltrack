import { Genre } from "@/app/types";

export const genres: Genre[] = [
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
  { id: "genre-15", name: "Melodic House" },
  { id: "genre-16", name: "Future House" },
  { id: "genre-17", name: "Bass House" },
  { id: "genre-18", name: "Afro House" },
  { id: "genre-new-1", name: "Organic House" },
  
  // Techno
  { id: "genre-21", name: "Deep Techno" },
  { id: "genre-22", name: "Minimal" },
  { id: "genre-23", name: "Deep / Hypnotic Techno" },
  { id: "genre-24", name: "Techno" },
  { id: "genre-25", name: "Techno (Peak Time / Driving)" },
  { id: "genre-26", name: "Techno (Melodic)" },
  { id: "genre-new-3", name: "Electro-Techno" },
  { id: "genre-new-4", name: "Minimal-Techno" },
  
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
  { id: "genre-39", name: "Future Bass" },
  { id: "genre-40", name: "Trap" },
  { id: "genre-41", name: "Bass" },
  { id: "genre-43", name: "UK Garage" },
  { id: "genre-44", name: "D'n'B" },
  { id: "genre-new-2", name: "Neurofunk" },
  { id: "genre-new-5", name: "Drum'n'Bass" },
  
  // Breaks
  { id: "genre-44", name: "Breaks" },
  { id: "genre-45", name: "Breakbeat" },
  { id: "genre-47", name: "Electro (Classic / Detroit / Modern)" },
  
  // Hard Dance
  { id: "genre-48", name: "Hardcore / Hard Techno" },
  
  // Indie Dance / Nu Disco
  { id: "genre-50", name: "Indie Dance" },
  { id: "genre-51", name: "Nu Disco" },
  { id: "genre-52", name: "Disco" },
  
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
  { id: "genre-65", name: "Afro Tech" },
  { id: "genre-66", name: "Afro Pop" },
  { id: "genre-67", name: "Afro / Tribal" },
  
  // Minimal / Deep Tech
  { id: "genre-69", name: "Deep Tech" },
  { id: "genre-78", name: "Lo-Fi" },
  { id: "genre-79", name: "House" }
];

// Функция для удаления дублирующихся жанров
const removeDuplicateGenres = (): Genre[] => {
  const seenNames = new Set<string>();
  return genres.filter(genre => {
    if (seenNames.has(genre.name.toLowerCase())) {
      return false; // Пропускаем дублирующиеся жанры
    }
    seenNames.add(genre.name.toLowerCase());
    return true;
  });
};

// Экспортируем массив уникальных жанров
export const uniqueGenres = removeDuplicateGenres(); 