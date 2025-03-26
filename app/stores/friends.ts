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
    sentRequests: Friend[];
    loading: boolean;
    error: string | null;
    addFriend: (friendId: string, currentUserId?: string) => Promise<void>;
    removeFriend: (friendId: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    loadFriends: () => Promise<void>;
    loadPendingRequests: () => Promise<void>;
    loadSentRequests: () => Promise<void>;
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
                const localStorageUserId = localStorage.getItem('userId');
                if (localStorageUserId) {
                    userId = localStorageUserId;
                    console.log('Using userId from localStorage:', userId);
                }
            } else {
                console.log('Using provided userId:', userId);
            }
            
            console.log('Adding friend, current userId:', userId);
            
            if (!userId) {
                console.error('User not authenticated: userId is null or empty');
                throw new Error('User not authenticated');
            }

            console.log('Checking for existing friendship between', userId, 'and', friendId);
            // Check if friendship already exists
            const existingFriendship = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('user_id', userId),
                    Query.equal('friend_id', friendId)
                ]
            );

            // Also check if there's an existing request from the other side
            const existingReverseRequest = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('user_id', friendId),
                    Query.equal('friend_id', userId)
                ]
            );

            console.log('Existing friendship check results:', {
                existingRequests: existingFriendship.documents.length,
                existingReverseRequests: existingReverseRequest.documents.length
            });

            if (existingFriendship.documents.length > 0 || existingReverseRequest.documents.length > 0) {
                console.error('Friendship or request already exists');
                throw new Error('Friendship already exists');
            }

            console.log('Creating new friend request document');
            // Create new friend request
            const friendDoc = await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                ID.unique(),
                {
                    user_id: userId,
                    friend_id: friendId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            );
            console.log('Friend request document created:', friendDoc.$id);

            // Get sender's name
            const senderName = await getUserName(userId);
            console.log('Sender name retrieved:', senderName);
            
            // Create notification about friend request for the recipient
            await createFriendNotification(
                friendId,
                'friend_request',
                senderName,
                userId,
                friendDoc.$id
            );

            toast.success('Friend request sent successfully!');
            
            // Update the list of sent requests
            await get().loadSentRequests();
        } catch (error) {
            console.error('Error sending friend request:', error);
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
            
            // Check both directions of friendship
            const friendshipAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('user_id', userId),
                    Query.equal('friend_id', friendId)
                ]
            );
            
            const friendshipAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('user_id', friendId),
                    Query.equal('friend_id', userId)
                ]
            );

            // Combine results
            const friendshipDocuments = [
                ...friendshipAsInitiator.documents,
                ...friendshipAsReceiver.documents
            ];

            if (friendshipDocuments.length === 0) {
                throw new Error('Friendship not found');
            }

            // Delete the friendship
            await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                friendshipDocuments[0].$id
            );

            // Update UI state
            set(state => ({
                friends: state.friends.filter(f => f.friendId !== friendId)
            }));

            toast.success('Friend removed successfully');
        } catch (error) {
            console.error('Error removing friend:', error);
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

            // Get request details before updating
            const request = await database.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                requestId
            );

            // Update request status
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                requestId,
                {
                    status: 'accepted',
                    updated_at: new Date().toISOString()
                }
            );

            // Get sender's name for notification
            const receiverName = await getUserName(userId);
            
            // Create notification for the person who sent the original request
            await createFriendNotification(
                request.user_id,
                'friend_accepted',
                receiverName,
                userId,
                requestId
            );

            toast.success('Friend request accepted!');
            
            // Refresh friends and pending requests
            await Promise.all([
                get().loadFriends(),
                get().loadPendingRequests()
            ]);
        } catch (error) {
            console.error('Error accepting friend request:', error);
            set({ error: 'Failed to accept friend request' });
            toast.error('Failed to accept friend request');
        } finally {
            set({ loading: false });
        }
    },

    rejectFriendRequest: async (requestId: string) => {
        try {
            set({ loading: true, error: null });
            
            // Delete the friend request
            await database.deleteDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                requestId
            );
            
            // Update UI state
            set(state => ({
                pendingRequests: state.pendingRequests.filter(req => req.id !== requestId)
            }));
            
            toast.success('Friend request rejected');
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            set({ error: 'Failed to reject friend request' });
            toast.error('Failed to reject friend request');
        } finally {
            set({ loading: false });
        }
    },

    loadFriends: async () => {
        try {
            set({ loading: true, error: null });
            
            // Пытаемся получить ID пользователя из localStorage
            const userId = localStorage.getItem('userId');
            console.log('Loading friends for user ID (from localStorage):', userId);
            
            if (!userId) {
                console.warn('No userId found in localStorage, friends list will be empty');
                set({ friends: [] });
                return;
            }

            // Load friends where user is the initiator
            console.log('Loading friendships where user is initiator...');
            const friendshipsAsInitiator = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('user_id', userId)
                ]
            );
            console.log('Found', friendshipsAsInitiator.documents.length, 'friendships as initiator');

            // Load friends where user is the receiver
            console.log('Loading friendships where user is receiver...');
            const friendshipsAsReceiver = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'accepted'),
                    Query.equal('friend_id', userId)
                ]
            );
            console.log('Found', friendshipsAsReceiver.documents.length, 'friendships as receiver');

            // Format and combine the friend lists
            const formattedFriendsAsInitiator = friendshipsAsInitiator.documents.map(doc => ({
                id: doc.$id,
                userId: doc.user_id,
                friendId: doc.friend_id,
                status: doc.status,
                createdAt: doc.created_at
            }));

            const formattedFriendsAsReceiver = friendshipsAsReceiver.documents.map(doc => ({
                id: doc.$id,
                userId: doc.friend_id, // Это текущий пользователь
                friendId: doc.user_id, // Это друг (инициатор запроса)
                status: doc.status,
                createdAt: doc.created_at
            }));
            
            const combinedFriends = [...formattedFriendsAsInitiator, ...formattedFriendsAsReceiver];
            console.log('Combined friends list:', combinedFriends);
            
            set({ friends: combinedFriends });
        } catch (error) {
            console.error('Error loading friends:', error);
            set({ error: 'Failed to load friends' });
        } finally {
            set({ loading: false });
        }
    },

    loadPendingRequests: async () => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            // Load pending friend requests where the user is the recipient
            const requests = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'pending'),
                    Query.equal('friend_id', userId)
                ]
            );

            // Format the requests
            const formattedRequests = requests.documents.map(doc => ({
                id: doc.$id,
                userId: doc.user_id,
                friendId: doc.friend_id,
                status: doc.status,
                createdAt: doc.created_at
            }));

            set({ pendingRequests: formattedRequests });
        } catch (error) {
            console.error('Error loading pending requests:', error);
            set({ error: 'Failed to load pending requests' });
        } finally {
            set({ loading: false });
        }
    },

    loadSentRequests: async () => {
        try {
            set({ loading: true, error: null });
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            // Load pending friend requests where the user is the sender
            const requests = await database.listDocuments(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_FRIEND_REQUESTS!,
                [
                    Query.equal('status', 'pending'),
                    Query.equal('user_id', userId)
                ]
            );

            // Format the requests
            const formattedRequests = requests.documents.map(doc => ({
                id: doc.$id,
                userId: doc.user_id,
                friendId: doc.friend_id,
                status: doc.status,
                createdAt: doc.created_at
            }));

            set({ sentRequests: formattedRequests });
        } catch (error) {
            console.error('Error loading sent requests:', error);
            set({ error: 'Failed to load sent requests' });
        } finally {
            set({ loading: false });
        }
    },
})); 