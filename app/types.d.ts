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
    
    export function useUser(): UserContextType;
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

// Declare Yandex Metrika global type
declare global {
  interface Window {
    ym?: (counterId: number, eventType: string, url?: string, options?: any) => void;
  }
} 