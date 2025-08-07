import { CSSProperties } from 'react';


export interface UserContextTypes {
    id: string | null;
    user: User | null;
    register: (name: string, email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkUser: () => Promise<void>;
}

export interface VibeLike {
  id: string;
  user_id: string;
  vibe_id: string;
}


export interface Product {
    post: PostMainCompTypes;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
    onDeleteItem: () => void;
    item: {
        id: string;
      };
  }

  export interface RoyaltyPayment {
    id: string;
    user_id: string;
    user_name: string; // Assuming you have this to display the user's name
    amount: string;
    card: string;
    card_name: string;
    card_date: string;
  }
  

  export interface PaidPostData {
    id: string;
    title: string;
    description: string;
    audio_url: string;
    m3u8_url: string;
    image_url: string; // Add the image_url property
    cart_items: string[];
    created_at: string;
    updated_at: string;
    posts?: PostWithProfile[];

  }



export interface User {
    id: string,
    name: string,
    bio: string,
    image: string,
}

export interface Profile {
    id: string;
    user_id: string;
    name: string;
    image: string;
    bio: string;
}

export interface Friend {
    id: string;
    user_id: string;
    name: string;
    image: string;
}

export interface FriendsStore {
    allFriends: Friend[];
    setAllFriends: () => Promise<void>;
    addFriend: (userId: string) => Promise<void>;
    removeFriend: (userId: string) => Promise<void>;
  }

export interface RandomUsers {
    id: string;
    name: string;
    image: string;
    type: string;
    profile: {
        user_id: string;
        name: string;
        image: string;
    }

    
}

export interface CropperDimensions {
    height?: number | null;
    width?: number | null;
    left?: number | null;
    top?: number | null;
}

export interface Like {
    id: string;
    user_id: string;
    post_id: string;
  }

export interface Post {
    id: string;
    user_id: string;
    audio_url: string;
    image_url: string;
    mp3_url: string;
    m3u8_url: string | null;
    text: string;
    created_at: string;
    trackname: string;
    price: any;
    updated_at: string; // This is the property you are referring to
    segments?: string | null; // Если у вас есть сегменты
    streaming_urls?: string[]; // Массив стриминговых URL
    genre: string;
    type: string;  // Add the 'type' property to the interface
    name: string;
    image: string;
    description?: string;
    profile: {
        user_id: string;
        name: string;
        image: string;
    }
}

export interface PostWithProfile {
    id: string;
    user_id: string;
    audio_url: string;
    mp3_url: string;
    m3u8_url: string;
    trackname: string;
    image_url: string;
    text: string;
    created_at: string;
    price: any;
    genre: string;
    description?: string;
    profile: {
        user_id: string;
        name: string;
        image: string;
    };
}

export interface CommentWithProfile {
    id: string;
    user_id: string;
    post_id: string;
    text: string;
    created_at: string;
    profile: {
        user_id: string;
        name: string;
        image: string;
    }
}

export type Action = {
    file: File; // файл WAV, который вы хотите конвертировать
    file_name: string; // имя файла
  };

  export type GenresContextProps = {
    genres: string[];
    tracks: Track[];
    filteredTracks: Track[];
  };

  export const genres: string[] = [
    // Our unique genres
    "Instrumental",
    "K-pop",
    "Meditative",
    "Acapella",
    "Ai",
    "Films",
    "Games",
    "Jazz",
    "Street music",
    "Poetry",
    "Rap",
    
    // House
    "Deep House",
    "Tech House",
    "Progressive House",
    "Melodic House",
    "Future House",
    "Bass House",
    "Afro House",
    
    // Techno
    "Peak Time / Driving Techno",
    "Melodic Techno",
    "Deep Techno",
    "Minimal / Deep Tech",
    "Deep / Hypnotic Techno",
    "Techno",
    "Electro-Techno",
    "Minimal-Techno",
   
    
    // Trance
    "Uplifting Trance",
    "Psy-Trance",
    "Tech-Trance",
    "Progressive Trance",
    "Vocal Trance",
    "Hard Trance",
    "Trance (Main Floor)",
    "Trance (Deep / Hypnotic)",
    
    // Dubstep / Bass
    "Dubstep",
    "Riddim",
    "Melodic Dubstep",
    "Bass House",
    "Future Bass",
    "Trap",
    "Bass / Club",
    "Bass Music",
    "UK Garage / Bassline",
    "Drum'n'Bass",
    
    // Breaks
    "Breaks",
    "Breakbeat",
    "Breakbeat / UK Bass",
    "Electro (Classic / Detroit / Modern)",
    
    // Hard Dance
    "Hardcore / Hard Techno",
    "Hardstyle / Hardcore",
    
    // Indie Dance / Nu Disco
    "Indie Dance",
    "Nu Disco",
    "Disco",
    "Indie Dance / Nu Disco",
    "Disco / Nu Disco",
    
    // Electronica / Downtempo
    "Electronica",
    "Downtempo",
    "IDM",
    "Leftfield",
    "Ambient",
    "Chillout",
    "Trip Hop",
    "Experimental",
    
    // Ethnic
    "Ethnic",
    
    // Afro
    "Afro House",
    "Afro Tech",
    "Afro Pop",
    "Afro / Tribal",
    
    // Minimal / Deep Tech
    "Minimal",
    "Deep Tech",
    "Minimal / Deep Tech",
    "Deep House",
    "Tech House",
    
    // Melodic House
    "Melodic House",
    "Progressive House",
    "Deep House",
    "Tech House"
  ];

export interface Genre {
    id: string;
    name: string;
  };

