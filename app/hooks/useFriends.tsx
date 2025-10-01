import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { useUser } from '@/app/context/user';
import { toast } from 'react-hot-toast';

interface Friend {
  $id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  friendProfile?: {
    name: string;
    image: string;
    username: string;
    totalLikes: number;
    averageRating: number;
  };
}

interface UserRating {
  $id: string;
  userId: string;
  raterId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  raterProfile?: {
    name: string;
    image: string;
  };
}

interface UserStats {
  $id: string;
  userId: string;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  averageRating: number;
  totalRatings: number;
  lastUpdated: string;
}

export const useFriends = () => {
  const user  = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingFriends, setPendingFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка друзей
  const loadFriends = async () => {
    // Проверяем id пользователя и тихо выходим, если его нет
    if (!user?.id) {
      console.log("User not authenticated, skipping friends loading in useFriends hook");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Получаем принятые друзья
      const acceptedFriends = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('userId', user.id),
          Query.equal('status', 'accepted')
        ]
      );

      // Получаем ожидающие запросы в друзья
      const pendingFriends = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('friendId', user.id),
          Query.equal('status', 'pending')
        ]
      );

      // Получаем профили друзей
      const friendsWithProfiles = await Promise.all(
        acceptedFriends.documents.map(async (friend) => {
          const friendProfile = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            [Query.equal('user_id', friend.friendId)]
          );

          const userStats = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
            [Query.equal('userId', friend.friendId)]
          );

          return {
            $id: friend.$id,
            userId: friend.userId,
            friendId: friend.friendId,
            status: friend.status,
            createdAt: friend.createdAt,
            updatedAt: friend.updatedAt,
            friendProfile: friendProfile.documents[0] ? {
              name: friendProfile.documents[0].name || 'User',
              image: friendProfile.documents[0].image || '/images/placeholder-user.jpg',
              totalLikes: userStats.documents[0]?.totalLikes || 0,
              averageRating: userStats.documents[0]?.averageRating || 0
            } : undefined
          } as Friend;
        })
      );

      // Получаем профили отправителей запросов в друзья
      const pendingWithProfiles = await Promise.all(
        pendingFriends.documents.map(async (friend) => {
          const friendProfile = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            [Query.equal('user_id', friend.userId)]
          );

          return {
            $id: friend.$id,
            userId: friend.userId,
            friendId: friend.friendId,
            status: friend.status,
            createdAt: friend.createdAt,
            updatedAt: friend.updatedAt,
            friendProfile: friendProfile.documents[0] ? {
              name: friendProfile.documents[0].name || 'User',
              image: friendProfile.documents[0].image || '/images/placeholder-user.jpg',
            } : undefined
          } as Friend;
        })
      );

      setFriends(friendsWithProfiles);
      setPendingFriends(pendingWithProfiles);
    } catch (error) {
      console.error('Error loading friends:', error);
      // Показываем ошибку только если пользователь авторизован (двойная проверка на всякий случай)
      if (user?.id) {
        setError('Failed to load friends');
        toast.error('Failed to load friends');
      }
    } finally {
      setLoading(false);
    }
  };

  // Добавление друга
  const addFriend = async (friendId: string) => {
    if (!user?.id) return;

    try {
      // Проверяем, не существует ли уже такая дружба
      const existingFriendship = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('userId', user.id),
          Query.equal('friendId', friendId)
        ]
      );

      if (existingFriendship.documents.length > 0) {
        toast.error('Friendship already exists');
        return;
      }

      // Создаем запись о дружбе
      await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        ID.unique(),
        {
          userId: user.id,
          friendId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      toast.success('Friend request sent');
      loadFriends(); // Перезагружаем список друзей
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to send friend request');
    }
  };

  // Принятие запроса в друзья
  const acceptFriend = async (friendId: string) => {
    if (!user?.id) return;

    try {
      // Находим запись о дружбе
      const friendship = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('friendId', user.id),
          Query.equal('userId', friendId),
          Query.equal('status', 'pending')
        ]
      );

      if (friendship.documents.length === 0) {
        toast.error('Friend request not found');
        return;
      }

      // Обновляем статус
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        friendship.documents[0].$id,
        {
          status: 'accepted',
          updatedAt: new Date().toISOString()
        }
      );

      // Обновляем статистику пользователей
      await updateUserStats(user.id, friendId);

      toast.success('Friend request accepted');
      loadFriends(); // Перезагружаем список друзей
    } catch (error) {
      console.error('Error accepting friend:', error);
      toast.error('Failed to accept friend request');
    }
  };

  // Отклонение запроса в друзья
  const rejectFriend = async (friendId: string) => {
    if (!user?.id) return;

    try {
      const friendship = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('friendId', user.id),
          Query.equal('userId', friendId),
          Query.equal('status', 'pending')
        ]
      );

      if (friendship.documents.length === 0) {
        toast.error('Friend request not found');
        return;
      }

      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        friendship.documents[0].$id,
        {
          status: 'rejected',
          updatedAt: new Date().toISOString()
        }
      );

      toast.success('Friend request rejected');
      loadFriends();
    } catch (error) {
      console.error('Error rejecting friend:', error);
      toast.error('Failed to reject friend request');
    }
  };

  // Удаление друга
  const removeFriend = async (friendId: string) => {
    if (!user?.id) return;

    try {
      const friendship = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        [
          Query.equal('userId', user.id),
          Query.equal('friendId', friendId),
          Query.equal('status', 'accepted')
        ]
      );

      if (friendship.documents.length === 0) {
        toast.error('Friendship not found');
        return;
      }

      await database.deleteDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_FRIENDS!,
        friendship.documents[0].$id
      );

      // Обновляем статистику пользователей
      await updateUserStats(user.id, friendId, true);

      toast.success('Friend removed');
      loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  // Обновление статистики пользователей
  const updateUserStats = async (userId: string, friendId: string, isRemoval: boolean = false) => {
    try {
      // Обновляем статистику текущего пользователя
      const userStats = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
        [Query.equal('userId', userId)]
      );

      if (userStats.documents.length > 0) {
        const currentStats = userStats.documents[0];
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
          currentStats.$id,
          {
            totalFollowing: isRemoval 
              ? Math.max(0, currentStats.totalFollowing - 1)
              : currentStats.totalFollowing + 1,
            lastUpdated: new Date().toISOString()
          }
        );
      }

      // Обновляем статистику друга
      const friendStats = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
        [Query.equal('userId', friendId)]
      );

      if (friendStats.documents.length > 0) {
        const currentStats = friendStats.documents[0];
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
          currentStats.$id,
          {
            totalFollowers: isRemoval 
              ? Math.max(0, currentStats.totalFollowers - 1)
              : currentStats.totalFollowers + 1,
            lastUpdated: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  // Загрузка друзей при монтировании компонента
  useEffect(() => {
    loadFriends();
  }, [user?.id]);

  return {
    friends,
    pendingFriends,
    loading,
    error,
    addFriend,
    acceptFriend,
    rejectFriend,
    removeFriend,
    loadFriends
  };
}; 