export interface PostWithProfile {
  id: string;
  user_id: string;
  trackname: string;
  image_url: string;
  audio_url: string;
  mp3_url: string;
  m3u8_url: string;
  created_at: string;
  text: string;
  price: any;
  genre: string;
  description?: string;
  profile: {
    user_id: string;
    name: string;
    image: string;
  };
}

export interface PostUserCompTypes {
  params: {
    userId: string;
    postId: string;
  };
  post: PostWithProfile;
  userId: string;
}

export interface EditTrackPopupProps {
  postData: PostWithProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
}

export interface CropperDimensions {
    width: number;
    height: number;
    left: number;
    top: number;
}

export interface ShowErrorObject {
    type: string;
    message: string;
}

export interface ProfilePageTypes {
    params: {
        id: string;
    };
}

export interface UploadError {
    type: 'file' | 'trackname' | 'genre' | string;
    message: string;
    code?: string;
    details?: string;
}

export interface CommentsCompTypes {
  params: { 
    userId: string; 
    postId: string; 
  };
}

export interface CommentsHeaderCompTypes {
  params: { 
    userId: string; 
    postId: string; 
  };
  post: PostWithProfile;
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

export interface SingleCommentCompTypes {
  params: { userId: string; postId: string; };
  comment: CommentWithProfile;
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

export interface PostMainCompTypes {
  router: any;
  post: PostWithProfile;
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
  };
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  text: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
}

export interface PostMainLikesCompTypes {
  post: PostWithProfile;
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

export interface RoyaltyPayment {
  id: string;
  user_id: string;
  user_name: string;
  amount: string;
  card: string;
  card_name: string;
  card_date: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Friend {
  id: string;
  user_id: string;
  name: string;
  image?: string;
  status: string;
}

export interface FriendStore {
  allFriends: Friend[];
  pendingRequests: Friend[];
  notifications: Notification[];
  setAllFriends: () => Promise<void>;
  addFriend: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  youtube?: string;
  telegram?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  image: string;
  bio: string;
  genre?: string;
  location?: string;
  website?: string;
  role?: string;
  verified?: boolean;
  social_links?: SocialLinks | string;
  total_likes?: string;
  total_followers?: string;
  average_rating?: string;
  total_ratings?: string;
  stats?: string;
  display_name?: string;
  is_public?: string;
  account_type?: string;
  featured_track_id?: string;
  settings?: string[];
  banner_image?: string;
  joined_date?: string;
  last_active?: string;
  preferred_languages?: string;
  updated_at?: string;
  created_at?: string;
}

export interface UserProfileCompTypes {
  profile: {
    id: string;
    user_id: string;
    name: string;
    image: string;
    bio: string;
  };
}

export interface User {
  id: string;
  name: string;
  bio?: string;
  image?: string;
}

export interface UserContextTypes {
  user: User | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUser: () => Promise<void>;
  id: string | null;
}

export interface ProcessingStats {
  stage: string;
  progress: number;
  details: string;
}

export interface Purchase {
  $id: string;
  user_id: string;
  track_id: string;
  author_id: string;
  purchase_date: string;
  amount: string;
}

export interface RoyaltyTransaction {
  author_id: string;
  track_id: string;
  amount: string;
  transaction_date: string;
  purchase_id: string;
  status: string;
}

export interface MenuItemTypes {
  iconString: string;
  colorString: string;
  sizeString: number;
}

export interface MenuItemFollowCompTypes {
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface RandomUsers {
  id: string;
  name: string;
  image: string;
  user_id: string;
  type: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface Post {
  id: string;
  name: string;
  image: string;
  user_id?: string;
  type: string;
}

export interface PostPageTypes {
  params: {
    postId: string;
    userId: string;
  };
}

export interface ProfileType {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  name?: string;
  image?: string;
  bio?: string;
  stats?: any;
  $id?: string;
  $stats?: any;
  joined_date?: string;
  location?: string;
  genre?: string;
  website?: string;
  verified?: boolean;
  followers_count?: number;
  tracks_count?: number;
  likes_count?: number;
  post_count?: number;
  role?: string;
  social_links?: SocialLinks | string | {
    twitter?: string;
    instagram?: string;
    soundcloud?: string;
    youtube?: string;
    spotify?: string;
    telegram?: string;
  };
} 