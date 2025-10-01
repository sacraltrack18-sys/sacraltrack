import { create } from 'zustand';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { useProfileStore } from './profile';
import { account } from '@/libs/AppWriteClient';

// Утилита для создания нотификаций о друзьях
const createFriendNotification = async (
    userId: string, 
    type: 'friend_request' | 'friend_accepted', 
    senderName: string,
    senderId: string,
    related_document_id?: string
) => {
    try {
        // Создаем уведомление в базе данных
        await database.createDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
            ID.unique(),
            {
                user_id: userId,
                type: type,
                title: type === 'friend_request' 
                    ? 'New Friend Request! 👋' 
                    : 'Friend Request Accepted! 🎉',
                message: type === 'friend_request'
                    ? `${senderName} sent you a friend request. Check your profile to respond.`
                    : `${senderName} accepted your friend request. You are now connected!`,
                sender_id: senderId,
                action_url: type === 'friend_request' 
                    ? '/profile?tab=friends' 
                    : `/profile/${senderId}`,
                related_document_id: related_document_id,
                created_at: new Date().toISOString(),
                read: false
            }
        );
    } catch (error) {
        console.error(`Error creating ${type} notification:`, error);
    }
};

// Утилита для получения имени пользователя
const getUserName = async (userId: string): Promise<string> => {
    try {
        const profile = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            [Query.equal('user_id', userId)]
        );
        
        if (profile.documents.length > 0) {
            return profile.documents[0].name || 'User';
        }
        return 'User';
    } catch (error) {
        console.error('Error getting user name:', error);
        return 'User';
    }
};

