import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { database, Query, ID, storage, Permission, Role } from '@/libs/AppWriteClient';

// Вспомогательная функция для преобразования ID файла в полный URL
const getFullMediaUrl = (fileId: string): string => {
  // Если уже полный URL, возвращаем как есть
  if (fileId.startsWith('http')) {
    return fileId;
  }
  
  // Иначе создаем URL из ID файла
  try {
    // Убедимся что мы добавляем параметр для правильного отображения webp файлов
    const fileUrl = storage.getFileView(
      process.env.NEXT_PUBLIC_BUCKET_ID!,
      fileId
    ).href;
    
    // Добавляем явное указание на вывод в формате изображения
    return `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}output=webp`;
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
  }) => Promise<string | null>;
  likeVibe: (vibeId: string, userId: string) => Promise<void>;
  unlikeVibe: (vibeId: string, userId: string) => Promise<void>;
  checkIfUserLikedVibe: (vibeId: string, userId: string) => Promise<boolean>;
  fetchUserLikedVibes: (userId: string) => Promise<void>;
  deleteVibePost: (vibeId: string, mediaUrl: string) => Promise<void>;
  setCreatingVibe: (status: boolean) => void;
  resetVibeState: () => void;
}

// Создадим утилитарные функции для работы со статистикой

const normalizeVibeStats = (stats: any): { total_likes: number; total_comments: number; total_views: number } => {
  // Если stats это массив
  if (Array.isArray(stats)) {
    const statsArray = [...stats];
    while (statsArray.length < 3) statsArray.push('0');
    return {
      total_likes: parseInt(statsArray[0], 10) || 0,
      total_comments: parseInt(statsArray[1], 10) || 0,
      total_views: parseInt(statsArray[2], 10) || 0
    };
  }
  
  // Если stats это объект
  if (typeof stats === 'object' && stats !== null && !Array.isArray(stats)) {
    return {
      total_likes: typeof stats.total_likes === 'number' ? stats.total_likes : 0,
      total_comments: typeof stats.total_comments === 'number' ? stats.total_comments : 0,
      total_views: typeof stats.total_views === 'number' ? stats.total_views : 0
    };
  }
  
  // По умолчанию возвращаем нули
  return {
    total_likes: 0,
    total_comments: 0,
    total_views: 0
  };
};

