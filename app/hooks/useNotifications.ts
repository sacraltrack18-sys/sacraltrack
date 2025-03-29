import { useState, useEffect } from 'react';
import { Account, Client, Databases, Query } from 'appwrite';
import { useUser } from '@/app/context/user';
import { APPWRITE_CONFIG } from '@/app/config/appwrite';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

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

  return {
    notifications,
    loading,
    error,
    markAsRead,
    getUnreadCount
  };
} 