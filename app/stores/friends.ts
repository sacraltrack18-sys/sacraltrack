import { create } from 'zustand';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';

interface Friend {
    id: string;
    userId: string;
    friendId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
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
            await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                ID.unique(),
                JSON.stringify({
                    userId,
                    friendId,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                })
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

            // Обновляем статус запроса
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
                requestId,
                JSON.stringify({
                    status: 'accepted',
                    updatedAt: new Date().toISOString()
                })
            );

            // Обновляем локальное состояние
            set(state => ({
                pendingRequests: state.pendingRequests.filter(r => r.id !== requestId)
            }));

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
                JSON.stringify({
                    status: 'rejected',
                    updatedAt: new Date().toISOString()
                })
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
                })),
                ...receivedFriends.documents.map(doc => ({
                    id: doc.$id,
                    userId: doc.userId,
                    friendId: doc.friendId,
                    status: doc.status as 'pending' | 'accepted' | 'rejected',
                    createdAt: doc.createdAt,
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