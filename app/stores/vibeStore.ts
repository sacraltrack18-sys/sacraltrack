import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { database, Query, ID, storage } from '@/libs/AppWriteClient';

// Вспомогательная функция для преобразования ID файла в полный URL
const getFullMediaUrl = (fileId: string): string => {
  // Если уже полный URL, возвращаем как есть
  if (fileId.startsWith('http')) {
    return fileId;
  }
  
  // Иначе создаем URL из ID файла
  try {
    return storage.getFileView(
      process.env.NEXT_PUBLIC_BUCKET_ID!,
      fileId
    ).href;
  } catch (error) {
    console.error('Error creating file URL from ID:', error);
    return fileId; // Возвращаем исходный ID в случае ошибки
  }
};

export interface VibePost {
  id: string;
  user_id: string;
  type: 'photo' | 'video' | 'sticker';
  media_url: string;
  caption?: string;
  mood?: string;
  created_at: string;
  location?: string;
  tags?: string;
  stats: string[] | { total_likes: number; total_comments: number; total_views: number };
}

export interface VibePostWithProfile extends VibePost {
  profile?: {
    user_id: string;
    name: string;
    image: string;
    username?: string;
  };
}

interface VibeStore {
  // State
  allVibePosts: VibePostWithProfile[];
  vibePostsByUser: VibePostWithProfile[];
  vibePostById: VibePostWithProfile | null;
  userLikedVibes: string[];
  selectedVibeType: 'all' | 'photo' | 'video' | 'sticker';
  isCreatingVibe: boolean;
  isLoadingVibes: boolean;
  page: number;
  hasMore: boolean;
  error: string | null;

  // Actions
  setSelectedVibeType: (type: 'all' | 'photo' | 'video' | 'sticker') => void;
  fetchAllVibes: () => Promise<void>;
  loadMoreVibes: () => Promise<void>;
  fetchVibesByUser: (userId: string) => Promise<void>;
  fetchVibeById: (vibeId: string) => Promise<void>;
  createVibePost: (vibeData: {
    user_id: string;
    type: 'photo' | 'video' | 'sticker';
    media?: File;
    caption?: string;
    mood?: string;
    location?: string;
    tags?: string[];
  }) => Promise<string>;
  likeVibe: (vibeId: string, userId: string) => Promise<void>;
  unlikeVibe: (vibeId: string, userId: string) => Promise<void>;
  checkIfUserLikedVibe: (vibeId: string, userId: string) => Promise<boolean>;
  fetchUserLikedVibes: (userId: string) => Promise<void>;
  deleteVibePost: (vibeId: string, mediaUrl: string) => Promise<void>;
  setCreatingVibe: (status: boolean) => void;
  resetVibeState: () => void;
}

