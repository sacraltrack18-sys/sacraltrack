import { create } from 'zustand';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { useProfileStore } from './profile';

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

interface Friend {
    id: string;
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    updatedAt?: string;
    notificationSent?: boolean;
    lastInteractionDate?: string;
}

interface FriendsStore {
    friends: Friend[];
    pendingRequests: Friend[];
    loading: boolean;
    error: string | null;
    addFriend: (friendId: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    loadFriends: () => Promise<void>;
    loadPendingRequests: () => Promise<void>;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
    friends: [],
    pendingRequests: [],
    loading: false,
    error: null,

    addFriend: async (friendId: string) => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Проверяем, не существует ли уже такая дружба
            const existingFriendship = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('userId', userId),
                    Query.equal('friendId', friendId)
                ]
            );

            if (existingFriendship.documents.length > 0) {
                throw new Error('Friendship already exists');
            }

            // Создаем новую запись о дружбе
            const friendDoc = await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                ID.unique(),
                {
                    userId,
                    friendId,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    notificationSent: true,
                    lastInteractionDate: new Date().toISOString()
                }
            );

            // Получаем имя отправителя запроса
            const senderName = await getUserName(userId);
            
            // Создаем уведомление о запросе в друзья для получателя
            await createFriendNotification(
                friendId,
                'friend_request',
                senderName,
                userId,
                friendDoc.$id
            );

            toast.success('Friend request sent successfully!');
        } catch (error) {
            set({ error: 'Failed to send friend request' });
            toast.error('Failed to send friend request');
        } finally {
            set({ loading: false });
        }
    },

    removeFriend: async (friendId: string) => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Находим запись о дружбе
            const friendship = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('userId', userId),
                    Query.equal('friendId', friendId),
                    Query.equal('status', 'accepted')
                ]
            );

            if (friendship.documents.length === 0) {
                throw new Error('Friendship not found');
            }

            // Удаляем запись о дружбе
            await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                friendship.documents[0].$id
            );

            // Обновляем локальное состояние
            set(state => ({
                friends: state.friends.filter(f => f.friendId !== friendId)
            }));

            toast.success('Friend removed successfully!');
        } catch (error) {
            set({ error: 'Failed to remove friend' });
            toast.error('Failed to remove friend');
        } finally {
            set({ loading: false });
        }
    },

    acceptFriendRequest: async (requestId: string) => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Получаем запрос в друзья
            const requestDoc = await database.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId
            );

            // Обновляем статус запроса
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId,
                {
                    status: 'accepted',
                    updatedAt: new Date().toISOString(),
                    notificationSent: true,
                    lastInteractionDate: new Date().toISOString()
                }
            );

            // Обновляем локальное состояние
            set(state => ({
                pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
            }));

            // Получаем имя пользователя, принявшего запрос
            const acceptorName = await getUserName(userId);
            
            // Создаем уведомление о принятии запроса для отправителя
            await createFriendNotification(
                requestDoc.userId,  // ID пользователя, отправившего запрос
                'friend_accepted',
                acceptorName,
                userId,
                requestId
            );

            // Перезагружаем список друзей
            await get().loadFriends();

            toast.success('Friend request accepted!');
        } catch (error) {
            set({ error: 'Failed to accept friend request' });
            toast.error('Failed to accept friend request');
        } finally {
            set({ loading: false });
        }
    },

    rejectFriendRequest: async (requestId: string) => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Обновляем статус запроса
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId,
                {
                    status: 'rejected',
                    updatedAt: new Date().toISOString(),
                    lastInteractionDate: new Date().toISOString()
                }
            );

            // Обновляем локальное состояние
            set(state => ({
                pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
            }));

            toast.success('Friend request rejected');
        } catch (error) {
            set({ error: 'Failed to reject friend request' });
            toast.error('Failed to reject friend request');
        } finally {
            set({ loading: false });
        }
    },

    loadFriends: async () => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Получаем принятые запросы в друзья
            const acceptedFriends = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('userId', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            // Получаем запросы, где пользователь является другом
            const receivedFriends = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friendId', userId),
                    Query.equal('status', 'accepted')
                ]
            );

            // Объединяем и форматируем список друзей
            const friends = [
                ...acceptedFriends.documents.map(doc => ({
                    id: doc.$id,
                    userId: doc.userId,
                    friendId: doc.friendId,
                    status: doc.status as 'pending' | 'accepted' | 'rejected',
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    notificationSent: doc.notificationSent,
                    lastInteractionDate: doc.lastInteractionDate
                })),
                ...receivedFriends.documents.map(doc => ({
                    id: doc.$id,
                    userId: doc.userId,
                    friendId: doc.friendId,
                    status: doc.status as 'pending' | 'accepted' | 'rejected',
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    notificationSent: doc.notificationSent,
                    lastInteractionDate: doc.lastInteractionDate
                }))
            ];

            set({ friends });
        } catch (error) {
            set({ error: 'Failed to load friends' });
            toast.error('Failed to load friends');
        } finally {
            set({ loading: false });
        }
    },

    loadPendingRequests: async () => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) throw new Error('User not authenticated');

            // Получаем входящие запросы в друзья
            const pendingRequests = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                [
                    Query.equal('friendId', userId),
                    Query.equal('status', 'pending')
                ]
            );

            set({
                pendingRequests: pendingRequests.documents.map(doc => ({
                    id: doc.$id,
                    userId: doc.userId,
                    friendId: doc.friendId,
                    status: doc.status as 'pending' | 'accepted' | 'rejected',
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    notificationSent: doc.notificationSent,
                    lastInteractionDate: doc.lastInteractionDate
                }))
            });
        } catch (error) {
            set({ error: 'Failed to load pending requests' });
            toast.error('Failed to load pending requests');
        } finally {
            set({ loading: false });
        }
    },
})); 