// app/stores/mixStore.ts
import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { ID, Query } from '@/libs/AppWriteClient';
import { database, storage } from '@/libs/AppWriteClient';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';
import toast from 'react-hot-toast';

// Определение интерфейса для микса
export interface MixPost {
  id: string;
  user_id: string;
  title: string;
  description: string;
  media_url: string;
  image_url: string;
  created_at: string;
  genre: string;
  tags: string[];
  stats: {
    likes: number;
    comments: number;
  };
}

// Расширенный интерфейс с информацией о профиле
export interface MixPostWithProfile extends MixPost {
  profile: {
    user_id: string;
    name: string;
    image: string;
  };
}

// Интерфейс для хранилища миксов
interface MixStore {
  allMixPosts: MixPostWithProfile[];
  mixPostsByUser: MixPostWithProfile[];
  mixPostById: MixPostWithProfile | null;
  userLikedMixes: string[];
  selectedMixGenre: string;
  isCreatingMix: boolean;
  isLoadingMixes: boolean;
  page: number;
  hasMore: boolean;
  error: string | null;
  
  // Действия
  setSelectedMixGenre: (genre: string) => void;
  fetchAllMixes: () => Promise<void>;
  loadMoreMixes: () => Promise<void>;
  fetchMixesByUser: (userId: string) => Promise<void>;
  fetchMixById: (mixId: string) => Promise<void>;
  createMixPost: (mix: Partial<MixPost>, file: File, imageFile: File) => Promise<string | null>;
  likeMix: (mixId: string, userId: string) => Promise<void>;
  unlikeMix: (mixId: string, userId: string) => Promise<void>;
  checkIfUserLikedMix: (mixId: string, userId: string) => Promise<boolean>;
  fetchUserLikedMixes: (userId: string) => Promise<void>;
  deleteMixPost: (mixId: string) => Promise<void>;
  setCreatingMix: (isCreating: boolean) => void;
  resetMixState: () => void;
}

