import { useState, useEffect } from 'react';
import { Account, Client, Databases, ID, Query } from 'appwrite';
import { useUser } from '@/app/context/user';
import { APPWRITE_CONFIG } from '@/libs/AppWriteClient';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  track_id?: string;
  data?: any;
}

// Шаблоны для сообщений уведомлений
export const NOTIFICATION_MESSAGES = {
  sale: (buyerName: string, trackName: string) => ({
    title: 'New Sale!',
    message: `${buyerName} purchased your track "${trackName}"`
  }),
  purchase: (trackName: string) => ({
    title: 'Purchase Complete',
    message: `You've successfully purchased "${trackName}"`
  }),
  royalty: (amount: string, trackName: string) => ({
    title: 'Royalty Received',
    message: `You received $${amount} in royalties for "${trackName}"`
  })
};

export default function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userContext = useUser();

  useEffect(() => {
    async function fetchNotifications() {
      // Если пользователь не авторизован, то уведомления не загружаем
      if (!userContext?.user?.id) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const client = new Client()
          .setEndpoint(APPWRITE_CONFIG.endpoint)
          .setProject(APPWRITE_CONFIG.projectId);

        const databases = new Databases(client);

        // Предполагаем, что у нас есть коллекция notifications
        // Если нет - это заглушка, которая не сломает приложение
        try {
          const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            'notifications', // ID коллекции уведомлений
            [
              Query.equal('user_id', userContext.user.id),
              Query.orderDesc('createdAt'),
              Query.limit(20)
            ]
          );

          setNotifications(response.documents as unknown as Notification[]);
        } catch (e) {
          console.error('Error fetching notifications:', e);
          // Если коллекция не существует или другая ошибка, просто устанавливаем пустой массив
          setNotifications([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in useNotifications:', err);
        setError('Failed to load notifications');
        setNotifications([]);
        setLoading(false);
      }
    }

    fetchNotifications();
    
    // Можно добавить интервал для периодической проверки новых уведомлений
    const intervalId = setInterval(fetchNotifications, 60000); // каждую минуту
    
    return () => clearInterval(intervalId);
  }, [userContext?.user?.id]);

  // Функция для получения уведомлений пользователя по ID
  const getUserNotifications = async (userId: string) => {
    if (!userId) {
      return [];
    }

    try {
      const client = new Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);

      const databases = new Databases(client);

      try {
        const response = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          'notifications',
          [
            Query.equal('user_id', userId),
            Query.orderDesc('createdAt'),
            Query.limit(20)
          ]
        );

        return response.documents as unknown as Notification[];
      } catch (e) {
        console.error('Error fetching user notifications:', e);
        return [];
      }
      
    } catch (err) {
      console.error('Error in getUserNotifications:', err);
      return [];
    }
  };

  // Функция для пометки уведомления как прочитанного
  const markAsRead = async (notificationId: string) => {
    if (!userContext?.user?.id) return;
    
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);

      const databases = new Databases(client);

      try {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          'notifications',
          notificationId,
          { isRead: true }
        );

        // Обновляем состояние локально
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true } 
              : notification
          )
        );
      } catch (e) {
        console.error('Error marking notification as read:', e);
      }
    } catch (err) {
      console.error('Error in markAsRead:', err);
    }
  };

  // Функция для получения количества непрочитанных уведомлений
  const getUnreadCount = () => {
    return notifications.filter(notification => !notification.isRead).length;
  };

  // Функция для пометки всех уведомлений как прочитанных
  const markAllAsRead = async (userId: string) => {
    if (!userId) return;
    
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);

      const databases = new Databases(client);

      // Получаем список всех непрочитанных уведомлений пользователя
      const unreadNotifications = notifications.filter(notification => !notification.isRead);
      
      // Обновляем каждое уведомление как прочитанное
      await Promise.all(
        unreadNotifications.map(notification => 
          databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            'notifications',
            notification.id,
            { isRead: true }
          )
        )
      );

      // Обновляем состояние локально
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (err) {
      console.error('Error in markAllAsRead:', err);
    }
  };

  // Функция для создания нового уведомления
  const createNotification = async (userId: string, notificationData: {
    type: string;
    title: string;
    message: string;
    track_id?: string;
    amount?: string;
    data?: any;
  }) => {
    if (!userId) return null;
    
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);

      const databases = new Databases(client);

      const notification = await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        'notifications',
        ID.unique(),
        {
          user_id: userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          track_id: notificationData.track_id,
          amount: notificationData.amount,
          data: notificationData.data ? JSON.stringify(notificationData.data) : '{}',
          createdAt: new Date().toISOString(),
          isRead: false
        }
      );

      return notification;
    } catch (err) {
      console.error('Error creating notification:', err);
      return null;
    }
  };

  return {
    notifications,
    loading,
    error,
    markAsRead,
    getUnreadCount,
    markAllAsRead,
    getUserNotifications,
    createNotification
  };
} 