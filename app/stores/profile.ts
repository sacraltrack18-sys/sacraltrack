import { create } from 'zustand';
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
    profiles: Profile[];
    loading: boolean;
    error: string | null;
    getAllProfiles: (page: number) => Promise<Profile[]>;
    searchProfiles: (query: string) => Promise<Profile[]>;
    getProfileById: (userId: string) => Promise<Profile | null>;
    updateProfile: (userId: string, data: Partial<Profile>) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
    profiles: [],
    loading: false,
    error: null,

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
            
            const response = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                [
                    Query.orderDesc('$createdAt'),
                    Query.limit(10),
                    Query.offset((page - 1) * 10)
                ]
            );
            
            console.log(`Получено ${response.documents.length} документов профилей`);
            
            const profiles = response.documents.map(doc => {
                console.log('Обработка документа профиля:', doc.$id);
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
            });
            
            console.log(`Обработано ${profiles.length} профилей пользователей`);

            set(state => ({
                profiles: page === 1 ? profiles : [...state.profiles, ...profiles]
            }));

            return profiles;
        } catch (error) {
            console.error('Ошибка при загрузке профилей:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            set({ error: `Failed to load profiles: ${errorMessage}` });
            toast.error(`Failed to load profiles: ${errorMessage}`);
            return [];
        } finally {
            set({ loading: false });
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

            set({ profiles });
            return profiles;
        } catch (error) {
            console.error('Ошибка при поиске профилей:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            set({ error: `Failed to search profiles: ${errorMessage}` });
            toast.error(`Failed to search profiles: ${errorMessage}`);
            return [];
        } finally {
            set({ loading: false });
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

            return profile;
        } catch (error) {
            console.error('Ошибка при получении профиля:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            set({ error: `Failed to get profile: ${errorMessage}` });
            toast.error(`Failed to get profile: ${errorMessage}`);
            return null;
        } finally {
            set({ loading: false });
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
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
                doc.$id,
                JSON.stringify({
                    ...data,
                    updatedAt: new Date().toISOString()
                })
            );
            
            console.log('Профиль успешно обновлен');

            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            set({ error: `Failed to update profile: ${errorMessage}` });
            toast.error(`Failed to update profile: ${errorMessage}`);
        } finally {
            set({ loading: false });
        }
    }
})); 