// Утилиты для работы с URL медиафайлов
const getFullMediaUrl = (fileId: string): string => {
  if (!fileId) return '';
  
  try {
    // Проверяем, является ли fileId уже полным URL
    if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
      return fileId;
    }
    
    // Создаем URL для доступа к файлу в Appwrite Storage
    return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.storageId}/files/${fileId}/view?project=${APPWRITE_CONFIG.projectId}`;
  } catch (error) {
    console.error('Error creating media URL:', error);
    return '';
  }
};

// Нормализация статистики микса
const normalizeStats = (stats: any): { likes: number; comments: number } => {
  if (!stats) return { likes: 0, comments: 0 };
  
  // Если stats уже в нужном формате, возвращаем его
  if (typeof stats === 'object' && 'likes' in stats && 'comments' in stats) {
    return {
      likes: Number(stats.likes) || 0,
      comments: Number(stats.comments) || 0
    };
  }
  
  // Если stats - строка, пытаемся распарсить JSON
  if (typeof stats === 'string') {
    try {
      const parsed = JSON.parse(stats);
      return {
        likes: Number(parsed.likes) || 0,
        comments: Number(parsed.comments) || 0
      };
    } catch (e) {
      return { likes: 0, comments: 0 };
    }
  }
  
  return { likes: 0, comments: 0 };
};

// Создание хранилища миксов с использованием zustand
export const useMixStore = create<MixStore>()(
  devtools(
    persist(
      (set, get) => ({
        allMixPosts: [],
        mixPostsByUser: [],
        mixPostById: null,
        userLikedMixes: [],
        selectedMixGenre: 'all',
        isCreatingMix: false,
        isLoadingMixes: false,
        page: 1,
        hasMore: true,
        error: null,
        
        // Установка выбранного жанра
        setSelectedMixGenre: (genre: string) => {
          set({ selectedMixGenre: genre, page: 1, hasMore: true });
          get().fetchAllMixes();
        },
        
        // Получение всех миксов
        fetchAllMixes: async () => {
          try {
            set({ isLoadingMixes: true, error: null });
            
            const { selectedMixGenre } = get();
            
            // Создаем запрос к базе данных
            let queries = [
              Query.orderDesc('created_at'),
              Query.limit(10)
            ];
            
            // Добавляем фильтр по жанру, если выбран конкретный жанр
            if (selectedMixGenre !== 'all') {
              queries.push(Query.equal('genre', selectedMixGenre));
            }
            
            // Получаем миксы из базы данных
            const response = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              queries
            );
            
            // Получаем профили пользователей для миксов
            const mixesWithProfiles = await Promise.all(
              response.documents.map(async (mix: any) => {
                try {
                  // Получаем профиль пользователя
                  const profileResponse = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.userCollectionId,
                    [Query.equal('user_id', mix.user_id)]
                  );
                  
                  const profile = profileResponse.documents[0] || {
                    user_id: mix.user_id,
                    name: 'Unknown User',
                    image: ''
                  };
                  
                  // Преобразуем документ в формат MixPostWithProfile
                  return {
                    id: mix.$id,
                    user_id: mix.user_id,
                    title: mix.title || '',
                    description: mix.description || '',
                    media_url: getFullMediaUrl(mix.media_url),
                    image_url: getFullMediaUrl(mix.image_url),
                    created_at: mix.created_at,
                    genre: mix.genre || '',
                    tags: mix.tags || [],
                    stats: normalizeStats(mix.stats),
                    profile: {
                      user_id: profile.user_id,
                      name: profile.name,
                      image: profile.image ? getFullMediaUrl(profile.image) : ''
                    }
                  };
                } catch (profileError) {
                  console.error('Error fetching profile for mix:', profileError);
                  
                  // Возвращаем микс без профиля в случае ошибки
                  return {
                    id: mix.$id,
                    user_id: mix.user_id,
                    title: mix.title || '',
                    description: mix.description || '',
                    media_url: getFullMediaUrl(mix.media_url),
                    image_url: getFullMediaUrl(mix.image_url),
                    created_at: mix.created_at,
                    genre: mix.genre || '',
                    tags: mix.tags || [],
                    stats: normalizeStats(mix.stats),
                    profile: {
                      user_id: mix.user_id,
                      name: 'Unknown User',
                      image: ''
                    }
                  };
                }
              })
            );
            
            set({ 
              allMixPosts: mixesWithProfiles, 
              isLoadingMixes: false,
              hasMore: response.documents.length === 10,
              page: 2
            });
          } catch (error) {
            console.error('Error fetching mixes:', error);
            set({ 
              isLoadingMixes: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch mixes'
            });
          }
        },
        
        // Загрузка дополнительных миксов (пагинация)
        loadMoreMixes: async () => {
          try {
            const { isLoadingMixes, hasMore, page, selectedMixGenre, allMixPosts } = get();
            
            if (isLoadingMixes || !hasMore) return;
            
            set({ isLoadingMixes: true });
            
            // Создаем запрос к базе данных
            let queries = [
              Query.orderDesc('created_at'),
              Query.limit(10),
              Query.offset((page - 1) * 10)
            ];
            
            // Добавляем фильтр по жанру, если выбран конкретный жанр
            if (selectedMixGenre !== 'all') {
              queries.push(Query.equal('genre', selectedMixGenre));
            }
            
            // Получаем миксы из базы данных
            const response = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              queries
            );
            
            // Получаем профили пользователей для миксов
            const mixesWithProfiles = await Promise.all(
              response.documents.map(async (mix: any) => {
                try {
                  // Получаем профиль пользователя
                  const profileResponse = await database.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.userCollectionId,
                    [Query.equal('user_id', mix.user_id)]
                  );
                  
                  const profile = profileResponse.documents[0] || {
                    user_id: mix.user_id,
                    name: 'Unknown User',
                    image: ''
                  };
                  
                  // Преобразуем документ в формат MixPostWithProfile
                  return {
                    id: mix.$id,
                    user_id: mix.user_id,
                    title: mix.title || '',
                    description: mix.description || '',
                    media_url: getFullMediaUrl(mix.media_url),
                    image_url: getFullMediaUrl(mix.image_url),
                    created_at: mix.created_at,
                    genre: mix.genre || '',
                    tags: mix.tags || [],
                    stats: normalizeStats(mix.stats),
                    profile: {
                      user_id: profile.user_id,
                      name: profile.name,
                      image: profile.image ? getFullMediaUrl(profile.image) : ''
                    }
                  };
                } catch (profileError) {
                  console.error('Error fetching profile for mix:', profileError);
                  
                  // Возвращаем микс без профиля в случае ошибки
                  return {
                    id: mix.$id,
                    user_id: mix.user_id,
                    title: mix.title || '',
                    description: mix.description || '',
                    media_url: getFullMediaUrl(mix.media_url),
                    image_url: getFullMediaUrl(mix.image_url),
                    created_at: mix.created_at,
                    genre: mix.genre || '',
                    tags: mix.tags || [],
                    stats: normalizeStats(mix.stats),
                    profile: {
                      user_id: mix.user_id,
                      name: 'Unknown User',
                      image: ''
                    }
                  };
                }
              })
            );
            
            set({ 
              allMixPosts: [...allMixPosts, ...mixesWithProfiles], 
              isLoadingMixes: false,
              hasMore: response.documents.length === 10,
              page: page + 1
            });
          } catch (error) {
            console.error('Error loading more mixes:', error);
            set({ 
              isLoadingMixes: false, 
              error: error instanceof Error ? error.message : 'Failed to load more mixes'
            });
          }
        },
        
        // Получение миксов пользователя
        fetchMixesByUser: async (userId: string) => {
          try {
            set({ isLoadingMixes: true, error: null });
            
            // Получаем миксы пользователя из базы данных
            const response = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              [Query.equal('user_id', userId), Query.orderDesc('created_at')]
            );
            
            // Получаем профиль пользователя
            const profileResponse = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.userCollectionId,
              [Query.equal('user_id', userId)]
            );
            
            const profile = profileResponse.documents[0] || {
              user_id: userId,
              name: 'Unknown User',
              image: ''
            };
            
            // Преобразуем документы в формат MixPostWithProfile
            const mixesWithProfile = response.documents.map((mix: any) => ({
              id: mix.$id,
              user_id: mix.user_id,
              title: mix.title || '',
              description: mix.description || '',
              media_url: getFullMediaUrl(mix.media_url),
              image_url: getFullMediaUrl(mix.image_url),
              created_at: mix.created_at,
              genre: mix.genre || '',
              tags: mix.tags || [],
              stats: normalizeStats(mix.stats),
              profile: {
                user_id: profile.user_id,
                name: profile.name,
                image: profile.image ? getFullMediaUrl(profile.image) : ''
              }
            }));
            
            set({ mixPostsByUser: mixesWithProfile, isLoadingMixes: false });
          } catch (error) {
            console.error('Error fetching user mixes:', error);
            set({ 
              isLoadingMixes: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch user mixes'
            });
          }
        },
        
        // Получение микса по ID
        fetchMixById: async (mixId: string) => {
          try {
            set({ isLoadingMixes: true, error: null });
            
            // Получаем микс из базы данных
            const mix = await database.getDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              mixId
            );
            
            // Получаем профиль пользователя
            const profileResponse = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.userCollectionId,
              [Query.equal('user_id', mix.user_id)]
            );
            
            const profile = profileResponse.documents[0] || {
              user_id: mix.user_id,
              name: 'Unknown User',
              image: ''
            };
            
            // Преобразуем документ в формат MixPostWithProfile
            const mixWithProfile: MixPostWithProfile = {
              id: mix.$id,
              user_id: mix.user_id,
              title: mix.title || '',
              description: mix.description || '',
              media_url: getFullMediaUrl(mix.media_url),
              image_url: getFullMediaUrl(mix.image_url),
              created_at: mix.created_at,
              genre: mix.genre || '',
              tags: mix.tags || [],
              stats: normalizeStats(mix.stats),
              profile: {
                user_id: profile.user_id,
                name: profile.name,
                image: profile.image ? getFullMediaUrl(profile.image) : ''
              }
            };
            
            set({ mixPostById: mixWithProfile, isLoadingMixes: false });
          } catch (error) {
            console.error('Error fetching mix by ID:', error);
            set({ 
              isLoadingMixes: false, 
              error: error instanceof Error ? error.message : 'Failed to fetch mix'
            });
          }
        },
        
        // Создание нового микса
        createMixPost: async (mix: Partial<MixPost>, audioFile: File, imageFile: File) => {
          try {
            set({ isCreatingMix: true, error: null });
            
            // Загружаем аудиофайл
            const audioUploadResponse = await storage.createFile(
              APPWRITE_CONFIG.storageId,
              ID.unique(),
              audioFile
            );
            
            // Загружаем изображение
            const imageUploadResponse = await storage.createFile(
              APPWRITE_CONFIG.storageId,
              ID.unique(),
              imageFile
            );
            
            // Создаем документ микса
            const mixData = {
              user_id: mix.user_id,
              title: mix.title || '',
              description: mix.description || '',
              media_url: audioUploadResponse.$id,
              image_url: imageUploadResponse.$id,
              created_at: new Date().toISOString(),
              genre: mix.genre || '',
              tags: mix.tags || [],
              stats: { likes: 0, comments: 0 }
            };
            
            const response = await database.createDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              ID.unique(),
              mixData
            );
            
            set({ isCreatingMix: false });
            
            // Обновляем список миксов
            get().fetchAllMixes();
            
            return response.$id;
          } catch (error) {
            console.error('Error creating mix:', error);
            set({ 
              isCreatingMix: false, 
              error: error instanceof Error ? error.message : 'Failed to create mix'
            });
            return null;
          }
        },
        
        // Лайк микса
        likeMix: async (mixId: string, userId: string) => {
          try {
            // Проверяем, не лайкнул ли пользователь уже этот микс
            const alreadyLiked = await get().checkIfUserLikedMix(mixId, userId);
            if (alreadyLiked) return;
            
            // Создаем документ лайка
            await database.createDocument(
              APPWRITE_CONFIG.databaseId,
              'mix_likes', // Предполагаемое имя коллекции для лайков миксов
              ID.unique(),
              {
                user_id: userId,
                mix_id: mixId,
                created_at: new Date().toISOString()
              }
            );
            
            // Обновляем статистику микса
            const mix = await database.getDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              mixId
            );
            
            const stats = normalizeStats(mix.stats);
            stats.likes += 1;
            
            await database.updateDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              mixId,
              { stats }
            );
            
            // Обновляем список лайкнутых миксов пользователя
            set(state => ({
              userLikedMixes: [...state.userLikedMixes, mixId]
            }));
            
            // Обновляем микс в списке всех миксов
            set(state => ({
              allMixPosts: state.allMixPosts.map(post => 
                post.id === mixId 
                  ? { ...post, stats: { ...post.stats, likes: post.stats.likes + 1 } }
                  : post
              ),
              mixPostById: state.mixPostById?.id === mixId
                ? { ...state.mixPostById, stats: { ...state.mixPostById.stats, likes: state.mixPostById.stats.likes + 1 } }
                : state.mixPostById
            }));
          } catch (error) {
            console.error('Error liking mix:', error);
            toast.error('Failed to like mix');
          }
        },
        
        // Отмена лайка микса
        unlikeMix: async (mixId: string, userId: string) => {
          try {
            // Проверяем, лайкнул ли пользователь этот микс
            const alreadyLiked = await get().checkIfUserLikedMix(mixId, userId);
            if (!alreadyLiked) return;
            
            // Находим документ лайка
            const likesResponse = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              'mix_likes', // Предполагаемое имя коллекции для лайков миксов
              [Query.equal('user_id', userId), Query.equal('mix_id', mixId)]
            );
            
            if (likesResponse.documents.length > 0) {
              // Удаляем документ лайка
              await database.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                'mix_likes', // Предполагаемое имя коллекции для лайков миксов
                likesResponse.documents[0].$id
              );
              
              // Обновляем статистику микса
              const mix = await database.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
                mixId
              );
              
              const stats = normalizeStats(mix.stats);
              stats.likes = Math.max(0, stats.likes - 1);
              
              await database.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
                mixId,
                { stats }
              );
              
              // Обновляем список лайкнутых миксов пользователя
              set(state => ({
                userLikedMixes: state.userLikedMixes.filter(id => id !== mixId)
              }));
              
              // Обновляем микс в списке всех миксов
              set(state => ({
                allMixPosts: state.allMixPosts.map(post => 
                  post.id === mixId 
                    ? { ...post, stats: { ...post.stats, likes: Math.max(0, post.stats.likes - 1) } }
                    : post
                ),
                mixPostById: state.mixPostById?.id === mixId
                  ? { ...state.mixPostById, stats: { ...state.mixPostById.stats, likes: Math.max(0, state.mixPostById.stats.likes - 1) } }
                  : state.mixPostById
              }));
            }
          } catch (error) {
            console.error('Error unliking mix:', error);
            toast.error('Failed to unlike mix');
          }
        },
        
        // Проверка, лайкнул ли пользователь микс
        checkIfUserLikedMix: async (mixId: string, userId: string) => {
          try {
            // Проверяем наличие лайка в базе данных
            const response = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixLikesCollectionId || 'mix_likes', // Используем ID коллекции из конфига или значение по умолчанию
              [Query.equal('user_id', userId), Query.equal('mix_id', mixId)]
            );
            
            return response.documents.length > 0;
          } catch (error) {
            console.error('Error checking if user liked mix:', error);
            return false;
          }
        },
        
        // Получение списка лайкнутых миксов пользователя
        fetchUserLikedMixes: async (userId: string) => {
          try {
            // Получаем лайки пользователя из базы данных
            const response = await database.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixLikesCollectionId || 'mix_likes', // Используем ID коллекции из конфига или значение по умолчанию
              [Query.equal('user_id', userId)]
            );
            
            // Извлекаем ID миксов из лайков
            const likedMixIds = response.documents.map((like: any) => like.mix_id);
            
            set({ userLikedMixes: likedMixIds });
          } catch (error) {
            console.error('Error fetching user liked mixes:', error);
            set({ userLikedMixes: [] });
          }
        },
        
        // Удаление микса
        deleteMixPost: async (mixId: string) => {
          try {
            set({ isLoadingMixes: true, error: null });
            
            // Получаем микс для получения ID файлов
            const mix = await database.getDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              mixId
            );
            
            // Удаляем документ микса
            await database.deleteDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.mixPostsCollectionId || '6857da72002661f6e89b', // Используем ID коллекции из конфига или значение по умолчанию
              mixId
            );
            
            // Удаляем связанные файлы, если они есть
            if (mix.media_url) {
              try {
                await storage.deleteFile(
                  APPWRITE_CONFIG.storageId,
                  mix.media_url
                );
              } catch (fileError) {
                console.error('Error deleting media file:', fileError);
              }
            }
            
            if (mix.image_url) {
              try {
                await storage.deleteFile(
                  APPWRITE_CONFIG.storageId,
                  mix.image_url
                );
              } catch (fileError) {
                console.error('Error deleting image file:', fileError);
              }
            }
            
            // Удаляем связанные лайки
            try {
              const likesResponse = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                'mix_likes', // Предполагаемое имя коллекции для лайков миксов
                [Query.equal('mix_id', mixId)]
              );
              
              for (const like of likesResponse.documents) {
                await database.deleteDocument(
                  APPWRITE_CONFIG.databaseId,
                  'mix_likes', // Предполагаемое имя коллекции для лайков миксов
                  like.$id
                );
              }
            } catch (likesError) {
              console.error('Error deleting mix likes:', likesError);
            }
            
            // Удаляем связанные комментарии
            try {
              const commentsResponse = await database.listDocuments(
                APPWRITE_CONFIG.databaseId,
                'mix_comments', // Предполагаемое имя коллекции для комментариев миксов
                [Query.equal('mix_id', mixId)]
              );
              
              for (const comment of commentsResponse.documents) {
                await database.deleteDocument(
                  APPWRITE_CONFIG.databaseId,
                  'mix_comments', // Предполагаемое имя коллекции для комментариев миксов
                  comment.$id
                );
              }
            } catch (commentsError) {
              console.error('Error deleting mix comments:', commentsError);
            }
            
            // Обновляем список миксов
            set(state => ({
              allMixPosts: state.allMixPosts.filter(post => post.id !== mixId),
              mixPostsByUser: state.mixPostsByUser.filter(post => post.id !== mixId),
              mixPostById: state.mixPostById?.id === mixId ? null : state.mixPostById,
              isLoadingMixes: false
            }));
            
            toast.success('Mix deleted successfully');
          } catch (error) {
            console.error('Error deleting mix:', error);
            set({ 
              isLoadingMixes: false, 
              error: error instanceof Error ? error.message : 'Failed to delete mix'
            });
            toast.error('Failed to delete mix');
          }
        },
        
        // Установка флага создания микса
        setCreatingMix: (isCreating: boolean) => {
          set({ isCreatingMix: isCreating });
        },
        
        // Сброс состояния хранилища миксов
        resetMixState: () => {
          set({
            allMixPosts: [],
            mixPostsByUser: [],
            mixPostById: null,
            userLikedMixes: [],
            selectedMixGenre: 'all',
            isCreatingMix: false,
            isLoadingMixes: false,
            page: 1,
            hasMore: true,
            error: null
          });
        }
      }),
      {
        name: 'mix-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Сохраняем только необходимые состояния в localStorage
          userLikedMixes: state.userLikedMixes,
          selectedMixGenre: state.selectedMixGenre
        })
      }
    )
  )
);