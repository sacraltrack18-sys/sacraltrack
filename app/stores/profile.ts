import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { AUTH_STATE_CHANGE_EVENT } from '../context/user';

interface Profile {
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
    is_public?: string | boolean;
    account_type?: string;
    featured_track_id?: string;
    preferred_languages?: string;
    settings?: string[];
    social_links?: any;
    created_at?: string;
    stats: {
        totalLikes: number;
        totalFollowers: number;
        averageRating: number;
        totalRatings: number;
    };
}

interface ProfileStore {
    currentProfile: Profile | null;
    profiles: Profile[];
    loading: boolean;
    error: string | null;
    hasUserReleases: boolean;
    setHasUserReleases: (value: boolean) => void;
    setCurrentProfile: (profileOrId: Profile | string) => Promise<Profile | null>;
    getAllProfiles: (page: number) => Promise<Profile[]>;
    searchProfiles: (query: string) => Promise<Profile[]>;
    getProfileById: (userId: string) => Promise<Profile>;
    updateProfile: (userId: string, data: Partial<Profile>) => Promise<void>;
    setupAuthListener: () => void;
    clearCurrentProfile: () => void;
    profileCache: Record<string, { profile: any, timestamp: number }>;
}

export const useProfileStore = create<ProfileStore>()(
    devtools(
        persist(
            (set, get) => ({
                currentProfile: null,
                profiles: [],
                loading: false,
                error: null,
                hasUserReleases: false,
                profileCache: {} as Record<string, { profile: any, timestamp: number }>,

                setHasUserReleases: (value: boolean) => {
                    set({ hasUserReleases: value });
                },

                clearCurrentProfile: () => {
                    set({ currentProfile: null });
                },

                setupAuthListener: () => {
                    // Only setup the listener in browser environment
                    if (typeof window !== 'undefined') {
                        let lastAuthChange = 0;
                        const DEBOUNCE_DELAY = 1000; // 1 second

                        // Define the handler function outside the block
                        const handleAuthChange = (event: Event) => {
                            const now = Date.now();
                            if (now - lastAuthChange < DEBOUNCE_DELAY) {
                                return; // Ignore events that are too close together
                            }
                            lastAuthChange = now;

                            const customEvent = event as CustomEvent;
                            const userData = customEvent.detail?.user;
                            
                            if (userData && userData.id) {
                                // User logged in, load their profile
                                get().setCurrentProfile(userData.id);
                            } else {
                                // User logged out, clear current profile
                                get().clearCurrentProfile();
                            }
                        };
                        
                        // Remove any existing listener to prevent duplicates
                        window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
                        
                        // Add the auth state change listener
                        window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthChange);
                    }
                },

                setCurrentProfile: async (profileOrId: Profile | string) => {
                    try {
                        set({ loading: true, error: null });
                        let profile: Profile | null = null;
                        
                        if (typeof profileOrId === 'string') {
                            profile = await get().getProfileById(profileOrId);
                        } else {
                            profile = profileOrId;
                        }
                        
                        set({ currentProfile: profile, loading: false });
                        
                        // Setup auth listener when profile is set (to ensure it's done once)
                        get().setupAuthListener();
                        
                        return profile;
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        set({ 
                            currentProfile: null, 
                            loading: false,
                            error: error instanceof Error ? error.message : 'Unknown error' 
                        });
                        return null;
                    }
                },

                getAllProfiles: async (page: number) => {
                    try {
                        set({ loading: true, error: null });
                        
                        console.log('Загрузка профилей пользователей, страница:', page);
                        console.log('Используемые переменные окружения:', {
                            databaseId: process.env.NEXT_PUBLIC_DATABASE_ID,
                            profileCollectionId: process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
                        });
                        
                        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                            throw new Error('Отсутствуют необходимые переменные окружения');
                        }
                        
                        // Упрощаем запрос, чтобы получить все профили
                        const response = await database.listDocuments(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            []
                        );
                        
                        console.log(`Получено ${response.documents.length} документов профилей из ${response.total} общих`);
                        
                        if (response.documents.length === 0) {
                            console.warn('Не найдено ни одного профиля в коллекции');
                            console.log('Проверьте данные коллекции в Appwrite консоли');
                            set({ loading: false });
                            return [];
                        }
                        
                        if (response.documents.length > 0) {
                            console.log('Пример документа профиля:', JSON.stringify(response.documents[0], null, 2));
                        }
                        
                        const profiles = response.documents.map(doc => {
                            try {
                                return {
                                    $id: doc.$id,
                                    user_id: doc.user_id,
                                    name: doc.name || 'User',
                                    image: doc.image || '/images/default-avatar.png',
                                    bio: doc.bio || '',
                                    stats: {
                                        totalLikes: parseInt(doc.total_likes || '0'),
                                        totalFollowers: parseInt(doc.total_followers || '0'),
                                        averageRating: parseFloat(doc.average_rating || '0'),
                                        totalRatings: parseInt(doc.total_ratings || '0')
                                    }
                                };
                            } catch (docError) {
                                console.error('Ошибка при обработке документа:', docError, doc);
                                // Возвращаем плейсхолдер вместо null для соответствия типу Profile
                                return {
                                    $id: 'error-' + Math.random().toString(36).substring(2, 9),
                                    user_id: 'error',
                                    name: 'Error Loading Profile',
                                    image: '/images/default-avatar.png',
                                    bio: 'Error loading profile data',
                                    stats: {
                                        totalLikes: 0,
                                        totalFollowers: 0,
                                        averageRating: 0,
                                        totalRatings: 0
                                    }
                                };
                            }
                        });
                        
                        console.log(`Обработано ${profiles.length} профилей пользователей`);

                        set(state => ({
                            profiles: page === 1 ? profiles : [...state.profiles, ...profiles],
                            loading: false
                        }));

                        return profiles;
                    } catch (error) {
                        console.error('Ошибка при загрузке профилей:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                        set({ error: `Failed to load profiles: ${errorMessage}`, loading: false });
                        toast.error(`Failed to load profiles: ${errorMessage}`);
                        return [];
                    }
                },

                searchProfiles: async (query: string) => {
                    try {
                        set({ loading: true, error: null });
                        
                        // Здесь может быть логика поиска по профилям пользователей в базе данных
                        // Для простоты, просто фильтруем существующие профили по имени
                        
                        // Получаем все профили, если их еще нет в хранилище
                        let profiles = get().profiles;
                        if (profiles.length === 0) {
                            profiles = await get().getAllProfiles(1);
                        }
                        
                        // Фильтруем по запросу
                        const searchResults = profiles.filter(profile => {
                            const name = profile.name.toLowerCase();
                            const searchQuery = query.toLowerCase();
                            
                            return name.includes(searchQuery);
                        });
                        
                        set({ loading: false });
                        return searchResults;
                    } catch (error) {
                        console.error('Ошибка при поиске профилей:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                        set({ error: `Failed to search profiles: ${errorMessage}`, loading: false });
                        toast.error(`Failed to search profiles: ${errorMessage}`);
                        return [];
                    }
                },

                getProfileById: async (userId: string) => {
                    try {
                        set({ loading: true, error: null });
                        
                        // Проверяем наличие кеша и его актуальность (не старше 5 минут)
                        const cache = get().profileCache[userId];
                        const now = Date.now();
                        const cacheValidTime = 5 * 60 * 1000; // 5 минут

                        if (cache && (now - cache.timestamp < cacheValidTime)) {
                            // Используем кешированный профиль
                            set({ loading: false });
                            return cache.profile;
                        }
                        
                        if (!userId) {
                            console.warn('No userId provided to getProfileById');
                            set({ loading: false });
                            // Return a default placeholder profile
                            return {
                                $id: 'default-' + Date.now(),
                                user_id: userId || 'unknown',
                                name: 'Unknown User',
                                image: '/images/placeholders/user-placeholder.svg',
                                bio: '',
                                stats: {
                                    totalLikes: 0,
                                    totalFollowers: 0,
                                    averageRating: 0,
                                    totalRatings: 0
                                }
                            };
                        }
                        
                        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                            throw new Error('Отсутствуют необходимые переменные окружения');
                        }
                        
                        const response = await database.listDocuments(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            [Query.equal('user_id', userId)]
                        );
                        
                        // Уменьшаем количество логов
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`Найдено ${response.documents.length} профилей по ID ${userId}`);
                        }

                        if (response.documents.length === 0) {
                            console.log(`Профиль с ID ${userId} не найден, создаем новый профиль`);
                            
                            try {
                                // Создаем новый профиль в базе данных
                                const newProfile = await database.createDocument(
                                    process.env.NEXT_PUBLIC_DATABASE_ID,
                                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                                    ID.unique(),
                                    {
                                        user_id: userId,
                                        name: 'Unknown User',
                                        image: '/images/placeholders/user-placeholder.svg',
                                        bio: '',
                                        total_likes: 0,
                                        total_followers: 0,
                                        average_rating: 0,
                                        total_ratings: 0,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    }
                                );
                                
                                console.log('Новый профиль создан:', newProfile.$id);
                                console.log('Данные нового профиля:', JSON.stringify(newProfile, null, 2));
                                
                                set({ loading: false });
                                return {
                                    $id: newProfile.$id,
                                    user_id: userId,
                                    name: 'Unknown User',
                                    image: '/images/placeholders/user-placeholder.svg',
                                    bio: '',
                                    stats: {
                                        totalLikes: 0,
                                        totalFollowers: 0,
                                        averageRating: 0,
                                        totalRatings: 0
                                    }
                                };
                            } catch (createError) {
                                console.error('Ошибка при создании профиля:', createError);
                                
                                // Если не удалось создать профиль, возвращаем временный плейсхолдер
                                set({ loading: false });
                                return {
                                    $id: 'default-' + Date.now(),
                                    user_id: userId,
                                    name: 'Unknown User',
                                    image: '/images/placeholders/user-placeholder.svg',
                                    bio: '',
                                    stats: {
                                        totalLikes: 0,
                                        totalFollowers: 0,
                                        averageRating: 0,
                                        totalRatings: 0
                                    }
                                };
                            }
                        }

                        const doc = response.documents[0];
                        const profile: Profile = {
                            $id: doc.$id,
                            user_id: doc.user_id,
                            name: doc.name || 'User',
                            image: doc.image || '/images/placeholders/user-placeholder.svg',
                            bio: doc.bio || '',
                            genre: doc.genre,
                            location: doc.location,
                            website: doc.website,
                            role: doc.role,
                            display_name: doc.display_name,
                            banner_image: doc.banner_image,
                            is_public: doc.is_public,
                            account_type: doc.account_type,
                            featured_track_id: doc.featured_track_id,
                            preferred_languages: doc.preferred_languages,
                            settings: doc.settings,
                            social_links: doc.social_links,
                            stats: {
                                totalLikes: parseInt(doc.total_likes || '0'),
                                totalFollowers: parseInt(doc.total_followers || '0'),
                                averageRating: parseFloat(doc.average_rating || '0'),
                                totalRatings: parseInt(doc.total_ratings || '0')
                            }
                        };

                        console.log('Профиль успешно загружен и преобразован:', JSON.stringify(profile, null, 2));

                        // После получения профиля, сохраняем его в кеш
                        const profileCacheUpdate = { ...get().profileCache };
                        profileCacheUpdate[userId] = { profile, timestamp: now };
                        set({ profileCache: profileCacheUpdate, loading: false });
                        
                        return profile;
                    } catch (error) {
                        console.error('Ошибка при получении профиля:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                        set({ error: `Failed to get profile: ${errorMessage}`, loading: false });
                        // Return a default placeholder profile instead of null
                        return {
                            $id: 'error-' + Date.now(),
                            user_id: userId || 'error',
                            name: 'Unknown User',
                            image: '/images/placeholders/user-placeholder.svg',
                            bio: '',
                            stats: {
                                totalLikes: 0,
                                totalFollowers: 0,
                                averageRating: 0,
                                totalRatings: 0
                            }
                        };
                    }
                },

                updateProfile: async (userId: string, data: Partial<Profile>) => {
                    try {
                        set({ loading: true, error: null });
                        
                        console.log('Обновление профиля пользователя:', userId, data);
                        
                        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                            throw new Error('Отсутствуют необходимые переменные окружения');
                        }
                        
                        const response = await database.listDocuments(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            [Query.equal('user_id', userId)]
                        );
                        
                        console.log(`Найдено ${response.documents.length} профилей для обновления`);

                        if (response.documents.length === 0) {
                            throw new Error('Profile not found');
                        }

                        const doc = response.documents[0];
                        
                        // Преобразуем data в формат, соответствующий полям в базе данных
                        const updateData: Record<string, any> = {};
                        if (data.name) updateData.name = data.name;
                        if (data.image) updateData.image = data.image;
                        if (data.bio) updateData.bio = data.bio;
                        if (data.genre) updateData.genre = data.genre;
                        if (data.location) updateData.location = data.location;
                        if (data.website) updateData.website = data.website;
                        if (data.role) updateData.role = data.role;
                        if (data.display_name) updateData.display_name = data.display_name;
                        if (data.banner_image) updateData.banner_image = data.banner_image;
                        if (data.is_public !== undefined) updateData.is_public = String(data.is_public);
                        if (data.account_type) updateData.account_type = data.account_type;
                        if (data.featured_track_id) updateData.featured_track_id = data.featured_track_id;
                        if (data.preferred_languages) updateData.preferred_languages = data.preferred_languages;
                        if (data.settings) updateData.settings = data.settings;
                        if (data.social_links) updateData.social_links = data.social_links;
                        if (data.stats) {
                            if (data.stats.totalLikes !== undefined) updateData.total_likes = data.stats.totalLikes;
                            if (data.stats.totalFollowers !== undefined) updateData.total_followers = data.stats.totalFollowers;
                            if (data.stats.averageRating !== undefined) updateData.average_rating = data.stats.averageRating;
                            if (data.stats.totalRatings !== undefined) updateData.total_ratings = data.stats.totalRatings;
                        }
                        updateData.updated_at = new Date().toISOString();
                        
                        await database.updateDocument(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            doc.$id,
                            updateData
                        );
                        
                        console.log('Профиль успешно обновлен');
                        
                        // Update the current profile if it's the same user
                        const currentProfile = get().currentProfile;
                        if (currentProfile && currentProfile.user_id === userId) {
                            // Refetch the updated profile
                            const updatedProfile = await get().getProfileById(userId);
                            if (updatedProfile) {
                                set({ currentProfile: updatedProfile });
                            }
                        }
                        
                        set({ loading: false });
                        toast.success('Profile updated successfully');
                    } catch (error) {
                        console.error('Ошибка при обновлении профиля:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                        set({ error: `Failed to update profile: ${errorMessage}`, loading: false });
                        toast.error(`Failed to update profile: ${errorMessage}`);
                    }
                }
            }),
            { 
                name: 'profileStore', 
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({ currentProfile: state.currentProfile }),
                // Setup auth listener when store is rehydrated
                onRehydrateStorage: (state) => {
                    return (rehydratedState, error) => {
                        if (!error && rehydratedState) {
                            // Setup auth listener after rehydration
                            setTimeout(() => {
                                rehydratedState.setupAuthListener();
                            }, 100);
                        }
                    };
                }
            }
        )
    )
); 