// Получение профиля пользователя
const getUserProfile = async (userId: string) => {
    try {
        const profile = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            [Query.equal('user_id', userId)]
        );
        
        if (profile.documents.length > 0) {
            return profile.documents[0];
        }
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

interface Friend {
    id: string;
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    updatedAt?: string;
    profile?: any; // Профиль друга
}

interface FriendsStore {
    friends: Friend[];
    pendingRequests: Friend[];
    sentRequests: Friend[];
    loading: boolean;
    error: string | null;
    addFriend: (friendId: string, currentUserId?: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    loadFriends: (currentUserId?: string) => Promise<void>;
    loadPendingRequests: (currentUserId?: string) => Promise<void>;
    loadSentRequests: (currentUserId?: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    loading: false,
    error: null,

    addFriend: async (friendId: string, currentUserId?: string) => {
        try {
            set({ loading: true, error: null });
            // Сначала пробуем использовать переданный userId, затем из localStorage
            let userId = currentUserId;
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    userId = storedUserId;
                }
            }
            
            // If userId is still not found, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) {
                throw new Error('User not authenticated');
            }

            // Проверяем, существует ли уже запрос на дружбу в любом направлении
            const existingFriendship = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('friend_id', friendId)
                ]
            );

            const existingReverseRequest = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', friendId),
                    Query.equal('friend_id', userId)
                ]
            );

            if (existingFriendship.documents.length > 0 || existingReverseRequest.documents.length > 0) {
                throw new Error('Friendship already exists');
            }

            // Создаем новый запрос на дружбу
            const friendDoc = await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                ID.unique(),
                {
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            );

            // Получаем имя отправителя и создаем уведомление
            const senderName = await getUserName(userId);
            await createFriendNotification(
                friendId,
                'friend_request',
                senderName,
                userId,
                friendDoc.$id
            );

            toast.success('Friend request sent successfully!');
            
            // Обновляем список отправленных запросов
            await get().loadSentRequests();
        } catch (error: any) {
            console.error('Error sending friend request:', error);
            set({ error: error.message || 'Failed to send friend request' });
            toast.error(error.message || 'Failed to send friend request');
        } finally {
            set({ loading: false });
        }
    },

    removeFriend: async (friendId: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from localStorage first
            let userId = localStorage.getItem('userId');
            
            // If userId is not in localStorage, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) throw new Error('User not authenticated');
            
            // Проверяем оба направления дружбы
            const friendshipAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('user_id', userId),
                    Query.equal('friend_id', friendId)
                ]
            );
            
            const friendshipAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('user_id', friendId),
                    Query.equal('friend_id', userId)
                ]
            );

            // Объединяем результаты
            const friendshipDocuments = [
                ...friendshipAsInitiator.documents,
                ...friendshipAsReceiver.documents
            ];

            if (friendshipDocuments.length === 0) {
                throw new Error('Friendship not found');
            }

            // Удаляем дружбу
            await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                friendshipDocuments[0].$id
            );

            // Обновляем состояние UI
            set(state => ({
                friends: state.friends.filter(f => f.friendId !== friendId)
            }));

            toast.success('Friend removed successfully');
            
            // Обновляем список друзей
            await get().loadFriends();
        } catch (error: any) {
            console.error('Error removing friend:', error);
            set({ error: error.message || 'Failed to remove friend' });
            toast.error(error.message || 'Failed to remove friend');
        } finally {
            set({ loading: false });
        }
    },

    acceptFriendRequest: async (requestId: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from localStorage first
            let userId = localStorage.getItem('userId');
            
            // If userId is not in localStorage, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) throw new Error('User not authenticated');

            // Находим запрос на дружбу
            const request = await database.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId
            );

            // Проверяем, что запрос предназначен текущему пользователю
            if (request.friend_id !== userId) {
                throw new Error('You can only accept your own friend requests');
            }

            // Обновляем статус запроса
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId,
                {
                    status: 'accepted',
                    updated_at: new Date().toISOString()
                }
            );

            // Получаем имя текущего пользователя и создаем уведомление для отправителя запроса
            const currentUserName = await getUserName(userId);
            await createFriendNotification(
                request.user_id,
                'friend_accepted',
                currentUserName,
                userId,
                requestId
            );

            toast.success('Friend request accepted!');
            
            // Обновляем списки друзей и запросов
            await Promise.all([
                get().loadFriends(),
                get().loadPendingRequests()
            ]);
        } catch (error: any) {
            console.error('Error accepting friend request:', error);
            set({ error: error.message || 'Failed to accept friend request' });
            toast.error(error.message || 'Failed to accept friend request');
        } finally {
            set({ loading: false });
        }
    },

    rejectFriendRequest: async (requestId: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from localStorage first
            let userId = localStorage.getItem('userId');
            
            // If userId is not in localStorage, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) throw new Error('User not authenticated');

            // Находим запрос на дружбу
            const request = await database.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId
            );

            // Проверяем, что запрос предназначен текущему пользователю
            if (request.friend_id !== userId) {
                throw new Error('You can only reject your own friend requests');
            }

            // Удаляем запрос
            await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId
            );
            
            toast.success('Friend request rejected');
            
            // Обновляем список запросов
            await get().loadPendingRequests();
        } catch (error: any) {
            console.error('Error rejecting friend request:', error);
            set({ error: error.message || 'Failed to reject friend request' });
            toast.error(error.message || 'Failed to reject friend request');
        } finally {
            set({ loading: false });
        }
    },

    loadFriends: async (currentUserId?: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from passed parameter first
            let userId = currentUserId;
            
            // Try to get userId from localStorage if not passed as parameter
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    userId = storedUserId;
                }
            }
            
            // If userId is still not found, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) {
                set({ friends: [] });
                return;
            }

            // Загружаем друзей, где мы являемся инициатором
            const friendsAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            // Загружаем друзей, где мы являемся получателем
            const friendsAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friend_id', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            // Объединяем и форматируем результаты
            const allFriendships = [...friendsAsInitiator.documents, ...friendsAsReceiver.documents];
            const formattedFriends = await Promise.all(
                allFriendships.map(async (friendship) => {
                    // Определяем ID друга (не нас)
                    const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
                    
                    // Загружаем профиль друга
                    const friendProfile = await getUserProfile(friendId);
                    
                    return {
                        id: friendship.$id,
                        userId: friendship.user_id,
                        friendId: friendId,
                        status: friendship.status,
                        createdAt: friendship.created_at,
                        updatedAt: friendship.updated_at,
                        profile: friendProfile
                    };
                })
            );

            set({ friends: formattedFriends });
        } catch (error) {
            console.error('Error loading friends:', error);
            set({ error: 'Failed to load friends' });
        } finally {
            set({ loading: false });
        }
    },

    loadPendingRequests: async (currentUserId?: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from passed parameter first
            let userId = currentUserId;
            
            // Try to get userId from localStorage if not passed as parameter
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    userId = storedUserId;
                }
            }
            
            // If userId is still not found, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) {
                set({ pendingRequests: [] });
                return;
            }

            // Загружаем входящие запросы на дружбу
            const pendingRequests = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friend_id', userId),
                    Query.equal('status', 'pending')
                ]
            );

            // Форматируем результаты
            const formattedRequests = await Promise.all(
                pendingRequests.documents.map(async (request) => {
                    // Загружаем профиль отправителя
                    const senderProfile = await getUserProfile(request.user_id);
                    
                    return {
                        id: request.$id,
                        userId: request.user_id,
                        friendId: request.friend_id,
                        status: request.status,
                        createdAt: request.created_at,
                        updatedAt: request.updated_at,
                        profile: senderProfile
                    };
                })
            );

            set({ pendingRequests: formattedRequests });
        } catch (error) {
            console.error('Error loading pending requests:', error);
            set({ error: 'Failed to load pending requests' });
        } finally {
            set({ loading: false });
        }
    },

    loadSentRequests: async (currentUserId?: string) => {
        try {
            set({ loading: true, error: null });
            // Try to get userId from passed parameter first
            let userId = currentUserId;
            
            // Try to get userId from localStorage if not passed as parameter
            if (!userId) {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    userId = storedUserId;
                }
            }
            
            // If userId is still not found, try to get it from the current session
            if (!userId) {
                try {
                    const currentAccount = await account.get();
                    if (currentAccount) {
                        userId = currentAccount.$id;
                        // Store it in localStorage for future use
                        localStorage.setItem('userId', userId);
                    }
                } catch (error) {
                    console.error('Error getting current user:', error);
                }
            }
            
            if (!userId) {
                set({ sentRequests: [] });
                return;
            }

            // Загружаем отправленные запросы на дружбу
            const sentRequests = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('status', 'pending')
                ]
            );

            // Форматируем результаты
            const formattedRequests = await Promise.all(
                sentRequests.documents.map(async (request) => {
                    // Загружаем профиль получателя
                    const receiverProfile = await getUserProfile(request.friend_id);
                    
                    return {
                        id: request.$id,
                        userId: request.user_id,
                        friendId: request.friend_id,
                        status: request.status,
                        createdAt: request.created_at,
                        updatedAt: request.updated_at,
                        profile: receiverProfile
                    };
                })
            );

            set({ sentRequests: formattedRequests });
        } catch (error) {
            console.error('Error loading sent requests:', error);
            set({ error: 'Failed to load sent requests' });
        } finally {
            set({ loading: false });
        }
    }
})); 