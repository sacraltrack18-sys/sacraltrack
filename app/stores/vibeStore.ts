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
  tags?: string[];
  stats: {
    total_likes: number;
    total_comments: number;
    total_views: number;
  };
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
    media: File;
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
                  stats: doc.stats || {
                    total_likes: 0,
                    total_comments: 0,
                    total_views: 0
                  },
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
                  stats: doc.stats || {
                    total_likes: 0,
                    total_comments: 0,
                    total_views: 0
                  },
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
              stats: doc.stats || {
                total_likes: 0,
                total_comments: 0,
                total_views: 0
              },
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
              stats: doc.stats || {
                total_likes: 0,
                total_comments: 0,
                total_views: 0
              },
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
            
            console.log('Начало создания vibe post, ID коллекции:', process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS);
            console.log('Используемые данные:', {
              database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
              bucket_id: process.env.NEXT_PUBLIC_BUCKET_ID,
              user_id: vibeData.user_id,
              type: vibeData.type
            });
            
            // Upload media file first
            console.log('Загрузка файла начата...');
            const fileId = ID.unique();
            await storage.createFile(
              process.env.NEXT_PUBLIC_BUCKET_ID!,
              fileId,
              vibeData.media
            );
            console.log('Файл успешно загружен с ID:', fileId);

            // Get file URL
            const fileUrl = storage.getFileView(
              process.env.NEXT_PUBLIC_BUCKET_ID!,
              fileId
            );
            console.log('URL файла получен:', fileUrl.href);

            // Сохраняем только ID файла вместо полного URL
            // Это соответствует ограничению Appwrite в 99 символов
            // При получении файла, вы можете сконструировать полный URL используя ID
            
            // Create vibe post document
            console.log('Создание записи в коллекции vibe_posts...');
            const vibePostId = ID.unique();
            console.log('Созданный ID для vibe post:', vibePostId);
            
            const response = await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibePostId,
              {
                user_id: vibeData.user_id,
                type: vibeData.type,
                media_url: fileId, // Сохраняем только ID файла вместо полного URL
                caption: vibeData.caption || '',
                mood: vibeData.mood || '',
                location: vibeData.location || '',
                tags: vibeData.tags || [],
                stats: {
                  total_likes: 0,
                  total_comments: 0,
                  total_views: 0
                }
              }
            );
          
            console.log('Vibe post успешно создан в коллекции!', response.$id);

            set({ isCreatingVibe: false });
            // Refresh vibes after creation
            get().fetchAllVibes();
            
            return response.$id;
          } catch (error: any) {
            console.error('Ошибка при создании vibe post:', error);
            console.error('Детали ошибки:', error?.message, error?.code);
            if (error?.response) {
              console.error('Полный ответ сервера:', error.response);
            }
            console.error('Используемые переменные окружения:', {
              database_id: process.env.NEXT_PUBLIC_DATABASE_ID,
              bucket_id: process.env.NEXT_PUBLIC_BUCKET_ID,
              collection_id: process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS,
            });
            
            set({ 
              error: `Failed to create vibe post: ${error?.message || 'Unknown error'}`, 
              isCreatingVibe: false 
            });
            throw error;
          }
        },

        likeVibe: async (vibeId, userId) => {
          try {
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

            const stats = vibe.stats || {
              total_likes: 0,
              total_comments: 0,
              total_views: 0
            };

            await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
              vibeId,
              {
                stats: {
                  ...stats,
                  total_likes: stats.total_likes + 1
                }
              }
            );

            // Update local state
            get().fetchUserLikedVibes(userId);
            
            // Update current vibe if it's the one being viewed
            const currentVibe = get().vibePostById;
            if (currentVibe && currentVibe.id === vibeId) {
              set({
                vibePostById: {
                  ...currentVibe,
                  stats: {
                    ...currentVibe.stats,
                    total_likes: currentVibe.stats.total_likes + 1
                  }
                }
              });
            }

            // Update vibes in all posts list
            set(state => ({
              allVibePosts: state.allVibePosts.map(vibe => 
                vibe.id === vibeId 
                  ? { 
                      ...vibe, 
                      stats: { 
                        ...vibe.stats, 
                        total_likes: vibe.stats.total_likes + 1 
                      } 
                    }
                  : vibe
              )
            }));

          } catch (error) {
            console.error('Error liking vibe:', error);
            throw error;
          }
        },

        unlikeVibe: async (vibeId, userId) => {
          try {
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

              const stats = vibe.stats || {
                total_likes: 0,
                total_comments: 0,
                total_views: 0
              };

              await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
                vibeId,
                {
                  stats: {
                    ...stats,
                    total_likes: Math.max(0, stats.total_likes - 1)
                  }
                }
              );

              // Update local state
              get().fetchUserLikedVibes(userId);
              
              // Update current vibe if it's the one being viewed
              const currentVibe = get().vibePostById;
              if (currentVibe && currentVibe.id === vibeId) {
                set({
                  vibePostById: {
                    ...currentVibe,
                    stats: {
                      ...currentVibe.stats,
                      total_likes: Math.max(0, currentVibe.stats.total_likes - 1)
                    }
                  }
                });
              }

              // Update vibes in all posts list
              set(state => ({
                allVibePosts: state.allVibePosts.map(vibe => 
                  vibe.id === vibeId 
                    ? { 
                        ...vibe, 
                        stats: { 
                          ...vibe.stats, 
                          total_likes: Math.max(0, vibe.stats.total_likes - 1)
                        } 
                      }
                    : vibe
                )
              }));
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