// Функция для преобразования нормализованной статистики обратно в массив
const statsToArray = (stats: { total_likes: number; total_comments: number; total_views: number }): string[] => {
  // Make sure we're returning numbers converted to strings, not objects that might be converted to "[object Object]"
  const likes = typeof stats.total_likes === 'number' ? stats.total_likes.toString() : '0';
  const comments = typeof stats.total_comments === 'number' ? stats.total_comments.toString() : '0';
  const views = typeof stats.total_views === 'number' ? stats.total_views.toString() : '0';
  
  return [likes, comments, views];
};

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
            // Отключаем создание вайбов во время уже идущей загрузки
            if (get().isCreatingVibe) {
              console.warn('Vibe creation already in progress, ignoring new request');
              return null;
            }
            
            set({ isCreatingVibe: true });
            
            console.log('Starting vibe post creation with data:', {
              user_id: vibeData.user_id,
              type: vibeData.type, 
              has_media: !!vibeData.media,
              media_type: vibeData.media?.type,
              media_size: vibeData.media?.size,
              caption_length: vibeData.caption?.length
            });
            
            let fileId = '';
            
            // Загрузка файла медиа, если он существует
            if (vibeData.media) {
              try {
                console.log('===== НАЧАЛО ОТЛАДКИ ЗАГРУЗКИ ФАЙЛА =====');
                console.log('Starting media file upload, details:', {
                  name: vibeData.media.name,
                  size: vibeData.media.size,
                  type: vibeData.media.type,
                  lastModified: new Date(vibeData.media.lastModified).toISOString()
                });

                // Проверяем MIME-тип для безопасности
                if (!vibeData.media.type.startsWith('image/')) {
                  throw new Error(`Invalid file type: ${vibeData.media.type}. Only images are supported.`);
                }
                
                // Используем ID.unique() для генерации ID
                const uniqueFileId = ID.unique();
                console.log('Generated file ID:', uniqueFileId);

                // Проверка, что Appwrite SDK инициализирован корректно
                if (!storage || typeof storage.createFile !== 'function') {
                  console.error('Appwrite storage client is not properly initialized:', storage);
                  throw new Error('Storage client is not available');
                }

                // Проверка значения BUCKET_ID
                const bucketId = process.env.NEXT_PUBLIC_BUCKET_ID;
                if (!bucketId) {
                  throw new Error('Storage bucket ID is not defined in environment variables');
                }
                
                console.log('Environment variables check:', {
                  bucket_id: bucketId,
                  bucket_id_length: bucketId.length,
                  project_id: (process.env.NEXT_PUBLIC_ENDPOINT || '').slice(0, 4) + '...'
                });

                // Проверяем аутентификацию пользователя
                console.log('Checking authentication for user:', vibeData.user_id);
                
                // Простая оптимизация имени файла
                const fileExtension = vibeData.media.type.split('/')[1] || 'jpg';
                const fileName = `vibe_${Date.now()}.${fileExtension}`;
                console.log('Prepared file name:', fileName);
                
                // Прямая загрузка файла без дополнительной обработки
                console.log('Starting Appwrite storage.createFile call with bucketId:', bucketId);
                
                try {
                  // Проверка параметров перед вызовом
                  console.log('createFile parameters check:', {
                    bucketId,
                    fileId: uniqueFileId,
                    fileExists: !!vibeData.media,
                    fileSize: vibeData.media.size,
                    fileType: vibeData.media.type
                  });
                  
                  const file = await storage.createFile(
                    bucketId,
                    uniqueFileId,
                    vibeData.media,
                    [
                      Permission.read(Role.any()),
                      Permission.update(Role.user(vibeData.user_id)),
                      Permission.delete(Role.user(vibeData.user_id))
                    ]
                  );
                  
                  fileId = file.$id;
                  console.log('File successfully uploaded to Appwrite, response:', {
                    id: file.$id,
                    bucketId: file.bucketId,
                    name: file.name,
                    sizeOriginal: vibeData.media.size,
                    sizeUploaded: file.sizeOriginal
                  });
                } catch (uploadError: any) {
                  console.error('Detailed upload error:', {
                    error: uploadError,
                    message: uploadError?.message,
                    code: uploadError?.code,
                    type: uploadError?.type,
                    response: uploadError?.response,
                    stack: uploadError?.stack?.split('\n').slice(0, 3)
                  });
                  
                  // Проверка на ошибки авторизации
                  if (uploadError?.code === 401) {
                    console.error('AUTHENTICATION ERROR: User is not authorized to upload files');
                    throw new Error('Authentication failed: Not authorized to upload files. Please log out and login again.');
                  }
                  
                  throw uploadError;
                }
                
                // Проверяем, что файл действительно загружен
                try {
                  const fileCheck = await storage.getFile(
                    bucketId,
                    fileId
                  );
                  console.log('File verification successful:', {
                    id: fileCheck.$id,
                    name: fileCheck.name,
                    size: fileCheck.sizeOriginal
                  });
                } catch (checkError) {
                  console.warn('File verification warning (not critical):', checkError);
                }
                
                console.log('===== КОНЕЦ ОТЛАДКИ ЗАГРУЗКИ ФАЙЛА =====');
                
              } catch (fileError: any) {
                console.error('Error uploading file:', fileError);
                console.error('Error details:', {
                  message: fileError.message,
                  code: fileError.code,
                  type: fileError.type,
                  response: fileError.response
                });
                throw new Error(`Failed to upload file: ${fileError.message || 'unknown error'}`);
              }
            } else {
              console.log('Creating vibe without media file (text only)');
            }
            
            console.log('Creating record in vibes collection, collection ID:', process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS);
            
            // Используем ID.unique() из Appwrite
            const vibePostId = ID.unique();
            
            // Подготовка данных документа
            const documentData: any = {
              user_id: vibeData.user_id,
              type: vibeData.type,
              media_url: fileId, // ID загруженного файла или пустая строка
              caption: vibeData.caption || '',
              mood: vibeData.mood || '',
              location: vibeData.location || '',
              tags: vibeData.tags ? JSON.stringify(vibeData.tags) : '',
              created_at: new Date().toISOString()
            };
            
            // Добавляем поля для статистики
            documentData.total_likes = 0;
            documentData.total_comments = 0;
            documentData.total_views = 0;
            
            console.log('Document data for creation:', documentData);
            
            try {
              // Проверка переменных окружения для базы данных и коллекции
              const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
              const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS;
              
              if (!databaseId) {
                throw new Error('Database ID is not defined in environment variables');
              }
              
              if (!collectionId) {
                throw new Error('Vibe posts collection ID is not defined in environment variables');
              }
              
              // Создаем документ с вайбом
              const response = await database.createDocument(
                databaseId,
                collectionId,
                vibePostId,
                documentData,
                [
                  Permission.read(Role.any()),
                  Permission.update(Role.user(vibeData.user_id)),
                  Permission.delete(Role.user(vibeData.user_id))
                ]
              );
            
              console.log('Vibe successfully created in collection!', response.$id);

              set({ isCreatingVibe: false });
              // Обновляем список вайбов
              get().fetchAllVibes();
              
              return response.$id;
            } catch (docError: any) {
              console.error('Error creating vibe document:', docError);
              console.error('Document error details:', {
                message: docError?.message,
                code: docError?.code,
                response: docError?.response
              });
              
              // Try to delete the uploaded file since the document wasn't created
              if (fileId) {
                try {
                  console.log('Trying to delete uploaded file after document creation error:', fileId);
                  await storage.deleteFile(
                    process.env.NEXT_PUBLIC_BUCKET_ID || '',
                    fileId
                  );
                  console.log('Uploaded file was deleted after document creation error');
                } catch (cleanupError) {
                  console.error('Error deleting file after failed document creation:', cleanupError);
                }
              }
              
              // Check specific types of errors when creating document
              if (docError?.code === 401) {
                throw new Error('Failed to create vibe: authentication required');
              } else if (docError?.message?.includes('collection')) {
                throw new Error(`Collection error: ${docError?.message}`);
              } else if (docError?.message?.includes('attribute')) {
                throw new Error(`Document structure error: ${docError?.message}`);
              } else {
                throw new Error(`Failed to create vibe document: ${docError?.message || 'Unknown error'}`);
              }
            }
          } catch (error: any) {
            console.error('Error creating vibe:', error);
            console.error('Error stack:', error?.stack);
            console.error('Environment variables used:', {
              database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
              bucket_id: process.env.NEXT_PUBLIC_BUCKET_ID,
              collection_id_vibe_posts: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
            });
            
            set({ 
              error: `Failed to create vibe: ${error?.message || 'Unknown error'}`, 
              isCreatingVibe: false 
            });
            throw error;
          }
        },

        likeVibe: async (vibeId, userId) => {
          try {
            // Optimistic UI update before making network requests
            set(state => ({
              allVibePosts: state.allVibePosts.map(vibe => {
                if (vibe.id === vibeId) {
                  const currentStats = normalizeVibeStats(vibe.stats);
                  const updatedStats = {
                    ...currentStats,
                    total_likes: currentStats.total_likes + 1
                  };
                  
                  return { ...vibe, stats: updatedStats };
                }
                return vibe;
              }),
              userLikedVibes: [...(state.userLikedVibes || []), vibeId]
            }));

            // Use API to create like instead of direct database access
            const response = await fetch('/api/vibes/like', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: userId,
                vibe_id: vibeId
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Error liking vibe');
            }

            const data = await response.json();
            console.log('Like response:', data);

            // Use count value from API response to update statistics
            if (data.count !== undefined) {
              set(state => ({
                allVibePosts: state.allVibePosts.map(vibe => {
                  if (vibe.id === vibeId) {
                    const currentStats = normalizeVibeStats(vibe.stats);
                    // Convert back to array of strings to maintain compatibility
                    // with database data format
                    const updatedStats = statsToArray({
                      ...currentStats,
                      total_likes: data.count
                    });
                    
                    return { 
                      ...vibe, 
                      stats: updatedStats
                    };
                  }
                  return vibe;
                })
              }));
            }

            // Update state after successful request to synchronize with server
            get().fetchUserLikedVibes(userId);
          } catch (error) {
            console.error('Error liking vibe:', error);
            
            // Cancel optimistic update in case of error
            get().fetchUserLikedVibes(userId);
            get().fetchAllVibes();
            
            throw error;
          }
        },

        unlikeVibe: async (vibeId, userId) => {
          try {
            // Optimistic UI update before making network requests
            set(state => ({
              allVibePosts: state.allVibePosts.map(vibe => {
                if (vibe.id === vibeId) {
                  const currentStats = normalizeVibeStats(vibe.stats);
                  const updatedStats = {
                    ...currentStats,
                    total_likes: Math.max(0, currentStats.total_likes - 1)
                  };
                  
                  return { ...vibe, stats: updatedStats };
                }
                return vibe;
              }),
              userLikedVibes: (state.userLikedVibes || []).filter(id => id !== vibeId)
            }));

            // Use API to remove like instead of direct database access
            const response = await fetch('/api/vibes/like', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: userId,
                vibe_id: vibeId
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Error unliking vibe');
            }

            const data = await response.json();
            console.log('Unlike response:', data);

            // Use count value from API response to update statistics
            if (data.count !== undefined) {
              set(state => ({
                allVibePosts: state.allVibePosts.map(vibe => {
                  if (vibe.id === vibeId) {
                    const currentStats = normalizeVibeStats(vibe.stats);
                    // Convert back to array of strings to maintain compatibility
                    // with database data format
                    const updatedStats = statsToArray({
                      ...currentStats,
                      total_likes: data.count
                    });
                    
                    return { 
                      ...vibe, 
                      stats: updatedStats
                    };
                  }
                  return vibe;
                })
              }));
            }

            // Update state after successful request to synchronize with server
            get().fetchUserLikedVibes(userId);
          } catch (error) {
            console.error('Error unliking vibe:', error);
            
            // Cancel optimistic update in case of error
            get().fetchUserLikedVibes(userId);
            get().fetchAllVibes();
            
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