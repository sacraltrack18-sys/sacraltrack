import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';

interface Profile {
    $id: string;
    user_id: string;
    name: string;
    username: string;
    image: string;
    bio: string;
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
    setCurrentProfile: (userId: string) => Promise<void>;
    getAllProfiles: (page: number) => Promise<Profile[]>;
    searchProfiles: (query: string) => Promise<Profile[]>;
    getProfileById: (userId: string) => Promise<Profile | null>;
    updateProfile: (userId: string, data: Partial<Profile>) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>()(
    devtools(
        persist(
            (set, get) => ({
                currentProfile: null,
                profiles: [],
                loading: false,
                error: null,

                setCurrentProfile: async (userId: string) => {
                    try {
                        set({ loading: true, error: null });
                        const profile = await get().getProfileById(userId);
                        set({ currentProfile: profile, loading: false });
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                        set({ 
                            currentProfile: null, 
                            loading: false,
                            error: error instanceof Error ? error.message : 'Unknown error' 
                        });
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
                                    name: doc.name || doc.username || 'User',
                                    username: doc.username || 'user',
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
                                    username: 'error',
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
                        
                        console.log('Поиск профилей по запросу:', query);
                        
                        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                            throw new Error('Отсутствуют необходимые переменные окружения');
                        }
                        
                        const response = await database.listDocuments(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            [
                                Query.search('name', query),
                                Query.limit(20)
                            ]
                        );
                        
                        console.log(`Найдено ${response.documents.length} профилей по запросу "${query}"`);

                        const profiles = response.documents.map(doc => ({
                            $id: doc.$id,
                            user_id: doc.user_id,
                            name: doc.name || doc.username || 'User',
                            username: doc.username || 'user',
                            image: doc.image || '/images/default-avatar.png',
                            bio: doc.bio || '',
                            stats: {
                                totalLikes: parseInt(doc.total_likes || '0'),
                                totalFollowers: parseInt(doc.total_followers || '0'),
                                averageRating: parseFloat(doc.average_rating || '0'),
                                totalRatings: parseInt(doc.total_ratings || '0')
                            }
                        }));

                        set({ profiles, loading: false });
                        return profiles;
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
                        
                        console.log('Получение профиля по ID пользователя:', userId);
                        
                        if (!process.env.NEXT_PUBLIC_DATABASE_ID || !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE) {
                            throw new Error('Отсутствуют необходимые переменные окружения');
                        }
                        
                        const response = await database.listDocuments(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            [Query.equal('user_id', userId)]
                        );
                        
                        console.log(`Найдено ${response.documents.length} профилей по ID ${userId}`);

                        if (response.documents.length === 0) {
                            console.log(`Профиль с ID ${userId} не найден`);
                            set({ loading: false });
                            return null;
                        }

                        const doc = response.documents[0];
                        const profile: Profile = {
                            $id: doc.$id,
                            user_id: doc.user_id,
                            name: doc.name || doc.username || 'User',
                            username: doc.username || 'user',
                            image: doc.image || '/images/default-avatar.png',
                            bio: doc.bio || '',
                            stats: {
                                totalLikes: parseInt(doc.total_likes || '0'),
                                totalFollowers: parseInt(doc.total_followers || '0'),
                                averageRating: parseFloat(doc.average_rating || '0'),
                                totalRatings: parseInt(doc.total_ratings || '0')
                            }
                        };

                        set({ loading: false });
                        return profile;
                    } catch (error) {
                        console.error('Ошибка при получении профиля:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                        set({ error: `Failed to get profile: ${errorMessage}`, loading: false });
                        toast.error(`Failed to get profile: ${errorMessage}`);
                        return null;
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
                        if (data.username) updateData.username = data.username;
                        if (data.image) updateData.image = data.image;
                        if (data.bio) updateData.bio = data.bio;
                        if (data.stats) {
                            if (data.stats.totalLikes !== undefined) updateData.total_likes = data.stats.totalLikes.toString();
                            if (data.stats.totalFollowers !== undefined) updateData.total_followers = data.stats.totalFollowers.toString();
                            if (data.stats.averageRating !== undefined) updateData.average_rating = data.stats.averageRating.toString();
                            if (data.stats.totalRatings !== undefined) updateData.total_ratings = data.stats.totalRatings.toString();
                        }
                        updateData.updatedAt = new Date().toISOString();
                        
                        await database.updateDocument(
                            process.env.NEXT_PUBLIC_DATABASE_ID,
                            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                            doc.$id,
                            updateData
                        );
                        
                        console.log('Профиль успешно обновлен');
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
                partialize: (state) => ({ currentProfile: state.currentProfile })
            }
        )
    )
); 