"use client";

import { database, client, ID, Query } from "@/libs/AppWriteClient";
import { useUser } from "@/app/context/user";
import { useState, useEffect, useCallback } from 'react';
import { Models } from 'appwrite';

interface Notification {
  id: string;
  user_id: string;
  type: 'sale' | 'royalty' | 'withdrawal' | 'welcome' | 'release' | 'purchase' | 'terms' | 'friend_request' | 'friend_accepted';
  title: string;
  message: string;
  amount?: string;
  track_id?: string;
  sender_id?: string;
  action_url?: string;
  related_document_id?: string;
  created_at: string;
  createdAt?: string;
  read: boolean;
  isRead?: boolean;
}

interface NotificationData {
  title: string;
  message: string;
  amount?: string;
  track_id?: string;
  action_url?: string;
  related_document_id?: string;
}

export const NOTIFICATION_MESSAGES = {
  welcome: {
    title: "Welcome to Sacral Track! 🎵",
    message: "We're excited to have you join our community of music creators and enthusiasts."
  },
  terms: {
    title: "Terms of Service",
    message: "Please take a moment to review our terms of service and usage guidelines."
  },
  release: {
    title: "New Release Added! 🎉",
    message: "Your track has been successfully uploaded and is now live on Sacral Track."
  },
  purchase: (trackName: string) => ({
    title: "Track Purchased! 🎵",
    message: `You've successfully purchased "${trackName}". Enjoy the music!`
  }),
  sale: (buyerName: string, trackName: string) => ({
    title: "New Track Sale! 💰",
    message: `${buyerName} just purchased your track "${trackName}"`
  }),
  royalty: (amount: string, trackName: string) => ({
    title: "Royalty Payment Received! 💎",
    message: `You've received ${amount} in royalties for "${trackName}"`
  }),
  withdrawal: (amount: string) => ({
    title: "Withdrawal Successful! 🎉",
    message: `Your withdrawal of ${amount} has been processed and sent to your account.`
  }),
  friend_request: (senderName: string) => ({
    title: "New Friend Request! 👋",
    message: `${senderName} sent you a friend request. Check your profile to respond.`
  }),
  friend_accepted: (acceptorName: string) => ({
    title: "Friend Request Accepted! 🎉",
    message: `${acceptorName} accepted your friend request. You are now connected!`
  })
};

const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userContext = useUser();

  const createNotification = async (
    userId: string,
    type: Notification['type'],
    data: {
      title?: string;
      message?: string;
      amount?: string;
      track_id?: string;
      trackName?: string;
      buyerName?: string;
      senderName?: string;
      acceptorName?: string;
      sender_id?: string;
      action_url?: string;
      related_document_id?: string;
    }
  ) => {
    try {
      let notificationData: NotificationData;

      switch (type) {
        case 'welcome':
          notificationData = NOTIFICATION_MESSAGES.welcome;
          break;
        case 'terms':
          notificationData = NOTIFICATION_MESSAGES.terms;
          break;
        case 'release':
          notificationData = NOTIFICATION_MESSAGES.release;
          break;
        case 'purchase':
          notificationData = NOTIFICATION_MESSAGES.purchase(data.trackName || 'Unknown Track');
          break;
        case 'sale':
          notificationData = NOTIFICATION_MESSAGES.sale(data.buyerName || 'Someone', data.trackName || 'Unknown Track');
          break;
        case 'royalty':
          notificationData = NOTIFICATION_MESSAGES.royalty(data.amount || '0', data.trackName || 'Unknown Track');
          break;
        case 'withdrawal':
          notificationData = NOTIFICATION_MESSAGES.withdrawal(data.amount || '0');
          break;
        case 'friend_request':
          notificationData = NOTIFICATION_MESSAGES.friend_request(data.senderName || 'Unknown Sender');
          break;
        case 'friend_accepted':
          notificationData = NOTIFICATION_MESSAGES.friend_accepted(data.acceptorName || 'Unknown Acceptor');
          break;
        default:
          notificationData = {
            title: data.title || 'Notification',
            message: data.message || '',
          };
      }

      console.log('Creating notification:', {
        user_id: userId,
        type,
        title: notificationData.title,
        message: notificationData.message,
        amount: data.amount,
        track_id: data.track_id
      });

      const notification = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
        ID.unique(),
        {
          user_id: userId,
          type,
          title: notificationData.title,
          message: notificationData.message,
          amount: data.amount,
          track_id: data.track_id,
          sender_id: data.sender_id,
          action_url: data.action_url,
          related_document_id: data.related_document_id,
          created_at: new Date().toISOString(),
          read: false
        }
      );

      console.log('✅ Notification created successfully:', notification.$id);

      // Play notification sound
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(console.error);

      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }
  };

  const getUserNotifications = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
        [
          Query.equal('user_id', userId),
          Query.orderDesc('created_at')
        ]
      );

      const notifications = response.documents.map(doc => ({
        id: doc.$id,
        user_id: doc.user_id,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        amount: doc.amount,
        track_id: doc.track_id,
        sender_id: doc.sender_id,
        action_url: doc.action_url,
        related_document_id: doc.related_document_id,
        created_at: doc.created_at || doc.$createdAt,
        createdAt: doc.created_at || doc.$createdAt,
        read: doc.read,
        isRead: doc.read
      })) as Notification[];

      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
      
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to fetch notifications');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
        notificationId,
        {
          read: true
        }
      );

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async (userId: string) => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification =>
          database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
            notification.id,
            { read: true }
          )
        )
      );

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await database.deleteDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
        notificationId
      );

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  const createWithdrawalNotification = async (
    userId: string,
    amount: string,
    method: string
  ) => {
    try {
      const notificationData = NOTIFICATION_MESSAGES.withdrawal(amount);
      await createNotification(userId, 'withdrawal', {
        title: notificationData.title,
        message: notificationData.message,
        amount,
      });
    } catch (error) {
      console.error('Error creating withdrawal notification:', error);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userContext?.user?.id) return;

    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS}.documents`,
      (response: any) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const newNotification = response.payload as Notification;
          if (newNotification.user_id === userContext.user?.id) {
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      }
    );

    // Initial fetch
    getUserNotifications(userContext.user.id);

    return () => {
      unsubscribe();
    };
  }, [userContext?.user?.id, getUserNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createWithdrawalNotification
  };
};

export default useNotifications; 