  export interface Track {
    id: string;
    name: string;
  };


export interface Comment {
    id: string;
    user_id: string;
    post_id: string;
    text: string;
    created_at: string;
}

export interface ShowErrorObject {
    type: string;
    message: string;
}

export interface UploadError {
    type: string;
    message: string;
}


export interface ProfileType {
    id:string
    user_id: string;
    image_url: string;
    created_at: string;
}



export interface SegmentData {
    name: string;
    data: string; // Base64 encoded data
}

//////////////////////////////////////////////
//////////////////////////////////////////////

export interface UserProfileCompTypes {
    profile: Profile
}



// COMPONENT TYPES
export interface CommentsHeaderCompTypes {
    params: { userId: string; postId: string; };
    post: PostWithProfile
}


export interface CommentsCompTypes {
    params: { 
        userId: string; 
        postId: string; 
    };
}

export interface PostPageTypes {
    params: Promise<{ userId: string; postId: string; }>;
}

export interface ProfilePageTypes {
    params: { 
        id: string;  // Ensure 'id' is defined here
    };
}

export interface SingleCommentCompTypes {
    params: { userId: string; postId: string; };
    comment: CommentWithProfile
}

export interface PostUserCompTypes {
    params: { userId: string; postId: string; };
    post: PostWithProfile;
    userId: string;
}

export interface PostMainCompTypes {
    router: any;
    post: PostWithProfile
    id: string;
    user_id: string;
    audio_url: string;
    image_url: string;
    price: any;
    mp3_url: string;
    m3u8_url: string;
    text: string;
    trackname: string;
    created_at: string;
    genre: string;
    profile: {
        user_id: string;
        name: string;
        image: string;
    }
}

export interface PostMainLikesCompTypes {
    post: PostWithProfile
}

export interface TextInputCompTypes {
    string: string;
    inputType: string;
    placeholder: string;
    onUpdate: (newValue: string) => void;
    error: string;
    className?: string; // Добавляем свойство className
  style?: CSSProperties; // Добавляем свойство style
}


export interface PeopleCardCompTypes {
    id: string;
    user_id: string;
    image_url: string;
    created_at: string;
}


//////////////////////////////////////////////
//////////////////////////////////////////////

// LAYOUT INCLUDE TYPES
export interface MenuItemTypes {
    iconString: string,
    colorString: string,
    sizeString: string
}

export interface MenuItemFollowCompTypes {
    user: RandomUsers
}

export interface SearchResult {
    id: string;
    type: 'profile' | 'track';
    name: string;
    image: string;
    user_id: string;
}

export interface SearchProfileResult extends SearchResult {
    type: 'profile';
}

export interface SearchTrackResult extends SearchResult {
    type: 'track';
}

// Добавим новые типы
export interface Purchase {
  $id?: string;
  user_id: string;
  track_id: string;
  author_id: string;
  purchase_date: string;
  amount: string;
}

export interface RoyaltyTransaction {
  $id?: string;
  author_id: string;
  track_id: string;
  amount: string;
  transaction_date: string;
  purchase_id: string;
  status: 'pending' | 'withdrawn' | 'completed'; // Добавляем статус
}

export interface ProcessingStats {
    stage: string;
    progress: number;
    details: string | undefined;
}

export interface SocialLinks {
    twitter?: string;
    instagram?: string;
    soundcloud?: string;
    youtube?: string;
    telegram?: string;
}

export interface SystemNotification {
    id: string;
    user_id: string;
    type: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

export interface ProfileStore {
    currentProfile: {
        $id: string;
        user_id: string;
        name: string;
        image: string;
        bio: string;
        stats: {
            totalLikes: number;
            totalFollowers: number;
            averageRating: number;
            totalRatings: number;
        };
    } | null;
    profiles: any[];
    loading: boolean;
    error: string | null;
    setCurrentProfile: (userId: string) => Promise<void>;
    getAllProfiles: (page: number) => Promise<any[]>;
    searchProfiles: (query: string) => Promise<any[]>;
    getProfileById: (userId: string) => Promise<any | null>;
    updateProfile: (userId: string, data: any) => Promise<void>;
}

export interface EditTrackPopupProps {
    postData: PostWithProfile;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (data: any) => void;
}