export const useVibeStore = create<VibeStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        allVibePosts: [],
        vibePostsByUser: [],
        vibePostById: null,
        userLikedVibes: [],
        selectedVibeType: 'all',
        isCreatingVibe: false,
        isLoadingVibes: false,
        page: 1,
        hasMore: true,
        error: null,

        // Actions
        setSelectedVibeType: (type) => {
          set({ selectedVibeType: type, page: 1 });
          get().fetchAllVibes();
        },

        fetchAllVibes: async () => {
          try {
            const { selectedVibeType } = get();
            set({ isLoadingVibes: true, error: null });

            // Build query based on selected type
            const queries = [Query.orderDesc('created_at')];
            if (selectedVibeType !== 'all') {
              queries.push(Query.equal('type', selectedVibeType));
            }

            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              queries
            );

            const vibes = await Promise.all(
              response.documents.map(async (doc) => {
                // Fetch profile data
                let profile: VibePostWithProfile['profile'] | undefined;
                try {
                  const profileResponse = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [Query.equal('user_id', doc.user_id)]
                  );
                  
                  if (profileResponse.documents.length > 0) {
                    const profileDoc = profileResponse.documents[0];
                    profile = {
                      user_id: profileDoc.user_id,
                      name: profileDoc.name,
                      image: profileDoc.image,
                      username: profileDoc.username
                    };
                  }
                } catch (error) {
                  console.error('Error fetching profile:', error);
                }

                return {
                  id: doc.$id,
                  user_id: doc.user_id,
                  type: doc.type,
                  media_url: getFullMediaUrl(doc.media_url),
                  caption: doc.caption,
                  mood: doc.mood,
                  created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
                  location: doc.location,
                  tags: doc.tags,
                  stats: doc.stats || ['0', '0', '0'],
                  profile
                };
              })
            );

            set({ 
              allVibePosts: vibes.slice(0, 10), 
              hasMore: vibes.length > 10,
              page: 2,
              isLoadingVibes: false 
            });
          } catch (error) {
            console.error('Error fetching vibes:', error);
            set({ 
              error: 'Failed to load vibes', 
              isLoadingVibes: false 
            });
          }
        },

        loadMoreVibes: async () => {
          try {
            const { page, allVibePosts, selectedVibeType } = get();
            set({ isLoadingVibes: true });

            // Build query based on selected type
            const queries = [
              Query.orderDesc('created_at'),
              Query.limit(10),
              Query.offset((page - 1) * 10)
            ];
            
            if (selectedVibeType !== 'all') {
              queries.push(Query.equal('type', selectedVibeType));
            }

            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              queries
            );

            if (response.documents.length === 0) {
              set({ hasMore: false, isLoadingVibes: false });
              return;
            }

            const newVibes = await Promise.all(
              response.documents.map(async (doc) => {
                // Fetch profile data
                let profile: VibePostWithProfile['profile'] | undefined;
                try {
                  const profileResponse = await database.listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                    [Query.equal('user_id', doc.user_id)]
                  );
                  
                  if (profileResponse.documents.length > 0) {
                    const profileDoc = profileResponse.documents[0];
                    profile = {
                      user_id: profileDoc.user_id,
                      name: profileDoc.name,
                      image: profileDoc.image,
                      username: profileDoc.username
                    };
                  }
                } catch (error) {
                  console.error('Error fetching profile:', error);
                }

                return {
                  id: doc.$id,
                  user_id: doc.user_id,
                  type: doc.type,
                  media_url: getFullMediaUrl(doc.media_url),
                  caption: doc.caption,
                  mood: doc.mood,
                  created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
                  location: doc.location,
                  tags: doc.tags,
                  stats: doc.stats || ['0', '0', '0'],
                  profile
                };
              })
            );

            set({ 
              allVibePosts: [...allVibePosts, ...newVibes],
              page: page + 1,
              hasMore: newVibes.length === 10,
              isLoadingVibes: false
            });
          } catch (error) {
            console.error('Error loading more vibes:', error);
            set({ 
              error: 'Failed to load more vibes', 
              isLoadingVibes: false 
            });
          }
        },

        fetchVibesByUser: async (userId) => {
          try {
            set({ isLoadingVibes: true, error: null });
            
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              [
                Query.equal('user_id', userId),
                Query.orderDesc('created_at')
              ]
            );

            // Fetch profile once for all vibes since they're from the same user
            let profile: VibePostWithProfile['profile'] | undefined;
            try {
              const profileResponse = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.equal('user_id', userId)]
              );
              
              if (profileResponse.documents.length > 0) {
                const profileDoc = profileResponse.documents[0];
                profile = {
                  user_id: profileDoc.user_id,
                  name: profileDoc.name,
                  image: profileDoc.image,
                  username: profileDoc.username
                };
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }

            const vibes = response.documents.map(doc => ({
              id: doc.$id,
              user_id: doc.user_id,
              type: doc.type,
              media_url: getFullMediaUrl(doc.media_url),
              caption: doc.caption,
              mood: doc.mood,
              created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
              location: doc.location,
              tags: doc.tags,
              stats: doc.stats || ['0', '0', '0'],
              profile
            }));

            set({ vibePostsByUser: vibes, isLoadingVibes: false });
          } catch (error) {
            console.error('Error fetching vibes by user:', error);
            set({ 
              error: 'Failed to load vibes by user', 
              isLoadingVibes: false 
            });
          }
        },

        fetchVibeById: async (vibeId) => {
          try {
            set({ isLoadingVibes: true, error: null });
            
            const doc = await database.getDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibeId
            );

            // Fetch profile
            let profile: VibePostWithProfile['profile'] | undefined;
            try {
              const profileResponse = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
                [Query.equal('user_id', doc.user_id)]
              );
              
              if (profileResponse.documents.length > 0) {
                const profileDoc = profileResponse.documents[0];
                profile = {
                  user_id: profileDoc.user_id,
                  name: profileDoc.name,
                  image: profileDoc.image,
                  username: profileDoc.username
                };
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }

            const vibe: VibePostWithProfile = {
              id: doc.$id,
              user_id: doc.user_id,
              type: doc.type,
              media_url: getFullMediaUrl(doc.media_url),
              caption: doc.caption,
              mood: doc.mood,
              created_at: doc.$createdAt || doc.created_at || new Date().toISOString(),
              location: doc.location,
              tags: doc.tags,
              stats: doc.stats || ['0', '0', '0'],
              profile
            };

            set({ vibePostById: vibe, isLoadingVibes: false });
          } catch (error) {
            console.error('Error fetching vibe by id:', error);
            set({ 
              error: 'Failed to load vibe', 
              isLoadingVibes: false 
            });
          }
        },

        createVibePost: async (vibeData) => {
          try {
            set({ isCreatingVibe: true, error: null });
            
            // Детальное логирование используемых переменных
            console.log('Начало создания vibe post, параметры:', {
              database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
              bucket_id: process.env.NEXT_PUBLIC_BUCKET_ID,
              collection_id_vibe_posts: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
              user_id: vibeData.user_id,
              type: vibeData.type,
              has_media: !!vibeData.media
            });
            
            // Проверка переменных окружения
            if (!process.env.NEXT_PUBLIC_DATABASE_ID) {
              console.error("NEXT_PUBLIC_DATABASE_ID не определен в .env.local");
              throw new Error("Не удалось получить ID базы данных");
            }
            if (!process.env.NEXT_PUBLIC_BUCKET_ID) {
              console.error("NEXT_PUBLIC_BUCKET_ID не определен в .env.local");
              throw new Error("Не удалось получить ID хранилища");
            }
            if (!process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS) {
              console.error("NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS не определен в .env.local");
              throw new Error("Не удалось получить ID коллекции вайбов");
            }
            
            // Подготовка данных для документа
            let fileId = '';
            
            // Загрузка файла медиа, если он существует
            if (vibeData.media) {
              try {
                console.log('Загрузка файла медиа, размер:', vibeData.media.size);
                
                // Используем ID.unique() из Appwrite для генерации ID
                const uniqueFileId = ID.unique();
                console.log('Сгенерирован ID для файла:', uniqueFileId);
                
                // Загрузка файла в хранилище
                const file = await storage.createFile(
                process.env.NEXT_PUBLIC_BUCKET_ID!,
                  uniqueFileId,
                vibeData.media
              );
                
                fileId = file.$id;
                console.log('Файл успешно загружен, ID:', fileId);
            } catch (fileError: any) {
              console.error('Ошибка при загрузке файла:', fileError);
                throw new Error(`Не удалось загрузить файл: ${fileError.message || 'неизвестная ошибка'}`);
              }
              } else {
              console.log('Создание вайба без медиа-файла (только текст)');
            }
            
            // Создание документа вайба
            console.log('Создание записи в коллекции вайбов, ID коллекции:', process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS);
            
            // Используем ID.unique() из Appwrite
            const vibePostId = ID.unique();
            
            // Подготовка данных документа
            const documentData = {
              user_id: vibeData.user_id,
              type: vibeData.type,
              media_url: fileId,
              caption: vibeData.caption || '',
              mood: vibeData.mood || '',
              location: vibeData.location || '',
              tags: vibeData.tags ? JSON.stringify(vibeData.tags) : '',
              stats: ['0', '0', '0'], // [total_likes, total_comments, total_views] в виде строк
              created_at: new Date().toISOString()
            };
            
            console.log('Данные документа для создания:', documentData);
            
            try {
              const response = await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
                vibePostId,
                documentData
              );
            
              console.log('Вайб успешно создан в коллекции!', response.$id);

              set({ isCreatingVibe: false });
              // Обновляем список вайбов
              get().fetchAllVibes();
              
              return response.$id;
            } catch (docError: any) {
              console.error('Ошибка при создании документа вайба:', docError);
              console.error('Детали ошибки документа:', {
                message: docError?.message,
                code: docError?.code,
                response: docError?.response
              });
              
              // Пытаемся удалить загруженный файл, так как документ не был создан
              if (fileId) {
              try {
                await storage.deleteFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  fileId
                );
                console.log('Загруженный файл был удален после ошибки создания документа');
              } catch (cleanupError) {
                console.error('Ошибка при удалении файла после неудачного создания документа:', cleanupError);
                }
              }
              
              // Проверка конкретных типов ошибок при создании документа
              if (docError?.code === 401) {
                throw new Error('Не удалось создать документ вайба: требуется авторизация');
              } else if (docError?.message?.includes('collection')) {
                throw new Error(`Ошибка коллекции: ${docError?.message}`);
              } else if (docError?.message?.includes('attribute')) {
                throw new Error(`Ошибка структуры документа: ${docError?.message}`);
              } else {
                throw new Error(`Не удалось создать документ вайба: ${docError?.message || 'Неизвестная ошибка'}`);
              }
            }
          } catch (error: any) {
            console.error('Ошибка при создании вайба:', error);
            console.error('Стек ошибки:', error?.stack);
            console.error('Используемые переменные окружения:', {
              database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
              bucket_id: process.env.NEXT_PUBLIC_BUCKET_ID,
              collection_id_vibe_posts: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
            });
            
            set({ 
              error: `Не удалось создать вайб: ${error?.message || 'Неизвестная ошибка'}`, 
              isCreatingVibe: false 
            });
            throw error;
          }
        },

        likeVibe: async (vibeId, userId) => {
          try {
            console.log('Trying to like vibe:', vibeId, 'by user:', userId);
            
            // Create like document
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
              ID.unique(),
              {
                user_id: userId,
                vibe_id: vibeId,
                created_at: new Date().toISOString()
              }
            );

            // Update vibe stats
            const vibe = await database.getDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibeId
            );

            console.log('Current vibe stats:', vibe.stats, 'Type:', typeof vibe.stats);
            
            // Проверяем структуру stats и преобразуем соответственно
            let stats;
            let updatedStats: string[] = [];
            
            if (Array.isArray(vibe.stats)) {
              // Если stats это массив - работаем как с массивом
              stats = [...vibe.stats];
              
              // Убедимся, что у нас есть все три элемента
              while (stats.length < 3) {
                stats.push('0');
              }
              
              // Увеличиваем количество лайков (первый элемент массива)
              const currentLikes = parseInt(stats[0], 10) || 0;
              stats[0] = (currentLikes + 1).toString();
              updatedStats = stats;
              
              console.log('Updating array stats to:', stats);
            } else if (typeof vibe.stats === 'object' && vibe.stats !== null) {
              // Если stats это объект - преобразуем в массив
              const totalLikes = typeof vibe.stats.total_likes === 'number' ? vibe.stats.total_likes + 1 : 1;
              const totalComments = typeof vibe.stats.total_comments === 'number' ? vibe.stats.total_comments : 0;
              const totalViews = typeof vibe.stats.total_views === 'number' ? vibe.stats.total_views : 0;
              
              updatedStats = [totalLikes.toString(), totalComments.toString(), totalViews.toString()];
              console.log('Converting object stats to array:', updatedStats);
            } else {
              // Если stats отсутствует или имеет неизвестный формат - создаем новый массив
              updatedStats = ['1', '0', '0'];
              console.log('Creating new stats array:', updatedStats);
            }

            // Обновляем документ с новыми stats
            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibeId,
              {
                stats: {
                  total_likes: parseInt(updatedStats[0]) || 0,
                  total_comments: parseInt(updatedStats[1]) || 0,
                  total_views: parseInt(updatedStats[2]) || 0
                }
              }
            );
            
            console.log('Vibe stats updated successfully');

            // Update local state
            get().fetchUserLikedVibes(userId);
            
            // Обновляем локальное состояние вайба, если это текущий просматриваемый вайб
            const currentVibe = get().vibePostById;
            if (currentVibe && currentVibe.id === vibeId) {
              const updatedVibe = { ...currentVibe, stats: updatedStats };
              set({ vibePostById: updatedVibe });
              console.log('Updated current vibe in store');
            }

            // Обновляем лайки во всем списке вайбов
            set(state => ({
              allVibePosts: state.allVibePosts.map(vibe => {
                if (vibe.id === vibeId) {
                  return { ...vibe, stats: updatedStats };
                }
                return vibe;
              })
            }));
            
            console.log('Updated vibe in all posts list');

          } catch (error) {
            console.error('Error liking vibe:', error);
            throw error;
          }
        },

        unlikeVibe: async (vibeId, userId) => {
          try {
            console.log('Trying to unlike vibe:', vibeId, 'by user:', userId);
            
            // Find the like document
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
              [
                Query.equal('user_id', userId),
                Query.equal('vibe_id', vibeId)
              ]
            );

            if (response.documents.length > 0) {
              console.log('Found like document, deleting it');
              
              // Delete the like document
              await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
                response.documents[0].$id
              );

              // Update vibe stats
              const vibe = await database.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
                vibeId
              );

              console.log('Current vibe stats:', vibe.stats, 'Type:', typeof vibe.stats);
              
              // Проверяем структуру stats и преобразуем соответственно
              let updatedStats: string[] = [];
              
              if (Array.isArray(vibe.stats)) {
                // Если stats это массив - работаем как с массивом
                const stats = [...vibe.stats];
                
                // Убедимся, что у нас есть все три элемента
                while (stats.length < 3) {
                  stats.push('0');
                }
                
                // Уменьшаем количество лайков (первый элемент массива)
                const currentLikes = parseInt(stats[0], 10) || 0;
                stats[0] = Math.max(0, currentLikes - 1).toString();
                updatedStats = stats;
                
                console.log('Updating array stats to:', stats);
              } else if (typeof vibe.stats === 'object' && vibe.stats !== null) {
                // Если stats это объект - преобразуем в массив
                const totalLikes = Math.max(0, (typeof vibe.stats.total_likes === 'number' ? vibe.stats.total_likes : 0) - 1);
                const totalComments = typeof vibe.stats.total_comments === 'number' ? vibe.stats.total_comments : 0;
                const totalViews = typeof vibe.stats.total_views === 'number' ? vibe.stats.total_views : 0;
                
                updatedStats = [totalLikes.toString(), totalComments.toString(), totalViews.toString()];
                console.log('Converting object stats to array:', updatedStats);
              } else {
                // Если stats отсутствует или имеет неизвестный формат - создаем новый массив
                updatedStats = ['0', '0', '0'];
                console.log('Creating new stats array:', updatedStats);
              }

              // Обновляем документ с новыми stats
              await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
                vibeId,
                {
                  stats: {
                    total_likes: parseInt(updatedStats[0]) || 0,
                    total_comments: parseInt(updatedStats[1]) || 0,
                    total_views: parseInt(updatedStats[2]) || 0
                  }
                }
              );
              
              console.log('Vibe stats updated successfully');

              // Update local state
              get().fetchUserLikedVibes(userId);
              
              // Обновляем локальное состояние вайба, если это текущий просматриваемый вайб
              const currentVibe = get().vibePostById;
              if (currentVibe && currentVibe.id === vibeId) {
                const updatedVibe = { ...currentVibe, stats: updatedStats };
                set({ vibePostById: updatedVibe });
                console.log('Updated current vibe in store');
              }

              // Обновляем лайки во всем списке вайбов
              set(state => ({
                allVibePosts: state.allVibePosts.map(vibe => {
                  if (vibe.id === vibeId) {
                    return { ...vibe, stats: updatedStats };
                  }
                  return vibe;
                })
              }));
              
              console.log('Updated vibe in all posts list');
            } else {
              console.log('No like document found for this vibe and user');
            }
          } catch (error) {
            console.error('Error unliking vibe:', error);
            throw error;
          }
        },

        checkIfUserLikedVibe: async (vibeId, userId) => {
          try {
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
              [
                Query.equal('user_id', userId),
                Query.equal('vibe_id', vibeId)
              ]
            );

            return response.documents.length > 0;
          } catch (error) {
            console.error('Error checking if user liked vibe:', error);
            return false;
          }
        },

        fetchUserLikedVibes: async (userId) => {
          try {
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
              [Query.equal('user_id', userId)]
            );

            const likedVibeIds = response.documents.map(doc => doc.vibe_id);
            set({ userLikedVibes: likedVibeIds });
          } catch (error) {
            console.error('Error fetching user liked vibes:', error);
            set({ error: 'Failed to fetch liked vibes' });
          }
        },

        deleteVibePost: async (vibeId, mediaUrl) => {
          try {
            set({ isLoadingVibes: true, error: null });

            // Extract fileId from URL or use directly if it's already an ID
            const fileId = mediaUrl.startsWith('http') 
              ? (mediaUrl.split('/').pop() || '')
              : mediaUrl;

            // Delete vibe post document
            await database.deleteDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibeId
            );

            // Delete media file if it exists
            if (fileId) {
              try {
                await storage.deleteFile(
                  process.env.NEXT_PUBLIC_BUCKET_ID!,
                  fileId
                );
              } catch (error) {
                console.error('Error deleting media file:', error);
                // Continue even if file deletion fails
              }
            }

            // Delete all likes for this vibe
            const likesResponse = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
              [Query.equal('vibe_id', vibeId)]
            );

            for (const like of likesResponse.documents) {
              await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES!,
                like.$id
              );
            }

            // Delete all comments for this vibe
            const commentsResponse = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
              [Query.equal('vibe_id', vibeId)]
            );

            for (const comment of commentsResponse.documents) {
              await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
                comment.$id
              );
            }

            // Update state after deletion
            set(state => ({
              allVibePosts: state.allVibePosts.filter(vibe => vibe.id !== vibeId),
              vibePostsByUser: state.vibePostsByUser.filter(vibe => vibe.id !== vibeId),
              vibePostById: state.vibePostById?.id === vibeId ? null : state.vibePostById,
              isLoadingVibes: false
            }));

          } catch (error) {
            console.error('Error deleting vibe post:', error);
            set({ 
              error: 'Failed to delete vibe post', 
              isLoadingVibes: false 
            });
          }
        },

        setCreatingVibe: (status) => {
          set({ isCreatingVibe: status });
        },

        resetVibeState: () => {
          set({ 
            vibePostById: null,
            error: null
          });
        }
      }),
      {
        name: "vibe-store",
        storage: typeof window !== 'undefined' 
          ? {
              getItem: (name) => {
                const str = localStorage.getItem(name);
                if (str) return JSON.parse(str);
                return null;
              },
              setItem: (name, value) => {
                localStorage.setItem(name, JSON.stringify(value));
              },
              removeItem: (name) => localStorage.removeItem(name),
            }
          : undefined
      }
    )
  )
); 