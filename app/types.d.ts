/**
 * Глобальные типы и декларации для приложения
 */

// Декларации модулей, чтобы убрать ошибки импорта
declare module '@/app/context/user' {
    export interface User {
        id: string;
        name?: string;
        email?: string;
        [key: string]: any;
    }
    
    export interface UserContextType {
        user: User | null;
        isLoading: boolean;
    }
    
    export interface UserContextTypes {
        user: User | null;
        register: (name: string, email: string, password: string) => Promise<any>;
        login: (email: string, password: string) => Promise<any>;
        logout: () => Promise<any>;
        checkUser: () => Promise<User | null>;
    }
    
    export function useUser(): UserContextTypes | null;
    export const AUTH_STATE_CHANGE_EVENT: string;
    export function dispatchAuthStateChange(userData: User | null): void;
}

declare module '@/app/hooks/useCreatePost' {
    export interface UploadParams {
        audio: File;
        image: File;
        trackname: string;
        genre: string;
        userId?: string;
        onProgress?: (stage: string, progress: number, estimatedTime?: string) => void;
    }
    
    export interface UploadResult {
        success: boolean;
        trackId?: string;
        postId?: string;
        $id?: string;
        error?: string;
    }
    
    export interface CreatePostHook {
        createPost: (params: UploadParams) => Promise<UploadResult>;
        createSegmentFile: (segmentFile: File) => Promise<string>;
        [key: string]: any;
    }
    
    export function useCreatePost(): CreatePostHook;
}

declare module '@/libs/AppWriteClient' {
    import { Client, Storage, Databases } from 'appwrite';
    
    export const client: Client;
    export const storage: Storage;
    export const database: Databases;
    export const databases: Databases;
}

declare module '@/app/components/upload/UploadProgress' {
    import React from 'react';
    
    export interface UploadProgressProps {
        isActive: boolean;
        stage: string;
        progress: number;
        onCancel: () => void;
        confirmCancel: () => void;
    }
    
    export const UploadProgress: React.FC<UploadProgressProps>;
    export const BackgroundProgress: React.FC<any>;
}

declare module '@/app/layouts/includes/TopNav' {
    import React from 'react';
    
    interface TopNavProps {
        params: {
            id: string;
        };
    }
    
    const TopNav: React.FC<TopNavProps>;
    export default TopNav;
}

// Определяем дополнительные типы для Next.js
import 'next';

declare module 'next' {
  // Переопределяем PageProps чтобы оно принимало обычный объект для params
  export interface PageProps {
    params?: {
      [key: string]: string;
    };
    searchParams?: {
      [key: string]: string | string[];
    };
  }
}

// Appwrite specific document types that match exactly the schema in Appwrite
export interface AppwriteProfileDocument {
  $id: string;
  user_id: string;
  name: string;
  image: string;
  bio: string;
  genre?: string;
  location?: string;
  website?: string;
  role?: string;
  display_name?: string;
  banner_image?: string;
  is_public?: string;
  account_type?: string;
  featured_track_id?: string;
  preferred_languages?: string;
  settings?: string[];
  social_links?: any;
  created_at: string;
  updated_at?: string;
  // Stats fields are stored as strings in Appwrite
  total_likes: string;
  total_followers: string;
  average_rating: string;
  total_ratings: string;
} 