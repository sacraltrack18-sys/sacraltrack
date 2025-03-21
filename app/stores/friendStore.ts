import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';
import { useUser } from "@/app/context/user";

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

interface FriendStore {
  friends: Friend[];
  pendingRequests: Friend[];
  isLoading: boolean;
  error: string | null;
  
  // Friend actions
  sendFriendRequest: (userId: string, friendId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  
  // Data fetching
  fetchFriends: (userId: string) => Promise<void>;
  fetchPendingRequests: (userId: string) => Promise<void>;
}

export const useFriendStore = create<FriendStore>()(
  devtools(
    persist(
      (set, get) => ({
        friends: [],
        pendingRequests: [],
        isLoading: false,
        error: null,

        sendFriendRequest: async (userId: string, friendId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            const request = await database.createDocument(
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

            // Create notification for friend request
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
              ID.unique(),
              {
                user_id: friendId,
                type: 'friend_request',
                title: 'New Friend Request',
                message: 'Someone sent you a friend request',
                created_at: new Date().toISOString(),
                read: false
              }
            );
            
            set(state => ({
              pendingRequests: [...state.pendingRequests, request as unknown as Friend]
            }));
            
            toast.success('Friend request sent');
          } catch (error) {
            console.error('Error sending friend request:', error);
            set({ error: 'Failed to send friend request' });
            toast.error('Failed to send friend request');
          } finally {
            set({ isLoading: false });
          }
        },

        acceptFriendRequest: async (requestId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            const request = await database.updateDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
              requestId,
              {
                status: 'accepted'
              }
            );

            // Create notification for accepted request
            await database.createDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
              ID.unique(),
              {
                user_id: request.user_id,
                type: 'friend_accepted',
                title: 'Friend Request Accepted',
                message: 'Your friend request was accepted',
                created_at: new Date().toISOString(),
                read: false
              }
            );
            
            set(state => ({
              friends: [...state.friends, request as unknown as Friend],
              pendingRequests: state.pendingRequests.filter(req => req.id !== requestId)
            }));
            
            toast.success('Friend request accepted');
          } catch (error) {
            console.error('Error accepting friend request:', error);
            set({ error: 'Failed to accept friend request' });
            toast.error('Failed to accept friend request');
          } finally {
            set({ isLoading: false });
          }
        },

        rejectFriendRequest: async (requestId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            await database.deleteDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
              requestId
            );
            
            set(state => ({
              pendingRequests: state.pendingRequests.filter(req => req.id !== requestId)
            }));
            
            toast.success('Friend request rejected');
          } catch (error) {
            console.error('Error rejecting friend request:', error);
            set({ error: 'Failed to reject friend request' });
            toast.error('Failed to reject friend request');
          } finally {
            set({ isLoading: false });
          }
        },

        removeFriend: async (friendId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            const friend = get().friends.find(f => f.friend_id === friendId);
            if (!friend) throw new Error('Friend not found');

            await database.deleteDocument(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
              friend.id
            );
            
            set(state => ({
              friends: state.friends.filter(f => f.friend_id !== friendId)
            }));
            
            toast.success('Friend removed');
          } catch (error) {
            console.error('Error removing friend:', error);
            set({ error: 'Failed to remove friend' });
            toast.error('Failed to remove friend');
          } finally {
            set({ isLoading: false });
          }
        },

        fetchFriends: async (userId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
              [
                Query.equal('status', 'accepted'),
                Query.equal('user_id', userId)
              ]
            );
            
            set({ friends: response.documents as unknown as Friend[] });
          } catch (error) {
            console.error('Error fetching friends:', error);
            set({ error: 'Failed to fetch friends' });
          } finally {
            set({ isLoading: false });
          }
        },

        fetchPendingRequests: async (userId: string) => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
              [
                Query.equal('status', 'pending'),
                Query.equal('friend_id', userId)
              ]
            );
            
            set({ pendingRequests: response.documents as unknown as Friend[] });
          } catch (error) {
            console.error('Error fetching pending requests:', error);
            set({ error: 'Failed to fetch pending requests' });
          } finally {
            set({ isLoading: false });
          }
        }
      }),
      {
        name: 'friend-store',
        storage: createJSONStorage(() => localStorage)
      }
    )
  )
); 